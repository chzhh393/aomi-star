// pages/candidate/home/home.js
import { getCurrentUser } from '../../../utils/auth.js';
import { getCandidateById, getStatusText } from '../../../mock/candidates.js';
import { ROLE } from '../../../mock/users.js';

Page({
  data: {
    user: null,
    candidate: null,

    // 进度步骤（6阶段）
    statusSteps: [
      { key: 'pending', label: '待审核', icon: '📝' },
      { key: 'interview_scheduled', label: '已安排面试', icon: '📅' },
      { key: 'online_test_completed', label: '已完成测试', icon: '✅' },
      { key: 'pending_rating', label: '面试评价中', icon: '⭐' },
      { key: 'rated', label: '已评级', icon: '🎯' },
      { key: 'signed', label: '已签约', icon: '✍️' }
    ],
    currentStep: 0,

    // 状态信息
    statusInfo: {
      title: '',
      desc: '',
      color: ''
    }
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    // 获取当前用户
    const user = getCurrentUser();
    if (!user || user.role !== ROLE.CANDIDATE) {
      wx.showModal({
        title: '访问受限',
        content: '您不是候选人，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/index/index' });
        }
      });
      return;
    }

    // 获取候选人数据
    const candidateId = user.candidateInfo?.candidateId;
    if (!candidateId) {
      wx.showToast({ title: '候选人信息异常', icon: 'none' });
      return;
    }

    const candidate = getCandidateById(candidateId);
    if (!candidate) {
      wx.showToast({ title: '候选人数据不存在', icon: 'none' });
      return;
    }

    // 计算当前进度步骤（6阶段）
    let currentStep = 0;
    if (candidate.status === 'pending') currentStep = 1;
    else if (candidate.status === 'interview_scheduled') currentStep = 2;
    else if (candidate.status === 'online_test_completed') currentStep = 3;
    else if (candidate.status === 'pending_rating') currentStep = 4;
    else if (candidate.status === 'rated') currentStep = 5;
    else if (['signed', 'training', 'active'].includes(candidate.status)) currentStep = 6;

    // 生成状态信息
    const statusInfo = this.generateStatusInfo(candidate.status);

    this.setData({
      user,
      candidate,
      currentStep,
      statusInfo
    });
  },

  /**
   * 生成状态信息（支持6阶段）
   */
  generateStatusInfo(status) {
    const infoMap = {
      'pending': {
        title: '报名成功，等待审核',
        desc: 'HR将在1-2个工作日内审核您的资料，请耐心等待',
        color: '#FFD700',
        action: null
      },
      'interview_scheduled': {
        title: '面试已安排，请完成在线测试',
        desc: '恭喜！HR已为您安排了面试，请先完成在线性格测试',
        color: '#13E8DD',
        action: { text: '去完成测试', handler: 'goToOnlineTest' }
      },
      'online_test_completed': {
        title: '测试完成，等待面试评价',
        desc: '您已完成在线测试，面试官将对您进行评价',
        color: '#13E8DD',
        action: null
      },
      'pending_rating': {
        title: '面试评价进行中',
        desc: '面试官正在对您进行评价，请耐心等待',
        color: '#FFA500',
        action: null
      },
      'rated': {
        title: '评级完成，等待签约',
        desc: '恭喜！您已通过评级，经纪人将尽快与您联系签约事宜',
        color: '#32CD32',
        action: null
      },
      'signed': {
        title: '恭喜签约成功！',
        desc: '欢迎加入我们！您现在可以进入主播工作台了',
        color: '#00FF00',
        action: { text: '进入主播工作台', handler: 'enterWorkspace' }
      },
      'training': {
        title: '培训进行中',
        desc: '您正在接受专业培训，加油！',
        color: '#13E8DD',
        action: { text: '进入主播工作台', handler: 'enterWorkspace' }
      },
      'active': {
        title: '您已正式成为主播',
        desc: '开启您的直播之旅吧！',
        color: '#00FF00',
        action: { text: '进入主播工作台', handler: 'enterWorkspace' }
      },
      'rejected': {
        title: '很遗憾，审核未通过',
        desc: '感谢您的申请，期待未来有机会合作',
        color: '#FF0000',
        action: null
      }
    };

    return infoMap[status] || {
      title: '状态未知',
      desc: '',
      color: '#999999',
      action: null
    };
  },

  /**
   * 进入主播工作台（已签约候选人）
   */
  enterWorkspace() {
    const { candidate } = this.data;
    const allowedStatuses = ['signed', 'training', 'active'];

    if (!allowedStatuses.includes(candidate.status)) {
      wx.showToast({
        title: '您还未签约',
        icon: 'none'
      });
      return;
    }

    wx.reLaunch({
      url: '/pages/anchor/home/home'
    });
  },

  /**
   * 查看详细信息
   */
  viewDetails() {
    const { candidate } = this.data;
    wx.navigateTo({
      url: `/pages/recruit/status/status?id=${candidate.id}`
    });
  },

  /**
   * 联系HR
   */
  contactHR() {
    const { candidate } = this.data;

    if (candidate.hrReview && candidate.hrReview.reviewerName) {
      wx.showModal({
        title: '联系HR',
        content: `您的HR是：${candidate.hrReview.reviewerName}\n\n请通过公司提供的联系方式与HR沟通`,
        showCancel: false
      });
    } else {
      wx.showModal({
        title: '温馨提示',
        content: 'HR尚未分配，请耐心等待审核',
        showCancel: false
      });
    }
  },

  /**
   * 去完成在线测试
   */
  goToOnlineTest() {
    wx.navigateTo({
      url: '/pages/recruit/online-test/online-test'
    });
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    wx.showLoading({ title: '刷新中...' });
    setTimeout(() => {
      this.loadData();
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 500);
  }
});
