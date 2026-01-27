/**
 * 经纪人工作台
 * 功能：
 * 1. 查看待签约候选人（status=rated）
 * 2. 查看已签约主播
 * 3. 面试评价入口
 * 4. 合同上传入口
 */

import { getAllCandidates } from '../../../mock/candidates.js';

const app = getApp();

Page({
  data: {
    user: null,
    userInfo: null,

    // 统计数据
    stats: {
      pendingContract: 0,    // 待签约
      signed: 0,             // 已签约
      pendingEvaluation: 0,  // 待评价
      totalManaged: 0        // 管理总数
    },

    // 待签约候选人列表
    pendingContractCandidates: [],

    // 待评价候选人列表
    pendingEvaluationCandidates: [],

    // 已签约主播列表（最近5个）
    signedStreamers: []
  },

  onLoad() {
    const user = app.getCurrentUser();
    this.setData({ user });

    this.loadUserInfo();
    this.loadData();
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabBar();
    }

    // 刷新数据
    this.loadData();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('user_info');
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
      return;
    }

    this.setData({
      userInfo
    });
  },

  /**
   * 加载数据
   */
  loadData() {
    const allCandidates = getAllCandidates();
    const currentUserId = this.data.userInfo?.id;

    // 1. 待签约候选人：status = 'rated'
    const pendingContractCandidates = allCandidates.filter(
      candidate => candidate.status === 'rated'
    );

    // 2. 待评价候选人：status = 'online_test_completed'
    // （已完成线上测试，等待面试评价）
    const pendingEvaluationCandidates = allCandidates.filter(
      candidate => candidate.status === 'online_test_completed'
    );

    // 3. 我的主播列表：role = 'streamer' 且 agentId = 当前用户ID
    const myStreamers = allCandidates.filter(candidate => {
      return candidate.role === 'streamer' &&
             candidate.streamerInfo &&
             candidate.streamerInfo.agentId === currentUserId;
    });

    // 为主播添加显示属性
    const signedStreamers = myStreamers.map(streamer => ({
      ...streamer,
      // 培训状态标签
      trainingStatusLabel: this.getTrainingStatusLabel(streamer.streamerInfo.trainingStatus),
      // 直播状态标签
      liveStatusLabel: this.getLiveStatusLabel(streamer.streamerInfo.liveStatus)
    })).slice(0, 5); // 显示最近5个

    // 4. 计算统计数据
    const stats = {
      pendingContract: pendingContractCandidates.length,
      signed: myStreamers.length, // 我的主播总数
      pendingEvaluation: pendingEvaluationCandidates.length,
      totalManaged: pendingContractCandidates.length + myStreamers.length
    };

    this.setData({
      stats,
      pendingContractCandidates,
      pendingEvaluationCandidates,
      signedStreamers
    });

    console.log('[经纪人工作台] 数据加载完成:', {
      pendingContract: stats.pendingContract,
      myStreamers: myStreamers.length,
      pendingEvaluation: stats.pendingEvaluation
    });
  },

  /**
   * 获取培训状态标签
   */
  getTrainingStatusLabel(status) {
    const labels = {
      'pending': '待开始',
      'in_progress': '培训中',
      'completed': '已完成',
      'inactive': '未开始'
    };
    return labels[status] || '未知';
  },

  /**
   * 获取直播状态标签
   */
  getLiveStatusLabel(status) {
    const labels = {
      'active': '直播中',
      'inactive': '未开播',
      '休息': '休息'
    };
    return labels[status] || '未知';
  },

  /**
   * 去评价候选人
   */
  onEvaluateCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    console.log('[经纪人工作台] 跳转到经纪人评价页面:', candidateId);

    wx.navigateTo({
      url: `/pages/recruit/agent-evaluation/agent-evaluation?candidateId=${candidateId}`
    });
  },

  /**
   * 去签约
   */
  onSignContract(e) {
    const candidateId = e.currentTarget.dataset.id;

    console.log('[经纪人工作台] 跳转到合同上传页面:', candidateId);

    wx.navigateTo({
      url: `/pages/recruit/contract-upload/contract-upload?candidateId=${candidateId}`
    });
  },

  /**
   * 查看候选人详情
   */
  onViewCandidate(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.showToast({
      title: '候选人详情页开发中',
      icon: 'none'
    });
  },

  /**
   * 查看主播详情
   */
  onViewStreamer(e) {
    const candidateId = e.currentTarget.dataset.id;

    wx.showToast({
      title: '主播详情页开发中',
      icon: 'none'
    });
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    wx.showLoading({
      title: '刷新中...'
    });

    setTimeout(() => {
      this.loadData();
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 500);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
