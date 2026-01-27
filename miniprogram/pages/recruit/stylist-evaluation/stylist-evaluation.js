/**
 * 造型师评价页面
 * 功能：造型师对候选人的造型可塑性进行评价
 */

import { getCandidateById, saveEvaluation, areAllEvaluationsCompleted, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    dimensions: [
      { key: 'bodyProportions', name: '身材比例' },
      { key: 'fashionSense', name: '时尚感' },
      { key: 'styleAdaptability', name: '风格适应性' },
      { key: 'clothingMatch', name: '服装驾驭力' },
      { key: 'overallAura', name: '整体气质' }
    ],
    scores: {
      bodyProportions: 5,
      fashionSense: 5,
      styleAdaptability: 5,
      clothingMatch: 5,
      overallAura: 5
    },
    totalScore: 5.0,
    notes: '',
    suggestedStyles: [] // 建议的造型风格
  },

  onLoad(options) {
    const candidateId = options.candidateId;
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

    this.setData({ candidateId });
    this.loadCandidate();
  },

  /**
   * 加载候选人信息
   */
  loadCandidate() {
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

    this.setData({ candidate });
  },

  /**
   * 评分变化
   */
  onScoreChange(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;

    this.setData({
      [`scores.${key}`]: value
    }, () => {
      this.calculateTotalScore();
    });
  },

  /**
   * 计算总分
   */
  calculateTotalScore() {
    const scores = this.data.scores;
    const total = (
      scores.bodyProportions +
      scores.fashionSense +
      scores.styleAdaptability +
      scores.clothingMatch +
      scores.overallAura
    ) / 5;

    this.setData({
      totalScore: total.toFixed(1)
    });
  },

  /**
   * 备注输入
   */
  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  /**
   * 提交评价
   */
  onSubmit() {
    const { candidateId, scores, totalScore, notes } = this.data;

    // 验证是否填写备注
    if (!notes.trim()) {
      wx.showToast({
        title: '请填写评价备注',
        icon: 'none'
      });
      return;
    }

    // 获取当前用户信息
    const userInfo = wx.getStorageSync('user_info');
    const userId = userInfo?.id || 'ST001';
    const userName = userInfo?.profile?.name || '造型师';

    // 构建评价数据
    const evaluationData = {
      scores: scores,
      score: parseFloat(totalScore),
      notes: notes,
      evaluatorId: userId,
      evaluatorName: userName,
      evaluatedAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    };

    console.log('[造型师评价] 提交评价:', evaluationData);

    // 保存评价
    const success = saveEvaluation(candidateId, 'stylist', evaluationData);

    if (success) {
      // 检查是否所有评价都已完成
      const allCompleted = areAllEvaluationsCompleted(candidateId);

      console.log('[造型师评价] 所有评价是否完成:', allCompleted);

      if (allCompleted) {
        // 更新候选人状态为待评级
        updateCandidateStatus(candidateId, CANDIDATE_STATUS.PENDING_RATING);
        console.log('[造型师评价] 所有评价完成，状态更新为 pending_rating');
      }

      wx.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } else {
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  }
});
