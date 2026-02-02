import { personDB } from '@/services/db/personDB'
import type { LocalAdapter, BaseEntity } from '@/lib/reactive/types'
import type { Person } from '@/types/person'

export function createPersonAdapter(): LocalAdapter<Person & BaseEntity> {
  return {
    findAll: async () => {
      const persons = await personDB.getAll()
      return persons as (Person & BaseEntity)[]
    },
    findOne: async (id: string) => {
      const all = await personDB.getAll()
      return all.find(p => p.id === id) as (Person & BaseEntity) | undefined
    },
    query: async (options) => {
      const all = await personDB.getAll()
      let result = [...all] as (Person & BaseEntity)[]
      if (options.filter && typeof options.filter === 'function') {
        result = result.filter(options.filter)
      }
      return result
    },
    upsert: async (doc) => {
      await personDB.add(doc as Person)
    },
    bulkUpsert: async (docs) => {
      await personDB.addPersons(docs as Person[])
    },
    remove: async (id) => {
      await personDB.deletePerson(id)
    },
    clear: async () => {
      const all = await personDB.getAll()
      for (const person of all) {
        await personDB.deletePerson(person.id)
      }
    },
  }
}
