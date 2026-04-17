import { loadAnchorWorkbench } from '../../../utils/anchor-workbench.js';

Page({
  data: {
    loading: true,
    loadError: '',
    tab: '',
    isWelcomeMode: true,
    isSkillsMode: false,
    isLearningMode: false,
    isTasksMode: false,
    candidate: null,
    agent: null,
    agentInitial: '-',
    welcomeMessage: '欢迎进入主播中台',
    nextSteps: [],
    heroTitle: '',
    masteredCount: 0,
    skillTree: [],
    playbackRateOptions: [],
    selectedPlaybackRate: 0.5,
    demoVideos: [],
    dailyTasks: [],
    refinedPhotos: []
  },

  onLoad(options = {}) {
    const tab = options.tab || '';
    this.setData({
      tab,
      isWelcomeMode: !tab,
      isSkillsMode: tab === 'skills',
      isLearningMode: tab === 'learning',
      isTasksMode: tab === 'tasks'
    });
    this.loadCandidate();
  },

  async loadCandidate() {
    this.setData({
      loading: true,
      loadError: ''
    });

    try {
      const workspace = await loadAnchorWorkbench();
      const candidate = this.normalizeCandidate(workspace.candidate);

      this.setData({
        candidate,
        agent: workspace.agentSummary,
        agentInitial: workspace.agentSummary?.name ? String(workspace.agentSummary.name).slice(0, 1) : '-',
        nextSteps: this.buildNextSteps(candidate),
        heroTitle: workspace.heroTitle,
        masteredCount: workspace.masteredCount,
        skillTree: workspace.skillTree,
        playbackRateOptions: workspace.playbackRateOptions,
        demoVideos: workspace.demoVideos,
        dailyTasks: workspace.dailyTasks,
        refinedPhotos: workspace.refinedPhotos,
        loading: false
      });
    } catch (error) {
      console.error('[anchor-welcome] 加载失败:', error);

      if (error.code === 'ANCHOR_STAGE_BLOCKED' && error.candidate) {
        wx.showModal({
          title: '暂未开通主播中台',
          content: '当前阶段请先在报名状态页完成入营、培训或签署流程。',
          showCancel: false,
          success: () => {
            wx.reLaunch({
              url: `/pages/recruit/status/status?id=${error.candidate.candidateNo || error.candidate._id}`
            });
          }
        });
      }

      this.setData({
        loading: false,
        loadError: error.message || '加载失败'
      });
      if (error.code !== 'ANCHOR_STAGE_BLOCKED') {
        wx.showToast({
          title: error.message || '加载失败',
          icon: 'none'
        });
      }
    }
  },

  normalizeCandidate(candidate = {}) {
    const basicInfo = candidate.basicInfo || {};
    const assignedAgent = candidate.assignedAgent || {};

    return {
      ...candidate,
      basicInfo,
      assignedAgent,
      liveName: candidate.liveName || basicInfo.artName || '',
      contractWorkflow: candidate.contractWorkflow || {}
    };
  },

  buildNextSteps(candidate) {
    const contractStatus = candidate.contractWorkflow?.status || '';
    const steps = [
      {
        icon: '🧑‍💼',
        title: '联系专属经纪人',
        desc: `经纪人：${candidate.assignedAgent?.agentName || '-'}，后续入营、培训和档期都会由 TA 跟进。`
      },
      {
        icon: '📝',
        title: '记录训练过程',
        desc: '进入主播中台后，可持续提交入场训练记录和离场复盘记录。'
      }
    ];

    if (contractStatus && contractStatus !== 'signed') {
      steps.push({
        icon: '✍️',
        title: '跟进签约流程',
        desc: '主播端可查看签约进度与审核状态，但不会显示合同正文。'
      });
    }

    if (candidate.status === 'training') {
      steps.push({
        icon: '🎯',
        title: '完成训练营目标',
        desc: '按训练节奏提交记录，等待舞蹈老师复核通过。'
      });
    }

    return steps;
  },

  onEnterWorkstation() {
    wx.reLaunch({
      url: '/pages/anchor/home/home'
    });
  },

  onContactAgent() {
    wx.showModal({
      title: '联系经纪人',
      content: `经纪人：${this.data.agent?.name || '-'}\n电话：${this.data.agent?.phone || '-'}`,
      showCancel: false
    });
  },

  switchPlaybackRate(e) {
    const value = Number(e.currentTarget.dataset.value);
    if (!value) {
      return;
    }

    this.setData({
      selectedPlaybackRate: value
    });
  },

  previewRefinedPhoto(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.refinedPhotos || [];
    if (!url || !urls.length) {
      return;
    }

    wx.previewImage({
      current: url,
      urls
    });
  },

  goToTrainingRecords() {
    wx.navigateTo({
      url: '/pages/recruit/training-daily/training-daily'
    });
  },

  onRetryLoad() {
    this.loadCandidate();
  },

  onBackToStatusPage() {
    wx.reLaunch({
      url: '/pages/recruit/status/status'
    });
  }
});
