/**
 * 邀请码数据模型
 * 管理员工和星探的邀请码
 */

// ==================== 邀请码类型 ====================
export const INVITE_TYPE = {
  EMPLOYEE: 'employee',     // 员工邀请码
  SCOUT: 'scout'            // 星探邀请码
};

// ==================== 邀请码状态 ====================
export const INVITE_STATUS = {
  ACTIVE: 'active',         // 有效
  USED: 'used',             // 已用完
  EXPIRED: 'expired',       // 已过期
  REVOKED: 'revoked'        // 已作废
};

// ==================== Mock邀请码数据 ====================
let inviteCodes = [
  // ===== 员工邀请码 =====
  {
    code: 'EMP2025001',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'hr',               // 预设角色
    maxUses: 1,                      // 最大使用次数
    usedCount: 1,                    // 已使用次数
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.USED,
    createdBy: 'ADMIN',
    note: '2025年HR招募',
    usedBy: ['mock_hr_001'],
    createdAt: '2025-01-01'
  },
  {
    code: 'EMP2025002',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'agent',
    maxUses: 1,
    usedCount: 1,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.USED,
    createdBy: 'ADMIN',
    note: '2025年经纪人招募',
    usedBy: ['mock_agent_001'],
    createdAt: '2025-01-01'
  },
  {
    code: 'EMP2025003',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'operations',
    maxUses: 1,
    usedCount: 1,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.USED,
    createdBy: 'ADMIN',
    note: '2025年运营招募',
    usedBy: ['mock_ops_001'],
    createdAt: '2025-01-01'
  },
  {
    code: 'HR2025TEST',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'hr',
    maxUses: 5,
    usedCount: 0,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.ACTIVE,
    createdBy: 'ADMIN',
    note: '测试用HR邀请码',
    usedBy: [],
    createdAt: '2025-11-01'
  },
  {
    code: 'AGENT2025TEST',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'agent',
    maxUses: 5,
    usedCount: 0,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.ACTIVE,
    createdBy: 'ADMIN',
    note: '测试用经纪人邀请码',
    usedBy: [],
    createdAt: '2025-11-01'
  },
  {
    code: 'OPS2025TEST',
    type: INVITE_TYPE.EMPLOYEE,
    presetRole: 'operations',
    maxUses: 5,
    usedCount: 0,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.ACTIVE,
    createdBy: 'ADMIN',
    note: '测试用运营邀请码',
    usedBy: [],
    createdAt: '2025-11-01'
  },

  // ===== 星探邀请码 =====
  {
    code: 'SCOUT2025001',
    type: INVITE_TYPE.SCOUT,
    presetRole: null,               // 星探无需预设角色
    maxUses: 1,
    usedCount: 1,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.USED,
    createdBy: 'ADMIN',
    note: '外部星探郑哥',
    usedBy: ['mock_scout_001'],
    createdAt: '2025-08-01'
  },
  {
    code: 'SCOUT2025TEST',
    type: INVITE_TYPE.SCOUT,
    presetRole: null,
    maxUses: 10,
    usedCount: 0,
    expiresAt: '2025-12-31',
    status: INVITE_STATUS.ACTIVE,
    createdBy: 'ADMIN',
    note: '测试用星探邀请码',
    usedBy: [],
    createdAt: '2025-11-01'
  }
];

// ==================== 辅助函数 ====================

/**
 * 根据邀请码获取信息
 */
export function getInviteCode(code) {
  return inviteCodes.find(i => i.code === code) || null;
}

/**
 * 验证邀请码
 * @param {String} code - 邀请码
 * @param {String} expectedType - 期望的类型 (employee | scout)
 * @returns {Object} { valid, message, codeInfo }
 */
export function validateInviteCode(code, expectedType) {
  const invite = getInviteCode(code);

  // 不存在
  if (!invite) {
    return { valid: false, message: '邀请码不存在' };
  }

  // 类型不匹配
  if (invite.type !== expectedType) {
    return { valid: false, message: '邀请码类型不匹配' };
  }

  // 已过期
  const now = new Date();
  const expiresAt = new Date(invite.expiresAt);
  if (now > expiresAt) {
    return { valid: false, message: '邀请码已过期' };
  }

  // 已用完
  if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
    return { valid: false, message: '邀请码已使用完' };
  }

  // 已作废
  if (invite.status === INVITE_STATUS.REVOKED) {
    return { valid: false, message: '邀请码已被作废' };
  }

  // 有效
  return {
    valid: true,
    message: '邀请码有效',
    codeInfo: invite
  };
}

/**
 * 标记邀请码已使用
 * @param {String} code - 邀请码
 * @param {String} openId - 使用者openId
 */
export function markInviteCodeUsed(code, openId) {
  const invite = getInviteCode(code);
  if (!invite) {
    console.warn('[邀请码] 标记失败：邀请码不存在', code);
    return false;
  }

  invite.usedCount += 1;
  invite.usedBy.push(openId);

  // 如果用完了，更新状态
  if (invite.maxUses !== -1 && invite.usedCount >= invite.maxUses) {
    invite.status = INVITE_STATUS.USED;
  }

  console.log('[邀请码] 已标记使用:', code, `(${invite.usedCount}/${invite.maxUses})`);
  return true;
}

/**
 * 生成邀请码
 * @param {Object} options - 配置项
 * @returns {Object} 新邀请码对象
 */
export function generateInviteCode(options) {
  const {
    type,               // 'employee' | 'scout'
    presetRole = null,  // 'hr' | 'agent' | 'operations' | null
    maxUses = 1,
    expiresAt,
    createdBy = 'ADMIN',
    note = ''
  } = options;

  // 生成唯一邀请码
  const prefix = type === INVITE_TYPE.EMPLOYEE ? 'EMP' : 'SCT';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const code = `${prefix}${timestamp}${random}`;

  const inviteCode = {
    code,
    type,
    presetRole,
    maxUses,
    usedCount: 0,
    expiresAt: expiresAt || getDefaultExpireDate(),
    status: INVITE_STATUS.ACTIVE,
    createdBy,
    note,
    usedBy: [],
    createdAt: new Date().toISOString().split('T')[0]
  };

  inviteCodes.push(inviteCode);
  console.log('[邀请码] 生成成功:', code);

  return inviteCode;
}

/**
 * 获取默认过期日期（一年后）
 */
function getDefaultExpireDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * 作废邀请码
 */
export function revokeInviteCode(code) {
  const invite = getInviteCode(code);
  if (!invite) {
    return false;
  }

  invite.status = INVITE_STATUS.REVOKED;
  console.log('[邀请码] 已作废:', code);
  return true;
}

/**
 * 获取所有邀请码
 */
export function getAllInviteCodes() {
  return inviteCodes;
}

/**
 * 按类型获取邀请码列表
 */
export function getInviteCodesByType(type) {
  return inviteCodes.filter(i => i.type === type);
}

/**
 * 按状态获取邀请码列表
 */
export function getInviteCodesByStatus(status) {
  return inviteCodes.filter(i => i.status === status);
}

/**
 * 检查邀请码是否被使用过
 */
export function isInviteCodeUsedBy(code, openId) {
  const invite = getInviteCode(code);
  return invite && invite.usedBy.includes(openId);
}
