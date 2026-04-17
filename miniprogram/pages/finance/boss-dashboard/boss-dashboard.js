import { getFinanceSection } from '../../../utils/finance-api.js';
import { getFinanceToken, getFinanceUserInfo, requireFinanceLogin } from '../../../utils/finance-auth.js';

const BOSS_APPROVAL_TEMPLATE_IDS = [
  'AzXHROkY7zpm1KJXL8qC3cxex3RZii_37KUuETS5p_I'
];

Page({
  data: {
    user: null,
    isBoss: false,
    actingId: '',
    stats: [],
    roi: [],
    costBreakdown: [],
    selectedDimension: 'team',
    dimensionStats: {
      team: {
        label: '团',
        summaryCards: [],
        ranking: [],
        lossMakers: []
      },
      group: {
        label: '经纪人小组',
        summaryCards: [],
        ranking: [],
        lossMakers: []
      }
    },
    currentDimension: {
      label: '团',
      summaryCards: [],
      ranking: [],
      lossMakers: []
    },
    pendingProcurements: [],
    pendingCommissions: [],
    frozenCommissions: [],
    alertLogs: []
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/boss-dashboard/boss-dashboard')) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    const data = await getFinanceSection('bossDashboard');
    const user = getFinanceUserInfo();
    const isBoss = user?.raw?.role === 'admin';
    const dimensionStats = data.dimensionStats || this.data.dimensionStats;
    const selectedDimension = this.data.selectedDimension || 'team';
    this.setData({
      user,
      isBoss,
      stats: data.stats || [],
      roi: data.roi || [],
      costBreakdown: data.costBreakdown || [],
      dimensionStats,
      currentDimension: dimensionStats[selectedDimension] || dimensionStats.team || this.data.currentDimension,
      pendingProcurements: data.pendingProcurements || [],
      pendingCommissions: data.pendingCommissions || [],
      frozenCommissions: data.frozenCommissions || [],
      alertLogs: data.alertLogs || []
    });
  },

  switchDimension(e) {
    const { key } = e.currentTarget.dataset;
    if (!key || !this.data.dimensionStats?.[key]) {
      return;
    }

    this.setData({
      selectedDimension: key,
      currentDimension: this.data.dimensionStats[key]
    });
  },

  async enableBossAlerts() {
    if (!this.data.isBoss) {
      return;
    }

    if (!wx.requestSubscribeMessage || BOSS_APPROVAL_TEMPLATE_IDS.length === 0) {
      wx.showToast({
        title: '当前环境不支持订阅提醒',
        icon: 'none'
      });
      return;
    }

    try {
      const result = await new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
          tmplIds: BOSS_APPROVAL_TEMPLATE_IDS,
          success: resolve,
          fail: reject
        });
      });

      const accepted = BOSS_APPROVAL_TEMPLATE_IDS.some((id) => result?.[id] === 'accept');
      wx.showToast({
        title: accepted ? '已开启手机提醒' : '未开启订阅提醒',
        icon: accepted ? 'success' : 'none'
      });
    } catch (error) {
      wx.showToast({
        title: '未开启订阅提醒',
        icon: 'none'
      });
    }
  },

  async reviewProcurement(e) {
    const { id, approved } = e.currentTarget.dataset;
    if (!this.data.isBoss || !id) {
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

    const approvedValue = approved === true || approved === 'true';
    const actionLabel = approvedValue ? '通过' : '驳回';
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: `${actionLabel}老板审批`,
        content: approvedValue ? '确认通过该超额采购申请？' : '确认驳回该超额采购申请？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ actingId: id });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'reviewBossProcurement',
          data: {
            id,
            approved: approvedValue,
            reviewNote: approvedValue ? '老板审批通过' : '老板审批驳回'
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
      this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || `${actionLabel}失败`,
        icon: 'none'
      });
    } finally {
      this.setData({ actingId: '' });
    }
  },

  async toggleCommissionFreeze(e) {
    const { id, freeze } = e.currentTarget.dataset;
    if (!this.data.isBoss || !id) {
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

    const shouldFreeze = freeze === true || freeze === 'true';
    const actionLabel = shouldFreeze ? '冻结' : '解冻';
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: `${actionLabel}提成`,
        content: shouldFreeze ? '确认冻结该主播提成？' : '确认解除该主播提成冻结？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ actingId: id });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'toggleCommissionFreeze',
          data: {
            candidateId: id,
            freeze: shouldFreeze,
            reason: shouldFreeze ? '离职纠纷/违约风险待核查' : '',
            note: shouldFreeze ? '老板后台一键停发' : '老板解除冻结'
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
      this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || `${actionLabel}失败`,
        icon: 'none'
      });
    } finally {
      this.setData({ actingId: '' });
    }
  },

  async retryBossAlert(e) {
    const { id } = e.currentTarget.dataset;
    if (!this.data.isBoss || !id) {
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

    this.setData({ actingId: id });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'retryBossAlert',
          data: { id },
          token
        }
      });

      const result = res.result || {};
      if (!result.success) {
        throw new Error(result.error || '重试发送失败');
      }

      wx.showToast({
        title: result.message || '提醒已重新发送',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || '重试发送失败',
        icon: 'none'
      });
    } finally {
      this.setData({ actingId: '' });
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
