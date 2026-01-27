/**
 * 员工Mock数据
 * 用于HR分配面试官等场景
 */

// 员工角色枚举
export const EMPLOYEE_ROLE = {
  PHOTOGRAPHER: 'photographer',       // 摄像师
  DANCE_TEACHER: 'dance_teacher',     // 舞蹈导师
  MAKEUP_ARTIST: 'makeup_artist',     // 化妆师
  STYLIST: 'stylist',                 // 造型师
  AGENT: 'agent',                     // 经纪人
  HR: 'hr',                           // HR
  OPERATIONS: 'operations'            // 运营
};

// 员工数据
const employees = [
  // ========== 摄像师 ==========
  {
    id: 'PH001',
    role: EMPLOYEE_ROLE.PHOTOGRAPHER,
    profile: {
      name: '王摄影',
      nickname: '王老师',
      phone: '138****1001',
      department: '制作部',
      jobTitle: '摄像师',
      level: '高级',
      experience: 8,  // 年
      specialty: ['人像摄影', '舞台摄影', '视频拍摄']
    },
    workload: 3,  // 当前负责候选人数量
    status: 'available'  // available, busy, leave
  },
  {
    id: 'PH002',
    role: EMPLOYEE_ROLE.PHOTOGRAPHER,
    profile: {
      name: '张摄影',
      nickname: '张老师',
      phone: '138****1002',
      department: '制作部',
      jobTitle: '摄像师',
      level: '中级',
      experience: 5,
      specialty: ['人像摄影', '产品摄影']
    },
    workload: 2,
    status: 'available'
  },
  {
    id: 'PH003',
    role: EMPLOYEE_ROLE.PHOTOGRAPHER,
    profile: {
      name: '李摄影',
      nickname: '李老师',
      phone: '138****1003',
      department: '制作部',
      jobTitle: '摄像师',
      level: '初级',
      experience: 2,
      specialty: ['人像摄影', '视频剪辑']
    },
    workload: 1,
    status: 'available'
  },

  // ========== 舞蹈导师 ==========
  {
    id: 'DT001',
    role: EMPLOYEE_ROLE.DANCE_TEACHER,
    profile: {
      name: '刘舞蹈',
      nickname: '刘老师',
      phone: '138****1002',
      department: '培训部',
      jobTitle: '舞蹈导师',
      level: '首席导师',
      experience: 12,
      specialty: ['现代舞', '爵士舞', '民族舞', '街舞']
    },
    workload: 5,
    status: 'available'
  },
  {
    id: 'DT002',
    role: EMPLOYEE_ROLE.DANCE_TEACHER,
    profile: {
      name: '赵舞蹈',
      nickname: '赵老师',
      phone: '138****1004',
      department: '培训部',
      jobTitle: '舞蹈导师',
      level: '高级',
      experience: 8,
      specialty: ['芭蕾舞', '爵士舞', '拉丁舞']
    },
    workload: 3,
    status: 'available'
  },
  {
    id: 'DT003',
    role: EMPLOYEE_ROLE.DANCE_TEACHER,
    profile: {
      name: '孙舞蹈',
      nickname: '孙老师',
      phone: '138****1005',
      department: '培训部',
      jobTitle: '舞蹈导师',
      level: '中级',
      experience: 5,
      specialty: ['民族舞', '古典舞']
    },
    workload: 2,
    status: 'available'
  },

  // ========== 化妆师 ==========
  {
    id: 'MA001',
    role: EMPLOYEE_ROLE.MAKEUP_ARTIST,
    profile: {
      name: '陈化妆',
      nickname: '陈老师',
      phone: '138****1003',
      department: '制作部',
      jobTitle: '化妆师',
      level: '首席化妆师',
      experience: 10,
      specialty: ['舞台妆', '直播妆', '影视妆', '创意妆']
    },
    workload: 4,
    status: 'available'
  },
  {
    id: 'MA002',
    role: EMPLOYEE_ROLE.MAKEUP_ARTIST,
    profile: {
      name: '周化妆',
      nickname: '周老师',
      phone: '138****1006',
      department: '制作部',
      jobTitle: '化妆师',
      level: '高级',
      experience: 7,
      specialty: ['日常妆', '直播妆', '新娘妆']
    },
    workload: 3,
    status: 'available'
  },
  {
    id: 'MA003',
    role: EMPLOYEE_ROLE.MAKEUP_ARTIST,
    profile: {
      name: '吴化妆',
      nickname: '吴老师',
      phone: '138****1007',
      department: '制作部',
      jobTitle: '化妆师',
      level: '中级',
      experience: 4,
      specialty: ['韩式妆', '清新妆']
    },
    workload: 2,
    status: 'available'
  },

  // ========== 造型师 ==========
  {
    id: 'ST001',
    role: EMPLOYEE_ROLE.STYLIST,
    profile: {
      name: '林造型',
      nickname: '林老师',
      phone: '138****1004',
      department: '制作部',
      jobTitle: '造型师',
      level: '首席造型师',
      experience: 11,
      specialty: ['时尚造型', '舞台造型', '复古造型', '创意造型']
    },
    workload: 4,
    status: 'available'
  },
  {
    id: 'ST002',
    role: EMPLOYEE_ROLE.STYLIST,
    profile: {
      name: '郑造型',
      nickname: '郑老师',
      phone: '138****1008',
      department: '制作部',
      jobTitle: '造型师',
      level: '高级',
      experience: 6,
      specialty: ['日常造型', '职业造型']
    },
    workload: 2,
    status: 'available'
  },
  {
    id: 'ST003',
    role: EMPLOYEE_ROLE.STYLIST,
    profile: {
      name: '王造型',
      nickname: '小王',
      phone: '138****1009',
      department: '制作部',
      jobTitle: '造型师',
      level: '中级',
      experience: 3,
      specialty: ['甜美造型', '清新造型']
    },
    workload: 1,
    status: 'available'
  },

  // ========== 经纪人 ==========
  {
    id: 'AG001',
    role: EMPLOYEE_ROLE.AGENT,
    profile: {
      name: '经纪人A',
      phone: '138****3001',
      department: '艺人部',
      jobTitle: '经纪人',
      level: '金牌经纪人',
      experience: 9,
      specialty: ['主播运营', '商务谈判', '危机公关']
    },
    workload: 8,  // 管理的主播数量
    status: 'available'
  },
  {
    id: 'AG002',
    role: EMPLOYEE_ROLE.AGENT,
    profile: {
      name: '经纪人B',
      phone: '138****3002',
      department: '艺人部',
      jobTitle: '经纪人',
      level: '高级经纪人',
      experience: 6,
      specialty: ['主播培训', '内容策划']
    },
    workload: 5,
    status: 'available'
  },
  {
    id: 'AG003',
    role: EMPLOYEE_ROLE.AGENT,
    profile: {
      name: '经纪人C',
      phone: '138****3003',
      department: '艺人部',
      jobTitle: '经纪人',
      level: '中级经纪人',
      experience: 3,
      specialty: ['新人培养', '粉丝运营']
    },
    workload: 3,
    status: 'available'
  },

  // ========== HR ==========
  {
    id: 'HR001',
    role: EMPLOYEE_ROLE.HR,
    profile: {
      name: 'HR001',
      phone: '138****2001',
      department: '人力资源部',
      jobTitle: '招聘专员',
      level: '高级',
      experience: 5
    },
    workload: 0,
    status: 'available'
  },
  {
    id: 'HR002',
    role: EMPLOYEE_ROLE.HR,
    profile: {
      name: 'HR002',
      phone: '138****2002',
      department: '人力资源部',
      jobTitle: '招聘经理',
      level: '资深',
      experience: 8
    },
    workload: 0,
    status: 'available'
  },

  // ========== 运营 ==========
  {
    id: 'OP001',
    role: EMPLOYEE_ROLE.OPERATIONS,
    profile: {
      name: '运营A',
      phone: '138****4001',
      department: '运营部',
      jobTitle: '运营专员',
      level: '高级',
      experience: 4
    },
    workload: 10,
    status: 'available'
  },
  {
    id: 'OP002',
    role: EMPLOYEE_ROLE.OPERATIONS,
    profile: {
      name: '运营B',
      phone: '138****4002',
      department: '运营部',
      jobTitle: '运营专员',
      level: '中级',
      experience: 2
    },
    workload: 6,
    status: 'available'
  }
];

