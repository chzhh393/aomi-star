/**
 * 候选人列表页
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateList, getAgentStats } from '../../../utils/agent-api.js';
import {
  getCandidateAssignedAgent,
  getCandidateAvatar,
  getCandidateDisplayName,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

function mapCandidate(candidate = {}) {
  const displayName = getCandidateDisplayName(candidate);
  const assignedAgent = getCandidateAssignedAgent(candidate);

  return {
    ...candidate,
    assignedAgent,
    avatar: getCandidateAvatar(candidate),
    displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?'
  };
}

Page({
  data: {
    currentTab: 'all',     // 当前筛选标签：all|pending|scored
    candidateList: [],     // 候选人列表
    loading: false,        // 加载状态
    hasMore: true,         // 是否还有更多数据

    // 分页参数
    page: 1,
    pageSize: 10,

    // 统计数据
    stats: {
      totalCount: 0,
      pendingCount: 0,
      scoredCount: 0
    }
  },

  onLoad() {
    // 检查登录状态
    if (!requireAgentLogin()) {
      return;
    }

    // 加载数据
    this.loadStats();
    this.loadCandidates();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await getAgentStats();
      this.setData({ stats });
    } catch (error) {
      console.error('[候选人列表] 加载统计数据失败:', error);
    }
  },

  /**
   * 加载候选人列表
   */
  async loadCandidates(refresh = false) {
    // 防止重复加载
    if (this.data.loading) return;

    // 刷新时重置分页
    if (refresh) {
      this.setData({
        page: 1,
        candidateList: [],
        hasMore: true
      });
    }

    this.setData({ loading: true });

    try {
      // 根据当前标签确定筛选条件
      let status;
      if (this.data.currentTab === 'pending') {
        status = 'pending_score';
      } else if (this.data.currentTab === 'scored') {
        status = 'scored';
      }

      const result = await getCandidateList({
        status,
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      console.log('[候选人列表] 加载结果:', result);

      const hydratedCandidateList = await hydrateCandidateAvatarList(result.list || []);
      const mappedCandidateList = hydratedCandidateList.map(mapCandidate);
      const newList = refresh
        ? mappedCandidateList
        : [...this.data.candidateList, ...mappedCandidateList];

      this.setData({
        candidateList: newList,
        hasMore: mappedCandidateList.length >= this.data.pageSize,
        loading: false
      });
    } catch (error) {
      console.error('[候选人列表] 加载失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 切换筛选标签
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;

    this.setData({ currentTab: tab });
    this.loadCandidates(true);
  },

  /**
   * 加载更多
   */
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });

    this.loadCandidates();
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadStats();
    await this.loadCandidates(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 跳转到候选人详情
   */
  goToDetail(e) {
    const candidateId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/agent/candidate-detail/candidate-detail?id=${candidateId}`
    });
  },

  handleAvatarError(e) {
    const { index } = e.currentTarget.dataset;
    if (typeof index !== 'number') {
      return;
    }

    this.setData({
      [`candidateList[${index}].avatar`]: ''
    });
  },

  /**
   * 获取评分等级标签
   */
  getScoreLabel(result) {
    const labels = {
      'pass_s': 'S级通过',
      'pass_a': 'A级通过',
      'pass_b': 'B级通过',
      'fail': '不通过',
      'pending': '待定'
    };
    return labels[result] || result;
  }
});
