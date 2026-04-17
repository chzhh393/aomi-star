import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import { role, roleConfig, loadPhotographerWorkbench } from '../../../utils/photographer-workbench.js';

Page({
  data: {
    roleConfig,
    loading: false,
    libraryStats: {
      templateCount: 0,
      moveCount: 0,
      syncedCount: 0
    },
    standardLibrary: []
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: [role],
      redirectUrl: roleConfig.workspacePath
    })) {
      return;
    }

    this.loadPageData();
  },

  async onPullDownRefresh() {
    await this.loadPageData();
    wx.stopPullDownRefresh();
  },

  async loadPageData() {
    this.setData({ loading: true });

    try {
      const workspace = await loadPhotographerWorkbench(getAgentInfo() || {});
      this.setData({
        loading: false,
        libraryStats: workspace.libraryStats || this.data.libraryStats,
        standardLibrary: workspace.standardLibrary || []
      });
    } catch (error) {
      console.error('[运镜标准库] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  showLibraryAdvice(e) {
    const { scene, rhythm, moves, trackName } = e.currentTarget.dataset;
    wx.showModal({
      title: trackName,
      content: `${scene}\n${rhythm}\n运镜：${moves}`,
      showCancel: false
    });
  }
});
