import {
  getPendingInterviewCandidates,
  getCompletedInterviewCandidates
} from './interview-api.js';
import {
  getCandidateAssignedAgent,
  getCandidateAvatar,
  getCandidateDisplayName,
  getCandidateLiveName,
  getDetailPath,
  getInterviewerRoleConfig
} from './interviewer.js';
import { generateTestCandidates } from '../mock/test-data.js';

const role = 'photographer';
const roleConfig = getInterviewerRoleConfig(role);

const VISUAL_STANDARD_LIBRARY = [
  {
    key: 'highlight-direct',
    trackName: '高光直拍模板',
    scene: '老师下发高光直拍',
    rhythm: '爆点前 3 秒预热，爆点时推近，收尾停镜 1 秒',
    moves: ['稳定中景开场', '副歌推镜', '节奏点甩镜', '结尾定格'],
    movesText: '稳定中景开场 / 副歌推镜 / 节奏点甩镜 / 结尾定格',
    styling: '适合舞蹈展示、记忆点动作、卡点镜头',
    sourceLabel: '同步曲目库视觉建议'
  },
  {
    key: 'custom-agent',
    trackName: '经纪人定制叙事版',
    scene: '经纪人下发定制需求',
    rhythm: '先人物情绪，再补细节和环境镜头，保留 15 秒口播空间',
    moves: ['半身跟拍', '手部特写', '侧逆光氛围镜', '结尾留白'],
    movesText: '半身跟拍 / 手部特写 / 侧逆光氛围镜 / 结尾留白',
    styling: '适合人设建立、招商展示、情绪片段剪辑',
    sourceLabel: '同步曲目库视觉建议'
  },
  {
    key: 'pk-fast',
    trackName: 'PK 快切模板',
    scene: '高互动快节奏内容',
    rhythm: '每 2-3 秒切点，强节奏段落优先近景和低机位',
    moves: ['低机位上摇', '左右平移', '近景快切', '反打表情'],
    movesText: '低机位上摇 / 左右平移 / 近景快切 / 反打表情',
    styling: '适合 PK、热舞、爆发型互动片段',
    sourceLabel: '同步曲目库视觉建议'
  },
  {
    key: 'daily-soft',
    trackName: '日常种草模板',
    scene: '轻内容、生活化拍摄',
    rhythm: '慢推慢移，保证画面呼吸感和人物松弛感',
    moves: ['自然跟走', '轻推镜', '45 度侧拍', '环境补镜'],
    movesText: '自然跟走 / 轻推镜 / 45 度侧拍 / 环境补镜',
    styling: '适合生活分享、日常 vlog、主播养成记录',
    sourceLabel: '同步曲目库视觉建议'
  }
];

function getOperatorId(agentInfo = {}) {
  return agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
}

function buildCandidateMergeMap() {
  return generateTestCandidates().reduce((acc, item) => {
    const key = item._id || item.id || item.candidateId;
    if (key) {
      acc[key] = item;
    }
    return acc;
  }, {});
}

function mergeCandidateRecord(candidate = {}, fallback = {}) {
  return {
    ...fallback,
    ...candidate,
    basicInfo: {
      ...(fallback.basicInfo || {}),
      ...(candidate.basicInfo || {})
    },
    images: {
      ...(fallback.images || {}),
      ...(candidate.images || {})
    },
    interview: {
      ...(fallback.interview || {}),
      ...(candidate.interview || {})
    },
    interviewSchedule: {
      ...(fallback.interviewSchedule || {}),
      ...(candidate.interviewSchedule || {})
    },
    interviewMaterials: {
      ...(fallback.interviewMaterials || {}),
      ...(candidate.interviewMaterials || {})
    },
    onlineTest: {
      ...(fallback.onlineTest || {}),
      ...(candidate.onlineTest || {})
    },
    evaluations: {
      ...(fallback.evaluations || {}),
      ...(candidate.evaluations || {})
    },
    talent: {
      ...(fallback.talent || {}),
      ...(candidate.talent || {})
    },
    assignedAgent: candidate.assignedAgent || fallback.assignedAgent || null
  };
}

function normalizeCandidateList(list = [], mergeMap = {}) {
  return list.map((candidate) => {
    const candidateId = candidate._id || candidate.candidateId || candidate.id;
    const fallback = mergeMap[candidateId] || {};
    return mergeCandidateRecord(candidate, fallback);
  });
}

function dedupeCandidates(list = []) {
  const map = new Map();
  list.forEach((candidate) => {
    const candidateId = candidate._id || candidate.candidateId || candidate.id;
    if (candidateId) {
      map.set(candidateId, candidate);
    }
  });
  return Array.from(map.values());
}

