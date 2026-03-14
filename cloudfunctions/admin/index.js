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
  },
  hr: {
    viewPersonalInfo: true,
    viewReferralInfo: true,
    uploadInterviewMaterials: false,
    scoreInterview: false,
    updateStatus: true,
    exportData: true,
    viewAuditLog: true,
    manageUsers: false,
    assignCandidates: true
  },
  operations: {
    viewPersonalInfo: true,
    viewReferralInfo: true,
    uploadInterviewMaterials: false,
    scoreInterview: false,
    updateStatus: false,
    exportData: true,
    viewAuditLog: true,
    manageUsers: false,
    assignCandidates: false
  },
  trainer: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: false,
    scoreInterview: true,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  }
};

// 数据脱敏函数 - 用于经纪人角色
function desensitizeCandidateForAgent(candidate) {
  if (!candidate) return candidate;

  const sanitized = { ...candidate };

  // 移除联系方式
  if (sanitized.basicInfo) {
    delete sanitized.basicInfo.phone;
    delete sanitized.basicInfo.wechat;

    // 移除社交账号
    delete sanitized.basicInfo.douyin;
    delete sanitized.basicInfo.douyinFans;
    delete sanitized.basicInfo.xiaohongshu;
    delete sanitized.basicInfo.xiaohongshuFans;
    delete sanitized.basicInfo.bilibili;
    delete sanitized.basicInfo.bilibiliUsername;
    delete sanitized.basicInfo.bilibiliName;
    delete sanitized.basicInfo.bilibiliFans;
  }

  // 移除推荐人信息
  if (sanitized.referral) {
    delete sanitized.referral;
  }

  return sanitized;
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
      case 'getAgentList':
        return await getAgentList(token);
      case 'batchAssignCandidates':
        return await batchAssignCandidates(data, token);

      // 星探管理
      case 'reviewScoutApplication':
        return await reviewScoutApplication(data, token);
      case 'getPendingScouts':
        return await getPendingScouts(data, token);
      case 'updateScoutGrade':
        return await updateScoutGrade(data, token);
      case 'deleteScout':
        return await deleteScout(data, token);
      case 'hardDeleteScout':
        return await hardDeleteScout(data, token);
      case 'restoreScout':
        return await restoreScout(data, token);
      case 'updateCandidateReferral':
        return await updateCandidateReferral(data, token);

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

      // 试镜视频上传
      case 'uploadAuditionVideos':
        return await uploadAuditionVideos(data, token);

      // 用户申请和审核
      case 'applyUser':
        return await applyUser(data);
      case 'getUserList':
        return await getUserList(data, token);
      case 'reviewUser':
        return await reviewUser(data, token);

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
    list = list.map(candidate => desensitizeCandidateForAgent(candidate));
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
    candidate = desensitizeCandidateForAgent(candidate);
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

// 根据状态变化更新星探统计数据（新模式：只跟踪 signedCount）
async function updateScoutStatsOnStatusChange(scoutId, oldStatus, newStatus) {
  const updateData = {
    updatedAt: db.serverDate()
  };

  // 新增签约
  if (newStatus === 'signed' && oldStatus !== 'signed') {
    updateData['stats.signedCount'] = _.inc(1);
  }
  // 取消签约
  else if (oldStatus === 'signed' && newStatus !== 'signed') {
    updateData['stats.signedCount'] = _.inc(-1);
  }
  // 其他状态变化不再更新 scout stats
  else {
    return;
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
        'stats.referredCount': _.inc(-1)
      };

      // 仅签约状态需要回滚 signedCount
      if (candidate.status === 'signed') {
        scoutUpdateData['stats.signedCount'] = _.inc(-1);
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

// 获取经纪人列表（含分配统计）
async function getAgentList(token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以查看经纪人列表
  if (!user.permissions.assignCandidates) {
    return { success: false, error: '无权限访问' };
  }

  try {
    // 获取所有未删除的经纪人
    const agentsRes = await db.collection('admins').where({
      role: 'agent',
      status: _.neq('deleted')
    }).get();

    // 计算每个经纪人的分配数量
    const agentsWithCount = agentsRes.data.map(agent => ({
      _id: agent._id,
      name: agent.name,
      username: agent.username,
      assignedCount: (agent.assignedCandidates || []).length
    }));

    return { success: true, data: agentsWithCount };
  } catch (error) {
    console.error('获取经纪人列表失败:', error);
    return { success: false, error: '获取经纪人列表失败' };
  }
}

// 批量分配候选人给经纪人
async function batchAssignCandidates(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 只有管理员可以分配候选人
  if (!user.permissions.assignCandidates) {
    return { success: false, error: '无权限操作' };
  }

  const { candidateIds, agentId } = data;

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { success: false, error: '候选人ID列表不能为空' };
  }

  if (!agentId) {
    return { success: false, error: '经纪人ID不能为空' };
  }

  try {
    // 验证经纪人存在且是 agent 角色
    const agentRes = await db.collection('admins').doc(agentId).get();
    if (!agentRes.data || agentRes.data.role !== 'agent') {
      return { success: false, error: '经纪人不存在或已删除' };
    }

    const agent = agentRes.data;

    // 更新经纪人的分配候选人列表
    const currentAssigned = agent.assignedCandidates || [];
    const newAssigned = [...new Set([...currentAssigned, ...candidateIds])]; // 去重

    await db.collection('admins').doc(agentId).update({
      data: {
        assignedCandidates: newAssigned,
        updatedAt: db.serverDate()
      }
    });

    // 批量更新候选人的分配信息
    let successCount = 0;
    const errors = [];
    const reassignments = []; // 记录重新分配的候选人

    for (const candidateId of candidateIds) {
      try {
        // 先获取候选人当前信息
        const candidateRes = await db.collection('candidates').doc(candidateId).get();

        if (candidateRes.data) {
          // 检查是否已经分配给其他经纪人
          if (candidateRes.data.assignedAgent &&
              candidateRes.data.assignedAgent.agentId &&
              candidateRes.data.assignedAgent.agentId !== agentId) {
            reassignments.push({
              candidateId,
              candidateName: candidateRes.data.basicInfo?.name || '未知',
              oldAgentName: candidateRes.data.assignedAgent.agentName || '未知'
            });
          }
        }

        // 更新分配信息
        await db.collection('candidates').doc(candidateId).update({
          data: {
            assignedAgent: {
              agentId: agentId,
              agentName: agent.name,
              assignedAt: db.serverDate(),
              assignedBy: user._id
            },
            updatedAt: db.serverDate()
          }
        });
        successCount++;
      } catch (error) {
        console.error(`分配候选人 ${candidateId} 失败:`, error);
        errors.push({ candidateId, error: error.message });
      }
    }

    // 记录操作日志
    await logAuditAction(
      'batch_assign_candidates',
      user.username,
      agentId,
      {
        agentName: agent.name,
        candidateCount: candidateIds.length,
        successCount,
        failedCount: candidateIds.length - successCount
      }
    );

    if (successCount === 0) {
      return { success: false, error: '所有候选人分配失败', errors };
    }

    return {
      success: true,
      successCount,
      totalCount: candidateIds.length,
      failedCount: candidateIds.length - successCount,
      errors: errors.length > 0 ? errors : undefined,
      reassignments: reassignments.length > 0 ? reassignments : undefined // 重新分配的候选人列表
    };
  } catch (error) {
    console.error('批量分配候选人失败:', error);
    return { success: false, error: '批量分配失败：' + error.message };
  }
}

// ==================== 星探管理相关 ====================

// 等级配置
const SCOUT_GRADES = {
  rookie: { zh: '新锐星探', upgradeAt: 0 },
  special: { zh: '特约星探', upgradeAt: 2 },
  partner: { zh: '合伙人星探', upgradeAt: 5 }
};

// 审核星探申请
async function reviewScoutApplication(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以审核星探申请' };
  }

  const { scoutId, approved, reviewNote } = data;

  if (!scoutId) {
    return { success: false, error: '缺少星探ID' };
  }

  try {
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
      'application.reviewedBy': user.username,
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

    await logAuditAction(
      approved ? 'approve_scout_application' : 'reject_scout_application',
      user.username,
      scoutId,
      {
        scoutName: scout.profile?.name || '-',
        reviewNote: reviewNote || ''
      }
    );

    return {
      success: true,
      message: approved ? '审核通过' : '已拒绝申请'
    };
  } catch (error) {
    console.error('审核星探申请失败:', error);
    return { success: false, error: '审核失败：' + error.message };
  }
}

// 获取待审核星探列表
async function getPendingScouts(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以查看待审核列表' };
  }

  const { page = 1, pageSize = 20 } = data || {};

  try {
    const query = db.collection('scouts').where({
      status: 'pending'
    });

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
  } catch (error) {
    console.error('获取待审核星探列表失败:', error);
    return { success: false, error: '获取列表失败：' + error.message };
  }
}

