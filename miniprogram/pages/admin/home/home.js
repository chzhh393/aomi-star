import { requireAgentLogin, getAgentInfo, getAgentToken } from '../../../utils/agent-auth.js';
import { getFinanceSection } from '../../../utils/finance-api.js';
import {
  getCompletedInterviewCandidates,
  getPendingInterviewCandidates
} from '../../../utils/interview-api.js';

function buildQuickActions(interviewStats = {}) {
  return [
    {
      id: 'interview',
      route: '/pages/admin/review-board/review-board',
      label: '面试总评',
      desc: `待总评 ${interviewStats.pendingCount || 0} 人，点击进入管理员面试总评列表`,
      accent: '#607D8B'
    },
    {
      id: 'salary',
      route: '/pages/finance/commissions/commissions',
      label: '结算台账',
      desc: '查看提成冻结状态并确认可支付单据',
      accent: '#1D4ED8'
    },
    {
      id: 'purchase',
      route: '/pages/finance/procurement/procurement',
      label: '采购审批',
      desc: '处理超额采购并跟踪老板终审结果',
      accent: '#B45309'
    },
    {
      id: 'report',
      route: '/pages/finance/boss-dashboard/boss-dashboard',
      label: '老板看板',
      desc: '直接处理一键停发、预算审批和提醒台账',
      accent: '#7C3AED'
    }
  ];
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  const source = value?.toDate ? value.toDate() : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function mapPendingScout(item = {}) {
  const profile = item.profile || {};
  const application = item.application || {};
  const invitePlan = application.invitePlan || {};
  return {
    id: item._id || '',
    name: profile.name || '未命名星探',
    phone: profile.phone || '-',
    idCardMasked: profile.idCardMasked || profile.idCard || '-',
    wechat: profile.wechat || '-',
    reason: application.reason || '未填写申请理由',
    appliedAtText: formatDateTime(application.appliedAt || item.createdAt),
    inviterName: item.parentScout?.scoutName || '-',
    inviteTitle: invitePlan.title || ''
  };
}

Page({
  data: {
    user: null,
    reviewingScoutId: '',
    summaryCards: [],
    coreMetrics: [],
    moduleCards: [],
    alerts: [],
    settlementFlow: [],
    quickActions: [],
    pendingProcurements: [],
    pendingCommissions: [],
    frozenCommissions: [],
    pendingScouts: [],
    interviewStats: {
      pendingCount: 0,
      reviewedCount: 0
    }
  },

  onShow() {
    if (!requireAgentLogin({
      redirectUrl: '/pages/admin/home/home',
      allowedRoles: ['admin']
    })) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    wx.showNavigationBarLoading();

    try {
      const user = getAgentInfo() || {};
      const token = getAgentToken();
      const operatorId = user._id || user.id || user.username || user.name || '';
      const operatorName = user.name || user.username || '';
      const [overview, bossDashboard, pendingRes, reviewedRes, pendingScoutsRes] = await Promise.all([
        getFinanceSection('overview'),
        getFinanceSection('bossDashboard'),
        getPendingInterviewCandidates({
          role: 'admin',
          operatorId,
          operatorName,
          page: 1,
          pageSize: 20
        }).catch(() => ({ data: { list: [] } })),
        getCompletedInterviewCandidates({
          role: 'admin',
          operatorId,
          operatorName,
          page: 1,
          pageSize: 20
        }).catch(() => ({ data: { list: [] } })),
        token
          ? wx.cloud.callFunction({
            name: 'admin',
            data: {
              action: 'getPendingScouts',
              data: {
                page: 1,
                pageSize: 5
              },
              token
            }
          }).catch(() => ({ result: { success: false, data: { list: [] } } }))
          : Promise.resolve({ result: { success: false, data: { list: [] } } })
      ]);

      const pendingCount = Array.isArray(pendingRes?.data?.list) ? pendingRes.data.list.length : 0;
      const reviewedCount = Array.isArray(reviewedRes?.data?.list) ? reviewedRes.data.list.length : 0;
      const interviewStats = { pendingCount, reviewedCount };

      const summaryCards = [
        ...(overview.summaryCards || []).slice(0, 2),
        {
          id: 'boss-pending',
          value: `${(bossDashboard.pendingProcurements || []).length}`,
          unit: '单',
          label: '老板待批采购',
          note: '超过 5000 元自动进入老板终审',
          tone: 'sand'
        },
        {
          id: 'boss-freeze',
          value: `${(bossDashboard.frozenCommissions || []).length}`,
          unit: '笔',
          label: '已冻结提成',
          note: '冻结后财务与后台都不可支付',
          tone: 'plum'
        }
      ];

      const coreMetrics = [
        {
          id: 'interview-pending',
          label: '待总评候选人',
          value: `${pendingCount} 人`,
          detail: pendingCount > 0 ? '管理员可进入面试总评页继续终审' : '当前没有待总评候选人'
        },
        {
          id: 'procurement-pending',
          label: '待老板采购',
          value: `${(bossDashboard.pendingProcurements || []).length} 单`,
          detail: (bossDashboard.pendingProcurements || []).length > 0
            ? '财务已通过，等待老板确认'
            : '当前没有待老板确认的采购'
        },
        {
          id: 'commission-frozen',
          label: '冻结提成',
          value: `${(bossDashboard.frozenCommissions || []).length} 笔`,
          detail: (bossDashboard.frozenCommissions || []).length > 0
            ? '冻结中的提成会阻断财务发放'
            : '当前没有冻结中的提成'
        },
        {
          id: 'reviewed-total',
          label: '已评价记录',
          value: `${reviewedCount} 份`,
          detail: '保留管理员面试汇总能力，不再占满整个首页'
        }
      ];

      this.setData({
        user,
        summaryCards,
        coreMetrics,
        moduleCards: overview.moduleCards || [],
        alerts: overview.alerts || [],
        settlementFlow: overview.settlementFlow || [],
        quickActions: buildQuickActions(interviewStats),
        pendingProcurements: bossDashboard.pendingProcurements || [],
        pendingCommissions: bossDashboard.pendingCommissions || [],
        frozenCommissions: bossDashboard.frozenCommissions || [],
        pendingScouts: Array.isArray(pendingScoutsRes?.result?.data?.list)
          ? pendingScoutsRes.result.data.list.map(mapPendingScout)
          : [],
        interviewStats
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  onActionTap(e) {
    const { route, label } = e.currentTarget.dataset;
    if (!route) {
      wx.showToast({
        title: `${label}能力规划中`,
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({ url: route });
  },

  async reviewScoutApplication(e) {
    const { id, approved } = e.currentTarget.dataset;
    const actionText = approved ? '通过' : '拒绝';
    const token = getAgentToken();

    if (!id || !token) {
      wx.showToast({
        title: '登录状态失效，请重新进入',
        icon: 'none'
      });
      return;
    }

    let reviewNote = '';
    const confirmRes = approved
      ? await wx.showModal({
        title: `确认${actionText}`,
        content: '确认通过该星探申请？',
        confirmText: actionText,
        confirmColor: '#16A34A'
      }).catch(() => ({ confirm: false }))
      : await wx.showModal({
        title: '拒绝申请',
        content: '请输入拒绝原因',
        editable: true,
        placeholderText: '例如：资料不完整，请补充后重新申请',
        confirmText: '拒绝',
        confirmColor: '#DC2626'
      }).catch(() => ({ confirm: false, content: '' }));

    if (!confirmRes.confirm) {
      return;
    }

    if (!approved) {
      reviewNote = String(confirmRes.content || '').trim();
      if (!reviewNote) {
        wx.showToast({
          title: '请填写拒绝原因',
          icon: 'none'
        });
        return;
      }
    }

    this.setData({ reviewingScoutId: id });

    try {
      wx.showLoading({
        title: `${actionText}中...`,
        mask: true
      });

      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'reviewScoutApplication',
          data: {
            scoutId: id,
            approved: Boolean(approved),
            reviewNote
          },
          token
        }
      });

      const result = res?.result || {};
      if (!result.success) {
        throw new Error(result.error || `${actionText}失败`);
      }

      wx.showToast({
        title: result.message || `${actionText}成功`,
        icon: 'success'
      });

      await this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || `${actionText}失败`,
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ reviewingScoutId: '' });
    }
  },

  onModuleTap(e) {
    const { route, title } = e.currentTarget.dataset;
    if (!route) {
      wx.showToast({
        title: `${title}详情待接后端`,
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({ url: route });
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
