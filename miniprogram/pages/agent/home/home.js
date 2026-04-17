/**
 * 经纪人工作台
 * 聚合心理预警、直播作战和粉丝资产维护信息
 */

import { getAgentInfo, requireAgentLogin, agentLogout } from '../../../utils/agent-auth.js';
import { getCandidateList, getAgentStats } from '../../../utils/agent-api.js';
import { getAgentWorkbenchData } from '../../../utils/agent-workbench.js';

Page({
  data: {
    agentInfo: null,
    loading: false,
    responsibilityCards: [],
    workbench: {
      overview: {
        managedCount: 0,
        todayLiveCount: 0,
        monthRevenueText: '0.0',
        averageLiveHours: 0,
        greenCount: 0,
        yellowCount: 0,
        redCount: 0
      },
      talkTasks: [],
      battleBoard: [],
      fanAssets: [],
      schedulePreview: []
    },
    stats: {
      totalCount: 0,
      pendingCount: 0,
      scoredCount: 0,
      monthCount: 0
    },
    pendingCandidates: []
  },

  onLoad() {
    if (!requireAgentLogin()) {
      return;
    }

    const agentInfo = getAgentInfo();
    const workbench = getAgentWorkbenchData();
    this.setData({
      agentInfo,
      workbench,
      responsibilityCards: this.buildResponsibilityCards(workbench)
    });

    this.loadData();
  },

  onShow() {
    if (this.data.agentInfo) {
      this.loadData();
    }
  },

  async loadData() {
    this.setData({
      loading: true,
      workbench: getAgentWorkbenchData()
    });

    try {
      const workbench = getAgentWorkbenchData();
      const stats = await getAgentStats();

      let pendingCandidates = [];
      if (stats.pendingCount > 0) {
        const result = await getCandidateList({
          status: 'pending_score',
          page: 1,
          pageSize: 3
        });
        pendingCandidates = result.list || [];
      }

      this.setData({
        workbench,
        responsibilityCards: this.buildResponsibilityCards(workbench),
        stats,
        pendingCandidates,
        loading: false
      });
    } catch (error) {
      console.error('[经纪人工作台] 加载招聘协同数据失败:', error);
      this.setData({
        responsibilityCards: this.buildResponsibilityCards(getAgentWorkbenchData()),
        stats: {
          totalCount: 0,
          pendingCount: 0,
          scoredCount: 0,
          monthCount: 0
        },
        pendingCandidates: [],
        loading: false
      });
    }
  },

  buildResponsibilityCards(workbench = {}) {
    const overview = workbench.overview || {};
    const talkTasks = Array.isArray(workbench.talkTasks) ? workbench.talkTasks : [];
    const battleBoard = Array.isArray(workbench.battleBoard) ? workbench.battleBoard : [];
    const fanAssets = Array.isArray(workbench.fanAssets) ? workbench.fanAssets : [];
    const urgentTask = talkTasks.find((item) => item.signal === 'red' || item.signal === 'yellow') || talkTasks[0];
    const nextBattle = battleBoard[0];
    const coreFan = fanAssets[0];

    return [
      {
        key: 'mental',
        title: '心理红绿灯系统',
        summary: `${overview.greenCount || 0} 绿 / ${overview.yellowCount || 0} 黄 / ${overview.redCount || 0} 红`,
        detail: urgentTask
          ? `${urgentTask.anchorName} 已触发谈心任务，来源：${urgentTask.source}`
          : '当前没有新的心理预警任务',
        path: '/pages/agent/talk-tasks/talk-tasks'
      },
      {
        key: 'battle',
        title: '直播作战看板',
        summary: `${overview.todayLiveCount || 0} 场待排 / ${overview.managedCount || 0} 位主播`,
        detail: nextBattle
          ? `${nextBattle.anchorName} 下一场：${nextBattle.liveGoal}`
          : '当前没有待安排的直播作战计划',
        path: '/pages/agent/live-board/live-board'
      },
      {
        key: 'fans',
        title: '粉丝资产档案',
        summary: `${fanAssets.length} 份重点粉丝档案`,
        detail: coreFan
          ? `${coreFan.fanName} · ${coreFan.materialTag}`
          : '当前暂无重点粉丝资产待维护',
        path: '/pages/agent/fan-assets/fan-assets'
      }
    ];
  },

  async handleRefresh() {
    await this.loadData();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  },

  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },

  goToCandidateList() {
    wx.navigateTo({
      url: '/pages/agent/candidates/candidates'
    });
  },

  goToMyScores() {
    wx.navigateTo({
      url: '/pages/agent/my-scores/my-scores'
    });
  },

  goToCandidateDetail(e) {
    const candidateId = e.currentTarget.dataset.id;
    if (!candidateId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/agent/candidate-detail/candidate-detail?id=${candidateId}`
    });
  },

  handleTaskTap(e) {
    const { name, deadline } = e.currentTarget.dataset;
    wx.showModal({
      title: '谈心任务',
      content: `${name} 需要在${deadline}前完成跟进，建议先查看状态再安排面谈。`,
      showCancel: false
    });
  },

  handleAssetTap(e) {
    const { fan, followup } = e.currentTarget.dataset;
    wx.showModal({
      title: fan || '粉丝资产',
      content: followup || '请结合摄影物料完成私域维护。',
      showCancel: false
    });
  },

  handleBoardTap(e) {
    const { anchor, goal } = e.currentTarget.dataset;
    wx.showToast({
      title: `${anchor}：${goal}`,
      icon: 'none',
      duration: 2500
    });
  },

  goToTalkTasks() {
    wx.navigateTo({
      url: '/pages/agent/talk-tasks/talk-tasks'
    });
  },

  goToLiveBoard() {
    wx.navigateTo({
      url: '/pages/agent/live-board/live-board'
    });
  },

  goToFanAssets() {
    wx.navigateTo({
      url: '/pages/agent/fan-assets/fan-assets'
    });
  },

  goToResponsibilityCard(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({
      url: path
    });
  },

  handleLogout() {
    wx.showModal({
      title: '切换账号',
      content: '确认退出当前账号并返回员工入口吗？',
      confirmText: '切换账号',
      success: (res) => {
        if (res.confirm) {
          agentLogout();
        }
      }
    });
  }
});
