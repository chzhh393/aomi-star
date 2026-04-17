import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';
import { getGradeLabel } from '../../../utils/scout-level.js';

Page({
  data: {
    loading: true,
    myInfo: null,
    myGradeLabel: '',
    team: {
      directScouts: [],
      summary: {
        totalScouts: 0,
        activeScouts: 0,
        pendingScouts: 0,
        totalReferred: 0,
        totalSigned: 0,
        totalCommission: 0
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

  async ensureLogin() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后查看团队信息',
        onSuccess: () => {
          this.loadTeamData();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    }
  },

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
      const myGradeLabel = getGradeLabel(myInfo.grade || 'rookie');

      if (team.directScouts && team.directScouts.length > 0) {
        team.directScouts = team.directScouts.map((scout) => ({
          ...scout,
          createdAtText: this.formatTime(scout.createdAt),
          gradeLabel: getGradeLabel(scout.grade || 'rookie')
        }));
      }

      this.setData({
        myInfo,
        myGradeLabel,
        team,
        loading: false
      });

      wx.stopPullDownRefresh();
    } catch (error) {
      console.error('[团队详情页面] 加载数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  formatTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
});
