import { getCandidateById, saveEvaluation, areAllEvaluationsCompleted, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    dimensions: [
      { key: 'appearance', name: '形象气质' },
      { key: 'communication', name: '沟通能力' },
      { key: 'attitude', name: '工作态度' },
      { key: 'stability', name: '稳定性' },
      { key: 'potential', name: '发展潜力' }
    ],
    scores: {
      appearance: 5,
      communication: 5,
      attitude: 5,
      stability: 5,
      potential: 5
    },
    totalScore: 5.0,
    notes: ''
  },

  onLoad(options) {
    this.setData({ candidateId: options.candidateId });
    this.loadCandidate();
  },

  loadCandidate() {
    const candidate = getCandidateById(this.data.candidateId);
    this.setData({ candidate });
  },

  onScoreChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({
      [`scores.${key}`]: e.detail.value
    }, () => this.calculateTotalScore());
  },

  calculateTotalScore() {
    const scores = this.data.scores;
    const total = (scores.appearance + scores.communication + scores.attitude + scores.stability + scores.potential) / 5;
    this.setData({ totalScore: total.toFixed(1) });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  onSubmit() {
    const userId = wx.getStorageSync('user_info')?.id || 'AG001';
    const evaluationData = {
      scores: this.data.scores,
      score: parseFloat(this.data.totalScore),
      notes: this.data.notes,
      evaluatorId: userId,
      evaluatorName: wx.getStorageSync('user_info')?.profile.name || '经纪人'
    };

    const success = saveEvaluation(this.data.candidateId, 'agent', evaluationData);

    if (success) {
      const allCompleted = areAllEvaluationsCompleted(this.data.candidateId);
      if (allCompleted) {
        // 所有评价完成，更新为待评级状态
        updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.PENDING_RATING);

        console.log('[经纪人评价] 所有评价已完成，候选人进入待评级状态');
      }

      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } else {
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  }
});
