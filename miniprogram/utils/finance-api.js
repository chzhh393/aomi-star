import { getFinanceToken } from './finance-auth.js';

function buildEmptyOverviewSection() {
  return {
    summaryCards: [
      { id: 'settlement', value: 0, unit: '人', label: '本月待结算主播', note: '当前暂无可结算主播', tone: 'dark' },
      { id: 'payroll', value: '¥0', unit: '', label: '预计应发提成', note: '当前暂无分润数据', tone: 'gold' },
      { id: 'purchase', value: 0, unit: '单', label: '待审批采购申请', note: '当前暂无采购申请', tone: 'white' },
      { id: 'roi', value: '0', unit: '%', label: '综合 ROI', note: '等待真实经营数据', tone: 'green' }
    ],
    coreMetrics: [
      { id: 'contracts', label: '合同待复核', value: 0, detail: '当前暂无待复核合同' },
      { id: 'deduction', label: '异常扣款待确认', value: 0, detail: '当前暂无异常扣款' },
      { id: 'vendors', label: '外部账单待支付', value: 0, detail: '当前暂无外部账单' },
      { id: 'breakeven', label: '盈亏平衡差额', value: '¥0', detail: '等待真实经营数据' }
    ],
    moduleCards: [
      {
        id: 'profit-sharing',
        tag: '核心',
        title: '主播分润系统',
        desc: '流水自动算账，叠加合同比例、阶梯奖励与扣款补丁，形成待审核工资单。',
        progress: 0,
        tone: 'dark',
        route: '/pages/finance/profit-sharing/profit-sharing',
        chips: ['自动算账', '扣款补丁', '电子工资条'],
        metrics: [
          { label: '待审核工资单', value: '0 份' },
          { label: '异常扣款', value: '0 条' }
        ]
      },
      {
        id: 'procurement',
        tag: '基地',
        title: '物料与采购管理',
        desc: '固定资产折旧、易耗品申请、扫码入库和库存预警，覆盖 5000 平基地日常补给。',
        progress: 0,
        tone: 'sand',
        route: '/pages/finance/procurement/procurement',
        chips: ['固定资产档案', '采购审批', '库存预警'],
        metrics: [
          { label: '资产台账', value: '0 项' },
          { label: '低库存提醒', value: '0 项' }
        ]
      },
      {
        id: 'external',
        tag: '结算',
        title: '供应商与外部结算',
        desc: '按舞蹈老师课表汇总课时费，并管理 ZGA 与第三方剪辑团队的月度应付账款。',
        progress: 0,
        tone: 'green',
        route: '/pages/finance/vendor-settlement/vendor-settlement',
        chips: ['老师课时费', '外部协作账单', '付款台账'],
        metrics: [
          { label: '老师课时费', value: '¥0' },
          { label: '外部协作应付', value: '¥0' }
        ]
      },
      {
        id: 'board',
        tag: '老板',
        title: '财务看板',
        desc: '实时跟踪单人产出比、基地盈亏平衡点、月度总营收和重点主播投入产出。',
        progress: 0,
        tone: 'plum',
        route: '/pages/finance/boss-dashboard/boss-dashboard',
        chips: ['单人 ROI', '盈亏平衡点', '经营总览'],
        metrics: [
          { label: '基地月营收', value: '¥0' },
          { label: '基地月支出', value: '¥0' }
        ]
      }
    ],
    alerts: [],
    settlementFlow: []
  };
}

function buildEmptySection(section = 'overview') {
  const overview = buildEmptyOverviewSection();
  const map = {
    overview,
    profitSharing: {
      periodLabel: '',
      stats: [],
      anchors: [],
      deductions: []
    },
    procurement: {
      stats: [],
      assets: [],
      requests: [],
      alerts: []
    },
    vendorSettlement: {
      stats: [],
      teachers: [],
      vendors: []
    },
    bossDashboard: {
      stats: [],
      roi: [],
      costBreakdown: [],
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
      pendingProcurements: [],
      pendingCommissions: [],
      frozenCommissions: [],
      alertLogs: []
    }
  };

  return map[section] || overview;
}

function buildEmptyContractReview() {
  return {
    source: 'empty',
    notice: '当前暂无合同审核记录。',
    list: [],
    stats: {
      pending: 0,
      approved: 0,
      rejected: 0,
      all: 0
    }
  };
}

function buildEmptyCommissionLedger() {
  return {
    source: 'empty',
    notice: '当前暂无结算台账记录。',
    list: [],
    stats: {
      totalPending: 0,
      frozenCount: 0,
      frozenCountText: '0笔',
      pendingAmount: 0,
      pendingAmountText: '¥0',
      paidAmount: 0,
      paidAmountText: '¥0',
      totalAmount: 0,
      totalAmountText: '¥0'
    }
  };
}

export async function getFinanceSection(section = 'overview') {
  const token = getFinanceToken();
  if (!token) {
    return buildEmptySection(section);
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getFinanceDashboard',
        data: { section },
        token
      }
    });

    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.error || '获取财务数据失败');
    }

    return result.data?.[section] || buildEmptySection(section);
  } catch (error) {
    console.warn('[finance-api] 获取财务数据失败，返回空态:', error);
    return buildEmptySection(section);
  }
}

export async function getFinanceContractReviewList() {
  const token = getFinanceToken();
  if (!token) {
    return buildEmptyContractReview();
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getFinanceContractReviewList',
        data: {},
        token
      }
    });

    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.error || '获取合同审核列表失败');
    }

    return {
      source: 'cloud',
      notice: '',
      ...(result.data || buildEmptyContractReview())
    };
  } catch (error) {
    console.warn('[finance-api] 获取合同审核失败，返回空态:', error);
    return buildEmptyContractReview();
  }
}

export async function getFinanceCommissionLedger() {
  const token = getFinanceToken();
  if (!token) {
    return buildEmptyCommissionLedger();
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action: 'getFinanceCommissionLedger',
        data: {},
        token
      }
    });

    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.error || '获取结算台账失败');
    }

    return {
      source: 'cloud',
      notice: '',
      ...(result.data || buildEmptyCommissionLedger())
    };
  } catch (error) {
    console.warn('[finance-api] 获取结算台账失败，返回空态:', error);
    return buildEmptyCommissionLedger();
  }
}

export async function confirmFinanceCommissionPayment(candidateId) {
  const token = getFinanceToken();
  if (!token) {
    throw new Error('登录已失效，请重新登录');
  }

  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const res = await wx.cloud.callFunction({
    name: 'admin',
    data: {
      action: 'confirmFinanceCommissionPayment',
      data: { candidateId },
      token
    }
  });

  const result = res.result || {};
  if (!result.success) {
    throw new Error(result.error || '确认支付失败');
  }

  return result;
}

export async function sendFinanceCommissionPayslip(candidateId) {
  const token = getFinanceToken();
  if (!token) {
    throw new Error('登录已失效，请重新登录');
  }

  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const res = await wx.cloud.callFunction({
    name: 'admin',
    data: {
      action: 'sendFinanceCommissionPayslip',
      data: { candidateId },
      token
    }
  });

  const result = res.result || {};
  if (!result.success) {
    throw new Error(result.error || '发送电子工资条失败');
  }

  return result;
}
