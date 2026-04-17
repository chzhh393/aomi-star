import { getFinanceSection } from '../../../utils/finance-api.js';
import { getFinanceToken, getFinanceUserInfo, requireFinanceLogin } from '../../../utils/finance-auth.js';

const SUMMARY_ROUTES = {
  settlement: '/pages/finance/commissions/commissions',
  payroll: '/pages/finance/profit-sharing/profit-sharing',
  purchase: '/pages/finance/procurement/procurement',
  roi: '/pages/finance/boss-dashboard/boss-dashboard'
};

const METRIC_ROUTES = {
  contracts: '/pages/finance/contracts/contracts',
  deduction: '/pages/finance/profit-sharing/profit-sharing',
  vendors: '/pages/finance/vendor-settlement/vendor-settlement'
};

Page({
  data: {
    user: null,
    debugVisible: false,
    seeding: false,
    summaryCards: [],
    coreMetrics: [],
    moduleCards: [],
    alerts: [],
    settlementFlow: [],
    quickActions: [
      {
        id: 'contracts',
        route: '/pages/finance/contracts/contracts',
        label: '合同审核',
        desc: '处理待财务审核合同并流转管理员审批',
        accent: '#0F766E'
      },
      {
        id: 'salary',
        route: '/pages/finance/commissions/commissions',
        label: '结算台账',
        desc: '查看分账记录并确认已支付款项',
        accent: '#1D4ED8'
      },
      {
        id: 'purchase',
        route: '/pages/finance/procurement/procurement',
        label: '采购审批',
        desc: '处理基地物料、零食、服装与道具采购',
        accent: '#B45309'
      },
      {
        id: 'vendor',
        route: '/pages/finance/vendor-settlement/vendor-settlement',
        label: '外部结算',
        desc: '老师课时费、ZGA、剪辑团队本月待结算',
        accent: '#047857'
      },
      {
        id: 'report',
        route: '/pages/finance/boss-dashboard/boss-dashboard',
        label: '老板看板',
        desc: '查看 ROI、盈亏平衡点与基地经营快照',
        accent: '#7C3AED'
      }
    ]
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/home/home')) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    const overview = await getFinanceSection('overview');
    const user = getFinanceUserInfo();
    const role = user?.raw?.role || '';

    this.setData({
      user,
      debugVisible: this.data.debugVisible && ['finance', 'admin'].includes(role),
      summaryCards: overview.summaryCards || [],
      coreMetrics: overview.coreMetrics || [],
      moduleCards: overview.moduleCards || [],
      alerts: overview.alerts || [],
      settlementFlow: overview.settlementFlow || []
    });
  },

  onActionTap(e) {
    const { label, route } = e.currentTarget.dataset;
    if (route) {
      wx.navigateTo({
        url: route
      });
      return;
    }

    wx.showToast({
      title: `${label}能力规划中`,
      icon: 'none'
    });
  },

  onModuleTap(e) {
    const { title, route } = e.currentTarget.dataset;
    if (route) {
      wx.navigateTo({
        url: route
      });
      return;
    }

    wx.showToast({
      title: `${title}详情待接后端`,
      icon: 'none'
    });
  },

  onSummaryTap(e) {
    const id = e.currentTarget.dataset.id;
    const route = SUMMARY_ROUTES[id];
    if (!route) {
      wx.showToast({
        title: '该模块暂未开启跳转',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: route
    });
  },

  onMetricTap(e) {
    const id = e.currentTarget.dataset.id;
    const route = METRIC_ROUTES[id];
    if (!route) {
      wx.showToast({
        title: '该指标暂无详情页',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: route
    });
  },

  onRevealDebug() {
    const role = this.data.user?.raw?.role || '';
    if (!['finance', 'admin'].includes(role)) {
      wx.showToast({
        title: '仅财务或管理员可用',
        icon: 'none'
      });
      return;
    }

    const nextVisible = !this.data.debugVisible;
    this.setData({ debugVisible: nextVisible });
    wx.showToast({
      title: nextVisible ? '调试入口已显示' : '调试入口已隐藏',
      icon: 'none'
    });
  },

  async seedFinanceDemoData() {
    if (this.data.seeding) {
      return;
    }

    const token = getFinanceToken();
    if (!token) {
      wx.showToast({
        title: '登录已失效，请重新登录',
        icon: 'none'
      });
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '初始化演示数据',
        content: '将向采购审批和外部结算集合写入演示记录，已存在相同 bizNo 的数据会更新。是否继续？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ seeding: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'seedFinanceDemoData',
          data: {},
          token
        }
      });

      const result = res.result || {};
      if (!result.success) {
        throw new Error(result.error || result.message || '初始化失败');
      }

      const data = result.data || {};
      wx.showModal({
        title: '初始化完成',
        content: `采购单：新增 ${data.procurementCreated || 0}，更新 ${data.procurementUpdated || 0}\n结算单：新增 ${data.vendorCreated || 0}，更新 ${data.vendorUpdated || 0}`,
        showCancel: false
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '初始化失败',
        icon: 'none'
      });
    } finally {
      this.setData({ seeding: false });
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    });
  }
});
