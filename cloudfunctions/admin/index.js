// 云函数入口文件 - 管理后台
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const crypto = require('crypto');

const db = cloud.database();
const _ = db.command;

// 密码哈希
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.main = async (event) => {
  const { action, data, token } = event;

  console.log('[admin] action:', action);

  try {
    // 登录不需要验证 token
    if (action === 'login') {
      return await login(data);
    }

    // 其他操作需要验证 token
    if (!(await verifyToken(token))) {
      return { success: false, error: '未授权，请重新登录' };
    }

    switch (action) {
      case 'getCandidateList':
        return await getCandidateList(data);
      case 'getCandidateDetail':
        return await getCandidateDetail(data.id);
      case 'updateCandidateStatus':
        return await updateCandidateStatus(data.id, data.status, data.reason);
      case 'scheduleInterview':
        return await scheduleInterview(data);
      case 'getStatistics':
        return await getStatistics();
      default:
        return { success: false, error: '未知操作' };
    }
  } catch (error) {
    console.error('[admin] 错误:', error);
    return { success: false, error: error.message || '操作失败' };
  }
};

// 管理员登录
async function login({ username, password }) {
  const res = await db.collection('admins').where({ username }).get();
  if (res.data.length === 0) {
    return { success: false, error: '用户名或密码错误' };
  }

  const admin = res.data[0];
  if (admin.password !== hashPassword(password)) {
    return { success: false, error: '用户名或密码错误' };
  }

  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

  // 更新最后登录时间
  await db.collection('admins').doc(admin._id).update({
    data: { lastLoginAt: db.serverDate() }
  });

  return {
    success: true,
    token,
    admin: { username, name: admin.name }
  };
}

// 验证 token
async function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split(':');
    const res = await db.collection('admins').where({ username }).get();
    return res.data.length > 0;
  } catch {
    return false;
  }
}

// 获取候选人列表（分页、筛选、搜索）
async function getCandidateList({ page = 1, pageSize = 20, status = 'all', keyword = '' }) {
  let query = db.collection('candidates');

  // 构建筛选条件
  const conditions = {};
  if (status !== 'all') {
    conditions.status = status;
  }

  if (keyword) {
    // 微信云数据库不支持 $or + 正则组合，按名字搜索
    conditions['basicInfo.name'] = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  if (Object.keys(conditions).length > 0) {
    query = query.where(conditions);
  }

  // 获取总数
  const countRes = await query.count();
  const total = countRes.total;

  // 分页查询
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

// 获取候选人详情
async function getCandidateDetail(id) {
  const res = await db.collection('candidates').doc(id).get();
  return { success: true, candidate: res.data };
}

// 更新候选人状态
async function updateCandidateStatus(id, status, reason) {
  const updateData = {
    status,
    updatedAt: db.serverDate()
  };

  if (reason) {
    updateData.reviewReason = reason;
    updateData.reviewedAt = db.serverDate();
  }

  await db.collection('candidates').doc(id).update({
    data: updateData
  });

  // 同步更新 users 表
  const candidate = await db.collection('candidates').doc(id).get();
  if (candidate.data && candidate.data.openId) {
    await db.collection('users').where({
      openId: candidate.data.openId
    }).update({
      data: {
        'candidateInfo.status': status,
        updatedAt: db.serverDate()
      }
    });
  }

  return { success: true, message: '状态更新成功' };
}

// 安排面试
async function scheduleInterview(data) {
  const { candidateId, interviewDate, interviewTime, location, interviewers, notes } = data;

  await db.collection('candidates').doc(candidateId).update({
    data: {
      status: 'interview_scheduled',
      interview: {
        date: interviewDate,
        time: interviewTime,
        location: location || '',
        interviewers: interviewers || [],
        notes: notes || '',
        scheduledAt: db.serverDate()
      },
      updatedAt: db.serverDate()
    }
  });

  return { success: true, message: '面试安排成功' };
}

// 获取统计数据
async function getStatistics() {
  const statuses = ['pending', 'approved', 'rejected', 'interview_scheduled', 'signed'];
  const stats = {};

  for (const status of statuses) {
    const res = await db.collection('candidates').where({ status }).count();
    stats[status] = res.total;
  }

  const totalRes = await db.collection('candidates').count();
  stats.total = totalRes.total;

  return { success: true, data: stats };
}
