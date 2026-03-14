// pages/scout/register/register.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      idCard: '',
      wechat: '',
      reason: ''
    },
    submitting: false,
    // 申请状态（用于显示审核结果）
    applicationStatus: null, // null | 'pending' | 'rejected'
    existingScout: null
  },

  onLoad() {
    this.ensureLoginAndCheckStatus();
  },

  async ensureLoginAndCheckStatus() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后再申请成为星探',
        onSuccess: () => {
          this.checkExistingApplication();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    } else {
      this.checkExistingApplication();
    }
  },

  async checkExistingApplication() {
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
              } else {
                wx.navigateBack();
              }
            }
          });
        } else if (scout.status === 'pending') {
          this.setData({
            applicationStatus: 'pending',
            existingScout: scout
          });
        } else if (scout.status === 'rejected') {
          this.setData({
            applicationStatus: 'rejected',
            existingScout: scout
          });
        }
      }
    } catch (error) {
      console.error('[星探申请] 检查状态失败:', error);
      wx.hideLoading();
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  validateForm() {
    const { name, phone, idCard, reason } = this.data.formData;

    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入真实姓名', icon: 'none' });
      return false;
    }

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return false;
    }

    if (!idCard || !/^\d{17}[\dXx]$/.test(idCard.trim())) {
      wx.showToast({ title: '请输入正确的18位身份证号', icon: 'none' });
      return false;
    }

    if (!reason || !reason.trim()) {
      wx.showToast({ title: '请填写申请理由', icon: 'none' });
      return false;
    }

    return true;
  },

  async submitApply() {
    if (!this.validateForm()) return;

    const openId = getCurrentOpenId();
    if (!openId) {
      await this.ensureLoginAndCheckStatus();
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: {
          action: 'apply',
          data: this.data.formData
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        this.setData({
          applicationStatus: 'pending'
        });
        wx.showToast({
          title: '申请已提交',
          icon: 'success',
          duration: 2000
        });
      } else {
        const errorMsg = res.result?.error || '提交失败';
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    } catch (error) {
      console.error('[星探申请] 提交失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 被拒绝后重新申请
  reApply() {
    this.setData({
      applicationStatus: null,
      existingScout: null,
      formData: {
        name: '',
        phone: '',
        idCard: '',
        wechat: '',
        reason: ''
      }
    });
  }
});
