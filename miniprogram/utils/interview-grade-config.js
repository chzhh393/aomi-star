export const INTERVIEW_GRADE_VALUES = ['S', 'A', 'B', 'C'];

export const INTERVIEW_GRADE_ENUM = INTERVIEW_GRADE_VALUES.reduce((result, grade) => {
  result[grade] = grade;
  return result;
}, {});

export const INTERVIEW_GRADE_COLOR_MAP = {
  S: '#D4AF37',
  A: '#2E9B57',
  B: '#2F6BFF',
  C: '#8C96A8'
};

export const INTERVIEW_DIMENSION_KEYS = [
  'appearance',
  'talent',
  'teaching',
  'selfIntro',
  'qa'
];

export const INTERVIEW_DIMENSION_CONFIG = {
  appearance: {
    key: 'appearance',
    label: '形象气质'
  },
  talent: {
    key: 'talent',
    label: '才艺表现'
  },
  teaching: {
    key: 'teaching',
    label: '现场教学'
  },
  selfIntro: {
    key: 'selfIntro',
    label: '自我介绍'
  },
  qa: {
    key: 'qa',
    label: '基础问答'
  }
};

export const INTERVIEW_STYLE_TAG_OPTIONS = [
  '体育生',
  '霸总',
  '奶狗',
  '盐系',
  '肌肉男',
  '忧郁',
  '沙雕'
];

export function isValidInterviewGrade(grade) {
  return INTERVIEW_GRADE_VALUES.includes(String(grade || '').trim());
}

export function isValidInterviewDimensionKey(key) {
  return INTERVIEW_DIMENSION_KEYS.includes(String(key || '').trim());
}
