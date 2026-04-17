import {
  INTERVIEW_DIMENSION_CONFIG,
  INTERVIEW_DIMENSION_KEYS,
  INTERVIEW_GRADE_COLOR_MAP,
  INTERVIEW_GRADE_VALUES,
  INTERVIEW_STYLE_TAG_OPTIONS,
  isValidInterviewDimensionKey,
  isValidInterviewGrade
} from './interview-grade-config.js';
import {
  validateDraftPayload,
  validateSubmitPayload
} from './interview-grade-validator.js';

const ROLE_META = {
  admin: '管理员',
  agent: '经纪人',
  photographer: '摄影师',
  dance_teacher: '舞蹈老师',
  host_mc: '主持/MC',
  makeup_artist: '化妆师',
  stylist: '造型师',
  founder: '创始人'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function createEmptyDimensionObject(defaultValueFactory) {
  return INTERVIEW_DIMENSION_KEYS.reduce((result, key) => {
    result[key] = typeof defaultValueFactory === 'function'
      ? defaultValueFactory(key)
      : defaultValueFactory;
    return result;
  }, {});
}

function normalizeDimensions(rawDimensions = {}) {
  return INTERVIEW_DIMENSION_KEYS.reduce((result, key) => {
    const grade = normalizeText(rawDimensions[key]);
    result[key] = isValidInterviewGrade(grade) ? grade : '';
    return result;
  }, {});
}

function normalizeDimensionRemarks(rawRemarks = {}) {
  return INTERVIEW_DIMENSION_KEYS.reduce((result, key) => {
    result[key] = normalizeText(rawRemarks[key]);
    return result;
  }, {});
}

function normalizeDimensionPresetTags(rawPresetTags = {}) {
  return INTERVIEW_DIMENSION_KEYS.reduce((result, key) => {
    const tags = normalizeStringArray(rawPresetTags[key]);
    result[key] = [...new Set(tags)];
    return result;
  }, {});
}

function normalizeAttachments(rawAttachments = {}) {
  const source = rawAttachments && typeof rawAttachments === 'object' ? rawAttachments : {};

  return {
    images: normalizeStringArray(source.images),
    videos: normalizeStringArray(source.videos),
    videoLinks: normalizeStringArray(source.videoLinks)
  };
}

export function getEvaluationFormConfig(role) {
  const roleName = ROLE_META[role] || ROLE_META.stylist;

  return {
    role,
    roleName,
    pageTitle: `${roleName}评价`,
    submitText: '提交面试评价',
    grades: [...INTERVIEW_GRADE_VALUES],
    gradeColors: { ...INTERVIEW_GRADE_COLOR_MAP },
    dimensions: INTERVIEW_DIMENSION_KEYS.map((key) => ({
      ...INTERVIEW_DIMENSION_CONFIG[key]
    })),
    styleTagOptions: [...INTERVIEW_STYLE_TAG_OPTIONS]
  };
}

export function createInitialFormData() {
  return {
    dimensions: createEmptyDimensionObject(''),
    dimensionRemarks: createEmptyDimensionObject(''),
    dimensionPresetTags: createEmptyDimensionObject(() => []),
    styleTags: [],
    attachments: {
      images: [],
      videos: [],
      videoLinks: []
    },
    summaryComment: ''
  };
}

export function normalizeEvaluationPayload(payload = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};

  return {
    dimensions: normalizeDimensions(source.dimensions),
    dimensionRemarks: normalizeDimensionRemarks(source.dimensionRemarks),
    dimensionPresetTags: normalizeDimensionPresetTags(source.dimensionPresetTags),
    styleTags: [...new Set(normalizeStringArray(source.styleTags))],
    attachments: normalizeAttachments(source.attachments),
    summaryComment: normalizeText(source.summaryComment)
  };
}

