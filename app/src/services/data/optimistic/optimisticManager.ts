import type { Photo } from '@/types/photo'
import type { Album } from '@/types/album'
import type { Person } from '@/types/person'
import type { WriteOperation } from '@/services/data/DataService'

interface OptimisticDeps {
  isOnline: () => boolean
  photoDB: typeof import('@/services/db/photoDB').photoDB
  albumDB: typeof import('@/services/db/albumDB').albumDB
  personDB: typeof import('@/services/db/personDB').personDB
  remoteExecute: (op: WriteOperation) => Promise<void>
  enqueueOperation: (op: Omit<WriteOperation, 'timestamp' | 'retryCount'>) => Promise<void>
}

export function createOptimisticManager(deps: OptimisticDeps) {
  const optimisticUpdate = async (id: string, updates: Partial<Photo>): Promise<Photo> => {
    console.log('[DataService] 乐观更新:', id)

    const currentPhoto = await deps.photoDB.get(id)
    if (!currentPhoto) {
      throw new Error('Photo not found')
    }

    const optimisticPhoto: Photo = {
      ...currentPhoto,
      ...updates,
      version: Date.now(),
      cloudSyncStatus: 'pending',
    }

    await deps.photoDB.updatePhoto(id, optimisticPhoto)
    console.log('[DataService] ✅ IndexedDB 已更新 (乐观)')

    if (deps.isOnline()) {
      try {
        const updateData: Record<string, unknown> = {}
        if (updates.tags !== undefined) {
          updateData.tags = updates.tags
        }

        await deps.enqueueOperation({
          type: 'update',
          entityType: 'photo',
          id,
          data: updateData,
        })

        const syncedPhoto: Photo = {
          ...optimisticPhoto,
          ...updates,
          version: Date.now(),
          cloudSyncStatus: 'synced',
        }

        await deps.photoDB.updatePhoto(id, syncedPhoto)

        console.log('[DataService] ✅ 乐观更新已同步到云端')
        return syncedPhoto
      } catch (error) {
        console.warn('[DataService] 乐观更新失败，加入队列:', error)
        await deps.enqueueOperation({
          type: 'update',
          entityType: 'photo',
          id,
          data: updates,
        })
      }
    } else {
      console.log('[DataService] 离线模式，加入队列')
      await deps.enqueueOperation({
        type: 'update',
        entityType: 'photo',
        id,
        data: updates,
      })
    }

    return optimisticPhoto
  }

  const optimisticDelete = async (id: string): Promise<void> => {
    console.log('[DataService] 开始删除照片 (乐观模式)...')

    await deps.photoDB.deletePhoto(id)
    console.log('[DataService] ✅ IndexedDB 已删除 (乐观)')

    if (deps.isOnline()) {
      try {
        await deps.enqueueOperation({
          type: 'delete',
          entityType: 'photo',
          id,
        })
        console.log('[DataService] ✅ Supabase 删除成功')
      } catch (error) {
        console.warn('[DataService] 删除失败，加入队列:', error)
        await deps.enqueueOperation({
          type: 'delete',
          entityType: 'photo',
          id,
        })
      }
    } else {
      console.log('[DataService] 离线模式，加入队列')
      await deps.enqueueOperation({
        type: 'delete',
        entityType: 'photo',
        id,
      })
    }
  }

  // ==================== Album 乐观更新 ====================

  const optimisticAddAlbum = async (album: Album): Promise<Album> => {
    console.log('[DataService] 乐观添加相册:', album.id)

    // 立即写入本地
    await deps.albumDB.add(album)
    console.log('[DataService] ✅ IndexedDB 已添加相册 (乐观)')

    // 加入队列同步到云端
    await deps.enqueueOperation({
      type: 'add',
      entityType: 'album',
      id: album.id,
      data: album as unknown as Record<string, unknown>,
    })

    return album
  }

  const optimisticUpdateAlbum = async (id: string, updates: Partial<Album>): Promise<Album> => {
    console.log('[DataService] 乐观更新相册:', id)

    const currentAlbum = await deps.albumDB.get(id)
    if (!currentAlbum) {
      throw new Error('Album not found')
    }

    const optimisticAlbum: Album = {
      ...currentAlbum,
      ...updates,
      updatedAt: new Date(),
    }

    await deps.albumDB.updateAlbum(id, optimisticAlbum)
    console.log('[DataService] ✅ IndexedDB 已更新相册 (乐观)')

    await deps.enqueueOperation({
      type: 'update',
      entityType: 'album',
      id,
      data: updates as unknown as Record<string, unknown>,
    })

    return optimisticAlbum
  }

  const optimisticDeleteAlbum = async (id: string): Promise<void> => {
    console.log('[DataService] 开始删除相册 (乐观模式)...')

    await deps.albumDB.deleteAlbum(id)
    console.log('[DataService] ✅ IndexedDB 已删除相册 (乐观)')

    await deps.enqueueOperation({
      type: 'delete',
      entityType: 'album',
      id,
    })
  }

  // ==================== Person 乐观更新 ====================

  const optimisticAddPerson = async (person: Person): Promise<Person> => {
    console.log('[DataService] 乐观添加人物:', person.id)

    // 立即写入本地
    await deps.personDB.add(person)
    console.log('[DataService] ✅ IndexedDB 已添加人物 (乐观)')

    // 加入队列同步到云端
    await deps.enqueueOperation({
      type: 'add',
      entityType: 'person',
      id: person.id,
      data: person as unknown as Record<string, unknown>,
    })

    return person
  }

  const optimisticUpdatePerson = async (id: string, updates: Partial<Person>): Promise<Person> => {
    console.log('[DataService] 乐观更新人物:', id)

    const currentPerson = await deps.personDB.get(id)
    if (!currentPerson) {
      throw new Error('Person not found')
    }

    const optimisticPerson: Person = {
      ...currentPerson,
      ...updates,
    }

    await deps.personDB.updatePerson(id, optimisticPerson)
    console.log('[DataService] ✅ IndexedDB 已更新人物 (乐观)')

    await deps.enqueueOperation({
      type: 'update',
      entityType: 'person',
      id,
      data: updates as unknown as Record<string, unknown>,
    })

    return optimisticPerson
  }

  const optimisticDeletePerson = async (id: string): Promise<void> => {
    console.log('[DataService] 开始删除人物 (乐观模式)...')

    await deps.personDB.deletePerson(id)
    console.log('[DataService] ✅ IndexedDB 已删除人物 (乐观)')

    await deps.enqueueOperation({
      type: 'delete',
      entityType: 'person',
      id,
    })
  }

  return {
    optimisticUpdate,
    optimisticDelete,
    // Album
    optimisticAddAlbum,
    optimisticUpdateAlbum,
    optimisticDeleteAlbum,
    // Person
    optimisticAddPerson,
    optimisticUpdatePerson,
    optimisticDeletePerson,
  }
}