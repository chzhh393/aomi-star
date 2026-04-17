// 云函数入口文件 - 星探管理（直营模式：rookie/special/partner三级扁平）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

function sanitizeNonNegativeAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

function generateAceInviteCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ACE-${y}${m}${d}-${suffix}`;
}

// 等级配置
const SCOUT_GRADES = {
  rookie: { zh: '新锐星探', upgradeAt: 0 },
  special: { zh: '特约星探', upgradeAt: 2 },
  partner: { zh: '合伙人星探', upgradeAt: 5 }
};

function maskIdCard(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}********${normalized.slice(-4)}`;
}

function sanitizeScoutProfile(scout = {}) {
  const idCardMasked = maskIdCard(scout.profile?.idCard);
  return {
    _id: scout._id || '',
    status: scout.status || '',
    grade: scout.grade || 'rookie',
    shareCode: scout.shareCode || '',
    name: scout.profile?.name || '',
    phone: scout.profile?.phone || '',
    createdAt: scout.createdAt || null,
    profile: {
      name: scout.profile?.name || '',
      phone: scout.profile?.phone || '',
      wechat: scout.profile?.wechat || '',
      idCard: idCardMasked,
      idCardMasked
    },
    stats: scout.stats || {}
  };
}

function maskScoutSensitiveProfile(scout = {}) {
  const profile = scout && typeof scout.profile === 'object' && scout.profile
    ? scout.profile
    : {};
  const idCardMasked = maskIdCard(profile.idCard);

  return {
    ...scout,
    profile: {
      ...profile,
      idCard: idCardMasked,
      idCardMasked
    }
  };
}

async function getDirectSubScouts(scoutId) {
  if (!scoutId) return [];

  const res = await db.collection('scouts').where({
    'parentScout.scoutId': scoutId,
    status: _.neq('deleted')
  }).orderBy('createdAt', 'desc').get();

  return Array.isArray(res.data) ? res.data : [];
}

