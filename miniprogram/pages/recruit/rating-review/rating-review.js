import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import {
  getCandidateEvaluationSummary,
  submitFounderDecision
} from '../../../utils/interview-api.js';
import { normalizeCandidateImageSrc } from '../../../utils/interviewer.js';

const DIMENSION_ORDER = ['appearance', 'talent', 'teaching', 'selfIntro', 'qa'];
const DIMENSION_LABELS = {
  appearance: '外型条件',
  talent: '才艺展示',
  teaching: '现场教学',
  selfIntro: '自我介绍',
  qa: '基础问答'
};
const GRADE_WEIGHT = {
  S: 4,
  A: 3,
  B: 2,
  C: 1
};
const DECISION_META = {
  accepted: {
    label: '正式录取',
    description: '进入签约流程',
    theme: 'hire'
  },
  pending: {
    label: '待定区',
    description: '保留观察位',
    theme: 'hold'
  },
  rejected: {
    label: '直接淘汰',
    description: '结束当前流程',
    theme: 'reject'
  }
};

function buildDecisionOptions(selectedDecision) {
  return Object.keys(DECISION_META).map((key) => ({
    value: key,
    label: DECISION_META[key].label,
    description: DECISION_META[key].description,
    theme: DECISION_META[key].theme,
    active: selectedDecision === key
  }));
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildOverallGrade(dimensions = {}) {
  const grades = DIMENSION_ORDER
    .map((key) => dimensions[key])
    .filter(Boolean);

  if (!grades.length) {
    return '-';
  }

  const score = grades.reduce((sum, grade) => sum + (GRADE_WEIGHT[grade] || 0), 0) / grades.length;
  if (score >= 3.5) return 'S';
  if (score >= 2.5) return 'A';
  if (score >= 1.5) return 'B';
  return 'C';
}

function aggregateStyleTags(evaluations = []) {
  const counter = new Map();

  evaluations.forEach((item) => {
    (item.styleTags || []).forEach((tag) => {
      counter.set(tag, (counter.get(tag) || 0) + 1);
    });
  });

  return Array.from(counter.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function aggregateAttachments(evaluations = []) {
  const photoMap = new Map();
  const videoMap = new Map();

  evaluations.forEach((item) => {
    const interviewerName = item.interviewerName || item.interviewerRoleLabel || '面试官';
    (item.attachments?.images || []).forEach((url) => {
      if (url && !photoMap.has(url)) {
        photoMap.set(url, {
          url,
          name: `才艺展示图片 · ${interviewerName}`
        });
      }
    });

    const videoSources = [
      ...(item.attachments?.videos || []),
      ...(item.attachments?.videoLinks || [])
    ];

    videoSources.forEach((url) => {
      if (url && !videoMap.has(url)) {
        videoMap.set(url, {
          url,
          name: `才艺展示视频 · ${interviewerName}`,
          type: '才艺展示'
        });
      }
    });
  });

  return {
    photos: Array.from(photoMap.values()),
    videos: Array.from(videoMap.values())
  };
}

function normalizeSharedMaterials(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    uploadedBy: String(source.uploadedBy || source.uploadedByName || ''),
    uploadedAt: formatDateTime(source.uploadedAt || ''),
    images: Array.isArray(source.images)
      ? source.images.map((item) => typeof item === 'string' ? { url: item } : item).filter((item) => item?.url)
      : [],
    videos: Array.isArray(source.videos)
      ? source.videos.map((item) => typeof item === 'string' ? { url: item } : item).filter((item) => item?.url)
      : []
  };
}

function buildProgress(progress = {}) {
  const total = progress.totalAssigned || 0;
  const submitted = progress.submittedCount || 0;
  const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const reviewers = (progress.assignedInterviewers || []).map((item) => ({
    key: `${item.interviewerRole}-${item.interviewerId}`,
    name: `${item.interviewerName || item.interviewerRoleLabel} / ${item.interviewerRoleLabel}`,
    completed: item.status === 'submitted'
  }));

  return {
    text: `${submitted} 人已评 / ${Math.max(total - submitted, 0)} 人未评`,
    percent,
    reviewers,
    workflowStatus: progress.workflowStatus || ''
  };
}

function buildInterviewerMatrix(evaluations = []) {
  return evaluations
    .filter((item) => item.status === 'submitted')
    .map((item) => ({
      role: item.interviewerRole,
      roleName: item.interviewerRoleLabel || item.interviewerRole,
      interviewerName: item.interviewerName || item.interviewerRoleLabel || '面试官',
      evaluatedAt: formatDateTime(item.submittedAt || item.updatedAt),
      dimensions: DIMENSION_ORDER.map((key) => ({
        key,
        label: DIMENSION_LABELS[key],
        grade: item.dimensions?.[key] || '-',
        remark: item.dimensionRemarks?.[key] || ''
      })),
      overallGrade: buildOverallGrade(item.dimensions),
      styleTags: item.styleTags || []
    }));
}

function buildDimensionDistribution(matrix = [], severeConflicts = []) {
  const conflictSet = new Set((severeConflicts || []).map((item) => item.dimension));

  return matrix.map((item) => ({
    key: item.dimension,
    name: item.dimensionLabel || DIMENSION_LABELS[item.dimension] || item.dimension,
    distribution: item.distribution || { S: 0, A: 0, B: 0, C: 0 },
    severeDivergence: conflictSet.has(item.dimension)
  }));
}

async function hydrateSummaryAvatar(summary) {
  const avatar = summary?.candidate?.avatar || '';
  if (!avatar || !String(avatar).startsWith('cloud://')) {
    return summary;
  }

  const applyAvatar = (url) => ({
    ...summary,
    candidate: {
      ...summary.candidate,
      avatar: url || ''
    }
  });

  const getTempUrlByAdminApi = async () => {
    const res = await wx.cloud.callFunction({
      name: 'admin-api',
      data: {
        apiPath: '/cloudfile',
        apiBody: {
          fileIds: [avatar]
        }
      }
    });
    const body = res?.result?.body
      ? JSON.parse(res.result.body)
      : (res?.result || {});
    const file = Array.isArray(body?.file_list) ? body.file_list[0] : null;
    return applyAvatar(file?.download_url || '');
  };

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [avatar]
    });
    const file = Array.isArray(res?.fileList) ? res.fileList[0] : null;
    if (String(file?.errMsg || '').includes('STORAGE_EXCEED_AUTHORITY')) {
      return await getTempUrlByAdminApi();
    }
    return applyAvatar(file?.tempFileURL || '');
  } catch (error) {
    try {
      return await getTempUrlByAdminApi();
    } catch (fallbackError) {
      console.warn('[rating-review] 获取头像临时链接失败:', fallbackError || error);
      return applyAvatar('');
    }
  }
}

