/**
 * 评级计算工具
 * 根据舞蹈导师评分和妆容AI评分计算候选人综合评级
 */

// ==================== 评级等级定义 ====================

export const RATING_GRADES = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
};

// 评级标准
const RATING_CRITERIA = {
  A: {
    minScore: 85,
    maxScore: 100,
    salaryRange: '8000-12000',
    trainingDuration: 2, // 周
    label: 'A级（优秀）'
  },
  B: {
    minScore: 70,
    maxScore: 84,
    salaryRange: '6000-8000',
    trainingDuration: 3,
    label: 'B级（良好）'
  },
  C: {
    minScore: 60,
    maxScore: 69,
    salaryRange: '5000-6000',
    trainingDuration: 4,
    label: 'C级（合格）'
  },
  D: {
    minScore: 0,
    maxScore: 59,
    salaryRange: '不录用',
    trainingDuration: 0,
    label: 'D级（不合格）'
  }
};

// ==================== 核心计算函数 ====================

/**
 * 计算综合评级
 * @param {Number} danceScore - 舞蹈导师评分（满分10分）
 * @param {Number} makeupScore - 妆容AI评分（满分100分，可选）
 * @returns {Object} 评级结果
 */
export function calculateRating(danceScore, makeupScore = null) {
  // 1. 计算舞蹈得分（占60%，满分60）
  const dancePoints = (danceScore / 10) * 60;

  // 2. 计算妆容得分（占40%，满分40）
  let makeupPoints = 0;
  if (makeupScore !== null && makeupScore !== undefined) {
    makeupPoints = (makeupScore / 100) * 40;
  } else {
    // 如果没有妆容评分，使用Mock数据（70-90分随机）
    const mockMakeupScore = Math.floor(Math.random() * 21) + 70;
    makeupPoints = (mockMakeupScore / 100) * 40;
  }

  // 3. 计算综合得分（满分100）
  const totalScore = Math.round(dancePoints + makeupPoints);

  // 4. 确定评级等级
  const grade = determineGrade(totalScore);

  // 5. 获取建议薪资和培训周期
  const criteria = RATING_CRITERIA[grade];

  return {
    grade: grade,
    score: totalScore,
    breakdown: {
      danceScore: Math.round(dancePoints),
      makeupScore: Math.round(makeupPoints)
    },
    suggestedSalary: criteria.salaryRange,
    trainingDuration: criteria.trainingDuration,
    label: criteria.label,
    isPass: grade !== 'D' // 是否通过评级
  };
}

/**
 * 根据得分确定评级等级
 */
function determineGrade(score) {
  if (score >= RATING_CRITERIA.A.minScore) return 'A';
  if (score >= RATING_CRITERIA.B.minScore) return 'B';
  if (score >= RATING_CRITERIA.C.minScore) return 'C';
  return 'D';
}

/**
 * 计算舞蹈导师综合评分（从5个维度得分计算平均值）
 * @param {Object} scores - 各维度得分对象
 * @returns {Number} 综合评分（满分10分）
 */
export function calculateDanceTeacherScore(scores) {
  const {
    basicSkills = 0,    // 基础功底
    rhythm = 0,         // 节奏感
    coordination = 0,   // 协调性
    expression = 0,     // 表现力
    potential = 0       // 潜力
  } = scores;

  // 计算平均分
  const total = basicSkills + rhythm + coordination + expression + potential;
  const average = total / 5;

  return Math.round(average * 10) / 10; // 保留1位小数
}

/**
 * 计算经纪人综合评分（从5个维度得分计算平均值）
 * @param {Object} scores - 各维度得分对象
 * @returns {Number} 综合评分（满分10分）
 */
export function calculateAgentScore(scores) {
  const {
    communication = 0,   // 沟通能力
    cooperation = 0,     // 配合度
    stability = 0,       // 稳定性
    potential = 0,       // 商业潜力
    impression = 0       // 综合印象
  } = scores;

  // 计算平均分
  const total = communication + cooperation + stability + potential + impression;
  const average = total / 5;

  return Math.round(average * 10) / 10; // 保留1位小数
}

/**
 * 生成Mock妆容评分（用于测试）
 */
export function generateMockMakeupScore() {
  return Math.floor(Math.random() * 21) + 70; // 70-90分
}

/**
 * 获取评级标准信息
 */
export function getRatingCriteria(grade) {
  return RATING_CRITERIA[grade] || null;
}

/**
 * 获取所有评级标准
 */
export function getAllRatingCriteria() {
  return RATING_CRITERIA;
}

/**
 * 验证评分是否有效
 */
export function isValidScore(score, maxScore = 10) {
  return typeof score === 'number' && score >= 0 && score <= maxScore;
}