function buildTeamStats(subScouts = []) {
  return subScouts.reduce((result, item) => {
    result.totalSubScouts += 1;
    if (item.status === 'active') result.activeSubScouts += 1;
    if (item.status === 'pending') result.pendingSubScouts += 1;
    if (item.status === 'rejected') result.rejectedSubScouts += 1;
    result.totalReferrals += Number(item.stats?.referredCount || 0);
    result.totalSigned += Number(item.stats?.signedCount || 0);
    result.totalCommission += Number(item.stats?.totalCommission || 0);
    return result;
  }, {
    totalSubScouts: 0,
    activeSubScouts: 0,
    pendingSubScouts: 0,
    rejectedSubScouts: 0,
    totalReferrals: 0,
    totalSigned: 0,
    totalCommission: 0
  });
}

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  console.log('[scout] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'generateAceInvite':
        return await generateAceInvite(openId, data);
      case 'getAceInvite':
        return await getAceInvite(data);
      case 'apply':
        return await applyScout(openId, data);
      case 'getMyInfo':
        return await getScoutInfo(openId);
      case 'getMyTeam':
        return await getMyTeam(openId);
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
  const {
    name,
    phone,
    idCard,
    wechat,
    reason,
    parentScoutId = '',
    parentScoutName = '',
    parentShareCode = '',
    invitePlan = null,
    inviteCode = ''
  } = data || {};

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

  let parentScout = null;
  let normalizedInvitePlan = null;
  let aceInviteRecord = null;

  if (inviteCode) {
    const inviteRes = await db.collection('scout_invites').where({
      inviteCode: inviteCode.trim(),
      status: 'active',
      type: 'ace'
    }).limit(1).get();

    aceInviteRecord = inviteRes.data[0] || null;
    if (!aceInviteRecord) {
      return { success: false, error: '专属邀请码不存在或已失效' };
    }

    const targetScoutRes = await db.collection('scouts').doc(aceInviteRecord.targetScoutId).get().catch(() => null);
    if (!targetScoutRes?.data || targetScoutRes.data.status !== 'active') {
      return { success: false, error: '邀请码对应的星探合伙人不可用' };
    }
    if (targetScoutRes.data.openId === openId) {
      return { success: false, error: '不能使用自己的专属邀请码申请' };
    }

    parentScout = {
      scoutId: targetScoutRes.data._id,
      scoutName: targetScoutRes.data.profile?.name || '',
      shareCode: targetScoutRes.data.shareCode || '',
      boundAt: db.serverDate()
    };
    normalizedInvitePlan = {
      role: 'ace',
      title: aceInviteRecord.plan?.title || '王牌星探招募方案',
      signingAward: sanitizeNonNegativeAmount(aceInviteRecord.plan?.signingAward),
      levelAwards: {
        S: sanitizeNonNegativeAmount(aceInviteRecord.plan?.levelAwards?.S),
        A: sanitizeNonNegativeAmount(aceInviteRecord.plan?.levelAwards?.A),
        B: sanitizeNonNegativeAmount(aceInviteRecord.plan?.levelAwards?.B)
      },
      inviteCode: aceInviteRecord.inviteCode,
      sourceScoutId: aceInviteRecord.targetScoutId,
      createdAt: aceInviteRecord.createdAt || db.serverDate()
    };
  } else if (parentScoutId) {
    const parentRes = await db.collection('scouts').doc(parentScoutId).get().catch(() => null);
    if (!parentRes?.data || parentRes.data.status !== 'active') {
      return { success: false, error: '上级星探不存在或状态不可用' };
    }
    if (parentRes.data.openId === openId) {
      return { success: false, error: '不能绑定自己为上级星探' };
    }

    parentScout = {
      scoutId: parentRes.data._id,
      scoutName: parentRes.data.profile?.name || parentScoutName || '',
      shareCode: parentRes.data.shareCode || parentShareCode || '',
      boundAt: db.serverDate()
    };

    if (invitePlan?.role === 'ace') {
      normalizedInvitePlan = {
        role: 'ace',
        title: '王牌星探招募方案',
        signingAward: sanitizeNonNegativeAmount(invitePlan.signingAward),
        levelAwards: {
          S: sanitizeNonNegativeAmount(invitePlan.levelAwards?.S),
          A: sanitizeNonNegativeAmount(invitePlan.levelAwards?.A),
          B: sanitizeNonNegativeAmount(invitePlan.levelAwards?.B)
        },
        createdAt: db.serverDate()
      };
    }
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
      appliedAt: db.serverDate(),
      invitePlan: normalizedInvitePlan
    },
    parentScout,
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

  if (aceInviteRecord?._id) {
    await db.collection('scout_invites').doc(aceInviteRecord._id).update({
      data: {
        usedCount: _.inc(1),
        lastUsedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
  }

  return {
    success: true,
    scoutId: createRes._id,
    shareCode: shareCode,
    message: '申请已提交，等待审核'
  };
}

async function generateAceInvite(openId, data) {
  const scoutRes = await db.collection('scouts').where({
    openId,
    status: 'active'
  }).limit(1).get();

  if (!scoutRes.data.length) {
    return { success: false, error: '当前账号不是可用星探' };
  }

  const scout = scoutRes.data[0];
  if (scout.grade !== 'partner') {
    return { success: false, error: '仅合伙人星探可生成王牌专属邀请码' };
  }

  const plan = {
    role: 'ace',
    title: '王牌星探招募方案',
    signingAward: sanitizeNonNegativeAmount(data?.signingAward),
    levelAwards: {
      S: sanitizeNonNegativeAmount(data?.levelAwards?.S),
      A: sanitizeNonNegativeAmount(data?.levelAwards?.A),
      B: sanitizeNonNegativeAmount(data?.levelAwards?.B)
    }
  };

  let inviteCode = '';
  let retryCount = 0;
  while (retryCount < 10) {
    inviteCode = generateAceInviteCode();
    const existsRes = await db.collection('scout_invites').where({
      inviteCode
    }).limit(1).get();
    if (!existsRes.data.length) break;
    retryCount++;
  }

  if (!inviteCode || retryCount >= 10) {
    return { success: false, error: '生成专属邀请码失败，请重试' };
  }

  const inviteRecord = {
    type: 'ace',
    status: 'active',
    inviteCode,
    inviterOpenId: openId,
    targetScoutId: scout._id,
    targetScoutName: scout.profile?.name || '',
    targetScoutGrade: scout.grade || 'rookie',
    targetScoutShareCode: scout.shareCode || '',
    plan,
    usedCount: 0,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const createRes = await db.collection('scout_invites').add({
    data: inviteRecord
  });

  return {
    success: true,
    inviteId: createRes._id,
    inviteCode,
    targetScout: {
      scoutId: scout._id,
      name: scout.profile?.name || '',
      grade: scout.grade || 'rookie'
    },
    plan
  };
}

async function getAceInvite(data) {
  const inviteCode = String(data?.inviteCode || '').trim();
  if (!inviteCode) {
    return { success: false, error: '缺少邀请码' };
  }

  const inviteRes = await db.collection('scout_invites').where({
    inviteCode,
    status: 'active',
    type: 'ace'
  }).limit(1).get();

  if (!inviteRes.data.length) {
    return { success: false, error: '邀请码不存在或已失效' };
  }

  const invite = inviteRes.data[0];
  const scoutRes = await db.collection('scouts').doc(invite.targetScoutId).get().catch(() => null);
  if (!scoutRes?.data || scoutRes.data.status !== 'active') {
    return { success: false, error: '邀请码对应的星探合伙人不可用' };
  }

  return {
    success: true,
    invite: {
      inviteCode: invite.inviteCode,
      targetScoutId: invite.targetScoutId,
      targetScoutName: invite.targetScoutName || scoutRes.data.profile?.name || '',
      targetScoutGrade: invite.targetScoutGrade || scoutRes.data.grade || 'rookie',
      targetScoutShareCode: invite.targetScoutShareCode || scoutRes.data.shareCode || '',
      plan: invite.plan || null
    }
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

  const scout = res.data[0];
  const subScouts = await getDirectSubScouts(scout._id);
  const teamStats = buildTeamStats(subScouts);

  return {
    success: true,
    isRegistered: true,
    scout: {
      ...scout,
      teamStats
    },
    subScouts: subScouts.map(sanitizeScoutProfile)
  };
}

async function getMyTeam(openId) {
  const res = await db.collection('scouts').where({
    openId,
    status: _.neq('deleted')
  }).get();

  if (res.data.length === 0) {
    return {
      success: false,
      error: '未找到星探信息'
    };
  }

  const scout = res.data[0];
  const subScouts = await getDirectSubScouts(scout._id);
  const teamStats = buildTeamStats(subScouts);

  return {
    success: true,
    myInfo: {
      _id: scout._id,
      name: scout.profile?.name || '',
      shareCode: scout.shareCode || '',
      grade: scout.grade || 'rookie',
      status: scout.status || ''
    },
    team: {
      directScouts: subScouts.map((item) => sanitizeScoutProfile(item)),
      summary: {
        totalScouts: teamStats.totalSubScouts || 0,
        activeScouts: teamStats.activeSubScouts || 0,
        pendingScouts: teamStats.pendingSubScouts || 0,
        totalReferred: teamStats.totalReferrals || 0,
        totalSigned: teamStats.totalSigned || 0,
        totalCommission: teamStats.totalCommission || 0
      }
    }
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

  const list = await Promise.all((res.data || []).map(async (item) => {
    const subScouts = await getDirectSubScouts(item._id);
    return {
      ...item,
      parentScoutName: item.parentScout?.scoutName || '',
      teamStats: buildTeamStats(subScouts)
    };
  }));

  return {
    success: true,
    data: {
      list: list.map(maskScoutSensitiveProfile),
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

  const scout = scoutRes.data;
  const candidatesRes = await db.collection('candidates').where({
    'referral.scoutId': scoutId
  }).get();
  const subScouts = await getDirectSubScouts(scoutId);
  const teamStats = buildTeamStats(subScouts);
  let teamReferrals = [];

  if (subScouts.length > 0) {
    const subScoutIds = subScouts.map((item) => item._id).filter(Boolean);
    const teamReferralsRes = await db.collection('candidates').where({
      'referral.scoutId': _.in(subScoutIds)
    }).get().catch(() => ({ data: [] }));
    teamReferrals = Array.isArray(teamReferralsRes.data) ? teamReferralsRes.data : [];
  }

  return {
    success: true,
    scout: {
      ...maskScoutSensitiveProfile(scout),
      teamStats
    },
    referrals: candidatesRes.data,
    subScouts: subScouts.map(sanitizeScoutProfile),
    teamReferrals
  };
}

// 导出供其他云函数调用
module.exports.checkAndUpgradeGrade = checkAndUpgradeGrade;
