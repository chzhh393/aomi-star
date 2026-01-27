// pages/register/scout/scout.js
// 星探注册页 - 使用邀请码注册

import { validateInviteCode, markInviteCodeUsed, INVITE_TYPE } from '../../../mock/invite-codes.js';
import { createUser, USER_TYPE, ROLE } from '../../../mock/users.js';
import { getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {
    // 表单数据
    formData: {
      inviteCode: '',
      name: '',
      phone: '',
      nickname: '',
      wechatId: ''
    },

    // 邀请码信息
    codeInfo: null,
    codeVerified: false
  },

  /**
   * 输入邀请码
   */
  onInviteCodeInput(e) {
    const code = e.detail.value.trim().toUpperCase();
    this.setData({
      'formData.inviteCode': code,
      codeVerified: false,
      codeInfo: null
    });
  },

  /**
   * 验证邀请码
   */
  verifyInviteCode() {
    const { inviteCode } = this.data.formData;

    if (!inviteCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    // 验证邀请码
    const result = validateInviteCode(inviteCode, INVITE_TYPE.SCOUT);

    if (!result.valid) {
      wx.showModal({
        title: '验证失败',
        content: result.message,
        showCancel: false
      });
      return;
    }

    // 验证成功
    this.setData({
      codeVerified: true,
      codeInfo: result.codeInfo
    });

    wx.showToast({
      title: '验证成功',
      icon: 'success'
    });
  },

  /**
   * 输入表单字段
   */
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 提交注册
   */
  async submitRegister() {
    const { formData, codeVerified } = this.data;

    // 1. 验证邀请码
    if (!codeVerified) {
      wx.showToast({
        title: '请先验证邀请码',
        icon: 'none'
      });
      return;
    }

    // 2. 验证表单
    if (!formData.name || !formData.phone || !formData.nickname) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 3. 验证手机号
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '注册中...' });

    try {
      // 4. 获取openId
      const openId = getCurrentOpenId();
      if (!openId) {
        throw new Error('无法获取用户标识');
      }

      // 5. 创建星探账号
      const userId = `SCT${Date.now().toString().slice(-6)}`;
      const shareCode = `SHARE_${userId}`;

      const user = createUser({
        openId,
        userType: USER_TYPE.EXTERNAL_SCOUT,
        role: ROLE.EXTERNAL_SCOUT,
        profile: {
          name: formData.name,
          nickname: formData.nickname,
          phone: formData.phone,
          wechatId: formData.wechatId || ''
        },
        relations: {
          shareCode: shareCode,
          referredCandidates: []
        },
        registrationSource: {
          type: 'invite_code',
          inviteCode: formData.inviteCode
        }
      });

      // 6. 标记邀请码已使用
      markInviteCodeUsed(formData.inviteCode, openId);

      // 7. 保存到本地存储
      wx.setStorageSync('user_info', user);

      wx.hideLoading();

      // 8. 提示成功
      wx.showModal({
        title: '注册成功',
        content: '欢迎成为星探！您可以开始推荐优质主播了',
        showCancel: false,
        success: () => {
          // 9. 跳转到星探工作台
          wx.reLaunch({
            url: '/pages/external-scout/home/home'
          });
        }
      });

    } catch (err) {
      wx.hideLoading();
      console.error('[星探注册] 注册失败:', err);
      wx.showModal({
        title: '注册失败',
        content: err.message || '请稍后重试',
        showCancel: false
      });
    }
  },

  /**
   * 返回引导页
   */
  backToGuide() {
    wx.navigateBack();
  }
});
