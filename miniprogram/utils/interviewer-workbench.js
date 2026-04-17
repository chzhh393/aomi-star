import { requireAgentLogin, getAgentInfo } from './agent-auth.js';
import {
  getCandidateAssignedAgent,
  getCandidateAvatar,
  getCandidateDisplayName,
  getCandidateLiveName,
  getDetailPath,
  getInterviewerRoleConfig,
  hydrateCandidateAvatarList
} from './interviewer.js';
import {
  getDanceTeacherBookings,
  getCompletedInterviewCandidates,
  getPendingInterviewCandidates
} from './interview-api.js';
import { getCandidateList as getAgentCandidateList } from './agent-api.js';

const DANCE_LIBRARY_BLUEPRINT = [
  {
    key: 'lead',
    name: '引流舞',
    count: 36,
    difficulty: '高难度',
    duration: '长时长',
    positioning: '带灯光走位建议',
    desc: '用于拉新破圈，默认补充镜头、灯光和舞台走位建议。'
  },
  {
    key: 'group',
    name: '团舞',
    count: 48,
    difficulty: '中难度',
    duration: '30s',
    positioning: '支持任意C位勾选',
    desc: '用于多人协作训练，保持固定时长和多人站位适配。'
  },
  {
    key: 'exclusive',
    name: '粉丝专属舞',
    count: 24,
    difficulty: '中低难度',
    duration: '强互动',
    positioning: '提升粉丝陪伴感',
    desc: '强调互动手势、表情和直播间互动记忆点。'
  },
  {
    key: 'pk',
    name: 'PK舞',
    count: 60,
    difficulty: '简单',
    duration: '快速通关',
    positioning: '支持大批量训练',
    desc: '适合大批量训练和批量通关，优先保证动作统一。'
  }
];

const DANCE_VERSION_LABELS = [
  '横屏镜面教学版',
  '竖屏镜头演绎版',
  '运镜集体走位版'
];

function buildDanceLibraryCategories() {
  return DANCE_LIBRARY_BLUEPRINT.map((item) => ({
    ...item,
    versionCount: DANCE_VERSION_LABELS.length,
    versionLabels: DANCE_VERSION_LABELS
  }));
}

function getDanceSkillStatus(item = {}, index = 0) {
  const pendingReviewCount = Number(item.pendingReviewCount || 0);
  const trainingRecordCount = Number(item.trainingRecordCount || 0);
  const reviewedCount = Number(item.reviewedCount || 0);

  if (pendingReviewCount > 0) {
    return {
      text: '练习中',
      className: 'status-practice'
    };
  }

  if (trainingRecordCount >= 2 || reviewedCount >= 2) {
    return index % 2 === 0
      ? { text: '已掌握', className: 'status-mastered' }
      : { text: 'C位勋章', className: 'status-c' };
  }

  if (trainingRecordCount > 0) {
    return {
      text: '练习中',
      className: 'status-practice'
    };
  }

  return {
    text: '未学',
    className: 'status-not-started'
  };
}

function buildDanceSkillMatrix(bookedCourseList = []) {
  const danceNames = ['引流舞', '团舞', '粉丝专属舞', 'PK舞'];

  return bookedCourseList.slice(0, 4).map((item, index) => {
    const baseStatus = getDanceSkillStatus(item, index);
    return {
      candidateId: item.candidateId,
      candidateName: item.candidateName,
      liveName: item.liveName || '',
      signInText: item.trainingRecordCount > 0 ? '已提交签到/日志' : '待签到',
      skills: danceNames.map((danceName, skillIndex) => {
        if (danceName === 'PK舞' && baseStatus.text === '已掌握') {
          return {
            danceName,
            statusText: '批量通关',
            statusClass: 'status-mastered'
          };
        }

        if (danceName === '团舞' && skillIndex === 1 && index % 2 === 0 && baseStatus.text !== '未学') {
          return {
            danceName,
            statusText: 'C位勋章',
            statusClass: 'status-c'
          };
        }

        return {
          danceName,
          statusText: baseStatus.text,
          statusClass: baseStatus.className
        };
      })
    };
  });
}

