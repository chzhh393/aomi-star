import {
  INTERVIEW_DIMENSION_KEYS,
  INTERVIEW_STYLE_TAG_OPTIONS,
  isValidInterviewGrade
} from './interview-grade-config.js';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
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

function validateDimensionsPresence(dimensions = {}) {
  if (!isPlainObject(dimensions)) {
    return '评分维度数据格式错误';
  }

  for (const key of INTERVIEW_DIMENSION_KEYS) {
    if (!(key in dimensions)) {
      return `缺少维度 ${key}`;
    }
  }

  return '';
}

function validateDimensionGrades(dimensions = {}, { requireAll = false } = {}) {
  const structureError = validateDimensionsPresence(dimensions);
  if (structureError) {
    return structureError;
  }

  for (const key of INTERVIEW_DIMENSION_KEYS) {
    const grade = normalizeText(dimensions[key]);
    if (!grade) {
      if (requireAll) {
        return `请完成 ${key} 评级`;
      }
      continue;
    }

    if (!isValidInterviewGrade(grade)) {
      return `${key} 评级无效`;
    }
  }

  return '';
}

export function needRemarkForGrade(grade) {
  const normalizedGrade = normalizeText(grade);
  return normalizedGrade === 'S' || normalizedGrade === 'C';
}

export function validateStyleTagCount(styleTags) {
  const tags = normalizeStringArray(styleTags);
  const uniqueTags = [...new Set(tags)];

  if (uniqueTags.length < 1 || uniqueTags.length > 2) {
    return '风格标签需选择 1-2 个';
  }

  const invalidTag = uniqueTags.find((tag) => !INTERVIEW_STYLE_TAG_OPTIONS.includes(tag));
  if (invalidTag) {
    return `无效的风格标签：${invalidTag}`;
  }

  return '';
}

export function validateDraftPayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return '评价草稿数据格式错误';
  }

  return validateDimensionGrades(payload.dimensions || {}, { requireAll: false });
}

export function validateSubmitPayload(payload = {}) {
  if (!isPlainObject(payload)) {
    return '评价提交数据格式错误';
  }

  const dimensionError = validateDimensionGrades(payload.dimensions || {}, { requireAll: true });
  if (dimensionError) {
    return dimensionError;
  }

  const remarks = isPlainObject(payload.dimensionRemarks) ? payload.dimensionRemarks : {};
  for (const key of INTERVIEW_DIMENSION_KEYS) {
    const grade = normalizeText(payload.dimensions?.[key]);
    if (!grade) {
      return `请完成 ${key} 评级`;
    }

    if (needRemarkForGrade(grade) && !normalizeText(remarks[key])) {
      return `${key} 选择 ${grade} 时必须填写备注`;
    }
  }

  const styleTagError = validateStyleTagCount(payload.styleTags);
  if (styleTagError) {
    return styleTagError;
  }

  return '';
}
