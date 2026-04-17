const COLLECTIONS = {
  candidates: 'candidates',
  users: 'users',
  admins: 'admins',
  interviewEvaluations: 'interview_evaluations'
};

const INTERVIEW_ROLES = {
  admin: {
    code: 'admin',
    label: '管理员'
  },
  hr: {
    code: 'hr',
    label: 'HR'
  },
  agent: {
    code: 'agent',
    label: '经纪人'
  },
  operations: {
    code: 'operations',
    label: '运营'
  },
  trainer: {
    code: 'trainer',
    label: '培训师'
  },
  dance_teacher: {
    code: 'dance_teacher',
    label: '舞蹈老师'
  },
  photographer: {
    code: 'photographer',
    label: '摄影师'
  },
  host_mc: {
    code: 'host_mc',
    label: '主持/MC'
  },
  makeup_artist: {
    code: 'makeup_artist',
    label: '化妆师'
  },
  stylist: {
    code: 'stylist',
    label: '造型师'
  }
};

const FOUNDER_ROLES = ['admin', 'founder'];
const SCHEMA_VERSION = 2;
const EVALUATION_STATUS = {
  draft: 'draft',
  submitted: 'submitted'
};

const INTERVIEW_WORKFLOW_STATUS = {
  interviewing: 'Interviewing',
  pending: 'Pending',
  finalized: 'Finalized'
};

const FINAL_DECISIONS = ['accepted', 'pending', 'rejected'];
const SCORE_LEVELS = ['S', 'A', 'B', 'C'];
const DIMENSIONS = {
  appearance: '外型条件',
  talent: '才艺展示',
  teaching: '现场教学',
  selfIntro: '自我介绍',
  qa: '基础问答'
};

const STYLE_TAGS = [
  '体育生',
  '霸总',
  '奶狗',
  '盐系',
  '肌肉男',
  '忧郁',
  '沙雕'
];

module.exports = {
  COLLECTIONS,
  DIMENSIONS,
  EVALUATION_STATUS,
  FINAL_DECISIONS,
  FOUNDER_ROLES,
  INTERVIEW_ROLES,
  INTERVIEW_WORKFLOW_STATUS,
  SCHEMA_VERSION,
  SCORE_LEVELS,
  STYLE_TAGS
};
