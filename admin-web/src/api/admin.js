import wxcloud from './wxcloud'

export const adminAPI = {
  // 管理员登录
  login(username, password) {
    return wxcloud.callFunction('admin', {
      action: 'login',
      data: { username, password }
    })
  },

  // 获取候选人列表
  getCandidateList(params = {}) {
    return wxcloud.callFunction('admin', {
      action: 'getCandidateList',
      data: params
    })
  },

  // 获取候选人详情
  getCandidateDetail(id) {
    return wxcloud.callFunction('admin', {
      action: 'getCandidateDetail',
      data: { id }
    })
  },

  // 获取候选人面试评价聚合数据
  getCandidateInterviewEvaluations(id) {
    return wxcloud.callFunction('admin', {
      action: 'getCandidateInterviewEvaluations',
      data: { id }
    })
  },

  // 更新候选人状态（审核通过/拒绝）
  updateCandidateStatus(id, status, reason = '') {
    return wxcloud.callFunction('admin', {
      action: 'updateCandidateStatus',
      data: { id, status, reason }
    })
  },

  // 批量更新候选人状态
  batchUpdateStatus(ids, status, reason = '') {
    return wxcloud.callFunction('admin', {
      action: 'batchUpdateStatus',
      data: { ids, status, reason }
    })
  },

  // 安排面试
  scheduleInterview(data) {
    return wxcloud.callFunction('admin', {
      action: 'scheduleInterview',
      data
    })
  },

  // 获取统计数据
  getStatistics() {
    return wxcloud.callFunction('admin', {
      action: 'getStatistics',
      data: {}
    })
  },

  // 删除候选人（硬删除，仅admin账号）
  deleteCandidate(id) {
    return wxcloud.callFunction('admin', {
      action: 'deleteCandidate',
      data: { id }
    })
  },

  // ==================== 权限管理相关 ====================

  // 获取管理员/经纪人列表
  getAdminList() {
    return wxcloud.callFunction('admin', {
      action: 'getAdminList',
      data: {}
    })
  },

  // 创建管理员/经纪人账号
  createAdmin(data) {
    return wxcloud.callFunction('admin', {
      action: 'createAdmin',
      data
    })
  },

  // 更新管理员/经纪人信息
  updateAdmin(data) {
    return wxcloud.callFunction('admin', {
      action: 'updateAdmin',
      data
    })
  },

  // 删除管理员/经纪人
  deleteAdmin(id) {
    return wxcloud.callFunction('admin', {
      action: 'deleteAdmin',
      data: { id }
    })
  },

  // ==================== 候选人分配相关 ====================

  // 分配候选人给经纪人
  assignCandidate(candidateId, agentId) {
    return wxcloud.callFunction('admin', {
      action: 'assignCandidate',
      data: { candidateId, agentId }
    })
  },

  // 取消分配候选人
  unassignCandidate(candidateId) {
    return wxcloud.callFunction('admin', {
      action: 'unassignCandidate',
      data: { candidateId }
    })
  },

  // 获取分配关系列表
  getAssignments() {
    return wxcloud.callFunction('admin', {
      action: 'getAssignments',
      data: {}
    })
  },

  // 获取经纪人列表（含分配统计）
  getAgentList() {
    return wxcloud.callFunction('admin', {
      action: 'getAgentList',
      data: {}
    })
  },

  // 批量分配候选人给经纪人
  batchAssignCandidates(data) {
    return wxcloud.callFunction('admin', {
      action: 'batchAssignCandidates',
      data
    })
  },

  createTrainingCampTodo(data) {
    return wxcloud.callFunction('admin', {
      action: 'createTrainingCampTodo',
      data
    })
  },

  // ==================== 用户申请和审核相关 ====================

  // 用户申请（无需token）
  applyUser(data) {
    return wxcloud.callFunction('admin', {
      action: 'applyUser',
      data,
      needToken: false // 申请不需要token
    })
  },

  // 获取用户列表
  getUserList(params = {}) {
    return wxcloud.callFunction('admin', {
      action: 'getUserList',
      data: params
    })
  },

  // 审核用户
  reviewUser(data) {
    return wxcloud.callFunction('admin', {
      action: 'reviewUser',
      data
    })
  },

  // ==================== 操作日志相关 ====================

  // 获取审计日志
  getAuditLogs(params = {}) {
    return wxcloud.callFunction('admin', {
      action: 'getAuditLogs',
      data: params
    })
  },

  // ==================== 面试打分相关 ====================

  // 面试打分
  scoreInterview(candidateId, score) {
    return wxcloud.callFunction('admin', {
      action: 'scoreInterview',
      data: { candidateId, score }
    })
  },

  // ==================== 面试资料上传相关 ====================

  // 上传面试资料
  uploadInterviewMaterials(candidateId, type, materials) {
    return wxcloud.callFunction('admin', {
      action: 'uploadInterviewMaterials',
      data: { candidateId, type, materials }
    })
  },

  // 修改候选人推荐星探归属
  updateCandidateReferral(data) {
    return wxcloud.callFunction('admin', {
      action: 'updateCandidateReferral',
      data
    })
  },

  // 删除面试资料
  deleteInterviewMaterial(candidateId, type, fileId) {
    return wxcloud.callFunction('admin', {
      action: 'deleteInterviewMaterial',
      data: { candidateId, type, fileId }
    })
  },

  saveContractWorkflowDraft(data) {
    return wxcloud.callFunction('admin', {
      action: 'saveContractWorkflowDraft',
      data
    })
  },

  submitContractFinanceReview(candidateId, comment = '') {
    return wxcloud.callFunction('admin', {
      action: 'submitContractFinanceReview',
      data: { candidateId, comment }
    })
  },

  reviewContractFinance(candidateId, approved, comment = '') {
    return wxcloud.callFunction('admin', {
      action: 'reviewContractFinance',
      data: { candidateId, approved, comment }
    })
  },

  approveContractAdmin(candidateId, approved, comment = '') {
    return wxcloud.callFunction('admin', {
      action: 'approveContractAdmin',
      data: { candidateId, approved, comment }
    })
  },

  updateContractNegotiation(candidateId, negotiationStatus, note = '') {
    return wxcloud.callFunction('admin', {
      action: 'updateContractNegotiation',
      data: { candidateId, negotiationStatus, note }
    })
  },

  createContractESignTask(candidateId, useMock = true) {
    return wxcloud.callFunction('admin', {
      action: 'createContractESignTask',
      data: { candidateId, useMock }
    })
  },

  refreshContractESignStatus(candidateId) {
    return wxcloud.callFunction('admin', {
      action: 'refreshContractESignStatus',
      data: { candidateId }
    })
  },

  mockCompleteContractESign(candidateId) {
    return wxcloud.callFunction('admin', {
      action: 'mockCompleteContractESign',
      data: { candidateId }
    })
  }
}

// 星探相关 API
export function callScoutFunction(action, data = {}) {
  return wxcloud.callFunction('scout', {
    action,
    data
  })
}

// 获取星探列表
export function getScouts(params = {}) {
  return wxcloud.callFunction('scout', {
    action: 'getAllScouts',
    data: params
  })
}

// 获取星探详情
export function getScoutDetail(scoutId) {
  return wxcloud.callFunction('scout', {
    action: 'getScoutDetail',
    data: { scoutId }
  })
}
