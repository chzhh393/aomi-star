// pages/scout/register/register.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      wechat: ''
    },
    submitting: false
  },

  onLoad() {
    // 确保用户已登录，然后检查是否已注册
    this.ensureLoginAndCheckRegistration();
  },

  // 确保用户已登录，并检查是否已注册
  async ensureLoginAndCheckRegistration() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后再注册成为星探',
        onSuccess: () => {
          console.log('[星探注册] 登录成功');
          // 登录成功后检查是否已注册
          this.checkIfAlreadyRegistered();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    } else {
      // 已登录，检查是否已注册
      this.checkIfAlreadyRegistered();
    }
  },

  // 检查用户是否已注册星探
  async checkIfAlreadyRegistered() {
    wx.showLoading({ title: '检查中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyInfo' }
      });

      wx.hideLoading();

      if (res.result && res.result.success && res.result.isRegistered) {
        // 已经注册过了，直接跳转到工作台
        wx.showModal({
          title: '提示',
          content: '您已经是星探了，现在前往工作台？',
          confirmText: '前往',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.redirectTo({
                url: '/pages/scout/home/home'
              });
            } else {
              wx.navigateBack();
            }
          }
        });
      }
      // 如果未注册，继续显示注册表单（不做任何操作）
    } catch (error) {
      console.error('[星探注册] 检查注册状态失败:', error);
      wx.hideLoading();
      // 检查失败时继续显示注册表单
    }
  },

  // 表单输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 验证表单
  validateForm() {
    const { name, phone, wechat } = this.data.formData;

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return false;
    }

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    if (!wechat || !wechat.trim()) {
      wx.showToast({ title: '请输入微信号', icon: 'none' });
      return false;
    }

    return true;
  },

  // 提交注册
  async submitRegister() {
    if (!this.validateForm()) return;

    const openId = getCurrentOpenId();
    if (!openId) {
      await this.ensureLogin();
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: {
          action: 'register',
          data: this.data.formData
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({
          title: '注册成功！',
          icon: 'success',
          duration: 2000
        });

        // 跳转到星探工作台
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/scout/home/home'
          });
        }, 2000);

      } else {
        const errorMsg = res.result?.error || '注册失败';
        if (errorMsg === '您已经注册过了') {
          wx.showModal({
            title: '提示',
            content: '您已经是星探了，现在前往工作台？',
            confirmText: '前往',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.redirectTo({
                  url: '/pages/scout/home/home'
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      }

    } catch (error) {
      console.error('[星探注册] 提交失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
