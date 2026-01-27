// pages/anchor/home/home.js
import { getAnchorById, getSchedulesByDate } from '../../../mock/data.js';
import { getCandidateById } from '../../../mock/candidates.js';
import { getUserById } from '../../../mock/users.js';

Page({
  data: {
    anchor: {},
    schedule: {},
    agent: null, // 经纪人信息
    trainingInfo: null, // 培训信息
    isStreamer: false // 是否已经是签约主播
  },

  onLoad() {
    // 权限检查必须放在第一位
    if (!this.checkAccessPermission()) {
      return;
    }

    // 通过验证，加载数据
    this.loadAnchorData();
  },

  onShow() {
    // 每次显示都重新验证权限
    if (!this.checkAccessPermission()) {
      return;
    }
  },

  // 权限检查
  checkAccessPermission() {
    const candidateId = wx.getStorageSync('myCandidateId');

    // 1. 检查是否有报名记录
    if (!candidateId) {
      this.showAccessDenied('您还未报名成为主播', '/pages/recruit/index/index');
      return false;
    }

    // 2. 获取候选人信息
    const candidate = getCandidateById(candidateId);
    if (!candidate) {
      this.showAccessDenied('未找到报名记录', '/pages/recruit/index/index');
      return false;
    }

    // 3. 验证签约状态（signed 或 training 或 active）
    const allowedStatuses = ['signed', 'training', 'active'];
    if (!allowedStatuses.includes(candidate.status)) {
      this.showApplicationStatus(candidate);
      return false;
    }

    // 4. 权限验证通过
    return true;
  },

  // 显示访问被拒提示
  showAccessDenied(message, redirectUrl) {
    wx.showModal({
      title: '无法访问',
      content: message,
      showCancel: false,
      success: () => {
        wx.redirectTo({ url: redirectUrl });
      }
    });
  },

  // 显示报名状态
  showApplicationStatus(candidate) {
    const statusMessages = {
      'pending': '您的报名正在审核中，请耐心等待',
      'interview': '您正在面试阶段，HR会尽快联系您',
      'rejected': '很遗憾，您的申请未通过审核'
    };

    wx.showModal({
      title: '提示',
      content: statusMessages[candidate.status] || '请等待审核',
      showCancel: false,
      success: () => {
        wx.redirectTo({
          url: `/pages/recruit/status/status?id=${candidate.id}`
        });
      }
    });
  },

  // 加载主播数据
  loadAnchorData() {
    const candidateId = wx.getStorageSync('myCandidateId');
    const candidate = getCandidateById(candidateId);

    if (!candidate) {
      return;
    }

    // 检查是否是签约主播（有streamerInfo）
    const isStreamer = candidate.role === 'streamer' && candidate.streamerInfo;

    if (isStreamer) {
      // 1. 加载经纪人信息
      const agent = getUserById(candidate.streamerInfo.agentId);

      // 2. 构建培训信息
      const trainingInfo = {
        status: candidate.streamerInfo.trainingStatus,
        progress: candidate.streamerInfo.trainingProgress,
        statusLabel: this.getTrainingStatusLabel(candidate.streamerInfo.trainingStatus)
      };

      // 3. 使用旧的mock数据结构（保持兼容）
      const anchorId = '001';
      const anchor = getAnchorById(anchorId);

      // 获取今日排班
      const today = '2025-11-19';
      const schedules = getSchedulesByDate(today);
      const schedule = schedules.find(s => s.anchorId === anchorId) || {};

      // 预处理数据，添加计算属性
      const processedAnchor = {
        ...anchor,
        // 添加真实的主播名称和经纪人信息
        artName: candidate.basicInfo.name,
        agentName: agent?.profile.name || '未分配',
        // 为 class 绑定提供小写的 level
        levelLowerCase: anchor.level ? anchor.level.toLowerCase() : '',
        // 预计算收益（K单位）
        monthRevenueK: (anchor.monthRevenue / 1000).toFixed(0),
        // 预计算收益增长百分比
        revenueGrowthPercent: anchor.lastMonthRevenue > 0
          ? ((anchor.monthRevenue - anchor.lastMonthRevenue) / anchor.lastMonthRevenue * 100).toFixed(0)
          : '0',
        // 预计算时长变化
        hoursChange: anchor.liveHours - anchor.lastMonthHours,
      };

      this.setData({
        anchor: processedAnchor,
        schedule,
        agent,
        trainingInfo,
        isStreamer: true
      });

      console.log('[主播工作台] 数据加载完成:', {
        streamerName: candidate.basicInfo.name,
        agentName: agent?.profile.name,
        trainingStatus: trainingInfo.status
      });
    } else {
      // 候选人还未签约，使用默认数据
      const anchorId = '001';
      const anchor = getAnchorById(anchorId);

      // 获取今日排班
      const today = '2025-11-19';
      const schedules = getSchedulesByDate(today);
      const schedule = schedules.find(s => s.anchorId === anchorId) || {};

      // 预处理数据
      const processedAnchor = {
        ...anchor,
        levelLowerCase: anchor.level ? anchor.level.toLowerCase() : '',
        monthRevenueK: (anchor.monthRevenue / 1000).toFixed(0),
        revenueGrowthPercent: anchor.lastMonthRevenue > 0
          ? ((anchor.monthRevenue - anchor.lastMonthRevenue) / anchor.lastMonthRevenue * 100).toFixed(0)
          : '0',
        hoursChange: anchor.liveHours - anchor.lastMonthHours,
      };

      this.setData({
        anchor: processedAnchor,
        schedule,
        isStreamer: false
      });
    }
  },

  // 获取培训状态标签
  getTrainingStatusLabel(status) {
    const labels = {
      'pending': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'inactive': '未开始'
    };
    return labels[status] || '未知';
  }
});
