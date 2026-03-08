/**
 * 经纪人主页
 * 显示统计数据和快捷入口
 */

import { getAgentInfo, requireAgentLogin, agentLogout } from '../../../utils/agent-auth.js';
import { getCandidateList, getAgentStats } from '../../../utils/agent-api.js';

Page({
  data: {
    agentInfo: null,
    loading: false,

    // 统计数据
    stats: {
      totalCount: 0,      // 分配候选人总数
      pendingCount: 0,    // 待打分数
      scoredCount: 0,     // 已打分数
      monthCount: 0       // 本月打分数
    },

    // 待打分候选人列表（预览前3个）
    pendingCandidates: []
  },

  onLoad() {
    // 检查登录状态
    if (!requireAgentLogin()) {
      return;
    }

    // 获取经纪人信息
    const agentInfo = getAgentInfo();
    this.setData({ agentInfo });

    // 加载数据
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据
    if (this.data.agentInfo) {
      this.loadData();
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    this.setData({ loading: true });

    try {
      // 1. 获取统计数据
      const stats = await getAgentStats();
      console.log('[经纪人主页] 统计数据:', stats);

      // 2. 获取待打分候选人列表（前3个）
      let pendingCandidates = [];
      if (stats.pendingCount > 0) {
        const result = await getCandidateList({
          status: 'pending_score',
          page: 1,
          pageSize: 3
        });

        pendingCandidates = result.list || [];
      }

      this.setData({
        stats,
        pendingCandidates,
        loading: false
      });
    } catch (error) {
      console.error('[经纪人主页] 加载数据失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新数据
   */
  async handleRefresh() {
    await this.loadData();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },

  /**
   * 跳转到候选人列表
   */
  goToCandidateList() {
    wx.navigateTo({
      url: '/pages/agent/candidates/candidates'
    });
  },

  /**
   * 跳转到评价记录
   */
  goToMyScores() {
    wx.navigateTo({
      url: '/pages/agent/my-scores/my-scores'
    });
  },

  /**
   * 跳转到候选人详情
   */
  goToCandidateDetail(e) {
    const candidateId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/agent/candidate-detail/candidate-detail?id=${candidateId}`
    });
  },

  /**
   * 登出
   */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          agentLogout();
        }
      }
    });
  }
});