// 管理员手动调整星探等级
async function updateScoutGrade(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以调整星探等级' };
  }

  const { scoutId, newGrade, reason } = data;

  const validGrades = ['rookie', 'special', 'partner'];
  if (!validGrades.includes(newGrade)) {
    return { success: false, error: '无效的等级' };
  }

  try {
    const scoutRes = await db.collection('scouts').doc(scoutId).get();
    if (!scoutRes.data) {
      return { success: false, error: '星探不存在' };
    }

    const scout = scoutRes.data;
    const oldGrade = scout.grade || 'rookie';

    if (oldGrade === newGrade) {
      return { success: false, error: '等级未发生变化' };
    }

    await db.collection('scouts').doc(scoutId).update({
      data: {
        grade: newGrade,
        gradeHistory: _.push({
          from: oldGrade,
          to: newGrade,
          reason: reason || '管理员手动调整',
          operator: user.username,
          upgradedAt: db.serverDate()
        }),
        updatedAt: db.serverDate()
      }
    });

    await logAuditAction(
      'update_scout_grade',
      user.username,
      scoutId,
      {
        scoutName: scout.profile?.name || '-',
        oldGrade: SCOUT_GRADES[oldGrade]?.zh || oldGrade,
        newGrade: SCOUT_GRADES[newGrade]?.zh || newGrade,
        reason: reason || '无'
      }
    );

    return {
      success: true,
      message: '等级调整成功'
    };
  } catch (error) {
    console.error('调整星探等级失败:', error);
    return { success: false, error: '等级调整失败：' + error.message };
  }
}

