/**
 * 用户数据模型
 * 管理所有平台用户：候选人、主播、内部员工、外部星探
 */

// ==================== 用户类型枚举 ====================
export const USER_TYPE = {
  CANDIDATE: 'candidate',               // 主播候选人（报名后未签约）
  ANCHOR: 'anchor',                     // 正式主播（已签约）
  INTERNAL_EMPLOYEE: 'internal_employee', // 内部员工
  EXTERNAL_SCOUT: 'external_scout'      // 外部星探
};

// ==================== 角色枚举 ====================
export const ROLE = {
  // 候选人
  CANDIDATE: 'candidate',               // 主播候选人

  // 主播
  ANCHOR: 'anchor',                     // 正式主播

  // 内部员工角色
  HR: 'hr',                             // HR
  AGENT: 'agent',                       // 经纪人
  OPERATIONS: 'operations',             // 运营

  // 面试官角色（新增）
  PHOTOGRAPHER: 'photographer',         // 摄像师
  DANCE_TEACHER: 'dance_teacher',       // 舞蹈导师
  MAKEUP_ARTIST: 'makeup_artist',       // 化妆师
  STYLIST: 'stylist',                   // 造型师

  // 外部合作
  EXTERNAL_SCOUT: 'external_scout'      // 外部星探
};

// ==================== 用户状态 ====================
export const USER_STATUS = {
  ACTIVE: 'active',                     // 激活
  INACTIVE: 'inactive',                 // 未激活
  SUSPENDED: 'suspended',               // 停用
  RESIGNED: 'resigned'                  // 离职
};

