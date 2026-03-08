// pages/scout/home/home.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {
    loading: true,
    scout: null,
    teamInfo: null,
    referrals: [],
    filteredReferrals: [],
    currentFilter: 'all',

    // 状态映射
    statusMap: {
      'pending': '待审核',
      'approved': '已通过',
      'interview_scheduled': '面试中',
      'signed': '已签约',
      'rejected': '已拒绝'
    }
  },

  onLoad() {
    // 确保用户已登录
    this.ensureLogin();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadScoutData();
  },

  onPullDownRefresh() {
    this.loadScoutData();
  },

  // 确保用户已登录
  async ensureLogin() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后查看星探工作台',
        onSuccess: () => {
          console.log('[星探工作台] 登录成功');
          this.loadScoutData();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    }
  },

  // 加载星探数据
  async loadScoutData() {
    this.setData({ loading: true });

    try {
      // 获取星探信息
      const scoutRes = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyInfo' }
      });

      if (!scoutRes.result || !scoutRes.result.success) {
        // 未注册，跳转到注册页
        wx.showModal({
          title: '提示',
          content: '您还未注册成为星探，是否前往注册？',
          confirmText: '去注册',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.redirectTo({
                url: '/pages/scout/register/register'
              });
            } else {
              wx.navigateBack();
            }
          }
        });
        return;
      }

      const scout = scoutRes.result.scout;

      // 如果是一级星探，获取团队信息
      let teamInfo = null;
      if (scout.level && scout.level.depth === 1) {
        try {
          const teamRes = await wx.cloud.callFunction({
            name: 'scout',
            data: { action: 'getMyTeam' }
          });
          if (teamRes.result && teamRes.result.success) {
            teamInfo = teamRes.result.team;
          }
        } catch (error) {
          console.error('[星探工作台] 获取团队信息失败:', error);
        }
      }

      // 获取推荐的候选人列表
      const referralsRes = await wx.cloud.callFunction({
        name: 'scout',
        data: {
          action: 'getMyReferrals',
          data: { status: 'all' }
        }
      });

      let referrals = [];
      if (referralsRes.result && referralsRes.result.success) {
        referrals = referralsRes.result.referrals || [];

        // 格式化时间
        referrals = referrals.map(item => {
          item.createdAtText = this.formatTime(item.createdAt);
          return item;
        });
      }

      this.setData({
        scout,
        teamInfo,
        referrals,
        filteredReferrals: referrals,
        loading: false
      });

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('[星探工作台] 加载数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 分享小程序
  onShareAppMessage() {
    const shareCode = this.data.scout.shareCode;
    return {
      title: '奥米光年招募主播，快来报名吧！',
      path: `/pages/recruit/index/index?ref=${shareCode}`,
      imageUrl: '/images/share-poster.jpg'
    };
  },

  // 筛选变化
  onFilterChange(e) {
    const { filter } = e.currentTarget.dataset;
    const { referrals } = this.data;

    let filtered = referrals;
    if (filter !== 'all') {
      filtered = referrals.filter(item => item.status === filter);
    }

    this.setData({
      currentFilter: filter,
      filteredReferrals: filtered
    });
  },

  // 查看候选人详情
  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recruit/detail/detail?id=${id}`
    });
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' });
    this.loadScoutData().then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    });
  },

  // 复制邀请码
  copyInviteCode() {
    const inviteCode = this.data.scout.inviteCode;
    if (!inviteCode) {
      wx.showToast({ title: '邀请码不存在', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: inviteCode,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success'
        });
      }
    });
  },

  // 分享邀请码
  shareInvite() {
    const inviteCode = this.data.scout.inviteCode;
    if (!inviteCode) {
      wx.showToast({ title: '邀请码不存在', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '分享邀请码',
      content: `您的邀请码是：${inviteCode}\n\n请将此邀请码分享给想要成为下级星探的人员，对方注册时输入此邀请码即可加入您的团队。`,
      confirmText: '复制邀请码',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.copyInviteCode();
        }
      }
    });
  },

  // 查看团队详情
  viewTeam() {
    wx.navigateTo({
      url: '/pages/scout/team/team'
    });
  }
});
