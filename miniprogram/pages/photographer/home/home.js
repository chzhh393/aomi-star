/**
 * 摄像师工作台
 * 功能：查看待拍摄候选人、上传面试素材
 */

import { getCandidatesByStatus, getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    userInfo: null,
    stats: {
      totalAssigned: 0,
      pendingUpload: 0,
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

    const photographerId = userInfo.id;

    // 获取所有候选人
    const allCandidates = getAllCandidates();

    // 1. 筛选待上传素材的候选人
    // 条件：status = 'interview_scheduled' 且 interviewSchedule.interviewers 包含当前摄像师
    const pendingCandidates = allCandidates.filter(candidate => {
      if (candidate.status !== 'interview_scheduled') return false;
      if (!candidate.interviewSchedule || !candidate.interviewSchedule.interviewers) return false;

      // 检查是否包含当前摄像师ID
      return candidate.interviewSchedule.interviewers.some(
        interviewer => interviewer.id === photographerId && interviewer.role === 'photographer'
      );
    });

    // 2. 筛选已完成的候选人（最近5个）
    // 条件：interviewMaterials.photographer 存在
    const completedCandidates = allCandidates
      .filter(candidate => {
        return candidate.interviewMaterials &&
               candidate.interviewMaterials.photographer &&
               candidate.interviewMaterials.photographer.uploadedBy === photographerId;
      })
      .slice(0, 5); // 只显示最近5个

    // 3. 计算统计数据
    const stats = {
      totalAssigned: pendingCandidates.length + completedCandidates.length,
      pendingUpload: pendingCandidates.length,
      completed: completedCandidates.length
    };

    this.setData({
      stats,
      pendingCandidates,
      completedCandidates
    });

    console.log('[摄像师工作台] 数据加载完成:', {
      totalAssigned: stats.totalAssigned,
      pending: pendingCandidates.length,
      completed: completedCandidates.length
    });
  },

  /**
   * 查看候选人详情并上传素材
   */
  onViewCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/recruit/materials-upload/materials-upload?candidateId=${candidateId}`
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
