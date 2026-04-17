import {
  buildFollowUpCandidates,
  buildOnboardingStats,
  buildRecruitBoardStats
} from '../../../utils/hr-dashboard.js';
import { getHRCandidateList } from '../../../utils/hr-api.js';

function buildModuleCards(candidates, recruitStats, onboardingStats, followUps) {
  const interviewCount = candidates.filter((candidate) => (
    ['interview_scheduled', 'online_test_completed', 'pending_rating', 'rated'].includes(candidate.status)
  )).length;

  return [
    {
      key: 'recruit',
      title: '招募看板',
      desc: '统一承接外部平台简历，按初筛、邀约、面试、待入职推进。',
      metric: `${recruitStats.cards.reduce((sum, item) => sum + item.count, 0)} 份简历`,
      highlight: `待初筛 ${recruitStats.buckets.pending_screen.length} 人`,
      url: '/pages/hr/recruit-board/recruit-board'
    },
    {
      key: 'interview',
      title: '面试数字化',
      desc: '一键发起面试通知，联动评分入口和面试安排。',
      metric: `${interviewCount} 位候选人`,
      highlight: '通知模板 + S/A/B/C 评分',
      url: '/pages/hr/interview-digital/interview-digital'
    },
    {
      key: 'onboarding',
      title: '入职与档案',
      desc: '电子签约、底薪分成录入、物资领用与退还清单。',
      metric: `${onboardingStats.candidates.length} 份档案`,
      highlight: `待签约 ${onboardingStats.contractPendingCount} 人`,
      url: '/pages/hr/onboarding-archive/onboarding-archive'
    },
    {
      key: 'followup',
      title: '人才回访库',
      desc: '锁定 B/C 级暂未入职选手，30 天自动提醒回访。',
      metric: `${followUps.length} 位候选人`,
      highlight: `到期提醒 ${followUps.filter((item) => item.reminderDue).length} 人`,
      url: '/pages/hr/talent-followup/talent-followup'
    }
  ];
}

Page({
  data: {
    userInfo: null,
    heroStats: {
      total: 0,
      pendingScreen: 0,
      interviewing: 0,
      pendingOnboard: 0
    },
    modules: [],
    priorities: [],
    followUpPreview: []
  },

  onLoad() {
    this.loadWorkspace();
  },

  onShow() {
    this.loadWorkspace();
  },

  async loadWorkspace() {
    const userInfo = wx.getStorageSync('user_info');
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 1200);
      return;
    }

    try {
      const candidates = await getHRCandidateList({ page: 1, pageSize: 100 });
      const recruitStats = buildRecruitBoardStats(candidates);
      const onboardingStats = buildOnboardingStats(candidates);
      const followUps = buildFollowUpCandidates(candidates);
      const priorities = [
        ...recruitStats.buckets.pending_screen.slice(0, 2).map((candidate) => ({
          id: candidate._id || candidate.id,
          name: candidate.basicInfo?.name || candidate.basicInfo?.artName || candidate._id || candidate.id,
          tag: '待初筛',
          subtitle: `${candidate.source || '未知来源'} · ${candidate.talent?.mainTalent || '待评估'}`,
          action: 'review',
          actionText: '去初筛'
        })),
        ...recruitStats.buckets.pending_onboard.slice(0, 2).map((candidate) => ({
          id: candidate._id || candidate.id,
          name: candidate.basicInfo?.name || candidate.basicInfo?.artName || candidate._id || candidate.id,
          tag: '待入职',
          subtitle: `${candidate.rating?.grade || '待评级'} 级 · 建议尽快签约`,
          action: 'contract',
          actionText: '录入签约'
        }))
      ].slice(0, 4);

      this.setData({
        userInfo,
        heroStats: {
          total: candidates.length,
          pendingScreen: recruitStats.buckets.pending_screen.length,
          interviewing: recruitStats.buckets.interview_scheduled.length,
          pendingOnboard: recruitStats.buckets.pending_onboard.length
        },
        modules: buildModuleCards(candidates, recruitStats, onboardingStats, followUps),
        priorities,
        followUpPreview: followUps.slice(0, 3)
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      console.error('[HR工作台] 加载失败:', error);
    }
  },

  onOpenModule(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) {
      return;
    }
    wx.navigateTo({ url });
  },

  onHandlePriority(e) {
    const { id, action } = e.currentTarget.dataset;
    if (!id || !action) {
      return;
    }

    if (action === 'review') {
      wx.navigateTo({ url: `/pages/hr/interview-digital/interview-digital?candidateId=${id}` });
      return;
    }

    if (action === 'contract') {
      wx.navigateTo({ url: `/pages/hr/onboarding-archive/onboarding-archive?candidateId=${id}` });
    }
  },

  onOpenFollowUpModule() {
    wx.navigateTo({ url: '/pages/hr/talent-followup/talent-followup' });
  },

  onRefresh() {
    this.loadWorkspace();
    wx.showToast({ title: '已刷新', icon: 'success' });
  },

  onPullDownRefresh() {
    this.loadWorkspace();
    wx.stopPullDownRefresh();
  }
});
