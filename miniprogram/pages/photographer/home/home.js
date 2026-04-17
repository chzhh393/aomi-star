import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import { hydrateCandidateAvatarList } from '../../../utils/interviewer.js';
import {
  role,
  roleConfig,
  loadPhotographerWorkbench,
  mapCandidateCard
} from '../../../utils/photographer-workbench.js';

Page({
  data: {
    role,
    roleConfig,
    agentInfo: null,
    loading: false,
    currentTab: 'pending',
    pendingCount: 0,
    reviewedCount: 0,
    pendingCandidates: [],
    reviewedCandidates: [],
    candidateList: [],
    taskOverview: {
      total: 0,
      todayCount: 0,
      urgentCount: 0,
      deliveryCount: 0
    },
    photographerCards: []
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: [role],
      redirectUrl: roleConfig.workspacePath
    })) {
      return;
    }

    this.setData({
      agentInfo: getAgentInfo()
    });

    this.loadPageData();
  },

  onShow() {
    const agentInfo = getAgentInfo();
    if (agentInfo && agentInfo.role === role) {
      this.setData({ agentInfo });
      this.loadPageData();
    }
  },

  async onPullDownRefresh() {
    await this.loadPageData();
    wx.stopPullDownRefresh();
  },

  async loadPageData() {
    this.setData({ loading: true });

    try {
      const workspace = await loadPhotographerWorkbench(getAgentInfo() || {});
      this.applyWorkspaceData(workspace);
    } catch (error) {
      console.error('[摄影/剪辑工作台] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  applyWorkspaceData(workspace = {}) {
    const pendingCandidates = workspace.pendingCandidates || [];
    const reviewedCandidates = workspace.reviewedCandidates || [];
    const currentTab = this.data.currentTab;

    Promise.all([
      hydrateCandidateAvatarList(pendingCandidates),
      hydrateCandidateAvatarList(reviewedCandidates)
    ]).then(([hydratedPendingCandidates, hydratedReviewedCandidates]) => {
      this.setData({
        loading: false,
        pendingCount: workspace.pendingCount || 0,
        reviewedCount: workspace.reviewedCount || 0,
        pendingCandidates: hydratedPendingCandidates,
        reviewedCandidates: hydratedReviewedCandidates,
        taskOverview: workspace.taskOverview || this.data.taskOverview,
        photographerCards: workspace.photographerCards || [],
        candidateList: (currentTab === 'reviewed' ? hydratedReviewedCandidates : hydratedPendingCandidates).map(mapCandidateCard)
      });
    }).catch((error) => {
      console.error('[摄影/剪辑工作台] 头像解析失败:', error);
      this.setData({
        loading: false,
        pendingCount: workspace.pendingCount || 0,
        reviewedCount: workspace.reviewedCount || 0,
        pendingCandidates,
        reviewedCandidates,
        taskOverview: workspace.taskOverview || this.data.taskOverview,
        photographerCards: workspace.photographerCards || [],
        candidateList: (currentTab === 'reviewed' ? reviewedCandidates : pendingCandidates).map(mapCandidateCard)
      });
    });
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    if (!tab || tab === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: tab,
      candidateList: (tab === 'reviewed' ? this.data.reviewedCandidates : this.data.pendingCandidates).map(mapCandidateCard)
    });
  },

  goToDetail(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  },

  handleShortcut(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  }
});
