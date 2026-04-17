import { requireAgentLogin } from '../../../utils/agent-auth.js';
import {
  cancelDanceCourseSlot,
  createDanceCourseSlot,
  listDanceCourseSlots,
  updateDanceCourseSlot
} from '../../../utils/interview-api.js';

function formatSlot(slot = {}) {
  return {
    ...slot,
    summaryText: `${slot.courseDate || '-'} ${slot.startTime || ''}-${slot.endTime || ''}`.trim(),
    capacityText: `${slot.bookedCount || 0}/${slot.capacity || 1}`,
    modeLabel: slot.modeLabel || (slot.courseMode === '1vn' ? '多人训练课' : '1V1'),
    waitlistText: slot.waitlistCount > 0 ? `${slot.waitlistCount} 人候补` : '',
    bookingNames: (Array.isArray(slot.bookings) ? slot.bookings : [])
      .map((item) => item?.candidateName)
      .filter(Boolean)
      .join('、')
  };
}

Page({
  data: {
    loading: false,
    submitting: false,
    slots: [],
    courseModeOptions: ['1V1', '多人训练课'],
    form: {
      slotId: '',
      courseDate: '',
      startTime: '14:00',
      endTime: '16:00',
      courseMode: '1v1',
      capacity: '1',
      location: '',
      note: ''
    }
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: ['dance_teacher'],
      redirectUrl: '/pages/dance-teacher/schedule/schedule'
    })) {
      return;
    }

    this.loadSlots();
  },

  onShow() {
    this.loadSlots();
  },

  async onPullDownRefresh() {
    await this.loadSlots();
    wx.stopPullDownRefresh();
  },

  async loadSlots() {
    this.setData({ loading: true });

    try {
      const result = await listDanceCourseSlots();
      this.setData({
        slots: Array.isArray(result.data?.list) ? result.data.list.map((item) => formatSlot(item)) : [],
        loading: false
      });
    } catch (error) {
      console.error('[课程表] 加载失败:', error);
      this.setData({
        slots: [],
        loading: false
      });
      wx.showToast({
        title: error.message || '加载课程表失败',
        icon: 'none'
      });
    }
  },

  bindDateChange(e) {
    this.setData({
      'form.courseDate': e.detail.value
    });
  },

  bindStartTimeChange(e) {
    this.setData({
      'form.startTime': e.detail.value
    });
  },

  bindEndTimeChange(e) {
    this.setData({
      'form.endTime': e.detail.value
    });
  },

  bindCourseModeChange(e) {
    const index = Number(e.detail.value || 0);
    const courseMode = index === 1 ? '1vn' : '1v1';
    this.setData({
      'form.courseMode': courseMode,
      'form.capacity': courseMode === '1v1' ? '1' : (this.data.form.capacity || '2')
    });
  },

  bindCapacityInput(e) {
    this.setData({
      'form.capacity': String(e.detail.value || '').replace(/[^\d]/g, '').slice(0, 2)
    });
  },

  bindLocationInput(e) {
    this.setData({
      'form.location': e.detail.value
    });
  },

  bindNoteInput(e) {
    this.setData({
      'form.note': e.detail.value
    });
  },

  resetForm() {
    this.setData({
      form: {
        slotId: '',
        courseDate: '',
        startTime: '14:00',
        endTime: '16:00',
        courseMode: '1v1',
        capacity: '1',
        location: '',
        note: ''
      }
    });
  },

  editSlot(e) {
    const { slotId } = e.currentTarget.dataset;
    const slot = this.data.slots.find((item) => item._id === slotId);

    if (!slot) {
      return;
    }

    this.setData({
      form: {
        slotId: slot._id,
        courseDate: slot.courseDate || '',
        startTime: slot.startTime || '14:00',
        endTime: slot.endTime || '16:00',
        courseMode: slot.courseMode || '1v1',
        capacity: String(slot.capacity || 1),
        location: slot.location || '',
        note: slot.note || ''
      }
    });
  },

  async submitSlot() {
    const { form, submitting } = this.data;
    if (submitting) {
      return;
    }

    if (!form.courseDate || !form.startTime || !form.endTime) {
      wx.showToast({
        title: '请填写完整日期和时间',
        icon: 'none'
      });
      return;
    }

    const payload = {
      slotId: form.slotId,
      courseDate: form.courseDate,
      startTime: form.startTime,
      endTime: form.endTime,
      courseMode: form.courseMode || '1v1',
      capacity: Number((form.courseMode === '1v1' ? 1 : form.capacity) || 1),
      location: form.location,
      note: form.note
    };

    this.setData({ submitting: true });

    try {
      if (form.slotId) {
        await updateDanceCourseSlot(payload);
        wx.showToast({ title: '课程已更新', icon: 'success' });
      } else {
        await createDanceCourseSlot(payload);
        wx.showToast({ title: '课程已创建', icon: 'success' });
      }

      this.resetForm();
      await this.loadSlots();
    } catch (error) {
      console.error('[课程表] 保存失败:', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async cancelSlot(e) {
    const { slotId } = e.currentTarget.dataset;
    if (!slotId) {
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '取消课程',
        content: '取消后该时段不再对经纪人开放预约，确定继续吗？',
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false)
      });
    });

    if (!confirm) {
      return;
    }

    try {
      await cancelDanceCourseSlot({ slotId });
      wx.showToast({ title: '已取消', icon: 'success' });
      await this.loadSlots();
    } catch (error) {
      console.error('[课程表] 取消失败:', error);
      wx.showToast({
        title: error.message || '取消失败',
        icon: 'none'
      });
    }
  }
});
