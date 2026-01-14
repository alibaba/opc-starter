// API通用类型定义

/**
 * API响应通用格式
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number; // 页码（从1开始）
  pageSize: number; // 每页数量
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number; // 总数
  page: number; // 当前页
  pageSize: number; // 每页数量
  totalPages: number; // 总页数
}

/**
 * 照片查询参数
 */
export interface PhotoQueryParams extends PaginationParams {
  personId?: string; // 按人员过滤
  startDate?: string; // 时间范围开始
  endDate?: string; // 时间范围结束
  tags?: string[]; // 标签过滤
  keyword?: string; // 关键词搜索
}

/**
 * 照片上传请求
 */
export interface PhotoUploadRequest {
  base64: string;
  filename: string;
  tags?: string[];
}

/**
 * 照片上传响应
 */
export interface PhotoUploadResponse {
  photoId: string;
  faces: Array<{
    personId: string;
    personName: string;
    confidence: number;
  }>;
}
