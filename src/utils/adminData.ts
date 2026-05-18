import { supabase } from './supabase';
import { Material, Recipe } from '../types';

/**
 * 从 Supabase 获取指定用户的数据
 */
export async function getUserDataFromDB(userId: string): Promise<{ materials: Material[]; recipes: Recipe[] }> {
  try {
    // 先尝试获取用户自己的数据
    const { data: ownSettings, error: ownError } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userId);

    let materials: Material[] = [];
    let recipes: Recipe[] = [];

    // 如果获取到数据，处理它
    if (ownSettings && ownSettings.length > 0) {
      for (const row of ownSettings) {
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
      
      // 如果用户有自己的数据，直接返回
      if (materials.length > 0 || recipes.length > 0) {
        return { materials, recipes };
      }
    }

    // 如果用户没有数据，尝试获取 admin 数据
    const adminData = await getAdminData();
    return adminData;
  } catch (e) {
    console.error('获取用户数据异常:', e);
    // 出错时也尝试获取 admin 数据
    return await getAdminData();
  }
}

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