// ==================== Mock用户数据 ====================
let users = [
  // ===== 测试用户（候选人） =====
  {
    id: 'CAN001',
    openId: 'mock_candidate_001',
    userType: USER_TYPE.CANDIDATE,
    role: ROLE.CANDIDATE,

    candidateInfo: {
      candidateId: 'C001',
      appliedAt: '2025-11-02',
      status: 'pending'
    },

    referral: {
      scoutId: '',
      shareCode: ''
    },

    profile: {
      name: '李小美',
      nickname: '美美子',
      avatar: '',
      phone: '138****8888'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-11-02',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（主播） =====
  {
    id: 'ANC001',
    openId: 'mock_anchor_001',
    userType: USER_TYPE.ANCHOR,
    role: ROLE.ANCHOR,

    candidateInfo: {
      candidateId: 'C001',
      appliedAt: '2025-10-01',
      status: 'signed'
    },

    referral: {
      scoutId: '',
      shareCode: ''
    },

    profile: {
      name: '小萌',
      nickname: '小萌',
      avatar: '',
      phone: '139****0001'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-10-15',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（HR） =====
  {
    id: 'HR001',
    openId: 'mock_hr_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.HR,

    profile: {
      name: '张丽华',
      nickname: '张HR',
      avatar: '',
      phone: '138****0001',
      email: 'hr@omi.com',
      department: '人力资源部',
      jobTitle: 'HR专员'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025001'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-01',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（经纪人） =====
  {
    id: 'AG001',
    openId: 'mock_agent_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.AGENT,

    profile: {
      name: '李明',
      nickname: '李经纪',
      avatar: '',
      phone: '138****0002',
      email: 'agent@omi.com',
      department: '经纪人部',
      jobTitle: '高级经纪人'
    },

    relations: {
      managedAnchors: ['ANC001']
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025002'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-01',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（运营） =====
  {
    id: 'OPS001',
    openId: 'mock_ops_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.OPERATIONS,

    profile: {
      name: '周运营',
      nickname: '周主管',
      avatar: '',
      phone: '138****0003',
      email: 'ops@omi.com',
      department: '运营部',
      jobTitle: '运营主管'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025003'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-01',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（外部星探） =====
  {
    id: 'SCT001',
    openId: 'mock_scout_001',
    userType: USER_TYPE.EXTERNAL_SCOUT,
    role: ROLE.EXTERNAL_SCOUT,

    profile: {
      name: '郑星探',
      nickname: '郑哥',
      avatar: '',
      phone: '159****0001'
    },

    relations: {
      shareCode: 'SHARE_SCT001',
      referredCandidates: []
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'SCOUT2025001'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-08-01',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（摄像师） =====
  {
    id: 'PH001',
    openId: 'mock_photographer_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.PHOTOGRAPHER,

    profile: {
      name: '王摄影',
      nickname: '王老师',
      avatar: '',
      phone: '138****1001',
      email: 'photographer@omi.com',
      department: '制作部',
      jobTitle: '摄像师'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025004'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-15',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（舞蹈导师） =====
  {
    id: 'DT001',
    openId: 'mock_dance_teacher_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.DANCE_TEACHER,

    profile: {
      name: '李舞蹈',
      nickname: '李老师',
      avatar: '',
      phone: '138****1002',
      email: 'dance@omi.com',
      department: '培训部',
      jobTitle: '舞蹈导师'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025005'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-15',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（化妆师） =====
  {
    id: 'MA001',
    openId: 'mock_makeup_artist_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.MAKEUP_ARTIST,

    profile: {
      name: '张化妆',
      nickname: '张老师',
      avatar: '',
      phone: '138****1003',
      email: 'makeup@omi.com',
      department: '形象部',
      jobTitle: '化妆师'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025006'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-15',
    lastLoginAt: '2025-11-02'
  },

  // ===== 测试用户（造型师） =====
  {
    id: 'ST001',
    openId: 'mock_stylist_001',
    userType: USER_TYPE.INTERNAL_EMPLOYEE,
    role: ROLE.STYLIST,

    profile: {
      name: '赵造型',
      nickname: '赵老师',
      avatar: '',
      phone: '138****1004',
      email: 'stylist@omi.com',
      department: '形象部',
      jobTitle: '造型师'
    },

    registrationSource: {
      type: 'invite_code',
      inviteCode: 'EMP2025007'
    },

    status: USER_STATUS.ACTIVE,
    isFirstLogin: false,
    createdAt: '2025-01-15',
    lastLoginAt: '2025-11-02'
  }
];

// ==================== 辅助函数 ====================

/**
 * 根据 OpenID 获取用户
 */
export function getUserByOpenId(openId) {
  return users.find(u => u.openId === openId) || null;
}

/**
 * 根据 ID 获取用户
 */
export function getUserById(id) {
  return users.find(u => u.id === id) || null;
}

/**
 * 根据候选人ID获取用户
 */
export function getUserByCandidateId(candidateId) {
  return users.find(u =>
    u.candidateInfo && u.candidateInfo.candidateId === candidateId
  ) || null;
}

/**
 * 根据星探分享码获取星探用户
 */
export function getScoutByShareCode(shareCode) {
  return users.find(u =>
    u.userType === USER_TYPE.EXTERNAL_SCOUT &&
    u.relations &&
    u.relations.shareCode === shareCode
  ) || null;
}

/**
 * 根据角色获取用户列表
 */
export function getUsersByRole(role) {
  return users.filter(u => u.role === role);
}

/**
 * 根据用户类型获取用户列表
 */
export function getUsersByType(userType) {
  return users.filter(u => u.userType === userType);
}

/**
 * 创建新用户
 */
export function createUser(userData) {
  // 生成ID
  const typePrefix = {
    [USER_TYPE.CANDIDATE]: 'CAN',
    [USER_TYPE.ANCHOR]: 'ANC',
    [USER_TYPE.INTERNAL_EMPLOYEE]: 'EMP',
    [USER_TYPE.EXTERNAL_SCOUT]: 'SCT'
  };

  const prefix = typePrefix[userData.userType] || 'USR';
  const timestamp = Date.now().toString().slice(-6);
  const newId = `${prefix}${timestamp}`;

  const newUser = {
    id: newId,
    openId: userData.openId,
    userType: userData.userType,
    role: userData.role,
    profile: userData.profile || {},
    status: userData.status || USER_STATUS.ACTIVE,
    isFirstLogin: userData.isFirstLogin !== undefined ? userData.isFirstLogin : true,
    createdAt: new Date().toISOString().split('T')[0],
    lastLoginAt: new Date().toISOString().split('T')[0],
    ...userData
  };

  users.push(newUser);
  console.log('[用户] 创建成功:', newId, newUser.role);

  return newUser;
}

/**
 * 更新用户信息
 */
export function updateUser(id, updates) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = {
      ...users[index],
      ...updates,
      lastLoginAt: new Date().toISOString().split('T')[0]
    };
    console.log('[用户] 更新成功:', id);
    return users[index];
  }
  console.warn('[用户] 更新失败：用户不存在', id);
  return null;
}

/**
 * 删除用户
 */
export function deleteUser(id) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    const deletedUser = users.splice(index, 1)[0];
    console.log('[用户] 删除成功:', id);
    return deletedUser;
  }
  return null;
}

/**
 * 获取角色显示名称
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    [ROLE.CANDIDATE]: '主播候选人',
    [ROLE.ANCHOR]: '主播',
    [ROLE.HR]: 'HR',
    [ROLE.AGENT]: '经纪人',
    [ROLE.OPERATIONS]: '运营',
    [ROLE.PHOTOGRAPHER]: '摄像师',
    [ROLE.DANCE_TEACHER]: '舞蹈导师',
    [ROLE.MAKEUP_ARTIST]: '化妆师',
    [ROLE.STYLIST]: '造型师',
    [ROLE.EXTERNAL_SCOUT]: '外部星探'
  };
  return roleNames[role] || '未知角色';
}

/**
 * 获取角色对应的首页路径
 */
export function getRoleHomePage(role) {
  const homePages = {
    [ROLE.CANDIDATE]: '/pages/candidate/home/home',
    [ROLE.ANCHOR]: '/pages/anchor/home/home',
    [ROLE.HR]: '/pages/hr/home/home',
    [ROLE.AGENT]: '/pages/agent/home/home',
    [ROLE.OPERATIONS]: '/pages/operations/home/home',
    [ROLE.PHOTOGRAPHER]: '/pages/photographer/home/home',
    [ROLE.DANCE_TEACHER]: '/pages/dance-teacher/home/home',
    [ROLE.MAKEUP_ARTIST]: '/pages/makeup-artist/home/home',
    [ROLE.STYLIST]: '/pages/stylist/home/home',
    [ROLE.EXTERNAL_SCOUT]: '/pages/external-scout/home/home'
  };
  return homePages[role] || '/pages/index/index';
}

/**
 * 候选人升级为主播
 */
export function upgradeCandidateToAnchor(userId) {
  const user = getUserById(userId);
  if (!user || user.role !== ROLE.CANDIDATE) {
    console.warn('[用户] 升级失败：不是候选人', userId);
    return null;
  }

  const updatedUser = updateUser(userId, {
    userType: USER_TYPE.ANCHOR,
    role: ROLE.ANCHOR,
    'candidateInfo.status': 'signed'
  });

  console.log('[用户] 候选人已升级为主播:', userId);
  return updatedUser;
}

/**
 * 获取所有用户（调试用）
 */
export function getAllUsers() {
  return users;
}

/**
 * 重置用户数据（调试用）
 */
export function resetUsers() {
  users = [];
  console.log('[用户] 数据已重置');
}
