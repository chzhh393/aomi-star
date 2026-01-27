// mock/candidates.js
// 候选人数据

// ==================== 状态常量 ====================
// 候选人状态枚举 - 完整招聘流程
export const CANDIDATE_STATUS = {
  PENDING: 'pending',                        // 阶段1：待审核 - 刚提交报名
  INTERVIEW_SCHEDULED: 'interview_scheduled', // 阶段2：已安排面试 - HR分配面试官
  ONLINE_TEST_COMPLETED: 'online_test_completed', // 阶段3：线上测试完成
  PENDING_RATING: 'pending_rating',          // 阶段4：待评级 - 面试素材已上传
  RATED: 'rated',                            // 阶段5：已评级 - 系统评级完成
  SIGNED: 'signed',                          // 阶段6：已签约 - 合同签署完成
  TRAINING: 'training',                      // 后续：培训中（主播角色）
  ACTIVE: 'active',                          // 后续：正式主播（主播角色）
  REJECTED: 'rejected'                       // 任意阶段：已拒绝
};

// 状态流转规则 - 完整招聘流程
export function canTransitionTo(currentStatus, targetStatus) {
  const validTransitions = {
    'pending': ['interview_scheduled', 'rejected'],
    'interview_scheduled': ['online_test_completed', 'rejected'],
    'online_test_completed': ['pending_rating', 'rejected'],
    'pending_rating': ['rated', 'rejected'],
    'rated': ['signed', 'rejected'],
    'signed': ['training'],  // 签约后角色升级为主播
    'training': ['active'],
    'active': [],
    'rejected': []  // 拒绝后不可重新报名
  };

  return validTransitions[currentStatus]?.includes(targetStatus) || false;
}

// 获取状态显示文本
export function getStatusText(status) {
  const statusTexts = {
    'pending': '待HR审核',
    'interview_scheduled': '已安排面试',
    'online_test_completed': '线上测试完成',
    'pending_rating': '待评级',
    'rated': '已评级',
    'signed': '已签约',
    'training': '培训中',
    'active': '正式主播',
    'rejected': '未通过'
  };
  return statusTexts[status] || '未知状态';
}

// 判断是否可以访问工作台（候选人在签约前，主播在签约后）
export function canAccessWorkspace(status) {
  return ['signed', 'training', 'active'].includes(status);
}

// 获取状态对应的阶段编号
export function getStatusStage(status) {
  const stages = {
    'pending': 1,
    'interview_scheduled': 2,
    'online_test_completed': 3,
    'pending_rating': 4,
    'rated': 5,
    'signed': 6,
    'training': 7,
    'active': 7,
    'rejected': 0
  };
  return stages[status] || 0;
}

