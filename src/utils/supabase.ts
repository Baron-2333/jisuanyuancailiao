import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zehhkfkntqrzywcmkckh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaGhrZmtudHFyenl3Y21rY2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDA4NDUsImV4cCI6MjA5NDY3Njg0NX0.JDTyJnScRW_ExP6rf3CUBmixR7H1YlakIKzH9TTTyrs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 获取当前用户 ID (示例，需要替换为实际登录逻辑)
export const getCurrentUserId = (): string => {
  // TODO: 替换为实际的用户 ID 获取逻辑
  // 例如从 localStorage 或 Supabase Auth 获取
  return localStorage.getItem('user_id') || 'anonymous'
}
