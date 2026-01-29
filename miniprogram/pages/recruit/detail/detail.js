// pages/recruit/detail/detail.js
// 报名详情页 - 查看已提交的报名信息

Page({
  data: {
    candidate: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadCandidate(id);
    } else {
      const candidateId = wx.getStorageSync('myCandidateId');
      if (candidateId) {
        this.loadCandidate(candidateId);
      } else {
        this.loadFromCloud();
      }
    }
  },

  async loadCandidate(id) {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'get', data: { id } }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.setData({ candidate: res.result.candidate, loading: false });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '未找到报名信息', icon: 'none' });
      }
    } catch (error) {
      console.error('[详情页] 查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '查询失败', icon: 'none' });
    }
  },

  async loadFromCloud() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.setData({ candidate: res.result.candidate, loading: false });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '未找到报名信息', icon: 'none' });
      }
    } catch (error) {
      console.error('[详情页] 查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '查询失败', icon: 'none' });
    }
  },

  // 预览照片
  onPreviewPhoto(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  // 预览视频
  onPreviewVideo(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewMedia({ sources: [{ url, type: 'video' }] });
    }
  },

  // 修改报名信息
  editApply() {
    const { candidate } = this.data;
    if (candidate.status !== 'pending') {
      wx.showToast({ title: '当前状态不允许修改', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/recruit/apply/apply?mode=edit'
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