// ==================== 候选人数据 ====================
// 候选人数据存储
let candidates = [
  {
    id: 'C001',
    // 基础信息
    basicInfo: {
      name: '李小美',
      artName: '美美子',
      age: 22,
      gender: '女',
      height: 165,
      weight: 48,
      phone: '138****8888',
      city: '北京'
    },
    // 形象资料
    images: {
      lifePhotos: [
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0ZGQjZDMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjM2IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7nlJ/mtLvnhaU8L3RleHQ+PC9zdmc+'
      ],
      artPhotos: [
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0ZGOEVBRCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjM2IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7imajmsr/nhaU8L3RleHQ+PC9zdmc+'
      ],
      videoUrl: ''
    },
    // 才艺信息
    talent: {
      mainTalent: '唱歌',
      level: 8,
      works: ['抖音@美美子']
    },
    // 经验信息
    experience: {
      hasExperience: true,
      platforms: ['抖音', '快手'],
      maxFans: 50000,
      maxIncome: 8000
    },
    // 性格特质
    personality: {
      mbti: 'ENFP',
      stressResistance: 4,
      teamWork: 5,
      goals: '希望成为头部主播，打造个人IP'
    },
    // 期望条件
    expectation: {
      salaryRange: '8000-12000',
      timeCommitment: '全职',
      contentPreference: '唱歌、聊天、才艺展示'
    },
    // AI评分
    aiScore: {
      faceScore: 85,
      talentScore: 78,
      overallScore: 82,
      tags: ['高颜值', '有经验', '声音好听', '亲和力强'],
      recommendation: '推荐录用'
    },
    // HR评审
    hrReview: null,
    // 经纪人评审
    agentReview: null,
    // 状态
    status: 'pending', // pending, approved, rejected, interview
    // 创建时间
    createdAt: '2025-11-18 14:30',
    // 来源渠道
    source: '官网报名'
  },
  {
    id: 'C002',
    basicInfo: {
      name: '王小雅',
      artName: '雅雅',
      age: 20,
      gender: '女',
      height: 168,
      weight: 50,
      phone: '139****6666',
      city: '上海'
    },
    images: {
      lifePhotos: [
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzlCRDdGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjM2IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7nlJ/mtLs8L3RleHQ+PC9zdmc+'
      ],
      artPhotos: [],
      videoUrl: ''
    },
    talent: {
      mainTalent: '舞蹈',
      level: 9,
      works: []
    },
    experience: {
      hasExperience: false,
      platforms: [],
      maxFans: 0,
      maxIncome: 0
    },
    personality: {
      mbti: 'ISFP',
      stressResistance: 3,
      teamWork: 4,
      goals: '想尝试直播，学习新技能'
    },
    expectation: {
      salaryRange: '5000-8000',
      timeCommitment: '兼职',
      contentPreference: '舞蹈、运动、生活分享'
    },
    aiScore: {
      faceScore: 90,
      talentScore: 88,
      overallScore: 89,
      tags: ['高颜值', '舞蹈功底好', '形象佳', '有潜力'],
      recommendation: '强烈推荐'
    },
    hrReview: null,
    agentReview: null,
    status: 'pending',
    createdAt: '2025-11-17 10:15',
    source: '朋友推荐'
  }
];

// 获取所有候选人
export function getAllCandidates() {
  return candidates;
}

// 根据ID获取候选人
export function getCandidateById(id) {
  return candidates.find(c => c.id === id);
}

// 根据状态筛选候选人
export function getCandidatesByStatus(status) {
  return candidates.filter(c => c.status === status);
}

// 添加新候选人
export function addCandidate(candidateData) {
  const newId = 'C' + String(candidates.length + 1).padStart(3, '0');
  const newCandidate = {
    id: newId,
    ...candidateData,
    aiScore: generateAIScore(candidateData),
    hrReview: null,
    agentReview: null,
    status: 'pending',
    createdAt: new Date().toLocaleString('zh-CN'),
    source: '官网报名'
  };

  candidates.push(newCandidate);
  return newCandidate;
}

// 更新候选人信息
export function updateCandidate(id, updates) {
  const index = candidates.findIndex(c => c.id === id);
  if (index !== -1) {
    candidates[index] = {
      ...candidates[index],
      ...updates
    };
    return candidates[index];
  }
  return null;
}

// 模拟AI评分生成
function generateAIScore(candidateData) {
  // 简单的评分逻辑
  const faceScore = Math.floor(Math.random() * 20) + 70; // 70-90
  const talentScore = candidateData.talent.level * 10; // 基于才艺等级
  const experienceBonus = candidateData.experience.hasExperience ? 5 : 0;
  const overallScore = Math.min(95, Math.floor((faceScore + talentScore + experienceBonus) / 2));

  const tags = [];
  if (faceScore >= 85) tags.push('高颜值');
  if (talentScore >= 80) tags.push('才艺突出');
  if (candidateData.experience.hasExperience) tags.push('有经验');
  if (candidateData.personality.stressResistance >= 4) tags.push('抗压能力强');

  const recommendation = overallScore >= 85 ? '强烈推荐' : overallScore >= 75 ? '推荐录用' : '待定';

  return {
    faceScore,
    talentScore,
    overallScore,
    tags,
    recommendation
  };
}

// ==================== 新增招聘流程字段管理 ====================

/**
 * 更新候选人状态（带验证）
 */
export function updateCandidateStatus(candidateId, newStatus, additionalData = {}) {
  const candidate = getCandidateById(candidateId);
  if (!candidate) {
    console.error('[候选人] 状态更新失败：候选人不存在', candidateId);
    return false;
  }

  // 验证状态流转
  if (!canTransitionTo(candidate.status, newStatus)) {
    console.error('[候选人] 状态流转不合法:', candidate.status, '→', newStatus);
    return false;
  }

  // 更新状态和相关数据
  return updateCandidate(candidateId, {
    status: newStatus,
    ...additionalData,
    [`${newStatus}At`]: new Date().toLocaleString('zh-CN')
  });
}

