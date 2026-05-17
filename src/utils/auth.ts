// CloudBase 认证工具
import cloudbase from 'tcb-js-sdk';

const app = cloudbase.init({
  env: 'yuancailiao-d2gmuijr515f0420a'
});

const auth = app.auth();

// 获取用户信息
export async function getCurrentUser() {
  try {
    const loginState = await auth.getLoginState();
    if (loginState) {
      return loginState.user;
    }
    return null;
  } catch (e) {
    console.error('获取用户失败:', e);
    return null;
  }
}

// 邮箱登录
export async function loginWithEmail(email: string, password: string) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    if (result) {
      return { success: true, user: result.user };
    }
    return { success: false, error: '登录失败' };
  } catch (e: any) {
    console.error('登录错误:', e);
    return { success: false, error: e.message || '登录失败，请检查邮箱和密码' };
  }
}

// 登出
export async function logout() {
  try {
    await auth.signOut();
    return true;
  } catch (e) {
    console.error('登出失败:', e);
    return false;
  }
}

// 检查是否已登录
export async function isLoggedIn() {
  try {
    const loginState = await auth.getLoginState();
    return !!loginState;
  } catch (e) {
    return false;
  }
}
