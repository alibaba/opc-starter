// 人员相关类型定义

/**
 * 人员数据
 */
export interface Person {
  id: string;
  name: string; // 姓名
  avatar: string; // 头像Base64或URL
  department: string; // 部门
  joinedAt: Date; // 入职时间
  photoCount: number; // 关联照片数量
  tags?: string[]; // 标签
  position?: string; // 职位
  bio?: string; // 简介
}

/**
 * 人员统计信息
 */
export interface PersonStats {
  personId: string;
  photoCount: number; // 照片总数
  firstAppearance: Date; // 首次出现时间
  lastAppearance: Date; // 最近出现时间
  departments: string[]; // 关联部门列表
}
