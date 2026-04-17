import {
  getFinanceCommissionLedger,
  getFinanceContractReviewList
} from '../../../utils/finance-api.js';
import { requireFinanceLogin } from '../../../utils/finance-auth.js';

const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待财务审核' },
  { value: 'approved', label: '财务已通过' },
  { value: 'rejected', label: '财务已驳回' }
];

function buildStats(list = []) {
  return {
    total: list.length,
    pending: list.filter((item) => item.financeStatus === 'pending').length,
    approved: list.filter((item) => item.financeStatus === 'approved').length,
    rejected: list.filter((item) => item.financeStatus === 'rejected').length
  };
}

function mergeCandidateRecords(contracts = [], commissions = []) {
  const contractMap = new Map();
  const commissionMap = new Map();
  contracts.forEach((item) => {
    if (item && item._id) {
      contractMap.set(item._id, item);
    }
  });
  commissions.forEach((item) => {
    if (item && item.candidateId) {
      commissionMap.set(item.candidateId, item);
    }
  });

  const candidateIds = [...new Set([
    ...contracts.map((item) => item?._id).filter(Boolean),
    ...commissions.map((item) => item?.candidateId).filter(Boolean)
  ])];

  return candidateIds.map((candidateId) => {
    const item = contractMap.get(candidateId) || {};
    const commission = commissionMap.get(candidateId) || {};
    return {
      id: candidateId,
      name: item.displayName || commission.candidateName || '未命名候选人',
      candidateNo: item.candidateNo || candidateId || '-',
      financeStatus: item.financeStatus || '',
      financeStatusLabel: item.financeStatusLabel || '未提交',
      workflowStatusLabel: item.workflowStatusLabel || '未开始',
      contractTitle: item.contractTitle || '未命名合同',
      financeReviewer: item.financeReviewer || '-',
      updatedAtText: item.updatedAtText || '-',
      commissionStatusLabel: commission.statusLabel || '暂无分润',
      commissionAmountText: commission.totalAmountText || '¥0'
    };
  }).sort((a, b) => String(b.updatedAtText || '').localeCompare(String(a.updatedAtText || '')));
}

Page({
  data: {
    loading: false,
    filter: 'all',
    filterOptions: FILTER_OPTIONS,
    candidates: [],
    filteredCandidates: [],
    stats: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/candidates/candidates')) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const [contractResult, commissionResult] = await Promise.all([
        getFinanceContractReviewList(),
        getFinanceCommissionLedger().catch(() => ({ list: [] }))
      ]);

      const candidates = mergeCandidateRecords(
        contractResult.list || [],
        commissionResult.list || []
      );

      this.setData({
        candidates,
        stats: buildStats(candidates)
      }, () => {
        this.applyFilter();
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载候选人失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const { candidates, filter } = this.data;
    const filteredCandidates = filter === 'all'
      ? candidates
      : candidates.filter((item) => item.financeStatus === filter);

    this.setData({ filteredCandidates });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    if (!filter || filter === this.data.filter) {
      return;
    }

    this.setData({ filter }, () => {
      this.applyFilter();
    });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/finance/candidate-detail/detail?id=${encodeURIComponent(id)}`
    });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
