// 云函数入口文件 - 星探分账管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 分账配置
const COMMISSION_CONFIG = {
  // 固定奖励金额
  SIGNED_BONUS: 1000,        // 签约奖励：1000元
  
  // 分账比例
  LEVEL2_PERCENTAGE: 70,     // 二级星探：70%
  LEVEL1_PERCENTAGE: 30,     // 一级星探：30%（团队管理费）
  
  // 状态
  STATUS: {
    PENDING: 'pending',      // 待结算
    CALCULATED: 'calculated', // 已计算
    PAID: 'paid'             // 已支付
  }
};

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
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
        return await confirmPayment(data.candidateId);
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

// 计算分账
async function calculateCommission(candidateId) {
  console.log('[commission] 开始计算分账, candidateId:', candidateId);

  // 获取候选人信息
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const candidate = candidateRes.data;

  // 检查是否已签约
  if (candidate.status !== 'signed') {
    return { success: false, error: '候选人未签约，无法计算分账' };
  }

  // 检查是否已经计算过
  if (candidate.commission && candidate.commission.status !== COMMISSION_CONFIG.STATUS.PENDING) {
    return { success: false, error: '该候选人分账已计算，请勿重复操作' };
  }

  // 检查是否有推荐人
  if (!candidate.referral || !candidate.referral.scoutChain || candidate.referral.scoutChain.length === 0) {
    console.log('[commission] 无推荐人，不计算分账');
    return { success: true, message: '无推荐人，无需分账' };
  }

  const TOTAL_BONUS = COMMISSION_CONFIG.SIGNED_BONUS;
  const referral = candidate.referral;
  let distribution = [];

  // 根据推荐链条长度决定分账方式
  if (referral.scoutChain.length === 1) {
    // 场景1：一级星探直接推荐 - 100%给一级星探
    console.log('[commission] 一级星探直接推荐');
    distribution.push({
      scoutId: referral.scoutChain[0],
      scoutName: referral.scoutChainNames[0],
      level: 1,
      amount: TOTAL_BONUS,
      percentage: 100,
      status: COMMISSION_CONFIG.STATUS.PENDING,
      type: 'direct'  // 直接推荐
    });
  } else if (referral.scoutChain.length === 2) {
    // 场景2：二级星探推荐 - 70%二级 + 30%一级
    console.log('[commission] 二级星探推荐');
    
    // 二级星探（直接推荐人）
    distribution.push({
      scoutId: referral.scoutChain[1],
      scoutName: referral.scoutChainNames[1],
      level: 2,
      amount: TOTAL_BONUS * COMMISSION_CONFIG.LEVEL2_PERCENTAGE / 100,
      percentage: COMMISSION_CONFIG.LEVEL2_PERCENTAGE,
      status: COMMISSION_CONFIG.STATUS.PENDING,
      type: 'direct'  // 直接推荐
    });
    
    // 一级星探（团队管理）
    distribution.push({
      scoutId: referral.scoutChain[0],
      scoutName: referral.scoutChainNames[0],
      level: 1,
      amount: TOTAL_BONUS * COMMISSION_CONFIG.LEVEL1_PERCENTAGE / 100,
      percentage: COMMISSION_CONFIG.LEVEL1_PERCENTAGE,
      status: COMMISSION_CONFIG.STATUS.PENDING,
      type: 'team'  // 团队管理费
    });
  }

  // 更新候选人分账信息
  await db.collection('candidates').doc(candidateId).update({
    data: {
      commission: {
        status: COMMISSION_CONFIG.STATUS.CALCULATED,
        totalAmount: TOTAL_BONUS,
        signedAt: candidate.updatedAt || db.serverDate(),
        calculatedAt: db.serverDate(),
        paidAt: null,
        distribution: distribution
      }
    }
  });

  // 更新星探收益统计
  for (const item of distribution) {
    try {
      // 获取星探当前收益数据
      const scoutRes = await db.collection('scouts').doc(item.scoutId).get();
      const scout = scoutRes.data;

      const currentEarnings = scout.earnings || {
        totalEarned: 0,
        pendingAmount: 0,
        paidAmount: 0,
        fromDirect: 0,
        fromTeam: 0
      };

      // 更新收益
      const updatedEarnings = {
        totalEarned: currentEarnings.totalEarned + item.amount,
        pendingAmount: currentEarnings.pendingAmount + item.amount,
        paidAmount: currentEarnings.paidAmount,
        fromDirect: item.type === 'direct' ? currentEarnings.fromDirect + item.amount : currentEarnings.fromDirect,
        fromTeam: item.type === 'team' ? currentEarnings.fromTeam + item.amount : currentEarnings.fromTeam
      };

      await db.collection('scouts').doc(item.scoutId).update({
        data: {
          earnings: updatedEarnings,
          updatedAt: db.serverDate()
        }
      });

      console.log('[commission] 星探收益已更新:', item.scoutName, item.amount);
    } catch (error) {
      console.error('[commission] 更新星探收益失败:', item.scoutName, error);
    }
  }

  console.log('[commission] 分账计算完成, 总金额:', TOTAL_BONUS);
  return {
    success: true,
    message: '分账计算成功',
    data: {
      totalAmount: TOTAL_BONUS,
      distribution: distribution
    }
  };
}

