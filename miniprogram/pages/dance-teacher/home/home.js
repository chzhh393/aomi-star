import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import {
  getCompletedInterviewCandidates,
  getDanceTeacherBookings,
  getPendingInterviewCandidates
} from '../../../utils/interview-api.js';

const DANCE_LIBRARY_BLUEPRINT = [
  { name: '引流舞', count: 36 },
  { name: '团舞', count: 48 },
  { name: '粉丝专属舞', count: 24 },
  { name: 'PK舞', count: 60 }
];

const VERSION_COUNT = 3;

function buildCards({ pendingCount = 0, reviewedCount = 0, bookedCourseList = [] }) {
  const totalDanceCount = DANCE_LIBRARY_BLUEPRINT.reduce((sum, item) => sum + item.count, 0);
  const pendingReviewTotal = bookedCourseList.reduce((sum, item) => sum + Number(item.pendingReviewCount || 0), 0);
  const checkedInCount = bookedCourseList.filter((item) => Number(item.trainingRecordCount || 0) > 0).length;
  const nearestBooking = bookedCourseList[0];

  return [
    {
      key: 'interview',
      title: '面试管理',
      kicker: 'Interview',
      summary: `${pendingCount} 待评价 / ${reviewedCount} 已评价`,
      detail: pendingCount > 0 ? '当前有新的候选人待舞蹈老师评分。' : '当前没有积压面试，可查看已评价记录。',
      metrics: [
        { label: '待评价', value: pendingCount },
        { label: '已评价', value: reviewedCount }
      ],
      actionText: '进入面试管理',
      path: '/pages/dance-teacher/interview-management/interview-management'
    },
    {
      key: 'teaching',
      title: '教学管理',
      kicker: 'Teaching',
      summary: `${bookedCourseList.length} 位预约 / ${pendingReviewTotal} 条待复核`,
      detail: nearestBooking
        ? `最近训练：${nearestBooking.candidateName || '主播'}，${nearestBooking.bookingSummary || '待排期'}`
        : '当前没有预约训练，可进入教学管理维护排期和签到复核。',
      metrics: [
        { label: '已预约', value: bookedCourseList.length },
        { label: '已签到', value: checkedInCount }
      ],
      actionText: '进入教学管理',
      path: '/pages/dance-teacher/teaching-management/teaching-management'
    },
    {
      key: 'asset',
      title: '舞蹈资产管理',
      kicker: 'Assets',
      summary: `${totalDanceCount} 支曲目 / ${totalDanceCount * VERSION_COUNT} 个版本素材`,
      detail: `当前按 ${DANCE_LIBRARY_BLUEPRINT.map((item) => item.name).join('、')} 四类基准维护资产库。`,
      metrics: [
        { label: '核心曲目', value: totalDanceCount },
        { label: '版本素材', value: totalDanceCount * VERSION_COUNT }
      ],
      actionText: '进入资产管理',
      path: '/pages/dance-teacher/asset-management/asset-management'
    }
  ];
}

Page({
  data: {
    loading: false,
    cards: []
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: ['dance_teacher'],
      redirectUrl: '/pages/dance-teacher/home/home'
    })) {
      return;
    }

    this.loadOverview();
  },

  onShow() {
    const agentInfo = getAgentInfo();
    if (agentInfo && agentInfo.role === 'dance_teacher') {
      this.loadOverview();
    }
  },

  async onPullDownRefresh() {
    await this.loadOverview();
    wx.stopPullDownRefresh();
  },

  async loadOverview() {
    this.setData({ loading: true });

    try {
      const agentInfo = getAgentInfo() || {};
      const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
      const [pendingResult, reviewedResult, bookingsResult] = await Promise.all([
        getPendingInterviewCandidates({
          role: 'dance_teacher',
          operatorId,
          page: 1,
          pageSize: 1
        }),
        getCompletedInterviewCandidates({
          role: 'dance_teacher',
          operatorId,
          page: 1,
          pageSize: 1
        }),
        getDanceTeacherBookings()
      ]);

      const bookedCourseList = Array.isArray(bookingsResult.data?.list)
        ? bookingsResult.data.list.map((item) => ({
          ...item,
          bookingSummary: `${item.booking?.courseDate || '-'} ${item.booking?.startTime || ''}-${item.booking?.endTime || ''}`.trim(),
          pendingReviewCount: Number(item.pendingReviewCount || 0),
          trainingRecordCount: Number(item.trainingRecordCount || 0)
        }))
        : [];

      this.setData({
        cards: buildCards({
          pendingCount: pendingResult.data?.total || 0,
          reviewedCount: reviewedResult.data?.total || 0,
          bookedCourseList
        }),
        loading: false
      });
    } catch (error) {
      console.error('[舞蹈老师工作台] 加载概览失败:', error);
      this.setData({
        cards: buildCards({}),
        loading: false
      });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  goToModule(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  }
});
