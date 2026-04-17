import { getFinanceSection } from '../../../utils/finance-api.js';
import { requireFinanceLogin } from '../../../utils/finance-auth.js';

Page({
  data: {
    periodLabel: '',
    stats: [],
    anchors: [],
    deductions: []
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/profit-sharing/profit-sharing')) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    const data = await getFinanceSection('profitSharing');
    this.setData({
      periodLabel: data.periodLabel || '',
      stats: data.stats || [],
      anchors: data.anchors || [],
      deductions: data.deductions || []
    });
  },

  openDetail(e) {
    const { id, name } = e.currentTarget.dataset;
    if (!id && !name) {
      return;
    }

    const params = [];
    if (id) {
      params.push(`id=${encodeURIComponent(id)}`);
    }
    if (name) {
      params.push(`name=${encodeURIComponent(name)}`);
    }

    wx.navigateTo({
      url: `/pages/finance/profit-sharing-detail/detail${params.length ? `?${params.join('&')}` : ''}`
    });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
