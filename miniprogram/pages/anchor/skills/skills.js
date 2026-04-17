import { loadAnchorWorkbench } from '../../../utils/anchor-workbench.js';

Page({
  data: {
    loading: false,
    heroTitle: '我的技能树',
    masteredCount: 0,
    skillTree: []
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
        heroTitle: `${workspace.heroTitle} · 技能树`,
        masteredCount: workspace.masteredCount,
        skillTree: workspace.skillTree
      });
    } catch (error) {
      console.error('[anchor-skill-tree] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  }
});