// 修改候选人与星探的归属关系
async function updateCandidateReferral(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }
  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以修改推荐关系' };
  }

  const { candidateId, newScoutId, reason } = data;
  if (!candidateId) {
    return { success: false, error: '缺少候选人ID' };
  }

  try {
    // 1. 获取候选人信息
    const candidateRes = await db.collection('candidates').doc(candidateId).get();
    if (!candidateRes.data) {
      return { success: false, error: '候选人不存在' };
    }
    const candidate = candidateRes.data;
    const oldReferral = candidate.referral || null;
    const oldScoutId = oldReferral?.scoutId || null;

    // 移除推荐关系
    if (!newScoutId) {
      if (!oldScoutId) {
        return { success: false, error: '该候选人没有推荐星探' };
      }

      await db.collection('candidates').doc(candidateId).update({
        data: { referral: _.remove(), updatedAt: db.serverDate() }
      });

      // 回滚旧星探统计
      const oldUpdate = { 'stats.referredCount': _.inc(-1), updatedAt: db.serverDate() };
      if (candidate.status === 'signed') {
        oldUpdate['stats.signedCount'] = _.inc(-1);
      }
      try {
        await db.collection('scouts').doc(oldScoutId).update({ data: oldUpdate });
      } catch (err) {
        console.error('[admin] 回滚旧星探统计失败:', err);
      }

      await logAuditAction('remove_candidate_referral', user.username, candidateId, {
        candidateName: candidate.basicInfo?.name || '-',
        oldScoutName: oldReferral?.scoutName || '-',
        reason: reason || '无'
      });

      return { success: true, message: '已移除推荐关系' };
    }

    // 变更推荐星探
    if (oldScoutId === newScoutId) {
      return { success: false, error: '新星探与当前星探相同' };
    }

    // 2. 获取新星探信息
    const newScoutRes = await db.collection('scouts').doc(newScoutId).get();
    if (!newScoutRes.data) {
      return { success: false, error: '目标星探不存在' };
    }
    const newScout = newScoutRes.data;
    if (newScout.status !== 'active') {
      return { success: false, error: '目标星探状态异常，无法分配' };
    }

    // 3. 更新候选人的 referral
    const newReferral = {
      scoutId: newScoutId,
      scoutName: newScout.profile?.name || '-',
      scoutShareCode: newScout.shareCode || '',
      scoutGrade: newScout.grade || 'rookie',
      referredAt: oldReferral?.referredAt || db.serverDate(),
      reassignedAt: db.serverDate(),
      reassignedBy: user.username
    };

    await db.collection('candidates').doc(candidateId).update({
      data: { referral: newReferral, updatedAt: db.serverDate() }
    });

    // 4. 回滚旧星探统计
    if (oldScoutId) {
      const oldUpdate = { 'stats.referredCount': _.inc(-1), updatedAt: db.serverDate() };
      if (candidate.status === 'signed') {
        oldUpdate['stats.signedCount'] = _.inc(-1);
      }
      try {
        await db.collection('scouts').doc(oldScoutId).update({ data: oldUpdate });
      } catch (err) {
        console.error('[admin] 回滚旧星探统计失败:', err);
      }
    }

    // 5. 增加新星探统计
    const newUpdate = { 'stats.referredCount': _.inc(1), updatedAt: db.serverDate() };
    if (candidate.status === 'signed') {
      newUpdate['stats.signedCount'] = _.inc(1);
    }
    await db.collection('scouts').doc(newScoutId).update({ data: newUpdate });

    // 6. 审计日志
    await logAuditAction('update_candidate_referral', user.username, candidateId, {
      candidateName: candidate.basicInfo?.name || '-',
      oldScoutName: oldReferral?.scoutName || '无',
      newScoutName: newScout.profile?.name || '-',
      reason: reason || '无'
    });

    return { success: true, message: '推荐关系变更成功' };
  } catch (error) {
    console.error('修改推荐关系失败:', error);
    return { success: false, error: '修改推荐关系失败：' + error.message };
  }
}

