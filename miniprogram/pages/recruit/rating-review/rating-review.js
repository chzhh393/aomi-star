import { getCandidateById, saveRating, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';
import { calculateRating, calculateDanceTeacherScore } from '../../../utils/rating-calculator.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    rating: null
  },

  onLoad(options) {
    this.setData({ candidateId: options.candidateId });
    this.loadCandidate();
  },

  loadCandidate() {
    const candidate = getCandidateById(this.data.candidateId);
    this.setData({ candidate });
  },

  onGenerateRating() {
    const candidate = this.data.candidate;

    // 计算舞蹈导师综合分
    const danceScore = calculateDanceTeacherScore(candidate.evaluations.danceTeacher.scores);

    // 生成评级
    const rating = calculateRating(danceScore);

    this.setData({ rating });

    wx.showToast({ title: '评级生成成功', icon: 'success' });
  },

  onApprove() {
    const userId = wx.getStorageSync('user_info')?.id || 'HR001';

    const ratingData = {
      ...this.data.rating,
      confirmedBy: userId
    };

    const success = saveRating(this.data.candidateId, ratingData);

    if (success) {
      updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.RATED);

      wx.showToast({ title: '审核通过', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } else {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onReject() {
    wx.showModal({
      title: '确认拒绝',
      content: '确定要拒绝该候选人吗？',
      success: (res) => {
        if (res.confirm) {
          updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.REJECTED);
          wx.showToast({ title: '已拒绝', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      }
    });
  }
});
