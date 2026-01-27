// pages/hr/candidates/candidates.js
import { getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    // 筛选状态
    activeFilter: 'all',
    filterOptions: [
      { value: 'all', label: '全部' },
      { value: 'pending', label: '待审核' },
      { value: 'interview_scheduled', label: '已安排面试' },
      { value: 'online_test_completed', label: '已完成测试' },
      { value: 'pending_rating', label: '待评级' },
      { value: 'rated', label: '已评级' },
      { value: 'signed', label: '已签约' },
      { value: 'rejected', label: '未通过' }
    ],

    // 候选人列表
    allCandidates: [],
    filteredCandidates: [],

    // 统计数据
    stats: {
      total: 0,
      pending: 0,
      interview_scheduled: 0,
      online_test_completed: 0,
      pending_rating: 0,
      rated: 0,
      signed: 0,
      rejected: 0
    }
  },

  onLoad() {
    this.loadCandidates();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadCandidates();
  },

  // 加载候选人数据
  loadCandidates() {
    const candidates = getAllCandidates();

    // 计算统计数据
    const stats = {
      total: candidates.length,
      pending: candidates.filter(c => c.status === 'pending').length,
      interview_scheduled: candidates.filter(c => c.status === 'interview_scheduled').length,
      online_test_completed: candidates.filter(c => c.status === 'online_test_completed').length,
      pending_rating: candidates.filter(c => c.status === 'pending_rating').length,
      rated: candidates.filter(c => c.status === 'rated').length,
      signed: candidates.filter(c => c.status === 'signed').length,
      rejected: candidates.filter(c => c.status === 'rejected').length
    };

    this.setData({
      allCandidates: candidates,
      stats
    }, () => {
      this.filterCandidates();
    });

    console.log('[HR列表] 候选人数据加载完成:', stats);
  },

  // 切换筛选
  switchFilter(e) {
    const { filter } = e.currentTarget.dataset;
    this.setData({
      activeFilter: filter
    }, () => {
      this.filterCandidates();
    });
  },

  // 筛选候选人
  filterCandidates() {
    const { activeFilter, allCandidates } = this.data;

    let filtered = allCandidates;
    if (activeFilter !== 'all') {
      filtered = allCandidates.filter(c => c.status === activeFilter);
    }

    // 按创建时间倒序排序（最新的在前）
    filtered.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    this.setData({
      filteredCandidates: filtered
    });
  },

  // 查看候选人详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/hr/candidate-detail/candidate-detail?id=${id}`
    });
  }
});
