import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getAgentWorkbenchData } from '../../../utils/agent-workbench.js';

Page({
  data: {
    overview: {
      managedCount: 0,
      todayLiveCount: 0,
      monthRevenueText: '0.0'
    },
    battleBoard: [],
    schedulePreview: []
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
    const { overview, battleBoard, schedulePreview } = getAgentWorkbenchData();
    this.setData({
      overview,
      battleBoard,
      schedulePreview
    });
  },

  handleBoardTap(e) {
    const { anchor, goal, script } = e.currentTarget.dataset;
    wx.showModal({
      title: `${anchor} 作战提示`,
      content: `${goal}\n\n话术建议：${script}`,
      showCancel: false
    });
  }
});
