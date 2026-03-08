// 权限管理工具

// 从 localStorage 获取用户信息
export function getUserInfo() {
  const userStr = localStorage.getItem('userInfo')
  return userStr ? JSON.parse(userStr) : null
}

// 保存用户信息到 localStorage
export function saveUserInfo(userInfo) {
  localStorage.setItem('userInfo', JSON.stringify(userInfo))
}

// 清除用户信息
export function clearUserInfo() {
  localStorage.removeItem('userInfo')
  localStorage.removeItem('token')
}

// 获取当前用户角色
export function getUserRole() {
  const userInfo = getUserInfo()
  return userInfo?.role || null
}

// 获取当前用户权限
export function getUserPermissions() {
  const userInfo = getUserInfo()
  return userInfo?.permissions || {}
}

// 检查是否有某个权限
export function hasPermission(permission) {
  const permissions = getUserPermissions()
  return permissions[permission] === true
}

// 检查是否是管理员
export function isAdmin() {
  return getUserRole() === 'admin'
}

// 检查是否是经纪人
export function isAgent() {
  return getUserRole() === 'agent'
}

// 权限列表配置（用于 UI 显示）
export const PERMISSIONS = {
  viewPersonalInfo: { label: '查看个人信息', description: '查看候选人手机号、微信号等个人信息' },
  viewReferralInfo: { label: '查看推荐信息', description: '查看候选人的星探推荐信息' },
  uploadInterviewMaterials: { label: '上传面试资料', description: '上传面试照片和才艺视频' },
  scoreInterview: { label: '面试打分', description: '对候选人进行面试评分' },
  updateStatus: { label: '更新状态', description: '审核通过/拒绝候选人' },
  exportData: { label: '导出数据', description: '导出候选人数据' },
  viewAuditLog: { label: '查看操作日志', description: '查看系统操作日志' },
  manageUsers: { label: '管理用户', description: '管理管理员和经纪人账号' },
  assignCandidates: { label: '分配候选人', description: '分配候选人给经纪人' }
}
