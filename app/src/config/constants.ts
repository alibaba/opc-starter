/**
 * 常量配置 - OPC-Starter
 */

/**
 * API基础URL
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 文件上传限制
 */
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_IMAGE_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
} as const;

/**
 * 分页配置
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [12, 20, 40, 60],
} as const;

/**
 * 时间格式
 */
export const DATE_FORMATS = {
  DISPLAY: 'yyyy-MM-dd HH:mm:ss',
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm:ss',
  YEAR_MONTH: 'yyyy-MM',
} as const;

/**
 * 部门列表
 */
export const DEPARTMENTS = [
  '技术部',
  '产品部',
  '设计部',
  '运营部',
  '市场部',
  '人力资源部',
  '财务部',
  '行政部',
] as const;

/**
 * IndexedDB配置
 */
export const DB_CONFIG = {
  NAME: 'OPCStarterDB',
  VERSION: 1,
  STORES: {
    PERSONS: 'persons',
  },
} as const;
