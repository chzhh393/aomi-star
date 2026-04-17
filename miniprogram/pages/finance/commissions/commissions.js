import {
  confirmFinanceCommissionPayment,
  getFinanceCommissionLedger
} from '../../../utils/finance-api.js';
import { requireFinanceLogin } from '../../../utils/finance-auth.js';

const FILTER_OPTIONS = [
  { value: 'calculated', label: '待支付' },
  { value: 'frozen', label: '已冻结' },
  { value: 'paid', label: '已支付' },
  { value: 'all', label: '全部' }
];

Page({
  data: {
    loading: false,
    payingId: '',
    filter: 'calculated',
    filterOptions: FILTER_OPTIONS,
    commissions: [],
    filteredCommissions: [],
    stats: {
      totalPending: 0,
      pendingAmount: 0,
      pendingAmountText: '¥0',
      paidAmount: 0,
      paidAmountText: '¥0',
      totalAmount: 0,
      totalAmountText: '¥0'
    }
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/commissions/commissions')) {
      return;
    }

    this.loadCommissions();
  },

  async loadCommissions() {
    this.setData({ loading: true });

    try {
      const result = await getFinanceCommissionLedger();
      const allCommissions = result.list || [];
      const stats = result.stats || {
        totalPending: 0,
        pendingAmount: 0,
        pendingAmountText: '¥0',
        paidAmount: 0,
        paidAmountText: '¥0',
        totalAmount: 0,
        totalAmountText: '¥0'
      };

      this.setData({
        commissions: allCommissions,
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
    const { commissions, filter } = this.data;
    const filteredCommissions = filter === 'all'
      ? commissions
      : commissions.filter((item) => {
          if (filter === 'frozen') {
            return item.freezeStatus === 'frozen';
          }
          return item.status === filter;
        });

    this.setData({ filteredCommissions });
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

  async confirmPayment(e) {
    const candidateId = e.currentTarget.dataset.id;
    if (!candidateId) {
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认支付',
        content: '确认该笔分账已完成支付？系统会同步更新星探收益状态。',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ payingId: candidateId });

    try {
      const result = await confirmFinanceCommissionPayment(candidateId);

      wx.showToast({
        title: result.message || '支付确认成功',
        icon: 'success'
      });

      this.loadCommissions();
    } catch (error) {
      wx.showToast({
        title: error.message || '确认支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ payingId: '' });
    }
  },

  onPullDownRefresh() {
    this.loadCommissions().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
