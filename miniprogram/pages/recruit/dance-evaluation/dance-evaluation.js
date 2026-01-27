import { getCandidateById, saveEvaluation, areAllEvaluationsCompleted, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    dimensions: [
      { key: 'basicSkills', name: '基本功' },
      { key: 'rhythm', name: '节奏感' },
      { key: 'coordination', name: '协调性' },
      { key: 'expression', name: '表现力' },
      { key: 'potential', name: '潜力' }
    ],
    scores: {
      basicSkills: 5,
      rhythm: 5,
      coordination: 5,
      expression: 5,
      potential: 5
    },
    totalScore: 5.0,
    notes: ''
  },

  onLoad(options) {
    const candidateId = options.candidateId;
    this.setData({ candidateId });
    this.loadCandidate();
  },

  loadCandidate() {
    const candidate = getCandidateById(this.data.candidateId);
    this.setData({ candidate });
  },

  onScoreChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;

    this.setData({
      [`scores.${key}`]: value
    }, () => {
      this.calculateTotalScore();
    });
  },

  calculateTotalScore() {
    const scores = this.data.scores;
    const total = (scores.basicSkills + scores.rhythm + scores.coordination + scores.expression + scores.potential) / 5;
    this.setData({
      totalScore: total.toFixed(1)
    });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  onSubmit() {
    const userId = wx.getStorageSync('user_info')?.id || 'DT001';

    const evaluationData = {
      scores: this.data.scores,
      score: parseFloat(this.data.totalScore),
      notes: this.data.notes,
      evaluatorId: userId,
      evaluatorName: wx.getStorageSync('user_info')?.profile.name || '舞蹈导师'
    };

    const success = saveEvaluation(this.data.candidateId, 'danceTeacher', evaluationData);

    if (success) {
      // 检查是否所有评价都已完成
      const allCompleted = areAllEvaluationsCompleted(this.data.candidateId);
      if (allCompleted) {
        // 所有评价完成，更新为待评级状态
        updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.PENDING_RATING);

        console.log('[舞蹈评价] 所有评价已完成，候选人进入待评级状态');
      }

      wx.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } else {
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  }
});
