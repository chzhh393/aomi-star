import { getAgentToken, handleTokenExpired } from './agent-auth.js';

function shouldExpireLogin(errorMsg) {
  return (
    errorMsg.includes('未授权') ||
    errorMsg.includes('登录') ||
    errorMsg.includes('token') ||
    errorMsg.includes('过期')
  );
}

async function callAdminFunction(action, data = {}) {
  const token = getAgentToken();
  if (!token) {
    throw new Error('未登录，请先登录');
  }

  const res = await wx.cloud.callFunction({
    name: 'admin',
    data: {
      action,
      token,
      data
    }
  });

  const result = res.result || {};
  if (!result.success) {
    const errorMsg = result.error || result.message || '请求失败';
    if (shouldExpireLogin(errorMsg)) {
      handleTokenExpired();
    }
    throw new Error(errorMsg);
  }

  return result;
}

export async function getHRCandidateList(params = {}) {
  const result = await callAdminFunction('getCandidateList', {
    page: params.page || 1,
    pageSize: params.pageSize || 100,
    status: params.status || 'all',
    keyword: params.keyword || ''
  });

  return result.data?.list || [];
}

export async function scheduleHRCandidateInterview(payload = {}) {
  return callAdminFunction('scheduleInterview', payload);
}

export async function saveHRContractDraft(payload = {}) {
  return callAdminFunction('saveContractWorkflowDraft', payload);
}

export async function submitHRContractFinanceReview(candidateId, comment = '') {
  return callAdminFunction('submitContractFinanceReview', {
    candidateId,
    comment
  });
}

export async function createHRContractESignTask(candidateId, useMock = true) {
  return callAdminFunction('createContractESignTask', {
    candidateId,
    useMock
  });
}

export async function refreshHRContractESignStatus(candidateId) {
  return callAdminFunction('refreshContractESignStatus', {
    candidateId
  });
}

export async function completeHRMockESign(candidateId) {
  return callAdminFunction('mockCompleteContractESign', {
    candidateId
  });
}

export async function saveHRFollowUp(payload = {}) {
  return callAdminFunction('saveCandidateFollowUp', payload);
}

export async function saveHRAssets(payload = {}) {
  return callAdminFunction('saveCandidateAssets', payload);
}
