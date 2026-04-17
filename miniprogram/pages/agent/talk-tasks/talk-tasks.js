import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getAgentWorkbenchData } from '../../../utils/agent-workbench.js';

Page({
  data: {
    summary: {
      greenCount: 0,
      yellowCount: 0,
      redCount: 0
    },
    tasks: []
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
    const { overview, talkTasks } = getAgentWorkbenchData();
    this.setData({
      summary: {
        greenCount: overview.greenCount,
        yellowCount: overview.yellowCount,
        redCount: overview.redCount
      },
      tasks: talkTasks
    });
  },

  handleTaskTap(e) {
    const { name, action, deadline } = e.currentTarget.dataset;
    wx.showModal({
      title: `${name} 跟进建议`,
      content: `${action}\n\n完成时限：${deadline}`,
      showCancel: false
    });
  }
});