// 停用星探（软禁用，保留数据）
async function deleteScout(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以停用星探' };
  }

  const { scoutId } = data;

  try {
    const scoutRes = await db.collection('scouts').doc(scoutId).get();
    if (!scoutRes.data) {
      return { success: false, error: '星探不存在' };
    }

    const scout = scoutRes.data;

    await db.collection('scouts').doc(scoutId).update({
      data: {
        status: 'disabled',
        disabledAt: db.serverDate(),
        disabledBy: user._id,
        updatedAt: db.serverDate()
      }
    });

    await logAuditAction(
      'disable_scout',
      user.username,
      scoutId,
      {
        scoutName: scout.profile?.name || '-',
        scoutGrade: SCOUT_GRADES[scout.grade]?.zh || scout.grade || 'unknown'
      }
    );

    return { success: true, message: '停用成功' };
  } catch (error) {
    console.error('停用星探失败:', error);
    return { success: false, error: '停用失败：' + error.message };
  }
}

// 硬删除星探（从数据库彻底删除）
async function hardDeleteScout(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以删除星探' };
  }

  const { scoutId } = data;

  try {
    const scoutRes = await db.collection('scouts').doc(scoutId).get();
    if (!scoutRes.data) {
      return { success: false, error: '星探不存在' };
    }

    const scout = scoutRes.data;

    await db.collection('scouts').doc(scoutId).remove();

    await logAuditAction(
      'hard_delete_scout',
      user.username,
      scoutId,
      {
        scoutName: scout.profile?.name || '-',
        scoutGrade: SCOUT_GRADES[scout.grade]?.zh || scout.grade || 'unknown'
      }
    );

    return { success: true, message: '删除成功，数据已彻底清除' };
  } catch (error) {
    console.error('硬删除星探失败:', error);
    return { success: false, error: '删除失败：' + error.message };
  }
}

