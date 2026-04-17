// 云函数入口文件 - 星探佣金管理（等级×主播定级矩阵）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 佣金配置 - 星探费（按星探等级 × 主播定级）
// 结算方式：签约阶段先结算300元，开播3个月考核期后根据定级结算剩余
const COMMISSION_CONFIG = {
  // 星探费总额（含签约预付300元）
  SIGN_BONUS: {
    rookie:  { SS: 800,  S: 800,  A: 600,  B: 350 },
    special: { SS: 1200, S: 1200, A: 800,  B: 450 },
    partner: { SS: 1500, S: 1500, A: 1000, B: 500 }
  },
  // SS级额外收益：6个月主播流水的1%（需提供流水截图等凭证）
  SS_BONUS_RATE: 0.01,
  SS_BONUS_MONTHS: 6,
  // 签约预付金额
  SIGN_PREPAY: 300,
  // 主播定级标准（基于开播后3个月考核期的月均流水）
  // SS级：签约前凭历史凭证评定；S/A/B级：考核期后评定
  ANCHOR_LEVEL_CRITERIA: {
    S: 100000,  // 月均流水 > 10万
    A: 50000,   // 月均流水 5万-10万
    B: 0        // 月均流水 ≤ 5万
  },
  // 默认主播定级（未评定时使用）
  DEFAULT_ANCHOR_LEVEL: 'B',
  // 状态
  STATUS: {
    PENDING: 'pending',
    CALCULATED: 'calculated',
    PAID: 'paid'
  }
};

