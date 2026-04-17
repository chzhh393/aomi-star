// pages/recruit/status/status.js
// 报名状态页

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatInviteDateTime(startDate, startTime) {
  const matched = String(startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeText = String(startTime || '').trim();
  if (!matched) {
    return [String(startDate || '').trim(), `${String(startDate || '').trim()} ${timeText}`.trim()].filter(Boolean);
  }

  const month = String(Number(matched[2]));
  const day = String(Number(matched[3]));
  const dateText = `${month}月${day}日`;
  return [dateText + timeText, `${dateText} ${timeText}`.trim(), startDate].filter(Boolean);
}

function normalizeTrainingCampType(campType) {
  const normalized = String(campType || '').trim();
  if (normalized === '基础训练营') {
    return '新星训练营';
  }
  return normalized;
}

function highlightFirst(html, keyword) {
  if (!html || !keyword) {
    return html;
  }

  const reg = new RegExp(escapeRegExp(keyword));
  return html.replace(reg, `<span style="display:inline-block;padding:2px 10px;margin:0 4px;border-radius:999px;background:#fff0c2;color:#b45309;font-weight:700;border:1px solid #f59e0b;">${escapeHtml(keyword)}</span>`);
}

function buildInvitationRichText(content, campType, startDate, startTime) {
  const normalizedCampType = normalizeTrainingCampType(campType);
  const normalizedContent = String(content || '').replace(/基础训练营/g, '新星训练营');
  let html = escapeHtml(normalizedContent).replace(/\n/g, '<br/>');
  html = highlightFirst(html, normalizedCampType);

  const timeCandidates = formatInviteDateTime(startDate, startTime);
  for (const keyword of timeCandidates) {
    const nextHtml = highlightFirst(html, keyword);
    if (nextHtml !== html) {
      html = nextHtml;
      break;
    }
  }

  return html;
}

function syncAnchorIdentity(candidate = {}) {
  const user = wx.getStorageSync('user_info') || {};
  if (!user || !candidate) {
    return;
  }

  const isAnchor = ['signed', 'training', 'active'].includes(candidate.status);
  wx.setStorageSync('user_info', {
    ...user,
    userType: isAnchor ? 'anchor' : 'candidate',
    role: isAnchor ? 'anchor' : 'candidate',
    candidateInfo: {
      ...(user.candidateInfo || {}),
      candidateId: candidate._id || user.candidateInfo?.candidateId || '',
      candidateNo: candidate.candidateNo || user.candidateInfo?.candidateNo || '',
      status: candidate.status || ''
    }
  });
}

Page({
  data: {
    candidate: null,
    loading: true,
    currentStep: 0,
    canHandleTrainingCampTodo: false,
    trainingCampTodoStatusText: '',
    displayCampType: '',
    invitationRichText: '',

    // 进度步骤
    statusSteps: [
      { key: 'pending', label: '待审核', icon: '📝' },
      { key: 'approved', label: '已审核，待面试安排', icon: '✅' },
      { key: 'interview_scheduled', label: '已安排面试', icon: '📅' },
      { key: 'pending_rating', label: '待评级', icon: '📊' },
      { key: 'rated', label: '已评级', icon: '🏅' },
      { key: 'signed', label: '已签约', icon: '✍️' }
    ],

    // 状态信息
    statusInfo: {
      title: '',
      desc: ''
    }
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadCandidateData(id);
    } else {
      this.loadFromCloud();
    }
  },

  onPullDownRefresh() {
    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      this.loadCandidateData(candidateId);
    } else {
      this.loadFromCloud();
    }
  },

  // 从云端加载候选人数据
  async loadFromCloud() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      if (res.result && res.result.success && res.result.candidate) {
        const candidate = res.result.candidate;
        wx.setStorageSync('myCandidateId', candidate.candidateNo || candidate._id);
        this.processCandidate(candidate);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '未找到报名信息',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('[状态页] 云端查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    }

    wx.stopPullDownRefresh();
  },

  // 加载候选人数据（通过ID）
  async loadCandidateData(id) {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'get',
          data: { id: id }
        }
      });

      if (res.result && res.result.success && res.result.candidate) {
        this.processCandidate(res.result.candidate);
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: '报名信息不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('[状态页] 查询失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    }

    wx.stopPullDownRefresh();
  },

  // 处理候选人数据
  processCandidate(candidate) {
    syncAnchorIdentity(candidate);
    // 计算审核进度
    let currentStep = 0;
    if (candidate.status === 'pending') currentStep = 1;
    else if (candidate.status === 'approved') currentStep = 2;
    else if (candidate.status === 'interview_scheduled') currentStep = 3;
    else if (candidate.status === 'online_test_completed' || candidate.status === 'pending_rating') currentStep = 4;
    else if (candidate.status === 'rated') currentStep = 5;
    else if (candidate.status === 'signed' ||
             candidate.status === 'training' ||
             candidate.status === 'active') currentStep = 6;

    // 生成状态信息
    const statusInfo = this.generateStatusInfo(candidate.status);

    this.setData({
      candidate,
      currentStep,
      statusInfo,
      canHandleTrainingCampTodo: Boolean(candidate.trainingCampTodo && candidate.trainingCampTodo.status === 'pending'),
      trainingCampTodoStatusText: this.getTrainingCampTodoStatusText(candidate.trainingCampTodo),
      displayCampType: normalizeTrainingCampType(candidate.trainingCampTodo?.campType),
      invitationRichText: buildInvitationRichText(
        candidate.trainingCampTodo?.invitationContent,
        candidate.trainingCampTodo?.campType,
        candidate.trainingCampTodo?.startDate,
        candidate.trainingCampTodo?.startTime
      ),
      loading: false
    });
  },

  getTrainingCampTodoStatusText(todo) {
    const map = {
      pending: '待处理',
      confirmed: '已确认入营',
      rejected: '已拒绝入营'
    };
    return map[todo?.status] || '暂无待办';
  },

  // 生成状态信息
  generateStatusInfo(status) {
    const infoMap = {
      'pending': {
        title: '报名成功，等待审核',
        desc: '经纪人将在1-2个工作日内审核您的资料，请耐心等待'
      },
      'approved': {
        title: '审核通过，等待面试安排',
        desc: '恭喜！您的资料已通过审核，HR将尽快为您安排面试'
      },
      'interview_scheduled': {
        title: '面试已安排',
        desc: '恭喜！HR已为您安排了面试，请按时参加'
      },
      'online_test_completed': {
        title: '线上测试已完成',
        desc: '您的线上测试资料已提交，正在进入下一步流程'
      },
      'pending_rating': {
        title: '资料审核中',
        desc: '面试资料已齐备，系统和团队正在进行综合评级'
      },
      'rated': {
        title: '评级已完成',
        desc: '您的综合评级已完成，经纪人会为您安排训练营与后续入营事项'
      },
      'signed': {
        title: '恭喜签约成功！',
        desc: '欢迎加入我们！您现在可以进入主播工作台了'
      },
      'training': {
        title: '培训进行中',
        desc: '您正在接受专业培训，加油！'
      },
      'active': {
        title: '您已正式成为主播',
        desc: '开启您的直播之旅吧！'
      },
      'rejected': {
        title: '很遗憾，审核未通过',
        desc: '感谢您的申请，期待未来有机会合作'
      }
    };

    return infoMap[status] || {
      title: '状态更新中',
      desc: status ? `当前状态：${status}` : '报名记录存在，但状态字段暂未同步'
    };
  },

  // 查看面试邀请详情
  viewInterviewInvite() {
    const { candidate } = this.data;
    const id = candidate.candidateNo || candidate._id || wx.getStorageSync('myCandidateId');
    if (id) {
      wx.navigateTo({
        url: `/pages/recruit/interview-invite/interview-invite?id=${id}`
      });
    }
  },

  // 查看报名详情
  viewDetail() {
    const { candidate } = this.data;
    const id = candidate.candidateNo || candidate._id || wx.getStorageSync('myCandidateId');
    if (id) {
      wx.navigateTo({
        url: `/pages/recruit/detail/detail?id=${id}`
      });
    }
  },

  // 联系HR
  contactHR() {
    wx.showModal({
      title: '联系HR',
      content: 'HR将在3个工作日内与您联系，请保持手机畅通',
      showCancel: false
    });
  },

  handleTrainingCampTodo() {
    this.navigateToTrainingCampTodo('confirm');
  },

  navigateToTrainingCampTodo(defaultDecision = 'confirm') {
    const { candidate } = this.data;
    const id = candidate?.candidateNo || candidate?._id || wx.getStorageSync('myCandidateId');
    if (!id) {
      wx.showToast({
        title: '候选人信息异常',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/recruit/training-camp/training-camp?id=${id}&decision=${defaultDecision}`
    });
  },

  confirmTrainingCampTodo() {
    this.navigateToTrainingCampTodo('confirm');
  },

  rejectTrainingCampTodo() {
    this.navigateToTrainingCampTodo('reject');
  },

  goToTrainingDaily() {
    wx.navigateTo({
      url: '/pages/recruit/training-daily/training-daily'
    });
  },

  enterAnchorWorkspace() {
    wx.reLaunch({
      url: '/pages/anchor/home/home'
    });
  },

  // 刷新数据
  onRefresh() {
    wx.showLoading({ title: '刷新中...' });

    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      this.loadCandidateData(candidateId);
    } else {
      this.loadFromCloud();
    }

    setTimeout(() => {
      wx.hideLoading();
    }, 500);
  }
});