// 恢复星探（从停用状态恢复为活跃）
async function restoreScout(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以恢复星探' };
  }

  const { scoutId } = data;

  try {
    const scoutRes = await db.collection('scouts').doc(scoutId).get();
    if (!scoutRes.data) {
      return { success: false, error: '星探不存在' };
    }

    const scout = scoutRes.data;

    await db.collection('scouts').doc(scoutId).update({
      data: {
        status: 'active',
        disabledAt: _.remove(),
        disabledBy: _.remove(),
        deletedAt: _.remove(),
        deletedBy: _.remove(),
        updatedAt: db.serverDate()
      }
    });

    await logAuditAction(
      'restore_scout',
      user.username,
      scoutId,
      {
        scoutName: scout.profile?.name || '-',
        scoutGrade: SCOUT_GRADES[scout.grade]?.zh || scout.grade || 'unknown'
      }
    );

    return { success: true, message: '恢复成功' };
  } catch (error) {
    console.error('恢复星探失败:', error);
    return { success: false, error: '恢复失败：' + error.message };
  }
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

// 上传试镜视频
async function uploadAuditionVideos(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 检查是否有上传面试资料权限（试镜视频与面试资料使用相同权限）
  if (!user.permissions.uploadInterviewMaterials) {
    return { success: false, error: '无权限上传试镜视频' };
  }

  const { candidateId, auditionVideos } = data;

  if (!candidateId || !auditionVideos || !Array.isArray(auditionVideos)) {
    return { success: false, error: '缺少必要参数' };
  }

  // 验证视频数据结构
  const requiredFields = ['url', 'fileID', 'cloudPath', 'duration', 'size'];
  for (let i = 0; i < auditionVideos.length; i++) {
    const video = auditionVideos[i];
    for (const field of requiredFields) {
      if (!video[field]) {
        return {
          success: false,
          error: `视频 ${i + 1} 缺少必要字段: ${field}`
        };
      }
    }

    // 验证数据类型
    if (typeof video.duration !== 'number' || video.duration <= 0) {
      return { success: false, error: `视频 ${i + 1} 的时长无效` };
    }
    if (typeof video.size !== 'number' || video.size <= 0) {
      return { success: false, error: `视频 ${i + 1} 的大小无效` };
    }
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
      return { success: false, error: '无权限操作该候选人' };
    }
  }

  // 获取现有视频
  const existingVideos = candidateRes.data.auditionVideos || [];

  // 合并新旧视频，去重（根据 fileID）
  const videoMap = new Map();

  // 先添加现有视频
  existingVideos.forEach(video => {
    if (video.fileID) {
      videoMap.set(video.fileID, video);
    }
  });

  // 再添加新视频（会覆盖同 fileID 的旧视频）
  auditionVideos.forEach(video => {
    videoMap.set(video.fileID, video);
  });

  // 转换为数组，限制最多3个（保留最新的）
  const mergedVideos = Array.from(videoMap.values()).slice(-3);

  // 验证合并后的视频数量
  if (mergedVideos.length > 3) {
    return { success: false, error: '试镜视频总数不能超过3个' };
  }

  // 更新候选人的试镜视频
  await db.collection('candidates').doc(candidateId).update({
    data: {
      auditionVideos: mergedVideos,
      updatedAt: db.serverDate()
    }
  });

  // 记录操作日志
  await logAuditAction(
    'upload_audition_videos',
    user.username,
    candidateId,
    {
      candidateName: candidateRes.data.basicInfo?.name || '-',
      videoCount: auditionVideos.length
    }
  );

  return {
    success: true,
    message: '试镜视频上传成功'
  };
}

// ==================== 用户申请和审核相关 ====================

