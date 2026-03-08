/**
 * 我的评价记录页
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateList, getAgentStats } from '../../../utils/agent-api.js';

Page({
  data: {
    scoreList: [],
    loading: false,
    hasMore: true,

    // 分页参数
    page: 1,
    pageSize: 10,

    // 统计数据
    stats: {
      totalCount: 0,
      monthCount: 0
    }
  },

  onLoad() {
    // 检查登录状态
    if (!requireAgentLogin()) {
      return;
    }

    this.loadStats();
    this.loadScores();
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      const stats = await getAgentStats();
      this.setData({
        stats: {
          totalCount: stats.scoredCount || 0,
          monthCount: stats.monthCount || 0
        }
      });
    } catch (error) {
      console.error('[评价记录] 加载统计数据失败:', error);
    }
  },

  /**
   * 加载评价记录列表
   */
  async loadScores(refresh = false) {
    if (this.data.loading) return;

    // 刷新时重置分页
    if (refresh) {
      this.setData({
        page: 1,
        scoreList: [],
        hasMore: true
      });
    }

    this.setData({ loading: true });

    try {
      // 只获取已打分的候选人
      const result = await getCandidateList({
        status: 'scored',
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      console.log('[评价记录] 加载结果:', result);

      const newList = refresh
        ? result.list
        : [...this.data.scoreList, ...result.list];

      this.setData({
        scoreList: newList,
        hasMore: result.list.length >= this.data.pageSize,
        loading: false
      });
    } catch (error) {
      console.error('[评价记录] 加载失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 加载更多
   */
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({
      page: this.data.page + 1
    });

    this.loadScores();
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadStats();
    await this.loadScores(true);
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
  },

  /**
   * 获取标签列表（最多5个）
   */
  getTags(item) {
    if (!item.interview || !item.interview.score || !item.interview.score.tags) {
      return [];
    }

    const tags = item.interview.score.tags;
    const allTags = [];

    // 合并所有维度的标签
    ['appearance', 'talent', 'personality', 'communication', 'potential'].forEach(key => {
      if (tags[key] && Array.isArray(tags[key])) {
        allTags.push(...tags[key]);
      }
    });

    // 返回前5个
    return allTags.slice(0, 5);
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 1小时内
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分钟前`;
    }

    // 1天内
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}小时前`;
    }

    // 显示日期
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    // 同一年只显示月日
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hour}:${minute}`;
    }

    return `${year}-${month}-${day}`;
  }
});