function buildDanceTeacherWorkspaceState({ bookedCourseList = [], pendingCount = 0, reviewedCount = 0 }) {
  const danceLibraryCategories = buildDanceLibraryCategories();
  const totalDanceCount = danceLibraryCategories.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const pendingReviewTotal = bookedCourseList.reduce((sum, item) => sum + Number(item.pendingReviewCount || 0), 0);
  const checkedInCount = bookedCourseList.filter((item) => Number(item.trainingRecordCount || 0) > 0).length;
  const focusCandidate = bookedCourseList.find((item) => Number(item.pendingReviewCount || 0) > 0) || bookedCourseList[0] || null;
  const starCandidate = bookedCourseList.find((item) => Number(item.reviewedCount || 0) > 0) || bookedCourseList[0] || null;
  const danceSkillMatrix = buildDanceSkillMatrix(bookedCourseList);

  return {
    danceTeacherSectionCards: [
      {
        key: 'interview',
        title: '面试管理',
        summary: `${pendingCount} 待评价 / ${reviewedCount} 已评价`,
        desc: '集中处理面试名单与评分进度。',
        highlight: pendingCount > 0 ? `优先处理 ${pendingCount} 份待评价面试` : '当前待评价面试已清空',
        quickAction: '进入面试区',
        quickActionType: 'switch-section',
        secondaryAction: pendingCount > 0 ? '查看待评价' : '查看已评价',
        secondaryActionType: 'switch-tab',
        secondaryActionValue: pendingCount > 0 ? 'pending' : 'reviewed'
      },
      {
        key: 'asset',
        title: '舞蹈资产库',
        summary: `${totalDanceCount} 支曲目 / ${totalDanceCount * DANCE_VERSION_LABELS.length} 个版本`,
        desc: '维护四类舞种和版本素材规划。',
        highlight: `当前聚焦 ${danceLibraryCategories[0]?.name || '引流舞'}、${danceLibraryCategories[1]?.name || '团舞'} 两类核心资产`,
        quickAction: '查看资产规划',
        quickActionType: 'shortcut',
        quickActionValue: 'library',
        secondaryAction: '切到资产区',
        secondaryActionType: 'switch-section'
      },
      {
        key: 'teaching',
        title: '教学管理',
        summary: `${bookedCourseList.length} 位预约 / ${pendingReviewTotal} 条待复核`,
        desc: '处理排期、计划、签到确认和训练复核。',
        highlight: bookedCourseList.length
          ? `${focusCandidate?.candidateName || '今日训练'} ${pendingReviewTotal > 0 ? `有 ${pendingReviewTotal} 条待复核日志` : '训练计划可继续推进'}`
          : '当前还没有预约训练，可先维护排期和资产库',
        quickAction: '进入教学区',
        quickActionType: 'switch-section',
        secondaryAction: bookedCourseList.length ? '管理排期' : '查看排期',
        secondaryActionType: 'shortcut',
        secondaryActionValue: 'schedule'
      }
    ],
    danceLibrarySummary: {
      totalDanceCount,
      totalVersionCount: totalDanceCount * DANCE_VERSION_LABELS.length,
      todayTrainingCount: bookedCourseList.length,
      pendingReviewTotal
    },
    danceLibraryCategories,
    danceDailyBoard: {
      todayProgress: `今日已排 ${bookedCourseList.length} 位主播训练，待处理 ${pendingCount} 份面试评价。`,
      todayStar: starCandidate ? `${starCandidate.candidateName} · ${starCandidate.liveName || '今日状态稳定'}` : '待老师点名今日之星',
      focusMember: focusCandidate ? `${focusCandidate.candidateName} · ${focusCandidate.pendingReviewCount || 0} 条记录待复核` : '暂无重点待关注成员',
      nextNeed: pendingReviewTotal > 0
        ? `明日优先处理 ${pendingReviewTotal} 条训练日志，并协调团舞 C 位排练。`
        : '明日可补充团舞和 PK 舞版本素材，提前安排协作排练。',
      attendanceText: bookedCourseList.length
        ? `${checkedInCount}/${bookedCourseList.length} 位主播已提交签到或训练日志`
        : '暂无预约主播，待经纪人发起训练预约'
    },
    danceSkillMatrix,
    danceBatchSummary: {
      candidateCount: danceSkillMatrix.length,
      pkDanceCount: Math.max(12, danceSkillMatrix.length * 6),
      masteredCount: danceSkillMatrix.filter((item) => item.skills.some((skill) => skill.statusText === '批量通关' || skill.statusText === '已掌握')).length,
      reviewedCount
    }
  };
}

