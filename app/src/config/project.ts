/**
 * 项目配置 - OPC-Starter 模板配置
 * @description 支持模板化的项目配置，所有硬编码的项目名称、助手名称等都从这里读取
 */

/**
 * 项目配置接口
 */
export interface ProjectConfig {
  /** 项目名称（用于显示） */
  name: string
  /** 项目描述 */
  description: string
  /** Agent 助手名称 */
  agentName: string
  /** Agent 助手描述 */
  agentDescription: string
  /** 存储键前缀 */
  storageKeyPrefix: string
  /** IndexedDB 数据库前缀 */
  dbPrefix: string
}

/**
 * 默认项目配置
 * 可通过环境变量覆盖
 */
const defaultConfig: ProjectConfig = {
  name: import.meta.env.VITE_PROJECT_NAME || 'OPC-Starter',
  description: import.meta.env.VITE_PROJECT_DESCRIPTION || 'AI-Friendly React Boilerplate',
  agentName: import.meta.env.VITE_AGENT_NAME || 'AI 助手',
  agentDescription: import.meta.env.VITE_AGENT_DESCRIPTION || '智能助手，随时为您服务',
  storageKeyPrefix: 'opc-starter',
  dbPrefix: 'opc-starter',
}

/**
 * 项目配置实例
 * 单例模式，确保配置一致性
 */
let _config: ProjectConfig | null = null

/**
 * 获取项目配置
 */
export function getProjectConfig(): ProjectConfig {
  if (!_config) {
    _config = { ...defaultConfig }
  }
  return _config
}

/**
 * 设置项目配置（用于模板初始化）
 * @description 在应用启动时调用，覆盖默认配置
 */
export function setProjectConfig(config: Partial<ProjectConfig>): void {
  _config = {
    ...defaultConfig,
    ...config,
  }
}

/**
 * 生成存储键
 * @example getStorageKey('theme') → 'opc-starter-theme'
 */
export function getStorageKey(key: string): string {
  return `${getProjectConfig().storageKeyPrefix}:${key}`
}

/**
 * 生成 IndexedDB 数据库名称
 * @example getDbName('agent-sessions') → 'opc-starter-agent-sessions'
 */
export function getDbName(name: string): string {
  return `${getProjectConfig().dbPrefix}-${name}`
}

/**
 * 项目配置常量（便于直接导入使用）
 */
export const PROJECT_CONFIG = {
  get name() {
    return getProjectConfig().name
  },
  get description() {
    return getProjectConfig().description
  },
  get agentName() {
    return getProjectConfig().agentName
  },
  get agentDescription() {
    return getProjectConfig().agentDescription
  },
  get storageKeyPrefix() {
    return getProjectConfig().storageKeyPrefix
  },
  get dbPrefix() {
    return getProjectConfig().dbPrefix
  },
} as const

export default PROJECT_CONFIG