// 获取分账详情
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

// 获取星探收益信息
async function getScoutEarnings(scoutId) {
  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  // 获取该星探相关的所有分账记录
  const candidatesRes = await db.collection('candidates')
    .where({
      'referral.scoutChain': scoutId,
      'commission.status': _.neq(null)
    })
    .get();

  // 提取该星探的分账明细
  const commissionDetails = [];
  for (const candidate of candidatesRes.data) {
    if (candidate.commission && candidate.commission.distribution) {
      const myCommission = candidate.commission.distribution.find(d => d.scoutId === scoutId);
      if (myCommission) {
        commissionDetails.push({
          candidateId: candidate._id,
          candidateName: candidate.basicInfo?.name || '-',
          amount: myCommission.amount,
          percentage: myCommission.percentage,
          type: myCommission.type,
          status: myCommission.status,
          calculatedAt: candidate.commission.calculatedAt,
          paidAt: candidate.commission.paidAt
        });
      }
    }
  }

  return {
    success: true,
    earnings: scoutRes.data.earnings || {
      totalEarned: 0,
      pendingAmount: 0,
      paidAmount: 0,
      fromDirect: 0,
      fromTeam: 0
    },
    commissionDetails: commissionDetails
  };
}

// 确认支付
async function confirmPayment(candidateId) {
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const candidate = candidateRes.data;
  if (!candidate.commission || candidate.commission.status !== COMMISSION_CONFIG.STATUS.CALCULATED) {
    return { success: false, error: '分账未计算或已支付' };
  }

  // 更新候选人分账状态
  await db.collection('candidates').doc(candidateId).update({
    data: {
      'commission.status': COMMISSION_CONFIG.STATUS.PAID,
      'commission.paidAt': db.serverDate()
    }
  });

  // 更新星探收益状态
  for (const item of candidate.commission.distribution) {
    const scoutRes = await db.collection('scouts').doc(item.scoutId).get();
    const scout = scoutRes.data;
    const earnings = scout.earnings || {};

    await db.collection('scouts').doc(item.scoutId).update({
      data: {
        'earnings.pendingAmount': (earnings.pendingAmount || 0) - item.amount,
        'earnings.paidAmount': (earnings.paidAmount || 0) + item.amount,
        updatedAt: db.serverDate()
      }
    });
  }

  return {
    success: true,
    message: '支付确认成功'
  };
}

// 获取待支付的分账列表
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
    distribution: candidate.commission.distribution,
    calculatedAt: candidate.commission.calculatedAt
  }));

  return {
    success: true,
    data: pendingList,
    total: pendingList.length
  };
}
