// pages/recruit/status/status.js
import { getCandidateById } from '../../../mock/candidates.js';

Page({
  data: {
    candidate: null,
    currentStep: 0,
    statusConfig: {
      pending: { text: '待审核', color: '#FFD700', icon: '⏳' },
      interview_scheduled: { text: '已安排面试', color: '#13E8DD', icon: '📅' },
      online_test_completed: { text: '已完成测试', color: '#13E8DD', icon: '✅' },
      pending_rating: { text: '面试评价中', color: '#FFA500', icon: '⭐' },
      rated: { text: '已评级', color: '#32CD32', icon: '🎯' },
      signed: { text: '已签约', color: '#00FF00', icon: '✍️' },
      training: { text: '培训中', color: '#000000', icon: '📚' },
      active: { text: '正式主播', color: '#13E8DD', icon: '🚀' },
      rejected: { text: '未通过', color: '#FF3333', icon: '❌' }
    }
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadCandidateData(id);
    } else {
      wx.showToast({
        title: '未找到报名信息',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载候选人数据
  loadCandidateData(id) {
    const candidate = getCandidateById(id);

    if (!candidate) {
      wx.showToast({
        title: '报名信息不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 计算审核进度（6阶段）
    let currentStep = 0;
    if (candidate.status === 'pending') currentStep = 1;
    else if (candidate.status === 'interview_scheduled') currentStep = 2;
    else if (candidate.status === 'online_test_completed') currentStep = 3;
    else if (candidate.status === 'pending_rating') currentStep = 4;
    else if (candidate.status === 'rated') currentStep = 5;
    else if (candidate.status === 'signed' ||
             candidate.status === 'training' ||
             candidate.status === 'active') currentStep = 6;

    this.setData({
      candidate,
      currentStep
    });
  },

  // 返回招聘首页
  backToHome() {
    wx.redirectTo({
      url: '/pages/recruit/index/index'
    });
  },

  // 联系HR
  contactHR() {
    wx.showModal({
      title: '联系HR',
      content: 'HR将在3个工作日内与您联系，请保持手机畅通',
      showCancel: false
    });
  },

  // 进入工作台（签约后可用）
  enterWorkspace() {
    wx.reLaunch({
      url: '/pages/role-select/role-select'
    });
    // 用户会选择"主播端"，此时状态为 signed/training/active，可以通过权限验证
  }
});