/**
 * 提交HR审核结果（阶段1：pending → interview_scheduled 或 rejected）
 * @param {string} candidateId - 候选人ID
 * @param {Object} reviewData - 审核数据
 * @param {string} reviewData.result - 审核结果：'pass' 或 'reject'
 * @param {string} reviewData.comment - 审核意见（必填）
 * @param {string} reviewData.reviewerId - 审核人ID
 * @param {string} reviewData.reviewerName - 审核人姓名
 * @param {string} reviewData.suggestedSalary - 建议薪资（选填）
 * @param {Object} reviewData.interviewSchedule - 面试安排（通过时必填）
 * @returns {Object|null} 更新后的候选人信息
 */
export function submitHRReview(candidateId, reviewData) {
  const candidate = getCandidateById(candidateId);
  if (!candidate) {
    console.error('[HR审核] 候选人不存在:', candidateId);
    return null;
  }

  // 验证当前状态
  if (candidate.status !== 'pending') {
    console.error('[HR审核] 候选人当前状态不是待审核:', candidate.status);
    return null;
  }

  // 验证审核结果
  if (!['pass', 'reject'].includes(reviewData.result)) {
    console.error('[HR审核] 审核结果无效:', reviewData.result);
    return null;
  }

  // 构建审核记录
  const hrReview = {
    result: reviewData.result,
    comment: reviewData.comment,
    reviewerId: reviewData.reviewerId,
    reviewerName: reviewData.reviewerName,
    suggestedSalary: reviewData.suggestedSalary || '',
    reviewAt: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };

  // 根据审核结果确定新状态
  const newStatus = reviewData.result === 'pass' ? 'interview_scheduled' : 'rejected';

  // 构建更新数据
  const updates = {
    hrReview,
    status: newStatus
  };

  // 如果通过审核，保存面试安排
  if (reviewData.result === 'pass' && reviewData.interviewSchedule) {
    updates.interviewSchedule = {
      date: reviewData.interviewSchedule.date,
      time: reviewData.interviewSchedule.time,
      location: reviewData.interviewSchedule.location,
      requirements: reviewData.interviewSchedule.requirements || '',
      interviewers: reviewData.interviewSchedule.interviewers || [],
      scheduledBy: reviewData.reviewerId,
      scheduledByName: reviewData.reviewerName,
      scheduledAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    };
  }

  // 更新候选人信息
  const updated = updateCandidate(candidateId, updates);

  if (updated) {
    console.log('[HR审核] 审核完成:', {
      candidateId,
      result: reviewData.result,
      newStatus,
      hasInterviewSchedule: !!updates.interviewSchedule
    });
  }

  return updated;
}

/**
 * 保存HR审核结果（不改变状态，用于两步流程）
 * 审核通过后不立即更新状态，等待面试安排完成后再更新
 * @param {string} candidateId - 候选人ID
 * @param {Object} reviewData - 审核数据
 * @param {string} reviewData.result - 审核结果：'approved' 或 'rejected'
 * @param {string} reviewData.reviewedBy - 审核人ID
 * @param {string} reviewData.reviewerName - 审核人姓名
 * @param {string} reviewData.reviewedAt - 审核时间
 * @param {string} reviewData.notes - 审核备注
 * @returns {boolean} 是否保存成功
 */
export function saveHRReview(candidateId, reviewData) {
  const candidate = getCandidateById(candidateId);
  if (!candidate) {
    console.error('[保存HR审核] 候选人不存在:', candidateId);
    return false;
  }

  // 验证当前状态
  if (candidate.status !== 'pending') {
    console.error('[保存HR审核] 候选人当前状态不是待审核:', candidate.status);
    return false;
  }

  // 构建审核记录
  const hrReview = {
    result: reviewData.result,
    reviewedBy: reviewData.reviewedBy,
    reviewerName: reviewData.reviewerName,
    reviewedAt: reviewData.reviewedAt,
    notes: reviewData.notes || ''
  };

  // 只保存审核记录，不改变状态
  const updated = updateCandidate(candidateId, { hrReview });

  if (updated) {
    console.log('[保存HR审核] 审核结果已保存（状态未变更）:', {
      candidateId,
      result: reviewData.result,
      status: candidate.status
    });
  }

  return updated;
}