export function hydrateEvaluationFormData(payload = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const normalizedPayload = normalizeEvaluationPayload(source);

  if (source.ext && typeof source.ext === 'object') {
    const extRaw = source.ext.rawFormData;
    if (extRaw && typeof extRaw === 'object') {
      return {
        ...normalizedPayload,
        ...normalizeEvaluationPayload(extRaw)
      };
    }
  }

  if (source.rawFormData && typeof source.rawFormData === 'object') {
    return {
      ...normalizedPayload,
      ...normalizeEvaluationPayload(source.rawFormData)
    };
  }

  if (source.stageEvaluations && typeof source.stageEvaluations === 'object') {
    const draftData = createInitialFormData();
    if (source.stageEvaluations.appearance) {
      draftData.dimensions.appearance = normalizeText(source.stageEvaluations.appearance.grade);
      draftData.dimensionRemarks.appearance = normalizeText(source.stageEvaluations.appearance.comment);
    }
    if (source.stageEvaluations.talent) {
      draftData.dimensions.talent = normalizeText(source.stageEvaluations.talent.grade);
      draftData.dimensionRemarks.talent = normalizeText(source.stageEvaluations.talent.comment);
    }
    if (source.stageEvaluations.live_teaching || source.stageEvaluations.teaching) {
      const teachingSource = source.stageEvaluations.live_teaching || source.stageEvaluations.teaching;
      draftData.dimensions.teaching = normalizeText(teachingSource.grade);
      draftData.dimensionRemarks.teaching = normalizeText(teachingSource.comment);
    }
    if (source.stageEvaluations.self_intro || source.stageEvaluations.selfIntro) {
      const selfIntroSource = source.stageEvaluations.self_intro || source.stageEvaluations.selfIntro;
      draftData.dimensions.selfIntro = normalizeText(selfIntroSource.grade);
      draftData.dimensionRemarks.selfIntro = normalizeText(selfIntroSource.comment);
    }
    if (source.stageEvaluations.intro_qa || source.stageEvaluations.qa) {
      const qaSource = source.stageEvaluations.intro_qa || source.stageEvaluations.qa;
      draftData.dimensions.qa = normalizeText(qaSource.grade);
      draftData.dimensionRemarks.qa = normalizeText(qaSource.comment);
    }
    return {
      ...draftData,
      summaryComment: normalizedPayload.summaryComment
    };
  }

  return normalizedPayload;
}

export function buildInterviewEvaluationPayload(formData = {}, extras = {}) {
  const normalizedFormData = normalizeEvaluationPayload(formData);
  const extSource = extras.ext && typeof extras.ext === 'object' ? extras.ext : {};

  return {
    ...extras,
    dimensions: normalizedFormData.dimensions,
    dimensionRemarks: normalizedFormData.dimensionRemarks,
    dimensionPresetTags: normalizedFormData.dimensionPresetTags,
    styleTags: normalizedFormData.styleTags,
    attachments: normalizedFormData.attachments,
    summaryComment: normalizedFormData.summaryComment,
    ext: {
      ...clone(extSource),
      rawFormData: clone(normalizedFormData)
    }
  };
}

export function validateEvaluationForm(configOrPayload, maybeFormData, options = {}) {
  const payload = maybeFormData
    ? buildInterviewEvaluationPayload(maybeFormData)
    : buildInterviewEvaluationPayload(configOrPayload);

  return options.mode === 'draft'
    ? validateDraftPayload(payload)
    : validateSubmitPayload(payload);
}

export function createEmptyDimensionGrades() {
  return createEmptyDimensionObject('');
}

export function createEmptyDimensionRemarks() {
  return createEmptyDimensionObject('');
}

export function createEmptyDimensionPresetTags() {
  return createEmptyDimensionObject(() => []);
}

export function getDimensionConfig(key) {
  return isValidInterviewDimensionKey(key) ? { ...INTERVIEW_DIMENSION_CONFIG[key] } : null;
}

export {
  INTERVIEW_GRADE_VALUES,
  INTERVIEW_GRADE_COLOR_MAP,
  INTERVIEW_DIMENSION_KEYS,
  INTERVIEW_DIMENSION_CONFIG,
  INTERVIEW_STYLE_TAG_OPTIONS,
  validateDraftPayload,
  validateSubmitPayload
};
