/**
 * 认证工具
 * 处理用户登录、登出、会话管理
 */

import { getUserByOpenId, updateUser } from '../mock/users.js';

// 存储键名
const AUTH_TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';
const OPEN_ID_KEY = 'openId';

// ==================== Mock登录相关 ====================

/**
 * Mock微信登录
 * 开发阶段：让用户选择一个测试openId
 * 生产环境：应调用真实的 wx.login()
 */
export async function mockWxLogin() {
  return new Promise((resolve, reject) => {
    // 检查是否已有openId
    const savedOpenId = wx.getStorageSync(OPEN_ID_KEY);
    if (savedOpenId) {
      console.log('[Mock登录] 使用已保存的openId:', savedOpenId);
      resolve(savedOpenId);
      return;
    }

    // 模拟选择用户登录
    // 实际开发中，这里应该显示一个选择界面
    // 或者直接使用 wx.login() 获取code，然后换取openId

    // 默认使用第一个测试用户（候选人）
    const testOpenId = 'mock_candidate_001';

    wx.setStorageSync(OPEN_ID_KEY, testOpenId);
    console.log('[Mock登录] 使用测试openId:', testOpenId);

    resolve(testOpenId);
  });
}

/**
 * 真实微信登录（生产环境使用）
 * 需要配合后端云函数
 */
export async function realWxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            // 调用云函数换取openId
            const result = await wx.cloud.callFunction({
              name: 'login',
              data: { code: res.code }
            });

            const { openId, sessionKey, token } = result.result;

            // 保存token和openId
            wx.setStorageSync(AUTH_TOKEN_KEY, token);
            wx.setStorageSync(OPEN_ID_KEY, openId);

            resolve(openId);
          } catch (error) {
            console.error('[登录] 云函数调用失败:', error);
            reject(error);
          }
        } else {
          reject(new Error('获取code失败'));
        }
      },
      fail: (error) => {
        console.error('[登录] wx.login失败:', error);
        reject(error);
      }
    });
  });
}

/**
 * 自动登录（应用启动时调用）
 */
export async function autoLogin() {
  try {
    console.log('[登录] 开始自动登录...');

    // 1. 微信登录获取openId（Mock或真实）
    const openId = await mockWxLogin(); // 生产环境改为 realWxLogin()

    // 2. 查询用户信息
    const user = getUserByOpenId(openId);

    if (!user) {
      // 新用户
      console.log('[登录] 新用户，openId:', openId);
      return {
        success: true,
        isNewUser: true,
        openId: openId
      };
    }

    // 3. 老用户 - 保存用户信息
    wx.setStorageSync(USER_INFO_KEY, user);

    // 4. 更新最后登录时间
    updateUser(user.id, {
      lastLoginAt: new Date().toISOString().split('T')[0]
    });

    console.log('[登录] 老用户登录成功:', user.id, user.role);

    return {
      success: true,
      isNewUser: false,
      user: user
    };

  } catch (error) {
    console.error('[登录] 失败:', error);
    return {
      success: false,
      error: error
    };
  }
}

// ==================== 登录状态检查 ====================

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  const user = getCurrentUser();
  const openId = wx.getStorageSync(OPEN_ID_KEY);
  return !!user && !!openId;
}

/**
 * 获取当前用户
 */
export function getCurrentUser() {
  try {
    const user = wx.getStorageSync(USER_INFO_KEY);
    return user || null;
  } catch (error) {
    console.error('[认证] 获取用户信息失败:', error);
    return null;
  }
}

/**
 * 获取当前openId
 */
export function getCurrentOpenId() {
  try {
    return wx.getStorageSync(OPEN_ID_KEY) || null;
  } catch (error) {
    console.error('[认证] 获取openId失败:', error);
    return null;
  }
}

/**
 * 更新本地用户信息缓存
 */
export function updateLocalUser(updates) {
  const user = getCurrentUser();
  if (!user) {
    console.warn('[认证] 更新失败：未登录');
    return null;
  }

  const updatedUser = {
    ...user,
    ...updates
  };

  wx.setStorageSync(USER_INFO_KEY, updatedUser);
  console.log('[认证] 本地用户信息已更新');

  return updatedUser;
}

// ==================== 登出 ====================

/**
 * 登出
 */
export function logout() {
  try {
    // 清除所有认证相关数据
    wx.removeStorageSync(AUTH_TOKEN_KEY);
    wx.removeStorageSync(USER_INFO_KEY);
    wx.removeStorageSync(OPEN_ID_KEY);

    console.log('[登出] 成功');

    // 跳转到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  } catch (error) {
    console.error('[登出] 失败:', error);
  }
}

// ==================== 角色和权限检查 ====================

/**
 * 检查用户是否有指定角色
 * @param {String|Array} roleOrRoles - 角色或角色数组
 * @returns {Boolean}
 */
export function hasRole(roleOrRoles) {
  const user = getCurrentUser();
  if (!user) return false;

  if (Array.isArray(roleOrRoles)) {
    return roleOrRoles.includes(user.role);
  }

  return user.role === roleOrRoles;
}

/**
 * 检查用户类型
 * @param {String|Array} typeOrTypes - 用户类型或类型数组
 * @returns {Boolean}
 */
export function hasUserType(typeOrTypes) {
  const user = getCurrentUser();
  if (!user) return false;

  if (Array.isArray(typeOrTypes)) {
    return typeOrTypes.includes(user.userType);
  }

  return user.userType === typeOrTypes;
}

/**
 * 检查用户状态
 * @param {String} status - 状态
 * @returns {Boolean}
 */
export function hasStatus(status) {
  const user = getCurrentUser();
  if (!user) return false;

  return user.status === status;
}

/**
 * 检查是否是首次登录
 */
export function isFirstLogin() {
  const user = getCurrentUser();
  return user && user.isFirstLogin === true;
}

// ==================== 工具函数 ====================

/**
 * 刷新用户信息（从服务器重新获取）
 */
export async function refreshUserInfo() {
  try {
    const openId = getCurrentOpenId();
    if (!openId) {
      console.warn('[认证] 刷新失败：未登录');
      return null;
    }

    // 从mock数据重新获取
    const user = getUserByOpenId(openId);
    if (user) {
      wx.setStorageSync(USER_INFO_KEY, user);
      console.log('[认证] 用户信息已刷新');
      return user;
    }

    return null;
  } catch (error) {
    console.error('[认证] 刷新用户信息失败:', error);
    return null;
  }
}

/**
 * 清除场景参数（用于注册完成后）
 */
export function clearSceneParams() {
  try {
    wx.removeStorageSync('scene_params');
    console.log('[认证] 场景参数已清除');
  } catch (error) {
    console.error('[认证] 清除场景参数失败:', error);
  }
}
