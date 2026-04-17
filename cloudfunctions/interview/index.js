const cloud = require('wx-server-sdk');
const {
  COLLECTIONS,
  DIMENSIONS,
  EVALUATION_STATUS,
  FINAL_DECISIONS,
  INTERVIEW_ROLES,
  INTERVIEW_WORKFLOW_STATUS,
  SCHEMA_VERSION,
  STYLE_TAGS
} = require('./constants');
const {
  normalizeEvaluationStatus,
  normalizeFinalDecision,
  normalizePage,
  normalizeRole,
  normalizeRound,
  normalizeText,
  validateEvaluationPayload
} = require('./validators');
const {
  buildCandidateEvaluationSummary,
  buildCandidateSummaryPayload,
  buildEvaluationBrief,
  mapCandidateStatusToInterviewWorkflow,
  normalizeEvaluationForSummary
} = require('./summary');
const {
  assertFounderPermission,
  assertInterviewerPermission,
  canReadEvaluationDetail
} = require('./permission');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const FINAL_NOTICE_TEMPLATE_ID = '-0O7BnI57E_sDWOYezEjF8hlFAB3kaWQPOniWmkDXvc';

function truncateText(value, max = 20) {
  return [...String(value || '')].slice(0, max).join('');
}

function formatDateTime(date = new Date()) {
  const bjTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = bjTime.getUTCFullYear();
  const month = String(bjTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bjTime.getUTCDate()).padStart(2, '0');
  const hour = String(bjTime.getUTCHours()).padStart(2, '0');
  const minute = String(bjTime.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildTrainingCampNotice(candidate) {
  const candidateName = candidate?.basicInfo?.name || candidate?.basicInfo?.artName || '候选人';
  return [
    `Hi ${candidateName}：`,
    '衷心感谢您对奥米光年的信任与耐心等待，我们非常荣幸地通知您：经过综合的评审与选拔，您已入选“早早鸟”训练营！',
    '感谢你对我们的坚定选择。接下来的一周，我们将为你准备系统化的专业打磨，助力你全方位进化，向着舞台中心更进一步。',
    '如果你已经准备好迎接挑战，请直接回复“确认入营”,并于本月20日13:00到公司报到。期待在奥米光年遇见发光的你！',
    '奥米光年 选拔组',
    '2026年3月16日'
  ].join('\n');
}

async function sendFinalDecisionNotification(candidate, decision) {
  if (!candidate?.openId || decision !== 'accepted') {
    return false;
  }

  const candidateName = candidate.basicInfo?.name || candidate.basicInfo?.artName || '主播候选人';
  const candidateId = candidate._id || '';
  const targetPage = candidateId
    ? `pages/recruit/status/status?id=${candidateId}`
    : 'pages/recruit/status/status';

  const dataCandidates = [
    {
      thing1: { value: truncateText('早早鸟训练营') },
      date2: { value: formatDateTime() },
      thing3: { value: truncateText(candidateName) },
      phrase4: { value: '已入选' }
    },
    {
      thing1: { value: truncateText('早早鸟训练营') },
      time2: { value: formatDateTime() },
      thing3: { value: truncateText(candidateName) },
      phrase4: { value: '已入选' }
    }
  ];

  for (let i = 0; i < dataCandidates.length; i++) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: candidate.openId,
        templateId: FINAL_NOTICE_TEMPLATE_ID,
        page: targetPage,
        data: dataCandidates[i]
      });
      console.log(`[interview] 终裁通知发送成功，dataPattern=${i + 1}，page=${targetPage}`);
      return true;
    } catch (error) {
      console.warn(`[interview] 终裁通知发送失败，dataPattern=${i + 1}:`, {
        errCode: error.errCode,
        errMsg: error.errMsg || error.message
      });
    }
  }

  return false;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data = {} } = event;

  console.log('[interview] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'getEnums':
        return getEnums();
      case 'getPendingCandidates':
        return await getRoleCandidateList(data, false, openId);
      case 'getCompletedCandidates':
        return await getRoleCandidateList(data, true, openId);
      case 'getCandidateBasicInfo':
        return await getCandidateBasicInfo(data);
      case 'saveEvaluationDraft':
        return await saveEvaluationDraft(data, openId);
      case 'submitEvaluation':
        return await submitEvaluation(data, openId);
      case 'getMyEvaluationDetail':
        return await getMyEvaluationDetail(data, openId);
      case 'getCandidateEvaluationSummary':
      case 'getCandidateSummary':
        return await getCandidateEvaluationSummary(data, openId);
      case 'submitFinalDecision':
        return await submitFinalDecision(data, openId);
      case 'getRoleEvaluationDetail':
        return await getRoleEvaluationDetail(data, openId);
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (error) {
    console.error('[interview] 错误:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

function getEnums() {
  return {
    success: true,
    data: {
      roles: Object.values(INTERVIEW_ROLES),
      evaluationStatuses: Object.values(EVALUATION_STATUS),
      interviewWorkflowStatuses: INTERVIEW_WORKFLOW_STATUS,
      finalDecisions: FINAL_DECISIONS,
      dimensions: DIMENSIONS,
      styleTags: STYLE_TAGS
    }
  };
}

function buildCandidateBasic(candidate, userProfile = {}) {
  const basicInfo = candidate.basicInfo || {};
  const avatar = basicInfo.avatar
    || basicInfo.facePhoto
    || userProfile.avatar
    || userProfile.avatarUrl
    || userProfile.photo
    || candidate.avatar
    || candidate.images?.facePhoto
    || candidate.images?.lifePhoto1
    || candidate.images?.lifePhotos?.[0]
    || '';
  const assignedAgent = candidate.assignedAgent && typeof candidate.assignedAgent === 'object'
    ? {
        id: candidate.assignedAgent.agentId || '',
        name: candidate.assignedAgent.agentName || '',
        phone: candidate.assignedAgent.agentPhone || '',
        assignedAt: candidate.assignedAgent.assignedAt || null
      }
    : null;

  return {
    candidateId: candidate.candidateNo || candidate._id,
    candidateDocId: candidate._id,
    name: basicInfo.name || basicInfo.artName || '',
    avatar,
    liveName: candidate.experience?.accountName || basicInfo.artName || '',
    gender: basicInfo.gender || '',
    age: basicInfo.age || 0,
    phone: basicInfo.phone || '',
    assignedAgent,
    status: candidate.status || '',
    interviewStatus: mapCandidateStatusToInterviewWorkflow(candidate),
    interview: candidate.interview || candidate.interviewSchedule || null
  };
}

function normalizeSharedMaterialItem(url, type, operatorName, operatorRole) {
  const normalizedUrl = normalizeText(url, 1000);
  if (!normalizedUrl) return null;

  return {
    url: normalizedUrl,
    fileId: normalizedUrl,
    type,
    uploadedByName: operatorName || '面试官',
    uploadedByRole: operatorRole || '',
    uploadedAt: db.serverDate()
  };
}

function mergeSharedMaterialList(currentList = [], nextList = []) {
  const materialMap = new Map();

  currentList.forEach((item) => {
    const key = normalizeText(item?.url || item?.fileId || item?.fileID || '', 1000);
    if (key) {
      materialMap.set(key, item);
    }
  });

  nextList.forEach((item) => {
    const key = normalizeText(item?.url || item?.fileId || item?.fileID || '', 1000);
    if (key) {
      materialMap.set(key, item);
    }
  });

  return Array.from(materialMap.values());
}

async function syncCandidateSharedMaterials(candidateId, attachments = {}, operator = {}) {
  const candidate = await getCandidateOrThrow(candidateId);
  const currentMaterials = candidate.interview?.materials || { photos: [], videos: [] };
  const nextPhotos = (attachments.images || [])
    .map((url) => normalizeSharedMaterialItem(url, 'photo', operator.name, operator.role))
    .filter(Boolean);
  const nextVideos = (attachments.videos || [])
    .map((url) => normalizeSharedMaterialItem(url, 'video', operator.name, operator.role))
    .filter(Boolean);

  if (!nextPhotos.length && !nextVideos.length) {
    return;
  }

  const updatedMaterials = {
    ...currentMaterials,
    photos: mergeSharedMaterialList(currentMaterials.photos || [], nextPhotos),
    videos: mergeSharedMaterialList(currentMaterials.videos || [], nextVideos),
    uploadedByName: operator.name || currentMaterials.uploadedByName || '',
    uploadedBy: operator.name || currentMaterials.uploadedBy || '',
    uploadedAt: db.serverDate()
  };

  await db.collection(COLLECTIONS.candidates).doc(candidateId).update({
    data: {
      'interview.materials': updatedMaterials,
      updatedAt: db.serverDate()
    }
  });
}

function normalizeSharedMaterials(materials = {}) {
  const source = materials && typeof materials === 'object' ? materials : {};
  return {
    uploadedBy: source.uploadedByName || source.uploadedBy || '',
    uploadedAt: source.uploadedAt || '',
    images: Array.isArray(source.photos) ? source.photos : [],
    videos: Array.isArray(source.videos) ? source.videos : []
  };
}

function matchesKeyword(candidate, keyword) {
  if (!keyword) return true;

  const basicInfo = candidate.basicInfo || {};
  const target = [
    candidate._id,
    basicInfo.name,
    basicInfo.artName,
    basicInfo.phone
  ].join(' ').toLowerCase();

  return target.includes(keyword.toLowerCase());
}

async function getUserProfileByOpenId(openId) {
  if (!openId) return null;

  const res = await db.collection(COLLECTIONS.users).where({
    openId
  }).limit(1).get();

  return res.data[0]?.profile || null;
}

function formatDateSegment(dateValue) {
  const date = new Date(dateValue || Date.now());
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function buildCandidateNo(docId, dateValue) {
  const normalizedId = normalizeText(docId, 64).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = normalizedId.slice(-6).padStart(6, '0');
  return `C${formatDateSegment(dateValue)}${suffix}`;
}

async function ensureCandidateNo(candidate) {
  if (!candidate || !candidate._id) {
    return candidate || null;
  }

  if (candidate.candidateNo) {
    return candidate;
  }

  const candidateNo = buildCandidateNo(candidate._id, candidate.createdAt || candidate.updatedAt || Date.now());
  await db.collection(COLLECTIONS.candidates).doc(candidate._id).update({
    data: {
      candidateNo,
      updatedAt: db.serverDate()
    }
  }).catch(() => null);

  return {
    ...candidate,
    candidateNo
  };
}

async function getCandidateOrThrow(candidateIdentifier) {
  const normalizedCandidateId = normalizeText(candidateIdentifier, 100);
  if (!normalizedCandidateId) {
    throw new Error('缺少候选人ID');
  }

  const directRes = await db.collection(COLLECTIONS.candidates).doc(normalizedCandidateId).get().catch(() => null);
  if (directRes?.data) {
    return ensureCandidateNo(directRes.data);
  }

  const candidateNoRes = await db.collection(COLLECTIONS.candidates).where({
    candidateNo: normalizedCandidateId
  }).limit(1).get();
  if (candidateNoRes.data?.[0]) {
    return ensureCandidateNo(candidateNoRes.data[0]);
  }

  throw new Error('候选人不存在');
}

async function listCandidateEvaluations(candidateId) {
  const res = await db.collection(COLLECTIONS.interviewEvaluations).where({
    candidateId,
    deletedAt: _.exists(false)
  }).get();

  return res.data || [];
}

async function listAllActiveCandidates() {
  const query = db.collection(COLLECTIONS.candidates).where({
    deletedAt: _.exists(false),
    status: _.in(['approved', 'interview_scheduled', 'pending_rating', 'rated', 'signed', 'training'])
  });

  const countRes = await query.count();
  const total = countRes.total || 0;
  const batchSize = 100;
  const tasks = [];

  for (let skip = 0; skip < total; skip += batchSize) {
    tasks.push(
      query
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(batchSize)
        .get()
    );
  }

  const results = await Promise.all(tasks);
  return results.flatMap((item) => item.data || []);
}

function buildEvaluationMatcher(evaluation, context) {
  const evaluationRound = String(evaluation.round || '1').trim() || '1';
  const targetRound = normalizeRound(context.round);
  const evaluationRole = evaluation.interviewerRole || evaluation.role;
  const evaluationId = String(evaluation.interviewerId || evaluation.operator?.id || '');

  return (
    evaluation.candidateId === context.candidateId &&
    evaluationRound === targetRound &&
    evaluationRole === context.interviewerRole &&
    evaluationId === context.interviewerId
  );
}

async function getExistingEvaluation(candidateId, context) {
  const evaluations = await listCandidateEvaluations(candidateId);
  return evaluations.find((item) => buildEvaluationMatcher(item, context)) || null;
}

function buildCandidateStatusUpdate(candidate, workflowStatus, finalDecision) {
  const updateData = {
    interviewStatus: workflowStatus
  };

  if (workflowStatus === INTERVIEW_WORKFLOW_STATUS.pending) {
    if (['interview_scheduled', 'approved', 'online_test_completed'].includes(candidate.status)) {
      updateData.status = 'pending_rating';
    }
  }

  if (workflowStatus === INTERVIEW_WORKFLOW_STATUS.finalized) {
    if (finalDecision === 'accepted') {
      updateData.status = candidate.status === 'signed' ? candidate.status : 'rated';
    } else if (finalDecision === 'rejected') {
      updateData.status = 'rejected';
    } else if (candidate.status === 'interview_scheduled') {
      updateData.status = 'pending_rating';
    }
  }

  return updateData;
}

async function syncCandidateEvaluationSummary(candidateId) {
  const candidate = await getCandidateOrThrow(candidateId);
  const evaluations = await listCandidateEvaluations(candidateId);
  const userProfile = await getUserProfileByOpenId(candidate.openId);
  const candidateView = buildCandidateBasic(candidate, userProfile || {});
  const fullSummary = buildCandidateEvaluationSummary(candidate, evaluations, candidateView);
  const summary = fullSummary.progress;
  const nextWorkflowStatus = candidate.interviewFinalDecision?.decision
    ? INTERVIEW_WORKFLOW_STATUS.finalized
    : summary.completedAll
      ? INTERVIEW_WORKFLOW_STATUS.pending
      : INTERVIEW_WORKFLOW_STATUS.interviewing;
  const candidateUpdateData = {
    interviewEvaluationSummary: {
      candidate: candidateView,
      progress: {
        ...summary,
        workflowStatus: nextWorkflowStatus
      },
      matrix: fullSummary.matrix,
      severeConflicts: fullSummary.severeConflicts,
      finalDecision: candidate.interviewFinalDecision || null,
      workflowStatus: nextWorkflowStatus
    },
    updatedAt: db.serverDate(),
    ...buildCandidateStatusUpdate(candidate, nextWorkflowStatus, candidate.interviewFinalDecision?.decision)
  };

  const shouldResetLegacyFinalDecision =
    candidate.interviewFinalDecision?.decision &&
    candidate.interviewEvaluationSummary &&
    Object.prototype.hasOwnProperty.call(candidate.interviewEvaluationSummary, 'finalDecision') &&
    candidate.interviewEvaluationSummary.finalDecision === null;

  if (shouldResetLegacyFinalDecision) {
    await db.collection(COLLECTIONS.candidates).doc(candidateId).update({
      data: {
        interviewEvaluationSummary: _.remove(),
        updatedAt: db.serverDate()
      }
    }).catch(() => null);
  }

  await db.collection(COLLECTIONS.candidates).doc(candidateId).update({
    data: candidateUpdateData
  });

  if (candidate.openId && candidateUpdateData.status && ['pending_rating', 'rated', 'rejected'].includes(candidateUpdateData.status)) {
    const isAnchor = ['signed', 'training', 'active'].includes(candidateUpdateData.status);
    await db.collection(COLLECTIONS.users).where({
      openId: candidate.openId
    }).update({
      data: {
        userType: isAnchor ? 'anchor' : 'candidate',
        role: isAnchor ? 'anchor' : 'candidate',
        'candidateInfo.status': candidateUpdateData.status,
        updatedAt: db.serverDate()
      }
    }).catch(() => null);
  }

  return {
    ...summary,
    workflowStatus: nextWorkflowStatus
  };
}

async function upsertEvaluationRecord({ candidate, evaluationPayload, existed }) {
  const basePayload = {
    candidateId: candidate._id,
    candidateOpenId: candidate.openId || '',
    candidateSnapshot: buildCandidateBasic(candidate, await getUserProfileByOpenId(candidate.openId) || {}),
    round: evaluationPayload.round,
    interviewerId: evaluationPayload.interviewerId,
    interviewerRole: evaluationPayload.interviewerRole,
    interviewerName: evaluationPayload.interviewerName,
    interviewerRoleLabel: INTERVIEW_ROLES[evaluationPayload.interviewerRole]?.label || evaluationPayload.interviewerRole,
    status: evaluationPayload.status,
    dimensions: evaluationPayload.dimensions,
    dimensionRemarks: evaluationPayload.dimensionRemarks,
    dimensionPresetTags: evaluationPayload.dimensionPresetTags,
    styleTags: evaluationPayload.styleTags,
    attachments: evaluationPayload.attachments,
    assignedInterviewer: evaluationPayload.assignedInterviewer,
    updatedAt: db.serverDate(),
    schemaVersion: SCHEMA_VERSION
  };

  if (evaluationPayload.status === EVALUATION_STATUS.submitted) {
    basePayload.submittedAt = db.serverDate();
  }

  if (existed) {
    const legacyBackup = existed.schemaVersion === SCHEMA_VERSION ? existed.legacy || null : {
      score: existed.score,
      comment: existed.comment || '',
      images: existed.images || [],
      videos: existed.videos || [],
      videoLinks: existed.videoLinks || []
    };

    await db.collection(COLLECTIONS.interviewEvaluations).doc(existed._id).update({
      data: {
        ...basePayload,
        legacy: legacyBackup,
        role: evaluationPayload.interviewerRole,
        roleLabel: INTERVIEW_ROLES[evaluationPayload.interviewerRole]?.label || evaluationPayload.interviewerRole,
        operator: {
          id: evaluationPayload.interviewerId,
          name: evaluationPayload.interviewerName,
          role: evaluationPayload.interviewerRole
        }
      }
    });

    return existed._id;
  }

  const addRes = await db.collection(COLLECTIONS.interviewEvaluations).add({
    data: {
      ...basePayload,
      createdAt: db.serverDate(),
      role: evaluationPayload.interviewerRole,
      roleLabel: INTERVIEW_ROLES[evaluationPayload.interviewerRole]?.label || evaluationPayload.interviewerRole,
      operator: {
        id: evaluationPayload.interviewerId,
        name: evaluationPayload.interviewerName,
        role: evaluationPayload.interviewerRole
      }
    }
  });

  return addRes._id;
}

async function getRoleCandidateList(data, completed, openId) {
  const role = normalizeRole(data.role);
  const operatorId = normalizeText(data.operatorId || data.userId || openId || '', 100);
  const operatorName = normalizeText(data.operatorName || '', 100);
  const page = normalizePage(data.page, 1);
  const pageSize = normalizePage(data.pageSize, 20);
  const keyword = normalizeText(data.keyword || '', 100);

  const allCandidates = await listAllActiveCandidates();
  const matchedCandidates = [];

  for (const candidate of allCandidates) {
    const permission = await assertInterviewerPermission({
      db,
      candidate,
      role,
      operatorId,
      operatorName,
      openId
    }).catch(() => null);

    if (!permission || !matchesKeyword(candidate, keyword)) continue;

    const evaluation = await getExistingEvaluation(candidate._id, {
      candidateId: candidate._id,
      round: normalizeRound(data.round || '1'),
      interviewerRole: permission.interviewerRole,
      interviewerId: permission.interviewerId
    });

    const isCompleted = Boolean(evaluation && normalizeEvaluationStatus(evaluation.status) === EVALUATION_STATUS.submitted);
    if (completed && !isCompleted) continue;
    if (!completed && isCompleted) continue;

    const userProfile = await getUserProfileByOpenId(candidate.openId);
    matchedCandidates.push({
      ...buildCandidateBasic(candidate, userProfile || {}),
      assignedInterviewer: permission.assignedInterviewer,
      evaluation: buildEvaluationBrief(evaluation),
      interviewEvaluationSummary: candidate.interviewEvaluationSummary || null
    });
  }

  const total = matchedCandidates.length;
  const start = (page - 1) * pageSize;
  const list = matchedCandidates.slice(start, start + pageSize);

  return {
    success: true,
    data: {
      role,
      roleLabel: INTERVIEW_ROLES[role].label,
      list,
      total,
      page,
      pageSize
    }
  };
}

async function getCandidateBasicInfo(data) {
  const candidate = await getCandidateOrThrow(data.candidateId);
  const userProfile = await getUserProfileByOpenId(candidate.openId);

  return {
    success: true,
    data: buildCandidateBasic(candidate, userProfile || {})
  };
}

async function saveEvaluation(data, openId, forcedStatus) {
  const candidate = await getCandidateOrThrow(data.candidateId);
  const role = normalizeRole(data.role);
  const operatorId = normalizeText(data.operatorId || data.userId || openId || '', 100);
  const operatorName = normalizeText(data.operatorName || '', 100);
  const permission = await assertInterviewerPermission({
    db,
    candidate,
    role,
    operatorId,
    operatorName,
    openId
  });
  const normalizedEvaluation = validateEvaluationPayload({
    ...data,
    status: forcedStatus || data.status
  }, {
    defaultStatus: forcedStatus || EVALUATION_STATUS.draft
  });
  const existed = await getExistingEvaluation(candidate._id, {
    candidateId: candidate._id,
    round: normalizedEvaluation.round,
    interviewerRole: permission.interviewerRole,
    interviewerId: permission.interviewerId
  });

  if (existed && normalizeEvaluationStatus(existed.status) === EVALUATION_STATUS.submitted) {
    throw new Error('该评价已提交，不能再次修改');
  }

  const evaluationId = await upsertEvaluationRecord({
    candidate,
    existed,
    evaluationPayload: {
      ...normalizedEvaluation,
      interviewerId: permission.interviewerId,
      interviewerRole: permission.interviewerRole,
      interviewerName: permission.interviewerName,
      assignedInterviewer: permission.assignedInterviewer
    }
  });
  await syncCandidateSharedMaterials(candidate._id, normalizedEvaluation.attachments, {
    name: permission.interviewerName,
    role: permission.interviewerRole
  });
  const summary = await syncCandidateEvaluationSummary(candidate._id);

  return {
    success: true,
    message: normalizedEvaluation.status === EVALUATION_STATUS.submitted ? '评价提交成功' : '草稿保存成功',
    data: {
      evaluationId,
      candidateId: candidate._id,
      round: normalizedEvaluation.round,
      interviewerId: permission.interviewerId,
      interviewerRole: permission.interviewerRole,
      summary
    }
  };
}

async function saveEvaluationDraft(data, openId) {
  return saveEvaluation(data, openId, EVALUATION_STATUS.draft);
}

async function submitEvaluation(data, openId) {
  return saveEvaluation(data, openId, EVALUATION_STATUS.submitted);
}

async function getMyEvaluationDetail(data, openId) {
  const candidate = await getCandidateOrThrow(data.candidateId);
  const role = normalizeRole(data.role);
  const operatorId = normalizeText(data.operatorId || data.userId || openId || '', 100);
  const operatorName = normalizeText(data.operatorName || '', 100);
  const round = normalizeRound(data.round);
  const permission = await assertInterviewerPermission({
    db,
    candidate,
    role,
    operatorId,
    operatorName,
    openId
  });
  const userProfile = await getUserProfileByOpenId(candidate.openId);
  const evaluation = await getExistingEvaluation(candidate._id, {
    candidateId: candidate._id,
    round,
    interviewerRole: permission.interviewerRole,
    interviewerId: permission.interviewerId
  });
  const normalized = evaluation ? normalizeEvaluationForSummary(evaluation) : null;

  if (!canReadEvaluationDetail(permission, normalized)) {
    throw new Error('无权查看该评价详情');
  }

  return {
    success: true,
    data: {
      candidate: buildCandidateBasic(candidate, userProfile || {}),
      evaluation: normalized,
      sharedMaterials: normalizeSharedMaterials(candidate.interview?.materials || {}),
      assignedInterviewer: permission.assignedInterviewer,
      editable: !normalized || normalized.status !== EVALUATION_STATUS.submitted
    }
  };
}

async function getCandidateEvaluationSummary(data, openId) {
  await assertFounderPermission({
    db,
    operatorId: data.operatorId || data.userId,
    openId,
    operatorRole: data.operatorRole || data.role
  });

  const candidate = await getCandidateOrThrow(data.candidateId);
  const userProfile = await getUserProfileByOpenId(candidate.openId);
  const evaluations = await listCandidateEvaluations(candidate._id);

  return {
    success: true,
    data: buildCandidateEvaluationSummary(candidate, evaluations, buildCandidateBasic(candidate, userProfile || {}))
  };
}

async function submitFinalDecision(data, openId) {
  const founder = await assertFounderPermission({
    db,
    operatorId: data.operatorId || data.userId,
    openId,
    operatorRole: data.operatorRole || data.role
  });
  const candidate = await getCandidateOrThrow(data.candidateId);
  const decision = normalizeFinalDecision(data.decision || data.finalDecision);
  const comment = normalizeText(data.comment || data.remark || '', 2000);
  const requestedAgentId = normalizeText(data.agentId || '', 100);
  const skipInterviewFlow = Boolean(data.skipInterviewFlow);
  const canBypassInterviewFlow = founder.founderRole === 'admin' && skipInterviewFlow;
  const canReassignAgent = founder.founderRole === 'admin';
  const summary = buildCandidateSummaryPayload(candidate, await listCandidateEvaluations(candidate._id));

  if (!summary.completedAll && !canBypassInterviewFlow) {
    throw new Error('当前候选人尚未完成全部面试提交，不能终裁');
  }

  if (decision === 'rejected' && !comment) {
    throw new Error('未通过时必须填写原因');
  }

  const finalDecisionPayload = {
    decision,
    comment,
    decidedAt: db.serverDate(),
    decidedBy: {
      id: founder.founderId,
      role: founder.founderRole,
      name: founder.founderName || normalizeText(data.operatorName || '', 100)
    }
  };
  const trainingCampNotice = decision === 'accepted'
    ? {
        title: '早早鸟训练营入营通知',
        content: buildTrainingCampNotice(candidate),
        publishedAt: db.serverDate()
      }
    : null;

  let assignedAgent = candidate.assignedAgent || null;
  if (decision === 'accepted') {
    if (!assignedAgent?.agentId && !requestedAgentId) {
      throw new Error('终裁通过时必须指定经纪人');
    }

    if (requestedAgentId) {
      if (assignedAgent?.agentId && assignedAgent.agentId !== requestedAgentId && !canBypassInterviewFlow && !canReassignAgent) {
        throw new Error(`该候选人已分配给经纪人 ${assignedAgent.agentName || '未知'}，请先取消分配`);
      }

      if (!assignedAgent?.agentId || assignedAgent.agentId !== requestedAgentId) {
        const agentRes = await db.collection('admins').doc(requestedAgentId).get();
        const agent = agentRes.data || null;
        if (!agent || agent.role !== 'agent') {
          throw new Error('指定的经纪人不存在');
        }

        if (assignedAgent?.agentId && assignedAgent.agentId !== requestedAgentId) {
          const previousAgentRes = await db.collection('admins').doc(assignedAgent.agentId).get();
          const previousAgent = previousAgentRes.data || null;
          if (previousAgent) {
            const nextAssignedCandidates = (Array.isArray(previousAgent.assignedCandidates) ? previousAgent.assignedCandidates : [])
              .filter((item) => item !== candidate._id);
            await db.collection('admins').doc(assignedAgent.agentId).update({
              data: {
                assignedCandidates: nextAssignedCandidates,
                updatedAt: db.serverDate()
              }
            });
          }
        }

        const assignedCandidates = Array.isArray(agent.assignedCandidates) ? agent.assignedCandidates : [];
        if (!assignedCandidates.includes(candidate._id)) {
          await db.collection('admins').doc(requestedAgentId).update({
            data: {
              assignedCandidates: [...assignedCandidates, candidate._id],
              updatedAt: db.serverDate()
            }
          });
        }

        assignedAgent = {
          agentId: requestedAgentId,
          agentName: agent.name || agent.username || '',
          agentPhone: agent.phone || agent.mobile || '',
          assignedAt: db.serverDate(),
          assignedBy: founder.founderName || normalizeText(data.operatorName || '', 100) || 'system'
        };
      }
    }
  }

  await db.collection(COLLECTIONS.candidates).doc(candidate._id).update({
    data: {
      interviewFinalDecision: finalDecisionPayload,
      trainingCampNotice,
      ...(assignedAgent ? { assignedAgent } : {}),
      updatedAt: db.serverDate(),
      ...buildCandidateStatusUpdate(candidate, INTERVIEW_WORKFLOW_STATUS.finalized, decision)
    }
  });

  if (decision === 'accepted') {
    await sendFinalDecisionNotification(candidate, decision);
  }

  const latestSummary = await syncCandidateEvaluationSummary(candidate._id);

  return {
    success: true,
    message: '终裁提交成功',
    data: {
      candidateId: candidate._id,
      finalDecision: {
        ...finalDecisionPayload,
        decision
      },
      summary: latestSummary
    }
  };
}

async function getRoleEvaluationDetail(data, openId) {
  return getMyEvaluationDetail(data, openId);
}
