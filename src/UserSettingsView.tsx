import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, Loader2, LogIn, LogOut, User, Shield, Users, Crown, Download, Upload } from 'lucide-react';
import { cn } from './utils/utils';
import { supabase } from './utils/supabase';
import { 
  UserSetting, 
  getUserSettings, 
  upsertUserSetting, 
  deleteUserSetting 
} from './utils/userSettings';
import { 
  UserType, 
  getUserType, 
  setAdmin, 
  getAllUsers, 
  getUserSettingsById,
  initUserMeta 
} from './utils/adminUtils';
import { getMaterials, getRecipes, saveMaterials, saveRecipes } from './utils/storage';
import { Material, Recipe } from './types';

interface UserSettingsViewProps {
  isDark: boolean;
}

export function UserSettingsView({ isDark }: UserSettingsViewProps) {
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<UserType>('user');
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // 管理员模式
  const [adminMode, setAdminMode] = useState(false);
  const [allUsers, setAllUsers] = useState<{ user_id: string; created_at: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserSettings, setSelectedUserSettings] = useState<UserSetting[]>([]);
  
  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 备份恢复状态
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 加载设置
  useEffect(() => {
    if (isLoggedIn && userId && !adminMode) {
      loadSettings();
    }
  }, [isLoggedIn, userId, adminMode]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setIsLoggedIn(true);
      
      // 获取用户类型
      const type = await getUserType(session.user.id);
      setUserType(type);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserSettings(userId);
      setSettings(data);
    } catch (err) {
      setError('加载设置失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // 如果账号未确认，尝试重新注册（更新为已确认状态）
        if (error.message?.includes('Email not confirmed')) {
          const { error: signupErr } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { confirmed: true } }
          });
          if (!signupErr || signupErr.message?.includes('already')) {
            // 重新尝试登录
            const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
            if (retryErr) throw retryErr;
            if (retryData.user) {
              setUserId(retryData.user.id);
              setIsLoggedIn(true);
              await initUserMeta(retryData.user.id, email);
              const type = await getUserType(retryData.user.id);
              setUserType(type);
              setAuthLoading(false);
              return;
            }
          }
        }
        throw error;
      }
      if (data.user) {
        setUserId(data.user.id);
        setIsLoggedIn(true);
        
        // 初始化用户元数据
        await initUserMeta(data.user.id, email);
        
        // 获取用户类型
        const type = await getUserType(data.user.id);
        setUserType(type);
      }
    } catch (err: any) {
      setAuthError(err.message || '登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  // 注册
  const handleSignup = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { confirmed: true } }
      });
      if (error) {
        // 如果账号已存在，直接尝试登录
        if (error.message?.includes('already')) {
          await handleLogin(email, password);
          return;
        }
        throw error;
      }
      if (data.user) {
        setUserId(data.user.id);
        setIsLoggedIn(true);
        
        // 初始化用户元数据
        await initUserMeta(data.user.id, email);
        
        // 获取用户类型
        const type = await getUserType(data.user.id);
        setUserType(type);
      }
    } catch (err: any) {
      setAuthError(err.message || '注册失败');
    } finally {
      setAuthLoading(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserId('');
    setSettings([]);
    setUserType('user');
    setAdminMode(false);
  };

  // 添加设置
  const handleAddSetting = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    
    setLoading(true);
    try {
      await upsertUserSetting(userId, newKey.trim(), newValue.trim());
      await loadSettings();
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
    } catch (err) {
      setError('添加设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 编辑设置
  const handleEditSetting = (setting: UserSetting) => {
    setEditingKey(setting.setting_key);
    setEditingValue(setting.setting_value);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingKey || !editingValue.trim()) return;
    
    setLoading(true);
    try {
      await upsertUserSetting(userId, editingKey, editingValue.trim());
      await loadSettings();
      setEditingKey(null);
      setEditingValue('');
    } catch (err) {
      setError('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除设置
  const handleDeleteSetting = async (key: string) => {
    if (!confirm(`确定要删除设置「${key}」吗？`)) return;
    
    setLoading(true);
    try {
      await deleteUserSetting(userId, key);
      await loadSettings();
    } catch (err) {
      setError('删除设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
    setNewKey('');
    setNewValue('');
    setShowAddForm(false);
  };

  // ============ 备份恢复功能 ============
  
  // 导出数据为 JSON 文件
  const handleExportBackup = () => {
    setBackupLoading(true);
    try {
      const materials = getMaterials();
      const recipes = getRecipes();
      
      const backupData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        materials,
        recipes,
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minecraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('备份导出成功！');
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setBackupLoading(false);
    }
  };
  
  // 从 JSON 文件恢复数据
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm('导入将覆盖当前所有数据，确定继续吗？')) {
      e.target.value = '';
      return;
    }
    
    setRestoreLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // 验证数据格式
        if (!data.materials || !data.recipes) {
          throw new Error('无效的备份文件格式');
        }
        
        // 保存到 localStorage
        saveMaterials(data.materials);
        saveRecipes(data.recipes);
        
        alert('数据恢复成功！请刷新页面查看最新数据。');
        e.target.value = '';
      } catch (err) {
        console.error('导入失败:', err);
        alert('导入失败：' + (err instanceof Error ? err.message : '无效的备份文件'));
      } finally {
        setRestoreLoading(false);
      }
    };
    
    reader.onerror = () => {
      alert('读取文件失败');
      setRestoreLoading(false);
      e.target.value = '';
    };
    
    reader.readAsText(file);
  };

  // ============ 管理员功能 ============
  
  // 加载所有用户
  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (err: any) {
      setError(err.message || '加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择查看某用户设置
  const viewUserSettings = async (targetUserId: string) => {
    setSelectedUser(targetUserId);
    setLoading(true);
    try {
      const settings = await getUserSettingsById(targetUserId);
      setSelectedUserSettings(settings);
    } catch (err: any) {
      setError(err.message || '加载用户设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 设置管理员
  const handleSetAdmin = async (targetUserId: string, becomeAdmin: boolean) => {
    if (!confirm(`确定要 ${becomeAdmin ? '设置' : '取消'} 该用户的管理员权限吗？`)) return;
    
    setLoading(true);
    try {
      await setAdmin(targetUserId, becomeAdmin);
      await loadAllUsers();
      alert(`已 ${becomeAdmin ? '设置' : '取消'} 该用户的管理员权限`);
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 进入管理员模式
  const enterAdminMode = async () => {
    await loadAllUsers();
    setAdminMode(true);
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  // ============ 渲染 ============
  
  // 管理员模式
  if (adminMode && userType === 'admin') {
    return (
      <div className="space-y-5">
        <div className={cn("rounded-xl p-6", cardClass)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-xl bg-purple-500/20")}>
                <Crown className="text-purple-400" size={24} />
              </div>
              <div>
                <p className={cn("font-medium", isDark ? "text-white" : "text-gray-800")}>
                  管理员后台
                </p>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-500")}>
                  管理所有用户和设置
                </p>
              </div>
            </div>
            <button
              onClick={() => { setAdminMode(false); setSelectedUser(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-200 hover:bg-gray-300"
              )}
            >
              返回我的设置
            </button>
          </div>
        </div>

        {selectedUser ? (
          // 查看指定用户设置
          <div className={cn("rounded-xl p-6", cardClass)}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>
                  用户设置详情
                </h2>
                <p className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-500")}>
                  User ID: {selectedUser.slice(0, 8)}...
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm",
                  isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-200 hover:bg-gray-300"
                )}
              >
                返回列表
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto" size={32} />
              </div>
            ) : (
              <div className={cn("rounded-lg overflow-hidden", isDark ? "bg-slate-900/50" : "bg-gray-50")}>
                <table className="w-full text-sm">
                  <thead className={isDark ? "bg-slate-700/50" : "bg-gray-100"}>
                    <tr>
                      <th className={cn("text-left py-2 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>键</th>
                      <th className={cn("text-left py-2 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>值</th>
                      <th className={cn("text-left py-2 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUserSettings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={cn("py-6 text-center", isDark ? "text-slate-500" : "text-gray-400")}>
                          该用户暂无设置
                        </td>
                      </tr>
                    ) : (
                      selectedUserSettings.map(setting => (
                        <tr key={setting.id} className={cn("border-t", isDark ? "border-slate-700" : "border-gray-200")}>
                          <td className={cn("py-2 px-4 font-mono text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                            {setting.setting_key}
                          </td>
                          <td className={cn("py-2 px-4", isDark ? "text-slate-300" : "text-gray-700")}>
                            {setting.setting_value || '-'}
                          </td>
                          <td className={cn("py-2 px-4 text-xs", isDark ? "text-slate-500" : "text-gray-400")}>
                            {new Date(setting.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // 用户列表
          <div className={cn("rounded-xl p-6", cardClass)}>
            <h2 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>
              用户列表
              <span className={cn("text-sm font-normal ml-2", isDark ? "text-slate-400" : "text-gray-500")}>
                {allUsers.length} 人
              </span>
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto" size={32} />
              </div>
            ) : (
              <div className="space-y-2">
                {allUsers.map(user => {
                  const isCurrentUser = user.user_id === userId;
                  return (
                    <div 
                      key={user.user_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        isDark ? "bg-slate-700/50" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", isDark ? "bg-slate-600" : "bg-gray-200")}>
                          <User size={18} className={isDark ? "text-slate-300" : "text-gray-600"} />
                        </div>
                        <div>
                          <p className={cn("font-mono text-sm", isDark ? "text-white" : "text-gray-800")}>
                            {user.user_id.slice(0, 8)}...{user.user_id.slice(-4)}
                            {isCurrentUser && <span className={cn("ml-2 text-xs", isDark ? "text-blue-400" : "text-blue-600")}>（我）</span>}
                          </p>
                          <p className={cn("text-xs", isDark ? "text-slate-500" : "text-gray-400")}>
                            注册于 {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewUserSettings(user.user_id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm",
                            isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          )}
                        >
                          查看设置
                        </button>
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleSetAdmin(user.user_id, false)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm",
                              isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-600 hover:bg-red-200"
                            )}
                          >
                            移除管理员
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={cn("rounded-lg p-4 text-sm text-red-400", isDark ? "bg-red-900/30" : "bg-red-50 text-red-600")}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // 普通用户模式
  return (
    <div className="space-y-5">
      {/* 登录/用户信息区域 */}
      <div className={cn("rounded-xl p-6", cardClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl", 
              userType === 'admin' 
                ? isDark ? "bg-purple-500/20" : "bg-purple-100"
                : isDark ? "bg-blue-500/20" : "bg-blue-100"
            )}>
              {userType === 'admin' ? (
                <Shield className={isDark ? "text-purple-400" : "text-purple-600"} size={24} />
              ) : (
                <User className={isDark ? "text-blue-400" : "text-blue-600"} size={24} />
              )}
            </div>
            <div>
              {isLoggedIn ? (
                <>
                  <p className={cn("font-medium", isDark ? "text-white" : "text-gray-800")}>
                    {userType === 'admin' ? '管理员' : '已登录'}
                  </p>
                  <p className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-500")}>
                    用户ID: {userId.slice(0, 8)}...
                  </p>
                </>
              ) : (
                <p className={cn("font-medium", isDark ? "text-slate-400" : "text-gray-500")}>未登录</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userType === 'admin' && (
              <button
                onClick={enterAdminMode}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                  isDark ? "bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30" : "bg-purple-100 text-purple-600 border border-purple-200 hover:bg-purple-200"
                )}
              >
                <Crown size={16} />
                管理后台
              </button>
            )}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                  isDark ? "text-red-400 border border-red-400 hover:bg-slate-700" : "text-red-600 border border-red-600 hover:bg-red-50"
                )}
              >
                <LogOut size={16} />
                登出
              </button>
            ) : (
              <LoginForm 
                onLogin={handleLogin} 
                onSignup={handleSignup}
                loading={authLoading}
                error={authError}
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </div>

      {/* 设置列表 */}
      {isLoggedIn && !adminMode && (
        <>
          <div className={cn("rounded-xl p-4", cardClass)}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>
                用户设置
                <span className={cn("text-sm font-normal ml-2", isDark ? "text-slate-400" : "text-gray-500")}>
                  {settings.length} 项
                </span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportBackup}
                  disabled={backupLoading}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                    isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30" : "bg-green-100 text-green-600 border border-green-200 hover:bg-green-200"
                  )}
                >
                  {backupLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  导出备份
                </button>
                <label
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer",
                    isDark ? "bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200"
                  )}
                >
                  {restoreLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  导入恢复
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    disabled={restoreLoading}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowAddForm(true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                    isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <Plus size={14} />
                  添加设置
                </button>
              </div>
            </div>
          </div>

          {/* 添加表单 */}
          {showAddForm && (
            <div className={cn("rounded-xl p-6", cardClass)}>
              <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>添加新设置</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="设置键 (key)"
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                />
                <textarea
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="设置值 (value)"
                  rows={3}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm resize-none", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleAddSetting}
                    disabled={loading || !newKey.trim() || !newValue.trim()}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                      loading || !newKey.trim() || !newValue.trim()
                        ? isDark ? "bg-slate-600 text-slate-400" : "bg-gray-300 text-gray-500"
                        : isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                    )}
                  >
                    <Save size={14} />
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={cn("px-4 py-2 rounded-lg text-sm", isDark ? "border border-slate-600 text-slate-300" : "border border-gray-300")}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className={cn("rounded-lg p-4 text-sm text-red-400", isDark ? "bg-red-900/30" : "bg-red-50 text-red-600")}>
              {error}
            </div>
          )}

          {/* 加载状态 */}
          {loading && (
            <div className={cn("rounded-xl p-8 text-center", cardClass)}>
              <Loader2 className="animate-spin mx-auto" size={32} />
              <p className={cn("mt-2", isDark ? "text-slate-400" : "text-gray-500")}>加载中...</p>
            </div>
          )}

          {/* 设置列表 */}
          {!loading && (
            <div className={cn("rounded-xl overflow-hidden", cardClass)}>
              {settings.length === 0 ? (
                <div className="p-10 text-center">
                  <Settings className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={40} />
                  <p className={cn("mt-3", isDark ? "text-slate-400" : "text-gray-500")}>暂无设置</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className={isDark ? "bg-slate-700/50" : "bg-gray-50"}>
                    <tr>
                      <th className={cn("text-left py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>键</th>
                      <th className={cn("text-left py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>值</th>
                      <th className={cn("text-right py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map(setting => (
                      <tr key={setting.id} className={cn("border-t", isDark ? "border-slate-700" : "border-gray-100")}>
                        <td className={cn("py-3 px-4 font-mono text-sm", isDark ? "text-blue-400" : "text-blue-600")}>
                          {setting.setting_key}
                        </td>
                        <td className={cn("py-3 px-4", isDark ? "text-slate-300" : "text-gray-700")}>
                          {editingKey === setting.setting_key ? (
                            <textarea
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              rows={2}
                              className={cn("w-full px-2 py-1 rounded text-sm resize-none", 
                                isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                              )}
                            />
                          ) : (
                            <span className="whitespace-pre-wrap">{setting.setting_value || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {editingKey === setting.setting_key ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className={cn("p-1.5 rounded", isDark ? "text-green-400 hover:bg-slate-700" : "text-green-600 hover:bg-green-50")}
                              >
                                <Save size={15} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className={cn("p-1.5 rounded", isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-50")}
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditSetting(setting)}
                                className={cn("p-1.5 rounded", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteSetting(setting.setting_key)}
                                className={cn("p-1.5 rounded", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 登录表单组件
function LoginForm({ 
  onLogin, 
  onSignup, 
  loading, 
  error,
  isDark 
}: { 
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string) => void;
  loading: boolean;
  error: string | null;
  isDark: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  // 将用户名转换为虚拟邮箱（Supabase 需要 email 字段）
  const toEmail = (name: string) => `${name.toLowerCase().replace(/\s+/g, '_')}@local.app`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = toEmail(username);
    if (isSignup) {
      onSignup(email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="用户名"
        required
        className={cn("w-28 px-3 py-2 rounded-lg text-sm", 
          isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
        )}
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="密码"
        required
        minLength={6}
        className={cn("w-28 px-3 py-2 rounded-lg text-sm", 
          isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
        )}
      />
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "flex items-center gap-1 px-3 py-2 rounded-lg text-sm",
          isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
        {isSignup ? '注册' : '登录'}
      </button>
      <button
        type="button"
        onClick={() => setIsSignup(!isSignup)}
        className={cn("text-sm px-2 py-2", isDark ? "text-slate-400" : "text-gray-500")}
      >
        {isSignup ? '登录' : '注册'}
      </button>
      {error && (
        <span className="text-xs text-red-400 ml-2">{error}</span>
      )}
    </form>
  );
}
