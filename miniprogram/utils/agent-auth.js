/**
 * 经纪人认证工具
 * 处理经纪人登录、登出、会话管理
 */

// 存储键名
const AGENT_TOKEN_KEY = 'agent_token';
const AGENT_INFO_KEY = 'agent_info';

// ==================== 登录 ====================

/**
 * 经纪人登录（用户名密码）
 * @param {String} username - 用户名
 * @param {String} password - 密码
 * @returns {Promise<Object>} 登录结果
 */
export async function agentLogin(username, password) {
  try {
    // 1. 参数校验
    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    // 2. 调用云函数登录
    wx.showLoading({ title: '登录中...', mask: true });

    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'login',
        username: username.trim(),
        password: password
      }
    });

    wx.hideLoading();

    console.log('[经纪人登录] 云函数返回:', res.result);

    // 3. 处理登录结果
    if (res.result && res.result.success) {
      const { token, admin } = res.result;

      // 检查是否是经纪人角色
      if (admin.role !== 'agent') {
        throw new Error('此账号不是经纪人账号，请使用经纪人账号登录');
      }

      // 保存 token 和用户信息
      wx.setStorageSync(AGENT_TOKEN_KEY, token);
      wx.setStorageSync(AGENT_INFO_KEY, admin);

      console.log('[经纪人登录] 登录成功，角色:', admin.role);

      return {
        success: true,
        token: token,
        agent: admin
      };
    } else {
      throw new Error(res.result?.message || '登录失败，请检查用户名和密码');
    }
  } catch (error) {
    wx.hideLoading();
    console.error('[经纪人登录] 失败:', error);

    // 显示错误提示
    const errorMsg = error.message || error.errMsg || '登录失败，请稍后重试';
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });

    return {
      success: false,
      error: errorMsg
    };
  }
}

// ==================== 登录状态检查 ====================

/**
 * 检查是否已登录
 * @returns {Boolean}
 */
export function isAgentLoggedIn() {
  const token = wx.getStorageSync(AGENT_TOKEN_KEY);
  const agent = wx.getStorageSync(AGENT_INFO_KEY);
  return !!(token && agent);
}

/**
 * 获取当前经纪人Token
 * @returns {String|null}
 */
export function getAgentToken() {
  try {
    return wx.getStorageSync(AGENT_TOKEN_KEY) || null;
  } catch (error) {
    console.error('[经纪人认证] 获取Token失败:', error);
    return null;
  }
}

/**
 * 获取当前经纪人信息
 * @returns {Object|null}
 */
export function getAgentInfo() {
  try {
    return wx.getStorageSync(AGENT_INFO_KEY) || null;
  } catch (error) {
    console.error('[经纪人认证] 获取信息失败:', error);
    return null;
  }
}

/**
 * 更新本地经纪人信息缓存
 * @param {Object} updates - 更新的字段
 * @returns {Object|null}
 */
export function updateAgentInfo(updates) {
  const agent = getAgentInfo();
  if (!agent) {
    console.warn('[经纪人认证] 更新失败：未登录');
    return null;
  }

  const updatedAgent = {
    ...agent,
    ...updates
  };

  wx.setStorageSync(AGENT_INFO_KEY, updatedAgent);
  console.log('[经纪人认证] 本地信息已更新');

  return updatedAgent;
}

// ==================== 登出 ====================

/**
 * 经纪人登出
 */
export function agentLogout() {
  try {
    // 清除所有认证相关数据
    wx.removeStorageSync(AGENT_TOKEN_KEY);
    wx.removeStorageSync(AGENT_INFO_KEY);

    console.log('[经纪人登出] 成功');

    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/agent/login/login'
    });
  } catch (error) {
    console.error('[经纪人登出] 失败:', error);
  }
}

// ==================== 权限检查 ====================

/**
 * 要求登录（未登录时跳转到登录页）
 * @param {Object} options - 配置选项
 * @param {Function} options.success - 已登录回调
 * @param {String} options.redirectUrl - 登录后跳转的页面
 * @returns {Boolean} 是否已登录
 */
export function requireAgentLogin(options = {}) {
  const { success, redirectUrl } = options;

  if (isAgentLoggedIn()) {
    // 已登录，执行回调
    success && success(getAgentInfo());
    return true;
  } else {
    // 未登录，跳转到登录页
    const url = redirectUrl
      ? `/pages/agent/login/login?redirect=${encodeURIComponent(redirectUrl)}`
      : '/pages/agent/login/login';

    wx.redirectTo({ url });
    return false;
  }
}

// ==================== 工具函数 ====================

/**
 * 刷新经纪人信息（从云端重新获取）
 * @returns {Promise<Object|null>}
 */
export async function refreshAgentInfo() {
  try {
    const token = getAgentToken();
    if (!token) {
      console.warn('[经纪人认证] 刷新失败：未登录');
      return null;
    }

    // 调用云函数获取最新信息
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getProfile',
        token: token
      }
    });

    if (res.result && res.result.success) {
      wx.setStorageSync(AGENT_INFO_KEY, res.result.admin);
      console.log('[经纪人认证] 信息已刷新');
      return res.result.admin;
    }

    return null;
  } catch (error) {
    console.error('[经纪人认证] 刷新信息失败:', error);
    return null;
  }
}

/**
 * 处理Token过期错误
 * 自动跳转到登录页
 */
export function handleTokenExpired() {
  console.warn('[经纪人认证] Token已过期');

  wx.showToast({
    title: '登录已过期，请重新登录',
    icon: 'none',
    duration: 2000
  });

  // 清除登录信息
  wx.removeStorageSync(AGENT_TOKEN_KEY);
  wx.removeStorageSync(AGENT_INFO_KEY);

  // 延迟跳转到登录页
  setTimeout(() => {
    wx.reLaunch({
      url: '/pages/agent/login/login'
    });
  }, 2000);
}
