import { requireAgentLogin } from '../../utils/agent-auth.js';
import {
  getInterviewCandidateBasicInfo,
  getMyInterviewEvaluationDetail,
  saveInterviewEvaluationDraft,
  submitInterviewEvaluation
} from '../../utils/interview-api.js';
import {
  batchUploadImages,
  batchUploadVideos
} from '../../utils/agent-api.js';
import {
  validateEvaluationForm as validateTransportEvaluationForm
} from '../../utils/interview-evaluation.js';

export const DIMENSIONS = [
  { key: 'appearance', label: '外型条件' },
  { key: 'talent', label: '才艺展示' },
  { key: 'teaching', label: '现场教学' },
  { key: 'selfIntro', label: '自我介绍' },
  { key: 'qa', label: '基础问答' }
];

export const GRADE_OPTIONS = ['S', 'A', 'B', 'C'];

export const STYLE_TAG_OPTIONS = [
  '体育生',
  '霸总',
  '奶狗',
  '盐系',
  '肌肉男',
  '忧郁',
  '沙雕'
];

export const INTERVIEW_STATUS_LABELS = {
  not_started: '未开始',
  draft: '草稿中',
  submitted: '已提交'
};

const STORAGE_PREFIX = 'interviewer_blind_review';
const DRAFT_SAVE_DEBOUNCE = 480;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyGradeMap() {
  return DIMENSIONS.reduce((result, item) => {
    result[item.key] = '';
    return result;
  }, {});
}

function createEmptyRemarkMap() {
  return DIMENSIONS.reduce((result, item) => {
    result[item.key] = '';
    return result;
  }, {});
}

function createEmptyPresetTagMap() {
  return DIMENSIONS.reduce((result, item) => {
    result[item.key] = [];
    return result;
  }, {});
}

function createAttachmentRecord(file, type) {
  const source = file?.tempFilePath || file?.url || file || '';
  const name = String(source).split('/').pop() || `${type}-${Date.now()}`;
  return {
    url: source,
    name,
    size: file?.size || 0,
    thumbUrl: file?.thumbTempFilePath || source,
    type
  };
}

