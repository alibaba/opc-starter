/**
 * 滤镜类型定义
 * Epic: 8 - 照片编辑
 * Story: 8.3 - 滤镜效果
 */

/**
 * 滤镜类型
 * STORY-23-010: 统一滤镜定义
 */
export type FilterType =
  | 'original'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'high-contrast'
  | 'warm'
  | 'cool'
  | 'vibrant'
  | 'vintage'  // STORY-23-010: 复古滤镜
  | 'film'     // STORY-23-010: 胶片滤镜
  | 'dramatic' // STORY-23-010: 戏剧滤镜
  | 'fade';    // STORY-23-010: 褪色滤镜

/**
 * 滤镜配置
 */
export interface FilterConfig {
  id: FilterType;
  name: string;
  cssFilter: string;
  icon?: string;
}

/**
 * 预定义滤镜列表
 * STORY-23-010: 扩展滤镜列表
 */
export const FILTERS: FilterConfig[] = [
  {
    id: 'original',
    name: '原图',
    cssFilter: 'none',
  },
  {
    id: 'grayscale',
    name: '黑白',
    cssFilter: 'grayscale(100%)',
  },
  {
    id: 'sepia',
    name: '怀旧',
    cssFilter: 'sepia(80%)',
  },
  {
    id: 'vintage',
    name: '复古',
    cssFilter: 'sepia(30%) contrast(110%)',
  },
  {
    id: 'warm',
    name: '暖色',
    cssFilter: 'saturate(120%) hue-rotate(-10deg)',
  },
  {
    id: 'cool',
    name: '冷色',
    cssFilter: 'saturate(120%) hue-rotate(10deg)',
  },
  {
    id: 'film',
    name: '胶片',
    cssFilter: 'contrast(90%) brightness(110%) saturate(80%)',
  },
  {
    id: 'dramatic',
    name: '戏剧',
    cssFilter: 'contrast(130%) saturate(110%)',
  },
  {
    id: 'fade',
    name: '褪色',
    cssFilter: 'contrast(90%) brightness(110%) saturate(80%)',
  },
  {
    id: 'invert',
    name: '反色',
    cssFilter: 'invert(100%)',
  },
  {
    id: 'high-contrast',
    name: '高对比',
    cssFilter: 'contrast(150%) saturate(120%)',
  },
  {
    id: 'vibrant',
    name: '鲜艳',
    cssFilter: 'saturate(150%) contrast(110%)',
  },
];

