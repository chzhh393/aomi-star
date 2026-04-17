import { loadAnchorWorkbench } from '../../../utils/anchor-workbench.js';

Page({
  data: {
    candidate: null,
    loading: true,
    heroTitle: '主播工作台',
    heroDesc: '',
    anchorCards: [],
    masteredCount: 0,
    agentSummary: null
  },

  onLoad() {
    this.loadWorkspace();
  },

  onShow() {
    this.loadWorkspace();
  },

  async loadWorkspace() {
    this.setData({ loading: true });

    try {
      const workspace = await loadAnchorWorkbench();
      this.setData({
        candidate: workspace.candidate,
        loading: false,
        heroTitle: workspace.heroTitle,
        heroDesc: workspace.heroDesc,
        anchorCards: workspace.anchorCards,
        masteredCount: workspace.masteredCount,
        agentSummary: workspace.agentSummary
      });
    } catch (error) {
      console.error('[anchor-home] 加载失败:', error);

      if (error.code === 'ANCHOR_STAGE_BLOCKED' && error.candidate) {
        wx.showModal({
          title: '暂未开通主播中台',
          content: '当前阶段请先在报名状态页完成入营、培训或签署流程。',
          showCancel: false,
          success: () => {
            wx.reLaunch({
              url: `/pages/recruit/status/status?id=${error.candidate.candidateNo || error.candidate._id}`
            });
          }
        });
      }

      this.setData({ loading: false });
      if (error.code !== 'ANCHOR_STAGE_BLOCKED') {
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      }
    }
  },

  goToCard(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  },

  goToStatusPage() {
    const id = this.data.candidate?.candidateNo || this.data.candidate?._id || '';
    wx.navigateTo({
      url: `/pages/recruit/status/status?id=${id}`
    });
  },

  contactAgent() {
    const { agentSummary } = this.data;
    wx.showModal({
      title: '经纪人信息',
      content: `经纪人：${agentSummary?.name || '-'}\n电话：${agentSummary?.phone || '-'}`,
      showCancel: false
    });
  }
});
