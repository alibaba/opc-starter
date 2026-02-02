import { DB_CONFIG } from '@/config/constants';
import type { Person } from '@/types/person';
import { getDB } from './index';

class PersonDBClass {
  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    await getDB();
  }

  /**
   * 添加人员（批量）
   */
  async addPersons(persons: Person[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(DB_CONFIG.STORES.PERSONS, 'readwrite');
    await Promise.all([
      ...persons.map(person => tx.store.put(person)),
      tx.done,
    ]);
  }

  /**
   * 添加单个人员 (用于 DataService Realtime)
   */
  async add(person: Person): Promise<void> {
    const db = await getDB();
    try {
      await db.add(DB_CONFIG.STORES.PERSONS, person);
    } catch (error) {
      // 如果已存在，使用 put 更新
      if ((error as Error).message?.includes('Key already exists')) {
        await db.put(DB_CONFIG.STORES.PERSONS, person);
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取所有人员
   */
  async getPersons(): Promise<Person[]> {
    const db = await getDB();
    return await db.getAll(DB_CONFIG.STORES.PERSONS);
  }

  /**
   * 获取所有人员 (别名方法，用于 DataService)
   */
  async getAll(): Promise<Person[]> {
    return this.getPersons();
  }

  /**
   * 根据ID获取人员
   */
  async getPerson(id: string): Promise<Person | undefined> {
    const db = await getDB();
    return await db.get(DB_CONFIG.STORES.PERSONS, id);
  }

  /**
   * 根据ID获取人员 (别名方法，用于 DataService)
   */
  async get(id: string): Promise<Person | undefined> {
    return this.getPerson(id);
  }

  /**
   * 根据部门获取人员
   */
  async getPersonsByDepartment(department: string): Promise<Person[]> {
    const db = await getDB();
    const tx = db.transaction(DB_CONFIG.STORES.PERSONS, 'readonly');
    const index = tx.objectStore(DB_CONFIG.STORES.PERSONS).index('by-department');
    
    return await index.getAll(department);
  }

  /**
   * 更新人员
   */
  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    const db = await getDB();
    const person = await this.getPerson(id);
    if (!person) throw new Error('Person not found');

    await db.put(DB_CONFIG.STORES.PERSONS, { ...person, ...updates });
  }

  /**
   * 删除人员
   */
  async deletePerson(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(DB_CONFIG.STORES.PERSONS, id);
  }

  /**
   * 清空所有人员
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(DB_CONFIG.STORES.PERSONS);
  }
}

export const personDB = new PersonDBClass();