/**
 * 获取所有员工
 */
export function getAllEmployees() {
  return employees;
}

/**
 * 按角色获取员工列表
 * @param {string} role - 员工角色
 * @returns {Array} 员工列表
 */
export function getEmployeesByRole(role) {
  return employees.filter(emp => emp.role === role);
}

/**
 * 获取单个员工信息
 * @param {string} id - 员工ID
 * @returns {Object|null} 员工信息
 */
export function getEmployeeById(id) {
  return employees.find(emp => emp.id === id) || null;
}

/**
 * 获取可用的面试官（按工作负载排序）
 * @param {string} role - 面试官角色
 * @param {number} limit - 返回数量限制
 * @returns {Array} 可用的面试官列表
 */
export function getAvailableInterviewers(role, limit = 5) {
  const interviewers = employees.filter(emp =>
    emp.role === role &&
    emp.status === 'available'
  );

  // 按工作负载升序排序
  interviewers.sort((a, b) => a.workload - b.workload);

  return limit ? interviewers.slice(0, limit) : interviewers;
}

/**
 * 角色显示名称映射
 */
export const ROLE_DISPLAY_NAME = {
  [EMPLOYEE_ROLE.PHOTOGRAPHER]: '摄像师',
  [EMPLOYEE_ROLE.DANCE_TEACHER]: '舞蹈导师',
  [EMPLOYEE_ROLE.MAKEUP_ARTIST]: '化妆师',
  [EMPLOYEE_ROLE.STYLIST]: '造型师',
  [EMPLOYEE_ROLE.AGENT]: '经纪人',
  [EMPLOYEE_ROLE.HR]: 'HR',
  [EMPLOYEE_ROLE.OPERATIONS]: '运营'
};

/**
 * 获取角色显示名称
 * @param {string} role - 角色标识
 * @returns {string} 角色显示名称
 */
export function getRoleDisplayName(role) {
  return ROLE_DISPLAY_NAME[role] || role;
}
