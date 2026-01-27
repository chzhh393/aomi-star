// pages/recruit/index/index.js
// 主播招聘首页

Page({
  data: {
    // 待遇信息
    benefits: [
      { icon: '💰', title: '高额收入', desc: '底薪+提成，月入过万不是梦' },
      { icon: '⏰', title: '灵活时间', desc: '自由安排直播时间' },
      { icon: '📚', title: '专业培训', desc: '系统化主播培训体系' },
      { icon: '🚀', title: '快速成长', desc: '资深经纪人全程指导' }
    ]
  },

  onLoad() {
    // 检查是否已有报名记录
    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      console.log('用户已有报名记录:', candidateId);
    }
  },

  // 跳转到报名表单
  goToApply() {
    wx.navigateTo({
      url: '/pages/recruit/apply/apply'
    });
  },

  // 查询报名状态
  checkStatus() {
    const candidateId = wx.getStorageSync('myCandidateId');

    if (candidateId) {
      wx.navigateTo({
        url: `/pages/recruit/status/status?id=${candidateId}`
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '您还未报名，请先填写报名表单',
        showCancel: false
      });
    }
  }
});
