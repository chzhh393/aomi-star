// 云函数入口文件 - 管理后台
const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const crypto = require('crypto');

const db = cloud.database();
const _ = db.command;
const FINANCE_PROCUREMENT_COLLECTION = 'finance_procurements';
const FINANCE_VENDOR_SETTLEMENT_COLLECTION = 'finance_vendor_settlements';
const FINANCE_BOSS_ALERT_COLLECTION = 'finance_boss_alerts';
const PROCUREMENT_BOSS_APPROVAL_THRESHOLD = 5000;
const COMMISSION_FREEZE_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen'
};
const FINANCE_PROCUREMENT_DEMO_RECORDS = [
  {
    bizNo: 'PO-202603-018',
    category: '直播耗材',
    itemName: '补光灯电池与快充套组',
    requester: '行政采购',
    department: '后勤',
    amount: 2680,
    priority: 'high',
    status: 'pending',
    quantity: '12 套',
    remark: '本周 3 个直播间连续排班，现库存只能支撑 2 天。',
    requestedAt: '2026-03-25 10:20'
  },
  {
    bizNo: 'PO-202603-019',
    category: '服装道具',
    itemName: '舞蹈直播训练服',
    requester: '舞蹈组',
    department: '培训部',
    amount: 4860,
    priority: 'medium',
    status: 'pending',
    quantity: '18 套',
    remark: '训练营新主播入营，需要统一尺码与款式。',
    requestedAt: '2026-03-25 14:35'
  },
  {
    bizNo: 'PO-202603-021',
    category: '直播设备',
    itemName: '直播间导播切换台',
    requester: '直播技术组',
    department: '运营部',
    amount: 9800,
    priority: 'high',
    status: 'pending_boss',
    quantity: '1 台',
    remark: '现有导播设备频繁掉帧，财务已初审，待老板确认预算。',
    requestedAt: '2026-03-26 09:20',
    reviewNote: '金额超过 5000 元，提交老板审批',
    financeReviewNote: '金额超过 5000 元，提交老板审批'
  },
  {
    bizNo: 'PO-202603-012',
    category: '日常补给',
    itemName: '饮用水与零食补货',
    requester: '行政采购',
    department: '后勤',
    amount: 1320,
    priority: 'low',
    status: 'approved',
    quantity: '1 批',
    remark: '已通过审批，等待供应商送货。',
    requestedAt: '2026-03-22 09:10'
  },
  {
    bizNo: 'PO-202603-009',
    category: '化妆耗材',
    itemName: '卸妆棉与定妆喷雾',
    requester: '形象组',
    department: '形象部',
    amount: 960,
    priority: 'low',
    status: 'rejected',
    quantity: '1 批',
    remark: '现有库存尚可支撑一周，驳回后合并到月采计划。',
    requestedAt: '2026-03-20 17:00'
  }
];
const FINANCE_VENDOR_SETTLEMENT_DEMO_RECORDS = [
  {
    bizNo: 'VN-202603-031',
    vendorName: '舞蹈老师课时费',
    vendorType: '老师课时费',
    amount: 18600,
    status: 'pending',
    cycle: '2026-03-01 至 2026-03-25',
    owner: '培训部',
    note: '本月共 62 节课，含两次周末加班训练。',
    dueDate: '2026-03-28'
  },
  {
    bizNo: 'VN-202603-029',
    vendorName: 'ZGA 海外推广',
    vendorType: '外部合作',
    amount: 21800,
    status: 'pending',
    cycle: '2026-03 月度账单',
    owner: '外部合作',
    note: '对方已回传对账单，等待财务确认付款批次。',
    dueDate: '2026-03-30'
  },
  {
    bizNo: 'VN-202603-027',
    vendorName: '剪辑团队月结',
    vendorType: '内容制作',
    amount: 12400,
    status: 'paid',
    cycle: '2026-03 月度账单',
    owner: '运营部',
    note: '已随上周批次完成付款。',
    dueDate: '2026-03-26'
  }
];

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
    scoreInterview: true,
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
    scoreInterview: true,
    updateStatus: false,
    exportData: true,
    viewAuditLog: true,
    manageUsers: false,
    assignCandidates: false
  },
  finance: {
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
  },
  dance_teacher: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: false,
    scoreInterview: true,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  },
  photographer: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: true,
    scoreInterview: false,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  },
  makeup_artist: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: false,
    scoreInterview: true,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  },
  stylist: {
    viewPersonalInfo: false,
    viewReferralInfo: false,
    uploadInterviewMaterials: false,
    scoreInterview: true,
    updateStatus: false,
    exportData: false,
    viewAuditLog: false,
    manageUsers: false,
    assignCandidates: false
  },
  host_mc: {
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

const REVIEWER_ROLES = ['hr', 'agent', 'operations', 'trainer', 'dance_teacher', 'photographer', 'host_mc', 'makeup_artist', 'stylist'];
const CONTRACT_WORKFLOW_STATUS = {
  drafting: 'drafting',
  financeReview: 'finance_review',
  adminReview: 'admin_review',
  negotiating: 'negotiating',
  readyToSign: 'ready_to_sign',
  signed: 'signed'
};
const CONTRACT_NEGOTIATION_STATUS = {
  pending: 'pending',
  inProgress: 'in_progress',
  revising: 'revising',
  agreed: 'agreed'
};

function isReviewerRole(role) {
  return REVIEWER_ROLES.includes(role);
}

function hasGlobalCandidateAccess(user) {
  const role = user?.role || '';
  return ['admin', 'hr', 'operations', 'finance'].includes(role);
}

function normalizeReviewStatus(status) {
  if (status === 'pending_score') return 'pending_review';
  if (status === 'scored') return 'reviewed';
  return status || 'all';
}

function normalizePlainText(value, maxLength = 5000) {
  return String(value || '').trim().slice(0, maxLength);
}

function buildOperatorInfo(user) {
  return {
    id: user?._id || '',
    role: user?.role || '',
    name: user?.name || user?.username || ''
  };
}

function createDefaultContractWorkflow() {
  return {
    status: CONTRACT_WORKFLOW_STATUS.drafting,
    recommendation: null,
    draft: {
      title: '',
      type: '',
      durationMonths: null,
      salary: null,
      commission: null,
      fileUrl: '',
      fileName: '',
      remark: '',
      updatedAt: null,
      updatedBy: null
    },
    financeReview: {
      status: 'pending',
      comment: '',
      reviewedAt: null,
      reviewedBy: null
    },
    adminApproval: {
      status: 'pending',
      comment: '',
      reviewedAt: null,
      reviewedBy: null
    },
    negotiation: {
      status: CONTRACT_NEGOTIATION_STATUS.pending,
      note: '',
      updatedAt: null,
      updatedBy: null
    },
    eSign: {
      provider: 'fadada',
      mode: 'mock',
      status: 'not_started',
      signUrl: '',
      contractNo: '',
      taskId: '',
      lastMessage: '',
      initiatedAt: null,
      initiatedBy: null,
      signedAt: null,
      lastSyncedAt: null
    },
    createdAt: null,
    createdBy: null,
    updatedAt: null,
    updatedBy: null
  };
}

function normalizeContractWorkflow(workflow = {}) {
  const base = createDefaultContractWorkflow();
  const source = workflow && typeof workflow === 'object' ? workflow : {};
  return {
    ...base,
    ...source,
    draft: {
      ...base.draft,
      ...(source.draft || {})
    },
    financeReview: {
      ...base.financeReview,
      ...(source.financeReview || {})
    },
    adminApproval: {
      ...base.adminApproval,
      ...(source.adminApproval || {})
    },
    negotiation: {
      ...base.negotiation,
      ...(source.negotiation || {})
    },
    eSign: {
      ...base.eSign,
      ...(source.eSign || {})
    }
  };
}

function getFadadaRuntimeConfig() {
  const appId = normalizePlainText(process.env.FADADA_APP_ID, 200);
  const appSecret = normalizePlainText(process.env.FADADA_APP_SECRET, 200);
  const createUrl = normalizePlainText(process.env.FADADA_CREATE_SIGN_URL, 1000);
  const queryUrl = normalizePlainText(process.env.FADADA_QUERY_SIGN_URL, 1000);
  const environment = normalizePlainText(process.env.FADADA_ENVIRONMENT, 50) || 'sandbox';

  return {
    appId,
    appSecret,
    createUrl,
    queryUrl,
    environment,
    ready: Boolean(appId && appSecret && createUrl && queryUrl)
  };
}

function postJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search || ''}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode || 0,
            data: parsed
          });
        } catch (error) {
          reject(new Error(`法大大接口返回非 JSON：${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload || {}));
    req.end();
  });
}

async function computeContractRecommendation(candidate) {
  const decisionPassed = candidate?.interviewFinalDecision?.decision === 'accepted';
  if (!decisionPassed) {
    return {
      eligible: false,
      allS: false,
      reason: '面试终裁尚未通过'
    };
  }

  const assignedInterviewers = Array.isArray(candidate?.interview?.interviewers)
    ? candidate.interview.interviewers.length
    : 0;

  const evaluationRes = await db.collection('interview_evaluations').where({
    candidateId: candidate._id,
    status: 'submitted',
    deletedAt: _.exists(false)
  }).get();

  const evaluations = evaluationRes.data || [];
  if (!evaluations.length) {
    return {
      eligible: true,
      allS: false,
      reason: '暂无完整的面试评价数据'
    };
  }

  if (assignedInterviewers > 0 && evaluations.length < assignedInterviewers) {
    return {
      eligible: true,
      allS: false,
      reason: `面试反馈未全部提交（${evaluations.length}/${assignedInterviewers}）`
    };
  }

  const allS = evaluations.every((item) => {
    const dimensions = item?.dimensions || {};
    const values = Object.values(dimensions).filter(Boolean);
    return values.length > 0 && values.every((value) => value === 'S');
  });

  return {
    eligible: true,
    allS,
    reason: allS ? '全部面试官维度评分均为 S，可优先推进签约流程' : '已终裁通过，可进入签约流程'
  };
}

function hasCompletedReview(candidate, role) {
  if (!candidate) return false;

  switch (normalizeRoleKey(role)) {
    case 'admin':
    case 'hr':
    case 'agent':
      return !!candidate.interview?.score?.result;
    case 'operations':
      return !!candidate.evaluations?.operations;
    case 'trainer':
      return !!candidate.evaluations?.trainer;
    case 'dance_teacher':
    case 'danceTeacher':
      return !!candidate.evaluations?.danceTeacher;
    case 'makeup_artist':
    case 'makeupArtist':
      return !!candidate.evaluations?.makeupArtist;
    case 'stylist':
      return !!candidate.evaluations?.stylist;
    case 'photographer':
      return !!(
        candidate.evaluations?.photographer ||
        candidate.interviewMaterials?.photographer ||
        candidate.interview?.materials?.photos?.length ||
        candidate.interview?.materials?.videos?.length
      );
    case 'host_mc':
    case 'hostMc':
      return !!candidate.evaluations?.hostMc;
    default:
      return false;
  }
}

function isCandidateActive(candidate) {
  if (!candidate) {
    return false;
  }

  return !candidate.deletedAt;
}

function attachCandidateInterviewProgress(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return candidate;
  }

  const summary = candidate.interviewEvaluationSummary || {};
  const progress = summary.progress && typeof summary.progress === 'object'
    ? summary.progress
    : null;

  if (!progress) {
    return candidate;
  }

  return {
    ...candidate,
    interviewProgress: progress,
    interviewFinalDecision: candidate.interviewFinalDecision || summary.finalDecision || null
  };
}

function isCandidateAssignedToReviewer(candidate, user) {
  if (!candidate || !user || !user.role) {
    return false;
  }

  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    return assignedIds.includes(candidate._id);
  }

  const interviewerRole = normalizeRoleKey(user.role);
  const interviewers = Array.isArray(candidate.interview?.interviewers)
    ? candidate.interview.interviewers
    : [];

  if (interviewers.length === 0) {
    return false;
  }

  const userIdentifiers = [
    user._id,
    user.username,
    user.name
  ].filter(Boolean).map(value => String(value));

  return interviewers.some((interviewer) => {
    if (typeof interviewer === 'string') {
      return userIdentifiers.includes(String(interviewer));
    }

    const roleMatch = normalizeRoleKey(interviewer?.role || interviewer?.key || interviewer?.type) === interviewerRole;
    if (!roleMatch) {
      return false;
    }

    const interviewerIdentifiers = [
      interviewer?._id,
      interviewer?.id,
      interviewer?.userId,
      interviewer?.adminId,
      interviewer?.username,
      interviewer?.account,
      interviewer?.name
    ].filter(Boolean).map(value => String(value));

    return interviewerIdentifiers.some(value => userIdentifiers.includes(value));
  });
}

function getDanceCourseBooking(candidate) {
  const booking = candidate?.trainingCamp?.danceCourseBooking;
  return booking && typeof booking === 'object' ? booking : null;
}

function canDanceTeacherAccessTrainingCandidate(candidate, user) {
  if (!candidate || !user) {
    return false;
  }

  const booking = getDanceCourseBooking(candidate);
  if (!booking) {
    return false;
  }

  const userIdentifiers = [
    user._id,
    user.username,
    user.name
  ].filter(Boolean).map(value => String(value));

  const bookingIdentifiers = [
    booking.teacherId,
    booking.teacherUserId,
    booking.teacherUsername,
    booking.teacherName
  ].filter(Boolean).map(value => String(value));

  return bookingIdentifiers.some(value => userIdentifiers.includes(value));
}

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
  reviewResult: '-0O7BnI57E_sDWOYezEjF8hlFAB3kaWQPOniWmkDXvc', // 报名审核通知
  interviewSchedule: 'AzXHROkY7zpm1KJXL8qC3cxex3RZii_37KUuETS5p_I', // 面试安排
  bossProcurementAlert: 'AzXHROkY7zpm1KJXL8qC3cxex3RZii_37KUuETS5p_I' // 复用通用提醒模板
};

const SUBSCRIBE_PAGE = 'pages/recruit/status/status';

function truncateText(value, max = 20) {
  const text = String(value || '');
  return [...text].slice(0, max).join('');
}

function formatDateTime(date = new Date()) {
  // 云函数运行在 UTC 时区，需转换为北京时间（UTC+8）
  const bjTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bjTime.getUTCDate()).padStart(2, '0');
  const hour = String(bjTime.getUTCHours()).padStart(2, '0');
  const minute = String(bjTime.getUTCMinutes()).padStart(2, '0');
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

function formatInviteDateParts(dateText) {
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      year: '',
      month: '',
      day: ''
    };
  }

  return {
    year: match[1],
    month: String(Number(match[2])),
    day: String(Number(match[3]))
  };
}

const TRAINING_CAMP_TYPE_MAP = {
  '基础训练营': '新星训练营',
  '新星': '新星训练营',
  '新星训练营': '新星训练营',
  '早早鸟': '早早鸟训练营',
  '早早鸟训练营': '早早鸟训练营'
};

function normalizeTrainingCampType(campType) {
  const normalized = String(campType || '').trim();
  return TRAINING_CAMP_TYPE_MAP[normalized] || '';
}

function buildTrainingCampInvitation(candidate, campType, startDate, startTime, remark = '') {
  const name = candidate?.basicInfo?.name || '候选人';
  const { year, month, day } = formatInviteDateParts(startDate);
  const noticeDate = formatInviteDateParts(formatDateTime().slice(0, 10));
  const dateText = month && day ? `${month}月${day}日` : (startDate || '待通知');
  const timeText = startTime || '13:00';
  const campText = normalizeTrainingCampType(campType) || '新星训练营';
  const remarkText = remark ? `\n补充说明：${remark}` : '';

  return [
    `Hi ${name}：`,
    `       衷心感谢您对奥米光年的信任与耐心等待，我们非常荣幸地通知您：经过综合的评审与选拔，您已入选${campText}！`,
    '       感谢你对我们的坚定选择。接下来的一周，我们将为你准备系统化的专业打磨，助力你全方位进化，向着舞台中心更进一步。',
    `       如果你已经准备好迎接挑战，请直接点击“确认入营”，并于${dateText}${timeText}到公司报到。期待在奥米光年遇见发光的你！${remarkText}`,
    '                  奥米光年 选拔组',
    `                  ${noticeDate.year || year || '2026'}年${noticeDate.month || month || 'X'}月${noticeDate.day || day || 'X'}日`
  ].join('\n');
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
      thing1: { value: truncateText('主播报名') },
      date2: { value: formatDateTime() },
      thing3: { value: truncateText(targetName) },
      phrase4: { value: statusText }
    },
    {
      thing1: { value: truncateText('主播报名') },
      time2: { value: formatDateTime() },
      thing3: { value: truncateText(targetName) },
      phrase4: { value: statusText }
    }
  ];

  // 审核通过跳转面试邀请详情页，拒绝跳转状态页
  const candidateId = candidate._id || '';
  const reviewPage = (status === 'approved' && candidateId)
    ? `pages/recruit/interview-invite/interview-invite?id=${candidateId}`
    : SUBSCRIBE_PAGE;

  for (let i = 0; i < dataCandidates.length; i++) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: candidate.openId,
        templateId: SUBSCRIBE_TEMPLATE.reviewResult,
        page: reviewPage,
        data: dataCandidates[i]
      });
      console.log(`[admin] 审核结果 订阅消息发送成功，dataPattern=${i + 1}，跳转页面=${reviewPage}`);
      return true;
    } catch (error) {
      console.warn(`[admin] 审核结果 订阅消息发送失败，dataPattern=${i + 1}:`, {
        errCode: error.errCode,
        errMsg: error.errMsg || error.message
      });
    }
  }
}

async function sendInterviewScheduleNotification(candidate, interview) {
  if (!candidate || !candidate.openId || !interview) {
    return;
  }

  const scheduleTime = formatInterviewTime(interview.date, interview.time);
  const locationText = truncateText(interview.location || '面试地点待确认');
  const interviewerText = normalizeInterviewerText(interview.interviewers);
  const note = truncateText(interview.notes || interviewerText || '点击查看面试详情');

  // 面试安排通知跳转到面试邀请详情页
  const candidateId = candidate._id || '';
  const interviewPage = candidateId
    ? `pages/recruit/interview-invite/interview-invite?id=${candidateId}`
    : SUBSCRIBE_PAGE;

  const dataCandidates = [
    {
      thing1: { value: truncateText('主播面试') },
      time2: { value: scheduleTime },
      thing3: { value: locationText },
      thing4: { value: note },
      thing5: { value: truncateText('点击查看面试详情') }
    },
    {
      thing1: { value: truncateText('主播面试') },
      date2: { value: scheduleTime },
      thing3: { value: locationText },
      thing4: { value: note },
      thing5: { value: truncateText('点击查看面试详情') }
    }
  ];

  for (let i = 0; i < dataCandidates.length; i++) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: candidate.openId,
        templateId: SUBSCRIBE_TEMPLATE.interviewSchedule,
        page: interviewPage,
        data: dataCandidates[i]
      });
      console.log(`[admin] 面试安排 订阅消息发送成功，dataPattern=${i + 1}，跳转页面=${interviewPage}`);
      return true;
    } catch (error) {
      console.warn(`[admin] 面试安排 订阅消息发送失败，dataPattern=${i + 1}:`, {
        errCode: error.errCode,
        errMsg: error.errMsg || error.message
      });
    }
  }

  return false;
}

async function getBossAdmins() {
  const res = await db.collection('admins').where({
    role: 'admin',
    status: 'active'
  }).get().catch(() => ({ data: [] }));

  return (res.data || []).filter((item) => item?.openId);
}

async function createBossAlertLog(payload = {}) {
  try {
    await db.collection(FINANCE_BOSS_ALERT_COLLECTION).add({
      data: {
        type: normalizePlainText(payload.type, 50) || 'procurement_pending',
        relatedId: normalizePlainText(payload.relatedId, 100),
        procurementId: normalizePlainText(payload.procurementId, 100),
        candidateId: normalizePlainText(payload.candidateId, 100),
        adminId: normalizePlainText(payload.adminId, 100),
        adminName: normalizePlainText(payload.adminName, 100),
        openId: normalizePlainText(payload.openId, 100),
        status: normalizePlainText(payload.status, 40) || 'sent',
        title: normalizePlainText(payload.title, 100),
        summary: normalizePlainText(payload.summary, 300),
        detail: normalizePlainText(payload.detail, 1000),
        sentAt: db.serverDate(),
        processedAt: null,
        processedBy: {},
        resultNote: normalizePlainText(payload.resultNote, 500),
        attemptCount: toNumber(payload.attemptCount, 1) || 1,
        failureCategory: normalizePlainText(payload.failureCategory, 50),
        lastErrorCode: normalizePlainText(payload.lastErrorCode, 50),
        metadata: payload.metadata || {},
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
  } catch (error) {
    console.error('[admin] 写入老板提醒台账失败:', error);
  }
}

function classifyBossAlertError(error = {}) {
  const errCode = String(error?.errCode || error?.code || '');
  const errMsg = String(error?.errMsg || error?.message || '');
  const normalized = `${errCode} ${errMsg}`.toLowerCase();

  if (normalized.includes('openid') || normalized.includes('用户未找到')) {
    return {
      category: 'openid_missing',
      label: 'openId 未绑定',
      resultNote: '老板账号未绑定 openId，请重新登录老板账号'
    };
  }

  if (normalized.includes('subscribe') || normalized.includes('accept') || normalized.includes('reject') || normalized.includes('43101')) {
    return {
      category: 'subscribe_denied',
      label: '未订阅消息',
      resultNote: '老板未授权订阅提醒，请在老板看板重新开启手机提醒'
    };
  }

  if (normalized.includes('template') || normalized.includes('43100') || normalized.includes('40037')) {
    return {
      category: 'template_invalid',
      label: '模板异常',
      resultNote: '订阅消息模板异常，请检查模板配置'
    };
  }

  return {
    category: 'unknown',
    label: '其他错误',
    resultNote: normalizePlainText(errMsg || '订阅消息发送失败', 500)
  };
}

async function markBossAlertsProcessed(procurementId, processedBy, resultStatus, resultNote = '') {
  if (!procurementId) {
    return;
  }

  const res = await db.collection(FINANCE_BOSS_ALERT_COLLECTION).where({
    procurementId,
    status: _.in(['sent', 'failed'])
  }).get().catch(() => ({ data: [] }));

  const alerts = res.data || [];
  await Promise.all(alerts.map((item) => db.collection(FINANCE_BOSS_ALERT_COLLECTION).doc(item._id).update({
    data: {
      status: resultStatus,
      processedAt: db.serverDate(),
      processedBy: processedBy || {},
      resultNote: normalizePlainText(resultNote, 500),
      updatedAt: db.serverDate()
    }
  }).catch((error) => {
    console.error('[admin] 更新老板提醒处理状态失败:', item._id, error);
  })));
}

async function sendBossProcurementNotification(procurement = {}) {
  const bosses = await getBossAdmins();
  if (!bosses.length) {
    console.warn('[admin] 未找到已绑定 openId 的老板账号，跳过老板采购提醒');
    return false;
  }

  const amountText = formatCurrency(procurement.amount || 0);

  let sent = false;
  for (const boss of bosses) {
    const sendResult = await sendBossProcurementNotificationWithRetry(procurement, boss, 3);
    sent = sent || sendResult.success;
    if (sendResult.success) {
      console.log(`[admin] 老板采购提醒发送成功：admin=${boss.username || boss._id}，attempts=${sendResult.attemptCount}`);
    }

    await createBossAlertLog({
      type: 'procurement_pending',
      relatedId: procurement._id || procurement.id || '',
      procurementId: procurement._id || procurement.id || '',
      adminId: boss._id || '',
      adminName: boss.name || boss.username || '',
      openId: boss.openId || '',
      status: sendResult.success ? 'sent' : 'failed',
      title: '采购预算审批',
      summary: `${procurement.itemName || '未命名采购项'} ${amountText}`,
      detail: `${procurement.requester || '未填写'} 提交，金额 ${amountText}，请进入老板看板处理。`,
      resultNote: sendResult.success ? '订阅消息已发送' : (sendResult.error || '订阅消息发送失败'),
      attemptCount: sendResult.attemptCount || 1,
      failureCategory: sendResult.success ? '' : (sendResult.category || 'unknown'),
      lastErrorCode: sendResult.success ? '' : (sendResult.errorCode || ''),
      metadata: {
        bizNo: procurement.bizNo || '',
        amount: toNumber(procurement.amount, 0)
      }
    });
  }

  return sent;
}

async function sendBossProcurementNotificationToTarget(procurement = {}, boss = {}) {
  if (!boss?.openId) {
    const info = classifyBossAlertError({ message: '老板账号未绑定 openId' });
    return { success: false, error: info.resultNote, category: info.category, label: info.label, errorCode: 'OPENID_MISSING' };
  }

  const nowText = formatDateTime();
  const page = 'pages/finance/boss-dashboard/boss-dashboard';
  const amountText = formatCurrency(procurement.amount || 0);
  const noteText = truncateText(`${procurement.requester || '未填写'} · ${amountText}`, 20);
  const dataCandidates = [
    {
      thing1: { value: truncateText('采购预算审批') },
      time2: { value: nowText },
      thing3: { value: truncateText(procurement.itemName || '未命名采购项') },
      thing4: { value: noteText },
      thing5: { value: truncateText('点击进入老板看板处理') }
    },
    {
      thing1: { value: truncateText('采购预算审批') },
      date2: { value: nowText },
      thing3: { value: truncateText(procurement.itemName || '未命名采购项') },
      thing4: { value: noteText },
      thing5: { value: truncateText('点击进入老板看板处理') }
    }
  ];

  for (let i = 0; i < dataCandidates.length; i += 1) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: boss.openId,
        templateId: SUBSCRIBE_TEMPLATE.bossProcurementAlert,
        page,
        data: dataCandidates[i]
      });
      return { success: true, attemptPattern: i + 1 };
    } catch (error) {
      console.warn(`[admin] 定向重发老板采购提醒失败：admin=${boss.username || boss._id}，dataPattern=${i + 1}`, {
        errCode: error.errCode,
        errMsg: error.errMsg || error.message
      });
      if (i === dataCandidates.length - 1) {
        const info = classifyBossAlertError(error);
        return {
          success: false,
          error: info.resultNote,
          category: info.category,
          label: info.label,
          errorCode: String(error?.errCode || error?.code || '')
        };
      }
    }
  }

  return { success: false, error: '订阅消息发送失败', category: 'unknown', label: '其他错误', errorCode: '' };
}

async function sendBossProcurementNotificationWithRetry(procurement = {}, boss = {}, maxRetries = 3) {
  let lastResult = {
    success: false,
    error: '订阅消息发送失败',
    category: 'unknown',
    label: '其他错误',
    errorCode: ''
  };

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const result = await sendBossProcurementNotificationToTarget(procurement, boss);
    if (result.success) {
      return {
        ...result,
        attemptCount: attempt
      };
    }
    lastResult = result;
  }

  return {
    ...lastResult,
    attemptCount: maxRetries
  };
}

exports.main = async (event) => {
  const { action, data, token } = event;
  const publicActions = new Set(['login', 'applyUser']);

  console.log('[admin] action:', action);

  try {
    // 公开接口不需要验证 token
    if (!publicActions.has(action) && !(await verifyToken(token))) {
      return { success: false, error: '未授权，请重新登录' };
    }

    switch (action) {
      case 'login':
        return await login(data);
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
      case 'getFinanceDashboard':
        return await getFinanceDashboard(data, token);
      case 'getFinanceContractReviewList':
        return await getFinanceContractReviewList(data, token);
      case 'getFinanceCommissionLedger':
        return await getFinanceCommissionLedger(data, token);
      case 'confirmFinanceCommissionPayment':
        return await confirmFinanceCommissionPayment(data, token);
      case 'sendFinanceCommissionPayslip':
        return await sendFinanceCommissionPayslip(data, token);
      case 'toggleCommissionFreeze':
        return await toggleCommissionFreeze(data, token);

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
      case 'createTrainingCampTodo':
        return await createTrainingCampTodo(data, token);
      case 'getTrainingCampRecords':
        return await getTrainingCampRecords(data, token);
      case 'reviewTrainingCampRecord':
        return await reviewTrainingCampRecord(data, token);
      case 'listDanceCourseSlots':
        return await listDanceCourseSlots(data, token);
      case 'createDanceCourseSlot':
        return await createDanceCourseSlot(data, token);
      case 'updateDanceCourseSlot':
        return await updateDanceCourseSlot(data, token);
      case 'cancelDanceCourseSlot':
        return await cancelDanceCourseSlot(data, token);
      case 'bookDanceCourseSlot':
        return await bookDanceCourseSlot(data, token);
      case 'getDanceTeacherBookings':
        return await getDanceTeacherBookings(data, token);

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

      // 经纪人统计
      case 'getAgentStats':
        return await getAgentStats(token);

      // 面试打分
      case 'scoreInterview':
        return await scoreInterview(data, token);
      case 'submitInterviewerEvaluation':
        return await submitInterviewerEvaluation(data, token);
      case 'getCandidateInterviewEvaluations':
        return await getCandidateInterviewEvaluations(data.id, token);

      // 面试资料上传
      case 'uploadInterviewMaterials':
        return await uploadInterviewMaterials(data, token);
      case 'deleteInterviewMaterial':
        return await deleteInterviewMaterial(data, token);

      // 试镜视频上传
      case 'uploadAuditionVideos':
        return await uploadAuditionVideos(data, token);
      case 'saveContractWorkflowDraft':
        return await saveContractWorkflowDraft(data, token);
      case 'submitContractFinanceReview':
        return await submitContractFinanceReview(data, token);
      case 'reviewContractFinance':
        return await reviewContractFinance(data, token);
      case 'getFinanceProcurementList':
        return await getFinanceProcurementList(data, token);
      case 'reviewFinanceProcurement':
        return await reviewFinanceProcurement(data, token);
      case 'reviewBossProcurement':
        return await reviewBossProcurement(data, token);
      case 'retryBossAlert':
        return await retryBossAlert(data, token);
      case 'getFinanceVendorSettlementList':
        return await getFinanceVendorSettlementList(data, token);
      case 'markFinanceVendorSettlementPaid':
        return await markFinanceVendorSettlementPaid(data, token);
      case 'seedFinanceDemoData':
        return await seedFinanceDemoData(data, token);
      case 'approveContractAdmin':
        return await approveContractAdmin(data, token);
      case 'updateContractNegotiation':
        return await updateContractNegotiation(data, token);
      case 'createContractESignTask':
        return await createContractESignTask(data, token);
      case 'refreshContractESignStatus':
        return await refreshContractESignStatus(data, token);
      case 'mockCompleteContractESign':
        return await mockCompleteContractESign(data, token);
      case 'saveCandidateFollowUp':
        return await saveCandidateFollowUp(data, token);
      case 'saveCandidateAssets':
        return await saveCandidateAssets(data, token);

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
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID || '';
  const res = await db.collection('admins').where({ username }).get();
  if (res.data.length === 0) {
    return { success: false, error: '用户名或密码错误' };
  }

  const admin = res.data[0];
  if (admin.password !== hashPassword(password)) {
    return { success: false, error: '用户名或密码错误' };
  }

  // 检查账号状态
  if (admin.status === 'pending') {
    return { success: false, error: '账号待审核，请联系管理员' };
  }

  if (admin.status === 'rejected') {
    return { success: false, error: '申请未通过，请联系管理员' };
  }

  if (admin.status === 'deleted') {
    return { success: false, error: '账号已停用，请联系管理员' };
  }

  if (admin.status === 'disabled') {
    return { success: false, error: '账号已被禁用，请联系管理员' };
  }

  const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

  // 更新最后登录时间
  await db.collection('admins').doc(admin._id).update({
    data: {
      lastLoginAt: db.serverDate(),
      ...(openId ? { openId } : {})
    }
  });

  // 获取角色权限
  const role = admin.role || 'admin';
  const permissions = ROLE_PERMISSIONS[role];

  return {
    success: true,
    token,
    admin: {
      _id: admin._id,
      username,
      name: admin.name,
      phone: admin.phone || '',
      openId: openId || admin.openId || '',
      status: admin.status || 'active',
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

function assertFinanceAccess(user, allowedRoles = ['finance', 'admin', 'operations']) {
  if (!user) {
    throw new Error('未授权，请重新登录');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error('无权限执行财务操作');
  }
}

function assertBossAccess(user) {
  if (!user) {
    throw new Error('未授权，请重新登录');
  }

  if (user.role !== 'admin') {
    throw new Error('仅老板可执行该操作');
  }
}

function requiresBossApproval(amount) {
  return toNumber(amount, 0) > PROCUREMENT_BOSS_APPROVAL_THRESHOLD;
}

function getProcurementStatusLabel(status) {
  const map = {
    pending: '待财务审批',
    pending_boss: '待老板审批',
    approved: '已通过',
    rejected: '已驳回'
  };
  return map[String(status || '')] || '未知状态';
}

function normalizeCommissionFreezeState(commission = {}) {
  return {
    status: commission?.freezeStatus === COMMISSION_FREEZE_STATUS.FROZEN
      ? COMMISSION_FREEZE_STATUS.FROZEN
      : COMMISSION_FREEZE_STATUS.ACTIVE,
    reason: normalizePlainText(commission?.freezeReason, 500),
    note: normalizePlainText(commission?.freezeNote, 1000),
    updatedAt: commission?.freezeUpdatedAt || null,
    updatedBy: commission?.freezeUpdatedBy || null
  };
}

function normalizeFinanceTimestamp(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === 'object') {
    if (value.$date) {
      return formatDateTime(new Date(value.$date));
    }
    if (value._seconds) {
      return formatDateTime(new Date(value._seconds * 1000));
    }
  }

  return String(value);
}

function mapFinanceProcurementRecord(record = {}) {
  const amount = toNumber(record.amount, 0);
  const requiresBoss = requiresBossApproval(amount);
  const status = String(record.status || 'pending');

  return {
    ...record,
    amount,
    amountText: formatCurrency(amount),
    requiresBossApproval: requiresBoss,
    thresholdAmount: PROCUREMENT_BOSS_APPROVAL_THRESHOLD,
    statusLabel: getProcurementStatusLabel(status),
    canFinanceReview: status === 'pending',
    canBossReview: status === 'pending_boss',
    requestedAtText: normalizeFinanceTimestamp(record.requestedAt || record.createdAt),
    reviewedAtText: normalizeFinanceTimestamp(record.reviewedAt),
    financeReviewedAtText: normalizeFinanceTimestamp(record.financeReviewedAt),
    bossReviewedAtText: normalizeFinanceTimestamp(record.bossReviewedAt),
    createdAtText: normalizeFinanceTimestamp(record.createdAt),
    updatedAtText: normalizeFinanceTimestamp(record.updatedAt)
  };
}

function mapFinanceVendorSettlementRecord(record = {}) {
  return {
    ...record,
    dueDateText: normalizeFinanceTimestamp(record.dueDate),
    paidAtText: normalizeFinanceTimestamp(record.paidAt),
    createdAtText: normalizeFinanceTimestamp(record.createdAt),
    updatedAtText: normalizeFinanceTimestamp(record.updatedAt)
  };
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

  status = normalizeReviewStatus(status);
  let query = db.collection('candidates');

  // 构建筛选条件
  const conditions = {
    // 默认只查询未删除的记录
  };

  if (!isReviewerRole(user.role) || hasGlobalCandidateAccess(user)) {
    conditions.deletedAt = _.exists(false);
  }

  // 面试角色只看自己有权限的候选人
  if (isReviewerRole(user.role) && !hasGlobalCandidateAccess(user)) {
    if (user.role === 'agent') {
      const assignedIds = user.assignedCandidates || [];
      if (assignedIds.length === 0) {
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
  }

  if (status !== 'all' && !['pending_review', 'reviewed'].includes(status)) {
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

  const skip = (page - 1) * pageSize;
  let list = [];
  let total = 0;

  if (isReviewerRole(user.role) && !hasGlobalCandidateAccess(user)) {
    const res = await query
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    list = (res.data || [])
      .filter(candidate => isCandidateActive(candidate))
      .filter(candidate => isCandidateAssignedToReviewer(candidate, user));

    if (status === 'pending_review') {
      list = list.filter(candidate => !hasCompletedReview(candidate, user.role));
    } else if (status === 'reviewed') {
      list = list.filter(candidate => hasCompletedReview(candidate, user.role));
    }

    total = list.length;
    list = list.slice(skip, skip + pageSize);
  } else {
    const countRes = await query.count();
    total = countRes.total;

    const res = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    list = res.data || [];
  }

  if (isReviewerRole(user.role) && !hasGlobalCandidateAccess(user)) {
    list = list.map(candidate => attachCandidateInterviewProgress(desensitizeCandidateForAgent(candidate)));
  } else {
    list = list.map(candidate => attachCandidateInterviewProgress(candidate));
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

  // 面试角色检查是否有权限查看该候选人
  if (isReviewerRole(user.role) && !hasGlobalCandidateAccess(user)) {
    const candidateRes = await db.collection('candidates').doc(id).get();
    if (!candidateRes.data) {
      return { success: false, error: '候选人不存在' };
    }

    if (!isCandidateAssignedToReviewer(candidateRes.data, user)) {
      return { success: false, error: '无权限查看该候选人' };
    }
  }

  const res = await db.collection('candidates').doc(id).get();
  let candidate = res.data;

  // 如果是经纪人，移除敏感信息
  if (isReviewerRole(user.role) && !hasGlobalCandidateAccess(user)) {
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

async function getCandidateForContractWorkflow(candidateId) {
  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data;
  if (!candidate) {
    throw new Error('候选人不存在');
  }

  return candidate;
}

function assertContractAccess(user, candidate, allowedRoles = []) {
  if (!user) {
    throw new Error('未授权，请重新登录');
  }

  if (allowedRoles.includes(user.role)) {
    return;
  }

  if (user.role === 'agent' && candidate?.assignedAgent?.agentId === user._id) {
    return;
  }

  throw new Error('无权限操作签约流程');
}

async function persistContractWorkflow(candidateId, workflow, user, auditAction, details = {}) {
  await db.collection('candidates').doc(candidateId).update({
    data: {
      contractWorkflow: workflow,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    auditAction,
    user.username,
    candidateId,
    details
  );
}

async function saveContractWorkflowDraft(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr']);

  const recommendation = await computeContractRecommendation(candidate);
  if (!recommendation.eligible) {
    throw new Error(recommendation.reason || '当前候选人暂不能进入签约流程');
  }

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  const nextWorkflow = {
    ...currentWorkflow,
    recommendation,
    draft: {
      ...currentWorkflow.draft,
      title: normalizePlainText(data.title, 100),
      type: normalizePlainText(data.type, 40),
      durationMonths: Number(data.durationMonths || data.duration || 0) || null,
      salary: Number(data.salary || 0) || null,
      commission: Number(data.commission || 0) || null,
      fileUrl: normalizePlainText(data.fileUrl, 1000),
      fileName: normalizePlainText(data.fileName, 200),
      remark: normalizePlainText(data.remark, 2000),
      updatedAt: db.serverDate(),
      updatedBy: buildOperatorInfo(user)
    },
    status: currentWorkflow.status === CONTRACT_WORKFLOW_STATUS.signed
      ? CONTRACT_WORKFLOW_STATUS.signed
      : CONTRACT_WORKFLOW_STATUS.drafting,
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user),
    createdAt: currentWorkflow.createdAt || db.serverDate(),
    createdBy: currentWorkflow.createdBy || buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'save_contract_workflow_draft', {
    candidateName: candidate.basicInfo?.name || '',
    status: nextWorkflow.status
  });

  return {
    success: true,
    message: '合同草稿已保存',
    data: nextWorkflow
  };
}

async function submitContractFinanceReview(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr']);

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  if (!currentWorkflow.draft.fileUrl) {
    throw new Error('请先上传合同文件');
  }

  const nextWorkflow = {
    ...currentWorkflow,
    status: CONTRACT_WORKFLOW_STATUS.financeReview,
    financeReview: {
      ...currentWorkflow.financeReview,
      status: 'pending',
      comment: normalizePlainText(data.comment, 2000),
      reviewedAt: null,
      reviewedBy: null
    },
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'submit_contract_finance_review', {
    candidateName: candidate.basicInfo?.name || '',
    status: nextWorkflow.status
  });

  return {
    success: true,
    message: '已提交财务审核',
    data: nextWorkflow
  };
}

async function reviewContractFinance(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'operations', 'finance']);

  const approved = data.approved !== false;
  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  const nextWorkflow = {
    ...currentWorkflow,
    status: approved ? CONTRACT_WORKFLOW_STATUS.adminReview : CONTRACT_WORKFLOW_STATUS.drafting,
    financeReview: {
      ...currentWorkflow.financeReview,
      status: approved ? 'approved' : 'rejected',
      comment: normalizePlainText(data.comment, 2000),
      reviewedAt: db.serverDate(),
      reviewedBy: buildOperatorInfo(user)
    },
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'review_contract_finance', {
    candidateName: candidate.basicInfo?.name || '',
    approved
  });

  return {
    success: true,
    message: approved ? '财务审核已通过' : '财务审核已驳回',
    data: nextWorkflow
  };
}

async function getFinanceProcurementList(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user);

  const status = String(data.status || 'all');
  const query = status !== 'all'
    ? { status, deletedAt: _.exists(false) }
    : { deletedAt: _.exists(false) };

  const res = await db.collection(FINANCE_PROCUREMENT_COLLECTION)
    .where(query)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    data: (res.data || []).map(mapFinanceProcurementRecord)
  };
}

async function reviewFinanceProcurement(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user);

  const id = String(data.id || '');
  const approved = data.approved !== false;
  const reviewNote = normalizePlainText(data.reviewNote, 500);
  if (!id) {
    throw new Error('缺少采购单ID');
  }

  const doc = await db.collection(FINANCE_PROCUREMENT_COLLECTION).doc(id).get();
  if (!doc.data) {
    throw new Error('采购单不存在');
  }

  const currentStatus = String(doc.data.status || 'pending');
  if (currentStatus === 'pending_boss') {
    throw new Error('该采购单已提交老板审批，请在老板看板完成终审');
  }
  if (currentStatus !== 'pending') {
    throw new Error('当前采购单已处理，不能重复审批');
  }

  const needBossApproval = approved && requiresBossApproval(doc.data.amount);
  const nextStatus = approved
    ? (needBossApproval ? 'pending_boss' : 'approved')
    : 'rejected';
  const operatorInfo = buildOperatorInfo(user);
  await db.collection(FINANCE_PROCUREMENT_COLLECTION).doc(id).update({
    data: {
      status: nextStatus,
      reviewNote,
      reviewedAt: nextStatus === 'approved' || nextStatus === 'rejected' ? db.serverDate() : null,
      reviewedBy: nextStatus === 'approved' || nextStatus === 'rejected' ? {
        id: operatorInfo.id,
        role: operatorInfo.role,
        name: operatorInfo.name
      } : {},
      financeReviewNote: reviewNote,
      financeReviewedAt: db.serverDate(),
      financeReviewedBy: {
        id: operatorInfo.id,
        role: operatorInfo.role,
        name: operatorInfo.name
      },
      bossReviewNote: nextStatus === 'approved' && user.role === 'admin'
        ? reviewNote
        : (doc.data.bossReviewNote || ''),
      bossReviewedAt: nextStatus === 'approved' && user.role === 'admin'
        ? db.serverDate()
        : (doc.data.bossReviewedAt || null),
      bossReviewedBy: nextStatus === 'approved' && user.role === 'admin'
        ? {
            id: operatorInfo.id,
            role: operatorInfo.role,
            name: operatorInfo.name
          }
        : (doc.data.bossReviewedBy || {}),
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    approved
      ? (nextStatus === 'pending_boss' ? 'submit_finance_procurement_to_boss' : 'approve_finance_procurement')
      : 'reject_finance_procurement',
    user.username,
    id,
    {
      itemName: doc.data.itemName || '',
      amount: doc.data.amount || 0,
      nextStatus,
      reviewNote
    }
  );

  if (nextStatus === 'pending_boss') {
    await sendBossProcurementNotification({
      ...doc.data,
      reviewNote,
      status: nextStatus
    });
  }

  return {
    success: true,
    message: approved
      ? (nextStatus === 'pending_boss' ? '采购单已提交老板审批' : '采购单已通过')
      : '采购单已驳回'
  };
}

async function reviewBossProcurement(data = {}, token) {
  const user = await getUserFromToken(token);
  assertBossAccess(user);

  const id = String(data.id || '');
  const approved = data.approved !== false;
  const reviewNote = normalizePlainText(data.reviewNote, 500);
  if (!id) {
    throw new Error('缺少采购单ID');
  }

  const doc = await db.collection(FINANCE_PROCUREMENT_COLLECTION).doc(id).get();
  if (!doc.data) {
    throw new Error('采购单不存在');
  }

  if (String(doc.data.status || '') !== 'pending_boss') {
    throw new Error('当前采购单不在老板审批阶段');
  }

  const operatorInfo = buildOperatorInfo(user);
  const nextStatus = approved ? 'approved' : 'rejected';

  await db.collection(FINANCE_PROCUREMENT_COLLECTION).doc(id).update({
    data: {
      status: nextStatus,
      reviewNote: reviewNote || doc.data.financeReviewNote || '',
      reviewedAt: db.serverDate(),
      reviewedBy: {
        id: operatorInfo.id,
        role: operatorInfo.role,
        name: operatorInfo.name
      },
      bossReviewNote: reviewNote,
      bossReviewedAt: db.serverDate(),
      bossReviewedBy: {
        id: operatorInfo.id,
        role: operatorInfo.role,
        name: operatorInfo.name
      },
      updatedAt: db.serverDate()
    }
  });

  await markBossAlertsProcessed(
    id,
    operatorInfo,
    approved ? 'approved' : 'rejected',
    reviewNote || (approved ? '老板审批通过' : '老板审批驳回')
  );

  await logAuditAction(
    approved ? 'approve_boss_procurement' : 'reject_boss_procurement',
    user.username,
    id,
    {
      itemName: doc.data.itemName || '',
      amount: doc.data.amount || 0,
      reviewNote
    }
  );

  return {
    success: true,
    message: approved ? '老板审批已通过' : '老板审批已驳回'
  };
}

async function retryBossAlert(data = {}, token) {
  const user = await getUserFromToken(token);
  assertBossAccess(user);

  const id = String(data.id || '');
  if (!id) {
    throw new Error('缺少提醒ID');
  }

  const alertRes = await db.collection(FINANCE_BOSS_ALERT_COLLECTION).doc(id).get();
  const alert = alertRes.data;
  if (!alert) {
    throw new Error('提醒记录不存在');
  }

  if (alert.status !== 'failed') {
    throw new Error('仅发送失败的提醒可以重试');
  }

  const procurementId = String(alert.procurementId || '');
  if (!procurementId) {
    throw new Error('提醒未关联采购单');
  }

  const procurementRes = await db.collection(FINANCE_PROCUREMENT_COLLECTION).doc(procurementId).get();
  const procurement = procurementRes.data;
  if (!procurement) {
    throw new Error('关联采购单不存在');
  }

  const bossRes = await db.collection('admins').doc(alert.adminId).get().catch(() => ({ data: null }));
  const boss = bossRes.data;
  if (!boss?.openId) {
    throw new Error('老板账号未绑定 openId，请重新登录老板账号');
  }

  const nextAttemptCount = (toNumber(alert.attemptCount, 0) || 0) + 1;
  const remainingRetries = Math.max(1, 4 - nextAttemptCount);
  const result = await sendBossProcurementNotificationWithRetry(procurement, boss, remainingRetries);
  await db.collection(FINANCE_BOSS_ALERT_COLLECTION).doc(id).update({
    data: {
      status: result.success ? 'sent' : 'failed',
      sentAt: db.serverDate(),
      resultNote: result.success ? '订阅消息已重新发送' : (result.error || '订阅消息发送失败'),
      attemptCount: nextAttemptCount - 1 + (result.attemptCount || 1),
      failureCategory: result.success ? '' : (result.category || 'unknown'),
      lastErrorCode: result.success ? '' : (result.errorCode || ''),
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    result.success ? 'retry_boss_alert_success' : 'retry_boss_alert_failed',
    user.username,
    id,
    {
      procurementId,
      adminName: boss.name || boss.username || '',
      resultNote: result.success ? '订阅消息已重新发送' : (result.error || '订阅消息发送失败'),
      attemptCount: nextAttemptCount - 1 + (result.attemptCount || 1)
    }
  );

  if (!result.success) {
    throw new Error(result.error || '重试发送失败');
  }

  return {
    success: true,
    message: '提醒已重新发送'
  };
}

async function getFinanceVendorSettlementList(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user);

  const status = String(data.status || 'all');
  const query = status !== 'all'
    ? { status, deletedAt: _.exists(false) }
    : { deletedAt: _.exists(false) };

  const res = await db.collection(FINANCE_VENDOR_SETTLEMENT_COLLECTION)
    .where(query)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    data: (res.data || []).map(mapFinanceVendorSettlementRecord)
  };
}

async function markFinanceVendorSettlementPaid(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user);

  const id = String(data.id || '');
  const paymentNote = normalizePlainText(data.paymentNote, 500);
  if (!id) {
    throw new Error('缺少外部结算单ID');
  }

  const doc = await db.collection(FINANCE_VENDOR_SETTLEMENT_COLLECTION).doc(id).get();
  if (!doc.data) {
    throw new Error('外部结算单不存在');
  }

  if (String(doc.data.status || '') === 'paid') {
    throw new Error('该外部结算单已支付，不能重复确认');
  }

  await db.collection(FINANCE_VENDOR_SETTLEMENT_COLLECTION).doc(id).update({
    data: {
      status: 'paid',
      paymentNote,
      paidAt: db.serverDate(),
      paidBy: {
        id: user?._id || '',
        role: user?.role || '',
        name: user?.name || user?.username || ''
      },
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    'mark_finance_vendor_settlement_paid',
    user.username,
    id,
    {
      vendorName: doc.data.vendorName || '',
      amount: doc.data.amount || 0,
      paymentNote
    }
  );

  return {
    success: true,
    message: '外部结算已标记为已支付'
  };
}

async function upsertFinanceDemoRecord(collectionName, bizNo, payload) {
  const collection = db.collection(collectionName);
  const existing = await collection.where({ bizNo }).limit(1).get();
  const record = existing.data && existing.data[0];

  if (record && record._id) {
    await collection.doc(record._id).update({
      data: {
        ...payload,
        updatedAt: db.serverDate(),
        deletedAt: _.remove()
      }
    });
    return { created: false, id: record._id };
  }

  const createRes = await collection.add({
    data: {
      ...payload,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  });
  return { created: true, id: createRes._id };
}

async function seedFinanceDemoData(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user, ['finance', 'admin']);

  let procurementCreated = 0;
  let procurementUpdated = 0;
  let vendorCreated = 0;
  let vendorUpdated = 0;

  for (const record of FINANCE_PROCUREMENT_DEMO_RECORDS) {
    const result = await upsertFinanceDemoRecord(FINANCE_PROCUREMENT_COLLECTION, record.bizNo, {
      ...record,
      reviewNote: record.reviewNote || '',
      reviewedAt: null,
      reviewedBy: {},
      financeReviewedBy: {},
      bossReviewedBy: {}
    });
    if (result.created) {
      procurementCreated += 1;
    } else {
      procurementUpdated += 1;
    }
  }

  for (const record of FINANCE_VENDOR_SETTLEMENT_DEMO_RECORDS) {
    const result = await upsertFinanceDemoRecord(FINANCE_VENDOR_SETTLEMENT_COLLECTION, record.bizNo, {
      ...record,
      paymentNote: record.paymentNote || '',
      paidAt: record.status === 'paid' ? db.serverDate() : null,
      paidBy: record.status === 'paid'
        ? buildOperatorInfo(user)
        : {}
    });
    if (result.created) {
      vendorCreated += 1;
    } else {
      vendorUpdated += 1;
    }
  }

  await logAuditAction('seed_finance_demo_data', user.username, 'finance_demo_data', {
    procurementCreated,
    procurementUpdated,
    vendorCreated,
    vendorUpdated
  });

  return {
    success: true,
    message: '财务演示数据初始化完成',
    data: {
      procurementCreated,
      procurementUpdated,
      vendorCreated,
      vendorUpdated
    }
  };
}

async function approveContractAdmin(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin']);

  const approved = data.approved !== false;
  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  if (approved && currentWorkflow.financeReview.status !== 'approved') {
    throw new Error('请先完成财务审核');
  }

  const nextWorkflow = {
    ...currentWorkflow,
    status: approved ? CONTRACT_WORKFLOW_STATUS.negotiating : CONTRACT_WORKFLOW_STATUS.drafting,
    adminApproval: {
      ...currentWorkflow.adminApproval,
      status: approved ? 'approved' : 'rejected',
      comment: normalizePlainText(data.comment, 2000),
      reviewedAt: db.serverDate(),
      reviewedBy: buildOperatorInfo(user)
    },
    negotiation: approved ? {
      ...currentWorkflow.negotiation,
      status: currentWorkflow.negotiation.status || CONTRACT_NEGOTIATION_STATUS.pending
    } : currentWorkflow.negotiation,
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'approve_contract_admin', {
    candidateName: candidate.basicInfo?.name || '',
    approved
  });

  return {
    success: true,
    message: approved ? '管理员审批已通过' : '管理员审批已驳回',
    data: nextWorkflow
  };
}

async function updateContractNegotiation(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr']);

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  if (![
    CONTRACT_WORKFLOW_STATUS.negotiating,
    CONTRACT_WORKFLOW_STATUS.readyToSign,
    CONTRACT_WORKFLOW_STATUS.signed
  ].includes(currentWorkflow.status)) {
    throw new Error('当前阶段不能更新合同协商结果');
  }

  const requestedStatus = normalizePlainText(data.negotiationStatus, 40);
  const nextNegotiationStatus = Object.values(CONTRACT_NEGOTIATION_STATUS).includes(requestedStatus)
    ? requestedStatus
    : CONTRACT_NEGOTIATION_STATUS.inProgress;
  const nextWorkflowStatus = nextNegotiationStatus === CONTRACT_NEGOTIATION_STATUS.agreed
    ? CONTRACT_WORKFLOW_STATUS.readyToSign
    : CONTRACT_WORKFLOW_STATUS.negotiating;

  const nextWorkflow = {
    ...currentWorkflow,
    status: currentWorkflow.status === CONTRACT_WORKFLOW_STATUS.signed
      ? CONTRACT_WORKFLOW_STATUS.signed
      : nextWorkflowStatus,
    negotiation: {
      ...currentWorkflow.negotiation,
      status: nextNegotiationStatus,
      note: normalizePlainText(data.note, 3000),
      updatedAt: db.serverDate(),
      updatedBy: buildOperatorInfo(user)
    },
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'update_contract_negotiation', {
    candidateName: candidate.basicInfo?.name || '',
    negotiationStatus: nextNegotiationStatus
  });

  return {
    success: true,
    message: nextNegotiationStatus === CONTRACT_NEGOTIATION_STATUS.agreed ? '合同协商已标记为一致，可进入线上签约' : '合同协商进度已更新',
    data: nextWorkflow
  };
}

async function createContractESignTask(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr']);

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  if (currentWorkflow.status !== CONTRACT_WORKFLOW_STATUS.readyToSign) {
    throw new Error('当前合同流程尚未达到可发起线上签约阶段');
  }

  if (!currentWorkflow.draft.fileUrl) {
    throw new Error('请先补充合同文件地址');
  }

  const useMock = data?.useMock !== false;
  const nowStamp = Date.now();
  let nextESign = {
    ...currentWorkflow.eSign,
    provider: 'fadada',
    initiatedAt: db.serverDate(),
    initiatedBy: buildOperatorInfo(user),
    lastSyncedAt: db.serverDate()
  };

  if (useMock) {
    nextESign = {
      ...nextESign,
      mode: 'mock',
      status: 'signing',
      taskId: `mock-task-${candidate._id}-${nowStamp}`,
      contractNo: `mock-contract-${candidate._id}-${nowStamp}`,
      signUrl: currentWorkflow.draft.fileUrl,
      lastMessage: '模拟模式已创建电子签任务，可继续测试签约流程'
    };
  } else {
    const config = getFadadaRuntimeConfig();
    if (!config.ready) {
      throw new Error('未配置法大大测试凭证，请先设置 FADADA_APP_ID、FADADA_APP_SECRET、FADADA_CREATE_SIGN_URL、FADADA_QUERY_SIGN_URL');
    }

    const requestPayload = {
      appId: config.appId,
      appSecret: config.appSecret,
      environment: config.environment,
      candidateId: candidate._id,
      candidateName: candidate.basicInfo?.name || '',
      candidatePhone: candidate.basicInfo?.phone || '',
      contractTitle: currentWorkflow.draft.title || '主播签约合同',
      contractFileUrl: currentWorkflow.draft.fileUrl,
      contractFileName: currentWorkflow.draft.fileName || '',
      metadata: {
        durationMonths: currentWorkflow.draft.durationMonths || null,
        salary: currentWorkflow.draft.salary || null,
        commission: currentWorkflow.draft.commission || null
      }
    };

    const response = await postJson(config.createUrl, requestPayload);
    if (response.statusCode >= 400) {
      throw new Error(`法大大创建签署任务失败：HTTP ${response.statusCode}`);
    }

    const result = response.data || {};
    nextESign = {
      ...nextESign,
      mode: 'api',
      status: result.status || 'signing',
      taskId: result.taskId || result.signTaskId || '',
      contractNo: result.contractNo || result.contractId || '',
      signUrl: result.signUrl || result.signPageUrl || '',
      lastMessage: result.message || '法大大测试签署任务已创建'
    };
  }

  const nextWorkflow = {
    ...currentWorkflow,
    eSign: nextESign,
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'create_contract_esign_task', {
    candidateName: candidate.basicInfo?.name || '',
    mode: nextESign.mode,
    status: nextESign.status
  });

  return {
    success: true,
    message: nextESign.lastMessage,
    data: nextWorkflow
  };
}

async function refreshContractESignStatus(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr', 'operations', 'finance']);

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  const currentESign = currentWorkflow.eSign || {};
  if (!currentESign.taskId) {
    throw new Error('当前还未发起电子签任务');
  }

  let nextESign = {
    ...currentESign,
    lastSyncedAt: db.serverDate()
  };

  if (currentESign.mode === 'mock') {
    nextESign.lastMessage = currentESign.status === 'signed'
      ? '模拟签署已完成'
      : '模拟模式下请使用“模拟签署完成”继续测试';
  } else {
    const config = getFadadaRuntimeConfig();
    if (!config.ready) {
      throw new Error('未配置法大大测试凭证，无法刷新电子签状态');
    }

    const response = await postJson(config.queryUrl, {
      appId: config.appId,
      appSecret: config.appSecret,
      environment: config.environment,
      taskId: currentESign.taskId,
      contractNo: currentESign.contractNo
    });

    if (response.statusCode >= 400) {
      throw new Error(`法大大查询签署状态失败：HTTP ${response.statusCode}`);
    }

    const result = response.data || {};
    nextESign = {
      ...nextESign,
      status: result.status || currentESign.status || 'signing',
      signUrl: result.signUrl || currentESign.signUrl || '',
      lastMessage: result.message || '已刷新法大大签署状态'
    };

    if (nextESign.status === 'signed' && !currentESign.signedAt) {
      nextESign.signedAt = db.serverDate();
    }
  }

  const nextWorkflow = {
    ...currentWorkflow,
    status: nextESign.status === 'signed' ? CONTRACT_WORKFLOW_STATUS.signed : currentWorkflow.status,
    eSign: nextESign,
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'refresh_contract_esign_status', {
    candidateName: candidate.basicInfo?.name || '',
    status: nextESign.status
  });

  return {
    success: true,
    message: nextESign.lastMessage || '签署状态已刷新',
    data: nextWorkflow
  };
}

async function mockCompleteContractESign(data, token) {
  const user = await getUserFromToken(token);
  const candidate = await getCandidateForContractWorkflow(data.candidateId);
  assertContractAccess(user, candidate, ['admin', 'hr']);

  const currentWorkflow = normalizeContractWorkflow(candidate.contractWorkflow);
  if (currentWorkflow.eSign?.mode !== 'mock' || !currentWorkflow.eSign?.taskId) {
    throw new Error('当前不是模拟电子签任务，无法执行模拟完成');
  }

  const nextWorkflow = {
    ...currentWorkflow,
    status: CONTRACT_WORKFLOW_STATUS.signed,
    eSign: {
      ...currentWorkflow.eSign,
      status: 'signed',
      signedAt: db.serverDate(),
      lastSyncedAt: db.serverDate(),
      lastMessage: '模拟签署已完成'
    },
    updatedAt: db.serverDate(),
    updatedBy: buildOperatorInfo(user)
  };

  await persistContractWorkflow(candidate._id, nextWorkflow, user, 'mock_complete_contract_esign', {
    candidateName: candidate.basicInfo?.name || ''
  });

  return {
    success: true,
    message: '模拟签署已完成',
    data: nextWorkflow
  };
}

async function saveCandidateFollowUp(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['admin', 'hr', 'operations'].includes(user.role)) {
    return { success: false, error: '无权限更新回访记录' };
  }

  const candidateId = normalizePlainText(data.candidateId, 100);
  if (!candidateId) {
    return { success: false, error: '缺少候选人ID' };
  }

  const candidate = await getCandidateForContractWorkflow(candidateId);
  const currentFollowUp = candidate.followUp && typeof candidate.followUp === 'object'
    ? candidate.followUp
    : {};
  const history = Array.isArray(currentFollowUp.history)
    ? currentFollowUp.history.slice()
    : [];

  history.unshift({
    action: normalizePlainText(data.action, 50) || 'callback',
    note: normalizePlainText(data.note, 1000),
    operator: buildOperatorInfo(user),
    contactedAt: db.serverDate()
  });

  const nextReminderAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const nextFollowUp = {
    ...currentFollowUp,
    note: normalizePlainText(data.note, 1000) || currentFollowUp.note || '',
    lastContactedAt: db.serverDate(),
    nextReminderAt,
    history
  };

  await db.collection('candidates').doc(candidateId).update({
    data: {
      followUp: nextFollowUp,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction('save_candidate_follow_up', user.username, candidateId, {
    candidateName: candidate.basicInfo?.name || '',
    note: nextFollowUp.note
  });

  return {
    success: true,
    message: '回访记录已保存',
    data: nextFollowUp
  };
}

async function saveCandidateAssets(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['admin', 'hr', 'operations'].includes(user.role)) {
    return { success: false, error: '无权限更新物资记录' };
  }

  const candidateId = normalizePlainText(data.candidateId, 100);
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (!candidateId) {
    return { success: false, error: '缺少候选人ID' };
  }

  const candidate = await getCandidateForContractWorkflow(candidateId);
  const currentAssets = candidate.assets && typeof candidate.assets === 'object'
    ? candidate.assets
    : {};
  const currentItems = Array.isArray(currentAssets.items) ? currentAssets.items.slice() : [];
  const now = db.serverDate();

  rawItems.forEach((item) => {
    const name = normalizePlainText(item?.name || item, 100);
    if (!name) {
      return;
    }

    const existingIndex = currentItems.findIndex((record) => record?.name === name);
    const payload = {
      name,
      status: normalizePlainText(item?.status, 40) || 'issued',
      issuedAt: now,
      issuedBy: buildOperatorInfo(user),
      deposit: Number(item?.deposit || 0) || 0,
      remark: normalizePlainText(item?.remark, 500)
    };

    if (existingIndex >= 0) {
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        ...payload
      };
    } else {
      currentItems.push(payload);
    }
  });

  const nextAssets = {
    ...currentAssets,
    items: currentItems,
    lastIssuedAt: now,
    lastIssuedBy: buildOperatorInfo(user)
  };

  await db.collection('candidates').doc(candidateId).update({
    data: {
      assets: nextAssets,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction('save_candidate_assets', user.username, candidateId, {
    candidateName: candidate.basicInfo?.name || '',
    assetCount: currentItems.length
  });

  return {
    success: true,
    message: '物资记录已保存',
    data: nextAssets
  };
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
    const isAnchor = ['signed', 'training', 'active'].includes(status);
    await db.collection('users').where({
      openId: candidateData.openId
    }).update({
      data: {
        userType: isAnchor ? 'anchor' : 'candidate',
        role: isAnchor ? 'anchor' : 'candidate',
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
  const normalizedInterviewers = await normalizeInterviewers(interviewers);

  const interviewInfo = {
    date: interviewDate,
    time: interviewTime,
    location: location || '',
    interviewers: normalizedInterviewers,
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
        userType: 'candidate',
        role: 'candidate',
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
      interviewers: normalizedInterviewers,
      notes
    });
  } catch (error) {
    console.error('[admin] 面试安排通知发送异常:', error);
  }

  return { success: true, message: '面试安排成功' };
}

async function normalizeInterviewers(interviewers = []) {
  if (!Array.isArray(interviewers) || interviewers.length === 0) {
    return [];
  }

  const normalized = [];

  for (const item of interviewers) {
    if (!item) {
      continue;
    }

    if (typeof item === 'object') {
      normalized.push({
        id: item.id || item._id || item.userId || item.adminId || '',
        _id: item._id || item.id || item.userId || item.adminId || '',
        userId: item.userId || item.id || item._id || item.adminId || '',
        adminId: item.adminId || item.id || item._id || item.userId || '',
        role: item.role || '',
        name: item.name || item.username || item.account || '',
        username: item.username || item.account || '',
        account: item.account || item.username || ''
      });
      continue;
    }

    const identifier = String(item).trim();
    if (!identifier) {
      continue;
    }

    const adminProfile = await getAdminByIdentifier(identifier);
    if (adminProfile) {
      normalized.push({
        id: adminProfile._id,
        _id: adminProfile._id,
        userId: adminProfile._id,
        adminId: adminProfile._id,
        role: adminProfile.role || '',
        name: adminProfile.name || adminProfile.username || identifier,
        username: adminProfile.username || '',
        account: adminProfile.username || ''
      });
    } else {
      normalized.push(identifier);
    }
  }

  return normalized;
}

async function getAdminByIdentifier(identifier) {
  const normalized = String(identifier || '').trim();
  if (!normalized) {
    return null;
  }

  const directDoc = await db.collection('admins').doc(normalized).get().catch(() => null);
  if (directDoc?.data) {
    return directDoc.data;
  }

  const fields = ['username', 'name'];
  for (const field of fields) {
    const res = await db.collection('admins').where({
      [field]: normalized,
      status: _.neq('deleted')
    }).limit(1).get();

    if (res.data?.[0]) {
      return res.data[0];
    }
  }

  return null;
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
            userType: ['signed', 'training', 'active'].includes(status) ? 'anchor' : 'candidate',
            role: ['signed', 'training', 'active'].includes(status) ? 'anchor' : 'candidate',
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
          userType: 'candidate',
          role: 'candidate',
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

function getFinancePeriodLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCurrency(value) {
  const amount = Math.round(toNumber(value, 0));
  const prefix = amount < 0 ? '-¥' : '¥';
  return `${prefix}${Math.abs(amount).toLocaleString('zh-CN')}`;
}

function getFinanceCandidateName(candidate) {
  return (
    candidate?.basicInfo?.artName ||
    candidate?.basicInfo?.name ||
    candidate?.name ||
    candidate?.candidateNo ||
    candidate?._id ||
    '未命名主播'
  );
}

function normalizeOrgField(value, maxLength = 30) {
  return String(value || '').trim().slice(0, maxLength);
}

function buildAssignedAgentSnapshot(agent = {}, extras = {}) {
  const groupName = normalizeOrgField(
    extras.groupName !== undefined ? extras.groupName : (agent.groupName || agent.agentGroupName || '')
  );
  const teamName = normalizeOrgField(
    extras.teamName !== undefined ? extras.teamName : (agent.teamName || agent.agentTeamName || '')
  );

  return {
    agentId: String(extras.agentId || agent._id || ''),
    agentName: String(extras.agentName || agent.name || agent.username || ''),
    agentPhone: String(extras.agentPhone || agent.phone || agent.mobile || ''),
    groupName,
    teamName,
    assignedAt: extras.assignedAt || db.serverDate(),
    assignedBy: extras.assignedBy || ''
  };
}

async function syncAssignedCandidatesAgentSnapshot(agentId, agentData = {}) {
  const normalizedAgentId = String(agentId || '').trim();
  if (!normalizedAgentId) {
    return 0;
  }

  const candidateRes = await db.collection('candidates').where({
    'assignedAgent.agentId': normalizedAgentId,
    deletedAt: _.exists(false)
  }).limit(200).get().catch(() => ({ data: [] }));

  const candidates = candidateRes.data || [];
  if (!candidates.length) {
    return 0;
  }

  let updatedCount = 0;
  for (const candidate of candidates) {
    const currentAssignedAgent = candidate.assignedAgent || {};
    await db.collection('candidates').doc(candidate._id).update({
      data: {
        assignedAgent: buildAssignedAgentSnapshot(agentData, {
          agentId: normalizedAgentId,
          assignedAt: currentAssignedAgent.assignedAt || db.serverDate(),
          assignedBy: currentAssignedAgent.assignedBy || ''
        }),
        updatedAt: db.serverDate()
      }
    });
    updatedCount += 1;
  }

  return updatedCount;
}

function getNestedValue(source, path) {
  if (!source || !path) {
    return undefined;
  }

  return String(path)
    .split('.')
    .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), source);
}

function pickFirstNonEmpty(sourceList = []) {
  for (const item of sourceList) {
    if (item === undefined || item === null) {
      continue;
    }

    const text = typeof item === 'string' ? item.trim() : String(item).trim();
    if (text) {
      return text;
    }
  }

  return '';
}

function createFinanceAgentMap(agents = []) {
  return new Map(
    (agents || []).map((item) => [String(item?._id || ''), item || {}]).filter(([key]) => key)
  );
}

function resolveFinanceOrgInfo(candidate, agentMap) {
  const assignedAgent = candidate?.assignedAgent || {};
  const agentId = String(assignedAgent.agentId || '');
  const agent = agentMap.get(agentId) || {};
  const agentName = pickFirstNonEmpty([
    assignedAgent.agentName,
    assignedAgent.name,
    agent.name,
    agent.username,
    '未分配经纪人'
  ]);
  const groupName = pickFirstNonEmpty([
    assignedAgent.groupName,
    assignedAgent.group?.name,
    assignedAgent.agentGroupName,
    agent.groupName,
    agent.group?.name,
    agent.agentGroupName,
    agent.brokerGroupName,
    getNestedValue(agent, 'roleData.employeeInfo.groupName'),
    getNestedValue(agent, 'roleData.streamerInfo.groupName'),
    agent.department
  ]) || '未配置经纪人小组';
  const teamName = pickFirstNonEmpty([
    assignedAgent.teamName,
    assignedAgent.team?.name,
    assignedAgent.agentTeamName,
    agent.teamName,
    agent.team?.name,
    agent.agentTeamName,
    getNestedValue(agent, 'roleData.employeeInfo.teamName'),
    getNestedValue(agent, 'roleData.streamerInfo.teamName')
  ]) || (agentId ? `${agentName}负责团` : '未分配团');

  return {
    agentId,
    agentName,
    groupName,
    teamName
  };
}

function estimateCandidateRevenue(candidate) {
  const commissionRate = toNumber(candidate?.contractWorkflow?.draft?.commission, 0);
  const commissionAmount = toNumber(candidate?.commission?.totalAmount, 0);
  const maxIncome = toNumber(candidate?.experience?.maxIncome, 0);

  if (commissionRate > 0 && commissionAmount > 0) {
    return Math.round(commissionAmount / (commissionRate / 100));
  }

  if (maxIncome > 0) {
    return maxIncome * 4;
  }

  return 21800;
}

function estimateCandidateBonus(revenue) {
  if (revenue >= 60000) return 3000;
  if (revenue >= 45000) return 1200;
  return 0;
}

function estimateCandidateDeduction(index) {
  return [680, 320, 450, 260, 180, 120][index] || 90;
}

function buildFinanceDimensionView(rows = [], dimension = 'team', sharedCostPool = 0) {
  const label = dimension === 'group' ? '经纪人小组' : '团';
  const unknownLabel = dimension === 'group' ? '未配置经纪人小组' : '未分配团';
  const bucketMap = new Map();

  rows.forEach((item, index) => {
    const entityName = pickFirstNonEmpty([
      dimension === 'group' ? item.groupName : item.teamName,
      unknownLabel
    ]);
    const entityKey = `${dimension}:${entityName}`;
    const current = bucketMap.get(entityKey) || {
      id: entityKey,
      name: entityName,
      candidateCount: 0,
      revenue: 0,
      directCost: 0,
      sharedCost: 0,
      agentIds: new Set(),
      agentNames: new Set()
    };

    current.candidateCount += 1;
    current.revenue += toNumber(item.revenue, 0);
    current.directCost += toNumber(item.finalAmount, 0);

    if (item.agentId) {
      current.agentIds.add(item.agentId);
    }
    if (item.agentName && item.agentName !== '未分配经纪人') {
      current.agentNames.add(item.agentName);
    }

    bucketMap.set(entityKey, current);
  });

  const list = Array.from(bucketMap.values());
  const totalRevenue = list.reduce((sum, item) => sum + item.revenue, 0);
  const totalCandidateCount = list.reduce((sum, item) => sum + item.candidateCount, 0);

  const ranking = list
    .map((item, index) => {
      const shareWeight = totalRevenue > 0
        ? item.revenue / totalRevenue
        : (totalCandidateCount > 0 ? item.candidateCount / totalCandidateCount : 0);
      const sharedCost = Math.round(sharedCostPool * shareWeight);
      const totalCost = item.directCost + sharedCost;
      const profit = item.revenue - totalCost;
      const profitRate = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
      const roi = totalCost > 0 ? item.revenue / totalCost : 0;
      const agentNames = Array.from(item.agentNames);

      return {
        id: item.id || `${dimension}-${index}`,
        name: item.name,
        candidateCount: item.candidateCount,
        candidateCountText: `${item.candidateCount}人`,
        agentCount: item.agentIds.size,
        agentCountText: `${item.agentIds.size}位经纪人`,
        revenue: item.revenue,
        revenueText: formatCurrency(item.revenue),
        directCost: item.directCost,
        directCostText: formatCurrency(item.directCost),
        sharedCost,
        sharedCostText: formatCurrency(sharedCost),
        totalCost,
        totalCostText: formatCurrency(totalCost),
        profit,
        profitText: formatCurrency(profit),
        profitRate,
        profitRateText: `${profitRate >= 0 ? '+' : ''}${(Math.round(profitRate * 10) / 10).toFixed(1)}%`,
        roi,
        roiText: roi.toFixed(2),
        isLoss: profit < 0,
        statusLabel: profit < 0 ? '亏损' : '盈利',
        managerName: agentNames[0] || '未分配经纪人',
        agentNamesText: agentNames.length ? agentNames.slice(0, 3).join(' / ') : '未分配经纪人'
      };
    })
    .sort((a, b) => {
      if (b.profit !== a.profit) {
        return b.profit - a.profit;
      }
      return b.revenue - a.revenue;
    });

  const profitableCount = ranking.filter((item) => !item.isLoss).length;
  const lossCount = ranking.filter((item) => item.isLoss).length;
  const topPerformer = ranking[0];
  const lossMakers = ranking.filter((item) => item.isLoss).sort((a, b) => a.profit - b.profit);
  const profitTotal = ranking.reduce((sum, item) => sum + item.profit, 0);

  return {
    label,
    summaryCards: [
      { id: `${dimension}-count`, label: `${label}数量`, value: `${ranking.length}个`, note: `当前参与经营统计的${label}` },
      { id: `${dimension}-profit`, label: `${label}总利润`, value: formatCurrency(profitTotal), note: '已含公共成本分摊' },
      { id: `${dimension}-profitables`, label: '盈利主体', value: `${profitableCount}个`, note: lossCount > 0 ? `${lossCount}个处于亏损` : '当前暂无亏损主体' },
      { id: `${dimension}-top`, label: '利润最高', value: topPerformer?.name || '暂无', note: topPerformer ? `${topPerformer.profitText} / ${topPerformer.profitRateText}` : '等待经营数据' }
    ],
    ranking: ranking.slice(0, 8),
    lossMakers: lossMakers.slice(0, 5)
  };
}

function buildFinanceDashboardPayload(candidates = [], procurements = [], settlements = [], bossAlerts = [], agents = []) {
  const periodLabel = getFinancePeriodLabel();
  const agentMap = createFinanceAgentMap(agents);
  const activeCandidates = candidates.filter((item) => ['signed', 'training', 'active'].includes(item?.status));
  const activeProcurements = procurements.filter((item) => !item?.deletedAt);
  const activeSettlements = settlements.filter((item) => !item?.deletedAt);
  const pendingProcurements = activeProcurements.filter((item) => item?.status === 'pending');
  const pendingBossProcurements = activeProcurements.filter((item) => item?.status === 'pending_boss');
  const procurementTotalAmount = activeProcurements.reduce((sum, item) => sum + toNumber(item?.amount, 0), 0);
  const pendingSettlements = activeSettlements.filter((item) => item?.status === 'pending');
  const paidSettlements = activeSettlements.filter((item) => item?.status === 'paid');
  const pendingSettlementAmount = pendingSettlements.reduce((sum, item) => sum + toNumber(item?.amount, 0), 0);
  const paidSettlementAmount = paidSettlements.reduce((sum, item) => sum + toNumber(item?.amount, 0), 0);
  const teacherSettlements = activeSettlements.filter((item) => String(item?.vendorType || '').includes('老师'));
  const teacherSettlementAmount = teacherSettlements.reduce((sum, item) => sum + toNumber(item?.amount, 0), 0);
  const anchorRows = activeCandidates.map((candidate, index) => {
    const orgInfo = resolveFinanceOrgInfo(candidate, agentMap);
    const revenue = estimateCandidateRevenue(candidate);
    const ratio = toNumber(candidate?.contractWorkflow?.draft?.commission, [50, 45, 42, 40, 38][index] || 36);
    const bonus = estimateCandidateBonus(revenue);
    const commission = candidate?.commission || {};
    const commissionTotalAmount = toNumber(commission.totalAmount, 0);
    const deduction = commissionTotalAmount > 0
      ? Math.max(0, Math.round(revenue * (ratio / 100) + bonus - commissionTotalAmount))
      : estimateCandidateDeduction(index);
    const finalAmount = commissionTotalAmount > 0
      ? commissionTotalAmount
      : Math.round(revenue * (ratio / 100) + bonus - deduction);
    const workflowStatus = candidate?.contractWorkflow?.financeReview?.status || '';
    const statusLabelMap = {
      approved: '已通过',
      rejected: '待补资料',
      pending: '待复核'
    };

    return {
      id: candidate?._id || `anchor-${index}`,
      name: getFinanceCandidateName(candidate),
      agentId: orgInfo.agentId,
      agentName: orgInfo.agentName,
      teamName: orgInfo.teamName,
      groupName: orgInfo.groupName,
      revenue,
      ratio,
      bonus,
      deduction,
      finalAmount,
      status: statusLabelMap[workflowStatus] || (commission.status === 'paid' ? '已通过' : '待复核')
    };
  }).sort((a, b) => b.revenue - a.revenue);
  const frozenCommissionRows = activeCandidates
    .filter((candidate) => normalizeCommissionFreezeState(candidate?.commission).status === COMMISSION_FREEZE_STATUS.FROZEN)
    .map((candidate) => {
      const commission = candidate?.commission || {};
      const freeze = normalizeCommissionFreezeState(commission);
      return {
        candidateId: candidate?._id || '',
        candidateName: getFinanceCandidateName(candidate),
        totalAmount: toNumber(commission.totalAmount, 0),
        totalAmountText: formatCurrency(commission.totalAmount || 0),
        reason: freeze.reason || '未填写原因',
        note: freeze.note || '',
        updatedAtText: formatDateTimeValue(freeze.updatedAt),
        updatedByName: freeze.updatedBy?.name || ''
      };
    });
  const pendingCommissionRows = activeCandidates
    .filter((candidate) => {
      const commission = candidate?.commission || {};
      const freeze = normalizeCommissionFreezeState(commission);
      return commission.status === 'calculated' && freeze.status !== COMMISSION_FREEZE_STATUS.FROZEN;
    })
    .map((candidate) => {
      const commission = candidate?.commission || {};
      return {
        candidateId: candidate?._id || '',
        candidateName: getFinanceCandidateName(candidate),
        totalAmount: toNumber(commission.totalAmount, 0),
        totalAmountText: formatCurrency(commission.totalAmount || 0),
        calculatedAtText: formatDateTimeValue(commission.calculatedAt)
      };
    });

  const settlementCount = anchorRows.length;
  const totalRevenue = anchorRows.reduce((sum, item) => sum + item.revenue, 0);
  const payrollPending = anchorRows.reduce((sum, item) => sum + item.finalAmount, 0);
  const deductionsCount = anchorRows.length ? Math.max(anchorRows.length + 5, 8) : 0;
  const baseMonthlyCost = 286000;
  const pendingPayoutCost = procurementTotalAmount + pendingSettlementAmount;
  const totalKnownCost = baseMonthlyCost + payrollPending + procurementTotalAmount + pendingSettlementAmount + paidSettlementAmount;
  const sharedCostPool = baseMonthlyCost + procurementTotalAmount + pendingSettlementAmount + paidSettlementAmount;
  const profitGap = totalRevenue - totalKnownCost;
  const roiPercent = totalKnownCost > 0
    ? Math.round((profitGap / totalKnownCost) * 100)
    : 0;
  const breakevenProgress = totalKnownCost > 0
    ? Math.round((totalRevenue / totalKnownCost) * 1000) / 10
    : 0;
  const pendingContracts = candidates.filter((item) => item?.contractWorkflow?.financeReview?.status === 'pending').length;
  const lowInventoryAlerts = Math.max(1, Math.min(4, pendingProcurements.length || 1));
  const procurementRequestCount = pendingProcurements.length;
  const vendorPendingCount = pendingSettlements.length;
  const dimensionStats = {
    team: buildFinanceDimensionView(anchorRows, 'team', sharedCostPool),
    group: buildFinanceDimensionView(anchorRows, 'group', sharedCostPool)
  };

  const overview = {
    summaryCards: [
      { id: 'settlement', value: settlementCount, unit: '人', label: '本月待结算主播', note: '合同分润与阶梯奖励待复核', tone: 'dark' },
      { id: 'payroll', value: formatCurrency(payrollPending), unit: '', label: '预计应发提成', note: '已扣除宿舍水电与工服领用', tone: 'gold' },
      { id: 'purchase', value: procurementRequestCount + pendingBossProcurements.length, unit: '单', label: '待审批采购申请', note: '含服装、道具、零食与耗材', tone: 'white' },
      { id: 'roi', value: `${roiPercent > 0 ? '+' : ''}${roiPercent}`, unit: '%', label: '综合 ROI', note: '按总投入回报率实时估算', tone: 'green' }
    ],
    coreMetrics: [
      { id: 'contracts', label: '合同待复核', value: pendingContracts, detail: 'HR 已录入分润方案' },
      { id: 'deduction', label: '异常扣款待确认', value: deductionsCount, detail: '旷工 / 迟到 / 违规 / 私联' },
      { id: 'vendors', label: '外部账单待支付', value: vendorPendingCount, detail: '老师、ZGA、剪辑团队' },
      { id: 'breakeven', label: '盈亏平衡差额', value: formatCurrency(totalRevenue - (baseMonthlyCost + pendingPayoutCost)), detail: '基地月营收 - 固定支出 - 待付款项' }
    ],
    moduleCards: [
      {
        id: 'profit-sharing',
        tag: '核心',
        title: '主播分润系统',
        desc: '流水自动算账，叠加合同比例、阶梯奖励与扣款补丁，形成待审核工资单。',
        progress: settlementCount > 0 ? 86 : 60,
        tone: 'dark',
        route: '/pages/finance/profit-sharing/profit-sharing',
        chips: ['自动算账', '扣款补丁', '电子工资条'],
        metrics: [
          { label: '待审核工资单', value: `${settlementCount} 份` },
          { label: '异常扣款', value: `${deductionsCount} 条` }
        ]
      },
      {
        id: 'procurement',
        tag: '基地',
        title: '物料与采购管理',
        desc: '固定资产折旧、易耗品申请、扫码入库和库存预警，覆盖 5000 平基地日常补给。',
        progress: 68,
        tone: 'sand',
        route: '/pages/finance/procurement/procurement',
        chips: ['固定资产档案', '采购审批', '库存预警'],
        metrics: [
          { label: '资产台账', value: '128 项' },
          { label: '低库存提醒', value: `${lowInventoryAlerts} 项` }
        ]
      },
      {
        id: 'external',
        tag: '结算',
        title: '供应商与外部结算',
        desc: '按舞蹈老师课表汇总课时费，并管理 ZGA 与第三方剪辑团队的月度应付账款。',
        progress: 72,
        tone: 'green',
        route: '/pages/finance/vendor-settlement/vendor-settlement',
        chips: ['老师课时费', '外部协作账单', '付款台账'],
        metrics: [
          { label: '老师课时费', value: formatCurrency(teacherSettlementAmount) },
          { label: '外部协作应付', value: formatCurrency(pendingSettlementAmount) }
        ]
      },
      {
        id: 'board',
        tag: '老板',
        title: '财务看板',
        desc: '实时跟踪单人产出比、基地盈亏平衡点、月度总营收和重点主播投入产出。',
        progress: 76,
        tone: 'plum',
        route: '/pages/finance/boss-dashboard/boss-dashboard',
        chips: ['单人 ROI', '盈亏平衡点', '经营总览'],
        metrics: [
          { label: '基地月营收', value: formatCurrency(totalRevenue) },
          { label: '基地月支出', value: formatCurrency(totalKnownCost) }
        ]
      }
    ],
    alerts: [
      { id: 'alert-1', level: 'high', title: '主播扣款异常', desc: `${Math.max(3, Math.ceil(deductionsCount / 2))} 笔罚款记录缺少完整备注，发薪前需补齐证据。`, owner: '经纪主管' },
      { id: 'alert-2', level: 'medium', title: '库存低于安全线', desc: pendingBossProcurements.length > 0 ? `当前有 ${pendingBossProcurements.length} 笔采购申请等待老板审批。` : (pendingProcurements.length > 0 ? `当前有 ${pendingProcurements.length} 笔采购申请待财务处理。` : '当前暂无待审批采购申请。'), owner: '行政采购' },
      { id: 'alert-3', level: 'medium', title: '外部账单待处理', desc: vendorPendingCount > 0 ? `当前有 ${vendorPendingCount} 笔外部账单待支付，总额 ${formatCurrency(pendingSettlementAmount)}。` : '当前暂无待支付外部账单。', owner: '外部合作' }
    ],
    settlementFlow: [
      { id: 'step-1', name: '流水归集', desc: '同步平台流水、主播收入、合同方案', status: 'done' },
      { id: 'step-2', name: '扣款补丁', desc: '叠加旷工、迟到、私联、水电与工服扣款', status: 'current' },
      { id: 'step-3', name: '财务复核', desc: '审核异常项、确认结算金额与付款批次', status: 'upcoming' },
      { id: 'step-4', name: '工资条发放', desc: '一键发送电子工资条并沉淀回执', status: 'upcoming' }
    ]
  };

  const profitSharing = {
    periodLabel,
    stats: [
      { id: 'anchors', label: '待结算主播', value: String(settlementCount), note: `含 ${Math.max(1, Math.floor(settlementCount / 4))} 名冲刺阶梯奖励主播` },
      { id: 'commission', label: '预计提成', value: formatCurrency(payrollPending), note: '按合同分润自动计算' },
      { id: 'deduction', label: '扣款补丁', value: `${deductionsCount}笔`, note: '罚款、水电、工服领用' },
      { id: 'slips', label: '待发工资条', value: `${activeCandidates.filter((item) => item?.commission?.status !== 'paid').length}份`, note: '已完成初审，待财务确认' }
    ],
    anchors: anchorRows.slice(0, 6).map((item) => ({
      id: item.id,
      name: item.name,
      agentName: item.agentName,
      revenue: formatCurrency(item.revenue),
      ratio: `${item.ratio}%`,
      bonus: formatCurrency(item.bonus),
      deduction: `-${formatCurrency(item.deduction).replace('¥', '¥')}`.replace('--', '-'),
      finalAmount: formatCurrency(item.finalAmount),
      status: item.status
    })),
    deductions: anchorRows.slice(0, 4).map((item, index) => ({
      id: `deduction-${index}`,
      type: ['旷工罚款', '迟到罚款', '私联罚款', '宿舍水电'][index] || '工服领用',
      owner: item.name,
      source: ['舞蹈老师', '舞蹈老师', '经纪人', '后勤台账'][index] || '仓库扫码',
      amount: `-${formatCurrency(item.deduction).replace('¥', '¥')}`.replace('--', '-'),
      status: index % 2 === 0 ? '已入账' : '待凭证'
    }))
  };

  const procurement = {
    stats: [
      { id: 'assets', label: '固定资产', value: '128项', note: '灯光、摄像机、音响、装修' },
      { id: 'depreciation', label: '本月折旧', value: formatCurrency(46800), note: '基地装修摊销已计提' },
      { id: 'requests', label: '待审申请', value: `${procurementRequestCount}单`, note: '服装、道具、零食、耗材' },
      { id: 'alerts', label: '库存预警', value: `${lowInventoryAlerts}项`, note: `累计申请金额 ${formatCurrency(procurementTotalAmount)}` }
    ],
    assets: [
      { id: 'a-1', name: 'A区补光灯组', category: '灯光', originalValue: formatCurrency(58000), monthlyDepreciation: formatCurrency(1611), keeper: '摄影组' },
      { id: 'a-2', name: '直播间 03 装修', category: '装修', originalValue: formatCurrency(126000), monthlyDepreciation: formatCurrency(3500), keeper: '基地行政' },
      { id: 'a-3', name: '索尼 FX3 套机', category: '摄像', originalValue: formatCurrency(31500), monthlyDepreciation: formatCurrency(875), keeper: '摄影组' }
    ],
    requests: activeProcurements.slice(0, 3).map((item, index) => ({
      id: item._id || `r-${index + 1}`,
      item: item.itemName || '未命名采购项',
      applicant: item.requester || '未填写',
      amount: formatCurrency(item.amount),
      purpose: item.remark || item.category || '待补充',
      status: item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已驳回' : '待审批'
    })),
    alerts: [
      { id: 's-1', item: '饮用水', current: '12箱', threshold: '20箱' },
      { id: 's-2', item: '化妆棉', current: '18包', threshold: '30包' },
      { id: 's-3', item: '补光电池', current: '6组', threshold: '10组' }
    ]
  };

  const vendorSettlement = {
    stats: [
      { id: 'teachers', label: '老师课时费', value: formatCurrency(teacherSettlementAmount), note: '按课表自动汇总' },
      { id: 'vendors', label: '外部应付', value: formatCurrency(pendingSettlementAmount), note: 'ZGA 与剪辑团队' },
      { id: 'bills', label: '待付款账单', value: `${vendorPendingCount}笔`, note: '待进入付款批次' },
      { id: 'confirmed', label: '已对账', value: `${paidSettlements.length}笔`, note: `已支付 ${formatCurrency(paidSettlementAmount)}` }
    ],
    teachers: teacherSettlements.slice(0, 3).map((item, index) => ({
      id: item._id || `t-${index + 1}`,
      name: item.vendorName || '未命名老师',
      courseHours: item.note || '-',
      unitPrice: '-',
      amount: formatCurrency(item.amount),
      period: item.cycle || `${periodLabel}`
    })),
    vendors: activeSettlements.slice(0, 3).map((item, index) => ({
      id: item._id || `v-${index + 1}`,
      name: item.vendorName || '未命名供应商',
      category: item.vendorType || '未分类',
      amount: formatCurrency(item.amount),
      status: item.status === 'paid' ? '已支付' : '待付款',
      dueDate: item.dueDate || '-'
    }))
  };

  const bossDashboard = {
    stats: [
      { id: 'revenue', label: '基地月营收', value: formatCurrency(totalRevenue), note: '本月实时汇总' },
      { id: 'cost', label: '基地月支出', value: formatCurrency(totalKnownCost), note: '含主播分润、采购、外部结算与固定支出' },
      { id: 'profit', label: '经营差额', value: formatCurrency(profitGap), note: '基地月营收减去当前已知成本' },
      { id: 'breakeven', label: '盈亏平衡点', value: `${breakevenProgress}%`, note: '营收达到目标线比例' },
      { id: 'boss-purchase', label: '老板待批采购', value: `${pendingBossProcurements.length}单`, note: `超过 ¥${PROCUREMENT_BOSS_APPROVAL_THRESHOLD} 自动上报` },
      { id: 'boss-freeze', label: '已冻结提成', value: `${frozenCommissionRows.length}笔`, note: '冻结后财务不可下发' }
    ],
    roi: anchorRows.slice(0, 3).map((item, index) => {
      const salary = Math.round(item.finalAmount * 0.45) || ([8000, 7500, 7000][index] || 6500);
      const costume = Math.round(item.finalAmount * 0.12) || ([2300, 1200, 1600][index] || 900);
      const training = Math.round(item.finalAmount * 0.18) || ([3600, 2100, 4200][index] || 1800);
      const totalCost = salary + costume + training;
      const roi = totalCost > 0 ? (item.revenue / totalCost).toFixed(2) : '0.00';
      return {
        id: `roi-${index}`,
        name: item.name,
        salary: formatCurrency(salary),
        costume: formatCurrency(costume),
        training: formatCurrency(training),
        revenue: formatCurrency(item.revenue),
        roi
      };
    }),
    costBreakdown: [
      { id: 'c-1', label: '基地固定支出', amount: formatCurrency(baseMonthlyCost), ratio: totalKnownCost > 0 ? `${Math.round((baseMonthlyCost / totalKnownCost) * 1000) / 10}%` : '0%' },
      { id: 'c-2', label: '主播分润成本', amount: formatCurrency(payrollPending), ratio: totalKnownCost > 0 ? `${Math.round((payrollPending / totalKnownCost) * 1000) / 10}%` : '0%' },
      { id: 'c-3', label: '采购与物料', amount: formatCurrency(procurementTotalAmount), ratio: totalKnownCost > 0 ? `${Math.round((procurementTotalAmount / totalKnownCost) * 1000) / 10}%` : '0%' },
      { id: 'c-4', label: '外部结算', amount: formatCurrency(pendingSettlementAmount + paidSettlementAmount), ratio: totalKnownCost > 0 ? `${Math.round(((pendingSettlementAmount + paidSettlementAmount) / totalKnownCost) * 1000) / 10}%` : '0%' }
    ],
    dimensionStats,
    pendingProcurements: pendingBossProcurements
      .map(mapFinanceProcurementRecord)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    pendingCommissions: pendingCommissionRows
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 6),
    frozenCommissions: frozenCommissionRows.slice(0, 6),
    alertLogs: bossAlerts
      .filter((item) => !item?.deletedAt)
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .slice(0, 8)
      .map((item, index) => ({
        id: item._id || `boss-alert-${index}`,
        title: item.title || '老板提醒',
        summary: item.summary || '',
        status: item.status || 'sent',
        statusLabel: item.status === 'approved'
          ? '已通过'
          : item.status === 'rejected'
            ? '已驳回'
            : item.status === 'failed'
              ? '发送失败'
              : '已发送',
        sentAtText: normalizeFinanceTimestamp(item.sentAt || item.createdAt),
        processedAtText: normalizeFinanceTimestamp(item.processedAt),
        adminName: item.adminName || '',
        resultNote: item.resultNote || '',
        attemptCount: toNumber(item.attemptCount, 1) || 1,
        failureCategory: item.failureCategory || '',
        failureCategoryLabel: item.failureCategory === 'openid_missing'
          ? 'openId 未绑定'
          : item.failureCategory === 'subscribe_denied'
            ? '未订阅消息'
            : item.failureCategory === 'template_invalid'
              ? '模板异常'
              : item.failureCategory
                ? '其他错误'
                : '',
        lastErrorCode: item.lastErrorCode || ''
      }))
  };

  return {
    overview,
    profitSharing,
    procurement,
    vendorSettlement,
    bossDashboard
  };
}

async function getFinanceDashboard(data = {}, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['finance', 'admin', 'operations'].includes(user.role)) {
    return { success: false, error: '无权限访问财务看板' };
  }

  const section = String(data?.section || 'all');
  const [candidateRes, procurementRes, settlementRes, bossAlertRes, agentRes] = await Promise.all([
    db.collection('candidates')
      .where({ deletedAt: _.exists(false) })
      .limit(200)
      .get(),
    db.collection(FINANCE_PROCUREMENT_COLLECTION)
      .where({ deletedAt: _.exists(false) })
      .limit(200)
      .get()
      .catch(() => ({ data: [] })),
    db.collection(FINANCE_VENDOR_SETTLEMENT_COLLECTION)
      .where({ deletedAt: _.exists(false) })
      .limit(200)
      .get()
      .catch(() => ({ data: [] })),
    db.collection(FINANCE_BOSS_ALERT_COLLECTION)
      .limit(100)
      .get()
      .catch(() => ({ data: [] })),
    db.collection('admins')
      .where({
        role: 'agent',
        status: _.neq('deleted')
      })
      .limit(200)
      .get()
      .catch(() => ({ data: [] }))
  ]);

  const payload = buildFinanceDashboardPayload(
    candidateRes.data || [],
    procurementRes.data || [],
    settlementRes.data || [],
    bossAlertRes.data || [],
    agentRes.data || []
  );
  const sectionMap = {
    overview: payload.overview,
    profitSharing: payload.profitSharing,
    procurement: payload.procurement,
    vendorSettlement: payload.vendorSettlement,
    bossDashboard: payload.bossDashboard
  };

  return {
    success: true,
    data: section === 'all'
      ? payload
      : {
          overview: payload.overview,
          [section]: sectionMap[section] || payload.overview
        }
  };
}

function getContractWorkflow(candidate) {
  return candidate?.contractWorkflow || {};
}

function getContractFinanceStatus(candidate) {
  const workflow = getContractWorkflow(candidate);
  const financeStatus = workflow.financeReview?.status || '';
  if (financeStatus) {
    return financeStatus;
  }
  if (workflow.status === 'finance_review') {
    return 'pending';
  }
  return '';
}

function formatFinanceContractCandidate(candidate) {
  const workflow = getContractWorkflow(candidate);
  const draft = workflow.draft || {};
  const financeStatus = getContractFinanceStatus(candidate);
  const financeStatusMap = {
    pending: '待财务审核',
    approved: '财务已通过',
    rejected: '财务已驳回'
  };
  const workflowStatusMap = {
    drafting: '草稿中',
    finance_review: '财务审核中',
    admin_review: '管理员审核中',
    negotiating: '协商中',
    ready_to_sign: '待签署',
    signed: '已签署'
  };

  return {
    _id: candidate?._id || '',
    displayName: getFinanceCandidateName(candidate),
    candidateNo: candidate?.candidateNo || candidate?._id || '',
    financeStatus,
    financeStatusLabel: financeStatusMap[financeStatus] || '未提交',
    workflowStatusLabel: workflowStatusMap[workflow.status || ''] || '未开始',
    contractTitle: draft.title || draft.fileName || '未命名合同',
    contractType: draft.type || '未设置',
    contractRemark: draft.remark || '',
    financeComment: workflow.financeReview?.comment || '',
    financeReviewer: workflow.financeReview?.reviewedBy?.name || '',
    contractFileName: draft.fileName || '',
    updatedAtText: candidate?.updatedAt || candidate?.createdAt || ''
  };
}

async function getFinanceContractReviewList(data = {}, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['finance', 'admin', 'operations'].includes(user.role)) {
    return { success: false, error: '无权限访问合同审核列表' };
  }

  const res = await db.collection('candidates')
    .where({ deletedAt: _.exists(false) })
    .limit(200)
    .get();

  const contracts = (res.data || [])
    .filter((candidate) => {
      const workflow = getContractWorkflow(candidate);
      return Boolean(workflow?.draft?.fileUrl || workflow?.financeReview?.status || workflow?.status);
    })
    .map(formatFinanceContractCandidate)
    .sort((a, b) => {
      if (a.financeStatus === 'pending' && b.financeStatus !== 'pending') return -1;
      if (a.financeStatus !== 'pending' && b.financeStatus === 'pending') return 1;
      return String(b.updatedAtText).localeCompare(String(a.updatedAtText));
    });

  const stats = {
    pending: contracts.filter((item) => item.financeStatus === 'pending').length,
    approved: contracts.filter((item) => item.financeStatus === 'approved').length,
    rejected: contracts.filter((item) => item.financeStatus === 'rejected').length,
    all: contracts.length
  };

  return {
    success: true,
    data: {
      list: contracts,
      stats
    }
  };
}

function formatDateTimeValue(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatFinancePeriodLabel(date = new Date()) {
  const bjTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  return `${year}年${month}月`;
}

function formatFinanceCommissionCandidate(candidate) {
  const commission = candidate?.commission || {};
  const distribution = Array.isArray(commission.distribution) ? commission.distribution : [];
  const status = commission.status || 'calculated';
  const freeze = normalizeCommissionFreezeState(commission);
  const isFrozen = freeze.status === COMMISSION_FREEZE_STATUS.FROZEN;
  const payslip = commission.payslip || {};
  const statusLabelMap = {
    paid: '已支付',
    calculated: isFrozen ? '已冻结' : '待支付',
    pending: isFrozen ? '已冻结' : '待计算'
  };
  const payslipReceiptStatus = payslip.receiptStatus === 'viewed' ? 'viewed' : 'pending';

  return {
    candidateId: candidate?._id || '',
    candidateName: getFinanceCandidateName(candidate),
    status,
    statusLabel: statusLabelMap[status] || (isFrozen ? '已冻结' : '待支付'),
    totalAmount: toNumber(commission.totalAmount, 0),
    totalAmountText: formatCurrency(commission.totalAmount || 0),
    anchorLevel: commission.anchorLevel || '-',
    scoutGrade: commission.scoutGrade || '-',
    calculatedAtText: formatDateTimeValue(commission.calculatedAt),
    paidAtText: formatDateTimeValue(commission.paidAt),
    freezeStatus: freeze.status,
    freezeStatusLabel: isFrozen ? '冻结中' : '正常',
    freezeReason: freeze.reason || '',
    freezeNote: freeze.note || '',
    freezeUpdatedAtText: formatDateTimeValue(freeze.updatedAt),
    freezeUpdatedByName: freeze.updatedBy?.name || '',
    canPay: status === 'calculated' && !isFrozen,
    canSendPayslip: status === 'paid',
    payslipStatus: payslip.status || 'pending',
    payslipStatusLabel: payslip.status === 'sent' ? '已发送工资条' : '未发送工资条',
    payslipSentAtText: formatDateTimeValue(payslip.sentAt),
    payslipReceiptStatus,
    payslipReceiptStatusLabel: payslipReceiptStatus === 'viewed' ? '主播已查看' : '待主播查看',
    payslipViewedAtText: formatDateTimeValue(payslip.receiptViewedAt),
    payslipSlipNo: payslip.slipNo || '',
    payslipPeriodLabel: payslip.periodLabel || '',
    payslipDeliveryNote: payslip.deliveryNote || '',
    distribution: distribution.map((item) => ({
      scoutId: item.scoutId || '',
      scoutName: item.scoutName || '未命名星探',
      amount: toNumber(item.amount, 0),
      amountText: formatCurrency(item.amount || 0),
      percentage: toNumber(item.percentage, 0),
      typeLabel: item.type === 'team' ? '团队管理费' : '直接推荐'
    }))
  };
}

async function confirmFinanceCommissionPayment(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user, ['finance', 'admin']);

  const candidateId = String(data.candidateId || '');
  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    throw new Error('候选人不存在');
  }

  const candidate = candidateRes.data;
  const commission = candidate?.commission || {};
  const freeze = normalizeCommissionFreezeState(commission);

  if (!commission || commission.status !== 'calculated') {
    throw new Error('佣金未计算或已支付');
  }

  if (freeze.status === COMMISSION_FREEZE_STATUS.FROZEN) {
    throw new Error('该主播提成已被冻结，需老板解冻后才能发放');
  }

  await db.collection('candidates').doc(candidateId).update({
    data: {
      'commission.status': 'paid',
      'commission.paidAt': db.serverDate(),
      updatedAt: db.serverDate()
    }
  });

  for (const item of Array.isArray(commission.distribution) ? commission.distribution : []) {
    try {
      await db.collection('scouts').doc(item.scoutId).update({
        data: {
          'stats.paidCommission': _.inc(toNumber(item.amount, 0)),
          updatedAt: db.serverDate()
        }
      });
    } catch (error) {
      console.error('[admin] 更新星探已支付金额失败:', item.scoutId, error);
    }
  }

  await logAuditAction('confirm_finance_commission_payment', user.username, candidateId, {
    candidateName: getFinanceCandidateName(candidate),
    totalAmount: toNumber(commission.totalAmount, 0)
  });

  return {
    success: true,
    message: '支付确认成功'
  };
}

async function sendFinanceCommissionPayslip(data = {}, token) {
  const user = await getUserFromToken(token);
  assertFinanceAccess(user, ['finance', 'admin']);

  const candidateId = String(data.candidateId || '');
  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    throw new Error('候选人不存在');
  }

  const candidate = candidateRes.data;
  const commission = candidate?.commission || {};
  if (!commission || commission.status !== 'paid') {
    throw new Error('仅已支付提成可发送电子工资条');
  }

  const candidateName = getFinanceCandidateName(candidate);
  const distribution = Array.isArray(commission.distribution) ? commission.distribution : [];
  const payslipSentAt = new Date();
  const payslip = {
    slipNo: `SLIP-${formatFinancePeriodLabel(payslipSentAt).replace(/[^\d]/g, '')}-${String(candidateId).slice(-6).toUpperCase()}`,
    periodLabel: formatFinancePeriodLabel(payslipSentAt),
    status: 'sent',
    deliveryStatus: candidate.openId ? 'in_app' : 'archived',
    deliveryNote: candidate.openId ? '主播可在工作台查看电子工资条。' : '主播未绑定小程序账号，工资条已生成待线下发送。',
    receiptStatus: 'pending',
    receiptViewedAt: null,
    sentAt: payslipSentAt,
    sentBy: buildOperatorInfo(user),
    candidateName,
    totalAmount: toNumber(commission.totalAmount, 0),
    totalAmountText: formatCurrency(commission.totalAmount || 0),
    paidAt: commission.paidAt || null,
    distribution: distribution.map((item) => ({
      scoutId: item.scoutId || '',
      scoutName: item.scoutName || '未命名星探',
      amount: toNumber(item.amount, 0),
      amountText: formatCurrency(item.amount || 0),
      percentage: toNumber(item.percentage, 0),
      type: item.type || 'direct',
      typeLabel: item.type === 'team' ? '团队管理费' : '直接推荐'
    }))
  };

  await db.collection('candidates').doc(candidateId).update({
    data: {
      'commission.payslip': payslip,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction('send_finance_commission_payslip', user.username, candidateId, {
    candidateName,
    totalAmount: toNumber(commission.totalAmount, 0),
    slipNo: payslip.slipNo
  });

  return {
    success: true,
    message: candidate.openId ? '电子工资条已发送至主播端' : '电子工资条已生成，待线下发送',
    data: {
      slipNo: payslip.slipNo,
      periodLabel: payslip.periodLabel,
      deliveryStatus: payslip.deliveryStatus
    }
  };
}

async function toggleCommissionFreeze(data = {}, token) {
  const user = await getUserFromToken(token);
  assertBossAccess(user);

  const candidateId = String(data.candidateId || '');
  const freeze = data.freeze !== false;
  const reason = normalizePlainText(data.reason, 200);
  const note = normalizePlainText(data.note, 1000);
  if (!candidateId) {
    throw new Error('缺少候选人ID');
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    throw new Error('候选人不存在');
  }

  const candidate = candidateRes.data;
  const commission = candidate?.commission || {};
  if (!commission || !commission.status) {
    throw new Error('当前候选人暂无可操作的提成记录');
  }
  if (commission.status === 'paid') {
    throw new Error('该提成已发放，不能再冻结');
  }
  if (freeze && !reason) {
    throw new Error('请填写冻结原因');
  }

  const nextStatus = freeze ? COMMISSION_FREEZE_STATUS.FROZEN : COMMISSION_FREEZE_STATUS.ACTIVE;
  await db.collection('candidates').doc(candidateId).update({
    data: {
      'commission.freezeStatus': nextStatus,
      'commission.freezeReason': freeze ? reason : '',
      'commission.freezeNote': note,
      'commission.freezeUpdatedAt': db.serverDate(),
      'commission.freezeUpdatedBy': buildOperatorInfo(user),
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    freeze ? 'freeze_candidate_commission' : 'unfreeze_candidate_commission',
    user.username,
    candidateId,
    {
      candidateName: getFinanceCandidateName(candidate),
      reason,
      note
    }
  );

  return {
    success: true,
    message: freeze ? '提成已冻结' : '提成已解冻'
  };
}

async function getFinanceCommissionLedger(data = {}, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['finance', 'admin', 'operations'].includes(user.role)) {
    return { success: false, error: '无权限访问结算台账' };
  }

  const res = await db.collection('candidates')
    .where({
      deletedAt: _.exists(false),
      commission: _.neq(null)
    })
    .limit(200)
    .get();

  const commissions = (res.data || [])
    .filter((candidate) => candidate?.commission)
    .map(formatFinanceCommissionCandidate)
    .sort((a, b) => {
      if (a.freezeStatus === COMMISSION_FREEZE_STATUS.FROZEN && b.freezeStatus !== COMMISSION_FREEZE_STATUS.FROZEN) return -1;
      if (a.freezeStatus !== COMMISSION_FREEZE_STATUS.FROZEN && b.freezeStatus === COMMISSION_FREEZE_STATUS.FROZEN) return 1;
      if (a.status === 'calculated' && b.status !== 'calculated') return -1;
      if (a.status !== 'calculated' && b.status === 'calculated') return 1;
      return b.totalAmount - a.totalAmount;
    });

  const stats = {
    totalPending: commissions.filter((item) => item.status === 'calculated' && item.freezeStatus !== COMMISSION_FREEZE_STATUS.FROZEN).length,
    frozenCount: commissions.filter((item) => item.freezeStatus === COMMISSION_FREEZE_STATUS.FROZEN).length,
    pendingAmount: commissions
      .filter((item) => item.status === 'calculated' && item.freezeStatus !== COMMISSION_FREEZE_STATUS.FROZEN)
      .reduce((sum, item) => sum + item.totalAmount, 0),
    paidAmount: commissions
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + item.totalAmount, 0),
    totalAmount: commissions.reduce((sum, item) => sum + item.totalAmount, 0)
  };

  return {
    success: true,
    data: {
      list: commissions,
      stats: {
        ...stats,
        frozenCountText: `${stats.frozenCount}笔`,
        pendingAmountText: formatCurrency(stats.pendingAmount),
        paidAmountText: formatCurrency(stats.paidAmount),
        totalAmountText: formatCurrency(stats.totalAmount)
      }
    }
  };
}

// ==================== 权限管理相关 ====================

// 获取管理员/经纪人列表
async function getAdminList(token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  // 管理员和可分配候选人的角色都需要读取员工列表
  if (!user.permissions.manageUsers && !user.permissions.assignCandidates) {
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

  const { username, password, name, phone = '', role = 'agent', teamName = '', groupName = '' } = data;

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
    phone: typeof phone === 'string' ? phone.trim() : '',
    teamName: role === 'agent' ? normalizeOrgField(teamName) : '',
    groupName: role === 'agent' ? normalizeOrgField(groupName) : '',
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
    {
      username,
      name,
      role,
      teamName: role === 'agent' ? normalizeOrgField(teamName) : '',
      groupName: role === 'agent' ? normalizeOrgField(groupName) : ''
    }
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

  const { id, name, password, status, phone, role, teamName, groupName } = data;

  if (!id) {
    return { success: false, error: '缺少用户ID' };
  }

  const targetRes = await db.collection('admins').doc(id).get();
  if (!targetRes.data) {
    return { success: false, error: '用户不存在' };
  }

  const updateData = {
    updatedAt: db.serverDate()
  };

  if (typeof name === 'string') {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: '姓名不能为空' };
    }
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      return { success: false, error: '姓名长度应在1-20个字符之间' };
    }
    if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(trimmedName)) {
      return { success: false, error: '姓名只能包含中文、英文和空格' };
    }
    updateData.name = trimmedName;
  }

  if (typeof phone === 'string') {
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^1[3-9]\d{9}$/.test(trimmedPhone)) {
      return { success: false, error: '请输入正确的11位手机号' };
    }
    updateData.phone = trimmedPhone;
    updateData['application.phone'] = trimmedPhone;
  }

  if (password) {
    if (String(password).length < 6) {
      return { success: false, error: '密码长度至少6位' };
    }
    updateData.password = hashPassword(password);
  }

  if (role) {
    const validRoles = ['admin', 'hr', 'agent', 'operations', 'finance', 'trainer', 'dance_teacher', 'photographer', 'host_mc', 'makeup_artist', 'stylist'];
    if (!validRoles.includes(role)) {
      return { success: false, error: '无效的角色' };
    }
    updateData.role = role;
    updateData['application.desiredRole'] = role;
    updateData.permissions = ROLE_PERMISSIONS[role] || {};
  }

  const nextRole = role || targetRes.data.role || '';
  if (typeof teamName === 'string' || nextRole !== 'agent') {
    updateData.teamName = nextRole === 'agent' ? normalizeOrgField(teamName) : '';
  }
  if (typeof groupName === 'string' || nextRole !== 'agent') {
    updateData.groupName = nextRole === 'agent' ? normalizeOrgField(groupName) : '';
  }

  if (status) {
    const validStatuses = ['pending', 'active', 'rejected', 'deleted'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: '无效的状态' };
    }
    updateData.status = status;
  }

  await db.collection('admins').doc(id).update({
    data: updateData
  });

  let syncedCandidateCount = 0;
  if (
    nextRole === 'agent'
    && (
      typeof name === 'string'
      || typeof phone === 'string'
      || typeof teamName === 'string'
      || typeof groupName === 'string'
      || role === 'agent'
    )
  ) {
    const mergedAgentData = {
      ...targetRes.data,
      ...updateData,
      _id: id
    };
    syncedCandidateCount = await syncAssignedCandidatesAgentSnapshot(id, mergedAgentData);
  }

  // 记录审计日志
  await logAuditAction(
    'update_admin',
    user.username,
    id,
    {
      beforeRole: targetRes.data.role || '',
      afterRole: role || targetRes.data.role || '',
      beforeStatus: targetRes.data.status || '',
      afterStatus: status || targetRes.data.status || '',
      name: updateData.name || targetRes.data.name || '',
      teamName: updateData.teamName !== undefined ? updateData.teamName : (targetRes.data.teamName || ''),
      groupName: updateData.groupName !== undefined ? updateData.groupName : (targetRes.data.groupName || ''),
      syncedCandidateCount,
      phoneChanged: typeof phone === 'string',
      passwordChanged: !!password
    }
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

  // 检查候选人是否存在
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const previousAssignedAgent = candidateRes.data.assignedAgent || null;
  const { assignedAgent, changed } = await resolveAssignedAgentForTrainingCamp(
    candidateRes.data,
    agentId,
    user.username
  );

  if (!assignedAgent?.agentId) {
    return { success: false, error: '经纪人不存在' };
  }

  if (changed) {
    await db.collection('candidates').doc(candidateId).update({
      data: {
        assignedAgent,
        updatedAt: db.serverDate()
      }
    });
  }

  // 记录审计日志
  await logAuditAction(
    'assign_candidate',
    user.username,
    candidateId,
    {
      candidateName: candidateRes.data.basicInfo?.name,
      previousAgentId: previousAssignedAgent?.agentId || '',
      previousAgentName: previousAssignedAgent?.agentName || '',
      agentId: assignedAgent.agentId || '',
      agentName: assignedAgent.agentName || '',
      agentPhone: assignedAgent.agentPhone || '',
      changed
    }
  );

  return {
    success: true,
    message: changed
      ? (previousAssignedAgent?.agentId ? '修改经纪人成功' : '分配成功')
      : '当前经纪人未变化',
    changed
  };
}

async function resolveAssignedAgentForTrainingCamp(candidate, agentId, operator) {
  const candidateId = candidate?._id;
  const normalizedAgentId = String(agentId || '').trim();
  const currentAssignedAgent = candidate?.assignedAgent || null;
  const currentAgentId = currentAssignedAgent?.agentId || '';

  if (!normalizedAgentId) {
    return {
      assignedAgent: currentAssignedAgent,
      changed: false
    };
  }

  const agentRes = await db.collection('admins').doc(normalizedAgentId).get();
  const agent = agentRes.data;
  if (!agent || agent.role !== 'agent' || agent.status === 'deleted') {
    throw new Error('经纪人不存在或已删除');
  }

  const agentPhone = agent.phone || agent.mobile || '';
  const assignedAgent = buildAssignedAgentSnapshot(agent, {
    agentId: normalizedAgentId,
    agentPhone,
    assignedAt: currentAgentId === normalizedAgentId && currentAssignedAgent?.assignedAt
      ? currentAssignedAgent.assignedAt
      : db.serverDate(),
    assignedBy: operator
  });

  if (currentAgentId && currentAgentId !== normalizedAgentId) {
    const oldAgentRes = await db.collection('admins').doc(currentAgentId).get();
    const oldAgent = oldAgentRes.data;
    if (oldAgent) {
      const oldAssignedCandidates = (oldAgent.assignedCandidates || []).filter(id => id !== candidateId);
      await db.collection('admins').doc(currentAgentId).update({
        data: {
          assignedCandidates: oldAssignedCandidates,
          updatedAt: db.serverDate()
        }
      });
    }
  }

  const assignedCandidates = Array.isArray(agent.assignedCandidates) ? agent.assignedCandidates.slice() : [];
  if (candidateId && !assignedCandidates.includes(candidateId)) {
    assignedCandidates.push(candidateId);
    await db.collection('admins').doc(normalizedAgentId).update({
      data: {
        assignedCandidates,
        updatedAt: db.serverDate()
      }
    });
  }

  return {
    assignedAgent,
    changed: currentAgentId !== normalizedAgentId
      || currentAssignedAgent?.agentName !== assignedAgent.agentName
      || (currentAssignedAgent?.agentPhone || '') !== agentPhone
  };
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

      const activeCandidates = (candidatesRes.data || [])
        .filter((candidate) => isCandidateActive(candidate));
      const activeCandidateIds = activeCandidates.map((candidate) => candidate._id);

      // 自动清理已删除或不存在的历史分配，避免管控台显示脏数据。
      if (activeCandidateIds.length !== candidateIds.length) {
        await db.collection('admins').doc(agent._id).update({
          data: {
            assignedCandidates: activeCandidateIds,
            updatedAt: db.serverDate()
          }
        });
      }

      assignments.push({
        agentId: agent._id,
        agentName: agent.name,
        agentUsername: agent.username,
        candidates: activeCandidates.map(c => ({
          id: c._id,
          name: c.basicInfo?.name || c.basicInfo?.artName || '未命名候选人',
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

    const candidateDocs = await db.collection('candidates').where({
      _id: _.in(candidateIds)
    }).get();
    const candidateMap = new Map((candidateDocs.data || []).map(item => [item._id, item]));
    const invalidCandidates = [];
    const unchangedCandidates = [];
    const changedCandidates = [];
    const errors = [];

    for (const candidateId of candidateIds) {
      const candidate = candidateMap.get(candidateId);
      if (!candidate) {
        invalidCandidates.push(candidateId);
        continue;
      }

      try {
        const previousAssignedAgent = candidate.assignedAgent || null;
        const { assignedAgent, changed } = await resolveAssignedAgentForTrainingCamp(
          candidate,
          agentId,
          user.username
        );

        if (!assignedAgent?.agentId) {
          errors.push({ candidateId, error: '经纪人不存在' });
          continue;
        }

        if (changed) {
          await db.collection('candidates').doc(candidateId).update({
            data: {
              assignedAgent,
              updatedAt: db.serverDate()
            }
          });

          changedCandidates.push({
            candidateId,
            candidateName: candidate.basicInfo?.name || '未知',
            previousAgentName: previousAssignedAgent?.agentName || '',
            agentName: assignedAgent.agentName || ''
          });
        } else {
          unchangedCandidates.push({
            candidateId,
            candidateName: candidate.basicInfo?.name || '未知',
            agentName: assignedAgent.agentName || previousAssignedAgent?.agentName || ''
          });
        }
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
        agentName: agentRes.data.name,
        agentPhone: agentRes.data.phone || agentRes.data.mobile || '',
        candidateCount: candidateIds.length,
        successCount: changedCandidates.length,
        unchangedCount: unchangedCandidates.length,
        failedCount: errors.length
      }
    );

    if (changedCandidates.length === 0 && unchangedCandidates.length === 0) {
      return { success: false, error: '所有候选人处理失败', errors };
    }

    return {
      success: true,
      successCount: changedCandidates.length,
      unchangedCount: unchangedCandidates.length,
      totalCount: candidateIds.length,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      unchangedCandidates: unchangedCandidates.length > 0 ? unchangedCandidates : undefined,
      invalidCandidates: invalidCandidates.length > 0 ? invalidCandidates : undefined
    };
  } catch (error) {
    console.error('批量分配候选人失败:', error);
    return { success: false, error: '批量分配失败：' + error.message };
  }
}

async function createTrainingCampTodo(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['agent', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限发送入营待办' };
  }

  const candidateId = String(data?.candidateId || '').trim();
  const requestedAgentId = String(data?.agentId || '').trim();
  const campType = normalizeTrainingCampType(data?.campType);
  const startDate = String(data?.startDate || '').trim();
  const startTime = String(data?.startTime || '').trim() || '13:00';
  const remark = String(data?.remark || '').trim().slice(0, 300);

  if (!candidateId || !campType || !startDate) {
    return { success: false, error: '请填写训练营类型和入营时间，仅支持新星训练营或早早鸟训练营' };
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data;
  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }

  let resolvedAssignedAgent = candidate.assignedAgent || null;
  if (user.role === 'admin' && requestedAgentId) {
    try {
      const assignResult = await resolveAssignedAgentForTrainingCamp(
        { ...candidate, _id: candidateId },
        requestedAgentId,
        user.username
      );
      resolvedAssignedAgent = assignResult.assignedAgent;
    } catch (error) {
      return { success: false, error: error.message || '指定经纪人失败' };
    }
  }

  if (!resolvedAssignedAgent?.agentId) {
    return { success: false, error: '请先为候选人分配经纪人' };
  }

  if (user.role === 'agent' && resolvedAssignedAgent.agentId !== user._id) {
    return { success: false, error: '无权限为该候选人发送入营待办' };
  }

  if (user.role === 'agent' && !['rated', 'signed', 'training'].includes(candidate.status)) {
    return { success: false, error: '当前状态不允许发送入营待办' };
  }

  if (candidate.trainingCampTodo?.status === 'pending') {
    return { success: false, error: '该候选人已有待处理的入营待办' };
  }

  const sentBy = {
    agentId: resolvedAssignedAgent.agentId,
    agentName: resolvedAssignedAgent.agentName || user.name || user.username || '',
    agentPhone: resolvedAssignedAgent.agentPhone || '',
    operatorId: user._id || '',
    operatorName: user.name || user.username || '',
    operatorRole: user.role
  };
  const invitationContent = buildTrainingCampInvitation(candidate, campType, startDate, startTime, remark);

  const candidateUpdateData = {
    trainingCampTodo: {
      title: `${campType}入营邀请函`,
      status: 'pending',
      decision: '',
      campType,
      startDate,
      startTime,
      remark,
      invitationContent,
      sentBy,
      sentAt: db.serverDate(),
      respondedAt: null
    },
    updatedAt: db.serverDate()
  };

  if (user.role === 'admin' && requestedAgentId) {
    candidateUpdateData.assignedAgent = resolvedAssignedAgent;
  }

  await db.collection('candidates').doc(candidateId).update({
    data: candidateUpdateData
  });

  await logAuditAction(
    'create_training_camp_todo',
    user.username,
    candidateId,
    {
      candidateName: candidate.basicInfo?.name || '',
      agentId: resolvedAssignedAgent.agentId,
      agentName: resolvedAssignedAgent.agentName || '',
      campType,
      startDate,
      startTime
    }
  );

  return {
    success: true,
    message: '入营待办已发送'
  };
}

async function getTrainingCampRecords(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  const candidateId = String(data?.candidateId || '').trim();
  if (!candidateId) {
    return { success: false, error: '缺少候选人ID' };
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data;
  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }

  const hasTrainingAccess = normalizeRoleKey(user.role) === 'dance_teacher'
    ? canDanceTeacherAccessTrainingCandidate(candidate, user)
    : false;

  if (isReviewerRole(user.role) && !isCandidateAssignedToReviewer(candidate, user) && !hasTrainingAccess) {
    return { success: false, error: '无权限查看该候选人训练记录' };
  }

  return {
    success: true,
    data: {
      candidateId: candidate._id,
      candidateName: candidate.basicInfo?.name || '',
      status: candidate.status || '',
      trainingCamp: candidate.trainingCamp || {},
      assignedAgent: candidate.assignedAgent || null
    }
  };
}

async function reviewTrainingCampRecord(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限复核训练记录' };
  }

  const candidateId = String(data?.candidateId || '').trim();
  const recordId = String(data?.recordId || '').trim();
  const reviewStatus = String(data?.reviewStatus || '').trim();
  const reviewComment = String(data?.reviewComment || '').trim().slice(0, 300);
  const supportComment = String(data?.supportComment || '').trim().slice(0, 300);
  const coachingComment = String(data?.coachingComment || '').trim().slice(0, 300);

  if (!candidateId || !recordId || !['approved', 'rejected'].includes(reviewStatus)) {
    return { success: false, error: '缺少必要参数' };
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data;
  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }

  const hasTrainingAccess = canDanceTeacherAccessTrainingCandidate(candidate, user);

  if (user.role !== 'admin' && !isCandidateAssignedToReviewer(candidate, user) && !hasTrainingAccess) {
    return { success: false, error: '无权限复核该候选人训练记录' };
  }

  const currentRecords = Array.isArray(candidate.trainingCamp?.dailyRecords)
    ? candidate.trainingCamp.dailyRecords
    : [];
  const targetIndex = currentRecords.findIndex((item) => item?.recordId === recordId);

  if (targetIndex < 0) {
    return { success: false, error: '训练记录不存在' };
  }

  currentRecords[targetIndex] = {
    ...currentRecords[targetIndex],
    status: reviewStatus,
    reviewComment,
    supportComment,
    coachingComment,
    reviewedBy: {
      reviewerId: user._id || '',
      reviewerName: user.name || user.username || '',
      reviewerRole: user.role
    },
    reviewedAt: db.serverDate()
  };

  await db.collection('candidates').doc(candidateId).update({
    data: {
      'trainingCamp.dailyRecords': currentRecords,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    'review_training_camp_record',
    user.username,
    candidateId,
    {
      candidateName: candidate.basicInfo?.name || '',
      recordId,
      reviewStatus
    }
  );

  return {
    success: true,
    message: '复核成功'
  };
}

function normalizeDanceCourseDate(value) {
  return String(value || '').trim();
}

function normalizeDanceCourseTime(value) {
  return String(value || '').trim().slice(0, 5);
}

function normalizeDanceCourseMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1vn' ? '1vn' : '1v1';
}

async function ensureDanceCourseSlotsCollection() {
  try {
    await db.createCollection('dance_course_slots');
  } catch (error) {
    const message = String(error?.errMsg || error?.message || '');
    if (
      message.includes('already exists') ||
      message.includes('Collection.AlreadyExists') ||
      message.includes('DATABASE_COLLECTION_ALREADY_EXIST')
    ) {
      return;
    }
    if (
      message.includes('permission denied') ||
      message.includes('PERMISSION_DENIED')
    ) {
      console.warn('[dance_course] 自动建表权限不足，继续按现有集合执行:', message);
      return;
    }
    throw error;
  }
}

function sortDanceCourseSlots(list = []) {
  return [...list].sort((a, b) => {
    const aKey = `${a.courseDate || ''} ${a.startTime || ''}`;
    const bKey = `${b.courseDate || ''} ${b.startTime || ''}`;
    return aKey.localeCompare(bKey);
  });
}

function buildDanceCourseSlotPayload(data = {}, user = {}) {
  const courseDate = normalizeDanceCourseDate(data.courseDate);
  const startTime = normalizeDanceCourseTime(data.startTime);
  const endTime = normalizeDanceCourseTime(data.endTime);
  const courseMode = normalizeDanceCourseMode(data.courseMode);
  const rawCapacity = Math.max(Number(data.capacity || 1), 1);
  const capacity = courseMode === '1v1' ? 1 : rawCapacity;
  const location = String(data.location || '').trim().slice(0, 80);
  const note = String(data.note || '').trim().slice(0, 300);

  return {
    teacherId: String(user._id || '').trim(),
    teacherUsername: String(user.username || '').trim(),
    teacherName: String(user.name || user.username || '').trim(),
    teacherPhone: String(user.phone || '').trim(),
    courseDate,
    startTime,
    endTime,
    courseMode,
    capacity: Number.isFinite(capacity) ? Math.min(capacity, 20) : 1,
    location,
    note
  };
}

function validateDanceCourseSlotPayload(payload = {}) {
  if (!payload.teacherId) {
    return '未识别到舞蹈老师身份';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.courseDate)) {
    return '请选择上课日期';
  }
  if (!/^\d{2}:\d{2}$/.test(payload.startTime) || !/^\d{2}:\d{2}$/.test(payload.endTime)) {
    return '请填写完整的上课时间';
  }
  if (payload.startTime >= payload.endTime) {
    return '下课时间需晚于上课时间';
  }
  if (!['1v1', '1vn'].includes(payload.courseMode)) {
    return '课程模式无效';
  }
  return '';
}

function formatDanceCourseSlot(slot = {}) {
  const bookings = Array.isArray(slot.bookings) ? slot.bookings : [];
  const waitlist = Array.isArray(slot.waitlist) ? slot.waitlist : [];
  const activeBookings = bookings.filter(item => item?.status === 'booked');
  const activeWaitlist = waitlist.filter(item => item?.status === 'waitlisted');
  const capacity = Number(slot.capacity || 1);
  return {
    ...slot,
    bookings: activeBookings,
    waitlist: activeWaitlist,
    bookedCount: activeBookings.length,
    waitlistCount: activeWaitlist.length,
    remainingCount: Math.max(capacity - activeBookings.length, 0),
    isFull: activeBookings.length >= capacity,
    modeLabel: normalizeDanceCourseMode(slot.courseMode) === '1vn' ? '多人训练课' : '1V1'
  };
}

function buildDanceCourseBookingPayload(slot = {}, user = {}, status = 'booked', extras = {}) {
  const normalizedStatus = status === 'waitlisted' ? 'waitlisted' : 'booked';
  return {
    slotId: String(slot._id || extras.slotId || ''),
    teacherId: String(slot.teacherId || ''),
    teacherName: String(slot.teacherName || ''),
    teacherPhone: String(slot.teacherPhone || ''),
    courseDate: String(slot.courseDate || ''),
    startTime: String(slot.startTime || ''),
    endTime: String(slot.endTime || ''),
    location: String(slot.location || ''),
    note: String(slot.note || ''),
    courseMode: normalizeDanceCourseMode(slot.courseMode),
    capacity: Number(slot.capacity || 1),
    bookedByAgentId: String(user._id || extras.bookedByAgentId || ''),
    bookedByAgentName: String(user.name || user.username || extras.bookedByAgentName || ''),
    bookedAt: extras.bookedAt || db.serverDate(),
    status: normalizedStatus,
    waitlistPosition: normalizedStatus === 'waitlisted' ? Number(extras.waitlistPosition || 0) : 0,
    waitlistedAt: normalizedStatus === 'waitlisted' ? (extras.waitlistedAt || db.serverDate()) : null,
    promotedAt: normalizedStatus === 'booked' ? (extras.promotedAt || null) : null
  };
}

function buildDanceCourseBookingRecord(candidate = {}, slot = {}, bookingPayload = {}) {
  return {
    candidateId: candidate._id,
    candidateName: candidate.basicInfo?.name || '',
    agentId: candidate.assignedAgent?.agentId || bookingPayload.bookedByAgentId || '',
    agentName: candidate.assignedAgent?.agentName || bookingPayload.bookedByAgentName || '',
    ...bookingPayload
  };
}

async function syncCandidateDanceCourseBooking(candidateId, bookingPayload) {
  if (!candidateId) {
    return;
  }

  await db.collection('candidates').doc(candidateId).update({
    data: {
      'trainingCamp.danceCourseBooking': bookingPayload || null,
      updatedAt: db.serverDate()
    }
  });
}

async function releaseDanceCourseSlotBooking(slotId, candidateId) {
  if (!slotId || !candidateId) {
    return { promotedCandidateId: '', promotedBookingPayload: null };
  }

  const slotRes = await db.collection('dance_course_slots').doc(slotId).get().catch(() => ({ data: null }));
  const slot = slotRes.data;
  if (!slot) {
    return { promotedCandidateId: '', promotedBookingPayload: null };
  }

  const currentBookings = Array.isArray(slot.bookings) ? slot.bookings : [];
  const currentWaitlist = Array.isArray(slot.waitlist) ? slot.waitlist : [];
  const removedBooked = currentBookings.some((item) => item?.candidateId === candidateId && item?.status === 'booked');
  const nextBookings = currentBookings.filter((item) => item?.candidateId !== candidateId);
  const nextWaitlist = currentWaitlist.filter((item) => item?.candidateId !== candidateId);

  let promotedCandidateId = '';
  let promotedBookingPayload = null;

  if (normalizeDanceCourseMode(slot.courseMode) === '1v1' && removedBooked && nextBookings.length < 1 && nextWaitlist.length > 0) {
    const promoted = nextWaitlist.shift();
    const promotedPayload = buildDanceCourseBookingPayload(slot, {
      _id: promoted.bookedByAgentId || promoted.agentId || '',
      name: promoted.bookedByAgentName || promoted.agentName || '',
      username: promoted.bookedByAgentName || promoted.agentName || ''
    }, 'booked', {
      bookedAt: promoted.bookedAt || db.serverDate(),
      promotedAt: db.serverDate()
    });

    nextBookings.push({
      ...promoted,
      ...promotedPayload,
      status: 'booked'
    });
    promotedCandidateId = promoted.candidateId || '';
    promotedBookingPayload = promotedPayload;
  }

  const normalizedWaitlist = nextWaitlist.map((item, index) => ({
    ...item,
    status: 'waitlisted',
    waitlistPosition: index + 1
  }));

  await db.collection('dance_course_slots').doc(slotId).update({
    data: {
      bookings: nextBookings,
      waitlist: normalizedWaitlist,
      updatedAt: db.serverDate()
    }
  });

  if (promotedCandidateId && promotedBookingPayload) {
    await syncCandidateDanceCourseBooking(promotedCandidateId, promotedBookingPayload);
  }

  return {
    promotedCandidateId,
    promotedBookingPayload
  };
}

async function listDanceCourseSlots(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'agent', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限查看课程表' };
  }

  await ensureDanceCourseSlotsCollection();

  let query = db.collection('dance_course_slots');
  if (user.role === 'dance_teacher') {
    query = query.where({
      teacherId: String(user._id || '')
    });
  } else if (data?.teacherId) {
    query = query.where({
      teacherId: String(data.teacherId)
    });
  }

  const res = await query.get();
  const rawList = Array.isArray(res.data) ? res.data : [];
  const list = sortDanceCourseSlots(rawList.map(formatDanceCourseSlot)).filter((item) => {
    if (user.role === 'agent') {
      return item.status !== 'cancelled';
    }
    return true;
  });

  return {
    success: true,
    data: {
      list
    }
  };
}

async function createDanceCourseSlot(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限维护课程表' };
  }

  await ensureDanceCourseSlotsCollection();

  const payload = buildDanceCourseSlotPayload(data, user);
  const validationError = validateDanceCourseSlotPayload(payload);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const createRes = await db.collection('dance_course_slots').add({
    data: {
      ...payload,
      status: 'open',
      bookings: [],
      waitlist: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction('create_dance_course_slot', user.username, createRes._id, payload);

  return {
    success: true,
    message: '课程已添加',
    data: {
      slotId: createRes._id
    }
  };
}

async function updateDanceCourseSlot(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限维护课程表' };
  }

  await ensureDanceCourseSlotsCollection();

  const slotId = String(data?.slotId || '').trim();
  if (!slotId) {
    return { success: false, error: '缺少课程ID' };
  }

  const slotRes = await db.collection('dance_course_slots').doc(slotId).get();
  const slot = slotRes.data;
  if (!slot) {
    return { success: false, error: '课程不存在' };
  }

  if (user.role !== 'admin' && String(slot.teacherId || '') !== String(user._id || '')) {
    return { success: false, error: '无权限修改该课程' };
  }

  const payload = buildDanceCourseSlotPayload({
    courseDate: data.courseDate ?? slot.courseDate,
    startTime: data.startTime ?? slot.startTime,
    endTime: data.endTime ?? slot.endTime,
    capacity: data.capacity ?? slot.capacity,
    location: data.location ?? slot.location,
    note: data.note ?? slot.note
  }, {
    _id: slot.teacherId,
    username: slot.teacherUsername,
    name: slot.teacherName,
    phone: slot.teacherPhone
  });
  const validationError = validateDanceCourseSlotPayload(payload);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const bookedCount = Array.isArray(slot.bookings)
    ? slot.bookings.filter(item => item?.status === 'booked').length
    : 0;
  if (payload.capacity < bookedCount) {
    return { success: false, error: `当前已有 ${bookedCount} 个预约，容量不能小于已预约人数` };
  }

  let nextBookings = Array.isArray(slot.bookings) ? slot.bookings.filter(item => item?.status === 'booked') : [];
  let nextWaitlist = Array.isArray(slot.waitlist) ? slot.waitlist.filter(item => item?.status === 'waitlisted') : [];
  const promotedCandidates = [];

  while (nextWaitlist.length > 0 && nextBookings.length < payload.capacity) {
    const promoted = nextWaitlist.shift();
    const promotedPayload = buildDanceCourseBookingPayload({
      ...slot,
      ...payload,
      _id: slotId
    }, {
      _id: promoted.bookedByAgentId || promoted.agentId || '',
      name: promoted.bookedByAgentName || promoted.agentName || '',
      username: promoted.bookedByAgentName || promoted.agentName || ''
    }, 'booked', {
      bookedAt: promoted.bookedAt || db.serverDate(),
      promotedAt: db.serverDate()
    });

    nextBookings.push({
      ...promoted,
      ...promotedPayload,
      status: 'booked'
    });
    promotedCandidates.push({
      candidateId: promoted.candidateId,
      bookingPayload: promotedPayload
    });
  }

  nextWaitlist = nextWaitlist.map((item, index) => ({
    ...item,
    status: 'waitlisted',
    waitlistPosition: index + 1
  }));

  await db.collection('dance_course_slots').doc(slotId).update({
    data: {
      ...payload,
      bookings: nextBookings,
      waitlist: nextWaitlist,
      updatedAt: db.serverDate()
    }
  });

  for (const item of promotedCandidates) {
    if (item.candidateId && item.bookingPayload) {
      await syncCandidateDanceCourseBooking(item.candidateId, item.bookingPayload);
    }
  }

  await logAuditAction('update_dance_course_slot', user.username, slotId, payload);

  return {
    success: true,
    message: '课程已更新'
  };
}

async function cancelDanceCourseSlot(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限维护课程表' };
  }

  await ensureDanceCourseSlotsCollection();

  const slotId = String(data?.slotId || '').trim();
  if (!slotId) {
    return { success: false, error: '缺少课程ID' };
  }

  const slotRes = await db.collection('dance_course_slots').doc(slotId).get();
  const slot = slotRes.data;
  if (!slot) {
    return { success: false, error: '课程不存在' };
  }

  if (user.role !== 'admin' && String(slot.teacherId || '') !== String(user._id || '')) {
    return { success: false, error: '无权限取消该课程' };
  }

  await db.collection('dance_course_slots').doc(slotId).update({
    data: {
      status: 'cancelled',
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction('cancel_dance_course_slot', user.username, slotId, {
    courseDate: slot.courseDate,
    startTime: slot.startTime
  });

  return {
    success: true,
    message: '课程已取消'
  };
}

async function bookDanceCourseSlot(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['agent', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限预约课程' };
  }

  await ensureDanceCourseSlotsCollection();

  const candidateId = String(data?.candidateId || '').trim();
  const slotId = String(data?.slotId || '').trim();
  if (!candidateId || !slotId) {
    return { success: false, error: '缺少候选人或课程信息' };
  }

  const [candidateRes, slotRes] = await Promise.all([
    db.collection('candidates').doc(candidateId).get(),
    db.collection('dance_course_slots').doc(slotId).get()
  ]);
  const candidate = candidateRes.data;
  const slot = slotRes.data;

  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }
  if (!slot) {
    return { success: false, error: '课程不存在' };
  }
  if (slot.status === 'cancelled') {
    return { success: false, error: '该课程已取消' };
  }

  if (user.role === 'agent') {
    const assignedIds = Array.isArray(user.assignedCandidates) ? user.assignedCandidates : [];
    if (!assignedIds.includes(candidate._id)) {
      return { success: false, error: '无权限为该主播预约课程' };
    }
  }

  const bookings = Array.isArray(slot.bookings) ? slot.bookings : [];
  const waitlist = Array.isArray(slot.waitlist) ? slot.waitlist : [];
  const activeBookings = bookings.filter(item => item?.status === 'booked');
  const activeWaitlist = waitlist.filter(item => item?.status === 'waitlisted');
  const existingBooked = activeBookings.find(item => item?.candidateId === candidateId);
  const existingWaitlisted = activeWaitlist.find(item => item?.candidateId === candidateId);
  const courseMode = normalizeDanceCourseMode(slot.courseMode);
  const capacity = Number(slot.capacity || 1);

  if (existingBooked) {
    await syncCandidateDanceCourseBooking(candidateId, buildDanceCourseBookingPayload(slot, user, 'booked', {
      bookedAt: existingBooked.bookedAt || db.serverDate()
    }));
    return { success: true, message: '该主播已预约当前课程' };
  }

  if (existingWaitlisted) {
    await syncCandidateDanceCourseBooking(candidateId, buildDanceCourseBookingPayload(slot, user, 'waitlisted', {
      bookedAt: existingWaitlisted.bookedAt || db.serverDate(),
      waitlistedAt: existingWaitlisted.waitlistedAt || db.serverDate(),
      waitlistPosition: activeWaitlist.findIndex(item => item?.candidateId === candidateId) + 1
    }));
    return { success: true, message: '该主播已在当前课程候补队列中' };
  }

  const previousBooking = getDanceCourseBooking(candidate);
  if (previousBooking?.slotId && previousBooking.slotId !== slotId) {
    try {
      await releaseDanceCourseSlotBooking(previousBooking.slotId, candidateId);
    } catch (error) {
      console.warn('[dance_course] 清理旧预约失败:', error);
    }
  }

  let bookingStatus = 'booked';
  if (courseMode === '1v1' && activeBookings.length >= 1) {
    bookingStatus = 'waitlisted';
  } else if (courseMode === '1vn' && activeBookings.length >= capacity) {
    return { success: false, error: '该课程预约已满' };
  }

  const bookingPayload = buildDanceCourseBookingPayload(slot, user, bookingStatus, {
    waitlistPosition: bookingStatus === 'waitlisted' ? activeWaitlist.length + 1 : 0
  });
  const slotBookingRecord = buildDanceCourseBookingRecord(candidate, slot, bookingPayload);

  await db.collection('dance_course_slots').doc(slotId).update({
    data: bookingStatus === 'waitlisted'
      ? {
        waitlist: [...activeWaitlist, slotBookingRecord],
        updatedAt: db.serverDate()
      }
      : {
        bookings: [...activeBookings, slotBookingRecord],
        updatedAt: db.serverDate()
      }
  });

  await syncCandidateDanceCourseBooking(candidateId, bookingPayload);

  await logAuditAction('book_dance_course_slot', user.username, candidateId, {
    slotId,
    candidateName: candidate.basicInfo?.name || '',
    teacherName: slot.teacherName || '',
    bookingStatus
  });

  return {
    success: true,
    message: bookingStatus === 'waitlisted' ? '课程已满，已加入候补' : '课程预约成功'
  };
}

async function getDanceTeacherBookings(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!['dance_teacher', 'admin'].includes(user.role)) {
    return { success: false, error: '无权限查看预约' };
  }

  await ensureDanceCourseSlotsCollection();

  const teacherId = user.role === 'admin'
    ? String(data?.teacherId || '').trim()
    : String(user._id || '').trim();

  if (!teacherId) {
    return { success: false, error: '缺少舞蹈老师信息' };
  }

  const res = await db.collection('candidates').where({
    'trainingCamp.danceCourseBooking.teacherId': teacherId
  }).get();

  const list = (res.data || []).map((candidate) => {
    const booking = getDanceCourseBooking(candidate) || {};
    const dailyRecords = Array.isArray(candidate.trainingCamp?.dailyRecords)
      ? candidate.trainingCamp.dailyRecords
      : [];
    const pendingReviewCount = dailyRecords.filter((item) => item?.status === 'pending_review').length;
    const reviewedCount = dailyRecords.filter((item) => ['approved', 'rejected'].includes(item?.status)).length;
    return {
      candidateId: candidate._id,
      candidateName: candidate.basicInfo?.name || '',
      liveName: candidate.experience?.accountName || candidate.basicInfo?.artName || '',
      avatar: candidate.images?.facePhoto || candidate.images?.lifePhoto1 || '',
      status: candidate.status || '',
      booking,
      trainingRecordCount: dailyRecords.length,
      pendingReviewCount,
      reviewedCount
    };
  }).filter((item) => item.booking?.status === 'booked').sort((a, b) => {
    const aKey = `${a.booking.courseDate || ''} ${a.booking.startTime || ''}`;
    const bKey = `${b.booking.courseDate || ''} ${b.booking.startTime || ''}`;
    return aKey.localeCompare(bKey);
  });

  return {
    success: true,
    data: {
      list
    }
  };
}

// ==================== 星探管理相关 ====================

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
        list: Array.isArray(res.data) ? res.data.map(maskScoutSensitiveProfile) : [],
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

// ==================== 经纪人统计相关 ====================

// 获取经纪人工作统计
async function getAgentStats(token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!isReviewerRole(user.role)) {
    return { success: false, error: '仅面试角色可访问此接口' };
  }

  try {
    let candidates = [];

    if (user.role === 'agent') {
      const assignedIds = user.assignedCandidates || [];
      if (assignedIds.length === 0) {
        return {
          success: true,
          stats: {
            totalCount: 0,
            scoredCount: 0,
            pendingCount: 0,
            monthCount: 0
          }
        };
      }

      const candidatesRes = await db.collection('candidates').where({
        _id: _.in(assignedIds)
      }).get();

      candidates = (candidatesRes.data || []).filter(candidate => isCandidateActive(candidate));
    } else {
      const candidatesRes = await db.collection('candidates').get();

      candidates = (candidatesRes.data || [])
        .filter(candidate => isCandidateActive(candidate))
        .filter(candidate => isCandidateAssignedToReviewer(candidate, user));
    }

    const totalCount = candidates.length;

    // 已打分数量
    const scoredCount = candidates.filter(c => hasCompletedReview(c, user.role)).length;

    // 待打分数量
    const pendingCount = totalCount - scoredCount;

    // 本月新增数量
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = candidates.filter(c => {
      if (!c.createdAt) return false;
      const created = new Date(c.createdAt);
      return created >= monthStart;
    }).length;

    return {
      success: true,
      stats: {
        totalCount,
        scoredCount,
        pendingCount,
        monthCount
      }
    };
  } catch (error) {
    console.error('[admin] 获取经纪人统计失败:', error);
    return { success: false, error: '获取统计数据失败' };
  }
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

async function submitInterviewerEvaluation(data, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (!user.permissions.scoreInterview && !user.permissions.uploadInterviewMaterials) {
    return { success: false, error: '无权限提交评价' };
  }

  const { candidateId, role, evaluation } = data || {};
  if (!candidateId || !role || !evaluation || typeof evaluation !== 'object') {
    return { success: false, error: '缺少必要参数' };
  }

  const roleKey = normalizeRoleKey(role);
  const allowedRoles = ['admin', 'hr', 'operations', 'trainer', 'photographer', 'stylist', 'danceTeacher', 'makeupArtist', 'agent', 'hostMc'];
  if (!allowedRoles.includes(roleKey)) {
    return { success: false, error: '无效的评价角色' };
  }

  if (normalizeRoleKey(user.role) !== roleKey) {
    return { success: false, error: '当前账号角色与评价角色不匹配' };
  }

  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  const candidate = candidateRes.data;
  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }

  if (!isCandidateAssignedToReviewer(candidate, user)) {
    return { success: false, error: '无权限评价该候选人' };
  }

  const evaluations = clonePlainObject(candidate.evaluations);
  const payload = clonePlainObject(evaluation);
  const payloadImages = extractMediaList(payload, ['images', 'photos', 'pictures']).map((item) => item.url);
  const payloadVideos = extractMediaList(payload, ['videos', 'videoList']).map((item) => item.url);
  const payloadVideoLinks = extractMediaList(payload, ['videoLinks', 'links']).map((item) => item.url);
  const hasTemporaryMedia = [...payloadImages, ...payloadVideos, ...payloadVideoLinks].some(isTemporaryMediaUrl);

  if (hasTemporaryMedia) {
    return { success: false, error: '检测到未上传完成的临时媒体地址，请重新上传后再提交' };
  }

  payload.role = roleKey;
  payload.roleName = getRoleDisplayName(roleKey);
  payload.evaluatorId = user._id;
  payload.evaluatorName = user.name || user.username;
  payload.evaluatorUsername = user.username;
  payload.evaluatedAt = db.serverDate();

  if (!Array.isArray(payload.images)) {
    payload.images = extractMediaList(payload, ['images']);
  }

  if (!Array.isArray(payload.videoLinks)) {
    payload.videoLinks = extractMediaList(payload, ['videoLinks', 'links'])
      .map((item) => item.url)
      .filter(Boolean);
  }

  evaluations[roleKey] = payload;

  await db.collection('candidates').doc(candidateId).update({
    data: {
      evaluations,
      updatedAt: db.serverDate()
    }
  });

  await logAuditAction(
    'submit_interviewer_evaluation',
    user.username,
    candidateId,
    {
      candidateName: candidate.basicInfo?.name,
      role: roleKey,
      score: payload.score || '',
      comment: payload.comment || ''
    }
  );

  return {
    success: true,
    message: '提交成功'
  };
}

function getRoleDisplayName(roleKey) {
  const map = {
    admin: '管理员',
    hr: 'HR',
    agent: '经纪人',
    operations: '运营',
    trainer: '培训师',
    danceTeacher: '舞蹈导师',
    dance_teacher: '舞蹈导师',
    makeupArtist: '化妆师',
    makeup_artist: '化妆师',
    stylist: '造型师',
    photographer: '摄像师',
    hostMc: '主持/MC',
    host_mc: '主持/MC'
  };

  return map[roleKey] || roleKey || '面试官';
}

function normalizeRoleKey(roleKey = '') {
  const key = String(roleKey || '').trim();
  const aliasMap = {
    dance_teacher: 'danceTeacher',
    danceTeacher: 'danceTeacher',
    makeup_artist: 'makeupArtist',
    makeupArtist: 'makeupArtist',
    host_mc: 'hostMc',
    hostMc: 'hostMc',
    stylist: 'stylist',
    admin: 'admin',
    operations: 'operations',
    trainer: 'trainer',
    agent: 'agent',
    photographer: 'photographer',
    hr: 'hr'
  };

  return aliasMap[key] || key;
}

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some(isMeaningfulValue);
  if (isObject(value)) return Object.values(value).some(isMeaningfulValue);
  return true;
}

function clonePlainObject(value) {
  if (!isObject(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

function normalizeMediaEntry(entry) {
  if (!entry) return null;

  if (typeof entry === 'string') {
    return { url: entry };
  }

  if (!isObject(entry)) return null;

  const url = entry.url || entry.fileId || entry.fileID || entry.path || entry.link || '';
  if (!url) return null;

  return {
    ...entry,
    url
  };
}

function isTemporaryMediaUrl(value) {
  return typeof value === 'string' && (
    value.startsWith('wxfile://') ||
    value.startsWith('http://tmp') ||
    value.startsWith('https://tmp')
  );
}

function extractMediaList(payload, keys = []) {
  const list = [];

  keys.forEach((key) => {
    const value = payload?.[key];
    if (!isMeaningfulValue(value)) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = normalizeMediaEntry(item);
        if (normalized) list.push(normalized);
      });
      return;
    }

    if (isObject(value)) {
      Object.values(value).forEach((items) => {
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const normalized = normalizeMediaEntry(item);
            if (normalized) list.push(normalized);
          });
        }
      });
      return;
    }

    const normalized = normalizeMediaEntry(value);
    if (normalized) list.push(normalized);
  });

  return list;
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (isMeaningfulValue(value)) {
      return value;
    }
  }
  return '';
}

function buildCompletedEvaluation(roleKey, payload) {
  const data = clonePlainObject(payload);
  const score = pickFirstNonEmpty(
    data.totalScore,
    data.score,
    data.gradeScore,
    data.beforeAfterComparison?.score
  );
  const textComment = pickFirstNonEmpty(
    data.comments,
    data.comment,
    data.notes,
    data.recommendations,
    data.recommendation,
    data.improvement
  );

  const images = extractMediaList(data, ['images', 'photos', 'pictures']);
  const videos = extractMediaList(data, ['videos', 'videoList']);
  const videoLinks = extractMediaList(data, ['videoLinks', 'links'])
    .map((item) => item.url)
    .filter(Boolean);

  [
    'score',
    'totalScore',
    'gradeScore',
    'comments',
    'comment',
    'notes',
    'recommendations',
    'recommendation',
    'improvement',
    'images',
    'photos',
    'pictures',
    'videos',
    'videoList',
    'videoLinks',
    'links',
    'evaluatorId',
    'evaluatorName',
    'evaluatedAt'
  ].forEach((key) => {
    delete data[key];
  });

  return {
    roleKey,
    roleName: getRoleDisplayName(roleKey),
    completed: true,
    evaluatorName: payload?.evaluatorName || '',
    evaluatedAt: payload?.evaluatedAt || '',
    score: score || '',
    comment: typeof textComment === 'string' ? textComment : '',
    images,
    videos,
    videoLinks,
    rawFields: data
  };
}

function buildLegacyAgentEvaluation(scoreData) {
  return {
    roleKey: 'agent',
    roleName: getRoleDisplayName('agent'),
    completed: true,
    evaluatorName: scoreData?.scoredBy || scoreData?.scorerName || '',
    evaluatedAt: scoreData?.scoredAt || scoreData?.scoreTime || '',
    score: scoreData?.result || '',
    comment: scoreData?.comment || '',
    images: [],
    videos: [],
    videoLinks: [],
    rawFields: {
      tags: scoreData?.tags || {}
    }
  };
}

function buildInterviewCollectionEvaluation(record) {
  const roleKey = normalizeRoleKey(record?.interviewerRole || record?.role || '');
  const dimensions = isObject(record?.dimensions) ? record.dimensions : {};
  const dimensionRemarks = isObject(record?.dimensionRemarks) ? record.dimensionRemarks : {};
  const dimensionPresetTags = isObject(record?.dimensionPresetTags) ? record.dimensionPresetTags : {};
  const attachments = isObject(record?.attachments) ? record.attachments : {};
  const styleTags = Array.isArray(record?.styleTags) ? record.styleTags : [];

  return {
    roleKey,
    roleName: getRoleDisplayName(roleKey),
    completed: String(record?.status || '') === 'submitted',
    evaluatorName: record?.interviewerName || record?.operator?.name || '',
    evaluatedAt: record?.submittedAt || record?.updatedAt || record?.createdAt || '',
    score: '',
    comment: '',
    images: extractMediaList({ images: attachments.images, photos: record?.images }, ['images', 'photos']),
    videos: extractMediaList({ videos: attachments.videos, videoList: record?.videos }, ['videos', 'videoList']),
    videoLinks: extractMediaList({ videoLinks: attachments.videoLinks, links: record?.videoLinks }, ['videoLinks', 'links'])
      .map((item) => item.url)
      .filter(Boolean),
    rawFields: {
      dimensions,
      dimensionRemarks,
      dimensionPresetTags,
      styleTags
    }
  };
}

function buildPendingEvaluation(interviewer, index) {
  if (typeof interviewer === 'string') {
    return {
      roleKey: `interviewer_${index}`,
      roleName: interviewer,
      completed: false,
      evaluatorName: interviewer,
      evaluatedAt: '',
      score: '',
      comment: '',
      images: [],
      videos: [],
      videoLinks: [],
      rawFields: {}
    };
  }

  const roleKey = normalizeRoleKey(interviewer?.role || `interviewer_${index}`);

  return {
    roleKey,
    roleName: getRoleDisplayName(roleKey),
    completed: false,
    evaluatorName: interviewer?.name || '',
    evaluatedAt: '',
    score: '',
    comment: '',
    images: [],
    videos: [],
    videoLinks: [],
    rawFields: {}
  };
}

function normalizeSharedMaterials(materials) {
  const payload = clonePlainObject(materials);

  return {
    comment: pickFirstNonEmpty(payload.notes, payload.comment, payload.description) || '',
    uploadedBy: payload.uploadedByName || payload.uploadedBy || '',
    uploadedAt: payload.uploadedAt || '',
    images: extractMediaList(payload, ['photos', 'images', 'pictures']),
    videos: extractMediaList(payload, ['videos', 'videoList']),
    rawFields: Object.fromEntries(
      Object.entries(payload).filter(([key]) => ![
        'notes',
        'comment',
        'description',
        'uploadedByName',
        'uploadedBy',
        'uploadedAt',
        'photos',
        'images',
        'pictures',
        'videos',
        'videoList'
      ].includes(key))
    )
  };
}

async function getCandidateInterviewEvaluations(id, token) {
  const user = await getUserFromToken(token);
  if (!user) {
    return { success: false, error: '未授权，请重新登录' };
  }

  if (user.role === 'agent') {
    const assignedIds = user.assignedCandidates || [];
    if (!assignedIds.includes(id)) {
      return { success: false, error: '无权限查看该候选人' };
    }
  }

  const res = await db.collection('candidates').doc(id).get();
  const candidate = res.data;

  if (!candidate) {
    return { success: false, error: '候选人不存在' };
  }

  const evaluationMap = new Map();
  const sourceEvaluations = candidate.evaluations || {};

  Object.entries(sourceEvaluations).forEach(([rawRoleKey, payload]) => {
    if (!isMeaningfulValue(payload)) return;
    const roleKey = normalizeRoleKey(rawRoleKey);
    evaluationMap.set(roleKey, buildCompletedEvaluation(roleKey, payload));
  });

  const collectionEvaluationRes = await db.collection('interview_evaluations').where({
    candidateId: id,
    deletedAt: _.exists(false)
  }).get().catch(() => ({ data: [] }));

  (collectionEvaluationRes.data || []).forEach((record) => {
    const roleKey = normalizeRoleKey(record?.interviewerRole || record?.role || '');
    if (!roleKey) {
      return;
    }

    const nextEvaluation = buildInterviewCollectionEvaluation(record);
    const existing = evaluationMap.get(roleKey);
    if (!existing || nextEvaluation.completed || !existing.completed) {
      evaluationMap.set(roleKey, nextEvaluation);
    }
  });

  if (candidate.interview?.score && !evaluationMap.has('agent')) {
    evaluationMap.set('agent', buildLegacyAgentEvaluation(candidate.interview.score));
  }

  const interviewers = Array.isArray(candidate.interview?.interviewers)
    ? candidate.interview.interviewers
    : [];

  interviewers.forEach((item, index) => {
    const placeholder = buildPendingEvaluation(item, index);
    const existing = evaluationMap.get(placeholder.roleKey);
    if (!existing) {
      evaluationMap.set(placeholder.roleKey, placeholder);
      return;
    }

    if (!existing.evaluatorName && placeholder.evaluatorName) {
      existing.evaluatorName = placeholder.evaluatorName;
    }
  });

  const sharedMaterials = candidate.interview?.materials
    ? normalizeSharedMaterials(candidate.interview.materials)
    : null;

  await logAuditAction(
    'view_candidate_detail',
    user.username,
    id,
    { candidateName: candidate.basicInfo?.name, section: 'interview_evaluations' }
  );

  return {
    success: true,
    data: {
      candidate: {
        id: candidate._id,
        name: candidate.basicInfo?.name || '',
        artName: candidate.basicInfo?.artName || '',
        status: candidate.status || '',
        interview: candidate.interview ? {
          date: candidate.interview.date || '',
          time: candidate.interview.time || '',
          location: candidate.interview.location || '',
          notes: candidate.interview.notes || '',
          interviewers
        } : null
      },
      sharedMaterials,
      evaluations: Array.from(evaluationMap.values())
    }
  };
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
  const username = String(data.username || '').trim();
  const password = String(data.password || '');
  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();
  const desiredRole = String(data.desiredRole || '').trim();
  const reason = String(data.reason || '').trim();

  // 验证必填字段
  if (!username || !password || !name || !phone || !desiredRole) {
    return { success: false, error: '用户名、密码、姓名、手机号和期望角色为必填项' };
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

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '请输入正确的11位手机号' };
  }

  // 验证期望角色是否有效
  const validRoles = ['admin', 'hr', 'agent', 'operations', 'finance', 'trainer', 'dance_teacher', 'photographer', 'host_mc', 'makeup_artist', 'stylist'];
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
        phone,
        role: 'pending',
        status: 'pending',
        application: {
          desiredRole: desiredRole,
          phone,
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
      const validRoles = ['admin', 'hr', 'agent', 'operations', 'finance', 'trainer', 'dance_teacher', 'photographer', 'host_mc', 'makeup_artist', 'stylist'];
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
