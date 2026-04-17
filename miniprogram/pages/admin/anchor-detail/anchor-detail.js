import {
  getAnchorById,
  getPracticesByAnchorId,
  mockSchedules,
  mockWeeklyReports
} from '../../../mock/data.js';

const STATUS_MAP = {
  active: '正常开播',
  training: '培训中',
  inactive: '未开播'
};

Page({
  data: {
    anchor: null,
    metrics: null,
    scheduleRecords: [],
    practiceRecords: [],
    growthTimeline: [],
    hasPracticeRecords: false,
    hasScheduleRecords: false,
    sourceType: 'mock',
    loading: true
  },

  async onLoad(options) {
    await this.loadAnchorDetail(options?.id);
  },

  async loadAnchorDetail(id) {
    if (!id) {
      this.showError('缺少主播ID');
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'get',
          data: { id }
        }
      });

      if (res.result?.success && res.result?.candidate) {
        this.applyCloudCandidateDetail(res.result.candidate);
        return;
      }
    } catch (error) {
      console.error('[anchor-detail] 云端加载失败，回退 mock:', error);
    }

    const anchor = getAnchorById(id);
    if (!anchor) {
      this.showError('未找到主播信息');
      return;
    }

    const practiceRecords = getPracticesByAnchorId(id).slice(0, 3).map((item) => ({
      ...item,
      scoreText: `${item.rating || 0}/5`
    }));
    const scheduleRecords = mockSchedules
      .filter((item) => item.anchorId === id)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
      .slice(0, 4)
      .map((item) => ({
        ...item,
        statusText: item.status === 'confirmed' ? '已确认' : '待确认',
        dateTimeText: `${item.date} ${item.startTime}-${item.endTime}`
      }));
    const weeklyReport = mockWeeklyReports.find((item) => item.anchorId === id);

    const revenueChange = anchor.monthRevenue - anchor.lastMonthRevenue;
    const revenuePercent = anchor.lastMonthRevenue > 0
      ? ((revenueChange / anchor.lastMonthRevenue) * 100).toFixed(0)
      : '0';
    const hoursChange = anchor.liveHours - anchor.lastMonthHours;

    const formattedAnchor = {
      ...anchor,
      statusText: STATUS_MAP[anchor.status] || anchor.status || '未知状态',
      monthRevenueText: this.formatCurrency(anchor.monthRevenue),
      lastMonthRevenueText: this.formatCurrency(anchor.lastMonthRevenue),
      fansCountText: this.formatCount(anchor.fansCount),
      newFansText: `+${anchor.newFans}`,
      joinDateText: anchor.joinDate || '-'
    };

    this.setData({
      anchor: formattedAnchor,
      metrics: {
        revenueDeltaText: `${revenueChange >= 0 ? '+' : ''}${this.formatCurrency(revenueChange)}`,
        revenueTrendText: `${revenueChange >= 0 ? '增长' : '下降'} ${Math.abs(Number(revenuePercent))}%`,
        hoursDeltaText: `${hoursChange >= 0 ? '+' : ''}${hoursChange}h`,
        hoursTrendText: `${anchor.liveHours}h / 上月 ${anchor.lastMonthHours}h`
      },
      scheduleRecords,
      practiceRecords,
      growthTimeline: this.buildGrowthTimeline(formattedAnchor, practiceRecords, scheduleRecords, weeklyReport),
      hasPracticeRecords: practiceRecords.length > 0,
      hasScheduleRecords: scheduleRecords.length > 0,
      sourceType: 'mock',
      loading: false
    });
  },

  applyCloudCandidateDetail(candidate) {
    const basicInfo = candidate.basicInfo || {};
    const dailyRecords = Array.isArray(candidate.trainingCamp?.dailyRecords) ? candidate.trainingCamp.dailyRecords : [];
    const booking = candidate.trainingCamp?.danceCourseBooking || null;
    const payslipAmount = Number(candidate.commission?.payslip?.totalAmount || candidate.commission?.totalAmount || 0);
    const salary = Number(candidate.contract?.salary || 0);
    const fansCount = [
      Number(basicInfo.douyinFans || 0),
      Number(basicInfo.xiaohongshuFans || 0),
      Number(basicInfo.bilibiliFans || 0)
    ].find((item) => item > 0) || 0;

    const formattedAnchor = {
      id: candidate._id,
      name: basicInfo.name || '',
      artName: candidate.liveName || candidate.experience?.accountName || basicInfo.artName || basicInfo.name || '未命名主播',
      level: String(candidate.commission?.anchorLevel || candidate.rating?.grade || 'C').toUpperCase(),
      avatar: candidate.avatar || '',
      agentId: candidate.assignedAgent?.agentId || '',
      agentName: candidate.assignedAgent?.agentName || '待分配经纪人',
      platform: basicInfo.douyin ? '抖音' : basicInfo.xiaohongshu ? '小红书' : basicInfo.bilibili ? 'B站' : '-',
      status: candidate.status || 'signed',
      statusText: STATUS_MAP[candidate.status] || candidate.status || '未知状态',
      joinDate: candidate.contract?.signedDate || candidate.contract?.signedAt || candidate.updatedAt || candidate.createdAt || '',
      joinDateText: candidate.contract?.signedDate || candidate.contract?.signedAt || candidate.updatedAt || candidate.createdAt || '-',
      monthRevenueText: this.formatCurrency(payslipAmount || salary),
      lastMonthRevenueText: this.formatCurrency(salary),
      fansCountText: this.formatCount(fansCount),
      newFansText: '+0',
      liveHours: dailyRecords.length * 2,
      lastMonthHours: Math.max(0, dailyRecords.length * 2 - 4),
      talents: Array.isArray(candidate.talent?.mainTalents) ? candidate.talent.mainTalents : [],
      mbti: basicInfo.mbti || candidate.profile?.mbti || '-'
    };

    const practiceRecords = dailyRecords.slice(-3).reverse().map((item, index) => ({
      id: item.id || `record_${index}`,
      typeName: item.trainingType || item.typeName || '训练记录',
      scoreText: item.reviewScore ? `${item.reviewScore}/5` : (item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '未通过' : '待审核'),
      description: item.note || item.description || '已提交训练记录',
      date: item.recordDate || item.date || '-',
      time: item.recordTime || item.time || '',
      tutorName: item.reviewedByName || booking?.teacherName || '待点评',
      comment: item.reviewComment || ''
    }));

    const scheduleRecords = booking ? [{
      id: booking.slotId || 'booking',
      slotName: booking.slotLabel || '训练课程',
      statusText: booking.status === 'booked' || booking.status === 'confirmed' ? '已确认' : '待确认',
      dateTimeText: booking.summaryText || `${booking.slotDate || '-'} ${booking.slotStartTime || ''}-${booking.slotEndTime || ''}`,
      platform: formattedAnchor.platform,
      anchorName: formattedAnchor.artName,
      date: booking.slotDate || '-',
      startTime: booking.slotStartTime || '',
      endTime: booking.slotEndTime || ''
    }] : [];

    const growthTimeline = [
      {
        id: 'apply',
        date: candidate.createdAt || '-',
        title: '提交报名',
        desc: `${formattedAnchor.name || '候选人'} 完成报名，进入招募流程`
      },
      {
        id: 'signed',
        date: formattedAnchor.joinDateText,
        title: '完成签约',
        desc: `合同状态已确认，定级 ${formattedAnchor.level}，保底 ${this.formatCurrency(candidate.contract?.salary || 0)}`
      },
      ...(practiceRecords[0] ? [{
        id: 'training',
        date: practiceRecords[0].date,
        title: '训练营进展',
        desc: `${practiceRecords[0].typeName}：${practiceRecords[0].description}`
      }] : []),
      ...(scheduleRecords[0] ? [{
        id: 'booking',
        date: scheduleRecords[0].date,
        title: '课程/档期安排',
        desc: scheduleRecords[0].dateTimeText
      }] : []),
      {
        id: 'current',
        date: '当前',
        title: '当前状态',
        desc: `${formattedAnchor.statusText}，训练记录 ${dailyRecords.length} 条，${candidate.assignedAgent?.agentName ? `经纪人 ${candidate.assignedAgent.agentName}` : '待分配经纪人'}`
      }
    ];

    this.setData({
      anchor: formattedAnchor,
      metrics: {
        revenueDeltaText: candidate.commission?.status ? `佣金状态：${candidate.commission.status}` : '暂无佣金结算',
        revenueTrendText: candidate.commission?.anchorLevel ? `定级 ${candidate.commission.anchorLevel}` : '待定级',
        hoursDeltaText: `${dailyRecords.length} 条`,
        hoursTrendText: booking?.teacherName ? `当前老师：${booking.teacherName}` : '待排训练课程'
      },
      scheduleRecords,
      practiceRecords,
      growthTimeline,
      hasPracticeRecords: practiceRecords.length > 0,
      hasScheduleRecords: scheduleRecords.length > 0,
      sourceType: 'cloud',
      loading: false
    });
  },

  buildGrowthTimeline(anchor, practiceRecords, scheduleRecords, weeklyReport) {
    const timeline = [
      {
        id: 'joined',
        date: anchor.joinDate || '-',
        title: '加入团队',
        desc: `${anchor.artName} 正式进入${anchor.platform}运营体系，当前等级 ${anchor.level}`
      }
    ];

    if (weeklyReport) {
      timeline.push({
        id: 'report',
        date: weeklyReport.weekEnd,
        title: '阶段周报',
        desc: `周流水 ${this.formatCurrency(weeklyReport.revenue)}，新增粉丝 ${weeklyReport.newFans}，经纪人反馈：${weeklyReport.agentComment}`
      });
    }

    if (practiceRecords[0]) {
      timeline.push({
        id: 'practice',
        date: practiceRecords[0].date,
        title: '最近训练反馈',
        desc: `${practiceRecords[0].typeName} ${practiceRecords[0].scoreText}，${practiceRecords[0].comment || practiceRecords[0].description}`
      });
    }

    if (scheduleRecords[0]) {
      timeline.push({
        id: 'schedule',
        date: scheduleRecords[0].date,
        title: '最近排班',
        desc: `${scheduleRecords[0].slotName} · ${scheduleRecords[0].startTime}-${scheduleRecords[0].endTime} · ${scheduleRecords[0].statusText}`
      });
    }

    timeline.push({
      id: 'current',
      date: '当前',
      title: '当前经营状态',
      desc: `${anchor.statusText}，本月流水 ${this.formatCurrency(anchor.monthRevenue)}，直播时长 ${anchor.liveHours}h`
    });

    return timeline.map((item, index) => ({
      ...item,
      showLine: index !== timeline.length - 1
    }));
  },

  formatCurrency(value) {
    const amount = Number(value || 0);
    return `¥${amount.toLocaleString('zh-CN')}`;
  },

  formatCount(value) {
    const count = Number(value || 0);
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}w`;
    }
    return `${count}`;
  },

  showError(message) {
    this.setData({ loading: false });
    wx.showToast({
      title: message,
      icon: 'none'
    });
  }
});