function getMakeupCandidateStyle(candidate = {}, index = 0) {
  const liveName = getCandidateLiveName(candidate);
  const talents = Array.isArray(candidate?.talent?.mainTalents) ? candidate.talent.mainTalents : [];
  const styleText = `${candidate?.basicInfo?.artName || ''}${liveName || ''}`;

  if (talents.includes('舞蹈') || /舞|燃|辣|飒/.test(styleText) || index % 3 === 0) {
    return {
      key: 'stage',
      title: '舞台镜头妆',
      desc: '强调轮廓、立体度和强灯光下的镜头稳定性。'
    };
  }

  if (/甜|萌|氧|清/.test(styleText) || index % 3 === 1) {
    return {
      key: 'daily',
      title: '日常上镜妆',
      desc: '偏自然亲和，重点看底妆干净度和五官提亮。'
    };
  }

  return {
    key: 'revamp',
    title: '改造潜力档',
    desc: '重点评估妆容改造空间与风格可塑性。'
  };
}

function buildMakeupArtistWorkspaceState({ candidates = [], pendingCount = 0, reviewedCount = 0, role }) {
  const mappedCandidates = candidates.map((candidate, index) => {
    const style = getMakeupCandidateStyle(candidate, index);
    const detailPath = getDetailPath(candidate._id || candidate.candidateId, role);
    const liveName = getCandidateLiveName(candidate);
    const assignedAgent = getCandidateAssignedAgent(candidate);

    return {
      _id: candidate._id || candidate.candidateId,
      name: getCandidateDisplayName(candidate),
      liveName: liveName || '待补直播名',
      assignedAgentName: assignedAgent?.name || '待分配',
      assignedAgentPhone: assignedAgent?.phone || '暂未补充',
      detailPath,
      styleKey: style.key,
      styleTitle: style.title,
      styleDesc: style.desc,
      focusText: style.key === 'stage'
        ? '看灯下轮廓、修容和眼妆抓镜效果。'
        : style.key === 'daily'
          ? '看底妆通透度、唇颊气色和亲和感。'
          : '看改妆前后对比和人设转化空间。'
    };
  });

  const groupDefs = [
    {
      key: 'daily',
      title: '日常上镜妆',
      desc: '适合直播长时段出镜，强调干净、轻透、亲和。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'daily').length} 人待看底妆与提气色`
    },
    {
      key: 'stage',
      title: '舞台镜头妆',
      desc: '适合高光舞蹈、强灯环境和大开合镜头。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'stage').length} 人待看轮廓与镜头抓妆`
    },
    {
      key: 'revamp',
      title: '改造潜力档',
      desc: '适合做风格翻转、招商照片和人设重塑。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'revamp').length} 人待看改造空间`
    }
  ];

  return {
    makeupSectionCards: [
      {
        key: 'pending',
        title: '待评价妆面',
        summary: `${pendingCount} 人`,
        desc: '优先看未定妆候选人，先判断底妆方向和镜头适配。',
        highlight: pendingCount > 0 ? `今天优先处理 ${pendingCount} 份化妆评价` : '当前待评价妆面已清空'
      },
      {
        key: 'reviewed',
        title: '已归档妆面',
        summary: `${reviewedCount} 人`,
        desc: '复盘已完成评价的风格标签和后续妆面建议。',
        highlight: reviewedCount > 0 ? `已沉淀 ${reviewedCount} 份风格记录` : '暂无归档记录'
      },
      {
        key: 'style',
        title: '风格归类',
        summary: `${groupDefs.length} 类`,
        desc: '按日常上镜妆、舞台镜头妆、改造潜力档分类看卡片。',
        highlight: '化妆师首页已切到分组卡片视图'
      }
    ],
    makeupTaskGroups: groupDefs
      .map((group) => ({
        ...group,
        list: mappedCandidates.filter((item) => item.styleKey === group.key)
      }))
      .filter((group) => group.list.length)
  };
}

function getStylistCandidateStyle(candidate = {}, index = 0) {
  const liveName = getCandidateLiveName(candidate);
  const talents = Array.isArray(candidate?.talent?.mainTalents) ? candidate.talent.mainTalents : [];
  const styleText = `${candidate?.basicInfo?.artName || ''}${liveName || ''}`;

  if (talents.includes('舞蹈') || /舞|辣|飒|酷|燃/.test(styleText) || index % 3 === 0) {
    return {
      key: 'stage',
      title: '舞台造型组',
      desc: '优先看强舞台、强节奏和镜头冲击感。'
    };
  }

  if (/甜|萌|轻|清|氧/.test(styleText) || index % 3 === 1) {
    return {
      key: 'daily',
      title: '日常直播组',
      desc: '优先看亲和、稳定、长时段直播穿搭适配。'
    };
  }

  return {
    key: 'revamp',
    title: '人设改造组',
    desc: '优先看风格翻转、招商拍摄和包装潜力。'
  };
}

