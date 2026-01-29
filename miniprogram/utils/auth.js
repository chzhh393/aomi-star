/**
 * 认证工具
 * 处理用户登录、登出、会话管理
 */

// 存储键名
const AUTH_TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';
const OPEN_ID_KEY = 'openId';

// ==================== 云函数登录 ====================

/**
 * 调用云函数进行微信登录
 * 返回 openId 和用户信息
 */
export async function cloudLogin() {
  return new Promise((resolve, reject) => {
    // 调用云函数（不需要先 wx.login，云函数会自动获取 openId）
    wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      console.log('[云登录] 云函数返回:', res.result);

      if (res.result && res.result.success) {
        const { openId, isNewUser, user } = res.result;

        // 保存 openId
        wx.setStorageSync(OPEN_ID_KEY, openId);

        // 如果有用户信息，保存到本地
        if (user) {
          wx.setStorageSync(USER_INFO_KEY, user);
        }

        resolve({
          success: true,
          openId: openId,
          isNewUser: isNewUser,
          user: user
        });
      } else {
        reject(new Error(res.result?.error || '登录失败'));
      }
    }).catch(err => {
      console.error('[云登录] 云函数调用失败:', err);
      reject(err);
    });
  });
}

/**
 * 自动登录（应用启动时调用）
 * 使用云函数进行真实登录
 */
export async function autoLogin() {
  try {
    console.log('[登录] 开始自动登录...');

    // 检查是否已有 openId
    const savedOpenId = wx.getStorageSync(OPEN_ID_KEY);
    const savedUser = wx.getStorageSync(USER_INFO_KEY);

    if (savedOpenId && savedUser) {
      console.log('[登录] 使用缓存的登录信息');
      return {
        success: true,
        isNewUser: false,
        openId: savedOpenId,
        user: savedUser
      };
    }

    // 调用云函数登录
    const result = await cloudLogin();
    console.log('[登录] 云登录结果:', result);

    return result;

  } catch (error) {
    console.error('[登录] 失败:', error);
    return {
      success: false,
      error: error
    };
  }
}

/**
 * 需要登录时调用
 * 如果已登录，直接执行回调；未登录则触发登录流程
 *
 * @param {Object} options - 配置选项
 * @param {Function} options.onSuccess - 登录成功回调
 * @param {Function} options.onCancel - 用户取消回调（可选）
 * @param {String} options.title - 提示标题（可选）
 * @param {String} options.content - 提示内容（可选）
 * @returns {Promise<Boolean>} 是否登录成功
 */
export async function requireLogin(options = {}) {
  const {
    onSuccess,
    onCancel,
    title = '需要登录',
    content = '该功能需要登录后使用，是否立即登录？'
  } = options;

  // 1. 检查是否已登录（有 openId 即可）
  const existingOpenId = getCurrentOpenId();
  if (existingOpenId) {
    const user = getCurrentUser();
    console.log('[requireLogin] 已登录，openId:', existingOpenId);
    onSuccess && onSuccess({ openId: existingOpenId, user: user });
    return true;
  }

  // 2. 未登录，显示确认弹窗
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      confirmText: '立即登录',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          // 用户确认登录
          try {
            wx.showLoading({ title: '登录中...' });

            // 执行云函数登录
            const loginResult = await cloudLogin();

            wx.hideLoading();

            if (loginResult.success) {
              console.log('[requireLogin] 登录成功');
              onSuccess && onSuccess(loginResult);
              resolve(true);
            } else {
              wx.showToast({ title: '登录失败，请重试', icon: 'none' });
              resolve(false);
            }
          } catch (error) {
            wx.hideLoading();
            console.error('[requireLogin] 登录失败:', error);
            wx.showToast({ title: '登录失败，请重试', icon: 'none' });
            resolve(false);
          }
        } else {
          // 用户取消
          console.log('[requireLogin] 用户取消登录');
          onCancel && onCancel();
          resolve(false);
        }
      }
    });
  });
}

// ==================== 登录状态检查 ====================

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  const openId = wx.getStorageSync(OPEN_ID_KEY);
  return !!openId;
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
    wx.removeStorageSync('myCandidateId');

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
 * 刷新用户信息（从云端重新获取）
 */
export async function refreshUserInfo() {
  try {
    const openId = getCurrentOpenId();
    if (!openId) {
      console.warn('[认证] 刷新失败：未登录');
      return null;
    }

    // 调用云函数获取用户信息
    const res = await wx.cloud.callFunction({
      name: 'user',
      data: { action: 'get' }
    });

    if (res.result && res.result.success) {
      wx.setStorageSync(USER_INFO_KEY, res.result.user);
      console.log('[认证] 用户信息已刷新');
      return res.result.user;
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
