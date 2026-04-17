import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import { role, roleConfig, loadPhotographerWorkbench } from '../../../utils/photographer-workbench.js';

Page({
  data: {
    roleConfig,
    loading: false,
    taskOverview: {
      total: 0,
      todayCount: 0,
      urgentCount: 0,
      deliveryCount: 0
    },
    radarTaskGroups: []
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
        taskOverview: workspace.taskOverview || this.data.taskOverview,
        radarTaskGroups: workspace.radarTaskGroups || []
      });
    } catch (error) {
      console.error('[拍摄任务雷达] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  goToDetail(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  }
});
