/**
 * Remote API - OPC-Starter
 * 与 Supabase 远程 API 交互
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import type { Person } from '@/types/person'
import { personDB } from '@/services/db/personDB'
import type { WriteOperation } from '@/services/data/DataService'

export interface RemoteApi {
  syncPersonsFromCloud(): Promise<number>
  executePersonOperation(op: WriteOperation): Promise<Person | void>
  createPerson(person: Person): Promise<Person>
  updatePerson(id: string, updates: Partial<Person>): Promise<Person>
  deletePerson(id: string): Promise<void>
  transformSupabasePerson(row: Record<string, unknown>): Person
}

export function createRemoteApi(): RemoteApi {
  const transformSupabasePerson = (supabasePerson: Record<string, unknown>): Person => {
    const {
      id,
      full_name,
      avatar_url,
      department,
      created_at,
      // updated_at 暂不使用，但保留以备将来扩展
    } = supabasePerson as Record<string, unknown>

    return {
      id: (id as string) ?? crypto.randomUUID(),
      name: (full_name as string) ?? 'Unknown',
      avatar: (avatar_url as string | undefined) ?? '',
      department: (department as string | undefined) ?? '',
      joinedAt: created_at ? new Date(created_at as string) : new Date(),
      photoCount: 0,
      tags: [],
    }
  }

  const toDate = (value: unknown, fallback: Date): Date => {
    if (value instanceof Date) return value
    if (typeof value === 'string' || typeof value === 'number') return new Date(value)
    return fallback
  }

  const normalizePerson = (input: Partial<Person>, fallback?: Person): Person => {
    const now = new Date()
    return {
      id: input.id ?? fallback?.id ?? crypto.randomUUID(),
      name: input.name ?? fallback?.name ?? 'Unknown',
      avatar: input.avatar ?? fallback?.avatar ?? '',
      department: input.department ?? fallback?.department ?? '',
      joinedAt: toDate(input.joinedAt ?? fallback?.joinedAt, now),
      photoCount: input.photoCount ?? fallback?.photoCount ?? 0,
      tags: input.tags ?? fallback?.tags,
      position: input.position ?? fallback?.position,
      bio: input.bio ?? fallback?.bio,
    }
  }

  const createPerson = async (person: Person): Promise<Person> => {
    const user = await authService.getCurrentUser()
    if (!user) throw new Error('用户未登录')

    const normalized = normalizePerson(person)
    const payload = {
      id: normalized.id,
      full_name: normalized.name,
      avatar_url: normalized.avatar,
      department: normalized.department,
      created_at: normalized.joinedAt.toISOString(),
      updated_at: normalized.joinedAt.toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) throw error
    return transformSupabasePerson(payload)
  }

  const updatePerson = async (id: string, updates: Partial<Person>): Promise<Person> => {
    const current = await personDB.get(id)
    if (!current) {
      throw new Error('Person not found')
    }

    const normalized = normalizePerson({ ...updates, id }, current)

    const supabaseUpdates: Record<string, unknown> = {
      full_name: normalized.name,
      avatar_url: normalized.avatar,
      department: normalized.department,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').update(supabaseUpdates).eq('id', id)

    if (error) throw error
    return normalized
  }

  const deletePerson = async (id: string): Promise<void> => {
    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) throw error
  }

  const syncPersonsFromCloud = async (): Promise<number> => {
    console.log('[DataService] 同步人员...')

    const { data: cloudPersons, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (cloudPersons && cloudPersons.length > 0) {
      const persons: Person[] = cloudPersons.map((person) => transformSupabasePerson(person))

      await personDB.addPersons(persons)
      console.log(`[DataService] ✅ 同步了 ${persons.length} 个人员`)
      return persons.length
    }

    console.log('[DataService] 云端无人员数据')
    return 0
  }

  const executePersonOperation = async (op: WriteOperation): Promise<Person | void> => {
    console.log('[DataService] 执行人物操作:', op.type, op.entityType, op.id)
    switch (op.type) {
      case 'add': {
        const base = normalizePerson(op.data as Partial<Person>)
        return createPerson(base)
      }
      case 'update': {
        const updates = op.data as Partial<Person> | undefined
        const fallback = await personDB.get(op.id)
        const normalized = normalizePerson({ ...updates, id: op.id }, fallback ?? undefined)
        return updatePerson(op.id, normalized)
      }
      case 'delete':
        await deletePerson(op.id)
        return
      default:
        console.warn('[DataService] 不支持的人物操作类型:', op.type)
        return
    }
  }

  return {
    syncPersonsFromCloud,
    executePersonOperation,
    createPerson,
    updatePerson,
    deletePerson,
    transformSupabasePerson,
  }
}
