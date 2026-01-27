/**
 * HR工作台
 * 功能:
 * 1. 查看待审核候选人(status=pending)
 * 2. 查看各阶段候选人统计
 * 3. 查看最近通过审核的候选人
 */

import { getAllCandidates } from '../../../mock/candidates.js';

const app = getApp();

Page({
  data: {
    user: null,
    userInfo: null,

    // 统计数据
    stats: {
      pending: 0,           // 待审核
      approved: 0,          // 已通过
      interviewing: 0,      // 面试中
      signed: 0,            // 已签约
      total: 0              // 总数
    },

    // 待审核候选人列表
    pendingCandidates: [],

    // 最近通过审核的候选人(最近5个)
    recentApproved: []
  },

  onLoad() {
    const user = app.getCurrentUser();
    this.setData({ user });

    this.loadUserInfo();
    this.loadData();
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabBar();
    }

    // 刷新数据
    this.loadData();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_info');
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    this.setData({
      userInfo
    });
  },

  /**
   * 加载数据
   */
  loadData() {
    const allCandidates = getAllCandidates();

    // 1. 待审核候选人: status = 'pending'
    const pendingCandidates = allCandidates.filter(
      candidate => candidate.status === 'pending'
    );

    // 2. 最近通过审核的候选人: status != 'pending' && status != 'rejected'
    // 按创建时间排序,取最近5个
    const recentApproved = allCandidates
      .filter(candidate =>
        candidate.status !== 'pending' &&
        candidate.status !== 'rejected'
      )
      .slice(0, 5);

    // 3. 各阶段候选人统计
    const approved = allCandidates.filter(c =>
      c.status !== 'pending' && c.status !== 'rejected'
    ).length;

    const interviewing = allCandidates.filter(c =>
      c.status === 'interview_scheduled' ||
      c.status === 'online_test_completed'
    ).length;

    const signed = allCandidates.filter(c =>
      c.status === 'signed'
    ).length;

    // 4. 计算统计数据
    const stats = {
      pending: pendingCandidates.length,
      approved: approved,
      interviewing: interviewing,
      signed: signed,
      total: allCandidates.length
    };

    this.setData({
      stats,
      pendingCandidates,
      recentApproved
    });

    console.log('[HR工作台] 数据加载完成:', {
      pending: stats.pending,
      approved: stats.approved,
      interviewing: stats.interviewing,
      signed: stats.signed,
      total: stats.total
    });
  },

  /**
   * 去审核
   */
  onReviewCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    console.log('[HR工作台] 跳转到审核页面:', candidateId);

    wx.navigateTo({
      url: `/pages/recruit/hr-review/hr-review?candidateId=${candidateId}`
    });
  },

  /**
   * 查看候选人详情
   */
  onViewCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/hr/candidate-detail/candidate-detail?id=${candidateId}`
    });
  },

  /**
   * 查看所有候选人
   */
  onViewAllCandidates() {
    wx.navigateTo({
      url: '/pages/hr/candidates/candidates'
    });
  },

  /**
   * 查看数据统计
   */
  onViewStatistics() {
    wx.showToast({
      title: '数据统计页开发中',
      icon: 'none'
    });
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    wx.showLoading({
      title: '刷新中...'
    });

    setTimeout(() => {
      this.loadData();
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 500);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
