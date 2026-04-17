import { loadAnchorWorkbench } from '../../../utils/anchor-workbench.js';

Page({
  data: {
    loading: false,
    selectedPlaybackRate: 0.5,
    playbackRateOptions: [],
    demoVideos: []
  },

  onLoad() {
    this.loadPageData();
  },

  async onPullDownRefresh() {
    await this.loadPageData();
    wx.stopPullDownRefresh();
  },

  async loadPageData() {
    this.setData({ loading: true });
    try {
      const workspace = await loadAnchorWorkbench();
      this.setData({
        loading: false,
        playbackRateOptions: workspace.playbackRateOptions,
        demoVideos: workspace.demoVideos
      });
    } catch (error) {
      console.error('[anchor-learning-center] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  switchPlaybackRate(e) {
    const value = Number(e.currentTarget.dataset.value);
    if (!value) {
      return;
    }

    this.setData({
      selectedPlaybackRate: value
    });
  }
});
