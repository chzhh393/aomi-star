import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';
import { getGradeLabel } from '../../../utils/scout-level.js';

Page({
  data: {
    loading: true,
    scoutId: '',
    focusScout: null,
    activeSummaryFilter: 'all',
    activeSummaryFilterLabel: '全部二级星探',
    myInfo: null,
    myGradeLabel: '',
    filteredDirectScouts: [],
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

  onLoad(options = {}) {
    this.setData({
      scoutId: options.scoutId || ''
    });
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

      const focusScout = this.data.scoutId
        ? (team.directScouts || []).find((scout) => scout._id === this.data.scoutId) || null
        : null;

      if (focusScout) {
        wx.setNavigationBarTitle({
          title: `${focusScout.name || '王牌星探'}详情`
        });
      }

      this.setData({
        myInfo,
        myGradeLabel,
        team,
        focusScout,
        activeSummaryFilterLabel: this.getSummaryFilterLabel(this.data.activeSummaryFilter),
        filteredDirectScouts: this.applySummaryFilter(team.directScouts || [], this.data.activeSummaryFilter),
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

  formatTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  },

  applySummaryFilter(list = [], filterKey = 'all') {
    switch (filterKey) {
      case 'active':
        return list.filter((item) => item.status === 'active');
      case 'pending':
        return list.filter((item) => item.status === 'pending');
      case 'referred':
        return list.filter((item) => Number(item?.stats?.referredCount || 0) > 0);
      case 'signed':
        return list.filter((item) => Number(item?.stats?.signedCount || 0) > 0);
      case 'commission':
        return list.filter((item) => Number(item?.stats?.totalCommission || 0) > 0);
      case 'all':
      default:
        return list;
    }
  },

  getSummaryFilterLabel(filterKey = 'all') {
    const map = {
      all: '全部二级星探',
      active: '活跃二级',
      pending: '待审核二级',
      referred: '有推荐成果的二级',
      signed: '有签约成果的二级',
      commission: '有佣金产出的二级'
    };
    return map[filterKey] || map.all;
  },

  onSummaryFilter(e) {
    const { filter } = e.currentTarget.dataset;
    const nextFilter = filter || 'all';
    const activeSummaryFilter = this.data.activeSummaryFilter === nextFilter ? 'all' : nextFilter;
    const directScouts = this.data.team?.directScouts || [];

    this.setData({
      activeSummaryFilter,
      activeSummaryFilterLabel: this.getSummaryFilterLabel(activeSummaryFilter),
      filteredDirectScouts: this.applySummaryFilter(directScouts, activeSummaryFilter)
    });
  }
});
