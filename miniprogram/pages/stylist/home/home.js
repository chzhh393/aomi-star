/**
 * 造型师工作台
 * 功能：查看待造型候选人、记录工作安排
 */

import { getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    userInfo: null,
    stats: {
      totalAssigned: 0,
      upcoming: 0,
      completed: 0
    },
    upcomingCandidates: [],
    completedCandidates: []
  },

  onLoad() {
    this.loadUserInfo();
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
    const userInfo = this.data.userInfo;
    if (!userInfo) return;

    const stylistId = userInfo.id;

    // 获取所有候选人
    const allCandidates = getAllCandidates();

    // 1. 筛选待服务的候选人
    // 条件：status = 'interview_scheduled' 且 interviewSchedule.interviewers 包含当前造型师
    const upcomingCandidates = allCandidates.filter(candidate => {
      if (candidate.status !== 'interview_scheduled') return false;
      if (!candidate.interviewSchedule || !candidate.interviewSchedule.interviewers) return false;

      // 检查是否包含当前造型师ID
      return candidate.interviewSchedule.interviewers.some(
        interviewer => interviewer.id === stylistId && interviewer.role === 'stylist'
      );
    });

    // 2. 筛选已完成的候选人（最近5个）
    // 条件：status > 'interview_scheduled' 且曾经被分配给当前造型师
    const completedCandidates = allCandidates
      .filter(candidate => {
        if (candidate.status === 'pending' || candidate.status === 'interview_scheduled') return false;
        if (!candidate.interviewSchedule || !candidate.interviewSchedule.interviewers) return false;

        return candidate.interviewSchedule.interviewers.some(
          interviewer => interviewer.id === stylistId && interviewer.role === 'stylist'
        );
      })
      .slice(0, 5); // 只显示最近5个

    // 3. 计算统计数据
    const stats = {
      totalAssigned: upcomingCandidates.length + completedCandidates.length,
      upcoming: upcomingCandidates.length,
      completed: completedCandidates.length
    };

    this.setData({
      stats,
      upcomingCandidates,
      completedCandidates
    });

    console.log('[造型师工作台] 数据加载完成:', {
      totalAssigned: stats.totalAssigned,
      upcoming: upcomingCandidates.length,
      completed: completedCandidates.length
    });
  },

  /**
   * 查看候选人详情
   */
  onViewCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.showToast({
      title: '候选人详情页开发中',
      icon: 'none'
    });
  },

  /**
   * 去评价
   */
  onEvaluate(e) {
    const candidateId = e.currentTarget.dataset.id;

    console.log('[造型师工作台] 跳转到评价页面:', candidateId);

    wx.navigateTo({
      url: `/pages/recruit/stylist-evaluation/stylist-evaluation?candidateId=${candidateId}`
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
   * 查看日程
   */
  onViewSchedule() {
    wx.showToast({
      title: '日程功能开发中',
      icon: 'none'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
