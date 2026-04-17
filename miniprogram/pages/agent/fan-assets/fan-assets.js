import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getAgentWorkbenchData } from '../../../utils/agent-workbench.js';

Page({
  data: {
    fanAssets: []
  },

  onLoad() {
    if (!requireAgentLogin()) {
      return;
    }

    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const { fanAssets } = getAgentWorkbenchData();
    this.setData({ fanAssets });
  },

  handleAssetTap(e) {
    const { fan, preference, followup } = e.currentTarget.dataset;
    wx.showModal({
      title: fan,
      content: `偏好：${preference}\n\n建议跟进：${followup}`,
      showCancel: false
    });
  }
});