function normalizeSummaryPayload(raw = {}) {
  const evaluations = raw.evaluations || [];
  const candidate = raw.candidate || {};
  const adminEvaluation = evaluations.find((item) => item.interviewerRole === 'admin') || null;
  const finalDecision = raw.finalDecision?.decision ? {
    decision: raw.finalDecision.decision,
    decisionLabel: DECISION_META[raw.finalDecision.decision]?.label || raw.finalDecision.decision,
    note: raw.finalDecision.comment || '',
    decisionMakerName: raw.finalDecision.decidedBy?.name || '创始人',
    decidedAt: formatDateTime(raw.finalDecision.decidedAt)
  } : null;

  return {
    candidate: {
      ...candidate,
      avatar: normalizeCandidateImageSrc(candidate.avatar),
      displayInitial: String(candidate.name || '候').charAt(0)
    },
    progress: buildProgress(raw.progress),
    dimensions: DIMENSION_ORDER.map((key) => ({
      key,
      name: DIMENSION_LABELS[key]
    })),
    interviewerMatrix: buildInterviewerMatrix(evaluations),
    dimensionDistribution: buildDimensionDistribution(raw.matrix || [], raw.severeConflicts || []),
    styleTags: aggregateStyleTags(evaluations),
    attachments: aggregateAttachments(evaluations),
    sharedMaterials: normalizeSharedMaterials(raw.sharedMaterials || {}),
    adminEvaluation: adminEvaluation ? {
      status: adminEvaluation.status || '',
      statusLabel: adminEvaluation.status === 'submitted' ? '已提交完整评价' : '草稿中'
    } : null,
    severeConflicts: raw.severeConflicts || [],
    founderDecision: finalDecision,
    workflowStatus: raw.progress?.workflowStatus || '',
    decisionLocked: finalDecision?.decision === 'rejected',
    rejectionReason: finalDecision?.decision === 'rejected'
      ? (finalDecision.note || '')
      : ''
  };
}

