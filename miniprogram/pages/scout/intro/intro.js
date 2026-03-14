// pages/scout/intro/intro.js
// 星探招募介绍页

import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {},

  // 跳转到注册表单（需要登录）
  async goToRegister() {
    const openId = getCurrentOpenId();

    if (!openId) {
      await requireLogin({
        title: '登录提示',
        content: '注册星探前需要登录微信账号',
        onSuccess: () => {
          this.navigateToRegister();
        },
        onCancel: () => {
          console.log('[星探介绍] 用户取消登录');
        }
      });
    } else {
      this.navigateToRegister();
    }
  },

  async navigateToRegister() {
    // 检查是否已是星探
    wx.showLoading({ title: '检查中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyInfo' }
      });
      wx.hideLoading();

      if (res.result && res.result.success && res.result.isRegistered) {
        const scout = res.result.scout;
        if (scout.status === 'active') {
          wx.showModal({
            title: '提示',
            content: '您已经是星探了，现在前往工作台？',
            confirmText: '前往',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.redirectTo({ url: '/pages/scout/home/home' });
              }
            }
          });
          return;
        }
      }

      wx.navigateTo({ url: '/pages/scout/register/register' });
    } catch (error) {
      wx.hideLoading();
      console.error('[星探介绍] 检查状态失败:', error);
      wx.navigateTo({ url: '/pages/scout/register/register' });
    }
  }
});
