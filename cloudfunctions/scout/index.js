// 云函数入口文件 - 星探管理（直营模式：rookie/special/partner三级扁平）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 等级配置
const SCOUT_GRADES = {
  rookie: { zh: '新锐星探', upgradeAt: 0 },
  special: { zh: '特约星探', upgradeAt: 2 },
  partner: { zh: '合伙人星探', upgradeAt: 5 }
};

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  console.log('[scout] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'apply':
        return await applyScout(openId, data);
      case 'getMyInfo':
        return await getScoutInfo(openId);
      case 'getMyReferrals':
        return await getMyReferrals(openId, data);
      case 'getStats':
        return await getScoutStats(openId);
      case 'checkShareCode':
        return await checkShareCode(data.shareCode);
      case 'getAllScouts':
        return await getAllScouts(data);
      case 'getScoutDetail':
        return await getScoutDetail(data.scoutId);
      case 'reviewScout':
        return await reviewScout(data);
      case 'checkAndUpgradeGrade':
        await checkAndUpgradeGrade(data.scoutId);
        return { success: true };
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (error) {
    console.error('[scout] 错误:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

// 生成推荐码（SC-EXT-YYYYMMDD-XXXX格式）
function generateShareCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SC-EXT-${y}${m}${d}-${suffix}`;
}

// 申请成为星探
async function applyScout(openId, data) {
  // 1. 检查是否已经申请/注册过（排除已删除的记录）
  const existRes = await db.collection('scouts').where({
    openId: openId,
    status: _.neq('deleted')
  }).get();

  if (existRes.data.length > 0) {
    const existing = existRes.data[0];
    if (existing.status === 'rejected') {
      // 被拒绝的可以重新申请，删除旧记录
      await db.collection('scouts').doc(existing._id).remove();
    } else {
      return {
        success: false,
        error: existing.status === 'pending' ? '您的申请正在审核中' : '您已经注册过了',
        scout: existing
      };
    }
  }

  // 2. 表单验证
  const { name, phone, idCard, wechat, reason } = data || {};

  if (!name || !name.trim()) {
    return { success: false, error: '请输入姓名' };
  }
  if (!phone || !phone.trim()) {
    return { success: false, error: '请输入手机号' };
  }
  if (!idCard || !idCard.trim()) {
    return { success: false, error: '请输入身份证号' };
  }
  // 18位身份证简单校验
  if (!/^\d{17}[\dXx]$/.test(idCard.trim())) {
    return { success: false, error: '身份证号格式不正确' };
  }
  if (!reason || !reason.trim()) {
    return { success: false, error: '请填写申请理由' };
  }

  // 3. 生成唯一推荐码
  let shareCode = '';
  let retryCount = 0;
  while (retryCount < 10) {
    shareCode = generateShareCode();
    const codeCheckRes = await db.collection('scouts').where({
      shareCode: shareCode
    }).get();

    if (codeCheckRes.data.length === 0) {
      break;
    }
    retryCount++;
  }

  if (retryCount >= 10) {
    return { success: false, error: '生成推荐码失败，请重试' };
  }

  // 4. 创建星探记录
  const scoutData = {
    openId: openId,
    profile: {
      name: name.trim(),
      phone: phone.trim(),
      idCard: idCard.trim(),
      wechat: (wechat || '').trim()
    },
    grade: 'rookie',
    status: 'pending',
    application: {
      reason: reason.trim(),
      appliedAt: db.serverDate()
    },
    shareCode: shareCode,
    stats: {
      referredCount: 0,
      signedCount: 0,
      totalCommission: 0,
      paidCommission: 0
    },
    gradeHistory: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const createRes = await db.collection('scouts').add({
    data: scoutData
  });

  return {
    success: true,
    scoutId: createRes._id,
    shareCode: shareCode,
    message: '申请已提交，等待审核'
  };
}

// 审核星探申请
async function reviewScout(data) {
  const { scoutId, approved, reviewNote } = data || {};

  if (!scoutId) {
    return { success: false, error: '缺少星探ID' };
  }

  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  const scout = scoutRes.data;
  if (scout.status !== 'pending') {
    return { success: false, error: '该星探不在待审核状态' };
  }

  const updateData = {
    updatedAt: db.serverDate(),
    'application.reviewedAt': db.serverDate(),
    'application.reviewNote': reviewNote || ''
  };

  if (approved) {
    updateData.status = 'active';
  } else {
    updateData.status = 'rejected';
  }

  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });

  return {
    success: true,
    message: approved ? '审核通过' : '已拒绝申请'
  };
}

// 检查并自动升级星探等级
async function checkAndUpgradeGrade(scoutId) {
  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) return;

  const scout = scoutRes.data;
  const signedCount = scout.stats?.signedCount || 0;
  const currentGrade = scout.grade || 'rookie';

  let newGrade = null;

  // 支持跳级：先检查最高等级，再检查次高等级
  if (currentGrade !== 'partner' && signedCount >= SCOUT_GRADES.partner.upgradeAt) {
    newGrade = 'partner';
  } else if (currentGrade === 'rookie' && signedCount >= SCOUT_GRADES.special.upgradeAt) {
    newGrade = 'special';
  }

  if (newGrade) {
    await db.collection('scouts').doc(scoutId).update({
      data: {
        grade: newGrade,
        gradeHistory: _.push({
          from: currentGrade,
          to: newGrade,
          reason: `签约数达到 ${signedCount}，自动升级`,
          upgradedAt: db.serverDate()
        }),
        updatedAt: db.serverDate()
      }
    });

    console.log(`[scout] 星探 ${scoutId} 自动升级: ${currentGrade} → ${newGrade}`);
  }
}

// 获取星探信息（排除已删除）
async function getScoutInfo(openId) {
  const res = await db.collection('scouts').where({
    openId: openId,
    status: _.neq('deleted')
  }).get();

  if (res.data.length === 0) {
    return {
      success: false,
      error: '未找到星探信息',
      isRegistered: false
    };
  }

  return {
    success: true,
    isRegistered: true,
    scout: res.data[0]
  };
}

// 获取我推荐的候选人列表
async function getMyReferrals(openId, data) {
  const scoutRes = await db.collection('scouts').where({
    openId: openId
  }).get();

  if (scoutRes.data.length === 0) {
    return { success: false, error: '未找到星探信息' };
  }

  const scout = scoutRes.data[0];

  let query = db.collection('candidates').where({
    'referral.scoutId': scout._id
  });

  if (data && data.status && data.status !== 'all') {
    query = db.collection('candidates').where({
      'referral.scoutId': scout._id,
      status: data.status
    });
  }

  const candidatesRes = await query
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    referrals: candidatesRes.data,
    total: candidatesRes.data.length
  };
}

// 获取星探统计数据
async function getScoutStats(openId) {
  const scoutRes = await db.collection('scouts').where({
    openId: openId
  }).get();

  if (scoutRes.data.length === 0) {
    return { success: false, error: '未找到星探信息' };
  }

  return {
    success: true,
    stats: scoutRes.data[0].stats
  };
}

// 验证推荐码是否存在（同时支持旧格式6位和新格式SC-EXT-...）
async function checkShareCode(shareCode) {
  const res = await db.collection('scouts').where({
    shareCode: shareCode,
    status: 'active'
  }).get();

  return {
    success: true,
    exists: res.data.length > 0,
    scout: res.data.length > 0 ? res.data[0] : null
  };
}

// 获取所有星探列表（管理后台使用）
async function getAllScouts(data) {
  const { page = 1, pageSize = 20, status, keyword } = data || {};

  const conditions = {};
  if (status && status !== 'all') {
    conditions.status = status;
  }
  if (keyword) {
    conditions['profile.name'] = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  let query = db.collection('scouts');
  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions);
  }

  const countRes = await query.count();
  const total = countRes.total;

  const skip = (page - 1) * pageSize;
  const res = await query
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return {
    success: true,
    data: {
      list: res.data,
      total,
      page,
      pageSize
    }
  };
}

// 获取星探详情（管理后台使用）
async function getScoutDetail(scoutId) {
  const scoutRes = await db.collection('scouts').doc(scoutId).get();

  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  const candidatesRes = await db.collection('candidates').where({
    'referral.scoutId': scoutId
  }).get();

  return {
    success: true,
    scout: scoutRes.data,
    referrals: candidatesRes.data
  };
}

// 导出供其他云函数调用
module.exports.checkAndUpgradeGrade = checkAndUpgradeGrade;