Page({
  data: {
    candidateId: '',
    pageRole: 'admin',
    summary: null,
    selectedDecision: '',
    decisionNote: '',
    decisionOptions: buildDecisionOptions(''),
    submitting: false,
    loading: true
  },

  onLoad(options) {
    const candidateId = options?.candidateId || options?.id || '';
    const role = options?.role || 'admin';

    if (!candidateId) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    if (!requireAgentLogin({
      allowedRoles: ['admin', 'founder'],
      redirectUrl: `/pages/recruit/rating-review/rating-review?candidateId=${candidateId}&role=${role}`
    })) {
      return;
    }

    const agentInfo = getAgentInfo() || {};
    const pageRole = agentInfo.role || role || 'admin';
    wx.setNavigationBarTitle({
      title: pageRole === 'admin' ? '管理员面试面板' : '创始人汇总决策'
    });

    this.setData({ candidateId, pageRole });
    this.loadSummary();
  },

  onShow() {
    if (this.data.candidateId) {
      this.loadSummary();
    }
  },

  async loadSummary() {
    const operator = getAgentInfo() || wx.getStorageSync('user_info') || {};
    this.setData({ loading: true });

    try {
      const result = await getCandidateEvaluationSummary({
        candidateId: this.data.candidateId,
        operatorId: operator._id || operator.id || operator.username || operator.name || '',
        operatorRole: operator.role || '',
        operatorName: operator.name || operator.profile?.name || operator.username || ''
      });
      const summary = await hydrateSummaryAvatar(normalizeSummaryPayload(result.data || {}));
      const selectedDecision = summary.founderDecision?.decision || '';
      const decisionNote = summary.founderDecision?.note || '';

      this.setData({
        summary,
        selectedDecision,
        decisionNote,
        decisionOptions: buildDecisionOptions(selectedDecision),
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '汇总加载失败',
        icon: 'none'
      });
    }
  },

  onSelectDecision(e) {
    const { decision } = e.currentTarget.dataset;

    this.setData({
      selectedDecision: decision,
      decisionOptions: buildDecisionOptions(decision)
    });
  },

  onNoteInput(e) {
    this.setData({
      decisionNote: e.detail.value
    });
  },

  previewPhoto(e) {
    const { url, source } = e.currentTarget.dataset;
    const photoUrls = source === 'shared'
      ? (this.data.summary?.sharedMaterials?.images?.map((item) => item.url) || [])
      : (this.data.summary?.attachments?.photos?.map((item) => item.url) || []);

    if (!url || !photoUrls.length) {
      return;
    }

    wx.previewImage({
      current: url,
      urls: photoUrls
    });
  },

  previewVideo(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) {
      return;
    }

    wx.previewMedia({
      sources: [{ url, type: 'video' }]
    });
  },

  handleAvatarError() {
    if (!this.data.summary?.candidate) {
      return;
    }

    this.setData({
      'summary.candidate.avatar': ''
    });
  },

  goToAdminEvaluation() {
    if (this.data.summary?.decisionLocked) {
      wx.showToast({
        title: '候选人未通过，评分入口已关闭',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/recruit/admin-evaluation/admin-evaluation?candidateId=${this.data.candidateId}`
    });
  },

  onSubmitDecision() {
    const {
      selectedDecision,
      submitting
    } = this.data;

    if (submitting) {
      return;
    }

    if (!selectedDecision) {
      wx.showToast({
        title: '请选择终裁结果',
        icon: 'none'
      });
      return;
    }

    if (this.data.summary?.decisionLocked) {
      wx.showToast({
        title: '候选人未通过，终裁入口已关闭',
        icon: 'none'
      });
      return;
    }

    if (selectedDecision === 'rejected' && !String(this.data.decisionNote || '').trim()) {
      wx.showToast({
        title: '请填写未通过原因',
        icon: 'none'
      });
      return;
    }

    const selectedOption = this.data.decisionOptions.find((item) => item.value === selectedDecision);

    wx.showModal({
      title: '确认终裁',
      content: selectedOption?.label || '确认提交',
      confirmText: '确认提交',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        this.submitDecision();
      }
    });
  },

  async submitDecision() {
    const operator = getAgentInfo() || wx.getStorageSync('user_info') || {};

    this.setData({ submitting: true });

    try {
      await submitFounderDecision({
        candidateId: this.data.candidateId,
        finalDecision: this.data.selectedDecision,
        comment: this.data.decisionNote.trim(),
        operatorId: operator._id || operator.id || operator.username || operator.name || '',
        operatorRole: operator.role || '',
        operatorName: operator.name || operator.profile?.name || operator.username || ''
      });

      wx.showToast({
        title: '终裁已保存',
        icon: 'success'
      });

      this.setData({ submitting: false });
      this.loadSummary();
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({
        title: error.message || '终裁保存失败',
        icon: 'none'
      });
    }
  }
});
