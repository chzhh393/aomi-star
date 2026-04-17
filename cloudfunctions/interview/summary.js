const {
  DIMENSIONS,
  EVALUATION_STATUS,
  INTERVIEW_WORKFLOW_STATUS,
  INTERVIEW_ROLES,
  SCORE_LEVELS
} = require('./constants');
const { normalizeRole } = require('./validators');

function getCandidateInterviewers(candidate) {
  const interview = candidate.interview || candidate.interviewSchedule || {};
  return Array.isArray(interview.interviewers) ? interview.interviewers : [];
}

function mapCandidateStatusToInterviewWorkflow(candidate) {
  if (candidate.interviewStatus && Object.values(INTERVIEW_WORKFLOW_STATUS).includes(candidate.interviewStatus)) {
    return candidate.interviewStatus;
  }

  if (candidate.interviewFinalDecision?.decision) {
    return INTERVIEW_WORKFLOW_STATUS.finalized;
  }

  if (candidate.status === 'pending_rating' || candidate.status === 'rated') {
    return INTERVIEW_WORKFLOW_STATUS.pending;
  }

  return INTERVIEW_WORKFLOW_STATUS.interviewing;
}

function normalizeEvaluationForSummary(record) {
  let normalizedRole = '';
  try {
    normalizedRole = normalizeRole(record.interviewerRole || record.role || '');
  } catch (error) {
    normalizedRole = record.interviewerRole || record.role || '';
  }
  const remarks = record.dimensionRemarks || {};
  const presetTags = record.dimensionPresetTags || {};
  const attachments = record.attachments || {};

  return {
    id: record._id,
    candidateId: record.candidateId,
    round: record.round || '1',
    interviewerId: record.interviewerId || record.operator?.id || '',
    interviewerRole: normalizedRole,
    interviewerRoleLabel: INTERVIEW_ROLES[normalizedRole]?.label || record.roleLabel || normalizedRole || '',
    interviewerName: record.interviewerName || record.operator?.name || '',
    status: record.status || EVALUATION_STATUS.draft,
    dimensions: record.dimensions && typeof record.dimensions === 'object' ? record.dimensions : {},
    dimensionRemarks: remarks,
    dimensionPresetTags: presetTags,
    styleTags: Array.isArray(record.styleTags) ? record.styleTags : [],
    attachments: {
      images: Array.isArray(attachments.images) ? attachments.images : Array.isArray(record.images) ? record.images : [],
      videos: Array.isArray(attachments.videos) ? attachments.videos : Array.isArray(record.videos) ? record.videos : [],
      videoLinks: Array.isArray(attachments.videoLinks) ? attachments.videoLinks : Array.isArray(record.videoLinks) ? record.videoLinks : []
    },
    submittedAt: record.submittedAt || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    schemaVersion: record.schemaVersion || 1,
    legacy: record.schemaVersion === 2 ? null : {
      score: record.score,
      comment: record.comment || '',
      images: Array.isArray(record.images) ? record.images : [],
      videos: Array.isArray(record.videos) ? record.videos : [],
      videoLinks: Array.isArray(record.videoLinks) ? record.videoLinks : []
    }
  };
}

function buildEvaluationBrief(record) {
  if (!record) return null;

  const normalized = normalizeEvaluationForSummary(record);
  return {
    id: normalized.id,
    status: normalized.status,
    dimensions: normalized.dimensions,
    styleTags: normalized.styleTags,
    submittedAt: normalized.submittedAt,
    updatedAt: normalized.updatedAt,
    schemaVersion: normalized.schemaVersion,
    attachmentCount:
      normalized.attachments.images.length +
      normalized.attachments.videos.length +
      normalized.attachments.videoLinks.length,
    legacy: normalized.legacy
  };
}

