import { loadAnchorWorkbench } from '../../../utils/anchor-workbench.js';

Page({
  data: {
    loading: false,
    dailyTasks: [],
    refinedPhotos: []
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
        dailyTasks: workspace.dailyTasks,
        refinedPhotos: workspace.refinedPhotos
      });
    } catch (error) {
      console.error('[anchor-task-review] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  previewRefinedPhoto(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.refinedPhotos || [];
    if (!url || !urls.length) {
      return;
    }

    wx.previewImage({
      current: url,
      urls
    });
  },

  goToTrainingRecords() {
    wx.navigateTo({
      url: '/pages/recruit/training-daily/training-daily'
    });
  }
});