function getInterviewInfo(candidate = {}) {
  return candidate.interview || candidate.interviewSchedule || {};
}

function getMaterialInfo(candidate = {}) {
  const materials = candidate.interviewMaterials || {};
  const photos = materials.photos || {};
  const videos = Array.isArray(materials.videos) ? materials.videos : [];
  const beforePhotos = Array.isArray(photos.beforeMakeup) ? photos.beforeMakeup : [];
  const afterPhotos = Array.isArray(photos.afterMakeup) ? photos.afterMakeup : [];

  return {
    rawPhotoCount: beforePhotos.length,
    refinedPhotoCount: afterPhotos.length,
    videoCount: videos.length,
    beforePhotos,
    afterPhotos,
    videos,
    notes: materials.notes || '',
    uploadedAt: materials.uploadedAt || '',
    uploadedByName: materials.uploadedByName || ''
  };
}

function getTaskSource(candidate = {}) {
  const talents = Array.isArray(candidate.talent?.mainTalents) ? candidate.talent.mainTalents : [];
  const suitableTypes = Array.isArray(candidate.onlineTest?.suitableTypes) ? candidate.onlineTest.suitableTypes : [];
  const isHighlightShoot = talents.includes('舞蹈') || suitableTypes.some((item) => String(item).includes('舞蹈'));

  return isHighlightShoot
    ? '老师 · 高光直拍'
    : '经纪人 · 定制需求';
}

function getTaskStatus(candidate = {}) {
  const materialInfo = getMaterialInfo(candidate);

  if (materialInfo.rawPhotoCount + materialInfo.videoCount === 0) {
    return {
      text: '待拍摄',
      className: 'status-shoot'
    };
  }

  if (materialInfo.refinedPhotoCount === 0) {
    return {
      text: '待精修',
      className: 'status-edit'
    };
  }

  return {
    text: '待分发',
    className: 'status-deliver'
  };
}

function getUrgencyLabel(candidate = {}) {
  const interview = getInterviewInfo(candidate);
  const date = interview.date || '';
  if (!date) {
    return '待排期';
  }

  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    return '已超时';
  }
  if (date === today) {
    return '今日执行';
  }
  return '待执行';
}

function buildRadarTasks(candidates = []) {
  return candidates
    .map((candidate) => {
      const candidateId = candidate._id || candidate.candidateId || candidate.id;
      const materialInfo = getMaterialInfo(candidate);
      const interview = getInterviewInfo(candidate);
      const status = getTaskStatus(candidate);
      const displayName = getCandidateDisplayName(candidate);
      const liveName = getCandidateLiveName(candidate);

      return {
        candidateId,
        anchorId: candidate.anchorId || candidateId,
        name: displayName,
        liveName,
        sourceLabel: getTaskSource(candidate),
        statusText: status.text,
        statusClass: status.className,
        urgencyLabel: getUrgencyLabel(candidate),
        scheduleText: interview.date
          ? `${interview.date} ${interview.time || ''}`.trim()
          : '待 HR 排期',
        locationText: interview.location || interview.address || '待确认拍摄场地',
        assetSummary: `原片 ${materialInfo.rawPhotoCount + materialInfo.videoCount} 份 / 精修 ${materialInfo.refinedPhotoCount} 份`,
        focusText: materialInfo.notes || candidate.interviewSchedule?.notes || '按标准模板完成主镜头、补镜与交付链路',
        detailPath: getDetailPath(candidateId, role)
      };
    })
    .sort((a, b) => {
      const order = {
        '已超时': 0,
        '今日执行': 1,
        '待执行': 2,
        '待排期': 3
      };
      return (order[a.urgencyLabel] ?? 9) - (order[b.urgencyLabel] ?? 9);
    })
    .slice(0, 6);
}

function buildTaskOverview(tasks = []) {
  const todayCount = tasks.filter((item) => item.urgencyLabel === '今日执行').length;
  const urgentCount = tasks.filter((item) => item.urgencyLabel === '已超时' || item.statusText === '待拍摄').length;
  const deliveryCount = tasks.filter((item) => item.statusText === '待分发').length;

  return {
    total: tasks.length,
    todayCount,
    urgentCount,
    deliveryCount
  };
}

