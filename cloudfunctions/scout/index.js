// 云函数入口文件 - 星探管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  console.log('[scout] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'register':
        return await registerScout(openId, data);
      case 'getMyInfo':
        return await getScoutInfo(openId);
      case 'getMyReferrals':
        return await getMyReferrals(openId, data);
      case 'getStats':
        return await getScoutStats(openId);
      case 'checkShareCode':
        return await checkShareCode(data.shareCode);
      case 'verifyInviteCode':
        return await verifyInviteCode(data.inviteCode);
      case 'getMyTeam':
        return await getMyTeam(openId);
      case 'getAllScouts':
        return await getAllScouts(data);
      case 'getScoutDetail':
        return await getScoutDetail(data.scoutId);
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

// 生成唯一推荐码（6位字母数字）
function generateShareCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 生成唯一邀请码（用于邀请下级星探，6位字母数字，INV前缀）
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 注册星探
async function registerScout(openId, data) {
  // 检查是否已经注册过
  const existRes = await db.collection('scouts').where({
    openId: openId
  }).get();

  if (existRes.data.length > 0) {
    return {
      success: false,
      error: '您已经注册过了',
      scout: existRes.data[0]
    };
  }

  // 处理邀请码（用于成为二级星探）
  const { inviteCode } = data;
  let parentScout = null;
  let level = { depth: 1, parentScoutId: null, parentScoutName: '', parentInviteCode: '' };

  // 如果提供了邀请码
  if (inviteCode && inviteCode.trim()) {
    // 验证邀请码
    const parentRes = await db.collection('scouts').where({
      inviteCode: inviteCode,
      status: 'active'
    }).get();

    if (parentRes.data.length === 0) {
      return {
        success: false,
        error: '邀请码无效或已失效'
      };
    }

    parentScout = parentRes.data[0];

    // 检查上级是否已经是二级星探（只支持两级）
    if (parentScout.level && parentScout.level.depth >= 2) {
      return {
        success: false,
        error: '该星探已是二级星探，无法继续邀请下级'
      };
    }

    // 设置层级信息
    level = {
      depth: (parentScout.level?.depth || 1) + 1,
      parentScoutId: parentScout._id,
      parentScoutName: parentScout.profile.name,
      parentInviteCode: inviteCode
    };
  }

  // 生成唯一推荐码（用于推荐候选人）
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
    return {
      success: false,
      error: '生成推荐码失败，请重试'
    };
  }

  // 生成邀请码（用于邀请下级星探，只有一级星探才能邀请）
  let newInviteCode = '';
  if (level.depth === 1) {
    retryCount = 0;
    while (retryCount < 10) {
      newInviteCode = generateInviteCode();
      const inviteCheckRes = await db.collection('scouts').where({
        inviteCode: newInviteCode
      }).get();

      if (inviteCheckRes.data.length === 0) {
        break;
      }
      retryCount++;
    }

    if (retryCount >= 10) {
      return {
        success: false,
        error: '生成邀请码失败，请重试'
      };
    }
  }

  // 创建星探记录
  const scoutData = {
    openId: openId,
    profile: {
      name: data.name || '',
      phone: data.phone || '',
      wechat: data.wechat || ''
    },
    shareCode: shareCode,
    inviteCode: newInviteCode || null,
    level: level,
    team: {
      directScouts: 0,
      totalReferred: 0,
      totalSigned: 0
    },
    stats: {
      totalReferred: 0,
      pendingCount: 0,
      approvedCount: 0,
      signedCount: 0,
      rejectedCount: 0
    },
    status: 'active',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const createRes = await db.collection('scouts').add({
    data: scoutData
  });

  // 如果有上级，更新上级的团队统计
  if (parentScout) {
    await db.collection('scouts').doc(parentScout._id).update({
      data: {
        'team.directScouts': _.inc(1),
        updatedAt: db.serverDate()
      }
    });
  }

  return {
    success: true,
    scoutId: createRes._id,
    shareCode: shareCode,
    inviteCode: newInviteCode || null,
    level: level,
    message: '注册成功'
  };
}

