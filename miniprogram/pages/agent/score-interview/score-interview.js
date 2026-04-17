/**
 * 面试打分页面
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateDetail, scoreInterview } from '../../../utils/agent-api.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    submitting: false,

    // 评分结果选项
    resultOptions: [
      { value: 'pass_s', label: 'S级通过', desc: '表现突出，建议优先推进签约或重点培养。' },
      { value: 'pass_a', label: 'A级通过' },
      { value: 'pass_b', label: 'B级通过' },
      { value: 'fail', label: '不通过', desc: '当前不符合录用标准，不进入后续流程。' },
      { value: 'pending', label: '待定', desc: '信息还不充分，建议补充复试或进一步观察。' }
    ],

    // 评价标签选项
    tagOptions: {
      appearance: ['高挑', '精致', '有气质', '清新', '性感'],
      talent: ['唱歌好', '舞蹈好', '乐器', '表演力强'],
      personality: ['外向', '自信', '亲和力', '幽默', '稳重'],
      communication: ['口齿清晰', '逻辑清晰', '应变能力强'],
      potential: ['可塑性强', '学习能力强', '镜头感好']
    },
    tagSections: [],

    // 评分数据
    scoreData: {
      result: '',              // 评分结果
      tags: {                  // 评价标签
        appearance: [],
        talent: [],
        personality: [],
        communication: [],
        potential: []
      },
      comment: ''              // 备注
    }
  },

  onLoad(options) {
    // 检查登录状态
    if (!requireAgentLogin()) {
      return;
    }

    // 获取候选人ID
    if (!options.id) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ candidateId: options.id });
    this.syncTagSections();
    this.loadCandidate();
  },

  syncTagSections() {
    const categoryLabels = {
      appearance: '外形',
      talent: '才艺',
      personality: '性格',
      communication: '表达',
      potential: '潜力'
    };
    const currentTags = this.data.scoreData.tags || {};
    const tagSections = Object.keys(this.data.tagOptions).map((category) => ({
      key: category,
      label: categoryLabels[category] || category,
      tags: (this.data.tagOptions[category] || []).map((tag) => ({
        value: tag,
        selected: (currentTags[category] || []).includes(tag)
      }))
    }));

    this.setData({ tagSections });
  },

  /**
   * 加载候选人信息
   */
  async loadCandidate() {
    try {
      const result = await getCandidateDetail(this.data.candidateId);
      console.log('[面试打分] 候选人信息:', result.candidate);

      this.setData({
        candidate: result.candidate
      });

      // 如果已有评分，回填数据
      if (result.candidate.interview && result.candidate.interview.score) {
        const score = result.candidate.interview.score;
        this.setData({
          'scoreData.result': score.result || '',
          'scoreData.tags': score.tags || {
            appearance: [],
            talent: [],
            personality: [],
            communication: [],
            potential: []
          },
          'scoreData.comment': score.comment || ''
        });
        this.syncTagSections();
      }
    } catch (error) {
      console.error('[面试打分] 加载候选人信息失败:', error);
      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载候选人信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 选择评分结果
   */
  selectResult(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'scoreData.result': value
    });
  },

  /**
   * 切换标签选择
   */
  toggleTag(e) {
    const { category, tag } = e.currentTarget.dataset;
    const tags = [...(this.data.scoreData.tags[category] || [])];
    const index = tags.indexOf(tag);

    if (index > -1) {
      // 已选择，取消选择
      tags.splice(index, 1);
    } else {
      // 未选择，添加选择
      tags.push(tag);
    }

    this.setData({
      [`scoreData.tags.${category}`]: tags
    });
    this.syncTagSections();
  },

  /**
   * 备注输入
   */
  onCommentInput(e) {
    this.setData({
      'scoreData.comment': e.detail.value
    });
  },

  /**
   * 提交评分
   */
  async handleSubmit() {
    // 1. 校验必填项
    if (!this.data.scoreData.result) {
      wx.showToast({
        title: '请选择评分结果',
        icon: 'none'
      });
      return;
    }

    // 2. 二次确认
    const confirmResult = await this.showConfirmDialog();
    if (!confirmResult) {
      return;
    }

    // 3. 提交评分
    this.setData({ submitting: true });

    try {
      await scoreInterview(this.data.candidateId, this.data.scoreData);

      console.log('[面试打分] 提交成功');

      // 显示成功提示
      wx.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } catch (error) {
      console.error('[面试打分] 提交失败:', error);
      this.setData({ submitting: false });
      // 错误提示已在 scoreInterview 中处理
    }
  },

  /**
   * 显示确认对话框
   */
  showConfirmDialog() {
    return new Promise((resolve) => {
      const resultLabel = this.data.resultOptions.find(
        opt => opt.value === this.data.scoreData.result
      )?.label || '未知';

      wx.showModal({
        title: '确认提交',
        content: `确定提交评分结果"${resultLabel}"吗？提交后可以修改。`,
        confirmText: '确定提交',
        cancelText: '再看看',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }
});