// 用户申请（无需token）
async function applyUser(data) {
  const { username, password, name, desiredRole, reason } = data;

  // 验证必填字段
  if (!username || !password || !name || !desiredRole) {
    return { success: false, error: '用户名、密码、姓名和期望角色为必填项' };
  }

  // 验证用户名格式（字母、数字、下划线，3-20位）
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { success: false, error: '用户名只能包含字母、数字、下划线，长度3-20位' };
  }

  // 验证密码长度
  if (password.length < 6) {
    return { success: false, error: '密码长度不能少于6位' };
  }

  // 验证姓名长度和格式（1-20个字符，不允许特殊符号）
  if (name.length < 1 || name.length > 20) {
    return { success: false, error: '姓名长度应在1-20个字符之间' };
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(name)) {
    return { success: false, error: '姓名只能包含中文、英文和空格' };
  }

  // 验证期望角色是否有效
  const validRoles = ['hr', 'agent', 'operations', 'trainer'];
  if (!validRoles.includes(desiredRole)) {
    return { success: false, error: '无效的角色选择' };
  }

  // 验证申请理由长度（最多500字符）
  if (reason && reason.length > 500) {
    return { success: false, error: '申请理由不能超过500字符' };
  }

  try {
    // 检查用户名是否已存在
    const existingUser = await db.collection('admins').where({
      username: username
    }).get();

    if (existingUser.data.length > 0) {
      return { success: false, error: '用户名已存在' };
    }

    // 密码加密
    const crypto = require('crypto');
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // 创建待审核用户
    await db.collection('admins').add({
      data: {
        username,
        password: hashedPassword,
        name,
        role: 'pending',
        status: 'pending',
        application: {
          desiredRole: desiredRole,
          reason: reason || '',
          appliedAt: db.serverDate(),
          status: 'pending'
        },
        permissions: {},
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '申请已提交，请等待管理员审核'
    };
  } catch (error) {
    console.error('用户申请失败:', error);
    return { success: false, error: '申请提交失败：' + error.message };
  }
}

// 获取用户列表
async function getUserList(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 权限检查 - 只有管理员可以查看
  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以查看用户列表' };
  }

  const { status } = data;

  try {
    let query = db.collection('admins');

    // 按状态筛选
    if (status) {
      query = query.where({ status });
    }

    const res = await query
      .orderBy('createdAt', 'desc')
      .get();

    // 统计待审核数量
    const pendingRes = await db.collection('admins').where({
      status: 'pending'
    }).count();

    return {
      success: true,
      data: res.data.map(u => ({
        ...u,
        password: undefined // 移除密码字段
      })),
      pendingCount: pendingRes.total
    };
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return { success: false, error: '获取用户列表失败：' + error.message };
  }
}

// 审核用户
async function reviewUser(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 权限检查 - 只有管理员可以审核
  if (!user.permissions.manageUsers) {
    return { success: false, error: '只有管理员可以审核用户' };
  }

  const { userId, approved, role, note } = data;

  if (!userId) {
    return { success: false, error: '缺少用户ID' };
  }

  try {
    // 获取待审核用户信息
    const userRes = await db.collection('admins').doc(userId).get();
    if (!userRes.data) {
      return { success: false, error: '用户不存在' };
    }

    const targetUser = userRes.data;

    // 验证用户状态
    if (targetUser.status !== 'pending') {
      return { success: false, error: '该用户已审核过' };
    }

    const updateData = {
      updatedAt: db.serverDate()
    };

    if (approved) {
      // 通过审核
      if (!role) {
        return { success: false, error: '请选择要分配的角色' };
      }

      // 验证角色有效性
      const validRoles = ['admin', 'hr', 'agent', 'operations', 'trainer'];
      if (!validRoles.includes(role)) {
        return { success: false, error: '无效的角色' };
      }

      // 设置角色和权限
      updateData.role = role;
      updateData.status = 'active';
      updateData.permissions = ROLE_PERMISSIONS[role] || {};
      updateData['application.status'] = 'approved';
      updateData.review = {
        reviewedBy: user._id,
        reviewedByName: user.username,
        reviewedAt: db.serverDate(),
        reviewNote: note || '',
        assignedRole: role
      };
    } else {
      // 拒绝申请
      updateData.status = 'rejected';
      updateData['application.status'] = 'rejected';
      updateData.review = {
        reviewedBy: user._id,
        reviewedByName: user.username,
        reviewedAt: db.serverDate(),
        reviewNote: note || ''
      };
    }

    // 更新用户状态
    await db.collection('admins').doc(userId).update({
      data: updateData
    });

    // 记录操作日志
    await logAuditAction(
      approved ? 'approve_user_application' : 'reject_user_application',
      user.username,
      userId,
      {
        targetUsername: targetUser.username,
        targetName: targetUser.name,
        assignedRole: role || '',
        reviewNote: note || ''
      }
    );

    return {
      success: true,
      message: approved ? '审核通过' : '已拒绝申请'
    };
  } catch (error) {
    console.error('审核用户失败:', error);
    return { success: false, error: '审核失败：' + error.message };
  }
}

