export const INTERVIEWER_ROLE_CONFIG = {
  founder: {
    key: 'founder',
    name: '创始人',
    shortName: '创始人',
    icon: '★',
    accent: '#111111',
    workspacePath: '/pages/admin/home/home',
    detailActionText: '进入创始人决策',
    actionPath: (candidateId) => `/pages/recruit/rating-review/rating-review?candidateId=${candidateId}&role=founder`
  },
  admin: {
    key: 'admin',
    name: '管理员',
    shortName: '管理',
    icon: '⚙',
    accent: '#607D8B',
    workspacePath: '/pages/admin/home/home',
    detailActionText: '进入汇总决策',
    actionPath: (candidateId) => `/pages/recruit/rating-review/rating-review?candidateId=${candidateId}&role=admin`
  },
  hr: {
    key: 'hr',
    name: 'HR',
    shortName: 'HR',
    icon: 'HR',
    accent: '#2E7D32',
    workspacePath: '/pages/hr/interview-home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/hr-evaluation/hr-evaluation?candidateId=${candidateId}`
  },
  agent: {
    key: 'agent',
    name: '经纪人',
    shortName: '经纪人',
    icon: '⭐',
    accent: '#FFD700',
    workspacePath: '/pages/agent/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/agent-evaluation/agent-evaluation?candidateId=${candidateId}`
  },
  operations: {
    key: 'operations',
    name: '运营',
    shortName: '运营',
    icon: 'OP',
    accent: '#00ACC1',
    workspacePath: '/pages/operations/interview-home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/operations-evaluation/operations-evaluation?candidateId=${candidateId}`
  },
  trainer: {
    key: 'trainer',
    name: '培训师',
    shortName: '培训',
    icon: 'TR',
    accent: '#8E24AA',
    workspacePath: '/pages/trainer/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/trainer-evaluation/trainer-evaluation?candidateId=${candidateId}`
  },
  dance_teacher: {
    key: 'dance_teacher',
    name: '舞蹈老师',
    shortName: '舞蹈',
    icon: '💃',
    accent: '#FF6B6B',
    workspacePath: '/pages/dance-teacher/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/dance-evaluation/dance-evaluation?candidateId=${candidateId}`
  },
  photographer: {
    key: 'photographer',
    name: '摄影师',
    shortName: '摄影',
    icon: 'PH',
    accent: '#7A8E8B',
    workspacePath: '/pages/photographer/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/photographer-evaluation/photographer-evaluation?candidateId=${candidateId}`
  },
  host_mc: {
    key: 'host_mc',
    name: '主持/MC',
    shortName: 'MC',
    icon: '🎤',
    accent: '#FF7043',
    workspacePath: '/pages/host-mc/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/host-mc-evaluation/host-mc-evaluation?candidateId=${candidateId}`
  },
  makeup_artist: {
    key: 'makeup_artist',
    name: '化妆师',
    shortName: '化妆',
    icon: '💄',
    accent: '#FF7AA2',
    workspacePath: '/pages/makeup-artist/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/makeup-artist-evaluation/makeup-artist-evaluation?candidateId=${candidateId}`
  },
  stylist: {
    key: 'stylist',
    name: '造型师',
    shortName: '造型',
    icon: '🧩',
    accent: '#7E57C2',
    workspacePath: '/pages/stylist/home/home',
    detailActionText: '进入评价详情',
    actionPath: (candidateId) => `/pages/recruit/stylist-evaluation/stylist-evaluation?candidateId=${candidateId}`
  }
};

export const INTERVIEWER_ROLE_KEYS = Object.keys(INTERVIEWER_ROLE_CONFIG);

export function isInterviewerRole(role) {
  return INTERVIEWER_ROLE_KEYS.includes(role);
}

export function getInterviewerRoleConfig(role) {
  return INTERVIEWER_ROLE_CONFIG[role] || INTERVIEWER_ROLE_CONFIG.stylist;
}

export function getWorkspacePathByRole(role) {
  return getInterviewerRoleConfig(role).workspacePath;
}

export function getDetailPath(candidateId, role) {
  return `/pages/interviewer/detail/detail?id=${candidateId}&role=${encodeURIComponent(role)}`;
}

