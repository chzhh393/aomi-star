/**
 * HR审核页面
 * 功能:
 * 1. 查看候选人基本信息
 * 2. 审核通过/拒绝
 * 3. 添加审核备注
 */

import { getCandidateById, updateCandidateStatus, saveHRReview, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    reviewNotes: '',
    rejectReason: '',

    // 拒绝原因选项
    rejectReasons: [
      { value: 'age', label: '年龄不符合要求' },
      { value: 'appearance', label: '外形条件不符' },
      { value: 'experience', label: '经验不足' },
      { value: 'attitude', label: '态度问题' },
      { value: 'other', label: '其他原因' }
    ],
    selectedRejectReason: ''
  },

  onLoad(options) {
    if (!options.candidateId) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ candidateId: options.candidateId });
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
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    console.log('[HR审核] 加载候选人信息:', candidate);
    this.setData({ candidate });
  },

  /**
   * 备注输入
   */
  onNotesInput(e) {
    this.setData({
      reviewNotes: e.detail.value
    });
  },

  /**
   * 选择拒绝原因
   */
  onRejectReasonChange(e) {
    this.setData({
      selectedRejectReason: e.detail.value
    });
  },

  /**
   * 自定义拒绝原因输入
   */
  onRejectReasonInput(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },

  /**
   * 通过审核
   */
  onApprove() {
    const { candidateId, reviewNotes } = this.data;
    const userInfo = wx.getStorageSync('user_info');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认通过',
      content: '确定通过该候选人的初审吗?\n接下来将为候选人安排面试。',
      success: (res) => {
        if (res.confirm) {
          // 保存HR审核结果（不改变状态）
          const success = saveHRReview(candidateId, {
            result: 'approved',
            reviewedBy: userInfo.id,
            reviewerName: userInfo.profile.name,
            reviewedAt: new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            notes: reviewNotes
          });

          if (success) {
            console.log('[HR审核] 审核结果已保存，跳转到面试安排页面');

            // 跳转到面试安排页面
            wx.redirectTo({
              url: `/pages/recruit/assign-interviewers/assign-interviewers?candidateId=${candidateId}&from=hr-review`
            });
          } else {
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 拒绝审核
   */
  onReject() {
    const userInfo = wx.getStorageSync('user_info');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 使用actionSheet让用户选择拒绝原因
    wx.showActionSheet({
      itemList: this.data.rejectReasons.map(r => r.label),
      success: (res) => {
        const selectedReason = this.data.rejectReasons[res.tapIndex];

        // 如果选择"其他原因",弹出输入框
        if (selectedReason.value === 'other') {
          this.showCustomRejectReason(userInfo);
        } else {
          this.confirmReject(selectedReason.label, userInfo);
        }
      }
    });
  },

  /**
   * 显示自定义拒绝原因输入框
   */
  showCustomRejectReason(userInfo) {
    wx.showModal({
      title: '请输入拒绝原因',
      editable: true,
      placeholderText: '请详细说明拒绝原因...',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.confirmReject(res.content.trim(), userInfo);
        } else if (res.confirm) {
          wx.showToast({
            title: '请填写拒绝原因',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 确认拒绝
   */
  confirmReject(reason, userInfo) {
    wx.showModal({
      title: '确认拒绝',
      content: `确定要拒绝该候选人吗?\n原因: ${reason}`,
      success: (res) => {
        if (res.confirm) {
          const success = updateCandidateStatus(
            this.data.candidateId,
            CANDIDATE_STATUS.REJECTED,
            {
              hrReview: {
                result: 'rejected',
                reviewedBy: userInfo.id,
                reviewerName: userInfo.profile.name,
                reviewedAt: new Date().toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }),
                reason: reason,
                notes: this.data.reviewNotes
              }
            }
          );

          if (success) {
            console.log('[HR审核] 已拒绝:', this.data.candidateId);

            wx.showToast({
              title: '已拒绝',
              icon: 'success'
            });

            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } else {
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 查看照片
   */
  onViewPhoto(e) {
    const { url } = e.currentTarget.dataset;
    const { candidate } = this.data;

    if (!candidate.basicInfo.photos || candidate.basicInfo.photos.length === 0) {
      return;
    }

    wx.previewImage({
      current: url,
      urls: candidate.basicInfo.photos
    });
  }
});