function buildStylistWorkspaceState({ candidates = [], pendingCount = 0, reviewedCount = 0, role }) {
  const mappedCandidates = candidates.map((candidate, index) => {
    const style = getStylistCandidateStyle(candidate, index);
    const detailPath = getDetailPath(candidate._id || candidate.candidateId, role);
    const liveName = getCandidateLiveName(candidate);
    const assignedAgent = getCandidateAssignedAgent(candidate);

    return {
      _id: candidate._id || candidate.candidateId,
      name: getCandidateDisplayName(candidate),
      liveName: liveName || '待补直播名',
      assignedAgentName: assignedAgent?.name || '待分配',
      assignedAgentPhone: assignedAgent?.phone || '暂未补充',
      detailPath,
      styleKey: style.key,
      focusText: style.key === 'stage'
        ? '重点看轮廓比例、镜头层次和舞台辨识度。'
        : style.key === 'daily'
          ? '重点看舒适度、耐看度和直播连续出镜稳定性。'
          : '重点看风格反差、包装空间和招商适配度。'
    };
  });

  const groupDefs = [
    {
      key: 'daily',
      title: '日常直播组',
      desc: '适合高频开播、亲和陪伴和长时段出镜。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'daily').length} 人待看日常穿搭适配`
    },
    {
      key: 'stage',
      title: '舞台造型组',
      desc: '适合热舞、PK、强镜头和高饱和直播场景。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'stage').length} 人待看舞台表现力`
    },
    {
      key: 'revamp',
      title: '人设改造组',
      desc: '适合做风格翻转、视觉包装和人设升级。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'revamp').length} 人待看改造潜力`
    }
  ];

  return {
    stylistSectionCards: [
      {
        key: 'pending',
        title: '待评价造型',
        summary: `${pendingCount} 人`,
        desc: '先定造型方向，再同步化妆和摄影配合。',
        highlight: pendingCount > 0 ? `今天优先处理 ${pendingCount} 份造型评价` : '当前待评价造型已清空'
      },
      {
        key: 'reviewed',
        title: '已归档造型',
        summary: `${reviewedCount} 人`,
        desc: '复盘已完成评价的风格标签和包装建议。',
        highlight: reviewedCount > 0 ? `已沉淀 ${reviewedCount} 份造型记录` : '暂无归档记录'
      },
      {
        key: 'style',
        title: '风格归类',
        summary: `${groupDefs.length} 类`,
        desc: '按日常直播组、舞台造型组、人设改造组归类查看。',
        highlight: '造型师首页已切到分组卡片视图'
      }
    ],
    stylistTaskGroups: groupDefs
      .map((group) => ({
        ...group,
        list: mappedCandidates.filter((item) => item.styleKey === group.key)
      }))
      .filter((group) => group.list.length)
  };
}

function getHostMcCandidateStyle(candidate = {}, index = 0) {
  const liveName = getCandidateLiveName(candidate);
  const talents = Array.isArray(candidate?.talent?.mainTalents) ? candidate.talent.mainTalents : [];
  const styleText = `${candidate?.basicInfo?.artName || ''}${liveName || ''}`;

  if (talents.includes('脱口秀') || /聊|说|控|场|稳/.test(styleText) || index % 3 === 0) {
    return {
      key: 'hosting',
      title: '控场主持组',
      desc: '优先看节奏把控、串场能力和流程稳定性。'
    };
  }

  if (talents.includes('唱歌') || /嗨|燃|热|互动|PK/.test(styleText) || index % 3 === 1) {
    return {
      key: 'interactive',
      title: '情绪互动组',
      desc: '优先看互动节奏、热场能力和情绪调动。'
    };
  }

  return {
    key: 'persona',
    title: '人设表达组',
    desc: '优先看表达辨识度、记忆点和人设包装潜力。'
  };
}