export function normalizeCandidateImageSrc(value) {
  const src = String(value || '').trim();
  if (!src) {
    return '';
  }

  if (src.includes('<') || src.includes('>')) {
    return '';
  }

  if (
    src.startsWith('cloud://')
    || src.startsWith('http://')
    || src.startsWith('https://')
    || src.startsWith('wxfile://')
    || src.startsWith('data:image/')
    || src.startsWith('/')
  ) {
    return src;
  }

  return '';
}

export function getCandidateAvatar(candidate) {
  return normalizeCandidateImageSrc(
    candidate?.avatar ||
    candidate?.avatarUrl ||
    candidate?.photo ||
    candidate?.images?.facePhoto ||
    candidate?.images?.lifePhoto1 ||
    candidate?.images?.lifePhotos?.[0] ||
    candidate?.basicInfo?.facePhoto ||
    candidate?.basicInfo?.lifePhoto1 ||
    candidate?.basicInfo?.avatar ||
    candidate?.profile?.avatar ||
    candidate?.profile?.avatarUrl ||
    ''
  );
}

async function getCloudTempUrlsByAdminApi(fileIds = []) {
  const res = await wx.cloud.callFunction({
    name: 'admin-api',
    data: {
      apiPath: '/cloudfile',
      apiBody: {
        fileIds
      }
    }
  });
  const body = res?.result?.body
    ? JSON.parse(res.result.body)
    : (res?.result || {});
  return Array.isArray(body?.file_list) ? body.file_list : [];
}

export async function hydrateCandidateAvatarList(list = []) {
  const sourceList = Array.isArray(list) ? list : [];
  const normalizedList = sourceList.map((item) => ({
    ...item,
    avatar: item?.avatar || getCandidateAvatar(item)
  }));
  const cloudFileIds = Array.from(new Set(
    normalizedList
      .map((item) => item?.avatar)
      .filter((avatar) => typeof avatar === 'string' && avatar.startsWith('cloud://'))
  ));

  if (!cloudFileIds.length) {
    return normalizedList;
  }

  const applyTempUrls = (fileList = []) => {
    const tempUrlMap = new Map(
      fileList.map((item) => [
        item.fileID || item.fileid,
        item.tempFileURL || item.download_url || ''
      ])
    );

    return normalizedList.map((item) => ({
      ...item,
      avatar: item.avatar && item.avatar.startsWith('cloud://')
        ? (tempUrlMap.get(item.avatar) || '')
        : item.avatar
    }));
  };

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: cloudFileIds
    });
    const fileList = Array.isArray(res?.fileList) ? res.fileList : [];
    const hasAuthorityError = fileList.some((item) => String(item?.errMsg || '').includes('STORAGE_EXCEED_AUTHORITY'));
    if (hasAuthorityError) {
      return applyTempUrls(await getCloudTempUrlsByAdminApi(cloudFileIds));
    }
    return applyTempUrls(fileList);
  } catch (error) {
    try {
      return applyTempUrls(await getCloudTempUrlsByAdminApi(cloudFileIds));
    } catch (fallbackError) {
      console.warn('[interviewer] 获取头像临时链接失败:', fallbackError || error);
      return normalizedList.map((item) => ({
        ...item,
        avatar: item.avatar && item.avatar.startsWith('cloud://') ? '' : item.avatar
      }));
    }
  }
}

export async function hydrateSingleCandidateAvatar(candidate) {
  const [hydratedCandidate] = await hydrateCandidateAvatarList([candidate]);
  return hydratedCandidate || candidate;
}

export function getCandidateDisplayName(candidate) {
  return candidate?.name || candidate?.basicInfo?.name || candidate?.basicInfo?.artName || '未命名候选人';
}

export function getCandidateLiveName(candidate) {
  return candidate?.liveName || candidate?.experience?.accountName || candidate?.basicInfo?.artName || '';
}

export function getCandidateAssignedAgent(candidate) {
  const assignedAgent = candidate?.assignedAgent;
  if (!assignedAgent || typeof assignedAgent !== 'object') {
    return null;
  }

  return {
    id: assignedAgent.id || assignedAgent.agentId || '',
    name: assignedAgent.name || assignedAgent.agentName || '',
    phone: assignedAgent.phone || assignedAgent.agentPhone || ''
  };
}