/**
 * 设置面试安排（阶段2：pending → interview_scheduled）
 * @deprecated 建议使用submitHRReview替代
 */
export function setInterviewSchedule(candidateId, scheduleData) {
  return updateCandidate(candidateId, {
    interviewSchedule: {
      date: scheduleData.date,
      time: scheduleData.time,
      location: scheduleData.location || '公司会议室',
      interviewers: scheduleData.interviewers, // { danceTeacher, agent, photographer, makeupArtist }
      scheduledBy: scheduleData.scheduledBy,
      scheduledAt: new Date().toLocaleString('zh-CN')
    }
  });
}

/**
 * 保存线上测试结果（阶段3：interview_scheduled → online_test_completed）
 */
export function saveOnlineTestResult(candidateId, testResult) {
  return updateCandidate(candidateId, {
    onlineTest: {
      completedAt: new Date().toLocaleString('zh-CN'),
      personality: testResult.personality,
      suitableTypes: testResult.suitableTypes,
      report: testResult.report
    }
  });
}

/**
 * 上传面试素材（阶段4）
 */
export function uploadInterviewMaterials(candidateId, materials) {
  return updateCandidate(candidateId, {
    interviewMaterials: {
      videos: materials.videos || [],
      beforeMakeup: materials.beforeMakeup || [],
      afterMakeup: materials.afterMakeup || [],
      uploadedBy: materials.uploadedBy,
      uploadedAt: new Date().toLocaleString('zh-CN')
    }
  });
}

/**
 * 保存角色评价（阶段4）
 */
export function saveEvaluation(candidateId, evaluatorRole, evaluationData) {
  const candidate = getCandidateById(candidateId);
  if (!candidate) return false;

  const evaluations = candidate.evaluations || {};
  evaluations[evaluatorRole] = {
    ...evaluationData,
    evaluatedAt: new Date().toLocaleString('zh-CN')
  };

  return updateCandidate(candidateId, { evaluations });
}

/**
 * 保存系统评级（阶段5：pending_rating → rated）
 */
export function saveRating(candidateId, ratingData) {
  return updateCandidate(candidateId, {
    rating: {
      grade: ratingData.grade,
      score: ratingData.score,
      breakdown: ratingData.breakdown,
      suggestedSalary: ratingData.suggestedSalary,
      trainingDuration: ratingData.trainingDuration,
      generatedAt: new Date().toISOString().split('T')[0],
      confirmedBy: ratingData.confirmedBy,
      confirmedAt: new Date().toLocaleString('zh-CN')
    }
  });
}

/**
 * 保存合同信息（阶段6：rated → signed）
 */
export function saveContract(candidateId, contractData) {
  return updateCandidate(candidateId, {
    contract: {
      contractUrl: contractData.contractUrl,
      signedDate: new Date().toISOString().split('T')[0],
      salary: contractData.salary,
      commission: contractData.commission || '40%',
      uploadedBy: contractData.uploadedBy,
      uploadedAt: new Date().toLocaleString('zh-CN')
    }
  });
}

/**
 * 候选人升级为主播（阶段6：角色转换）
 * 合同签署后自动触发角色升级机制
 * @param {string} candidateId - 候选人ID
 * @param {Object} upgradeData - 升级数据
 * @param {string} upgradeData.agentId - 经纪人ID
 * @param {string} upgradeData.agentName - 经纪人姓名
 * @param {number} upgradeData.salary - 基础薪资
 * @param {string} upgradeData.commission - 分成比例
 * @param {string} upgradeData.contractUrl - 合同URL
 * @returns {Object} {success: boolean, message: string, streamer: Object}
 */
