import {
  CANDIDATE_STATUS,
  getCandidateGrade,
  getCandidateReminderDate,
  getOutstandingAssetSummary
} from '../mock/candidates.js';

export const RECRUIT_BUCKETS = {
  pending_screen: '待初筛',
  pending_invite: '待邀约',
  interview_scheduled: '已约面试',
  pending_onboard: '待入职'
};

const INTERVIEW_ACTIVE_STATUSES = [
  CANDIDATE_STATUS.INTERVIEW_SCHEDULED,
  CANDIDATE_STATUS.ONLINE_TEST_COMPLETED,
  CANDIDATE_STATUS.PENDING_RATING
];

const ONBOARDING_STATUSES = [
  CANDIDATE_STATUS.RATED,
  CANDIDATE_STATUS.SIGNED,
  CANDIDATE_STATUS.TRAINING,
  CANDIDATE_STATUS.ACTIVE
];

export function normalizeResumeSource(source) {
  const text = String(source || '');
  if (text.includes('BOSS')) return 'BOSS';
  if (text.includes('小红书')) return '小红书';
  if (text.includes('官网') || text.includes('小程序')) return '小程序';
  if (text.includes('推荐')) return '转介绍';
  return text || '其他来源';
}

export function getRecruitBucket(candidate) {
  if (candidate?.status === CANDIDATE_STATUS.PENDING) {
    return ['approved', 'pass'].includes(candidate?.hrReview?.result) && !candidate?.interviewSchedule
      ? 'pending_invite'
      : 'pending_screen';
  }

  if (INTERVIEW_ACTIVE_STATUSES.includes(candidate?.status)) {
    return 'interview_scheduled';
  }

  if (candidate?.status === CANDIDATE_STATUS.RATED) {
    return 'pending_onboard';
  }

  return '';
}

export function buildRecruitBoardStats(candidates = []) {
  const buckets = {
    pending_screen: [],
    pending_invite: [],
    interview_scheduled: [],
    pending_onboard: []
  };
  const sourceCounter = {};

  candidates.forEach((candidate) => {
    const bucketKey = getRecruitBucket(candidate);
    if (bucketKey) {
      buckets[bucketKey].push(candidate);
    }

    const sourceLabel = normalizeResumeSource(candidate.source);
    sourceCounter[sourceLabel] = (sourceCounter[sourceLabel] || 0) + 1;
  });

  return {
    buckets,
    cards: Object.keys(RECRUIT_BUCKETS).map((key) => ({
      key,
      label: RECRUIT_BUCKETS[key],
      count: buckets[key].length
    })),
    sources: Object.keys(sourceCounter).map((key) => ({
      label: key,
      count: sourceCounter[key]
    }))
  };
}

export function buildInterviewNotice(candidate) {
  const schedule = candidate?.interview || candidate?.interviewSchedule || {};
  const requirements = schedule.requirements || schedule.notes || '请携带身份证、淡妆到场，提前 10 分钟签到。';

  return [
    `【奥米光年面试通知】${candidate?.basicInfo?.name || '候选人'}，您好：`,
    `您已进入面试环节，面试时间：${schedule.date || '待定'} ${schedule.time || ''}`.trim(),
    `面试地点：${schedule.location || '基地待确认'}，可直接使用地图搜索“奥米光年基地”。`,
    `面试要求：${requirements}`,
    '如需改期，请及时联系 HR。'
  ].join('\n');
}

export function buildOnboardingStats(candidates = []) {
  const onboardingCandidates = candidates.filter((candidate) => ONBOARDING_STATUSES.includes(candidate.status));
  const signedCount = onboardingCandidates.filter((candidate) => candidate.status === CANDIDATE_STATUS.SIGNED).length;
  const contractPendingCount = onboardingCandidates.filter((candidate) => candidate.status === CANDIDATE_STATUS.RATED).length;
  const assetPendingCount = onboardingCandidates.filter((candidate) => {
    const summary = getOutstandingAssetSummary(candidate);
    return summary.totalIssued === 0 && candidate.status !== CANDIDATE_STATUS.RATED;
  }).length;

  return {
    candidates: onboardingCandidates,
    signedCount,
    contractPendingCount,
    assetPendingCount
  };
}

export function buildFollowUpCandidates(candidates = [], now = new Date()) {
  return candidates
    .filter((candidate) => ![CANDIDATE_STATUS.SIGNED, CANDIDATE_STATUS.TRAINING, CANDIDATE_STATUS.ACTIVE].includes(candidate.status))
    .map((candidate) => {
      const grade = getCandidateGrade(candidate);
      const reminderDate = getCandidateReminderDate(candidate, 30);
      const due = reminderDate ? new Date(reminderDate).getTime() <= now.getTime() : false;
      return {
        ...candidate,
        followUpGrade: grade,
        reminderDate,
        reminderDue: due
      };
    })
    .filter((candidate) => ['B', 'C'].includes(candidate.followUpGrade))
    .sort((a, b) => {
      if (a.reminderDue !== b.reminderDue) {
        return a.reminderDue ? -1 : 1;
      }
      return String(a.reminderDate || '').localeCompare(String(b.reminderDate || ''));
    });
}

export function getInterviewScoreEntryPath(candidateId) {
  return `/pages/recruit/hr-evaluation/hr-evaluation?candidateId=${candidateId}`;
}

export function getCandidatePrimaryTalent(candidate) {
  if (candidate?.talent?.mainTalent) {
    return candidate.talent.mainTalent;
  }

  if (Array.isArray(candidate?.talent?.mainTalents) && candidate.talent.mainTalents.length > 0) {
    return candidate.talent.mainTalents.join(' / ');
  }

  return '待评估';
}

export function getCandidateStatusBadge(candidate) {
  const bucket = getRecruitBucket(candidate);
  return RECRUIT_BUCKETS[bucket] || '候选人';
}

export function getAssetSummaryText(candidate) {
  const summary = getOutstandingAssetSummary(candidate);
  if (summary.totalIssued === 0) {
    return '未登记物资';
  }
  if (summary.pendingReturnCount === 0) {
    return `已归还 ${summary.totalIssued} 项`;
  }
  return `待归还 ${summary.pendingReturnCount} 项`;
}
