const {
  DIMENSIONS,
  EVALUATION_STATUS,
  FINAL_DECISIONS,
  INTERVIEW_ROLES,
  SCORE_LEVELS,
  STYLE_TAGS
} = require('./constants');

function normalizeText(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function normalizePage(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

function normalizeArray(value, maxItemLength = 500) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, maxItemLength))
    .filter(Boolean);
}

function normalizeRound(value) {
  const text = normalizeText(value === undefined || value === null ? '1' : value, 50);
  const round = text || '1';
  if (round !== '1') {
    throw new Error('当前仅支持第1轮面试');
  }
  return round;
}

function normalizeRole(role) {
  const aliasMap = {
    hr: 'hr',
    operations: 'operations',
    trainer: 'trainer',
    danceTeacher: 'dance_teacher',
    dance_teacher: 'dance_teacher',
    makeupArtist: 'makeup_artist',
    makeup_artist: 'makeup_artist',
    hostMc: 'host_mc',
    host_mc: 'host_mc',
    photographer: 'photographer',
    stylist: 'stylist',
    agent: 'agent',
    admin: 'admin'
  };
  const rawRole = normalizeText(role, 100);
  const normalizedRole = (aliasMap[rawRole] || aliasMap[rawRole.toLowerCase()] || rawRole.toLowerCase());
  if (!INTERVIEW_ROLES[normalizedRole]) {
    throw new Error('无效的面试角色');
  }
  return normalizedRole;
}

function normalizeEvaluationStatus(status, defaultStatus = EVALUATION_STATUS.draft) {
  const normalizedStatus = normalizeText(status || defaultStatus, 50);
  if (!Object.values(EVALUATION_STATUS).includes(normalizedStatus)) {
    throw new Error('无效的评价状态');
  }
  return normalizedStatus;
}

function normalizeFinalDecision(decision) {
  const normalized = normalizeText(decision, 50);
  if (!FINAL_DECISIONS.includes(normalized)) {
    throw new Error('无效的终裁结果');
  }
  return normalized;
}

function normalizeAttachments(attachments = {}, fallback = {}) {
  const source = attachments && typeof attachments === 'object' ? attachments : {};
  const merged = {
    images: source.images || fallback.images,
    videos: source.videos || fallback.videos,
    videoLinks: source.videoLinks || source.videoUrls || fallback.videoLinks || fallback.videoUrls
  };

  return {
    images: normalizeArray(merged.images),
    videos: normalizeArray(merged.videos),
    videoLinks: normalizeArray(merged.videoLinks)
  };
}

function isTemporaryMediaUrl(value) {
  return typeof value === 'string' && (
    value.startsWith('wxfile://') ||
    value.startsWith('http://tmp') ||
    value.startsWith('https://tmp')
  );
}

function validateAttachmentUrls(attachments = {}) {
  const images = Array.isArray(attachments.images) ? attachments.images : [];
  const videos = Array.isArray(attachments.videos) ? attachments.videos : [];

  if (images.some(isTemporaryMediaUrl) || videos.some(isTemporaryMediaUrl)) {
    throw new Error('检测到未上传完成的图片或视频，请重新上传后再提交');
  }
}

function normalizeDimensions(dimensions = {}) {
  const normalized = {};

  Object.keys(DIMENSIONS).forEach((key) => {
    const value = normalizeText(dimensions[key], 10).toUpperCase();
    if (value) {
      if (!SCORE_LEVELS.includes(value)) {
        throw new Error(`维度 ${key} 评分无效`);
      }
      normalized[key] = value;
    }
  });

  return normalized;
}

function normalizeDimensionRemarks(remarks = {}) {
  const normalized = {};

  Object.keys(DIMENSIONS).forEach((key) => {
    const value = normalizeText(remarks[key], 1000);
    if (value) {
      normalized[key] = value;
    }
  });

  return normalized;
}

function normalizeDimensionPresetTags(tags = {}) {
  const normalized = {};

  Object.keys(DIMENSIONS).forEach((key) => {
    const value = normalizeArray(tags[key], 50);
    if (value.length) {
      normalized[key] = value.slice(0, 10);
    }
  });

  return normalized;
}

function normalizeStyleTags(styleTags) {
  const normalized = normalizeArray(styleTags, 20);
  const deduped = [...new Set(normalized)];

  deduped.forEach((tag) => {
    if (!STYLE_TAGS.includes(tag)) {
      throw new Error(`风格标签无效: ${tag}`);
    }
  });

  return deduped;
}

function validateEvaluationPayload(data = {}, options = {}) {
  const status = normalizeEvaluationStatus(data.status, options.defaultStatus);
  const dimensions = normalizeDimensions(data.dimensions);
  const dimensionRemarks = normalizeDimensionRemarks(data.dimensionRemarks);
  const dimensionPresetTags = normalizeDimensionPresetTags(data.dimensionPresetTags);
  const styleTags = normalizeStyleTags(data.styleTags);
  const attachments = normalizeAttachments(data.attachments, data);
  const round = normalizeRound(data.round);

  validateAttachmentUrls(attachments);

  if (status === EVALUATION_STATUS.submitted) {
    Object.keys(DIMENSIONS).forEach((key) => {
      if (!dimensions[key]) {
        throw new Error(`维度 ${key} 必须评分`);
      }
    });

    if (styleTags.length < 1 || styleTags.length > 2) {
      throw new Error('风格标签必须选择 1-2 个');
    }
  } else if (styleTags.length > 2) {
    throw new Error('风格标签最多选择 2 个');
  }

  if (status === EVALUATION_STATUS.submitted) {
    Object.entries(dimensions).forEach(([key, value]) => {
      if ((value === 'S' || value === 'C') && !dimensionRemarks[key]) {
        throw new Error(`维度 ${key} 选择 ${value} 时必须填写备注`);
      }
    });
  }

  return {
    round,
    status,
    dimensions,
    dimensionRemarks,
    dimensionPresetTags,
    styleTags,
    attachments
  };
}

module.exports = {
  normalizeArray,
  normalizeAttachments,
  normalizeEvaluationStatus,
  normalizeFinalDecision,
  normalizePage,
  normalizeRole,
  normalizeRound,
  normalizeText,
  validateEvaluationPayload
};
