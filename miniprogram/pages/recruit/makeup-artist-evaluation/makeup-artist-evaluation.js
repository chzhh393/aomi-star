/**
 * 化妆师评价页面
 * 功能：化妆师对候选人的妆容适配度进行评价
 */

import { getCandidateById, saveEvaluation, areAllEvaluationsCompleted, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    dimensions: [
      { key: 'skinCondition', name: '肤质条件' },
      { key: 'facialFeatures', name: '五官立体度' },
      { key: 'makeupCompatibility', name: '妆容适配度' },
      { key: 'cameraEffect', name: '上镜效果' },
      { key: 'styleRange', name: '风格可塑性' }
    ],
    scores: {
      skinCondition: 5,
      facialFeatures: 5,
      makeupCompatibility: 5,
      cameraEffect: 5,
      styleRange: 5
    },
    totalScore: 5.0,
    notes: '',
    suggestedStyles: [] // 建议的妆容风格
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
      scores.skinCondition +
      scores.facialFeatures +
      scores.makeupCompatibility +
      scores.cameraEffect +
      scores.styleRange
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
    const userId = userInfo?.id || 'MA001';
    const userName = userInfo?.profile?.name || '化妆师';

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

    console.log('[化妆师评价] 提交评价:', evaluationData);

    // 保存评价
    const success = saveEvaluation(candidateId, 'makeupArtist', evaluationData);

    if (success) {
      // 检查是否所有评价都已完成
      const allCompleted = areAllEvaluationsCompleted(candidateId);

      console.log('[化妆师评价] 所有评价是否完成:', allCompleted);

      if (allCompleted) {
        // 更新候选人状态为待评级
        updateCandidateStatus(candidateId, CANDIDATE_STATUS.PENDING_RATING);
        console.log('[化妆师评价] 所有评价完成，状态更新为 pending_rating');
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