// 获取星探信息
async function getScoutInfo(openId) {
  const res = await db.collection('scouts').where({
    openId: openId
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
  // 先获取星探信息
  const scoutRes = await db.collection('scouts').where({
    openId: openId
  }).get();

  if (scoutRes.data.length === 0) {
    return {
      success: false,
      error: '未找到星探信息'
    };
  }

  const scout = scoutRes.data[0];

  // 构建查询条件
  let query = db.collection('candidates').where({
    'referral.scoutId': scout._id
  });

  // 如果有状态筛选
  if (data && data.status && data.status !== 'all') {
    query = query.where({
      'referral.scoutId': scout._id,
      status: data.status
    });
  }

  // 获取推荐的候选人列表
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
    return {
      success: false,
      error: '未找到星探信息'
    };
  }

  const scout = scoutRes.data[0];

  return {
    success: true,
    stats: scout.stats
  };
}

// 验证推荐码是否存在
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

// 验证邀请码（用于注册时验证）
async function verifyInviteCode(inviteCode) {
  if (!inviteCode || !inviteCode.trim()) {
    return {
      success: false,
      error: '请输入邀请码'
    };
  }

  const res = await db.collection('scouts').where({
    inviteCode: inviteCode,
    status: 'active'
  }).get();

  if (res.data.length === 0) {
    return {
      success: false,
      valid: false,
      error: '邀请码不存在或已失效'
    };
  }

  const scout = res.data[0];

  // 检查是否已经是二级星探（只支持两级）
  if (scout.level && scout.level.depth >= 2) {
    return {
      success: false,
      valid: false,
      error: '该星探已是二级星探，无法继续邀请下级'
    };
  }

  return {
    success: true,
    valid: true,
    scout: {
      name: scout.profile.name,
      phone: scout.profile.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      level: scout.level || { depth: 1 }
    },
    nextLevel: (scout.level?.depth || 1) + 1
  };
}

// 获取我的团队信息
async function getMyTeam(openId) {
  // 获取当前星探信息
  const scoutRes = await db.collection('scouts').where({
    openId: openId
  }).get();

  if (scoutRes.data.length === 0) {
    return {
      success: false,
      error: '未找到星探信息'
    };
  }

  const myScout = scoutRes.data[0];

  // 只有一级星探才能查看团队
  if (myScout.level && myScout.level.depth > 1) {
    return {
      success: true,
      myInfo: {
        scoutId: myScout._id,
        name: myScout.profile.name,
        level: myScout.level,
        shareCode: myScout.shareCode,
        inviteCode: null // 二级星探没有邀请码
      },
      team: {
        directScouts: [],
        summary: {
          totalScouts: 0,
          totalReferred: 0,
          totalSigned: 0
        }
      },
      message: '二级星探暂不支持查看团队'
    };
  }

  // 查询所有下级星探（二级）
  const subScoutsRes = await db.collection('scouts').where({
    'level.parentScoutId': myScout._id
  }).get();

  // 统计团队数据
  let totalReferred = 0;
  let totalSigned = 0;

  const directScouts = subScoutsRes.data.map(scout => {
    totalReferred += scout.stats?.totalReferred || 0;
    totalSigned += scout.stats?.signedCount || 0;

    return {
      scoutId: scout._id,
      name: scout.profile.name,
      phone: scout.profile.phone,
      level: scout.level,
      stats: {
        totalReferred: scout.stats?.totalReferred || 0,
        signedCount: scout.stats?.signedCount || 0
      },
      createdAt: scout.createdAt
    };
  });

  return {
    success: true,
    myInfo: {
      scoutId: myScout._id,
      name: myScout.profile.name,
      level: myScout.level || { depth: 1 },
      shareCode: myScout.shareCode,
      inviteCode: myScout.inviteCode
    },
    team: {
      directScouts: directScouts,
      summary: {
        totalScouts: directScouts.length,
        totalReferred: totalReferred + (myScout.stats?.totalReferred || 0),
        totalSigned: totalSigned + (myScout.stats?.signedCount || 0)
      }
    }
  };
}

// 获取所有星探列表（管理后台使用）
async function getAllScouts(data) {
  const { page = 1, pageSize = 20 } = data || {};

  // 获取总数
  const countRes = await db.collection('scouts').count();
  const total = countRes.total;

  // 分页查询
  const skip = (page - 1) * pageSize;
  const res = await db.collection('scouts')
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
  // 获取星探信息
  const scoutRes = await db.collection('scouts').doc(scoutId).get();

  if (!scoutRes.data) {
    return {
      success: false,
      error: '星探不存在'
    };
  }

  // 获取该星探推荐的所有候选人
  const candidatesRes = await db.collection('candidates').where({
    'referral.scoutId': scoutId
  }).get();

  return {
    success: true,
    scout: scoutRes.data,
    referrals: candidatesRes.data
  };
}

// 更新星探统计数据（由 candidate 云函数调用）
async function updateScoutStats(scoutId, statusChange) {
  const updateData = {
    updatedAt: db.serverDate()
  };

  // 根据状态变化更新统计
  if (statusChange.from === null && statusChange.to === 'pending') {
    // 新报名
    updateData['stats.totalReferred'] = _.inc(1);
    updateData['stats.pendingCount'] = _.inc(1);
  } else if (statusChange.from === 'pending' && statusChange.to === 'approved') {
    // 审核通过
    updateData['stats.pendingCount'] = _.inc(-1);
    updateData['stats.approvedCount'] = _.inc(1);
  } else if (statusChange.from === 'approved' && statusChange.to === 'signed') {
    // 签约成功
    updateData['stats.approvedCount'] = _.inc(-1);
    updateData['stats.signedCount'] = _.inc(1);
  } else if (statusChange.to === 'rejected') {
    // 被拒绝
    if (statusChange.from === 'pending') {
      updateData['stats.pendingCount'] = _.inc(-1);
    } else if (statusChange.from === 'approved') {
      updateData['stats.approvedCount'] = _.inc(-1);
    }
    updateData['stats.rejectedCount'] = _.inc(1);
  }

  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });

  return {
    success: true,
    message: '统计数据更新成功'
  };
}
