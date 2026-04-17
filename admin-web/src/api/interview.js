import wxcloud from './wxcloud'
import { getUserInfo } from '../utils/permission'

function buildOperatorPayload() {
  const userInfo = getUserInfo() || {}
  return {
    operatorId: userInfo._id || userInfo.id || userInfo.username || userInfo.name || '',
    operatorRole: userInfo.role || '',
    operatorName: userInfo.name || userInfo.username || ''
  }
}

export const interviewAPI = {
  getEnums() {
    return wxcloud.callFunction('interview', {
      action: 'getEnums',
      data: {}
    })
  },

  getPendingCandidates(params = {}) {
    return wxcloud.callFunction('interview', {
      action: 'getPendingCandidates',
      data: params
    })
  },

  getCompletedCandidates(params = {}) {
    return wxcloud.callFunction('interview', {
      action: 'getCompletedCandidates',
      data: params
    })
  },

  getCandidateBasicInfo(candidateId) {
    return wxcloud.callFunction('interview', {
      action: 'getCandidateBasicInfo',
      data: { candidateId }
    })
  },

  submitEvaluation(data) {
    return wxcloud.callFunction('interview', {
      action: 'submitEvaluation',
      data: {
        ...data,
        ...buildOperatorPayload()
      }
    })
  },

  getCandidateSummary(candidateId) {
    return wxcloud.callFunction('interview', {
      action: 'getCandidateSummary',
      data: {
        candidateId,
        ...buildOperatorPayload()
      }
    })
  },

  submitFinalDecision(payload = {}) {
    return wxcloud.callFunction('interview', {
      action: 'submitFinalDecision',
      data: {
        ...payload,
        ...buildOperatorPayload()
      }
    })
  },

  getRoleEvaluationDetail(candidateId, role) {
    return wxcloud.callFunction('interview', {
      action: 'getMyEvaluationDetail',
      data: {
        candidateId,
        role,
        ...buildOperatorPayload()
      }
    })
  }
}
