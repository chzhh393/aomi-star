// pages/register/employee/employee.js
// 员工注册页 - 使用邀请码注册

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
      nickname: ''
    },

    // 邀请码信息
    codeInfo: null,
    codeVerified: false,

    // 角色映射
    roleMap: {
      'hr': 'HR招聘专员',
      'agent': '艺人经纪人',
      'operations': '运营专员'
    }
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
    const result = validateInviteCode(inviteCode, INVITE_TYPE.EMPLOYEE);

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
    const { formData, codeVerified, codeInfo } = this.data;

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

      // 5. 创建用户账号
      const user = createUser({
        openId,
        userType: USER_TYPE.INTERNAL_EMPLOYEE,
        role: ROLE[codeInfo.presetRole.toUpperCase()], // 根据邀请码预设角色
        profile: {
          name: formData.name,
          nickname: formData.nickname,
          phone: formData.phone
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
        content: `欢迎加入！您的角色是：${this.data.roleMap[codeInfo.presetRole]}`,
        showCancel: false,
        success: () => {
          // 9. 跳转到对应工作台
          this.navigateToWorkspace(user.role);
        }
      });

    } catch (err) {
      wx.hideLoading();
      console.error('[员工注册] 注册失败:', err);
      wx.showModal({
        title: '注册失败',
        content: err.message || '请稍后重试',
        showCancel: false
      });
    }
  },

  /**
   * 根据角色跳转到工作台
   */
  navigateToWorkspace(role) {
    const workspaceMap = {
      [ROLE.HR]: '/pages/hr/home/home',
      [ROLE.AGENT]: '/pages/agent/home/home',
      [ROLE.OPERATIONS]: '/pages/operations/home/home'
    };

    const url = workspaceMap[role] || '/pages/index/index';

    wx.reLaunch({ url });
  },

  /**
   * 返回引导页
   */
  backToGuide() {
    wx.navigateBack();
  }
});
