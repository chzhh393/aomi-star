// pages/register/guide/guide.js
// 注册引导页 - 身份选择

Page({
  data: {
    identities: [
      {
        id: 'anchor',
        icon: '🎤',
        title: '我要成为主播',
        desc: '加入我们，开启你的直播之旅',
        color: '#13E8DD',
        route: '/pages/recruit/apply/apply'
      },
      {
        id: 'employee',
        icon: '💼',
        title: '我是公司员工',
        desc: 'HR、经纪人、运营等内部员工',
        color: '#FFD700',
        route: '/pages/register/employee/employee'
      },
      {
        id: 'scout',
        icon: '🔍',
        title: '我是星探',
        desc: '推荐优质主播，获取推荐奖励',
        color: '#FF6B6B',
        route: '/pages/register/scout/scout'
      }
    ]
  },

  /**
   * 选择身份
   */
  selectIdentity(e) {
    const { id, route } = e.currentTarget.dataset;

    console.log('[引导页] 用户选择身份:', id);

    // 跳转到对应的注册页面
    wx.navigateTo({
      url: route,
      fail: (err) => {
        console.error('[引导页] 跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回首页
   */
  backToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
