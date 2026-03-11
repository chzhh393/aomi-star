// pages/scout/team/team.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';

Page({
  data: {
    loading: true,
    myInfo: null,
    team: {
      directScouts: [],
      summary: {
        totalScouts: 0,
        totalReferred: 0,
        totalSigned: 0
      }
    }
  },

  onLoad() {
    this.ensureLogin();
  },

  onShow() {
    this.loadTeamData();
  },

  onPullDownRefresh() {
    this.loadTeamData();
  },

  // 确保用户已登录
  async ensureLogin() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后查看团队信息',
        onSuccess: () => {
          console.log('[团队页面] 登录成功');
          this.loadTeamData();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    }
  },

  // 加载团队数据
  async loadTeamData() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyTeam' }
      });

      if (!res.result || !res.result.success) {
        wx.showToast({
          title: res.result?.error || '获取团队信息失败',
          icon: 'none'
        });
        this.setData({ loading: false });
        return;
      }

      const { myInfo, team } = res.result;

      // 检查是否为星探合伙人
      if (myInfo.level && myInfo.level.depth > 1) {
        wx.showModal({
          title: '提示',
          content: '特约星探暂不支持查看团队',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }

      // 格式化下级星探的时间
      if (team.directScouts && team.directScouts.length > 0) {
        team.directScouts = team.directScouts.map(scout => {
          scout.createdAtText = this.formatTime(scout.createdAt);
          return scout;
        });
      }

      this.setData({
        myInfo,
        team,
        loading: false
      });

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('[团队页面] 加载数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
});
