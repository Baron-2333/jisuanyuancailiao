/**
 * Supabase Storage - localStorage 的云端替代方案
 * 
 * 使用方法（替换 localStorage）：
 * 
 *   // 旧写法 (localStorage)
 *   localStorage.setItem('theme', 'dark');
 *   const theme = localStorage.getItem('theme');
 * 
 *   // 新写法 (cloudStorage)
 *   await cloudStorage.set('theme', 'dark');
 *   const theme = await cloudStorage.get('theme');
 * 
 * 自动处理 JSON 序列化/反序列化，无需手动 stringify/parse
 */

import { createClient } from '@supabase/supabase-js'

// ============ 配置区（请填写你的 Supabase 信息）============
const SUPABASE_URL = 'https://zehhkfkntqrzywcmkckh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaGhrZmtudHFyenl3Y21rY2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDA4NDUsImV4cCI6MjA5NDY3Njg0NX0.JDTyJnScRW_ExP6rf3CUBmixR7H1YlakIKzH9TTTyrs';

// ============ 初始化 Supabase ============
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ 当前用户 ID（简单版：自动生成并存储在 localStorage）============
function getUserId(): string {
  let userId = localStorage.getItem('cloudStorage_userId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('cloudStorage_userId', userId);
  }
  return userId;
}

// ============ 核心 API：完全替代 localStorage ============

/**
 * 保存数据（自动判断：没有则插入，有则更新）
 * @param key   键名（字符串）
 * @param value 值（任意类型，自动转为 JSON）
 * @returns true 成功，false 失败
 */
async function saveData(key: string, value: any): Promise<boolean> {
  try {
    const userId = getUserId();
    const jsonValue = JSON.stringify(value);
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: key,
        setting_value: jsonValue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,setting_key'
      });
    
    if (error) {
      console.error('cloudStorage.set 失败:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('cloudStorage.set 异常:', err);
    return false;
  }
}

/**
 * 读取数据
 * @param key          键名
 * @param defaultValue 默认值（找不到时返回）
 * @returns 值（自动反序列化），找不到返回 defaultValue
 */
async function loadData<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
  try {
    const userId = getUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', key)
      .single();
    
    if (error || !data) {
      return defaultValue;
    }
    
    return JSON.parse(data.setting_value);
  } catch (err) {
    console.error('cloudStorage.get 异常:', err);
    return defaultValue;
  }
}

/**
 * 删除数据
 * @param key 键名
 * @returns true 成功，false 失败
 */
async function removeData(key: string): Promise<boolean> {
  try {
    const userId = getUserId();
    
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .eq('setting_key', key);
    
    if (error) {
      console.error('cloudStorage.remove 失败:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('cloudStorage.remove 异常:', err);
    return false;
  }
}

/**
 * 获取用户所有键值对
 * @returns 键值对对象
 */
async function getAllData(): Promise<Record<string, any>> {
  try {
    const userId = getUserId();
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userId);
    
    if (error || !data) {
      return {};
    }
    
    const result: Record<string, any> = {};
    for (const item of data) {
      try {
        result[item.setting_key] = JSON.parse(item.setting_value);
      } catch {
        result[item.setting_key] = item.setting_value;
      }
    }
    return result;
  } catch (err) {
    console.error('cloudStorage.getAll 异常:', err);
    return {};
  }
}

/**
 * 清空用户所有数据
 * @returns true 成功，false 失败
 */
async function clearAll(): Promise<boolean> {
  try {
    const userId = getUserId();
    
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('cloudStorage.clear 失败:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('cloudStorage.clear 异常:', err);
    return false;
  }
}

// ============ 导出 ============
export const cloudStorage = {
  set: saveData,
  get: loadData,
  remove: removeData,
  getAll: getAllData,
  clear: clearAll
};

// 兼容旧写法
export { saveData, loadData, removeData, getAllData, clearAll };
