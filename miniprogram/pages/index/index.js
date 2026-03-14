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

  // 跳转到星探注册或工作台
  async goToScout() {
    wx.showLoading({ title: '加载中...' });

    try {
      // 先检查是否已注册
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyInfo' }
      });

      wx.hideLoading();

      if (res.result && res.result.success && res.result.isRegistered) {
        // 已经是星探，直接跳转到工作台
        wx.navigateTo({
          url: '/pages/scout/home/home'
        });
      } else {
        // 未注册，跳转到星探介绍页
        wx.navigateTo({
          url: '/pages/scout/intro/intro'
        });
      }
    } catch (error) {
      console.error('[首页] 检查星探状态失败:', error);
      wx.hideLoading();
      // 检查失败时，默认跳转到星探介绍页
      wx.navigateTo({
        url: '/pages/scout/intro/intro'
      });
    }
  },

  // 跳转到员工入口（角色选择）
  goToEmployee() {
    wx.navigateTo({
      url: '/pages/role-select/role-select'
    });
  }
});