function buildCandidateSummaryPayload(candidate, evaluations) {
  const interviewers = getCandidateInterviewers(candidate);
  const assigned = interviewers
    .map((item) => {
      if (!item) return null;
      let interviewerRole = '';
      try {
        interviewerRole = normalizeRole(String(item.role || '').trim());
      } catch (error) {
        return null;
      }
      return {
        interviewerId: String(item.id || item._id || item.userId || item.adminId || item.username || item.account || item.name || ''),
        interviewerRole,
        interviewerName: String(item.name || item.username || ''),
        assignedInterviewer: item
      };
    })
    .filter(Boolean)
    .map((item) => ({
      interviewerId: item.interviewerId,
      interviewerRole: item.interviewerRole,
      interviewerName: item.interviewerName,
      assignedInterviewer: item.assignedInterviewer
    }))
    .filter((item) => item.interviewerId && item.interviewerRole);

  const normalizedEvaluations = evaluations
    .map(normalizeEvaluationForSummary)
    .filter((item) => item.round === '1');
  const submittedKeys = new Set(
    normalizedEvaluations
      .filter((item) => item.status === EVALUATION_STATUS.submitted)
      .map((item) => `${item.round}::${item.interviewerRole}::${item.interviewerId}`)
  );

  const assignedProgress = assigned.map((item) => {
    const key = `1::${item.interviewerRole}::${item.interviewerId}`;
    const evaluation = normalizedEvaluations.find((evaluationItem) =>
      evaluationItem.round === '1' &&
      evaluationItem.interviewerRole === item.interviewerRole &&
      evaluationItem.interviewerId === item.interviewerId
    );

    return {
      interviewerId: item.interviewerId,
      interviewerRole: item.interviewerRole,
      interviewerRoleLabel: INTERVIEW_ROLES[item.interviewerRole]?.label || item.interviewerRole,
      interviewerName: item.interviewerName,
      status: submittedKeys.has(key)
        ? EVALUATION_STATUS.submitted
        : evaluation?.status || EVALUATION_STATUS.draft
    };
  });

  const submittedCount = assignedProgress.filter((item) => item.status === EVALUATION_STATUS.submitted).length;
  const totalAssigned = assignedProgress.length;
  const pendingInterviewers = assignedProgress.filter((item) => item.status !== EVALUATION_STATUS.submitted);
  const workflowStatus = totalAssigned > 0 && submittedCount === totalAssigned
    ? INTERVIEW_WORKFLOW_STATUS.pending
    : mapCandidateStatusToInterviewWorkflow(candidate);

  return {
    candidateId: candidate._id,
    workflowStatus,
    totalAssigned,
    submittedCount,
    pendingCount: pendingInterviewers.length,
    pendingInterviewers,
    assignedInterviewers: assignedProgress,
    completedAll: totalAssigned > 0 && submittedCount === totalAssigned,
    lastSubmittedAt: normalizedEvaluations
      .filter((item) => item.submittedAt)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]?.submittedAt || null
  };
}

function buildEvaluationMatrix(evaluations) {
  const submitted = evaluations.filter((item) => item.status === EVALUATION_STATUS.submitted);

  return Object.keys(DIMENSIONS).map((dimensionKey) => {
    const distribution = SCORE_LEVELS.reduce((acc, level) => {
      acc[level] = 0;
      return acc;
    }, {});

    const entries = submitted
      .filter((item) => item.dimensions[dimensionKey])
      .map((item) => {
        distribution[item.dimensions[dimensionKey]] += 1;
        return {
          interviewerId: item.interviewerId,
          interviewerRole: item.interviewerRole,
          interviewerRoleLabel: item.interviewerRoleLabel,
          interviewerName: item.interviewerName,
          level: item.dimensions[dimensionKey],
          remark: item.dimensionRemarks[dimensionKey] || '',
          presetTags: item.dimensionPresetTags[dimensionKey] || []
        };
      });

    return {
      dimension: dimensionKey,
      dimensionLabel: DIMENSIONS[dimensionKey],
      distribution,
      entries
    };
  });
}

function buildSevereConflicts(matrix) {
  return matrix
    .filter((item) => item.distribution.S > 0 && item.distribution.C > 0)
    .map((item) => ({
      dimension: item.dimension,
      dimensionLabel: item.dimensionLabel,
      levels: ['S', 'C'],
      interviewers: item.entries
        .filter((entry) => entry.level === 'S' || entry.level === 'C')
        .map((entry) => ({
          interviewerId: entry.interviewerId,
          interviewerRole: entry.interviewerRole,
          interviewerRoleLabel: entry.interviewerRoleLabel,
          interviewerName: entry.interviewerName,
          level: entry.level,
          remark: entry.remark
        }))
    }));
}

function buildCandidateEvaluationSummary(candidate, evaluations, candidateView = candidate) {
  const normalizedEvaluations = evaluations
    .map(normalizeEvaluationForSummary)
    .filter((item) => item.round === '1');
  const progress = buildCandidateSummaryPayload(candidate, evaluations);
  const matrix = buildEvaluationMatrix(normalizedEvaluations);
  const severeConflicts = buildSevereConflicts(matrix);

  return {
    candidate: candidateView,
    progress,
    evaluations: normalizedEvaluations,
    sharedMaterials: candidate.interview?.materials || {},
    matrix,
    severeConflicts,
    finalDecision: candidate.interviewFinalDecision || null
  };
}

module.exports = {
  buildCandidateEvaluationSummary,
  buildCandidateSummaryPayload,
  buildEvaluationBrief,
  getCandidateInterviewers,
  mapCandidateStatusToInterviewWorkflow,
  normalizeEvaluationForSummary
};
