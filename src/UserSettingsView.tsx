import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, Loader2, LogIn, LogOut, User } from 'lucide-react';
import { cn } from './utils/utils';
import { supabase, getCurrentUserId } from './utils/supabase';
import { 
  UserSetting, 
  getUserSettings, 
  getUserSetting, 
  upsertUserSetting, 
  deleteUserSetting 
} from './utils/userSettings';

// Tab类型
type TabType = 'calculator' | 'materials' | 'recipes' | 'history' | 'settings';

// Tab配置
export const tabs = [
  { id: 'calculator' as TabType, label: '配方计算', icon: Settings }, // placeholder
  { id: 'materials' as TabType, label: '物品管理', icon: Settings }, // placeholder
  { id: 'recipes' as TabType, label: '配方管理', icon: Settings }, // placeholder
  { id: 'history' as TabType, label: '历史记录', icon: Settings }, // placeholder
  { id: 'settings' as TabType, label: '用户设置', icon: Settings },
];

// 深色主题
const isDarkTheme = true;

interface UserSettingsViewProps {
  isDark: boolean;
}

export function UserSettingsView({ isDark }: UserSettingsViewProps) {
  const [userId, setUserId] = useState<string>('');
  const [settings, setSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 加载设置
  useEffect(() => {
    if (isLoggedIn && userId) {
      loadSettings();
    }
  }, [isLoggedIn, userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setIsLoggedIn(true);
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
      if (error) throw error;
      if (data.user) {
        setUserId(data.user.id);
        setIsLoggedIn(true);
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        setUserId(data.user.id);
        setIsLoggedIn(true);
        alert('注册成功！请查看邮箱验证链接。');
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

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      {/* 登录/用户信息区域 */}
      <div className={cn("rounded-xl p-6", cardClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl", isDark ? "bg-blue-500/20" : "bg-blue-100")}>
              <User className={isDark ? "text-blue-400" : "text-blue-600"} size={24} />
            </div>
            <div>
              {isLoggedIn ? (
                <>
                  <p className={cn("font-medium", isDark ? "text-white" : "text-gray-800")}>已登录</p>
                  <p className={cn("text-sm", isDark ? "text-slate-400" : "text-gray-500")}>用户ID: {userId.slice(0, 8)}...</p>
                </>
              ) : (
                <p className={cn("font-medium", isDark ? "text-slate-400" : "text-gray-500")}>未登录</p>
              )}
            </div>
          </div>
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

      {/* 设置列表 */}
      {isLoggedIn && (
        <>
          <div className={cn("rounded-xl p-4", cardClass)}>
            <div className="flex items-center justify-between">
              <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>
                用户设置
                <span className={cn("text-sm font-normal ml-2", isDark ? "text-slate-400" : "text-gray-500")}>
                  {settings.length} 项
                </span>
              </h2>
              <button
                onClick={() => setShowAddForm(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                  isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <Plus size={16} />
                添加设置
              </button>
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      onSignup(email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="邮箱"
        required
        className={cn("w-36 px-3 py-2 rounded-lg text-sm", 
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
        className={cn("w-32 px-3 py-2 rounded-lg text-sm", 
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
