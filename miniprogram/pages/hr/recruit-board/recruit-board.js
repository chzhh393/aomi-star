import {
  buildRecruitBoardStats,
  getCandidatePrimaryTalent,
  RECRUIT_BUCKETS
} from '../../../utils/hr-dashboard.js';
import { getHRCandidateList } from '../../../utils/hr-api.js';
import {
  getCandidateAvatar,
  getCandidateDisplayName,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

function getActionConfig(bucketKey) {
  if (bucketKey === 'pending_screen') {
    return { label: '去初筛', action: 'review' };
  }
  if (bucketKey === 'pending_invite') {
    return { label: '安排邀约', action: 'invite' };
  }
  if (bucketKey === 'interview_scheduled') {
    return { label: '查看进度', action: 'detail' };
  }
  return { label: '签约录入', action: 'contract' };
}

Page({
  data: {
    activeBucket: 'pending_screen',
    bucketCards: [],
    sourceCards: [],
    candidates: []
  },

  onLoad(options = {}) {
    if (options.bucket && RECRUIT_BUCKETS[options.bucket]) {
      this.setData({ activeBucket: options.bucket });
    }
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const hydratedCandidates = await hydrateCandidateAvatarList(await getHRCandidateList({ page: 1, pageSize: 100 }));
      const stats = buildRecruitBoardStats(hydratedCandidates);
      const bucketKey = this.data.activeBucket;
      const actionConfig = getActionConfig(bucketKey);
      const candidates = (stats.buckets[bucketKey] || []).map((candidate) => ({
        ...candidate,
        recordId: candidate._id || candidate.id,
        displayName: getCandidateDisplayName(candidate),
        displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
        avatar: candidate?.avatar || getCandidateAvatar(candidate),
        primaryTalent: getCandidatePrimaryTalent(candidate),
        primaryActionLabel: actionConfig.label,
        primaryAction: actionConfig.action
      }));

      this.setData({
        bucketCards: stats.cards,
        sourceCards: stats.sources,
        candidates
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  switchBucket(e) {
    const { bucket } = e.currentTarget.dataset;
    if (!bucket || bucket === this.data.activeBucket) {
      return;
    }

    this.setData({ activeBucket: bucket }, () => {
      this.loadData();
    });
  },

  openCandidate(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.candidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    wx.showModal({
      title: candidate.basicInfo?.name || '候选人',
      content: `来源：${candidate.source || '未知来源'}\n城市：${candidate.basicInfo?.city || '待补充'}\n才艺：${candidate.primaryTalent}\nAI分：${candidate.aiScore?.overallScore || '--'}`,
      showCancel: false
    });
  },

  handlePrimaryAction(e) {
    const { id, action } = e.currentTarget.dataset;
    if (action === 'review') {
      wx.navigateTo({ url: `/pages/hr/interview-digital/interview-digital?candidateId=${id}` });
      return;
    }

    if (action === 'invite') {
      wx.navigateTo({ url: `/pages/hr/interview-digital/interview-digital?candidateId=${id}` });
      return;
    }

    if (action === 'contract') {
      wx.navigateTo({ url: `/pages/hr/onboarding-archive/onboarding-archive?candidateId=${id}` });
      return;
    }

    this.openCandidate({ currentTarget: { dataset: { id } } });
  }
});
