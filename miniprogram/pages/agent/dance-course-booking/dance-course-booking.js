import { requireAgentLogin } from '../../../utils/agent-auth.js';
import {
  bookDanceCourseSlot,
  getCandidateDetail,
  listDanceCourseSlots
} from '../../../utils/agent-api.js';

function formatDanceCourseSlot(slot = {}) {
  const bookings = Array.isArray(slot.bookings) ? slot.bookings : [];
  const bookedNames = bookings
    .map((item) => item?.candidateName)
    .filter(Boolean)
    .slice(0, 3)
    .join('、');

  return {
    ...slot,
    summaryText: `${slot.courseDate || '-'} ${slot.startTime || ''}-${slot.endTime || ''}`.trim(),
    locationText: slot.location || '待补充上课地点',
    capacityText: `${slot.bookedCount || 0}/${slot.capacity || 1}`,
    bookedNames,
    modeLabel: slot.modeLabel || (slot.courseMode === '1vn' ? '多人训练课' : '1V1'),
    waitlistText: slot.waitlistCount > 0 ? `${slot.waitlistCount} 人候补` : '',
    actionText: slot.courseMode === '1v1' && slot.isFull ? '加入候补' : '预约该时段'
  };
}

function formatDanceCourseBooking(booking = {}) {
  if (!booking || !booking.slotId) {
    return null;
  }

  return {
    ...booking,
    summaryText: `${booking.courseDate || '-'} ${booking.startTime || ''}-${booking.endTime || ''}`.trim(),
    locationText: booking.location || '待补充上课地点',
    modeLabel: booking.courseMode === '1vn' ? '多人训练课' : '1V1',
    statusLabel: booking.status === 'waitlisted' ? '候补中' : '已预约'
  };
}

function formatCourseDateLabel(value) {
  const matched = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return String(value || '未排期');
  }

  return `${matched[2]}-${matched[3]}`;
}

Page({
  data: {
    candidateId: '',
    candidate: null,
    loading: false,
    bookingSubmitting: false,
    groupedDanceCourseSlots: [],
    danceCourseBooking: null,
    canBookDanceCourse: false
  },

  onLoad(options) {
    if (!requireAgentLogin()) {
      return;
    }

    if (!options.id) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1200);
      return;
    }

    this.setData({ candidateId: options.id });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const [detailResult, danceCourseResult] = await Promise.all([
        getCandidateDetail(this.data.candidateId),
        listDanceCourseSlots().catch((error) => {
          console.warn('[舞蹈训练预约] 舞蹈课程表加载失败:', error);
          return { list: [] };
        })
      ]);

      const candidate = detailResult.candidate;
      const currentBooking = formatDanceCourseBooking(candidate.trainingCamp?.danceCourseBooking);
      const canBookDanceCourse = this.canBookDanceCourse(candidate);
      const slots = this.filterDanceCourseSlots(Array.isArray(danceCourseResult?.list) ? danceCourseResult.list : [])
        .map((item) => formatDanceCourseSlot(item));

      this.setData({
        candidate,
        danceCourseBooking: currentBooking,
        canBookDanceCourse,
        groupedDanceCourseSlots: this.groupDanceCourseSlots(slots),
        loading: false
      });
    } catch (error) {
      console.error('[舞蹈训练预约] 加载失败:', error);
      this.setData({ loading: false });
      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载训练课信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  canBookDanceCourse(candidate) {
    if (!candidate) return false;

    const hasAssignedAgent = Boolean(candidate.assignedAgent?.agentId);
    const decisionAccepted = candidate.interviewFinalDecision?.decision === 'accepted';
    const status = candidate.status || '';

    return Boolean(
      hasAssignedAgent &&
      (
        decisionAccepted ||
        ['rated', 'signed', 'training', 'active'].includes(status)
      )
    );
  },

  filterDanceCourseSlots(slots = []) {
    return slots.filter((item) => Boolean(item && item.status !== 'cancelled'));
  },

  groupDanceCourseSlots(slots = []) {
    const dateMap = new Map();

    slots
      .slice()
      .sort((a, b) => {
        const dateCompare = String(a.courseDate || '').localeCompare(String(b.courseDate || ''));
        if (dateCompare !== 0) return dateCompare;
        const teacherCompare = String(a.teacherName || '').localeCompare(String(b.teacherName || ''));
        if (teacherCompare !== 0) return teacherCompare;
        return String(a.startTime || '').localeCompare(String(b.startTime || ''));
      })
      .forEach((slot) => {
        const dateKey = String(slot.courseDate || '未排期');
        const teacherKey = String(slot.teacherId || slot.teacherName || 'unknown');

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            dateKey,
            dateLabel: formatCourseDateLabel(dateKey),
            teacherCount: 0,
            teachers: []
          });
        }

        const dateGroup = dateMap.get(dateKey);
        let teacherGroup = dateGroup.teachers.find((item) => item.teacherKey === teacherKey);
        if (!teacherGroup) {
          teacherGroup = {
            teacherKey,
            teacherName: slot.teacherName || '未命名舞蹈老师',
            slotCount: 0,
            slots: []
          };
          dateGroup.teachers.push(teacherGroup);
        }

        teacherGroup.slots.push(slot);
        teacherGroup.slotCount += 1;
      });

    return Array.from(dateMap.values()).map((group) => ({
      ...group,
      teacherCount: group.teachers.length
    }));
  },

  async bookDanceCourse(e) {
    const { slotId } = e.currentTarget.dataset;
    const { candidate, candidateId, groupedDanceCourseSlots, bookingSubmitting } = this.data;

    if (bookingSubmitting || !slotId || !candidate) {
      return;
    }

    let slot = null;
    groupedDanceCourseSlots.some((dateGroup) => {
      return dateGroup.teachers.some((teacherGroup) => {
        const matched = teacherGroup.slots.find((item) => item._id === slotId);
        if (matched) {
          slot = matched;
          return true;
        }
        return false;
      });
    });
    if (!slot) {
      wx.showToast({ title: '课程不存在', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认预约',
        content: `确认给${candidate.basicInfo?.name || '该主播'}预约 ${slot.summaryText} 吗？`,
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false)
      });
    });

    if (!confirm) {
      return;
    }

    this.setData({ bookingSubmitting: true });
    try {
      await bookDanceCourseSlot(candidateId, slotId);
      await this.loadData();
    } catch (error) {
      console.error('[舞蹈训练预约] 预约失败:', error);
    } finally {
      this.setData({ bookingSubmitting: false });
    }
  },

  onShow() {
    if (this.data.candidateId && this.data.candidate && !this.data.loading) {
      this.loadData();
    }
  },

  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  }
});
