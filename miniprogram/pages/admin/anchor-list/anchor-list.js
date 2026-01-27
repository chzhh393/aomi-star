// pages/admin/anchor-list/anchor-list.js
import { mockAnchors, getAnchorsByLevel } from '../../../mock/data.js';

Page({
  data: {
    currentTab: 'all',
    anchors: [],
    filteredAnchors: [],
  },

  onLoad() {
    const formattedAnchors = this.formatAnchorsData(mockAnchors);
    this.setData({
      anchors: formattedAnchors,
      filteredAnchors: formattedAnchors,
    });
  },

  // 格式化主播数据，添加计算属性
  formatAnchorsData(anchors) {
    return anchors.map(item => {
      // 计算收入相关
      const revenueChange = item.monthRevenue - item.lastMonthRevenue;
      const revenuePercent = item.lastMonthRevenue > 0
        ? Math.abs((revenueChange / item.lastMonthRevenue) * 100).toFixed(0)
        : 0;

      // 计算时长相关
      const hoursChange = item.liveHours - item.lastMonthHours;

      return {
        ...item,
        // 为 class 绑定提供小写的 level
        levelLowerCase: item.level ? item.level.toLowerCase() : '',
        // 收入文本：转换为K单位
        revenueText: `${(item.monthRevenue / 1000).toFixed(0)}K`,
        // 收入变化数值
        revenueChange: revenueChange,
        // 收入变化文本：带箭头和百分比
        revenueChangeText: `${revenueChange >= 0 ? '↗' : '↘'}${revenuePercent}%`,
        // 粉丝数文本：转换为K单位，保留1位小数
        fansText: `${(item.fansCount / 1000).toFixed(1)}K`,
        // 时长变化数值
        hoursChange: hoursChange,
        // 时长变化文本：带箭头和小时数
        hoursChangeText: `${hoursChange >= 0 ? '↗' : '↘'}${Math.abs(hoursChange)}h`,
      };
    });
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    const rawAnchors = tab === 'all' ? mockAnchors : getAnchorsByLevel(tab);
    const formattedAnchors = this.formatAnchorsData(rawAnchors);

    this.setData({
      currentTab: tab,
      filteredAnchors: formattedAnchors,
    });
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/anchor-detail/anchor-detail?id=${id}`,
    });
  },
});