function buildRadarTaskGroups(tasks = []) {
  const groupDefs = [
    {
      key: 'teacher',
      title: '老师高光直拍',
      desc: '优先保证舞蹈高光、记忆点动作和卡点镜头。',
      match: (item) => item.sourceLabel.includes('老师')
    },
    {
      key: 'agent',
      title: '经纪人定制需求',
      desc: '偏人设表达、招商展示和情绪叙事镜头。',
      match: (item) => item.sourceLabel.includes('经纪人')
    },
    {
      key: 'other',
      title: '其他拍摄任务',
      desc: '未明确归到老师或经纪人来源的补充任务。',
      match: (item) => !item.sourceLabel.includes('老师') && !item.sourceLabel.includes('经纪人')
    }
  ];

  return groupDefs
    .map((group) => ({
      key: group.key,
      title: group.title,
      desc: group.desc,
      list: tasks.filter(group.match)
    }))
    .filter((group) => group.list.length);
}

function buildAssetGroups(candidates = []) {
  return candidates
    .filter((candidate) => {
      const materialInfo = getMaterialInfo(candidate);
      return materialInfo.rawPhotoCount + materialInfo.refinedPhotoCount + materialInfo.videoCount > 0;
    })
    .map((candidate) => {
      const candidateId = candidate._id || candidate.candidateId || candidate.id;
      const materialInfo = getMaterialInfo(candidate);
      const agent = getCandidateAssignedAgent(candidate);
      const downloadLinks = [];

      materialInfo.videos.slice(0, 2).forEach((item, index) => {
        downloadLinks.push({
          label: `原片视频 ${index + 1}`,
          url: item.path || `cloud://aomi-star/assets/${candidateId}/original/video-${index + 1}.mp4`
        });
      });

      materialInfo.afterPhotos.slice(0, 2).forEach((item, index) => {
        downloadLinks.push({
          label: `精修图 ${index + 1}`,
          url: item || `cloud://aomi-star/assets/${candidateId}/retouched/photo-${index + 1}.jpg`
        });
      });

      return {
        candidateId,
        anchorId: candidate.anchorId || candidateId,
        name: getCandidateDisplayName(candidate),
        liveName: getCandidateLiveName(candidate) || '待补直播名',
        originalCount: materialInfo.rawPhotoCount + materialInfo.videoCount,
        refinedCount: materialInfo.refinedPhotoCount,
        uploadedAt: materialInfo.uploadedAt || '待上传',
        ownerText: agent?.name ? `共享给主播 / ${agent.name}` : '共享给主播 / 经纪人',
        downloadLinks: downloadLinks.length
          ? downloadLinks
          : [
              {
                label: '云端下载目录',
                url: `cloud://aomi-star/assets/${candidateId}/`
              }
            ],
        summary: materialInfo.notes || '按主播 ID 分类归档原片、精修与补镜素材'
      };
    })
    .slice(0, 6);
}

function buildAssetCategoryGroups(groups = []) {
  const groupDefs = [
    {
      key: 'delivery',
      title: '待分发链接',
      desc: '精修与原片都已到位，重点检查交付对象和复制链接。',
      match: (item) => item.originalCount > 0 && item.refinedCount > 0 && item.downloadLinks.length > 0
    },
    {
      key: 'pending-retouch',
      title: '待精修素材',
      desc: '已有原片素材，尚未形成精修图资产。',
      match: (item) => item.originalCount > 0 && item.refinedCount === 0
    },
    {
      key: 'retouched',
      title: '精修图库',
      desc: '只看精修结果与图集沉淀，方便后续二次调用。',
      match: (item) => item.refinedCount > 0
    }
  ];

  const buckets = groupDefs.reduce((acc, group) => {
    acc[group.key] = [];
    return acc;
  }, {});

  groups.forEach((item) => {
    const matchedGroup = groupDefs.find((group) => group.match(item));
    if (matchedGroup) {
      buckets[matchedGroup.key].push(item);
    }
  });

  return groupDefs
    .map((group) => ({
      key: group.key,
      title: group.title,
      desc: group.desc,
      list: buckets[group.key]
    }))
    .filter((group) => group.list.length);
}

function buildLibraryStats(library = []) {
  return {
    templateCount: library.length,
    moveCount: library.reduce((sum, item) => sum + item.moves.length, 0),
    syncedCount: library.filter((item) => item.sourceLabel).length
  };
}

function buildPhotographerCards(taskOverview = {}, assetGroups = [], libraryStats = {}) {
  return [
    {
      key: 'radar',
      title: '拍摄任务雷达',
      summary: `${taskOverview.total || 0} 个任务 / ${taskOverview.todayCount || 0} 个今日执行`,
      detail: `${taskOverview.urgentCount || 0} 个待拍或超时任务，优先处理老师高光直拍与经纪人定制需求。`,
      path: '/pages/photographer/task-radar/task-radar'
    },
    {
      key: 'assets',
      title: '视觉资产管理',
      summary: `${assetGroups.length} 份主播资产档案`,
      detail: `${taskOverview.deliveryCount || 0} 份待分发素材，按主播 ID 归档原片、精修和下载链接。`,
      path: '/pages/photographer/asset-center/asset-center'
    },
    {
      key: 'library',
      title: '运镜标准库',
      summary: `${libraryStats.templateCount || 0} 套模板 / ${libraryStats.moveCount || 0} 个运镜点`,
      detail: '同步曲目库视觉建议，统一高光直拍、PK 快切和定制叙事镜头标准。',
      path: '/pages/photographer/standard-library/standard-library'
    }
  ];
}

