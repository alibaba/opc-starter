/**
 * IndexedDB 配置 - OPC-Starter
 */

import { openDB, type IDBPDatabase } from 'idb';
import { DB_CONFIG } from '@/config/constants';
import type { Person } from '@/types/person';

/**
 * 统一的数据库Schema
 */
export interface AppDBSchema {
  [DB_CONFIG.STORES.PERSONS]: {
    key: string;
    value: Person;
    indexes: {
      'by-name': string;
      'by-department': string;
    };
  };
}

/**
 * 共享的数据库实例
 */
let dbInstance: IDBPDatabase<AppDBSchema> | null = null;
let initPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

/**
 * 初始化数据库（统一入口）
 */
export async function initDB(): Promise<IDBPDatabase<AppDBSchema>> {
  // 如果已经初始化，直接返回
  if (dbInstance) {
    return dbInstance;
  }

  // 如果正在初始化，等待初始化完成
  if (initPromise) {
    return initPromise;
  }

  // 开始初始化
  initPromise = openDB<AppDBSchema>(DB_CONFIG.NAME, DB_CONFIG.VERSION, {
    upgrade(db) {
      // 创建persons表
      if (!db.objectStoreNames.contains(DB_CONFIG.STORES.PERSONS)) {
        const personStore = db.createObjectStore(DB_CONFIG.STORES.PERSONS, {
          keyPath: 'id',
        });
        personStore.createIndex('by-name', 'name');
        personStore.createIndex('by-department', 'department');
      }
    },
  });

  dbInstance = await initPromise;
  return dbInstance;
}

/**
 * 获取数据库实例
 */
export async function getDB(): Promise<IDBPDatabase<AppDBSchema>> {
  return initDB();
}
