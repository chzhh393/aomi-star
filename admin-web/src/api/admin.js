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

  // 更新候选人状态（审核通过/拒绝）
  updateCandidateStatus(id, status, reason = '') {
    return wxcloud.callFunction('admin', {
      action: 'updateCandidateStatus',
      data: { id, status, reason }
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
  }
}
