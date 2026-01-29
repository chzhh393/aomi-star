/**
 * 路由管理
 * 处理应用路由决策、权限守卫
 */

import { getCurrentUser, isLoggedIn, isFirstLogin, updateLocalUser } from './auth.js';
import { getRoleHomePage, ROLE, USER_TYPE } from '../mock/users.js';
import { getCandidateById } from '../mock/candidates.js';
import { getSceneParams } from './scene-parser.js';

// ==================== 应用启动路由决策 ====================

/**
 * 应用启动时的路由决策
 * 在 app.js 的 onLaunch 中调用
 *
 * @param {Object} loginResult - 登录结果
 * @param {Boolean} loginResult.success - 登录是否成功
 * @param {Boolean} loginResult.isNewUser - 是否是新用户
 * @param {Object} loginResult.user - 用户信息（老用户）
 * @param {String} loginResult.openId - openId（新用户）
 */
export function handleAppLaunch(loginResult) {
  console.log('[路由] 启动路由决策:', loginResult);

  // 1. 登录失败 → 首页
  if (!loginResult.success) {
    console.log('[路由] 登录失败，跳转首页');
    wx.reLaunch({ url: '/pages/index/index' });
    return;
  }

  // 2. 新用户 → 检查场景参数
  if (loginResult.isNewUser) {
    handleNewUser();
    return;
  }

  // 3. 老用户 → 检查首次登录
  const user = loginResult.user;
  if (isFirstLogin()) {
    handleFirstLogin(user);
    return;
  }

  // 4. 非首次登录 → 直接跳转工作台
  const homePage = getRoleHomePage(user.role);
  console.log('[路由] 老用户跳转工作台:', homePage);
  wx.reLaunch({ url: homePage });
}

/**
 * 处理新用户
 */
function handleNewUser() {
  // 获取场景参数
  const sceneParams = getSceneParams();

  // 新用户统一跳转报名页
  const ref = sceneParams?.scoutShareCode ? `?ref=${sceneParams.scoutShareCode}` : '';
  console.log('[路由] 新用户，跳转报名页');
  wx.reLaunch({
    url: `/pages/recruit/apply/apply${ref}`
  });
}

/**
 * 处理首次登录
 */
function handleFirstLogin(user) {
  console.log('[路由] 首次登录，用户类型:', user.userType);

  // 首次登录统一标记为false
  updateLocalUser({ isFirstLogin: false });

  // 跳转到对应工作台
  const homePage = getRoleHomePage(user.role);
  console.log('[路由] 首次登录，进入工作台:', homePage);
  wx.reLaunch({ url: homePage });
}

// ==================== 页面权限守卫 ====================

/**
 * 页面权限守卫
 * 在需要权限的页面的 onLoad 中调用
 *
 * @param {String|Array} requiredRoles - 必需的角色（单个或数组）
 * @param {Object} options - 选项
 * @param {Boolean} options.requireSigned - 主播是否必须已签约
 * @returns {Boolean} 是否有权限访问
 *
 * @example
 * // 在页面的 onLoad 中使用
 * onLoad() {
 *   if (!requireAuth(ROLE.HR)) {
 *     return; // 自动拦截并跳转
 *   }
 *   // 继续加载页面
 * }
 */
export function requireAuth(requiredRoles, options = {}) {
  console.log('[权限] 检查权限:', requiredRoles, options);

  // 1. 检查登录状态
  if (!isLoggedIn()) {
    showAuthError('需要登录', '请先登录后再访问', '/pages/index/index');
    return false;
  }

  // 2. 获取用户信息
  const user = getCurrentUser();
  if (!user) {
    showAuthError('用户信息异常', '请重新登录', '/pages/index/index');
    return false;
  }

  // 3. 检查角色权限
  if (requiredRoles) {
    const hasRole = Array.isArray(requiredRoles)
      ? requiredRoles.includes(user.role)
      : user.role === requiredRoles;

    if (!hasRole) {
      console.warn('[权限] 角色不匹配，当前:', user.role, '需要:', requiredRoles);
      showAuthError(
        '无权访问',
        '您没有权限访问此页面',
        getRoleHomePage(user.role)
      );
      return false;
    }
  }

  // 4. 主播特殊验证：检查签约状态
  if (user.role === ROLE.ANCHOR && options.requireSigned) {
    const candidate = getCandidateById(user.candidateInfo?.candidateId);
    const allowedStatuses = ['signed', 'training', 'active'];

    if (!candidate || !allowedStatuses.includes(candidate.status)) {
      console.warn('[权限] 主播未签约，状态:', candidate?.status);
      showAuthError(
        '暂无访问权限',
        '您还未完成签约流程',
        `/pages/candidate/home/home`
      );
      return false;
    }
  }

  console.log('[权限] 验证通过');
  return true;
}

/**
 * 显示权限错误提示
 */
function showAuthError(title, content, redirectUrl) {
  wx.showModal({
    title: title,
    content: content,
    showCancel: false,
    success: () => {
      if (redirectUrl) {
        wx.redirectTo({
          url: redirectUrl,
          fail: () => {
            // redirectTo可能失败（如目标页面是tabBar页面）
            wx.reLaunch({ url: redirectUrl });
          }
        });
      }
    }
  });
}

// ==================== 导航辅助函数 ====================

/**
 * 跳转到角色工作台
 * @param {String} role - 角色
 */
export function navigateToWorkspace(role) {
  const homePage = getRoleHomePage(role);
  wx.reLaunch({ url: homePage });
}

/**
 * 跳转到注册引导页
 */
export function navigateToRegisterGuide() {
  wx.navigateTo({ url: '/pages/register/guide/guide' });
}

/**
 * 跳转到报名页
 * @param {String} shareCode - 星探分享码（可选）
 */
export function navigateToApply(shareCode) {
  const url = shareCode
    ? `/pages/recruit/apply/apply?ref=${shareCode}`
    : '/pages/recruit/apply/apply';

  wx.navigateTo({ url });
}

/**
 * 安全的页面跳转（自动选择reLaunch或navigateTo）
 * @param {String} url - 目标页面路径
 * @param {Boolean} replace - 是否替换当前页面
 */
export function safeNavigate(url, replace = false) {
  if (replace) {
    wx.reLaunch({ url });
  } else {
    wx.navigateTo({
      url,
      fail: () => {
        // 失败时尝试reLaunch（可能是tabBar页面）
        wx.reLaunch({ url });
      }
    });
  }
}
