/**
 * User Preferences - 用户偏好档案
 * @description Photo Wall 版的 "CLAUDE.md" - 跨会话用户偏好自动学习
 * @version 1.0.0
 * @see scratchpad.md Phase 5
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ============ 类型定义 ============

/**
 * 用户偏好档案
 */
export interface UserPreferenceProfile {
  userId: string;

  /** 编辑偏好（自动统计） */
  editing: {
    preferredFilter?: string;      // 使用次数最多的滤镜
    defaultCropRatio?: string;     // 使用次数最多的裁剪比例
    preferredBrightness?: number;  // 常用亮度调整
    preferredContrast?: number;    // 常用对比度调整
  };

  /** 交互风格（自动分析） */
  interaction: {
    verbosity: 'concise' | 'detailed';
    confirmBeforeSave: boolean;
  };

  /** 自动学习的偏好 */
  learned: Array<{
    pattern: string;       // 例："用户偏好暖色调滤镜"
    confidence: number;    // 0-1，随重复使用递增
    observedAt: Date;
  }>;

  /** 操作频率统计（用于自动分析） */
  actionStats: Record<string, number>;  // { 'applyFilter:warm': 15, ... }

  updatedAt: Date;
  createdAt: Date;
}

/**
 * IndexedDB Schema
 */
interface PreferencesDBSchema extends DBSchema {
  preferences: {
    key: string;
    value: UserPreferenceProfile;
    indexes: { 'by-updated': Date };
  };
}

// ============ 数据库操作 ============

const DB_NAME = 'photo-wall-agent-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';

let dbPromise: Promise<IDBPDatabase<PreferencesDBSchema>> | null = null;

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<PreferencesDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PreferencesDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

/**
 * 创建默认偏好档案
 */
function createDefaultProfile(userId: string): UserPreferenceProfile {
  const now = new Date();
  return {
    userId,
    editing: {},
    interaction: {
      verbosity: 'concise',
      confirmBeforeSave: true,
    },
    learned: [],
    actionStats: {},
    updatedAt: now,
    createdAt: now,
  };
}

/**
 * 加载用户偏好
 */
export async function loadPreference(userId: string): Promise<UserPreferenceProfile | null> {
  try {
    const db = await getDB();
    const profile = await db.get(STORE_NAME, userId);
    return profile || null;
  } catch (error) {
    console.error('[UserPreferences] 加载偏好失败:', error);
    return null;
  }
}

/**
 * 保存用户偏好
 */
export async function savePreference(userId: string, profile: UserPreferenceProfile): Promise<void> {
  try {
    const db = await getDB();
    profile.updatedAt = new Date();
    await db.put(STORE_NAME, profile);
    console.log('[UserPreferences] 偏好已保存:', userId);
  } catch (error) {
    console.error('[UserPreferences] 保存偏好失败:', error);
  }
}

// ============ 自动学习逻辑 ============

/**
 * 构建操作键
 * @example buildActionKey('applyFilter', { filter: 'warm' }) → 'applyFilter:warm'
 */
function buildActionKey(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'applyFilter':
      return `applyFilter:${args.filter || 'unknown'}`;
    case 'cropPhoto':
      return `cropPhoto:${args.aspectRatio || 'unknown'}`;
    case 'adjustImage': {
      // 记录调整方向
      const b = args.brightness as number | undefined;
      const c = args.contrast as number | undefined;
      const s = args.saturation as number | undefined;
      const parts: string[] = [];
      if (b !== undefined && b !== 0) parts.push(b > 0 ? 'brighter' : 'darker');
      if (c !== undefined && c !== 0) parts.push(c > 0 ? 'more-contrast' : 'less-contrast');
      if (s !== undefined && s !== 0) parts.push(s > 0 ? 'more-saturated' : 'less-saturated');
      return `adjustImage:${parts.join(',') || 'neutral'}`;
    }
    case 'rotatePhoto':
      return `rotatePhoto:${args.degrees || 90}`;
    case 'generateVideo':
      return `generateVideo:${args.type || 'i2v'}`;
    default:
      return toolName;
  }
}

/**
 * 查找使用频率最高的操作
 */
function findMostFrequent(stats: Record<string, number>, prefix: string): string | undefined {
  let maxCount = 0;
  let result: string | undefined;

  for (const [key, count] of Object.entries(stats)) {
    if (key.startsWith(prefix) && count > maxCount) {
      maxCount = count;
      result = key.replace(`${prefix}`, '');
    }
  }

  // 至少使用 3 次才算有效偏好
  return maxCount >= 3 ? result : undefined;
}

/**
 * 分析操作模式
 */
