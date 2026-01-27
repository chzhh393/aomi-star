/**
 * 在线测试页面 (Mock版)
 * 功能：生成Mock测试结果并保存
 */

import { generateMockTestResult, saveOnlineTestResult, updateCandidateStatus, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    testResult: null
  },

  onLoad(options) {
    // 从本地存储获取候选人ID
    const userInfo = wx.getStorageSync('user_info');
    if (!userInfo || !userInfo.candidateInfo) {
      wx.showToast({
        title: '请先完成报名',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      candidateId: userInfo.candidateInfo.candidateId
    });
  },

  /**
   * 生成Mock测试结果
   */
  onGenerateMockResult() {
    wx.showLoading({
      title: '生成中...'
    });

    setTimeout(() => {
      const mockResult = generateMockTestResult();

      this.setData({
        testResult: mockResult
      });

      wx.hideLoading();
      wx.showToast({
        title: '生成成功',
        icon: 'success'
      });

      console.log('[在线测试] Mock结果生成:', mockResult);
    }, 1000);
  },

  /**
   * 提交测试结果
   */
  onSubmit() {
    if (!this.data.testResult) {
      wx.showToast({
        title: '请先生成测试结果',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...'
    });

    // 保存测试结果
    const success = saveOnlineTestResult(this.data.candidateId, this.data.testResult);

    if (success) {
      // 更新状态
      updateCandidateStatus(this.data.candidateId, CANDIDATE_STATUS.ONLINE_TEST_COMPLETED);

      wx.hideLoading();
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

      console.log('[在线测试] 结果提交成功:', this.data.candidateId);
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  }
});
