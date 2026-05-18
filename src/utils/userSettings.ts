// 用户设置类型
export interface UserSetting {
  id: string
  user_id: string
  setting_key: string
  setting_value: string
  created_at: string
  updated_at: string
}

// 获取用户的所有设置
export async function getUserSettings(userId: string): Promise<UserSetting[]> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .order('setting_key')

  if (error) {
    console.error('获取设置失败:', error)
    throw error
  }
  return data || []
}

// 获取单个设置
export async function getUserSetting(userId: string, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // 没找到
    console.error('获取设置失败:', error)
    throw error
  }
  return data?.setting_value ?? null
}

// 创建或更新单个设置
export async function upsertUserSetting(userId: string, key: string, value: string): Promise<UserSetting> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,setting_key' }
    )
    .select()
    .single()

  if (error) {
    console.error('保存设置失败:', error)
    throw error
  }
  return data
}

// 批量创建或更新设置
export async function upsertUserSettings(
  userId: string,
  settings: Record<string, string>
): Promise<UserSetting[]> {
  const records = Object.entries(settings).map(([key, value]) => ({
    user_id: userId,
    setting_key: key,
    setting_value: value,
    updated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(records, { onConflict: 'user_id,setting_key' })
    .select()

  if (error) {
    console.error('批量保存设置失败:', error)
    throw error
  }
  return data || []
}

// 删除单个设置
export async function deleteUserSetting(userId: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId)
    .eq('setting_key', key)

  if (error) {
    console.error('删除设置失败:', error)
    throw error
  }
}

// 删除用户所有设置
export async function deleteAllUserSettings(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('删除所有设置失败:', error)
    throw error
  }
}
