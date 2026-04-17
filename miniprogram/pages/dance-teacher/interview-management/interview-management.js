import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import {
  getCompletedInterviewCandidates,
  getPendingInterviewCandidates
} from '../../../utils/interview-api.js';
import {
  getCandidateAssignedAgent,
  getCandidateDisplayName,
  getCandidateLiveName,
  getDetailPath,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

function mapCandidate(candidate) {
  const candidateId = candidate._id || candidate.candidateId;
  const displayName = getCandidateDisplayName(candidate);
  const liveName = getCandidateLiveName(candidate);
  const assignedAgent = getCandidateAssignedAgent(candidate);

  return {
    _id: candidateId,
    avatar: candidate?.avatar || '',
    name: displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?',
    liveName,
    assignedAgentName: assignedAgent?.name || '',
    assignedAgentPhone: assignedAgent?.phone || '',
    detailPath: getDetailPath(candidateId, 'dance_teacher')
  };
}

Page({
  data: {
    loading: false,
    currentTab: 'pending',
    pendingCount: 0,
    reviewedCount: 0,
    candidateList: []
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: ['dance_teacher'],
      redirectUrl: '/pages/dance-teacher/interview-management/interview-management'
    })) {
      return;
    }

    this.loadPageData();
  },

  onShow() {
    const agentInfo = getAgentInfo();
    if (agentInfo && agentInfo.role === 'dance_teacher') {
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
      this.loadCandidates(this.data.currentTab)
    ]);
  },

  async loadStats() {
    try {
      const agentInfo = getAgentInfo() || {};
      const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
      const [pendingResult, reviewedResult] = await Promise.all([
        getPendingInterviewCandidates({ role: 'dance_teacher', operatorId, page: 1, pageSize: 1 }),
        getCompletedInterviewCandidates({ role: 'dance_teacher', operatorId, page: 1, pageSize: 1 })
      ]);

      this.setData({
        pendingCount: pendingResult.data?.total || 0,
        reviewedCount: reviewedResult.data?.total || 0
      });
    } catch (error) {
      console.error('[舞蹈老师面试管理] 加载统计失败:', error);
    }
  },

  async loadCandidates(tab) {
    this.setData({ loading: true });

    try {
      const agentInfo = getAgentInfo() || {};
      const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
      const requestFn = tab === 'pending' ? getPendingInterviewCandidates : getCompletedInterviewCandidates;
      const result = await requestFn({
        role: 'dance_teacher',
        operatorId,
        page: 1,
        pageSize: 50
      });

      const hydratedCandidateList = await hydrateCandidateAvatarList(result.data?.list || []);

      this.setData({
        currentTab: tab,
        candidateList: hydratedCandidateList.map(mapCandidate),
        loading: false
      });
    } catch (error) {
      console.error('[舞蹈老师面试管理] 加载列表失败:', error);
      this.setData({
        candidateList: [],
        loading: false
      });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    if (!tab || tab === this.data.currentTab) {
      return;
    }

    this.loadCandidates(tab);
  },

  goToDetail(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  }
});
