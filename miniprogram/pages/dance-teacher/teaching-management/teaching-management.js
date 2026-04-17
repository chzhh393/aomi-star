import { requireAgentLogin, getAgentInfo } from '../../../utils/agent-auth.js';
import { getDanceTeacherBookings } from '../../../utils/interview-api.js';
import { getDetailPath } from '../../../utils/interviewer.js';

function getDanceSkillStatus(item = {}, index = 0) {
  const pendingReviewCount = Number(item.pendingReviewCount || 0);
  const trainingRecordCount = Number(item.trainingRecordCount || 0);
  const reviewedCount = Number(item.reviewedCount || 0);

  if (pendingReviewCount > 0) {
    return { text: '练习中', className: 'status-practice' };
  }

  if (trainingRecordCount >= 2 || reviewedCount >= 2) {
    return index % 2 === 0
      ? { text: '已掌握', className: 'status-mastered' }
      : { text: 'C位勋章', className: 'status-c' };
  }

  if (trainingRecordCount > 0) {
    return { text: '练习中', className: 'status-practice' };
  }

  return { text: '未学', className: 'status-not-started' };
}

function buildDanceSkillMatrix(bookedCourseList = []) {
  const danceNames = ['引流舞', '团舞', '粉丝专属舞', 'PK舞'];

  return bookedCourseList.slice(0, 4).map((item, index) => {
    const baseStatus = getDanceSkillStatus(item, index);
    return {
      candidateId: item.candidateId,
      candidateName: item.candidateName,
      liveName: item.liveName || '',
      signInText: item.trainingRecordCount > 0 ? '已提交签到/日志' : '待签到',
      skills: danceNames.map((danceName, skillIndex) => {
        if (danceName === 'PK舞' && baseStatus.text === '已掌握') {
          return { danceName, statusText: '批量通关', statusClass: 'status-mastered' };
        }

        if (danceName === '团舞' && skillIndex === 1 && index % 2 === 0 && baseStatus.text !== '未学') {
          return { danceName, statusText: 'C位勋章', statusClass: 'status-c' };
        }

        return { danceName, statusText: baseStatus.text, statusClass: baseStatus.className };
      })
    };
  });
}

Page({
  data: {
    loading: false,
    bookedCourseList: [],
    bookedCourseCount: 0,
    danceDailyBoard: null,
    danceSkillMatrix: [],
    danceBatchSummary: null
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: ['dance_teacher'],
      redirectUrl: '/pages/dance-teacher/teaching-management/teaching-management'
    })) {
      return;
    }

    this.loadPageData();
  },

  onShow() {
    const agentInfo = getAgentInfo();
    if (agentInfo && agentInfo.role === 'dance_teacher') {
      this.loadPageData();
    }
  },

  async onPullDownRefresh() {
    await this.loadPageData();
    wx.stopPullDownRefresh();
  },

  async loadPageData() {
    this.setData({ loading: true });

    try {
      const result = await getDanceTeacherBookings();
      const bookedCourseList = Array.isArray(result.data?.list)
        ? result.data.list.map((item) => ({
          ...item,
          detailPath: getDetailPath(item.candidateId, 'dance_teacher'),
          bookingSummary: `${item.booking?.courseDate || '-'} ${item.booking?.startTime || ''}-${item.booking?.endTime || ''}`.trim(),
          bookingLocation: item.booking?.location || '待补充场地',
          pendingReviewCount: Number(item.pendingReviewCount || 0),
          trainingRecordCount: Number(item.trainingRecordCount || 0),
          reviewedCount: Number(item.reviewedCount || 0),
          reviewStatusText: Number(item.pendingReviewCount || 0) > 0
            ? `待复核 ${Number(item.pendingReviewCount || 0)} 条`
            : Number(item.trainingRecordCount || 0) > 0
              ? `已复核 ${Number(item.reviewedCount || 0)} 条`
              : '暂无训练记录'
        }))
        : [];

      const pendingReviewTotal = bookedCourseList.reduce((sum, item) => sum + Number(item.pendingReviewCount || 0), 0);
      const checkedInCount = bookedCourseList.filter((item) => Number(item.trainingRecordCount || 0) > 0).length;
      const focusCandidate = bookedCourseList.find((item) => Number(item.pendingReviewCount || 0) > 0) || bookedCourseList[0] || null;
      const starCandidate = bookedCourseList.find((item) => Number(item.reviewedCount || 0) > 0) || bookedCourseList[0] || null;
      const danceSkillMatrix = buildDanceSkillMatrix(bookedCourseList);

      this.setData({
        bookedCourseList,
        bookedCourseCount: bookedCourseList.length,
        danceDailyBoard: {
          todayProgress: `今日已排 ${bookedCourseList.length} 位主播训练。`,
          todayStar: starCandidate ? `${starCandidate.candidateName} · ${starCandidate.liveName || '今日状态稳定'}` : '待老师点名今日之星',
          focusMember: focusCandidate ? `${focusCandidate.candidateName} · ${focusCandidate.pendingReviewCount || 0} 条记录待复核` : '暂无重点待关注成员',
          nextNeed: pendingReviewTotal > 0
            ? `明日优先处理 ${pendingReviewTotal} 条训练日志，并协调团舞 C 位排练。`
            : '明日可补充团舞和 PK 舞版本素材，提前安排协作排练。',
          attendanceText: bookedCourseList.length
            ? `${checkedInCount}/${bookedCourseList.length} 位主播已提交签到或训练日志`
            : '暂无预约主播，待经纪人发起训练预约'
        },
        danceSkillMatrix,
        danceBatchSummary: {
          candidateCount: danceSkillMatrix.length,
          pkDanceCount: Math.max(12, danceSkillMatrix.length * 6)
        },
        loading: false
      });
    } catch (error) {
      console.error('[舞蹈老师教学管理] 加载失败:', error);
      this.setData({
        bookedCourseList: [],
        bookedCourseCount: 0,
        danceDailyBoard: null,
        danceSkillMatrix: [],
        danceBatchSummary: null,
        loading: false
      });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  goToSchedule() {
    wx.navigateTo({
      url: '/pages/dance-teacher/schedule/schedule'
    });
  },

  goToDetail(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  },

  showBatchHint() {
    const summary = this.data.danceBatchSummary || {};
    wx.showModal({
      title: '批量通关工具',
      content: `当前可覆盖 ${summary.candidateCount || 0} 名主播、${summary.pkDanceCount || 0} 支 PK 舞的批量标记场景。`,
      showCancel: false
    });
  }
});