function buildHostMcWorkspaceState({ candidates = [], pendingCount = 0, reviewedCount = 0, role }) {
  const mappedCandidates = candidates.map((candidate, index) => {
    const style = getHostMcCandidateStyle(candidate, index);
    const detailPath = getDetailPath(candidate._id || candidate.candidateId, role);
    const liveName = getCandidateLiveName(candidate);
    const assignedAgent = getCandidateAssignedAgent(candidate);

    return {
      _id: candidate._id || candidate.candidateId,
      name: getCandidateDisplayName(candidate),
      liveName: liveName || '待补直播名',
      assignedAgentName: assignedAgent?.name || '待分配',
      assignedAgentPhone: assignedAgent?.phone || '暂未补充',
      detailPath,
      styleKey: style.key,
      focusText: style.key === 'hosting'
        ? '重点看串场稳定性、转场衔接和控节奏能力。'
        : style.key === 'interactive'
          ? '重点看热场能力、互动密度和临场情绪调动。'
          : '重点看表达辨识度、金句感和人设记忆点。'
    };
  });

  const groupDefs = [
    {
      key: 'hosting',
      title: '控场主持组',
      desc: '适合流程型直播、活动串场和稳定长场主持。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'hosting').length} 人待看控场能力`
    },
    {
      key: 'interactive',
      title: '情绪互动组',
      desc: '适合热场、PK、连麦和高互动直播段落。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'interactive').length} 人待看互动表现`
    },
    {
      key: 'persona',
      title: '人设表达组',
      desc: '适合打造记忆点主持、强表达和特色话术人设。',
      summary: `${mappedCandidates.filter((item) => item.styleKey === 'persona').length} 人待看表达辨识度`
    }
  ];

  return {
    hostMcSectionCards: [
      {
        key: 'pending',
        title: '待评价主持',
        summary: `${pendingCount} 人`,
        desc: '先判断控场方向，再细看互动风格和表达潜力。',
        highlight: pendingCount > 0 ? `今天优先处理 ${pendingCount} 份主持评价` : '当前待评价主持已清空'
      },
      {
        key: 'reviewed',
        title: '已归档主持',
        summary: `${reviewedCount} 人`,
        desc: '复盘已完成评价的主持标签和后续培养建议。',
        highlight: reviewedCount > 0 ? `已沉淀 ${reviewedCount} 份主持记录` : '暂无归档记录'
      },
      {
        key: 'style',
        title: '能力归类',
        summary: `${groupDefs.length} 类`,
        desc: '按控场主持组、情绪互动组、人设表达组归类查看。',
        highlight: '主持/MC 首页已切到分组卡片视图'
      }
    ],
    hostMcTaskGroups: groupDefs
      .map((group) => ({
        ...group,
        list: mappedCandidates.filter((item) => item.styleKey === group.key)
      }))
      .filter((group) => group.list.length)
  };
}

function mapCandidate(candidate, role) {
  const candidateId = candidate._id || candidate.candidateId;
  const displayName = getCandidateDisplayName(candidate);
  const liveName = getCandidateLiveName(candidate);
  const assignedAgent = getCandidateAssignedAgent(candidate);

  return {
    _id: candidateId,
    avatar: getCandidateAvatar(candidate),
    name: displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?',
    liveName,
    assignedAgentName: assignedAgent?.name || '',
    assignedAgentPhone: assignedAgent?.phone || '',
    detailPath: getDetailPath(candidateId, role)
  };
}

