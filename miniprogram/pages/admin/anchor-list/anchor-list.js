// pages/admin/anchor-list/anchor-list.js
import { mockAnchors, getAnchorsByLevel } from '../../../mock/data.js';

Page({
  data: {
    currentTab: 'all',
    rawAnchors: [],
    anchors: [],
    filteredAnchors: [],
    useCloudData: false
  },

  onLoad() {
    this.loadAnchors();
  },

  async loadAnchors() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'list',
          data: {
            page: 1,
            pageSize: 100,
            statuses: ['signed', 'training', 'active']
          }
        }
      });

      const cloudList = res.result?.data?.list || [];
      if (res.result?.success && cloudList.length > 0) {
        const formattedAnchors = this.formatAnchorsData(cloudList.map((item) => this.normalizeCloudCandidate(item)));
        this.setData({
          rawAnchors: formattedAnchors,
          anchors: formattedAnchors,
          filteredAnchors: formattedAnchors,
          useCloudData: true
        });
        return;
      }
    } catch (error) {
      console.error('[anchor-list] 云端加载失败，回退 mock:', error);
    }

    const formattedAnchors = this.formatAnchorsData(mockAnchors);
    this.setData({
      rawAnchors: mockAnchors,
      anchors: formattedAnchors,
      filteredAnchors: formattedAnchors,
      useCloudData: false
    });
  },

  normalizeCloudCandidate(candidate) {
    const basicInfo = candidate.basicInfo || {};
    const socialFans = [
      Number(basicInfo.douyinFans || 0),
      Number(basicInfo.xiaohongshuFans || 0),
      Number(basicInfo.bilibiliFans || 0)
    ];
    const fansCount = socialFans.find((item) => item > 0) || 0;
    const dailyRecords = Array.isArray(candidate.trainingCamp?.dailyRecords) ? candidate.trainingCamp.dailyRecords : [];
    const salary = Number(candidate.contract?.salary || 0);
    const payslipAmount = Number(candidate.commission?.payslip?.totalAmount || candidate.commission?.totalAmount || 0);
    const currentAmount = payslipAmount || salary;
    const previousAmount = salary && payslipAmount ? salary : 0;
    const anchorLevel = candidate.commission?.anchorLevel || candidate.rating?.grade || 'C';

    return {
      id: candidate._id,
      name: basicInfo.name || '',
      artName: candidate.liveName || candidate.experience?.accountName || basicInfo.artName || basicInfo.name || '未命名主播',
      level: String(anchorLevel).toUpperCase(),
      avatar: candidate.avatar || '',
      agentId: candidate.assignedAgent?.agentId || '',
      agentName: candidate.assignedAgent?.agentName || '待分配经纪人',
      joinDate: candidate.contract?.signedDate || candidate.contract?.signedAt || candidate.updatedAt || candidate.createdAt || '',
      status: candidate.status || 'signed',
      monthRevenue: currentAmount,
      lastMonthRevenue: previousAmount,
      fansCount,
      newFans: 0,
      liveHours: dailyRecords.length * 2,
      lastMonthHours: Math.max(0, dailyRecords.length * 2 - 4),
      talents: Array.isArray(candidate.talent?.mainTalents) ? candidate.talent.mainTalents : [],
      mbti: basicInfo.mbti || candidate.profile?.mbti || '-',
      platform: basicInfo.douyin ? '抖音' : basicInfo.xiaohongshu ? '小红书' : basicInfo.bilibili ? 'B站' : '-'
    };
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
    const formattedAnchors = this.data.useCloudData
      ? (tab === 'all'
        ? this.data.anchors
        : this.data.anchors.filter((item) => item.level === tab))
      : this.formatAnchorsData(tab === 'all' ? this.data.rawAnchors : getAnchorsByLevel(tab));

    this.setData({
      currentTab: tab,
      filteredAnchors: formattedAnchors,
    });
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/admin/anchor-detail/anchor-detail?id=${id}`
    });
  },
});
