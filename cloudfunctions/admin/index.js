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

const SUBSCRIBE_TEMPLATE = {
  reviewResult: 'Y0HUyqrKLrK1RWzKeE44xwUmoxU1pp7DCHIrDY1EYYQ', // 授权审核通过通知
  interviewSchedule: 'hIAElgobOhB20TJwf7TKvxkiR0G9w2m-KCDZRFORCC8' // 日程提醒
};

const SUBSCRIBE_PAGE = 'pages/recruit/status/status';

function truncateText(value, max = 20) {
  const text = String(value || '');
  return [...text].slice(0, max).join('');
}

function formatDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatInterviewTime(interviewDate, interviewTime) {
  const dateText = interviewDate || '';
  const timeText = interviewTime || '';
  if (!dateText && !timeText) {
    return formatDateTime();
  }
  if (!dateText) {
    return timeText;
  }
  if (!timeText) {
    return dateText;
  }
  return `${dateText} ${timeText}`;
}

function normalizeInterviewerText(interviewers) {
  if (!Array.isArray(interviewers) || interviewers.length === 0) {
    return '';
  }

  const names = interviewers.map((item) => {
    if (typeof item === 'string') return item.trim();
    if (item && item.name) return String(item.name).trim();
    return '';
  }).filter(Boolean);

  return names.join('、');
}

async function trySendSubscribeMessage(openId, templateId, dataList, scene) {
  if (!openId || !templateId || !Array.isArray(dataList) || dataList.length === 0) {
    return false;
  }

  for (let i = 0; i < dataList.length; i++) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openId,
        templateId,
        page: SUBSCRIBE_PAGE,
        data: dataList[i]
      });
      console.log(`[admin] ${scene} 订阅消息发送成功，dataPattern=${i + 1}`);
      return true;
    } catch (error) {
      console.warn(`[admin] ${scene} 订阅消息发送失败，dataPattern=${i + 1}:`, {
        errCode: error.errCode,
        errMsg: error.errMsg || error.message
      });
    }
  }

  return false;
}

async function sendReviewResultNotification(candidate, status, reason) {
  if (!candidate || !candidate.openId) {
    return;
  }
  if (!['approved', 'rejected'].includes(status)) {
    return;
  }

  const statusText = status === 'approved' ? '审核通过' : '审核未通过';
  const remark = status === 'approved'
    ? '请进入小程序查看后续安排'
    : (reason || '感谢报名，期待后续合作');
  const targetName = candidate.basicInfo?.name || candidate.basicInfo?.artName || '主播候选人';

  const dataCandidates = [
    {
      phrase1: { value: statusText },
      date2: { value: formatDateTime() },
      thing3: { value: truncateText(remark) },
      thing4: { value: truncateText('主播报名') },
      thing5: { value: truncateText(targetName) }
    },
    {
      thing1: { value: truncateText(statusText) },
      date2: { value: formatDateTime() },
      thing3: { value: truncateText(remark) },
      thing4: { value: truncateText('主播报名') },
      thing5: { value: truncateText(targetName) }
    }
  ];

  await trySendSubscribeMessage(
    candidate.openId,
    SUBSCRIBE_TEMPLATE.reviewResult,
    dataCandidates,
    '审核结果'
  );
}

async function sendInterviewScheduleNotification(candidate, interview) {
  if (!candidate || !candidate.openId || !interview) {
    return;
  }

  const scheduleTime = formatInterviewTime(interview.date, interview.time);
  const locationText = truncateText(interview.location || '面试地点待确认');
  const interviewerText = normalizeInterviewerText(interview.interviewers);
  const note = truncateText(interview.notes || interviewerText || '请提前15分钟到场');

  const dataCandidates = [
    {
      thing1: { value: truncateText('主播面试') },
      time2: { value: scheduleTime },
      thing3: { value: locationText },
      thing4: { value: note },
      thing5: { value: truncateText('请提前15分钟到场') }
    },
    {
      thing1: { value: truncateText('主播面试') },
      date2: { value: scheduleTime },
      thing3: { value: locationText },
      thing4: { value: note },
      thing5: { value: truncateText('请提前15分钟到场') }
    }
  ];

  await trySendSubscribeMessage(
    candidate.openId,
    SUBSCRIBE_TEMPLATE.interviewSchedule,
    dataCandidates,
    '面试安排'
  );
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
      case 'batchUpdateStatus':
        return await batchUpdateStatus(data.ids, data.status, data.reason);
      case 'deleteCandidate':
        return await deleteCandidate(data.id, token);
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
    admin: { username, name: admin.name, role: admin.role || 'admin' }
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
  const conditions = {
    // 默认只查询未删除的记录
    deletedAt: _.exists(false)
  };

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

  query = query.where(conditions);

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
  // 获取候选人当前状态
  const candidate = await db.collection('candidates').doc(id).get();
  const candidateData = candidate.data || null;
  const oldStatus = candidateData ? candidateData.status : null;

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
  if (candidateData && candidateData.openId) {
    await db.collection('users').where({
      openId: candidateData.openId
    }).update({
      data: {
        'candidateInfo.status': status,
        updatedAt: db.serverDate()
      }
    });
  }

  // 如果有星探推荐，更新星探统计数据
  if (
    candidateData &&
    candidateData.referral &&
    candidateData.referral.scoutId &&
    oldStatus !== status
  ) {
    try {
      await updateScoutStatsOnStatusChange(candidateData.referral.scoutId, oldStatus, status);
      console.log('[admin] 星探统计数据更新成功');
    } catch (error) {
      console.error('[admin] 星探统计数据更新失败:', error);
      // 不影响主流程，继续执行
    }
  }

  if (oldStatus !== status) {
    try {
      await sendReviewResultNotification(candidateData, status, reason);
    } catch (error) {
      console.error('[admin] 审核结果通知发送异常:', error);
    }
  }

  return { success: true, message: '状态更新成功' };
}