function mapAssignedCandidate(candidate, role) {
  const candidateId = candidate._id || candidate.candidateId;
  const displayName = getCandidateDisplayName(candidate);
  const liveName = getCandidateLiveName(candidate);
  const assignedAgent = getCandidateAssignedAgent(candidate);

  const trainingCampTodoStatus = candidate?.trainingCampTodo?.status || '';
  const canSendTrainingCampTodo = Boolean(
    candidate?.assignedAgent?.agentId &&
    ['rated', 'signed', 'training'].includes(candidate.status) &&
    trainingCampTodoStatus !== 'pending'
  );
  const canBookDanceCourse = Boolean(
    candidate?.assignedAgent?.agentId &&
    !['pending', 'approved', 'rejected'].includes(candidate.status || '')
  );

  return {
    _id: candidateId,
    avatar: getCandidateAvatar(candidate),
    name: displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?',
    liveName,
    status: candidate.status || '',
    statusLabel: candidate.status === 'pending'
      ? '待审核'
      : candidate.status === 'approved'
        ? '已通过审核'
        : candidate.status === 'interview_scheduled'
          ? '已安排面试'
          : candidate.status === 'online_test_completed'
            ? '线上测试完成'
            : candidate.status === 'pending_rating'
              ? '面试评价中'
              : candidate.status === 'rated'
                ? '待签约'
                : candidate.status === 'signed'
                  ? '已签约'
                  : candidate.status === 'training'
                    ? '培训中'
                    : candidate.status === 'active'
                      ? '直播中'
                      : candidate.status === 'rejected'
                        ? '未通过'
                        : '跟进中',
    trainingCampTodoStatus,
    canSendTrainingCampTodo,
    canBookDanceCourse,
    trainingCampActionText: canSendTrainingCampTodo ? '发送训练营邀请' : (
      trainingCampTodoStatus === 'pending'
        ? '已发送邀请'
        : trainingCampTodoStatus === 'confirmed'
          ? '已确认入营'
          : trainingCampTodoStatus === 'rejected'
            ? '已拒绝入营'
            : '查看档案'
    ),
    danceCourseActionText: canBookDanceCourse ? '预约训练课程' : '暂不可预约课程',
    assignedAgentName: assignedAgent?.name || '',
    assignedAgentPhone: assignedAgent?.phone || '',
    detailPath: `/pages/agent/candidate-detail/candidate-detail?id=${candidateId}`,
    danceCourseBookingPath: `/pages/agent/dance-course-booking/dance-course-booking?id=${candidateId}`
  };
}

