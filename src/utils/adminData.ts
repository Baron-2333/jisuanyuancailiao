import { supabase } from './supabase';
import { Material, Recipe } from '../types';

/**
 * 获取 admin 用户的配方和原材料数据
 * 未登录用户可以通过此函数获取默认数据
 */
export async function getAdminData(): Promise<{ materials: Material[]; recipes: Recipe[] }> {
  try {
    // 查询 admin 用户的数据
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('is_admin', true);

    if (error) {
      console.error('获取 admin 数据失败:', error);
      return { materials: [], recipes: [] };
    }

    let materials: Material[] = [];
    let recipes: Recipe[] = [];

    for (const row of settings || []) {
      if (row.setting_key === 'materials' && row.setting_value) {
        try {
          materials = JSON.parse(row.setting_value);
        } catch (e) {
          console.error('解析 materials 失败:', e);
        }
      }
      if (row.setting_key === 'recipes' && row.setting_value) {
        try {
          recipes = JSON.parse(row.setting_value);
        } catch (e) {
          console.error('解析 recipes 失败:', e);
        }
      }
    }

    return { materials, recipes };
  } catch (e) {
    console.error('获取 admin 数据异常:', e);
    return { materials: [], recipes: [] };
  }
}

/**
 * 检查当前用户是否为 admin
 */
export async function isAdminUser(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', userId)
      .eq('is_admin', true)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
}
