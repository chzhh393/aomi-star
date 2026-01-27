// pages/operations/home/home.js
// 运营工作台

import { getCurrentUser } from '../../../utils/auth.js';
import { ROLE } from '../../../mock/users.js';
import { getAllCandidates } from '../../../mock/candidates.js';

Page({
  data: {
    user: null,

    // 统计数据
    stats: {
      totalCandidates: 0,
      pendingReview: 0,
      interviewing: 0,
      activeAnchors: 0
    },

    // 快捷功能
    quickActions: [
      {
        id: 'candidates',
        icon: '📋',
        title: '候选人管理',
        desc: '查看和管理所有候选人',
        color: '#13E8DD',
        route: '/pages/hr/candidates/candidates'
      },
      {
        id: 'anchors',
        icon: '🎤',
        title: '主播管理',
        desc: '查看和管理所有主播',
        color: '#FFD700',
        route: '/pages/agent/anchors/anchors'
      },
      {
        id: 'data',
        icon: '📊',
        title: '数据报表',
        desc: '查看运营数据和统计',
        color: '#FF6B6B',
        route: ''
      },
      {
        id: 'settings',
        icon: '⚙️',
        title: '系统设置',
        desc: '配置和管理系统参数',
        color: '#9C27B0',
        route: ''
      }
    ]
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    // 获取当前用户
    const user = getCurrentUser();
    if (!user || user.role !== ROLE.OPERATIONS) {
      wx.showModal({
        title: '访问受限',
        content: '您不是运营人员，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/index/index' });
        }
      });
      return;
    }

    // 统计数据
    const allCandidates = getAllCandidates();
    const stats = {
      totalCandidates: allCandidates.length,
      pendingReview: allCandidates.filter(c => c.status === 'pending').length,
      interviewing: allCandidates.filter(c => c.status === 'interview').length,
      activeAnchors: allCandidates.filter(c => c.status === 'active').length
    };

    this.setData({
      user,
      stats
    });
  },

  /**
   * 点击快捷功能
   */
  onActionTap(e) {
    const { route } = e.currentTarget.dataset;

    if (!route) {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: route,
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  }
});