export function createInterviewerWorkbenchPage(role) {
  const roleConfig = getInterviewerRoleConfig(role);

  return {
    data: {
      role,
      roleConfig,
      agentInfo: null,
      currentTab: 'pending',
      currentDanceTeacherSection: 'teaching',
      pendingCount: 0,
      reviewedCount: 0,
      assignedAnchorCount: 0,
      bookedCourseCount: 0,
      danceTeacherSectionCards: [],
      danceLibrarySummary: null,
      danceLibraryCategories: [],
      danceDailyBoard: null,
      danceSkillMatrix: [],
      danceBatchSummary: null,
      makeupSectionCards: [],
      makeupTaskGroups: [],
      makeupRawCandidates: [],
      stylistSectionCards: [],
      stylistTaskGroups: [],
      stylistRawCandidates: [],
      hostMcSectionCards: [],
      hostMcTaskGroups: [],
      hostMcRawCandidates: [],
      candidateList: [],
      assignedAnchorList: [],
      bookedCourseList: [],
      loading: false
    },

    onLoad() {
      if (!requireAgentLogin({
        allowedRoles: [role],
        redirectUrl: roleConfig.workspacePath
      })) {
        return;
      }

      this.setData({
        agentInfo: getAgentInfo()
      });

      this.loadPageData();
    },

    onShow() {
      const agentInfo = getAgentInfo();
      if (agentInfo && agentInfo.role === role) {
        this.setData({ agentInfo });
        this.loadPageData();
      }
    },

    async onPullDownRefresh() {
      await this.loadPageData();
      wx.stopPullDownRefresh();
    },

    async loadPageData() {
      await Promise.all([
        this.loadStats(),
        this.loadCandidates(this.data.currentTab),
        role === 'agent' ? this.loadAssignedAnchors() : Promise.resolve(),
        role === 'dance_teacher' ? this.loadDanceTeacherBookings() : Promise.resolve()
      ]);

      if (role === 'dance_teacher') {
        this.refreshDanceTeacherWorkspace();
      }

      if (role === 'makeup_artist') {
        this.refreshMakeupArtistWorkspace(this.data.makeupRawCandidates || []);
      }

      if (role === 'stylist') {
        this.refreshStylistWorkspace(this.data.stylistRawCandidates || []);
      }

      if (role === 'host_mc') {
        this.refreshHostMcWorkspace(this.data.hostMcRawCandidates || []);
      }
    },

    async loadStats() {
      try {
        const agentInfo = getAgentInfo() || {};
        const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
        const [pendingResult, reviewedResult] = await Promise.all([
          getPendingInterviewCandidates({
            role,
            operatorId,
            page: 1,
            pageSize: 1
          }),
          getCompletedInterviewCandidates({
            role,
            operatorId,
            page: 1,
            pageSize: 1
          })
        ]);

        this.setData({
          pendingCount: pendingResult.data?.total || 0,
          reviewedCount: reviewedResult.data?.total || 0
        });
      } catch (error) {
        console.error('[面试工作台] 加载统计失败:', error);
      }
    },

    async loadAssignedAnchors() {
      if (role !== 'agent') {
        return;
      }

      try {
        const result = await getAgentCandidateList({
          page: 1,
          pageSize: 100
        });

        const fullList = Array.isArray(result.list) ? result.list : [];
        const hydratedCandidateList = await hydrateCandidateAvatarList(fullList);
        const assignedAnchorList = hydratedCandidateList.map((candidate) => mapAssignedCandidate(candidate, role));

        this.setData({
          assignedAnchorCount: assignedAnchorList.length,
          assignedAnchorList
        });
      } catch (error) {
        console.error('[经纪人工作台] 加载分配主播失败:', error);
        this.setData({
          assignedAnchorCount: 0,
          assignedAnchorList: []
        });
      }
    },

    async loadDanceTeacherBookings() {
      if (role !== 'dance_teacher') {
        return;
      }

      try {
        const result = await getDanceTeacherBookings();
        const bookedCourseList = Array.isArray(result.data?.list)
          ? result.data.list.map((item) => ({
            ...item,
            detailPath: getDetailPath(item.candidateId, role),
            bookingSummary: `${item.booking?.courseDate || '-'} ${item.booking?.startTime || ''}-${item.booking?.endTime || ''}`.trim(),
            bookingLocation: item.booking?.location || '待补充场地',
            pendingReviewCount: Number(item.pendingReviewCount || 0),
            trainingRecordCount: Number(item.trainingRecordCount || 0),
            reviewedCount: Number(item.reviewedCount || 0),
            reviewStatusText: Number(item.pendingReviewCount || 0) > 0
              ? `待复核 ${Number(item.pendingReviewCount || 0)} 条`
              : Number(item.trainingRecordCount || 0) > 0
                ? `已复核 ${Number(item.reviewedCount || 0)} 条`
                : '暂无训练记录'
          }))
          : [];

        this.setData({
          bookedCourseCount: bookedCourseList.length,
          bookedCourseList
        });
      } catch (error) {
        console.error('[舞蹈老师工作台] 加载预约课程失败:', error);
        this.setData({
          bookedCourseCount: 0,
          bookedCourseList: []
        });
      }
    },

    refreshDanceTeacherWorkspace() {
      if (role !== 'dance_teacher') {
        return;
      }

      this.setData(buildDanceTeacherWorkspaceState({
        bookedCourseList: this.data.bookedCourseList,
        pendingCount: this.data.pendingCount,
        reviewedCount: this.data.reviewedCount
      }));
    },

    refreshMakeupArtistWorkspace(rawCandidates = []) {
      if (role !== 'makeup_artist') {
        return;
      }

      this.setData(buildMakeupArtistWorkspaceState({
        candidates: rawCandidates,
        pendingCount: this.data.pendingCount,
        reviewedCount: this.data.reviewedCount,
        role
      }));
    },

    refreshStylistWorkspace(rawCandidates = []) {
      if (role !== 'stylist') {
        return;
      }

      this.setData(buildStylistWorkspaceState({
        candidates: rawCandidates,
        pendingCount: this.data.pendingCount,
        reviewedCount: this.data.reviewedCount,
        role
      }));
    },

    refreshHostMcWorkspace(rawCandidates = []) {
      if (role !== 'host_mc') {
        return;
      }

      this.setData(buildHostMcWorkspaceState({
        candidates: rawCandidates,
        pendingCount: this.data.pendingCount,
        reviewedCount: this.data.reviewedCount,
        role
      }));
    },

    async loadCandidates(tab) {
      this.setData({ loading: true });

      try {
        const agentInfo = getAgentInfo() || {};
        const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
        const requestFn = tab === 'pending'
          ? getPendingInterviewCandidates
          : getCompletedInterviewCandidates;

        const result = await requestFn({
          role,
          operatorId,
          page: 1,
          pageSize: 50
        });

        const rawCandidateList = result.data?.list || [];
        const hydratedCandidateList = await hydrateCandidateAvatarList(rawCandidateList);

        this.setData({
          currentTab: tab,
          makeupRawCandidates: role === 'makeup_artist' ? hydratedCandidateList : this.data.makeupRawCandidates,
          stylistRawCandidates: role === 'stylist' ? hydratedCandidateList : this.data.stylistRawCandidates,
          hostMcRawCandidates: role === 'host_mc' ? hydratedCandidateList : this.data.hostMcRawCandidates,
          candidateList: hydratedCandidateList.map((candidate) => mapCandidate(candidate, role)),
          loading: false
        });

        if (role === 'makeup_artist') {
          this.refreshMakeupArtistWorkspace(hydratedCandidateList);
        }

        if (role === 'stylist') {
          this.refreshStylistWorkspace(hydratedCandidateList);
        }

        if (role === 'host_mc') {
          this.refreshHostMcWorkspace(hydratedCandidateList);
        }
      } catch (error) {
        console.error('[面试工作台] 加载候选人失败:', error);
        this.setData({
          candidateList: [],
          makeupTaskGroups: role === 'makeup_artist' ? [] : this.data.makeupTaskGroups,
          stylistTaskGroups: role === 'stylist' ? [] : this.data.stylistTaskGroups,
          hostMcTaskGroups: role === 'host_mc' ? [] : this.data.hostMcTaskGroups,
          loading: false
        });
      }
    },

    switchTab(e) {
      const { tab } = e.currentTarget.dataset;
      if (tab === this.data.currentTab) {
        return;
      }

      this.loadCandidates(tab);
    },

    goToDetail(e) {
      const { path } = e.currentTarget.dataset;
      wx.navigateTo({ url: path });
    },

    goToDanceCourseBooking(e) {
      const { path } = e.currentTarget.dataset;
      if (!path) {
        return;
      }

      wx.navigateTo({ url: path });
    },

    goToDanceCourseSchedule() {
      if (role !== 'dance_teacher') {
        return;
      }

      wx.navigateTo({
        url: '/pages/dance-teacher/schedule/schedule'
      });
    },

    goToTrainingReview(e) {
      const { path } = e.currentTarget.dataset;
      if (!path) {
        return;
      }

      wx.navigateTo({ url: path });
    },

    handleDanceTeacherShortcut(e) {
      if (role !== 'dance_teacher') {
        return;
      }

      const { action } = e.currentTarget.dataset;

      if (action === 'schedule') {
        this.goToDanceCourseSchedule();
        return;
      }

      if (action === 'review') {
        const firstBooking = this.data.bookedCourseList[0];
        if (!firstBooking) {
          wx.showToast({
            title: '暂无预约主播',
            icon: 'none'
          });
          return;
        }

        wx.navigateTo({ url: firstBooking.detailPath });
        return;
      }

      if (action === 'library') {
        wx.showModal({
          title: '动态舞蹈曲目库',
          content: '当前首页已切换为资产库视角，覆盖引流舞、团舞、粉丝专属舞、PK舞四类基准，并预留三种版本素材管理入口。',
          showCancel: false
        });
        return;
      }

      if (action === 'matrix') {
        wx.showModal({
          title: '技能熟练度矩阵',
          content: '状态已对齐为未学、练习中、已掌握、C位勋章。当前先在首页展示预览，后续可扩展为逐人逐舞的完整矩阵页。',
          showCancel: false
        });
        return;
      }

      if (action === 'batch-pass') {
        const summary = this.data.danceBatchSummary || {};
        wx.showModal({
          title: '批量通关工具',
          content: `当前可覆盖 ${summary.candidateCount || 0} 名主播、${summary.pkDanceCount || 0} 支 PK 舞的批量标记场景，适合快速通关和阶段性清点。`,
          showCancel: false
        });
      }
    },

    switchDanceTeacherSection(e) {
      if (role !== 'dance_teacher') {
        return;
      }

      const { section } = e.currentTarget.dataset;
      if (!section || section === this.data.currentDanceTeacherSection) {
        return;
      }

      this.setData({
        currentDanceTeacherSection: section
      });
    },

    handleDanceTeacherSectionAction(e) {
      if (role !== 'dance_teacher') {
        return;
      }

      const { section, actionType, actionValue } = e.currentTarget.dataset;

      if (actionType === 'shortcut' && actionValue) {
        this.handleDanceTeacherShortcut({
          currentTarget: {
            dataset: {
              action: actionValue
            }
          }
        });
        return;
      }

      if (actionType === 'switch-tab' && actionValue) {
        this.setData({
          currentDanceTeacherSection: section || 'interview'
        });
        this.loadCandidates(actionValue);
        return;
      }

      if (!section) {
        return;
      }

      this.setData({
        currentDanceTeacherSection: section
      });
    }
  };
}
