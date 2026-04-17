import { getFinanceContractReviewList } from '../../../utils/finance-api.js';
import { getFinanceToken, requireFinanceLogin } from '../../../utils/finance-auth.js';

const FILTER_OPTIONS = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'all', label: '全部' }
];

Page({
  data: {
    targetCandidateId: '',
    loading: false,
    submittingId: '',
    filter: 'pending',
    filterOptions: FILTER_OPTIONS,
    contracts: [],
    filteredContracts: [],
    stats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      all: 0
    },
    draftComments: {}
  },

  onLoad(options = {}) {
    const targetCandidateId = decodeURIComponent(options.candidateId || '');
    if (targetCandidateId) {
      this.setData({
        targetCandidateId,
        filter: 'all'
      });
    }
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/contracts/contracts')) {
      return;
    }

    this.loadContracts();
  },

  async loadContracts() {
    this.setData({ loading: true });

    try {
      const result = await getFinanceContractReviewList();
      const contracts = result.list || [];
      const stats = result.stats || {
        pending: 0,
        approved: 0,
        rejected: 0,
        all: 0
      };

      this.setData({
        contracts,
        stats
      }, () => {
        this.applyFilter();
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilter() {
    const { contracts, filter, targetCandidateId } = this.data;
    const baseList = filter === 'all'
      ? contracts
      : contracts.filter((item) => item.financeStatus === filter);
    const filteredContracts = targetCandidateId
      ? baseList.filter((item) => item._id === targetCandidateId)
      : baseList;

    this.setData({ filteredContracts });
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

  onCommentInput(e) {
    const candidateId = e.currentTarget.dataset.id;
    this.setData({
      [`draftComments.${candidateId}`]: e.detail.value
    });
  },

  async reviewContract(e) {
    const { id, approved } = e.currentTarget.dataset;
    const candidate = this.data.filteredContracts.find((item) => item._id === id);
    if (!candidate) {
      return;
    }

    const token = getFinanceToken();
    if (!token) return;

    const approvedValue = approved === true || approved === 'true';
    const actionLabel = approvedValue ? '通过' : '驳回';
    const hasDraftComment = Object.prototype.hasOwnProperty.call(this.data.draftComments, id);
    const comment = String(hasDraftComment ? this.data.draftComments[id] : (candidate.financeComment || '')).trim();

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: `${actionLabel}合同审核`,
        content: approvedValue ? '确认将该合同流转到管理员审核？' : '确认将该合同驳回到草稿状态？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ submittingId: id });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'reviewContractFinance',
          data: {
            candidateId: id,
            approved: approvedValue,
            comment
          },
          token
        }
      });

      const result = res.result || {};
      if (!result.success) {
        throw new Error(result.error || `${actionLabel}失败`);
      }

      wx.showToast({
        title: result.message || `${actionLabel}成功`,
        icon: 'success'
      });

      this.loadContracts();
    } catch (error) {
      wx.showToast({
        title: error.message || `${actionLabel}失败`,
        icon: 'none'
      });
    } finally {
      this.setData({ submittingId: '' });
    }
  },

  openCandidateList() {
    wx.navigateTo({
      url: '/pages/finance/candidates/candidates'
    });
  },

  onPullDownRefresh() {
    this.loadContracts().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