// 云函数入口函数
exports.main = async (event) => {
  const { action, data } = event;

  console.log('[commission] action:', action);

  try {
    switch (action) {
      case 'calculate':
        return await calculateCommission(data.candidateId);
      case 'getCommissionDetail':
        return await getCommissionDetail(data.candidateId);
      case 'getScoutEarnings':
        return await getScoutEarnings(data.scoutId);
      case 'confirmPayment':
        return {
          success: false,
          error: '支付确认入口已迁移，请使用 admin.confirmFinanceCommissionPayment'
        };
      case 'getPendingCommissions':
        return await getPendingCommissions();
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (error) {
    console.error('[commission] 错误:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

// 计算佣金（单一星探，不再链式分成）
async function calculateCommission(candidateId) {
  console.log('[commission] 开始计算佣金, candidateId:', candidateId);

  // 1. 获取候选人信息
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const candidate = candidateRes.data;

  if (candidate.status !== 'signed') {
    return { success: false, error: '候选人未签约，无法计算佣金' };
  }

  if (candidate.commission && candidate.commission.status !== COMMISSION_CONFIG.STATUS.PENDING) {
    return { success: false, error: '该候选人佣金已计算，请勿重复操作' };
  }

  // 2. 检查推荐人（扁平结构，只有 scoutId）
  if (!candidate.referral || !candidate.referral.scoutId) {
    console.log('[commission] 无推荐人，不计算佣金');
    return { success: true, message: '无推荐人，无需计算佣金' };
  }

  // 3. 获取星探信息
  const scoutRes = await db.collection('scouts').doc(candidate.referral.scoutId).get();
  if (!scoutRes.data) {
    console.log('[commission] 推荐星探不存在');
    return { success: false, error: '推荐星探不存在' };
  }

  const scout = scoutRes.data;
  const scoutGrade = scout.grade || 'rookie';

  // 4. 确定主播定级（从面试打分结果中获取）
  let anchorLevel = COMMISSION_CONFIG.DEFAULT_ANCHOR_LEVEL;
  const scoreResult = candidate.interview?.score?.result;
  if (scoreResult) {
    const levelMap = { pass_ss: 'SS', pass_s: 'S', pass_a: 'A', pass_b: 'B' };
    anchorLevel = levelMap[scoreResult] || COMMISSION_CONFIG.DEFAULT_ANCHOR_LEVEL;
  }
  if (!scoreResult || !['SS', 'S', 'A', 'B'].includes(anchorLevel)) {
    console.warn(`[commission] 候选人 ${candidateId} 无有效面试评分(result=${scoreResult})，使用默认定级 ${COMMISSION_CONFIG.DEFAULT_ANCHOR_LEVEL}`);
    anchorLevel = COMMISSION_CONFIG.DEFAULT_ANCHOR_LEVEL;
  }

  // 5. 查表获得签约奖金
  const gradeConfig = COMMISSION_CONFIG.SIGN_BONUS[scoutGrade];
  if (!gradeConfig) {
    return { success: false, error: `未知的星探等级: ${scoutGrade}` };
  }
  const bonusAmount = gradeConfig[anchorLevel] || gradeConfig['B'];

  // 6. 构建分账（单一星探，100%）
  const distribution = [{
    scoutId: scout._id,
    scoutName: scout.profile?.name || '-',
    scoutGrade: scoutGrade,
    amount: bonusAmount,
    percentage: 100,
    status: COMMISSION_CONFIG.STATUS.PENDING,
    type: 'direct'
  }];

  // 7. 更新候选人佣金信息
  await db.collection('candidates').doc(candidateId).update({
    data: {
      commission: {
        status: COMMISSION_CONFIG.STATUS.CALCULATED,
        totalAmount: bonusAmount,
        anchorLevel: anchorLevel,
        scoutGrade: scoutGrade,
        signedAt: candidate.updatedAt || db.serverDate(),
        calculatedAt: db.serverDate(),
        paidAt: null,
        distribution: distribution
      }
    }
  });

  // 8. 更新星探收益统计
  try {
    await db.collection('scouts').doc(scout._id).update({
      data: {
        'stats.totalCommission': _.inc(bonusAmount),
        updatedAt: db.serverDate()
      }
    });
    console.log('[commission] 星探收益已更新:', scout.profile?.name, bonusAmount);
  } catch (error) {
    console.error('[commission] 更新星探收益失败:', error);
  }

  console.log('[commission] 佣金计算完成, 金额:', bonusAmount, '等级:', scoutGrade, '定级:', anchorLevel);
  return {
    success: true,
    message: '佣金计算成功',
    data: {
      totalAmount: bonusAmount,
      scoutGrade: scoutGrade,
      anchorLevel: anchorLevel,
      distribution: distribution
    }
  };
}

// 获取佣金详情
async function getCommissionDetail(candidateId) {
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  return {
    success: true,
    commission: candidateRes.data.commission || null
  };
}

// 获取星探收益信息（直接按 referral.scoutId 查询）
async function getScoutEarnings(scoutId) {
  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  // 获取该星探直接推荐的所有有佣金的候选人
  const candidatesRes = await db.collection('candidates')
    .where({
      'referral.scoutId': scoutId,
      'commission.status': _.neq(null)
    })
    .get();

  // 提取佣金明细
  const commissionDetails = [];
  for (const candidate of candidatesRes.data) {
    if (candidate.commission && candidate.commission.distribution) {
      const myCommission = candidate.commission.distribution.find(d => d.scoutId === scoutId);
      if (myCommission) {
        commissionDetails.push({
          candidateId: candidate._id,
          candidateName: candidate.basicInfo?.name || '-',
          amount: myCommission.amount,
          anchorLevel: candidate.commission.anchorLevel || '-',
          status: myCommission.status,
          calculatedAt: candidate.commission.calculatedAt,
          paidAt: candidate.commission.paidAt
        });
      }
    }
  }

  const stats = scoutRes.data.stats || {};

  return {
    success: true,
    earnings: {
      totalCommission: stats.totalCommission || 0,
      paidCommission: stats.paidCommission || 0,
      pendingCommission: (stats.totalCommission || 0) - (stats.paidCommission || 0)
    },
    commissionDetails: commissionDetails
  };
}

// 获取待支付的佣金列表
async function getPendingCommissions() {
  const candidatesRes = await db.collection('candidates')
    .where({
      'commission.status': COMMISSION_CONFIG.STATUS.CALCULATED
    })
    .get();

  const pendingList = candidatesRes.data.map(candidate => ({
    candidateId: candidate._id,
    candidateName: candidate.basicInfo?.name || '-',
    totalAmount: candidate.commission.totalAmount,
    scoutGrade: candidate.commission.scoutGrade,
    anchorLevel: candidate.commission.anchorLevel,
    distribution: candidate.commission.distribution,
    calculatedAt: candidate.commission.calculatedAt
  }));

  return {
    success: true,
    data: pendingList,
    total: pendingList.length
  };
}
