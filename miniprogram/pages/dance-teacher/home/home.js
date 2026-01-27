/**
 * 舞蹈导师工作台
 * 功能：查看待评分候选人、提交舞蹈评分
 */

import { getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    userInfo: null,
    stats: {
      totalAssigned: 0,
      pendingEvaluation: 0,
      completed: 0
    },
    pendingCandidates: [],
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

    const danceTeacherId = userInfo.id;

    // 获取所有候选人
    const allCandidates = getAllCandidates();

    // 1. 筛选待评分的候选人
    // 条件：status = 'pending_rating' 且 evaluations.danceTeacher 不存在 且 interviewSchedule.interviewers 包含当前舞蹈导师
    const pendingCandidates = allCandidates.filter(candidate => {
      // 必须是 pending_rating 状态
      if (candidate.status !== 'pending_rating') return false;

      // 必须已分配给当前舞蹈导师
      if (!candidate.interviewSchedule || !candidate.interviewSchedule.interviewers) return false;
      const isAssigned = candidate.interviewSchedule.interviewers.some(
        interviewer => interviewer.id === danceTeacherId && interviewer.role === 'dance_teacher'
      );
      if (!isAssigned) return false;

      // 还没有提交舞蹈导师评分
      if (candidate.evaluations && candidate.evaluations.danceTeacher) return false;

      return true;
    });

    // 2. 筛选已完成的候选人（最近5个）
    // 条件：evaluations.danceTeacher 存在且由当前导师评分
    const completedCandidates = allCandidates
      .filter(candidate => {
        return candidate.evaluations &&
               candidate.evaluations.danceTeacher &&
               candidate.evaluations.danceTeacher.evaluatorId === danceTeacherId;
      })
      .slice(0, 5); // 只显示最近5个

    // 3. 计算统计数据
    const stats = {
      totalAssigned: pendingCandidates.length + completedCandidates.length,
      pendingEvaluation: pendingCandidates.length,
      completed: completedCandidates.length
    };

    this.setData({
      stats,
      pendingCandidates,
      completedCandidates
    });

    console.log('[舞蹈导师工作台] 数据加载完成:', {
      totalAssigned: stats.totalAssigned,
      pending: pendingCandidates.length,
      completed: completedCandidates.length
    });
  },

  /**
   * 开始评分
   */
  onEvaluateCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/recruit/dance-evaluation/dance-evaluation?candidateId=${candidateId}`
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
   * 查看历史记录
   */
  onViewHistory() {
    wx.showToast({
      title: '历史记录功能开发中',
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
