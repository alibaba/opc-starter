/**
 * Session Storage - 会话存储
 * @description 使用 IndexedDB 持久化对话历史
 * @version 1.0.0
 * @see scratchpad.md Phase 6
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AgentMessage } from '@/types/agent';
import { compressIfNeeded } from './contextCompressor';

// ============ 类型定义 ============

/**
 * 会话元数据
 */
export interface SessionMeta {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isCompressed: boolean;
}

/**
 * 完整会话
 */
export interface Session {
  meta: SessionMeta;
  messages: AgentMessage[];
}

/**
 * IndexedDB Schema
 */
interface SessionDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: {
      'by-user': string;
      'by-updated': Date;
    };
  };
}

// ============ 数据库操作 ============

const DB_NAME = 'photo-wall-agent-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/** 每个用户最多保存的会话数量 */
const MAX_SESSIONS_PER_USER = 20;

let dbPromise: Promise<IDBPDatabase<SessionDBSchema>> | null = null;

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<SessionDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<SessionDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' });
        store.createIndex('by-user', 'meta.userId');
        store.createIndex('by-updated', 'meta.updatedAt');
      },
    });
  }
  return dbPromise;
}

/**
 * 生成会话标题
 */
function generateTitle(messages: AgentMessage[]): string {
  // 使用第一条用户消息作为标题
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (firstUserMessage?.content) {
    const content = firstUserMessage.content.trim();
    return content.length > 30 ? content.slice(0, 30) + '...' : content;
  }
  return `对话 ${new Date().toLocaleDateString('zh-CN')}`;
}

// ============ 公开 API ============

/**
 * 创建新会话
 */
export async function createSession(userId: string): Promise<Session> {
  const now = new Date();
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const session: Session = {
    meta: {
      id: sessionId,
      userId,
      title: `新对话`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isCompressed: false,
    },
    messages: [],
  };

  const db = await getDB();
  await db.put(STORE_NAME, session);

  console.log('[SessionStorage] 创建会话:', sessionId);
  return session;
}

/**
 * 获取会话
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const db = await getDB();
    const session = await db.get(STORE_NAME, sessionId);
    return session || null;
  } catch (error) {
    console.error('[SessionStorage] 获取会话失败:', error);
    return null;
  }
}

/**
 * 保存会话消息
 * @description 自动进行上下文压缩（如需要）
 */
export async function saveSessionMessages(
  sessionId: string,
  messages: AgentMessage[],
  options: { autoCompress?: boolean } = {}
): Promise<void> {
  const { autoCompress = true } = options;

  try {
    const db = await getDB();
    const session = await db.get(STORE_NAME, sessionId);

    if (!session) {
      console.warn('[SessionStorage] 会话不存在:', sessionId);
      return;
    }

    // 自动压缩（如果启用）
    let finalMessages = messages;
    let isCompressed = session.meta.isCompressed;

    if (autoCompress) {
      const compressed = compressIfNeeded(messages);
      if (compressed.length < messages.length) {
        finalMessages = compressed;
        isCompressed = true;
      }
    }

    // 更新会话
    session.messages = finalMessages;
    session.meta.updatedAt = new Date();
    session.meta.messageCount = finalMessages.length;
    session.meta.isCompressed = isCompressed;
    session.meta.title = generateTitle(finalMessages);

    await db.put(STORE_NAME, session);

    console.log(
      `[SessionStorage] 保存会话: ${sessionId}, 消息数: ${finalMessages.length}` +
        (isCompressed ? ' (已压缩)' : '')
    );
  } catch (error) {
    console.error('[SessionStorage] 保存会话失败:', error);
  }
}

/**
 * 获取用户的所有会话（按更新时间排序）
 */
export async function getUserSessions(userId: string): Promise<SessionMeta[]> {
  try {
    const db = await getDB();
    const sessions = await db.getAllFromIndex(STORE_NAME, 'by-user', userId);

    // 按更新时间倒序排列
    sessions.sort(
      (a, b) => new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime()
    );

    return sessions.map((s) => s.meta);
  } catch (error) {
    console.error('[SessionStorage] 获取用户会话失败:', error);
    return [];
  }
}

/**
 * 删除会话
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, sessionId);
    console.log('[SessionStorage] 删除会话:', sessionId);
  } catch (error) {
    console.error('[SessionStorage] 删除会话失败:', error);
  }
}

/**
 * 清理旧会话（保留最近的 N 个）
 */
export async function cleanupOldSessions(userId: string): Promise<number> {
  try {
    const sessions = await getUserSessions(userId);

    if (sessions.length <= MAX_SESSIONS_PER_USER) {
      return 0;
    }

    // 删除超出限制的旧会话
    const toDelete = sessions.slice(MAX_SESSIONS_PER_USER);
    const db = await getDB();

    for (const session of toDelete) {
      await db.delete(STORE_NAME, session.id);
    }

    console.log(`[SessionStorage] 清理旧会话: ${toDelete.length} 个`);
    return toDelete.length;
  } catch (error) {
    console.error('[SessionStorage] 清理会话失败:', error);
    return 0;
  }
}

/**
 * 清除用户所有会话
 */
export async function clearUserSessions(userId: string): Promise<void> {
  try {
    const sessions = await getUserSessions(userId);
    const db = await getDB();

    for (const session of sessions) {
      await db.delete(STORE_NAME, session.id);
    }

    console.log(`[SessionStorage] 清除用户所有会话: ${sessions.length} 个`);
  } catch (error) {
    console.error('[SessionStorage] 清除会话失败:', error);
  }
}

export default {
  createSession,
  getSession,
  saveSessionMessages,
  getUserSessions,
  deleteSession,
  cleanupOldSessions,
  clearUserSessions,
};
