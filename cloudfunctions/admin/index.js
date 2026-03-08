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

// 权限配置
const ROLE_PERMISSIONS = {
  admin: {
    viewPersonalInfo: true,
    viewReferralInfo: true,
    uploadInterviewMaterials: true,
    scoreInterview: true,
    updateStatus: true,
    exportData: true,
    viewAuditLog: true,
    manageUsers: true,
    assignCandidates: true
  },
  agent: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: true,
    scoreInterview: true,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  }
};

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
        return await getCandidateList(data, token);
      case 'getCandidateDetail':
        return await getCandidateDetail(data.id, token);
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

      // 权限管理相关
      case 'getAdminList':
        return await getAdminList(token);
      case 'createAdmin':
        return await createAdmin(data, token);
      case 'updateAdmin':
        return await updateAdmin(data, token);
      case 'deleteAdmin':
        return await deleteAdmin(data.id, token);

      // 候选人分配
      case 'assignCandidate':
        return await assignCandidate(data, token);
      case 'unassignCandidate':
        return await unassignCandidate(data.candidateId, token);
      case 'getAssignments':
        return await getAssignments(token);

      // 操作日志
      case 'getAuditLogs':
        return await getAuditLogs(data, token);

      // 面试打分
      case 'scoreInterview':
        return await scoreInterview(data, token);

      // 面试资料上传
      case 'uploadInterviewMaterials':
        return await uploadInterviewMaterials(data, token);
      case 'deleteInterviewMaterial':
        return await deleteInterviewMaterial(data, token);

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

  // 检查账号状态
  if (admin.status === 'disabled') {
    return { success: false, error: '账号已被禁用，请联系管理员' };
  }

  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

  // 更新最后登录时间
  await db.collection('admins').doc(admin._id).update({
    data: { lastLoginAt: db.serverDate() }
  });

  // 获取角色权限
  const role = admin.role || 'admin';
  const permissions = ROLE_PERMISSIONS[role];

  return {
    success: true,
    token,
    admin: {
      username,
      name: admin.name,
      role,
      permissions,
      assignedCandidates: admin.assignedCandidates || []
    }
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

// 从 token 获取用户信息
async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split(':');
    const res = await db.collection('admins').where({ username }).get();
    if (res.data.length === 0) return null;
    const admin = res.data[0];
    return {
      _id: admin._id,
      username: admin.username,
      name: admin.name,
      role: admin.role || 'admin',
      permissions: ROLE_PERMISSIONS[admin.role || 'admin'],
      assignedCandidates: admin.assignedCandidates || []
    };
  } catch {
    return null;
  }
}

// 记录审计日志
async function logAuditAction(action, operator, target, details = {}) {
  try {
    await db.collection('audit_logs').add({
      data: {
        action,
        operator,
        target,
        details,
        createdAt: db.serverDate()
      }
    });
  } catch (error) {
    console.error('[admin] 记录审计日志失败:', error);
  }
}

// 获取候选人列表（分页、筛选、搜索）
async function getCandidateList({ page = 1, pageSize = 20, status = 'all', keyword = '' }, token) {
  // 获取当前用户信息
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  let query = db.collection('candidates');

  // 构建筛选条件
  const conditions = {
    // 默认只查询未删除的记录
    deletedAt: _.exists(false)
  };

  // 如果是经纪人，只能查看分配给自己的候选人
  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (assignedIds.length === 0) {
      // 如果没有分配任何候选人，返回空列表
      return {
        success: true,
        data: {
          list: [],
          total: 0,
          page,
          pageSize
        }
      };
    }
    conditions._id = _.in(assignedIds);
  }

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

  // 如果是经纪人，移除敏感信息
  let list = res.data;
  if (user.role === 'agent') {
    list = list.map(candidate => {
      const sanitized = { ...candidate };
      // 移除手机号、微信号
      if (sanitized.contactInfo) {
        delete sanitized.contactInfo.phone;
        delete sanitized.contactInfo.wechat;
      }
      // 移除星探推荐信息
      delete sanitized.referral;
      return sanitized;
    });
  }

  return {
    success: true,
    data: {
      list,
      total,
      page,
      pageSize
    }
  };
}