function normalizeAttachmentList(value, type) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return createAttachmentRecord({ url: item }, type);
      }
      if (item && typeof item === 'object') {
        return createAttachmentRecord(item, type);
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isTemporaryMediaUrl(value) {
  return typeof value === 'string' && (
    value.startsWith('wxfile://') ||
    value.startsWith('http://tmp') ||
    value.startsWith('https://tmp')
  );
}

export function createEmptyEvaluationForm() {
  return {
    grades: createEmptyGradeMap(),
    remarks: createEmptyRemarkMap(),
    presetTags: createEmptyPresetTagMap(),
    styleTags: [],
    images: [],
    videos: []
  };
}

function createEmptySharedMaterials() {
  return {
    uploadedBy: '',
    uploadedAt: '',
    images: [],
    videos: []
  };
}

export function getCurrentInterviewer(roleFallback = '') {
  const agentInfo = wx.getStorageSync('agent_info') || {};
  const userInfo = wx.getStorageSync('user_info') || {};
  const profile = userInfo.profile || {};

  return {
    id: agentInfo._id ||
      agentInfo.id ||
      agentInfo.username ||
      agentInfo.account ||
      agentInfo.name ||
      userInfo.id ||
      userInfo.openId ||
      `${roleFallback || 'interviewer'}-local`,
    name: agentInfo.name || agentInfo.username || profile.name || userInfo.name || '面试官',
    role: agentInfo.role || userInfo.role || roleFallback
  };
}

function getStorageKey(candidateId, role, evaluatorId, status) {
  return `${STORAGE_PREFIX}:${candidateId}:${role}:${evaluatorId}:${status}`;
}

function normalizeFormData(formData = {}) {
  const next = createEmptyEvaluationForm();
  const grades = formData.grades || {};
  const remarks = formData.remarks || {};
  const presetTags = formData.presetTags || {};

  DIMENSIONS.forEach((item) => {
    next.grades[item.key] = grades[item.key] || '';
    next.remarks[item.key] = remarks[item.key] || '';
    next.presetTags[item.key] = Array.isArray(presetTags[item.key]) ? presetTags[item.key].slice(0, 10) : [];
  });

  next.styleTags = Array.isArray(formData.styleTags) ? [...new Set(formData.styleTags)].slice(0, 2) : [];
  next.images = normalizeAttachmentList(formData.images, 'image').slice(0, 6);
  next.videos = normalizeAttachmentList(formData.videos, 'video').slice(0, 3);
  return next;
}

function hydrateRemoteEvaluation(evaluation) {
  const formData = createEmptyEvaluationForm();
  const source = evaluation && typeof evaluation === 'object' ? evaluation : {};
  const dimensions = source.dimensions || {};
  const remarks = source.dimensionRemarks || {};
  const presetTags = source.dimensionPresetTags || {};

  DIMENSIONS.forEach((item) => {
    formData.grades[item.key] = normalizeText(dimensions[item.key]);
    formData.remarks[item.key] = normalizeText(remarks[item.key]);
    formData.presetTags[item.key] = Array.isArray(presetTags[item.key]) ? presetTags[item.key].slice(0, 10) : [];
  });

  formData.styleTags = Array.isArray(source.styleTags) ? [...new Set(source.styleTags)].slice(0, 2) : [];
  formData.images = normalizeAttachmentList(source.attachments?.images, 'image');
  formData.videos = normalizeAttachmentList(
    source.attachments?.videos?.length ? source.attachments.videos : source.attachments?.videoLinks,
    'video'
  );

  return formData;
}

function hydrateSharedMaterials(sharedMaterials) {
  const source = sharedMaterials && typeof sharedMaterials === 'object'
    ? sharedMaterials
    : {};

  return {
    uploadedBy: normalizeText(source.uploadedBy),
    uploadedAt: formatTime(source.uploadedAt),
    images: normalizeAttachmentList(source.images, 'image'),
    videos: normalizeAttachmentList(source.videos, 'video')
  };
}

function buildTransportPayload(page, formData) {
  const evaluator = page._evaluator || getCurrentInterviewer(page.data.pageRole);
  const candidateId = normalizeText(
    page._candidateId ||
    page.data.candidateId ||
    page.data.candidate?._id ||
    page.data.candidate?.candidateId
  );

  return {
    candidateId,
    role: page.data.pageRole,
    operatorId: evaluator.id,
    operatorName: evaluator.name,
    dimensions: clone(formData.grades),
    dimensionRemarks: clone(formData.remarks),
    dimensionPresetTags: clone(formData.presetTags),
    styleTags: clone(formData.styleTags),
    attachments: {
      images: formData.images.map((item) => item.url),
      videos: formData.videos.map((item) => item.url),
      videoLinks: []
    }
  };
}

export function loadLocalEvaluationRecord(candidateId, role, evaluatorId) {
  const submittedKey = getStorageKey(candidateId, role, evaluatorId, 'submitted');
  const draftKey = getStorageKey(candidateId, role, evaluatorId, 'draft');
  const submittedRecord = wx.getStorageSync(submittedKey);

  if (submittedRecord) {
    return {
      ...submittedRecord,
      status: 'submitted',
      formData: normalizeFormData(submittedRecord.formData)
    };
  }

  const draftRecord = wx.getStorageSync(draftKey);
  if (draftRecord) {
    return {
      ...draftRecord,
      status: 'draft',
      formData: normalizeFormData(draftRecord.formData)
    };
  }

  return null;
}

export function getLocalEvaluationSummary(candidateId, role, evaluatorId) {
  const record = loadLocalEvaluationRecord(candidateId, role, evaluatorId);
  if (!record) {
    return {
      status: 'not_started',
      statusLabel: INTERVIEW_STATUS_LABELS.not_started,
      actionText: '开始评分',
      timeText: ''
    };
  }

  const timeSource = record.status === 'submitted' ? record.submittedAt || record.savedAt : record.savedAt;

  return {
    status: record.status,
    statusLabel: INTERVIEW_STATUS_LABELS[record.status],
    actionText: record.status === 'submitted' ? '查看已提交内容' : '继续评分',
    timeText: formatTime(timeSource)
  };
}

function persistRecord(candidateId, role, evaluatorId, status, payload) {
  wx.setStorageSync(getStorageKey(candidateId, role, evaluatorId, status), payload);
}

function removeDraftRecord(candidateId, role, evaluatorId) {
  wx.removeStorageSync(getStorageKey(candidateId, role, evaluatorId, 'draft'));
}

function needsRemark(grade) {
  return grade === 'S' || grade === 'C';
}

function hasContent(formData) {
  return DIMENSIONS.some((item) => formData.grades[item.key] || normalizeText(formData.remarks[item.key])) ||
    formData.styleTags.length > 0 ||
    formData.images.length > 0 ||
    formData.videos.length > 0;
}

function hasTemporaryAttachments(formData) {
  const urls = [
    ...formData.images.map((item) => item?.url),
    ...formData.videos.map((item) => item?.url)
  ].filter(Boolean);

  return urls.some(isTemporaryMediaUrl);
}

function buildValidationPayload(formData) {
  return {
    dimensions: clone(formData.grades),
    dimensionRemarks: clone(formData.remarks),
    dimensionPresetTags: clone(formData.presetTags),
    styleTags: clone(formData.styleTags),
    attachments: {
      images: formData.images.map((item) => item?.url).filter(Boolean),
      videos: formData.videos.map((item) => item?.url).filter(Boolean),
      videoLinks: []
    }
  };
}

export function validateEvaluationForm(formData) {
  const missingGrades = [];
  const missingRemarks = [];

  DIMENSIONS.forEach((item) => {
    const grade = formData.grades[item.key];
    const remark = normalizeText(formData.remarks[item.key]);

    if (!grade) {
      missingGrades.push(item.label);
      return;
    }

    if (needsRemark(grade) && !remark) {
      missingRemarks.push(item.label);
    }
  });

  const styleTagCount = formData.styleTags.length;
  const hasTempAttachments = hasTemporaryAttachments(formData);
  const transportError = validateTransportEvaluationForm(buildValidationPayload(formData));

  return {
    missingGrades,
    missingRemarks,
    styleTagCount,
    hasTemporaryAttachments: hasTempAttachments,
    transportError,
    canSubmit: !transportError && !hasTempAttachments
  };
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDimensionStates(formData) {
  return DIMENSIONS.map((item) => ({
    ...item,
    selectedGrade: formData.grades[item.key],
    remark: formData.remarks[item.key] || '',
    needsRemark: needsRemark(formData.grades[item.key])
  }));
}

function buildTagStates(formData, readonly) {
  return STYLE_TAG_OPTIONS.map((label) => {
    const selected = formData.styleTags.includes(label);
    return {
      label,
      selected,
      disabled: readonly || (!selected && formData.styleTags.length >= 2)
    };
  });
}

function buildAttachment(file, type) {
  return createAttachmentRecord(file, type);
}

function getPageRedirectUrl(path, candidateId) {
  return `${path}?candidateId=${candidateId}`;
}

function getResolvedCandidateId(page) {
  const currentPages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const currentPage = currentPages[currentPages.length - 1] || null;

  return normalizeText(
    page._candidateId ||
    page.data.candidateId ||
    page._entryOptions?.candidateId ||
    page._entryOptions?.id ||
    currentPage?.options?.candidateId ||
    currentPage?.options?.id ||
    page.data.candidate?._id ||
    page.data.candidate?.candidateId
  );
}

function formatCandidateDisplayId(candidateId, maxLength = 32) {
  const normalized = normalizeText(candidateId, 100);
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized;
}

function refreshView(page, options = {}) {
  const formData = normalizeFormData(options.formData || page.data.formData);
  const sharedMaterials = hydrateSharedMaterials(
    options.sharedMaterials !== undefined ? options.sharedMaterials : page.data.sharedMaterials
  );
  const evaluationStatus = options.evaluationStatus || page.data.evaluationStatus;
  const readonly = typeof options.readonly === 'boolean' ? options.readonly : page.data.readonly;
  const validation = validateEvaluationForm(formData);
  const saveState = options.saveState || page.data.saveState;
  const saveStateText = options.saveStateText !== undefined ? options.saveStateText : page.data.saveStateText;

  page.setData({
    formData,
    sharedMaterials,
    evaluationStatus,
    evaluationStatusLabel: INTERVIEW_STATUS_LABELS[evaluationStatus],
    readonly,
    dimensionStates: buildDimensionStates(formData),
    styleTagStates: buildTagStates(formData, readonly),
    canSubmit: !readonly && validation.canSubmit,
    validationSummary: validation,
    lastSavedAt: options.lastSavedAt !== undefined ? options.lastSavedAt : page.data.lastSavedAt,
    submittedAt: options.submittedAt !== undefined ? options.submittedAt : page.data.submittedAt,
    saveState,
    saveStateText
  });
}

async function saveDraft(page) {
  if (page.data.readonly) {
    return true;
  }

  const formData = normalizeFormData(page.data.formData);
  const evaluator = page._evaluator;

  if (!evaluator) {
    return false;
  }

  if (!hasContent(formData)) {
    removeDraftRecord(page.data.candidateId, page.data.pageRole, evaluator.id);
    refreshView(page, {
      formData,
      evaluationStatus: 'not_started',
      lastSavedAt: '',
      saveState: 'idle',
      saveStateText: '未开始填写'
    });
    return true;
  }

  page.setData({
    saveState: 'saving',
    saveStateText: '保存中'
  });

  try {
    await saveInterviewEvaluationDraft(buildTransportPayload(page, formData));
    const savedAt = new Date().toISOString();

    persistRecord(page.data.candidateId, page.data.pageRole, evaluator.id, 'draft', {
      candidateId: page.data.candidateId,
      role: page.data.pageRole,
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      savedAt,
      formData
    });

    refreshView(page, {
      formData,
      evaluationStatus: 'draft',
      lastSavedAt: formatTime(savedAt),
      saveState: 'saved',
      saveStateText: '已保存'
    });
    return true;
  } catch (error) {
    console.error('[面试盲评] 草稿保存失败:', error);
    persistRecord(page.data.candidateId, page.data.pageRole, evaluator.id, 'draft', {
      candidateId: page.data.candidateId,
      role: page.data.pageRole,
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      savedAt: new Date().toISOString(),
      formData
    });
    page.setData({
      saveState: 'failed',
      saveStateText: '保存失败'
    });
    return false;
  }
}

function scheduleDraftSave(page) {
  if (page.data.readonly) {
    return;
  }

  clearTimeout(page._draftTimer);
  page._draftTimer = setTimeout(() => {
    page._draftTimer = null;
    saveDraft(page);
  }, DRAFT_SAVE_DEBOUNCE);
}

async function flushDraftSave(page) {
  if (page.data.readonly) {
    return true;
  }

  clearTimeout(page._draftTimer);
  page._draftTimer = null;
  return saveDraft(page);
}

async function uploadMediaFiles(type, tempFiles, candidateId) {
  const tempPaths = tempFiles
    .map((file) => file?.tempFilePath)
    .filter(Boolean);

  if (!tempPaths.length) {
    return [];
  }

  if (type === 'image') {
    return batchUploadImages(tempPaths, candidateId);
  }

  return batchUploadVideos(tempPaths, candidateId);
}

function showValidationMessage(validation) {
  if (validation.transportError) {
    wx.showToast({
      title: validation.transportError,
      icon: 'none'
    });
    return;
  }

  if (validation.missingGrades.length) {
    wx.showToast({
      title: `请完成${validation.missingGrades[0]}评分`,
      icon: 'none'
    });
    return;
  }

  if (validation.missingRemarks.length) {
    wx.showToast({
      title: `${validation.missingRemarks[0]}需填写备注`,
      icon: 'none'
    });
    return;
  }

  if (validation.hasTemporaryAttachments) {
    wx.showToast({
      title: '图片或视频尚未上传完成，请重新选择后再提交',
      icon: 'none'
    });
    return;
  }

  wx.showToast({
    title: '风格标签需选1-2个',
    icon: 'none'
  });
}

async function loadEvaluationState(page) {
  const evaluator = page._evaluator;

  try {
    const result = await getMyInterviewEvaluationDetail({
      candidateId: page.data.candidateId,
      role: page.data.pageRole,
      operatorId: evaluator.id,
      operatorName: evaluator.name
    });
    const evaluation = result.data?.evaluation || null;
    const sharedMaterials = hydrateSharedMaterials(result.data?.sharedMaterials);

    if (!evaluation) {
      refreshView(page, {
        formData: createEmptyEvaluationForm(),
        sharedMaterials,
        evaluationStatus: 'not_started',
        readonly: false,
        lastSavedAt: '',
        submittedAt: '',
        saveState: 'idle',
        saveStateText: '未开始填写'
      });
      return;
    }

    const formData = hydrateRemoteEvaluation(evaluation);
    const savedAt = formatTime(evaluation.updatedAt || evaluation.submittedAt);
    const submittedAt = formatTime(evaluation.submittedAt);

    persistRecord(page.data.candidateId, page.data.pageRole, evaluator.id, evaluation.status, {
      candidateId: page.data.candidateId,
      role: page.data.pageRole,
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      savedAt: evaluation.updatedAt || evaluation.submittedAt,
      submittedAt: evaluation.submittedAt,
      formData
    });

    refreshView(page, {
      formData,
      sharedMaterials,
      evaluationStatus: evaluation.status || 'draft',
      readonly: evaluation.status === 'submitted',
      lastSavedAt: savedAt,
      submittedAt,
      saveState: 'saved',
      saveStateText: '已保存'
    });
  } catch (error) {
    console.warn('[面试盲评] 云端评分详情加载失败，回退本地缓存:', error);
    const localRecord = loadLocalEvaluationRecord(page.data.candidateId, page.data.pageRole, evaluator.id);

    if (!localRecord) {
      refreshView(page, {
        formData: createEmptyEvaluationForm(),
        sharedMaterials: createEmptySharedMaterials(),
        evaluationStatus: 'not_started',
        readonly: false,
        lastSavedAt: '',
        submittedAt: '',
        saveState: 'idle',
        saveStateText: '未开始填写'
      });
      return;
    }

    refreshView(page, {
      formData: localRecord.formData,
      sharedMaterials: createEmptySharedMaterials(),
      evaluationStatus: localRecord.status,
      readonly: localRecord.status === 'submitted',
      lastSavedAt: formatTime(localRecord.savedAt),
      submittedAt: formatTime(localRecord.submittedAt),
      saveState: 'saved',
      saveStateText: '本地草稿'
    });
  }
}

export function createEvaluationPage(pageConfig) {
  return {
    data: {
      pageRole: pageConfig.pageRole,
      pageTitle: pageConfig.pageTitle,
      roleTitle: pageConfig.roleTitle,
      roleSubtitle: pageConfig.roleSubtitle,
      heroStyle: pageConfig.heroStyle,
      pageClass: pageConfig.pageClass,
      candidateId: '',
      candidateDisplayId: '',
      candidate: null,
      candidateName: '',
      readonly: false,
      evaluationStatus: 'not_started',
      evaluationStatusLabel: INTERVIEW_STATUS_LABELS.not_started,
      saveState: 'idle',
      saveStateText: '未开始填写',
      lastSavedAt: '',
      submittedAt: '',
      blindReviewTip: '严格盲评，仅展示当前候选人与本人评价内容，不展示其他面试官评分与老板终裁结果。',
      gradeOptions: GRADE_OPTIONS,
      dimensionStates: buildDimensionStates(createEmptyEvaluationForm()),
      styleTagStates: buildTagStates(createEmptyEvaluationForm(), false),
      formData: createEmptyEvaluationForm(),
      sharedMaterials: createEmptySharedMaterials(),
      canSubmit: false,
      validationSummary: validateEvaluationForm(createEmptyEvaluationForm()),
      imageLimit: 6,
      videoLimit: 3
    },

    onLoad(options) {
      const candidateId = options?.candidateId || options?.id;

      if (!candidateId) {
        wx.showToast({
          title: '候选人ID缺失',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1000);
        return;
      }

      if (!requireAgentLogin({
        allowedRoles: [pageConfig.pageRole],
        redirectUrl: getPageRedirectUrl(pageConfig.pagePath, candidateId)
      })) {
        return;
      }

      this._evaluator = getCurrentInterviewer(pageConfig.pageRole);
      this._candidateId = candidateId;
      this._entryOptions = options || {};
      this.setData({
        candidateId,
        candidateDisplayId: formatCandidateDisplayId(candidateId)
      });
      this.loadPageData();
    },

    onHide() {
      flushDraftSave(this);
    },

    onUnload() {
      flushDraftSave(this);
    },

    async loadPageData() {
      try {
        const result = await getInterviewCandidateBasicInfo(this.data.candidateId);
        const candidate = result.data || null;
        const resolvedCandidateId = normalizeText(
          candidate?.candidateId ||
          candidate?._id ||
          this._candidateId ||
          this.data.candidateId
        );

        this._candidateId = resolvedCandidateId;

        this.setData({
          candidateId: resolvedCandidateId,
          candidateDisplayId: formatCandidateDisplayId(resolvedCandidateId),
          candidate,
          candidateName: candidate?.name || '候选人'
        });
      } catch (error) {
        wx.showToast({
          title: error.message || '候选人加载失败',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1000);
        return;
      }

      await loadEvaluationState(this);
    },

    onGradeTap(e) {
      if (this.data.readonly) return;

      const { dimension, grade } = e.currentTarget.dataset;
      const nextForm = normalizeFormData(this.data.formData);
      nextForm.grades[dimension] = grade;

      refreshView(this, {
        formData: nextForm,
        evaluationStatus: 'draft'
      });

      saveDraft(this);
    },

    onRemarkInput(e) {
      if (this.data.readonly) return;

      const { dimension } = e.currentTarget.dataset;
      const nextForm = normalizeFormData(this.data.formData);
      nextForm.remarks[dimension] = e.detail.value;

      refreshView(this, {
        formData: nextForm,
        evaluationStatus: 'draft'
      });

      scheduleDraftSave(this);
    },

    onToggleStyleTag(e) {
      if (this.data.readonly) return;

      const { label } = e.currentTarget.dataset;
      const nextForm = normalizeFormData(this.data.formData);
      const exists = nextForm.styleTags.includes(label);

      if (exists) {
        nextForm.styleTags = nextForm.styleTags.filter((item) => item !== label);
      } else {
        if (nextForm.styleTags.length >= 2) {
          wx.showToast({
            title: '最多选择2个标签',
            icon: 'none'
          });
          return;
        }
        nextForm.styleTags.push(label);
      }

      refreshView(this, {
        formData: nextForm,
        evaluationStatus: 'draft'
      });

      saveDraft(this);
    },

    chooseImages() {
      if (this.data.readonly) return;
      const remain = this.data.imageLimit - this.data.formData.images.length;
      if (remain <= 0) return;

      wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: async (res) => {
          const candidateId = getResolvedCandidateId(this);
          if (!candidateId) {
            wx.showToast({
              title: '缺少候选人ID',
              icon: 'none'
            });
            return;
          }

          wx.showLoading({
            title: '图片上传中...',
            mask: true
          });

          try {
            const uploadedUrls = await uploadMediaFiles('image', res.tempFiles || [], candidateId);
            const files = uploadedUrls
              .filter(Boolean)
              .map((url) => buildAttachment({ url }, 'image'));

            const nextForm = normalizeFormData(this.data.formData);
            nextForm.images = nextForm.images.concat(files).slice(0, this.data.imageLimit);

            refreshView(this, {
              formData: nextForm,
              evaluationStatus: 'draft'
            });

            await saveDraft(this);
          } catch (error) {
            wx.showToast({
              title: error.message || '图片上传失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      });
    },

    removeImage(e) {
      if (this.data.readonly) return;

      const { index } = e.currentTarget.dataset;
      const nextForm = normalizeFormData(this.data.formData);
      nextForm.images.splice(index, 1);

      refreshView(this, {
        formData: nextForm,
        evaluationStatus: hasContent(nextForm) ? 'draft' : 'not_started'
      });

      saveDraft(this);
    },

    previewImage(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.data.formData.images.map((item) => item.url)
      });
    },

    previewSharedImage(e) {
      const { url } = e.currentTarget.dataset;
      wx.previewImage({
        current: url,
        urls: this.data.sharedMaterials.images.map((item) => item.url)
      });
    },

    chooseVideos() {
      if (this.data.readonly) return;
      const remain = this.data.videoLimit - this.data.formData.videos.length;
      if (remain <= 0) return;

      wx.chooseMedia({
        count: remain,
        mediaType: ['video'],
        success: async (res) => {
          const candidateId = getResolvedCandidateId(this);
          if (!candidateId) {
            wx.showToast({
              title: '缺少候选人ID',
              icon: 'none'
            });
            return;
          }

          wx.showLoading({
            title: '视频上传中...',
            mask: true
          });

          try {
            const uploadedUrls = await uploadMediaFiles('video', res.tempFiles || [], candidateId);
            const files = uploadedUrls
              .filter(Boolean)
              .map((url) => buildAttachment({ url }, 'video'));

            const nextForm = normalizeFormData(this.data.formData);
            nextForm.videos = nextForm.videos.concat(files).slice(0, this.data.videoLimit);

            refreshView(this, {
              formData: nextForm,
              evaluationStatus: 'draft'
            });

            await saveDraft(this);
          } catch (error) {
            wx.showToast({
              title: error.message || '视频上传失败',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      });
    },

    removeVideo(e) {
      if (this.data.readonly) return;

      const { index } = e.currentTarget.dataset;
      const nextForm = normalizeFormData(this.data.formData);
      nextForm.videos.splice(index, 1);

      refreshView(this, {
        formData: nextForm,
        evaluationStatus: hasContent(nextForm) ? 'draft' : 'not_started'
      });

      saveDraft(this);
    },

    onSubmit() {
      if (this.data.readonly) return;

      flushDraftSave(this).then(() => {
        const validation = validateEvaluationForm(this.data.formData);

        if (!validation.canSubmit) {
          showValidationMessage(validation);
          return;
        }

        wx.showModal({
          title: '确认提交',
          content: '提交后将进入只读状态，确认提交当前盲评结果？',
          success: (res) => {
            if (!res.confirm) return;
            this.confirmSubmit();
          }
        });
      });
    },

    async confirmSubmit() {
      const evaluator = this._evaluator;
      const formData = normalizeFormData(this.data.formData);
      const candidateId = getResolvedCandidateId(this);

      if (!candidateId) {
        wx.showToast({
          title: '缺少候选人ID',
          icon: 'none'
        });
        return;
      }

      this.setData({
        saveState: 'saving',
        saveStateText: '保存中'
      });

      try {
        await submitInterviewEvaluation(buildTransportPayload(this, formData));

        const submittedAt = new Date().toISOString();
        persistRecord(candidateId, this.data.pageRole, evaluator.id, 'submitted', {
          candidateId,
          role: this.data.pageRole,
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          savedAt: submittedAt,
          submittedAt,
          formData
        });
        removeDraftRecord(candidateId, this.data.pageRole, evaluator.id);

        refreshView(this, {
          formData,
          evaluationStatus: 'submitted',
          readonly: true,
          submittedAt: formatTime(submittedAt),
          lastSavedAt: formatTime(submittedAt),
          saveState: 'saved',
          saveStateText: '已保存'
        });

        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
      } catch (error) {
        console.error('[面试盲评] 提交失败:', error);
        this.setData({
          saveState: 'failed',
          saveStateText: '保存失败'
        });
        wx.showToast({
          title: error.message || '提交失败',
          icon: 'none'
        });
      }
    }
  };
}
