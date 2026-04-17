import { handleTokenExpired } from '../../../utils/agent-auth.js';
import { getFinanceToken, requireFinanceLogin } from '../../../utils/finance-auth.js';

const FILTER_OPTIONS = [
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'all', label: '全部' }
];

function formatCurrency(value) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`;
}

function getPriorityLabel(priority) {
  const map = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级'
  };
  return map[priority] || '未设置';
}

function getStatusLabel(status) {
  const map = {
    pending: '待财务审批',
    pending_boss: '待老板审批',
    approved: '已通过',
    rejected: '已驳回'
  };
  return map[status] || '未知状态';
}

function mapProcurement(item = {}) {
  return {
    ...item,
    amountText: formatCurrency(item.amount),
    priorityLabel: getPriorityLabel(item.priority),
    statusLabel: getStatusLabel(item.status)
  };
}

Page({
  data: {
    loading: false,
    submittingId: '',
    filter: 'pending',
    filterOptions: FILTER_OPTIONS,
    requests: [],
    filteredRequests: [],
    stats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0
    },
    draftNotes: {}
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/procurement/procurement')) {
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
          action: 'getFinanceProcurementList',
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
        throw new Error(result.error || '获取采购审批列表失败');
      }

      const requests = (result.data || [])
        .map(mapProcurement)
        .sort((a, b) => {
          if (['pending', 'pending_boss'].includes(a.status) && !['pending', 'pending_boss'].includes(b.status)) return -1;
          if (!['pending', 'pending_boss'].includes(a.status) && ['pending', 'pending_boss'].includes(b.status)) return 1;
          if (a.status === 'pending_boss' && b.status === 'pending') return -1;
          if (a.status === 'pending' && b.status === 'pending_boss') return 1;
          return String(b.requestedAt || '').localeCompare(String(a.requestedAt || ''));
        });

      const stats = {
        pending: requests.filter((item) => ['pending', 'pending_boss'].includes(item.status)).length,
        approved: requests.filter((item) => item.status === 'approved').length,
        rejected: requests.filter((item) => item.status === 'rejected').length,
        totalAmount: requests.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      };

      this.setData({
        requests,
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
    const { requests, filter } = this.data;
    const filteredRequests = filter === 'all'
      ? requests
      : requests.filter((item) => {
          if (filter === 'pending') {
            return ['pending', 'pending_boss'].includes(item.status);
          }
          return item.status === filter;
        });

    this.setData({ filteredRequests });
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

  async reviewRequest(e) {
    const { id, approved } = e.currentTarget.dataset;
    if (!id) {
      return;
    }

    const token = getFinanceToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    const approvedValue = approved === true || approved === 'true';
    const actionLabel = approvedValue ? '通过' : '驳回';
    const reviewNote = (this.data.draftNotes[id] || '').trim();

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: `${actionLabel}采购审批`,
        content: approvedValue ? '确认通过该采购申请？' : '确认驳回该采购申请？',
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
          action: 'reviewFinanceProcurement',
          data: {
            id,
            approved: approvedValue,
            reviewNote
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
        throw new Error(result.error || `${actionLabel}失败`);
      }

      wx.showToast({
        title: result.message || `${actionLabel}成功`,
        icon: 'success'
      });

      this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || `${actionLabel}失败`,
        icon: 'none'
      });
    } finally {
      this.setData({ submittingId: '' });
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