export function upgradeToStreamer(candidateId, upgradeData) {
  // 导入users模块
  const { upgradeCandidateToAnchor, getUserByCandidateId } = require('./users.js');

  const candidate = getCandidateById(candidateId);

  if (!candidate) {
    return {
      success: false,
      message: '候选人不存在',
      streamer: null
    };
  }

  // 验证状态：必须是已评级状态
  if (candidate.status !== CANDIDATE_STATUS.RATED) {
    return {
      success: false,
      message: `候选人当前状态不允许升级: ${candidate.status}`,
      streamer: null
    };
  }

  // 1. 保存候选人历史数据
  const candidateHistory = {
    basicInfo: { ...candidate.basicInfo },
    talent: { ...candidate.talent },
    evaluations: { ...candidate.evaluations },
    rating: { ...candidate.rating },
    interviewSchedule: { ...candidate.interviewSchedule },
    onlineTest: { ...candidate.onlineTest },
    becameCandidateAt: candidate.createdAt,
    signedAt: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  };

  // 2. 创建主播信息
  const streamerInfo = {
    agentId: upgradeData.agentId,
    agentName: upgradeData.agentName,
    salary: upgradeData.salary,
    commission: upgradeData.commission,
    signedDate: new Date().toISOString().split('T')[0],
    contractUrl: upgradeData.contractUrl,
    trainingStatus: 'pending', // 待培训
    trainingProgress: 0,
    liveStatus: 'inactive', // 未开播
    liveStartDate: null,
    totalLiveHours: 0,
    totalIncome: 0
  };

  // 3. 记录角色变更历史
  const roleChange = {
    from: 'candidate',
    to: 'streamer',
    changedAt: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    reason: '签约成功',
    operator: upgradeData.agentId,
    operatorName: upgradeData.agentName
  };

  // 4. 执行数据更新
  const updates = {
    role: 'streamer', // 角色转换
    status: CANDIDATE_STATUS.SIGNED,
    candidateHistory, // 保存候选人历史
    streamerInfo, // 创建主播信息
    roleChanges: [roleChange] // 记录变更历史
  };

  const updated = updateCandidate(candidateId, updates);

  if (updated) {
    // 5. 同步更新users表的角色
    const user = getUserByCandidateId(candidateId);
    let usersTableSynced = false;

    if (user) {
      const userUpgraded = upgradeCandidateToAnchor(user.id);
      usersTableSynced = !!userUpgraded;

      if (!userUpgraded) {
        console.warn('[角色升级] users表同步失败，但candidates表已更新');
      }
    } else {
      console.warn('[角色升级] 未找到关联的user记录:', candidateId);
    }

    console.log('[角色升级] 候选人已升级为主播:', {
      candidateId,
      userId: user?.id,
      agentId: upgradeData.agentId,
      salary: upgradeData.salary,
      usersTableSynced
    });

    return {
      success: true,
      message: '恭喜！已成功升级为正式主播',
      streamer: getCandidateById(candidateId) // 返回更新后的数据
    };
  } else {
    return {
      success: false,
      message: '角色升级失败，请重试',
      streamer: null
    };
  }
}

/**
 * 检查是否所有评价都已完成（用于判断是否可以进入评级阶段）
 */
export function areAllEvaluationsCompleted(candidateId) {
  const candidate = getCandidateById(candidateId);
  if (!candidate || !candidate.evaluations) return false;

  // 必需的评价：舞蹈导师、经纪人
  const requiredEvaluations = ['danceTeacher', 'agent'];
  return requiredEvaluations.every(role => candidate.evaluations[role]);
}

/**
 * 生成Mock线上测试结果
 */
export function generateMockTestResult() {
  const personalities = ['ENFP', 'ISFP', 'ESFJ', 'INFJ', 'ESTP'];
  const types = [
    ['才艺主播', '互动主播'],
    ['舞蹈主播', '颜值主播'],
    ['游戏主播', '聊天主播'],
    ['唱歌主播', '才艺主播']
  ];

  return {
    personality: {
      type: personalities[Math.floor(Math.random() * personalities.length)],
      dimensions: {
        sociability: Math.floor(Math.random() * 5) + 5,
        intelligence: Math.floor(Math.random() * 5) + 5,
        stability: Math.floor(Math.random() * 5) + 5,
        dominance: Math.floor(Math.random() * 5) + 5
      }
    },
    suitableTypes: types[Math.floor(Math.random() * types.length)],
    report: '综合测试结果显示，该候选人性格外向，善于与人沟通，适合做互动类主播。'
  };
}
