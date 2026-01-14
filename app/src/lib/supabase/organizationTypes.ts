export interface Organization {
  id: string;
  name: string;
  display_name: string;
  parent_id: string | null;
  path: string;
  level: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  role: 'admin' | 'manager' | 'member';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  user_id: string;
  
  // OSS-native storage (v5.0)
  oss_url: string;
  oss_key: string;
  
  // File metadata
  file_hash: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  
  // EXIF metadata
  taken_at: string | null;
  camera_make: string | null;
  camera_model: string | null;
  location_lat: number | null;
  location_lon: number | null;
  location_name: string | null;
  
  // Organization/Team (Epic-15)
  // Epic-22: 新增 'public' 全员可见
  organization_id: string | null;
  visibility: 'private' | 'organization' | 'public';
  participants: string[] | null;
  
  // Upload tracking (Epic-20)
  uploaded_by: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  display_name: string;
  parent_id: string | null;
  description?: string | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  display_name?: string;
  description?: string | null;
}

export interface OrganizationTreeNode extends Organization {
  children?: OrganizationTreeNode[];
  member_count?: number;
}

export interface UserOrganizationInfo {
  organization: Organization | null;
  ancestors: Organization[];
  role: 'admin' | 'manager' | 'member';
}