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

  // 生成唯一推荐码（最多重试10次）
  let shareCode = '';
  let retryCount = 0;
  while (retryCount < 10) {
    shareCode = generateShareCode();
    const codeCheckRes = await db.collection('scouts').where({
      shareCode: shareCode
    }).get();

    if (codeCheckRes.data.length === 0) {
      break; // 找到唯一码
    }
    retryCount++;
  }

  if (retryCount >= 10) {
    return {
      success: false,
      error: '生成推荐码失败，请重试'
    };
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

  return {
    success: true,
    scoutId: createRes._id,
    shareCode: shareCode,
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
