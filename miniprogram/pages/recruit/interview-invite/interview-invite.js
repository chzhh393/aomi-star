// pages/recruit/interview-invite/interview-invite.js
// 面试邀请详情页

Page({
  data: {
    loading: true,
    interview: null,
    candidateName: '',
    contactPhone: '18589637447',
    defaultLocation: '成都市成华区俊屹中心负一层奥米光年传媒'
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadCandidateData(id);
    } else {
      this.loadFromCloud();
    }
  },

  // 通过 candidateId 加载
  async loadCandidateData(id) {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'get', data: { id } }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.processCandidate(res.result.candidate);
      } else {
        this.showError('未找到面试信息');
      }
    } catch (error) {
      console.error('[面试邀请] 查询失败:', error);
      this.showError('查询失败，请重试');
    }
  },

  // 通过 openId 加载（无 id 参数时）
  async loadFromCloud() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.processCandidate(res.result.candidate);
      } else {
        this.showError('未找到面试信息');
      }
    } catch (error) {
      console.error('[面试邀请] 云端查询失败:', error);
      this.showError('查询失败，请重试');
    }
  },

  processCandidate(candidate) {
    const name = candidate.basicInfo?.name || candidate.basicInfo?.artName || '';
    this.setData({
      interview: candidate.interview || null,
      candidateName: name,
      loading: false
    });
  },

  showError(msg) {
    this.setData({ loading: false });
    wx.showToast({ title: msg, icon: 'none' });
    setTimeout(() => { wx.navigateBack(); }, 1500);
  },

  // 拨打联系电话
  callPhone() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactPhone
    });
  },

  // 复制地址
  copyAddress() {
    const location = this.data.interview?.location || this.data.defaultLocation;
    if (location) {
      wx.setClipboardData({
        data: location,
        success() {
          wx.showToast({ title: '地址已复制', icon: 'success' });
        }
      });
    }
  },

  // 查看报名状态
  viewStatus() {
    wx.navigateTo({
      url: '/pages/recruit/status/status'
    });
  }
});
