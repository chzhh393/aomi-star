import {
  buildInterviewEvaluationPayload
} from './interview-evaluation.js';
import { getAgentToken, handleTokenExpired } from './agent-auth.js';
import {
  validateDraftPayload,
  validateSubmitPayload
} from './interview-grade-validator.js';

function callInterviewFunction(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'interview',
    data: {
      action,
      data
    }
  }).then((res) => {
    const result = res.result || {};
    if (!result.success) {
      throw new Error(result.error || '请求失败');
    }
    return result;
  });
}

function callAdminFunction(action, data = {}) {
  const token = getAgentToken();
  if (!token) {
    return Promise.reject(new Error('未登录，请先登录'));
  }

  return wx.cloud.callFunction({
    name: 'admin',
    data: {
      action,
      token,
      data
    }
  }).then((res) => {
    const result = res.result || {};
    if (!result.success) {
      const errorMsg = result.error || result.message || '请求失败';
      if (errorMsg.includes('登录') || errorMsg.includes('未授权') || errorMsg.includes('token')) {
        handleTokenExpired();
      }
      throw new Error(errorMsg);
    }
    return result;
  });
}

function normalizePayloadForTransport(payload = {}, extras = {}) {
  return buildInterviewEvaluationPayload(payload, {
    candidateId: payload.candidateId,
    role: payload.role,
    operatorId: payload.operatorId,
    operatorName: payload.operatorName,
    round: payload.round,
    status: payload.status,
    ...extras
  });
}

export function getInterviewEnums() {
  return callInterviewFunction('getEnums');
}

export function getPendingInterviewCandidates(params = {}) {
  return callInterviewFunction('getPendingCandidates', params);
}

export function getCompletedInterviewCandidates(params = {}) {
  return callInterviewFunction('getCompletedCandidates', params);
}

export function getInterviewCandidateBasicInfo(candidateId) {
  return callInterviewFunction('getCandidateBasicInfo', { candidateId });
}

export function saveInterviewEvaluationDraft(payload = {}) {
  const normalizedPayload = normalizePayloadForTransport(payload);
  const validationError = validateDraftPayload(normalizedPayload);

  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return callInterviewFunction('saveEvaluationDraft', normalizedPayload);
}

export function submitInterviewEvaluation(payload = {}) {
  const normalizedPayload = normalizePayloadForTransport(payload);
  const validationError = validateSubmitPayload(normalizedPayload);

  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return callInterviewFunction('submitEvaluation', normalizedPayload);
}

export function getMyInterviewEvaluationDetail(paramsOrCandidateId, maybeRole) {
  const data = typeof paramsOrCandidateId === 'object' && paramsOrCandidateId !== null
    ? paramsOrCandidateId
    : { candidateId: paramsOrCandidateId, role: maybeRole };

  return callInterviewFunction('getMyEvaluationDetail', data);
}

export function getCandidateEvaluationSummary(paramsOrCandidateId) {
  const data = typeof paramsOrCandidateId === 'object' && paramsOrCandidateId !== null
    ? paramsOrCandidateId
    : { candidateId: paramsOrCandidateId };

  return callInterviewFunction('getCandidateSummary', data);
}

export function submitFounderDecision(payload = {}) {
  return callInterviewFunction('submitFinalDecision', payload);
}

export function getTrainingCampRecords(candidateId) {
  return callAdminFunction('getTrainingCampRecords', { candidateId });
}

export function reviewTrainingCampRecord(payload = {}) {
  return callAdminFunction('reviewTrainingCampRecord', payload);
}

export function listDanceCourseSlots(params = {}) {
  return callAdminFunction('listDanceCourseSlots', params);
}

export function createDanceCourseSlot(payload = {}) {
  return callAdminFunction('createDanceCourseSlot', payload);
}

export function updateDanceCourseSlot(payload = {}) {
  return callAdminFunction('updateDanceCourseSlot', payload);
}

export function cancelDanceCourseSlot(payload = {}) {
  return callAdminFunction('cancelDanceCourseSlot', payload);
}

export function getDanceTeacherBookings(params = {}) {
  return callAdminFunction('getDanceTeacherBookings', params);
}

export function submitInterviewEvaluationLegacy(data) {
  return submitInterviewEvaluation(data);
}

export function getCandidateInterviewSummary(candidateId) {
  return getCandidateEvaluationSummary(candidateId);
}

export function getRoleInterviewEvaluationDetail(candidateId, role) {
  return getMyInterviewEvaluationDetail(candidateId, role);
}

export { callInterviewFunction };