function analyzePatterns(stats: Record<string, number>): Array<{ pattern: string; confidence: number }> {
  const observations: Array<{ pattern: string; confidence: number }> = [];

  // 分析滤镜偏好
  const warmCount = stats['applyFilter:warm'] || 0;
  const coolCount = stats['applyFilter:cool'] || 0;
  const vintageCount = stats['applyFilter:vintage'] || 0;
  const filmCount = stats['applyFilter:film'] || 0;

  if (warmCount > 3 && warmCount > coolCount * 2) {
    observations.push({
      pattern: '用户偏好暖色调滤镜',
      confidence: Math.min(warmCount / 10, 1),
    });
  }

  if (coolCount > 3 && coolCount > warmCount * 2) {
    observations.push({
      pattern: '用户偏好冷色调滤镜',
      confidence: Math.min(coolCount / 10, 1),
    });
  }

  if (vintageCount + filmCount > 5) {
    observations.push({
      pattern: '用户喜欢复古/胶片风格',
      confidence: Math.min((vintageCount + filmCount) / 15, 1),
    });
  }

  // 分析裁剪偏好
  const squareCount = stats['cropPhoto:1:1'] || 0;
  const wideCount = stats['cropPhoto:16:9'] || 0;

  if (squareCount > 3) {
    observations.push({
      pattern: '用户常用 1:1 正方形裁剪',
      confidence: Math.min(squareCount / 10, 1),
    });
  }

  if (wideCount > 3) {
    observations.push({
      pattern: '用户常用 16:9 宽屏裁剪',
      confidence: Math.min(wideCount / 10, 1),
    });
  }

  // 分析亮度偏好
  const brighterCount = stats['adjustImage:brighter'] || 0;
  const darkerCount = stats['adjustImage:darker'] || 0;

  if (brighterCount > 3 && brighterCount > darkerCount * 2) {
    observations.push({
      pattern: '用户偏好明亮的图片',
      confidence: Math.min(brighterCount / 10, 1),
    });
  }

  return observations;
}

/**
 * 更新学习到的偏好
 */
function updateLearnedPreference(
  profile: UserPreferenceProfile,
  observation: { pattern: string; confidence: number }
): void {
  const existingIndex = profile.learned.findIndex((l) => l.pattern === observation.pattern);

  if (existingIndex >= 0) {
    // 更新置信度（取较高值）
    profile.learned[existingIndex].confidence = Math.max(
      profile.learned[existingIndex].confidence,
      observation.confidence
    );
    profile.learned[existingIndex].observedAt = new Date();
  } else {
    // 添加新观察
    profile.learned.push({
      pattern: observation.pattern,
      confidence: observation.confidence,
      observedAt: new Date(),
    });
  }

  // 限制学习记录数量
  if (profile.learned.length > 10) {
    // 按置信度排序，保留前 10 个
    profile.learned.sort((a, b) => b.confidence - a.confidence);
    profile.learned = profile.learned.slice(0, 10);
  }
}

/**
 * 从工具执行结果自动学习
 * @description 每次工具成功执行后调用，用于自动分析用户偏好
 */
export async function autoLearnFromToolResult(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  success: boolean
): Promise<void> {
  // 只学习成功的操作
  if (!success) return;

  // 只学习编辑相关的工具
  const learnableTools = ['applyFilter', 'cropPhoto', 'adjustImage', 'rotatePhoto', 'generateVideo'];
  if (!learnableTools.includes(toolName)) return;

  try {
    let profile = await loadPreference(userId);
    if (!profile) {
      profile = createDefaultProfile(userId);
    }

    // 更新操作统计
    const actionKey = buildActionKey(toolName, args);
    profile.actionStats[actionKey] = (profile.actionStats[actionKey] || 0) + 1;
    console.log(`[UserPreferences] 记录操作: ${actionKey}, 累计: ${profile.actionStats[actionKey]}`);

    // 分析模式并生成观察
    const observations = analyzePatterns(profile.actionStats);
    for (const obs of observations) {
      updateLearnedPreference(profile, obs);
    }

    // 更新推断的默认值
    profile.editing.preferredFilter = findMostFrequent(profile.actionStats, 'applyFilter:');
    profile.editing.defaultCropRatio = findMostFrequent(profile.actionStats, 'cropPhoto:');

    await savePreference(userId, profile);
  } catch (error) {
    console.error('[UserPreferences] 自动学习失败:', error);
  }
}

/**
 * 获取用户偏好上下文（注入到 System Prompt）
 */
export async function getPreferenceContext(userId: string): Promise<string> {
  try {
    const profile = await loadPreference(userId);
    if (!profile) return '';

    const lines: string[] = ['## 用户偏好（自动学习）'];

    if (profile.editing.preferredFilter) {
      lines.push(`- 常用滤镜：${profile.editing.preferredFilter}`);
    }
    if (profile.editing.defaultCropRatio) {
      lines.push(`- 默认裁剪：${profile.editing.defaultCropRatio}`);
    }

    // 添加置信度高的学习偏好
    const highConfidenceLearned = profile.learned.filter((l) => l.confidence > 0.7);
    for (const learned of highConfidenceLearned.slice(0, 3)) {
      lines.push(`- ${learned.pattern}`);
    }

    return lines.length > 1 ? lines.join('\n') : '';
  } catch (error) {
    console.error('[UserPreferences] 获取偏好上下文失败:', error);
    return '';
  }
}

/**
 * 清除用户偏好（用于测试或用户请求）
 */
export async function clearPreference(userId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, userId);
    console.log('[UserPreferences] 偏好已清除:', userId);
  } catch (error) {
    console.error('[UserPreferences] 清除偏好失败:', error);
  }
}

export default {
  loadPreference,
  savePreference,
  autoLearnFromToolResult,
  getPreferenceContext,
  clearPreference,
};
