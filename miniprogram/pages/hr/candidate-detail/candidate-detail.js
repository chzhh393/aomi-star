// pages/hr/candidate-detail/candidate-detail.js
import {
  getCandidateById,
  submitHRReview
} from '../../../mock/candidates.js';

import {
  getEmployeesByRole,
  EMPLOYEE_ROLE
} from '../../../mock/employees.js';

Page({
  data: {
    candidate: null,

    // 审核表单
    reviewForm: {
      result: 'pass', // pass | reject
      comment: '',
      suggestedSalary: '',
      interviewDate: '',
      interviewTime: '',
      interviewLocation: '',
      interviewRequirements: ''
    },

    resultOptions: [
      { value: 'pass', label: '通过' },
      { value: 'reject', label: '拒绝' }
    ],
    resultIndex: 0,

    // 今日日期（用于日期选择器的起始日期）
    todayDate: '',

    // 面试官列表
    photographerList: [],
    danceTeacherList: [],
    makeupArtistList: [],
    stylistList: [],
    agentList: [],

    // 已选择的面试官索引
    photographerIndex: -1,
    danceTeacherIndex: -1,
    makeupArtistIndex: -1,
    stylistIndex: -1,
    agentIndex: -1
  },

  onLoad(options) {
    const { id } = options;

    // 设置今日日期
    const today = new Date();
    const todayStr = this.formatDate(today);
    this.setData({ todayDate: todayStr });

    // 加载员工数据
    this.loadEmployeeData();

    // 加载候选人数据
    if (id) {
      this.loadCandidateData(id);
    } else {
      wx.showToast({
        title: '候选人不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载员工数据
   */
  loadEmployeeData() {
    const photographerList = getEmployeesByRole(EMPLOYEE_ROLE.PHOTOGRAPHER);
    const danceTeacherList = getEmployeesByRole(EMPLOYEE_ROLE.DANCE_TEACHER);
    const makeupArtistList = getEmployeesByRole(EMPLOYEE_ROLE.MAKEUP_ARTIST);
    const stylistList = getEmployeesByRole(EMPLOYEE_ROLE.STYLIST);
    const agentList = getEmployeesByRole(EMPLOYEE_ROLE.AGENT);

    // 转换数据格式，添加name字段供picker使用
    const formatEmployees = (employees) => {
      return employees.map(emp => ({
        id: emp.id,
        name: emp.profile.name || emp.profile.nickname || emp.id,
        role: emp.role,
        level: emp.profile.level,
        workload: emp.workload
      }));
    };

    this.setData({
      photographerList: formatEmployees(photographerList),
      danceTeacherList: formatEmployees(danceTeacherList),
      makeupArtistList: formatEmployees(makeupArtistList),
      stylistList: formatEmployees(stylistList),
      agentList: formatEmployees(agentList)
    });

    console.log('[HR详情] 员工列表加载完成:', {
      摄像师: this.data.photographerList.length,
      舞蹈导师: this.data.danceTeacherList.length,
      化妆师: this.data.makeupArtistList.length,
      造型师: this.data.stylistList.length,
      经纪人: this.data.agentList.length
    });
  },

  /**
   * 加载候选人数据
   */
  loadCandidateData(id) {
    const candidate = getCandidateById(id);

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

    // 如果候选人不是待审核状态，提示
    if (candidate.status !== 'pending') {
      wx.showModal({
        title: '提示',
        content: `该候选人当前状态为"${this.getStatusText(candidate.status)}"，已经完成HR审核。`,
        showCancel: false
      });
    }

    // 如果已经有HR审核记录，预填表单
    let reviewForm = { ...this.data.reviewForm };
    if (candidate.hrReview) {
      reviewForm = {
        result: candidate.hrReview.result || 'pass',
        comment: candidate.hrReview.comment || '',
        suggestedSalary: candidate.hrReview.suggestedSalary || '',
        interviewDate: '',
        interviewTime: '',
        interviewLocation: '',
        interviewRequirements: ''
      };
    }

    // 计算 resultIndex
    const resultIndex = this.data.resultOptions.findIndex(
      item => item.value === reviewForm.result
    );

    this.setData({
      candidate,
      reviewForm,
      resultIndex: resultIndex >= 0 ? resultIndex : 0
    });

    console.log('[HR详情] 候选人数据加载完成:', {
      id: candidate.id,
      name: candidate.basicInfo.name,
      status: candidate.status
    });
  },

  /**
   * 表单输入
   */
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`reviewForm.${field}`]: value
    });
  },

  /**
   * 选择审核结果
   */
  onResultChange(e) {
    const index = e.detail.value;
    const result = this.data.resultOptions[index].value;
    this.setData({
      'reviewForm.result': result,
      resultIndex: index
    });

    console.log('[HR详情] 审核结果变更:', result);
  },

  /**
   * 选择面试官
   */
  onInterviewerChange(e) {
    const { role } = e.currentTarget.dataset;
    const index = parseInt(e.detail.value);

    const indexMap = {
      'photographer': 'photographerIndex',
      'dance_teacher': 'danceTeacherIndex',
      'makeup_artist': 'makeupArtistIndex',
      'stylist': 'stylistIndex',
      'agent': 'agentIndex'
    };

    const listMap = {
      'photographer': 'photographerList',
      'dance_teacher': 'danceTeacherList',
      'makeup_artist': 'makeupArtistList',
      'stylist': 'stylistList',
      'agent': 'agentList'
    };

    if (indexMap[role] && listMap[role]) {
      this.setData({
        [indexMap[role]]: index
      });

      const employee = this.data[listMap[role]][index];
      console.log('[HR详情] 选择面试官:', {
        角色: role,
        姓名: employee.name,
        ID: employee.id
      });
    }
  },

  /**
   * 选择面试日期
   */
  onDateChange(e) {
    this.setData({
      'reviewForm.interviewDate': e.detail.value
    });
    console.log('[HR详情] 选择面试日期:', e.detail.value);
  },

  /**
   * 选择面试时间
   */
  onTimeChange(e) {
    this.setData({
      'reviewForm.interviewTime': e.detail.value
    });
    console.log('[HR详情] 选择面试时间:', e.detail.value);
  },

  /**
   * 提交审核
   */
  submitReview() {
    const { candidate, reviewForm } = this.data;

    // 基础验证
    if (!reviewForm.comment || reviewForm.comment.trim() === '') {
      wx.showToast({
        title: '请填写审核意见',
        icon: 'none'
      });
      return;
    }

    // 如果审核通过，需要验证面试安排
    if (reviewForm.result === 'pass') {
      const validation = this.validateInterviewSchedule();
      if (!validation.valid) {
        wx.showToast({
          title: validation.message,
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }

    // 确认对话框
    wx.showModal({
      title: '确认提交',
      content: `确认${reviewForm.result === 'pass' ? '通过' : '拒绝'}该候选人？`,
      success: (res) => {
        if (res.confirm) {
          this.doSubmitReview();
        }
      }
    });
  },

  /**
   * 验证面试安排是否完整
   */
  validateInterviewSchedule() {
    const {
      reviewForm,
      photographerIndex,
      danceTeacherIndex,
      makeupArtistIndex,
      stylistIndex,
      agentIndex
    } = this.data;

    // 验证5位面试官是否都已选择
    if (photographerIndex < 0) {
      return { valid: false, message: '请选择摄像师' };
    }
    if (danceTeacherIndex < 0) {
      return { valid: false, message: '请选择舞蹈导师' };
    }
    if (makeupArtistIndex < 0) {
      return { valid: false, message: '请选择化妆师' };
    }
    if (stylistIndex < 0) {
      return { valid: false, message: '请选择造型师' };
    }
    if (agentIndex < 0) {
      return { valid: false, message: '请选择经纪人' };
    }

    // 验证面试日期
    if (!reviewForm.interviewDate) {
      return { valid: false, message: '请选择面试日期' };
    }

    // 验证面试时间
    if (!reviewForm.interviewTime) {
      return { valid: false, message: '请选择面试时间' };
    }

    // 验证面试地点
    if (!reviewForm.interviewLocation || reviewForm.interviewLocation.trim() === '') {
      return { valid: false, message: '请填写面试地点' };
    }

    return { valid: true };
  },

  /**
   * 执行提交审核
   */
  doSubmitReview() {
    const { candidate, reviewForm } = this.data;
    const app = getApp();
    const currentUser = wx.getStorageSync('user_info');

    if (!currentUser || !currentUser.id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      // 构建审核数据
      const reviewData = {
        result: reviewForm.result,
        comment: reviewForm.comment,
        reviewerId: currentUser.id,
        reviewerName: currentUser.profile?.name || currentUser.id,
        suggestedSalary: reviewForm.suggestedSalary
      };

      // 如果审核通过，添加面试安排
      if (reviewForm.result === 'pass') {
        const interviewers = this.buildInterviewersList();

        reviewData.interviewSchedule = {
          date: reviewForm.interviewDate,
          time: reviewForm.interviewTime,
          location: reviewForm.interviewLocation,
          requirements: reviewForm.interviewRequirements,
          interviewers: interviewers
        };
      }

      // 调用submitHRReview函数
      const result = submitHRReview(candidate.id, reviewData);

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '审核提交成功',
          icon: 'success',
          duration: 2000
        });

        console.log('[HR详情] 审核提交成功:', {
          candidateId: candidate.id,
          result: reviewForm.result,
          newStatus: result.status
        });

        // 延迟返回列表页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error('提交失败');
      }

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
      console.error('[HR详情] 审核提交失败:', error);
    }
  },

  /**
   * 构建面试官列表
   */
  buildInterviewersList() {
    const {
      photographerList,
      danceTeacherList,
      makeupArtistList,
      stylistList,
      agentList,
      photographerIndex,
      danceTeacherIndex,
      makeupArtistIndex,
      stylistIndex,
      agentIndex
    } = this.data;

    const interviewers = [];

    if (photographerIndex >= 0 && photographerList[photographerIndex]) {
      const emp = photographerList[photographerIndex];
      interviewers.push({
        id: emp.id,
        role: 'photographer',
        name: emp.name
      });
    }

    if (danceTeacherIndex >= 0 && danceTeacherList[danceTeacherIndex]) {
      const emp = danceTeacherList[danceTeacherIndex];
      interviewers.push({
        id: emp.id,
        role: 'dance_teacher',
        name: emp.name
      });
    }

    if (makeupArtistIndex >= 0 && makeupArtistList[makeupArtistIndex]) {
      const emp = makeupArtistList[makeupArtistIndex];
      interviewers.push({
        id: emp.id,
        role: 'makeup_artist',
        name: emp.name
      });
    }

    if (stylistIndex >= 0 && stylistList[stylistIndex]) {
      const emp = stylistList[stylistIndex];
      interviewers.push({
        id: emp.id,
        role: 'stylist',
        name: emp.name
      });
    }

    if (agentIndex >= 0 && agentList[agentIndex]) {
      const emp = agentList[agentIndex];
      interviewers.push({
        id: emp.id,
        role: 'agent',
        name: emp.name
      });
    }

    return interviewers;
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusTexts = {
      'pending': '待HR审核',
      'interview_scheduled': '已安排面试',
      'online_test_completed': '线上测试完成',
      'pending_rating': '待评级',
      'rated': '已评级',
      'signed': '已签约',
      'training': '培训中',
      'active': '正式主播',
      'rejected': '未通过'
    };
    return statusTexts[status] || '未知状态';
  },

  /**
   * 查看图片
   */
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  }
});