// 根据状态变化更新星探统计数据
async function updateScoutStatsOnStatusChange(scoutId, oldStatus, newStatus) {
  const updateData = {
    updatedAt: db.serverDate()
  };

  // 从旧状态中减少计数
  if (oldStatus === 'pending') {
    updateData['stats.pendingCount'] = _.inc(-1);
  } else if (oldStatus === 'approved' || oldStatus === 'interview_scheduled') {
    updateData['stats.approvedCount'] = _.inc(-1);
  } else if (oldStatus === 'signed') {
    updateData['stats.signedCount'] = _.inc(-1);
  }

  // 在新状态中增加计数
  if (newStatus === 'pending') {
    updateData['stats.pendingCount'] = _.inc(1);
  } else if (newStatus === 'approved' || newStatus === 'interview_scheduled') {
    updateData['stats.approvedCount'] = _.inc(1);
  } else if (newStatus === 'signed') {
    updateData['stats.signedCount'] = _.inc(1);
  } else if (newStatus === 'rejected') {
    updateData['stats.rejectedCount'] = _.inc(1);
  }

  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });
}

// 安排面试
async function scheduleInterview(data) {
  const { candidateId, interviewDate, interviewTime, location, interviewers, notes } = data;
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data || null;
  const oldStatus = candidate ? candidate.status : null;

  const interviewInfo = {
    date: interviewDate,
    time: interviewTime,
    location: location || '',
    interviewers: interviewers || [],
    notes: notes || '',
    scheduledAt: db.serverDate()
  };

  await db.collection('candidates').doc(candidateId).update({
    data: {
      status: 'interview_scheduled',
      interview: interviewInfo,
      updatedAt: db.serverDate()
    }
  });

  // 同步更新 users 表
  if (candidate && candidate.openId) {
    await db.collection('users').where({
      openId: candidate.openId
    }).update({
      data: {
        'candidateInfo.status': 'interview_scheduled',
        updatedAt: db.serverDate()
      }
    });
  }

  // 如果有星探推荐，更新星探统计数据
  if (
    candidate &&
    candidate.referral &&
    candidate.referral.scoutId &&
    oldStatus !== 'interview_scheduled'
  ) {
    try {
      await updateScoutStatsOnStatusChange(candidate.referral.scoutId, oldStatus, 'interview_scheduled');
      console.log('[admin] 星探统计数据更新成功');
    } catch (error) {
      console.error('[admin] 星探统计数据更新失败:', error);
    }
  }

  try {
    await sendInterviewScheduleNotification(candidate, {
      date: interviewDate,
      time: interviewTime,
      location,
      interviewers,
      notes
    });
  } catch (error) {
    console.error('[admin] 面试安排通知发送异常:', error);
  }

  return { success: true, message: '面试安排成功' };
}

// 批量更新候选人状态
async function batchUpdateStatus(ids, status, reason) {
  if (!ids || ids.length === 0) {
    return { success: false, error: '请选择候选人' };
  }

  const updateData = {
    status,
    updatedAt: db.serverDate()
  };
  if (reason) {
    updateData.reviewReason = reason;
    updateData.reviewedAt = db.serverDate();
  }

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    try {
      await db.collection('candidates').doc(id).update({ data: updateData });

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
      successCount++;
    } catch (err) {
      console.error(`[admin] 批量更新失败 id=${id}:`, err);
      failCount++;
    }
  }

  return {
    success: true,
    message: `操作完成：${successCount}个成功${failCount > 0 ? '，' + failCount + '个失败' : ''}`,
    successCount,
    failCount
  };
}

// 软删除候选人（仅admin账号可操作）
async function deleteCandidate(id, token) {
  // 验证是否是admin账号
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split(':');

    // 只有admin账号才能删除
    if (username !== 'admin') {
      return { success: false, error: '无权限删除候选人' };
    }

    // 执行软删除
    await db.collection('candidates').doc(id).update({
      data: {
        deletedAt: db.serverDate(),
        deletedBy: username,
        updatedAt: db.serverDate()
      }
    });

    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('[admin] 删除候选人失败:', error);
    return { success: false, error: '删除失败' };
  }
}

// 获取统计数据
async function getStatistics() {
  const statuses = ['pending', 'approved', 'rejected', 'interview_scheduled', 'signed'];
  const stats = {};

  for (const status of statuses) {
    const res = await db.collection('candidates').where({
      status,
      deletedAt: _.exists(false)
    }).count();
    stats[status] = res.total;
  }

  const totalRes = await db.collection('candidates').where({
    deletedAt: _.exists(false)
  }).count();
  stats.total = totalRes.total;

  return { success: true, data: stats };
}
