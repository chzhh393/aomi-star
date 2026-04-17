import { requireAgentLogin } from '../../../utils/agent-auth.js';
import {
  getInterviewCandidateBasicInfo,
  getMyInterviewEvaluationDetail,
  getTrainingCampRecords,
  reviewTrainingCampRecord
} from '../../../utils/interview-api.js';
import {
  formatTime,
  getCurrentInterviewer,
  getLocalEvaluationSummary
} from '../evaluation-shared.js';
import {
  getCandidateAvatar,
  getCandidateDisplayName,
  hydrateSingleCandidateAvatar,
  getInterviewerRoleConfig,
  isInterviewerRole
} from '../../../utils/interviewer.js';

function formatDanceCourseBooking(booking = {}) {
  if (!booking || !booking.slotId) {
    return null;
  }

  return {
    ...booking,
    summaryText: `${booking.courseDate || '-'} ${booking.startTime || ''}-${booking.endTime || ''}`.trim(),
    locationText: booking.location || '待补充上课地点'
  };
}

function formatTrainingRecord(record = {}) {
  const locationSnapshot = record.locationSnapshot || {};
  return {
    ...record,
    statusLabel: record.status === 'approved'
      ? '已通过'
      : record.status === 'rejected'
        ? '已驳回'
        : '待复核',
    recordTypeLabel: record.recordType === 'exit_note' ? '离场心得' : '入场签到',
    checkedAtText: locationSnapshot.checkedAt ? formatTime(locationSnapshot.checkedAt) : '',
    locationText: locationSnapshot.baseName && locationSnapshot.distanceMeters >= 0
      ? `${locationSnapshot.baseName} · ${locationSnapshot.distanceMeters}米`
      : '',
    photos: Array.isArray(record.photos) ? record.photos : [],
    supportComment: String(record.supportComment || ''),
    coachingComment: String(record.coachingComment || ''),
    reviewComment: String(record.reviewComment || '')
  };
}

