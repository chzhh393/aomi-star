Page({
  onLoad() {
    wx.showModal({
      title: '页面已停用',
      content: '旧版通用评分页已停用，请从对应角色工作台重新进入新版五维评分页面。',
      showCancel: false,
      success: () => {
        wx.navigateBack({
          delta: 1
        });
      }
    });
  }
});
