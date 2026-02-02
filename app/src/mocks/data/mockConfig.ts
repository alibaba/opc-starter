/**
 * Mock数据配置
 */
export const MOCK_CONFIG = {
  // API延迟时间（毫秒）
  API_DELAY: {
    MIN: 300,
    MAX: 1000,
  },
  
  // 上传延迟（毫秒）
  UPLOAD_DELAY: {
    MIN: 800,
    MAX: 2000,
  },
  
  // 人脸识别延迟（毫秒）
  FACE_RECOGNITION_DELAY: 1000,
  
  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // 数据量限制
  DATA_LIMITS: {
    MAX_PHOTOS: 500,
    MAX_PERSONS: 100,
    MAX_ALBUMS: 50,
  },
} as const;

/**
 * 生成随机延迟
 */
export function getRandomDelay(min: number = MOCK_CONFIG.API_DELAY.MIN, max: number = MOCK_CONFIG.API_DELAY.MAX): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