Page({
  data: {
    candidateId: '',
    role: '',
    roleConfig: null,
    candidate: null,
    candidateName: '',
    candidateInitial: '',
    candidateAvatar: '',
    loading: true,
    entryStatus: 'not_started',
    entryStatusLabel: '未开始',
    entryActionText: '开始评分',
    entryTimeText: '',
    trainingCamp: null,
    trainingRecords: [],
    danceCourseBooking: null,
    reviewDrafts: {}
  },

  onLoad(options) {
    const candidateId = options?.id;
    const role = options?.role;

    if (!candidateId || !isInterviewerRole(role)) {
      wx.showToast({
        title: '参数缺失',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    if (!requireAgentLogin({
      allowedRoles: [role],
      redirectUrl: `/pages/interviewer/detail/detail?id=${candidateId}&role=${role}`
    })) {
      return;
    }

    this.setData({
      candidateId,
      role,
      roleConfig: getInterviewerRoleConfig(role)
    });

    this.refreshEntryStatus();
    this.loadCandidate();
  },

  onShow() {
    if (this.data.candidateId && this.data.role) {
      this.refreshEntryStatus();
    }
  },

  async loadCandidate() {
    this.setData({ loading: true });

    try {
      const result = await getInterviewCandidateBasicInfo(this.data.candidateId);
      const candidate = await hydrateSingleCandidateAvatar(result.data || null);

      let trainingCamp = null;
      let trainingRecords = [];
      let danceCourseBooking = null;
      if (this.data.role === 'dance_teacher') {
        try {
          const trainingResult = await getTrainingCampRecords(this.data.candidateId);
          trainingCamp = trainingResult.data?.trainingCamp || null;
          trainingRecords = Array.isArray(trainingCamp?.dailyRecords)
            ? trainingCamp.dailyRecords.map((item) => formatTrainingRecord(item))
            : [];
          danceCourseBooking = formatDanceCourseBooking(trainingCamp?.danceCourseBooking);
        } catch (error) {
          console.warn('[面试详情] 加载训练记录失败:', error);
        }
      }

      this.setData({
        candidate,
        candidateName: getCandidateDisplayName(candidate),
        candidateInitial: getCandidateDisplayName(candidate).slice(0, 1),
        candidateAvatar: getCandidateAvatar(candidate),
        trainingCamp,
        trainingRecords,
        reviewDrafts: this.buildReviewDrafts(trainingRecords),
        danceCourseBooking,
        loading: false
      });
    } catch (error) {
      console.error('[面试详情] 加载候选人失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  async refreshEntryStatus() {
    const interviewer = getCurrentInterviewer(this.data.role);

    try {
      const result = await getMyInterviewEvaluationDetail({
        candidateId: this.data.candidateId,
        role: this.data.role,
        operatorId: interviewer.id,
        operatorName: interviewer.name
      });
      const evaluation = result.data?.evaluation || null;

      if (!evaluation) {
        this.setData({
          entryStatus: 'not_started',
          entryStatusLabel: '未开始',
          entryActionText: '开始评分',
          entryTimeText: ''
        });
        return;
      }

      const status = evaluation.status || 'draft';
      this.setData({
        entryStatus: status,
        entryStatusLabel: status === 'submitted' ? '已提交' : '草稿中',
        entryActionText: status === 'submitted' ? '查看已提交内容' : '继续评分',
        entryTimeText: formatTime(evaluation.submittedAt || evaluation.updatedAt || '')
      });
    } catch (error) {
      const summary = getLocalEvaluationSummary(
        this.data.candidateId,
        this.data.role,
        interviewer.id
      );

      this.setData({
        entryStatus: summary.status,
        entryStatusLabel: summary.statusLabel,
        entryActionText: summary.actionText,
        entryTimeText: summary.timeText
      });
    }
  },

  goToActionPage() {
    const { roleConfig, candidateId } = this.data;
    if (!roleConfig || !roleConfig.actionPath) {
      return;
    }

    wx.navigateTo({
      url: roleConfig.actionPath(candidateId)
    });
  },

  buildReviewDrafts(records = []) {
    return records.reduce((drafts, record) => {
      drafts[record.recordId] = {
        supportComment: record.supportComment || '',
        coachingComment: record.coachingComment || '',
        reviewComment: record.reviewComment || ''
      };
      return drafts;
    }, {});
  },

  bindReviewInput(e) {
    const { recordId, field } = e.currentTarget.dataset;
    if (!recordId || !field) {
      return;
    }

    this.setData({
      [`reviewDrafts.${recordId}.${field}`]: e.detail.value
    });
  },

  previewTrainingPhoto(e) {
    const { url, urls } = e.currentTarget.dataset;
    if (!url || !Array.isArray(urls) || !urls.length) {
      return;
    }

    wx.previewImage({
      current: url,
      urls
    });
  },

  async reviewTrainingRecord(e) {
    const { recordId, status } = e.currentTarget.dataset;
    if (!recordId || !status) {
      return;
    }
    const reviewDraft = this.data.reviewDrafts[recordId] || {};
    const reviewComment = String(reviewDraft.reviewComment || '').trim();
    const supportComment = String(reviewDraft.supportComment || '').trim();
    const coachingComment = String(reviewDraft.coachingComment || '').trim();

    if (status === 'rejected' && !reviewComment) {
      wx.showToast({
        title: '请填写驳回原因',
        icon: 'none'
      });
      return;
    }

    try {
      await reviewTrainingCampRecord({
        candidateId: this.data.candidateId,
        recordId,
        reviewStatus: status,
        reviewComment,
        supportComment,
        coachingComment
      });

      wx.showToast({
        title: '复核成功',
        icon: 'success'
      });

      await this.loadCandidate();
    } catch (error) {
      wx.showToast({
        title: error.message || '复核失败',
        icon: 'none'
      });
    }
  }
});
