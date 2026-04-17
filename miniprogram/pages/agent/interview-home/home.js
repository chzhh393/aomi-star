import { requireAgentLogin } from '../../../utils/agent-auth.js';

Page({
  onLoad() {
    if (!requireAgentLogin()) {
      return;
    }

    wx.reLaunch({
      url: '/pages/agent/home/home'
    });
  }
});
