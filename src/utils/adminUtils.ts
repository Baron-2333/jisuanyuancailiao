import { supabase } from './supabase';

/**
 * 用户类型
 */
export type UserType = 'admin' | 'user';

/**
 * 用户信息
 */
export interface UserInfo {
  id: string;
  email?: string;
  userType: UserType;
  createdAt: string;
}

/**
 * 获取当前用户类型
 * 从 user_settings 表读取 is_admin 字段
 */
export async function getUserType(userId: string): Promise<UserType> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', userId)
    .eq('setting_key', '__user_meta__')
    .single();

  if (error || !data) {
    return 'user'; // 默认普通用户
  }

  return data.is_admin ? 'admin' : 'user';
}

/**
 * 检查是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const userType = await getUserType(userId);
  return userType === 'admin';
}

/**
 * 设置用户为管理员（需要当前用户是管理员）
 */
export async function setAdmin(targetUserId: string, isAdmin: boolean): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('未登录');

  // 检查当前用户是否为管理员
  const currentIsAdmin = await isAdmin(session.user.id);
  if (!currentIsAdmin) throw new Error('权限不足，需要管理员权限');

  // upsert 用户元数据
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: targetUserId,
      setting_key: '__user_meta__',
      setting_value: JSON.stringify({ is_admin: isAdmin }),
      is_admin: isAdmin, // 这个字段其实没用，保留用于查询
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,setting_key'
    });

  if (error) throw error;
  return true;
}

/**
 * 获取所有用户列表（管理员专用）
 */
export async function getAllUsers(): Promise<{ user_id: string; created_at: string }[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('未登录');

  const currentIsAdmin = await isAdmin(session.user.id);
  if (!currentIsAdmin) throw new Error('权限不足');

  // 从 user_settings 表获取所有不同的 user_id
  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id, created_at')
    .eq('setting_key', '__user_meta__')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 去重
  const uniqueUsers = data?.reduce((acc: { user_id: string; created_at: string }[], item) => {
    if (!acc.find(u => u.user_id === item.user_id)) {
      acc.push({ user_id: item.user_id, created_at: item.created_at });
    }
    return acc;
  }, []) || [];

  return uniqueUsers;
}

/**
 * 获取指定用户的所有设置（管理员专用）
 */
export async function getUserSettingsById(targetUserId: string): Promise<any[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('未登录');

  const currentIsAdmin = await isAdmin(session.user.id);
  if (!currentIsAdmin) throw new Error('权限不足');

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 初始化用户元数据（注册时自动调用）
 */
export async function initUserMeta(userId: string, email?: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      setting_key: '__user_meta__',
      setting_value: JSON.stringify({ 
        email,
        is_admin: false,
        created_at: new Date().toISOString()
      }),
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,setting_key'
    });

  // 忽略错误（可能已存在）
  if (error && error.code !== '23505') {
    console.error('初始化用户元数据失败:', error);
  }
}