// 获取候选人详情
async function getCandidateDetail(id, token) {
  // 获取当前用户信息
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 如果是经纪人，检查是否有权限查看该候选人
  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (!assignedIds.includes(id)) {
      return { success: false, error: '无权限查看该候选人' };
    }
  }

  const res = await db.collection('candidates').doc(id).get();
  let candidate = res.data;

  // 如果是经纪人，移除敏感信息
  if (user.role === 'agent') {
    const sanitized = { ...candidate };
    // 移除手机号、微信号
    if (sanitized.contactInfo) {
      delete sanitized.contactInfo.phone;
      delete sanitized.contactInfo.wechat;
    }
    // 移除星探推荐信息
    delete sanitized.referral;
    candidate = sanitized;
  }

  // 记录查看候选人详情的审计日志
  await logAuditAction(
    'view_candidate_detail',
    user.username,
    id,
    { candidateName: candidate.basicInfo?.name }
  );

  return { success: true, candidate };
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
      const candidateRes = await db.collection('candidates').doc(id).get();
      const candidate = candidateRes.data || null;
      if (!candidate) {
        console.warn(`[admin] 批量更新候选人不存在 id=${id}`);
        failCount++;
        continue;
      }
      const oldStatus = candidate.status;

      await db.collection('candidates').doc(id).update({ data: updateData });

      // 同步更新 users 表
      if (candidate.openId) {
        await db.collection('users').where({
          openId: candidate.openId
        }).update({
          data: {
            'candidateInfo.status': status,
            updatedAt: db.serverDate()
          }
        });
      }

      // 如果有星探推荐，更新星探统计数据
      if (
        candidate.referral &&
        candidate.referral.scoutId &&
        oldStatus !== status
      ) {
        try {
          await updateScoutStatsOnStatusChange(candidate.referral.scoutId, oldStatus, status);
          console.log('[admin] 批量更新星探统计数据成功');
        } catch (error) {
          console.error('[admin] 批量更新星探统计数据失败:', error);
        }
      }

      if (oldStatus !== status) {
        try {
          await sendReviewResultNotification(candidate, status, reason);
        } catch (error) {
          console.error('[admin] 批量审核结果通知发送异常:', error);
        }
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

// 硬删除候选人（仅admin账号可操作）
async function deleteCandidate(id, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (user.role !== 'admin') {
    return { success: false, error: '无权限删除候选人' };
  }

  if (!id) {
    return { success: false, error: '缺少候选人ID' };
  }

  try {
    // 先读取候选人，便于做关联清理
    const candidateRes = await db.collection('candidates').doc(id).get();
    const candidate = candidateRes.data || null;

    if (!candidate) {
      return { success: false, error: '候选人不存在' };
    }

    // 回滚星探统计（只在存在推荐关系时执行）
    if (candidate.referral && candidate.referral.scoutId) {
      const scoutUpdateData = {
        updatedAt: db.serverDate(),
        'stats.totalReferred': _.inc(-1)
      };

      if (candidate.status === 'pending') {
        scoutUpdateData['stats.pendingCount'] = _.inc(-1);
      } else if (candidate.status === 'approved' || candidate.status === 'interview_scheduled') {
        scoutUpdateData['stats.approvedCount'] = _.inc(-1);
      } else if (candidate.status === 'signed') {
        scoutUpdateData['stats.signedCount'] = _.inc(-1);
      } else if (candidate.status === 'rejected') {
        scoutUpdateData['stats.rejectedCount'] = _.inc(-1);
      }

      try {
        await db.collection('scouts').doc(candidate.referral.scoutId).update({
          data: scoutUpdateData
        });
      } catch (err) {
        console.error('[admin] 删除候选人时回滚星探统计失败:', err);
      }
    }

    // 硬删除 candidates 记录
    await db.collection('candidates').doc(id).remove();

    // 清理 users 中的候选人绑定信息，便于同一个 openId 重新报名测试
    if (candidate.openId) {
      await db.collection('users').where({
        openId: candidate.openId
      }).update({
        data: {
          'candidateInfo.candidateId': _.remove(),
          'candidateInfo.appliedAt': _.remove(),
          'candidateInfo.status': _.remove(),
          updatedAt: db.serverDate()
        }
      });
    }

    // 清理经纪人分配列表里的该候选人ID，避免残留脏数据
    const pageSize = 100;
    let skip = 0;
    while (true) {
      const agentPage = await db.collection('admins').where({
        role: 'agent',
        status: _.neq('deleted')
      }).skip(skip).limit(pageSize).get();

      const agents = agentPage.data || [];
      if (agents.length === 0) {
        break;
      }

      for (const agent of agents) {
        const assignedCandidates = Array.isArray(agent.assignedCandidates) ? agent.assignedCandidates : [];
        if (!assignedCandidates.includes(id)) {
          continue;
        }

        await db.collection('admins').doc(agent._id).update({
          data: {
            assignedCandidates: assignedCandidates.filter(candidateId => candidateId !== id),
            updatedAt: db.serverDate()
          }
        });
      }

      if (agents.length < pageSize) {
        break;
      }
      skip += pageSize;
    }

    await logAuditAction('delete_candidate', user.username, id, {
      hardDelete: true,
      candidateName: (candidate.basicInfo && candidate.basicInfo.name) || '',
      openId: candidate.openId || ''
    });

    return { success: true, message: '删除成功（硬删除）' };
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

// ==================== 权限管理相关 ====================

// 获取管理员/经纪人列表
async function getAdminList(token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以查看用户列表
  if (!user.permissions.manageUsers) {
    return { success: false, error: '无权限访问' };
  }

  const res = await db.collection('admins')
    .where({ status: _.neq('deleted') })
    .orderBy('createdAt', 'desc')
    .get();

  // 移除密码字段
  const list = res.data.map(admin => {
    const { password, ...rest } = admin;
    return rest;
  });

  return { success: true, data: list };
}

// 创建管理员/经纪人账号
async function createAdmin(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以创建用户
  if (!user.permissions.manageUsers) {
    return { success: false, error: '无权限访问' };
  }

  const { username, password, name, role = 'agent' } = data;

  // 验证必填字段
  if (!username || !password || !name) {
    return { success: false, error: '用户名、密码和姓名为必填项' };
  }

  // 检查用户名是否已存在
  const existingRes = await db.collection('admins').where({ username }).get();
  if (existingRes.data.length > 0) {
    return { success: false, error: '用户名已存在' };
  }

  // 创建新账号
  const newAdmin = {
    username,
    password: hashPassword(password),
    name,
    role,
    status: 'active',
    assignedCandidates: [],
    createdBy: user.username,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const res = await db.collection('admins').add({
    data: newAdmin
  });

  // 记录审计日志
  await logAuditAction(
    'create_admin',
    user.username,
    res._id,
    { username, name, role }
  );

  return { success: true, message: '创建成功', id: res._id };
}

// 更新管理员/经纪人信息
async function updateAdmin(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以更新用户
  if (!user.permissions.manageUsers) {
    return { success: false, error: '无权限访问' };
  }

  const { id, name, password, status } = data;

  if (!id) {
    return { success: false, error: '缺少用户ID' };
  }

  const updateData = {
    updatedAt: db.serverDate()
  };

  if (name) updateData.name = name;
  if (password) updateData.password = hashPassword(password);
  if (status) updateData.status = status;

  await db.collection('admins').doc(id).update({
    data: updateData
  });

  // 记录审计日志
  await logAuditAction(
    'update_admin',
    user.username,
    id,
    { name, status, passwordChanged: !!password }
  );

  return { success: true, message: '更新成功' };
}

// 删除管理员/经纪人（软删除）
async function deleteAdmin(id, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以删除用户
  if (!user.permissions.manageUsers) {
    return { success: false, error: '无权限访问' };
  }

  // 不能删除自己
  const targetAdmin = await db.collection('admins').doc(id).get();
  if (targetAdmin.data.username === user.username) {
    return { success: false, error: '不能删除自己' };
  }

  // 软删除
  await db.collection('admins').doc(id).update({
    data: {
      status: 'deleted',
      deletedBy: user.username,
      deletedAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  });

  // 记录审计日志
  await logAuditAction(
    'delete_admin',
    user.username,
    id,
    { username: targetAdmin.data.username }
  );

  return { success: true, message: '删除成功' };
}

// ==================== 候选人分配相关 ====================

// 分配候选人给经纪人
async function assignCandidate(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以分配候选人
  if (!user.permissions.assignCandidates) {
    return { success: false, error: '无权限访问' };
  }

  const { candidateId, agentId } = data;

  if (!candidateId || !agentId) {
    return { success: false, error: '缺少必要参数' };
  }

  // 检查经纪人是否存在
  const agentRes = await db.collection('admins').doc(agentId).get();
  if (!agentRes.data || agentRes.data.role !== 'agent') {
    return { success: false, error: '经纪人不存在' };
  }

  // 检查候选人是否存在
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  // 添加到经纪人的分配列表
  const assignedCandidates = agentRes.data.assignedCandidates || [];
  if (!assignedCandidates.includes(candidateId)) {
    assignedCandidates.push(candidateId);
    await db.collection('admins').doc(agentId).update({
      data: {
        assignedCandidates,
        updatedAt: db.serverDate()
      }
    });
  }

  // 记录到候选人的 assignedAgent 字段
  await db.collection('candidates').doc(candidateId).update({
    data: {
      assignedAgent: {
        agentId,
        agentName: agentRes.data.name,
        assignedAt: db.serverDate(),
        assignedBy: user.username
      },
      updatedAt: db.serverDate()
    }
  });

  // 记录审计日志
  await logAuditAction(
    'assign_candidate',
    user.username,
    candidateId,
    {
      agentId,
      agentName: agentRes.data.name,
      candidateName: candidateRes.data.basicInfo?.name
    }
  );

  return { success: true, message: '分配成功' };
}

// 取消分配候选人
async function unassignCandidate(candidateId, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以取消分配
  if (!user.permissions.assignCandidates) {
    return { success: false, error: '无权限访问' };
  }

  if (!candidateId) {
    return { success: false, error: '缺少候选人ID' };
  }

  // 获取候选人信息
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const assignedAgent = candidateRes.data.assignedAgent;
  if (!assignedAgent || !assignedAgent.agentId) {
    return { success: false, error: '该候选人未分配给任何经纪人' };
  }

  // 从经纪人的分配列表中移除
  const agentRes = await db.collection('admins').doc(assignedAgent.agentId).get();
  if (agentRes.data) {
    const assignedCandidates = (agentRes.data.assignedCandidates || []).filter(id => id !== candidateId);
    await db.collection('admins').doc(assignedAgent.agentId).update({
      data: {
        assignedCandidates,
        updatedAt: db.serverDate()
      }
    });
  }

  // 移除候选人的 assignedAgent 字段
  await db.collection('candidates').doc(candidateId).update({
    data: {
      assignedAgent: _.remove(),
      updatedAt: db.serverDate()
    }
  });

  // 记录审计日志
  await logAuditAction(
    'unassign_candidate',
    user.username,
    candidateId,
    {
      agentId: assignedAgent.agentId,
      agentName: assignedAgent.agentName,
      candidateName: candidateRes.data.basicInfo?.name
    }
  );

  return { success: true, message: '取消分配成功' };
}

// 获取分配关系列表
async function getAssignments(token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以查看所有分配关系
  if (!user.permissions.assignCandidates) {
    return { success: false, error: '无权限访问' };
  }

  // 获取所有经纪人
  const agentsRes = await db.collection('admins').where({
    role: 'agent',
    status: _.neq('deleted')
  }).get();

  const assignments = [];

  for (const agent of agentsRes.data) {
    const candidateIds = agent.assignedCandidates || [];
    if (candidateIds.length > 0) {
      // 获取候选人信息
      const candidatesRes = await db.collection('candidates').where({
        _id: _.in(candidateIds)
      }).get();

      assignments.push({
        agentId: agent._id,
        agentName: agent.name,
        agentUsername: agent.username,
        candidates: candidatesRes.data.map(c => ({
          id: c._id,
          name: c.basicInfo?.name,
          status: c.status,
          createdAt: c.createdAt
        }))
      });
    } else {
      assignments.push({
        agentId: agent._id,
        agentName: agent.name,
        agentUsername: agent.username,
        candidates: []
      });
    }
  }

  return { success: true, data: assignments };
}

// ==================== 操作日志相关 ====================

// 获取审计日志
async function getAuditLogs(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以查看审计日志
  if (!user.permissions.viewAuditLog) {
    return { success: false, error: '无权限访问' };
  }

  const { page = 1, pageSize = 50, action = 'all', operator = 'all' } = data;

  let query = db.collection('audit_logs');

  // 构建筛选条件
  const conditions = {};

  if (action !== 'all') {
    conditions.action = action;
  }

  if (operator !== 'all') {
    conditions.operator = operator;
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

// ==================== 面试打分相关 ====================

// 面试打分
async function scoreInterview(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 检查是否有面试打分权限
  if (!user.permissions.scoreInterview) {
    return { success: false, error: '无权限进行面试打分' };
  }

  const { candidateId, score } = data;

  if (!candidateId || !score) {
    return { success: false, error: '缺少必要参数' };
  }

  // 验证评分结果
  const validResults = ['pass_s', 'pass_a', 'pass_b', 'fail', 'pending'];
  if (!validResults.includes(score.result)) {
    return { success: false, error: '无效的评分结果' };
  }

  // 检查候选人是否存在
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  // 如果是经纪人，检查是否有权限给该候选人打分
  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (!assignedIds.includes(candidateId)) {
      return { success: false, error: '无权限给该候选人打分' };
    }
  }

  // 构建打分数据
  const scoreData = {
    result: score.result,
    tags: score.tags || {},
    comment: score.comment || '',
    scoredBy: user.name,
    scoredByUsername: user.username,
    scoredAt: db.serverDate()
  };

  // 更新候选人的面试打分
  await db.collection('candidates').doc(candidateId).update({
    data: {
      'interview.score': scoreData,
      updatedAt: db.serverDate()
    }
  });

  // 记录审计日志
  await logAuditAction(
    'score_interview',
    user.username,
    candidateId,
    {
      candidateName: candidateRes.data.basicInfo?.name,
      result: score.result,
      comment: score.comment
    }
  );

  return { success: true, message: '打分成功' };
}

// ==================== 面试资料上传相关 ====================

// 上传面试资料
async function uploadInterviewMaterials(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 检查是否有上传面试资料权限
  if (!user.permissions.uploadInterviewMaterials) {
    return { success: false, error: '无权限上传面试资料' };
  }

  const { candidateId, type, materials } = data;

  if (!candidateId || !type || !materials || !Array.isArray(materials)) {
    return { success: false, error: '缺少必要参数' };
  }

  // 验证类型
  if (!['photos', 'videos'].includes(type)) {
    return { success: false, error: '无效的资料类型' };
  }

  // 检查候选人是否存在
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  // 如果是经纪人，检查是否有权限给该候选人上传资料
  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (!assignedIds.includes(candidateId)) {
      return { success: false, error: '无权限给该候选人上传资料' };
    }
  }

  // 获取当前的面试资料
  const currentMaterials = candidateRes.data.interview?.materials || { photos: [], videos: [] };

  // 添加上传信息
  const newMaterials = materials.map(item => ({
    ...item,
    uploadedBy: user.name,
    uploadedByUsername: user.username,
    uploadedAt: db.serverDate()
  }));

  // 合并新资料
  const updatedMaterials = {
    ...currentMaterials,
    [type]: [...(currentMaterials[type] || []), ...newMaterials]
  };

  // 更新候选人的面试资料
  await db.collection('candidates').doc(candidateId).update({
    data: {
      'interview.materials': updatedMaterials,
      updatedAt: db.serverDate()
    }
  });

  // 记录审计日志
  await logAuditAction(
    'upload_interview_materials',
    user.username,
    candidateId,
    {
      candidateName: candidateRes.data.basicInfo?.name,
      type,
      count: materials.length
    }
  );

  return { success: true, message: '上传成功' };
}

// 删除面试资料
async function deleteInterviewMaterial(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 检查是否有上传面试资料权限
  if (!user.permissions.uploadInterviewMaterials) {
    return { success: false, error: '无权限删除面试资料' };
  }

  const { candidateId, type, fileId } = data;

  if (!candidateId || !type || !fileId) {
    return { success: false, error: '缺少必要参数' };
  }

  // 检查候选人是否存在
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  // 如果是经纪人，检查是否有权限操作该候选人
  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (!assignedIds.includes(candidateId)) {
      return { success: false, error: '无权限操作该候选人的资料' };
    }
  }

  // 获取当前的面试资料
  const currentMaterials = candidateRes.data.interview?.materials || { photos: [], videos: [] };

  // 删除指定文件
  const updatedList = (currentMaterials[type] || []).filter(item => item.fileId !== fileId);

  const updatedMaterials = {
    ...currentMaterials,
    [type]: updatedList
  };

  // 更新候选人的面试资料
  await db.collection('candidates').doc(candidateId).update({
    data: {
      'interview.materials': updatedMaterials,
      updatedAt: db.serverDate()
    }
  });

  // 删除云存储文件
  try {
    await cloud.deleteFile({
      fileList: [fileId]
    });
  } catch (error) {
    console.error('[admin] 删除云存储文件失败:', error);
  }

  return { success: true, message: '删除成功' };
}
