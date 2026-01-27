// pages/external-scout/home/home.js
// 星探工作台

import { getCurrentUser } from '../../../utils/auth.js';
import { ROLE } from '../../../mock/users.js';
import { getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    user: null,

    // 统计数据
    stats: {
      totalReferred: 0,
      pendingReview: 0,
      signed: 0,
      totalReward: 0
    },

    // 推荐的候选人列表（最近5个）
    recentCandidates: [],

    // 快捷功能
    quickActions: [
      {
        id: 'share',
        icon: '📤',
        title: '分享推荐码',
        desc: '生成专属二维码推荐主播',
        color: '#13E8DD'
      },
      {
        id: 'candidates',
        icon: '👥',
        title: '我的推荐',
        desc: '查看推荐的候选人状态',
        color: '#FFD700'
      },
      {
        id: 'rewards',
        icon: '💰',
        title: '奖励记录',
        desc: '查看推荐奖励明细',
        color: '#4CAF50'
      }
    ]
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    // 获取当前用户
    const user = getCurrentUser();
    if (!user || user.role !== ROLE.EXTERNAL_SCOUT) {
      wx.showModal({
        title: '访问受限',
        content: '您不是星探，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/index/index' });
        }
      });
      return;
    }

    // 获取该星探推荐的所有候选人
    const allCandidates = getAllCandidates();
    const myCandidates = allCandidates.filter(c =>
      c.source === 'scout' && c.referredBy === user.id
    );

    // 统计数据
    const stats = {
      totalReferred: myCandidates.length,
      pendingReview: myCandidates.filter(c => c.status === 'pending').length,
      signed: myCandidates.filter(c => ['signed', 'training', 'active'].includes(c.status)).length,
      totalReward: myCandidates.filter(c => ['signed', 'training', 'active'].includes(c.status)).length * 500 // 假设每个签约500元奖励
    };

    // 最近的候选人（最多5个）
    const recentCandidates = myCandidates
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 5);

    this.setData({
      user,
      stats,
      recentCandidates
    });
  },

  /**
   * 点击快捷功能
   */
  onActionTap(e) {
    const { id } = e.currentTarget.dataset;

    switch (id) {
      case 'share':
        this.shareReferralCode();
        break;
      case 'candidates':
        this.viewMyCandidates();
        break;
      case 'rewards':
        this.viewRewards();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  /**
   * 分享推荐码
   */
  shareReferralCode() {
    const { user } = this.data;

    wx.showModal({
      title: '分享推荐码',
      content: `您的专属推荐码：${user.id}\n\n请转发小程序给潜在主播，他们通过您的推荐码报名成功后，您将获得奖励！`,
      showCancel: false,
      confirmText: '知道了'
    });

    // TODO: 生成小程序码供分享
  },

  /**
   * 查看我的推荐
   */
  viewMyCandidates() {
    const { recentCandidates } = this.data;

    if (recentCandidates.length === 0) {
      wx.showToast({
        title: '还没有推荐记录',
        icon: 'none'
      });
      return;
    }

    // TODO: 跳转到推荐列表页面
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 查看奖励记录
   */
  viewRewards() {
    wx.showModal({
      title: '奖励统计',
      content: `累计推荐签约：${this.data.stats.signed}人\n累计奖励：¥${this.data.stats.totalReward}元\n\n奖励将在候选人签约后发放`,
      showCancel: false
    });
  },

  /**
   * 查看候选人详情
   */
  viewCandidateDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recruit/status/status?id=${id}`,
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  }
});
