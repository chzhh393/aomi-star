import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import { role, roleConfig, loadPhotographerWorkbench } from '../../../utils/photographer-workbench.js';

Page({
  data: {
    roleConfig,
    loading: false,
    assetCategoryGroups: []
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
        assetCategoryGroups: workspace.assetCategoryGroups || []
      });
    } catch (error) {
      console.error('[视觉资产管理] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  copyDownloadLink(e) {
    const { link } = e.currentTarget.dataset;
    if (!link) {
      return;
    }

    wx.setClipboardData({
      data: link
    });
  },

  previewAssetGroup(e) {
    const { name, anchorId, summary, originalCount, refinedCount, ownerText } = e.currentTarget.dataset;
    wx.showModal({
      title: `${name} · ${anchorId}`,
      content: `${summary}\n原片 ${originalCount} 份，精修 ${refinedCount} 份。\n${ownerText}`,
      showCancel: false
    });
  }
});
