import { handleTokenExpired } from '../../../utils/agent-auth.js';
import { getFinanceToken, requireFinanceLogin } from '../../../utils/finance-auth.js';

const FILTER_OPTIONS = [
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'all', label: '全部' }
];

function formatCurrency(value) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`;
}

function getStatusLabel(status) {
  return status === 'paid' ? '已支付' : '待支付';
}

function mapSettlement(item = {}) {
  return {
    ...item,
    amountText: formatCurrency(item.amount),
    statusLabel: getStatusLabel(item.status)
  };
}

Page({
  data: {
    loading: false,
    payingId: '',
    filter: 'pending',
    filterOptions: FILTER_OPTIONS,
    settlements: [],
    filteredSettlements: [],
    stats: {
      pendingCount: 0,
      pendingAmount: 0,
      paidCount: 0,
      paidAmount: 0
    },
    draftNotes: {}
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/vendor-settlement/vendor-settlement')) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    const token = getFinanceToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'getFinanceVendorSettlementList',
          data: {
            status: 'all'
          },
          token
        }
      });

      const result = res.result || {};
      if (!result.success) {
        if ((result.error || '').includes('未授权')) {
          handleTokenExpired();
          return;
        }
        throw new Error(result.error || '获取外部结算列表失败');
      }

      const settlements = (result.data || [])
        .map(mapSettlement)
        .sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return String(a.dueDate || '').localeCompare(String(b.dueDate || ''));
        });

      const stats = {
        pendingCount: settlements.filter((item) => item.status === 'pending').length,
        pendingAmount: settlements
          .filter((item) => item.status === 'pending')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        paidCount: settlements.filter((item) => item.status === 'paid').length,
        paidAmount: settlements
          .filter((item) => item.status === 'paid')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      };

      this.setData({
        settlements,
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
    const { settlements, filter } = this.data;
    const filteredSettlements = filter === 'all'
      ? settlements
      : settlements.filter((item) => item.status === filter);

    this.setData({ filteredSettlements });
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

  onNoteInput(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      [`draftNotes.${id}`]: e.detail.value
    });
  },

  async confirmPayment(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const token = getFinanceToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    const paymentNote = (this.data.draftNotes[id] || '').trim();
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认支付',
        content: '确认该笔外部结算已完成支付？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ payingId: id });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'markFinanceVendorSettlementPaid',
          data: {
            id,
            paymentNote
          },
          token
        }
      });

      const result = res.result || {};
      if (!result.success) {
        if ((result.error || '').includes('未授权')) {
          handleTokenExpired();
          return;
        }
        throw new Error(result.error || '确认支付失败');
      }

      wx.showToast({
        title: result.message || '支付确认成功',
        icon: 'success'
      });

      this.loadData();
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
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
