/**
 * HR面试官分配页面
 * 功能：为候选人分配面试官、设置面试时间地点
 */

import { getCandidateById, setInterviewSchedule, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';
import { getUsersByRole, ROLE } from '../../../mock/users.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    todayDate: '',
    fromHRReview: false, // 标记是否来自HR审核页

    // 表单数据
    formData: {
      date: '',
      time: '',
      location: '公司会议室',
      selectedInterviewers: {} // {userId: {id, role, name}}
    },

    // 面试官列表
    photographers: [],
    danceTeachers: [],
    makeupArtists: [],
    stylists: []
  },

  onLoad(options) {
    const { candidateId, from } = options;
    if (!candidateId) {
      wx.showToast({
        title: '候选人ID缺失',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      candidateId,
      fromHRReview: from === 'hr-review', // 标记是否来自HR审核
      todayDate: this.getTodayDate()
    });

    this.loadCandidateInfo();
    this.loadInterviewers();
  },

  /**
   * 获取今天日期
   */
  getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 加载候选人信息
   */
  loadCandidateInfo() {
    const candidate = getCandidateById(this.data.candidateId);
    if (!candidate) {
      wx.showToast({
        title: '候选人不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 添加状态标签
    const statusLabels = {
      [CANDIDATE_STATUS.PENDING]: '待审核',
      [CANDIDATE_STATUS.INTERVIEW_SCHEDULED]: '已安排面试',
      [CANDIDATE_STATUS.ONLINE_TEST_COMPLETED]: '已完成测试',
      [CANDIDATE_STATUS.PENDING_RATING]: '待评级',
      [CANDIDATE_STATUS.RATED]: '已评级',
      [CANDIDATE_STATUS.SIGNED]: '已签约',
      [CANDIDATE_STATUS.REJECTED]: '已拒绝'
    };

    candidate.statusLabel = statusLabels[candidate.status] || candidate.status;

    this.setData({
      candidate
    });
  },

  /**
   * 加载面试官列表
   */
  loadInterviewers() {
    const photographers = getUsersByRole(ROLE.PHOTOGRAPHER);
    const danceTeachers = getUsersByRole(ROLE.DANCE_TEACHER);
    const makeupArtists = getUsersByRole(ROLE.MAKEUP_ARTIST);
    const stylists = getUsersByRole(ROLE.STYLIST);

    this.setData({
      photographers,
      danceTeachers,
      makeupArtists,
      stylists
    });

    console.log('[面试官分配] 面试官列表加载完成:', {
      photographers: photographers.length,
      danceTeachers: danceTeachers.length,
      makeupArtists: makeupArtists.length,
      stylists: stylists.length
    });
  },

  /**
   * 日期选择
   */
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
  },

  /**
   * 时间选择
   */
  onTimeChange(e) {
    this.setData({
      'formData.time': e.detail.value
    });
  },

  /**
   * 地点输入
   */
  onLocationInput(e) {
    this.setData({
      'formData.location': e.detail.value
    });
  },

  /**
   * 切换面试官选择
   */
  onToggleInterviewer(e) {
    const { id, role, name } = e.currentTarget.dataset;
    const selectedInterviewers = { ...this.data.formData.selectedInterviewers };

    if (selectedInterviewers[id]) {
      // 取消选择
      delete selectedInterviewers[id];
    } else {
      // 选择
      selectedInterviewers[id] = {
        id,
        role,
        name
      };
    }

    this.setData({
      'formData.selectedInterviewers': selectedInterviewers
    });
  },

  /**
   * 提交分配
   */
  onSubmit() {
    const { date, time, location, selectedInterviewers } = this.data.formData;

    // 1. 表单验证
    if (!date) {
      wx.showToast({
        title: '请选择面试日期',
        icon: 'none'
      });
      return;
    }

    if (!time) {
      wx.showToast({
        title: '请选择面试时间',
        icon: 'none'
      });
      return;
    }

    if (!location.trim()) {
      wx.showToast({
        title: '请输入面试地点',
        icon: 'none'
      });
      return;
    }

    const interviewersList = Object.values(selectedInterviewers);
    if (interviewersList.length === 0) {
      wx.showToast({
        title: '请至少选择1位面试官',
        icon: 'none'
      });
      return;
    }

    // 2. 构建面试安排数据
    const scheduleData = {
      date,
      time,
      location: location.trim(),
      interviewers: interviewersList,
      scheduledBy: wx.getStorageSync('user_info')?.id || 'HR001',
      scheduledAt: new Date().toLocaleString('zh-CN')
    };

    // 3. 保存面试安排
    wx.showLoading({
      title: '保存中...'
    });

    const success = setInterviewSchedule(this.data.candidateId, scheduleData);

    if (success) {
      // 4. 更新候选人状态
      updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.INTERVIEW_SCHEDULED);

      wx.hideLoading();
      wx.showToast({
        title: '面试安排成功',
        icon: 'success'
      });

      // 5. 根据来源决定返回逻辑
      setTimeout(() => {
        if (this.data.fromHRReview) {
          // 从HR审核页来的，返回两层到HR工作台
          wx.navigateBack({ delta: 2 });
        } else {
          // 正常进入的，返回一层
          wx.navigateBack();
        }
      }, 1500);

      console.log('[面试官分配] 分配成功:', {
        candidateId: this.data.candidateId,
        date,
        time,
        interviewersCount: interviewersList.length,
        fromHRReview: this.data.fromHRReview
      });
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  }
});
