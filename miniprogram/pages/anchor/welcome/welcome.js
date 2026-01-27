/**
 * 主播欢迎页面
 * 功能：欢迎新主播、显示经纪人信息、培训指引
 */

import { getCandidateById } from '../../../mock/candidates.js';
import { getUserById } from '../../../mock/users.js';

Page({
  data: {
    streamerId: '',
    streamer: null,
    agent: null,

    // 显示信息
    welcomeMessage: '恭喜您正式成为主播！',
    nextSteps: [
      {
        icon: '📚',
        title: '参加培训',
        desc: '完成系统培训课程，提升直播技能'
      },
      {
        icon: '🎥',
        title: '开始直播',
        desc: '培训合格后即可开启您的直播之旅'
      },
      {
        icon: '💰',
        title: '获得收益',
        desc: '通过直播获取底薪和提成收益'
      }
    ]
  },

  onLoad(options) {
    const { streamerId } = options;

    if (!streamerId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    this.setData({ streamerId });
    this.loadStreamerInfo();
  },

  /**
   * 加载主播信息
   */
  loadStreamerInfo() {
    const streamer = getCandidateById(this.data.streamerId);

    if (!streamer || streamer.role !== 'streamer') {
      wx.showToast({
        title: '主播信息不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    // 加载经纪人信息
    const agent = getUserById(streamer.streamerInfo.agentId);

    this.setData({
      streamer,
      agent
    });

    console.log('[主播欢迎] 加载成功:', {
      streamerId: this.data.streamerId,
      agentName: agent?.profile.name
    });
  },

  /**
   * 进入主播工作台
   */
  onEnterWorkstation() {
    wx.switchTab({
      url: '/pages/anchor/home/home'
    });
  },

  /**
   * 联系经纪人
   */
  onContactAgent() {
    const { agent } = this.data;

    if (!agent) {
      wx.showToast({
        title: '经纪人信息不存在',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '联系经纪人',
      content: `经纪人：${agent.profile.name}\n电话：${agent.profile.phone || '暂无'}`,
      showCancel: false
    });
  }
});
