// 自定义用户名密码认证工具
// 使用 localStorage 存储登录状态

const AUTH_KEY = 'yuancailiao_auth';
const USERS_KEY = 'yuancailiao_users';

// 默认用户账号
const DEFAULT_USER = {
  username: '2391847636@qq.com',
  password: 'yuancailiao_23',
};

// 初始化默认用户
function initDefaultUser() {
  const users = getUsers();
  if (!users.find(u => u.username === DEFAULT_USER.username)) {
    users.push(DEFAULT_USER);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

function getUsers() {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
    return [DEFAULT_USER];
  }
  return JSON.parse(data);
}

// 保存登录状态
function saveLoginState(username: string) {
  const authData = {
    username,
    loginTime: Date.now(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

// 获取登录状态
function getLoginState() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  const authData = JSON.parse(data);
  // 检查是否过期（7天）
  const expireTime = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - authData.loginTime > expireTime) {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
  return authData;
}

// 清除登录状态
function clearLoginState() {
  localStorage.removeItem(AUTH_KEY);
}

// 获取当前用户信息
export async function getCurrentUser() {
  const authData = getLoginState();
  if (authData) {
    return {
      username: authData.username,
    };
  }
  return null;
}

// 用户名密码登录
export async function loginWithEmail(username: string, password: string) {
  try {
    // 初始化默认用户
    initDefaultUser();
    
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      saveLoginState(user.username);
      return { success: true, user: { username: user.username } };
    }
    
    return { success: false, error: '用户名或密码错误' };
  } catch (e: any) {
    console.error('登录错误:', e);
    return { success: false, error: e.message || '登录失败，请检查用户名和密码' };
  }
}

// 登出
export async function logout() {
  clearLoginState();
  return true;
}

// 检查是否已登录
export async function isLoggedIn() {
  return getLoginState() !== null;
}

// 修改密码
export function changePassword(username: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === username && u.password === oldPassword);
  
  if (userIndex === -1) {
    return { success: false, error: '原密码错误' };
  }
  
  users[userIndex].password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true };
}
