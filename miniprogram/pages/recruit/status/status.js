// pages/recruit/status/status.js
// 报名状态页

Page({
  data: {
    candidate: null,
    loading: true,
    currentStep: 0,

    // 进度步骤（6阶段）
    statusSteps: [
      { key: 'pending', label: '待审核', icon: '📝' },
      { key: 'approved', label: '已审核，待面试安排', icon: '✅' },
      { key: 'interview_scheduled', label: '已安排面试', icon: '📅' },
      { key: 'signed', label: '已签约', icon: '✍️' }
    ],

    // 状态信息
    statusInfo: {
      title: '',
      desc: ''
    }
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadCandidateData(id);
    } else {
      this.loadFromCloud();
    }
  },

  onPullDownRefresh() {
    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      this.loadCandidateData(candidateId);
    } else {
      this.loadFromCloud();
    }
  },

  // 从云端加载候选人数据
  async loadFromCloud() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      if (res.result && res.result.success && res.result.candidate) {
        const candidate = res.result.candidate;
        wx.setStorageSync('myCandidateId', candidate._id);
        this.processCandidate(candidate);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '未找到报名信息',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('[状态页] 云端查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    }

    wx.stopPullDownRefresh();
  },

  // 加载候选人数据（通过ID）
  async loadCandidateData(id) {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'get',
          data: { id: id }
        }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.processCandidate(res.result.candidate);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '报名信息不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('[状态页] 查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    }

    wx.stopPullDownRefresh();
  },

  // 处理候选人数据
  processCandidate(candidate) {
    // 计算审核进度（6阶段）
    let currentStep = 0;
    if (candidate.status === 'pending') currentStep = 1;
    else if (candidate.status === 'approved') currentStep = 2;
    else if (candidate.status === 'interview_scheduled') currentStep = 3;
    else if (candidate.status === 'signed' ||
             candidate.status === 'training' ||
             candidate.status === 'active') currentStep = 4;

    // 生成状态信息
    const statusInfo = this.generateStatusInfo(candidate.status);

    this.setData({
      candidate,
      currentStep,
      statusInfo,
      loading: false
    });
  },

  // 生成状态信息
  generateStatusInfo(status) {
    const infoMap = {
      'pending': {
        title: '报名成功，等待审核',
        desc: '经纪人将在1-2个工作日内审核您的资料，请耐心等待'
      },
      'approved': {
        title: '审核通过，等待面试安排',
        desc: '恭喜！您的资料已通过审核，HR将尽快为您安排面试'
      },
      'interview_scheduled': {
        title: '面试已安排',
        desc: '恭喜！HR已为您安排了面试，请按时参加'
      },
      'signed': {
        title: '恭喜签约成功！',
        desc: '欢迎加入我们！您现在可以进入主播工作台了'
      },
      'training': {
        title: '培训进行中',
        desc: '您正在接受专业培训，加油！'
      },
      'active': {
        title: '您已正式成为主播',
        desc: '开启您的直播之旅吧！'
      },
      'rejected': {
        title: '很遗憾，审核未通过',
        desc: '感谢您的申请，期待未来有机会合作'
      }
    };

    return infoMap[status] || {
      title: '状态未知',
      desc: ''
    };
  },

  // 查看面试邀请详情
  viewInterviewInvite() {
    const { candidate } = this.data;
    const id = candidate._id || wx.getStorageSync('myCandidateId');
    if (id) {
      wx.navigateTo({
        url: `/pages/recruit/interview-invite/interview-invite?id=${id}`
      });
    }
  },

  // 查看报名详情
  viewDetail() {
    const { candidate } = this.data;
    const id = candidate._id || wx.getStorageSync('myCandidateId');
    if (id) {
      wx.navigateTo({
        url: `/pages/recruit/detail/detail?id=${id}`
      });
    }
  },

  // 联系HR
  contactHR() {
    wx.showModal({
      title: '联系HR',
      content: 'HR将在3个工作日内与您联系，请保持手机畅通',
      showCancel: false
    });
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' });

    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      this.loadCandidateData(candidateId);
    } else {
      this.loadFromCloud();
    }

    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  }
});