function mapCandidateCard(candidate = {}) {
  const candidateId = candidate._id || candidate.candidateId || candidate.id;
  const displayName = getCandidateDisplayName(candidate);
  const liveName = getCandidateLiveName(candidate);
  const assignedAgent = getCandidateAssignedAgent(candidate);
  const materialInfo = getMaterialInfo(candidate);
  const status = getTaskStatus(candidate);

  return {
    _id: candidateId,
    avatar: getCandidateAvatar(candidate),
    name: displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?',
    liveName,
    assignedAgentName: assignedAgent?.name || '待分配',
    assignedAgentPhone: assignedAgent?.phone || '待补充',
    assetSummary: `原片 ${materialInfo.rawPhotoCount + materialInfo.videoCount} / 精修 ${materialInfo.refinedPhotoCount}`,
    statusText: status.text,
    statusClass: status.className,
    detailPath: getDetailPath(candidateId, role)
  };
}

async function loadPhotographerWorkbench(agentInfo = {}) {
  const operatorId = getOperatorId(agentInfo);
  const mergeMap = buildCandidateMergeMap();
  const libraryStats = buildLibraryStats(VISUAL_STANDARD_LIBRARY);

  try {
    const [pendingResult, reviewedResult] = await Promise.all([
      getPendingInterviewCandidates({
        role,
        operatorId,
        page: 1,
        pageSize: 50
      }),
      getCompletedInterviewCandidates({
        role,
        operatorId,
        page: 1,
        pageSize: 50
      })
    ]);

    const pendingCandidates = normalizeCandidateList(pendingResult.data?.list || [], mergeMap);
    const reviewedCandidates = normalizeCandidateList(reviewedResult.data?.list || [], mergeMap);

    return formatPhotographerWorkbench({
      pendingCandidates,
      reviewedCandidates,
      pendingCount: pendingResult.data?.total || pendingCandidates.length,
      reviewedCount: reviewedResult.data?.total || reviewedCandidates.length,
      libraryStats
    });
  } catch (error) {
    const fallbackList = Object.values(mergeMap).filter((candidate) => {
      const interviewers = getInterviewInfo(candidate).interviewers || [];
      return interviewers.some((item) => item.role === role) || getMaterialInfo(candidate).videoCount > 0;
    });

    const pendingCandidates = fallbackList.filter((candidate) =>
      ['interview_scheduled', 'online_test_completed', 'pending_rating'].includes(candidate.status)
    );
    const reviewedCandidates = fallbackList.filter((candidate) =>
      ['rated', 'signed', 'active', 'training'].includes(candidate.status)
    );

    return formatPhotographerWorkbench({
      pendingCandidates,
      reviewedCandidates,
      pendingCount: pendingCandidates.length,
      reviewedCount: reviewedCandidates.length,
      libraryStats
    });
  }
}

function formatPhotographerWorkbench({
  pendingCandidates = [],
  reviewedCandidates = [],
  pendingCount = 0,
  reviewedCount = 0,
  libraryStats = buildLibraryStats(VISUAL_STANDARD_LIBRARY)
}) {
  const allCandidates = dedupeCandidates([...pendingCandidates, ...reviewedCandidates]);
  const radarTasks = buildRadarTasks(allCandidates);
  const assetGroups = buildAssetGroups(allCandidates);
  const taskOverview = buildTaskOverview(radarTasks);

  return {
    role,
    roleConfig,
    pendingCount,
    reviewedCount,
    pendingCandidates,
    reviewedCandidates,
    taskOverview,
    radarTasks,
    radarTaskGroups: buildRadarTaskGroups(radarTasks),
    assetGroups,
    assetCategoryGroups: buildAssetCategoryGroups(assetGroups),
    standardLibrary: VISUAL_STANDARD_LIBRARY,
    libraryStats,
    photographerCards: buildPhotographerCards(taskOverview, assetGroups, libraryStats)
  };
}

export {
  role,
  roleConfig,
  VISUAL_STANDARD_LIBRARY,
  buildLibraryStats,
  loadPhotographerWorkbench,
  mapCandidateCard
};
