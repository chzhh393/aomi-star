// pages/index/index.js
// 游客首页 - 双入口设计

Page({
  data: {
    // 无需初始化数据
  },

  onLoad() {
    // 可选：检查用户是否已有候选人记录，显示不同提示
    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      console.log('用户已有报名记录:', candidateId);
    }
  },

  // 跳转到招聘首页
  goToRecruit() {
    wx.navigateTo({
      url: '/pages/recruit/index/index'
    });
  },

  // 跳转到员工入口（角色选择）
  goToEmployee() {
    wx.navigateTo({
      url: '/pages/role-select/role-select'
    });
  }
});
