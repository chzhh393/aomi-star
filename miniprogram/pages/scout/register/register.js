// pages/scout/register/register.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';
const app = getApp();

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
    inviterScout: null,
    invitePlan: null,
    inviteCode: '',
    // 申请状态（用于显示审核结果）
    applicationStatus: null, // null | 'pending' | 'rejected'
    existingScout: null
  },

  onLoad(options) {
    this.initInviterScout(options);
    this.ensureLoginAndCheckStatus();
  },

  async initInviterScout(options = {}) {
    const referral = app?.getScoutReferral?.() || null;
    const inviteCode = String(options.inviteCode || '').trim();
    let inviterScout = options.parentScoutId
      ? {
          scoutId: options.parentScoutId,
          scoutName: options.parentScoutName || '',
          shareCode: options.parentShareCode || ''
        }
      : (referral?.scoutId ? {
          scoutId: referral.scoutId,
          scoutName: referral.scoutName || '',
          shareCode: referral.scoutShareCode || ''
        } : null);

    let invitePlan = null;

    if (inviteCode) {
      try {
        const inviteRes = await wx.cloud.callFunction({
          name: 'scout',
          data: {
            action: 'getAceInvite',
            data: { inviteCode }
          }
        });

        if (inviteRes.result?.success && inviteRes.result?.invite) {
          const invite = inviteRes.result.invite;
          inviterScout = {
            scoutId: invite.targetScoutId,
            scoutName: invite.targetScoutName || '',
            shareCode: invite.targetScoutShareCode || ''
          };
          invitePlan = {
            role: 'ace',
            title: '王牌星探招募入口',
            signingAward: Number(invite.plan?.signingAward || 0),
            levelAwards: {
              S: Number(invite.plan?.levelAwards?.S || 0),
              A: Number(invite.plan?.levelAwards?.A || 0),
              B: Number(invite.plan?.levelAwards?.B || 0)
            }
          };
        } else {
          wx.showToast({
            title: inviteRes.result?.error || '邀请码无效',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('[星探申请] 查询邀请码失败:', error);
        wx.showToast({
          title: '邀请码加载失败',
          icon: 'none'
        });
      }
    }

    this.setData({
      inviterScout,
      invitePlan,
      inviteCode
    });
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
          data: {
            ...this.data.formData,
            parentScoutId: this.data.inviterScout?.scoutId || '',
            parentScoutName: this.data.inviterScout?.scoutName || '',
            parentShareCode: this.data.inviterScout?.shareCode || '',
            invitePlan: this.data.invitePlan,
            inviteCode: this.data.inviteCode
          }
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
