import { supabase } from '@/lib/supabase/client';
import { authService } from '@/lib/supabase/auth';
import type { Person } from '@/types/person';

interface SupabasePerson {
  id: string;
  user_id: string;
  name: string;
  avatar?: string;
  tags?: string[];
  department?: string;
  photo_count?: number;
  created_at: string;
  updated_at: string;
}

function transformSupabasePerson(supabasePerson: SupabasePerson): Person {
  return {
    id: supabasePerson.id,
    name: supabasePerson.name,
    avatar: supabasePerson.avatar || '',
    department: supabasePerson.department || '',
    joinedAt: new Date(supabasePerson.created_at),
    photoCount: supabasePerson.photo_count || 0,
    tags: supabasePerson.tags || [],
  };
}

function transformToSupabasePerson(person: Omit<Person, 'id' | 'photoCount'>, userId: string): Omit<SupabasePerson, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: person.name,
    avatar: person.avatar,
    tags: person.tags,
  };
}

export async function getPersons(): Promise<Person[]> {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase 查询人物列表错误:', error);
      throw new Error(`获取人物列表失败: ${error.message}`);
    }

    const persons = (data || []).map(transformSupabasePerson);
    console.log(`✅ 成功获取人物列表: 共${persons.length}个人物`);
    return persons;
  } catch (error) {
    console.error('获取人物列表失败:', error);
    throw error;
  }
}

export async function getPersonById(personId: string): Promise<Person | null> {
  try {
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    if (error) {
      throw new Error(`获取人物详情失败: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return transformSupabasePerson(data);
  } catch (error) {
    console.error('获取人物详情失败:', error);
    throw error;
  }
}

export async function createPerson(person: Omit<Person, 'id' | 'photoCount'>): Promise<Person> {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const supabasePerson = transformToSupabasePerson(person, user.id);
    
    const { data, error } = await supabase
      .from('persons')
      .insert(supabasePerson)
      .select()
      .single();

    if (error) {
      throw new Error(`创建人物失败: ${error.message}`);
    }

    console.log(`✅ 成功创建人物: ${person.name}`);
    return transformSupabasePerson(data);
  } catch (error) {
    console.error('创建人物失败:', error);
    throw error;
  }
}

export async function updatePerson(personId: string, updates: Partial<Omit<Person, 'id' | 'photoCount'>>): Promise<void> {
  try {
    const supabaseUpdates: Partial<SupabasePerson> = {};
    
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.avatar !== undefined) supabaseUpdates.avatar = updates.avatar;
    if (updates.tags !== undefined) supabaseUpdates.tags = updates.tags;

    const { error } = await supabase
      .from('persons')
      .update(supabaseUpdates)
      .eq('id', personId);

    if (error) {
      throw new Error(`更新人物失败: ${error.message}`);
    }

    console.log(`✅ 成功更新人物: ${personId}`);
  } catch (error) {
    console.error('更新人物失败:', error);
    throw error;
  }
}

export async function deletePerson(personId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', personId);

    if (error) {
      throw new Error(`删除人物失败: ${error.message}`);
    }

    console.log(`✅ 成功删除人物: ${personId}`);
  } catch (error) {
    console.error('删除人物失败:', error);
    throw error;
  }
}

export async function getPersonPhotoCount(personId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('faces')
      .select('*', { count: 'exact', head: true })
      .eq('person_id', personId);

    if (error) {
      throw new Error(`获取人物照片数失败: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('获取人物照片数失败:', error);
    return 0;
  }
}
