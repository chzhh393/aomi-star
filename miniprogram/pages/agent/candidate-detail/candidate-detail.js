/**
 * 候选人详情页
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateDetail } from '../../../utils/agent-api.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    loading: false,
    scoreTags: []  // 评分标签（格式化后的）
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
    this.loadCandidate();
  },

  /**
   * 加载候选人详情
   */
  async loadCandidate() {
    this.setData({ loading: true });

    try {
      const result = await getCandidateDetail(this.data.candidateId);
      console.log('[候选人详情] 加载结果:', result);

      // 处理评分标签（转换为显示格式）
      let scoreTags = [];
      if (result.candidate.interview && result.candidate.interview.score && result.candidate.interview.score.tags) {
        const tags = result.candidate.interview.score.tags;
        const tagCategories = [
          { key: 'appearance', name: '外形' },
          { key: 'talent', name: '才艺' },
          { key: 'personality', name: '性格' },
          { key: 'communication', name: '表达' },
          { key: 'potential', name: '潜力' }
        ];

        scoreTags = tagCategories
          .filter(cat => tags[cat.key] && tags[cat.key].length > 0)
          .map(cat => ({
            key: cat.key,
            name: cat.name,
            values: tags[cat.key]
          }));
      }

      this.setData({
        candidate: result.candidate,
        scoreTags: scoreTags,
        loading: false
      });
    } catch (error) {
      console.error('[候选人详情] 加载失败:', error);
      this.setData({ loading: false });

      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载候选人详情',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 刷新数据（从其他页面返回时）
   */
  onShow() {
    // 如果已经加载过，再次刷新数据
    if (this.data.candidate) {
      this.loadCandidate();
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadCandidate();
    wx.stopPullDownRefresh();
  },

  /**
   * 预览照片
   */
  previewPhoto(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  /**
   * 去打分
   */
  goToScore() {
    wx.navigateTo({
      url: `/pages/agent/score-interview/score-interview?id=${this.data.candidateId}`
    });
  },

  /**
   * 去上传资料
   */
  goToUpload() {
    wx.navigateTo({
      url: `/pages/agent/upload-materials/upload-materials?id=${this.data.candidateId}`
    });
  },

  /**
   * 获取评分等级标签
   */
  getScoreLabel(result) {
    const labels = {
      'pass_s': 'S级通过',
      'pass_a': 'A级通过',
      'pass_b': 'B级通过',
      'fail': '不通过',
      'pending': '待定'
    };
    return labels[result] || result;
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 分享到微信
   * 分享内容已脱敏处理，不包含手机号、社交账号等敏感信息
   */
  onShareAppMessage() {
    const candidate = this.data.candidate;

    if (!candidate) {
      return {
        title: '候选人信息',
        path: '/pages/index/index'
      };
    }

    // 构建分享标题（仅包含基本信息）
    const name = candidate.basicInfo?.name || '候选人';
    const age = candidate.basicInfo?.age || '';
    const height = candidate.basicInfo?.height || '';
    const location = candidate.basicInfo?.location || '';

    let title = `${name}`;
    const details = [];
    if (age) details.push(`${age}岁`);
    if (height) details.push(`${height}cm`);
    if (location) details.push(location);

    if (details.length > 0) {
      title += ` - ${details.join(' · ')}`;
    }

    // 获取分享图片（使用候选人照片，但不包含敏感信息）
    let imageUrl = '';
    if (candidate.images?.facePhoto) {
      imageUrl = candidate.images.facePhoto;
    } else if (candidate.images?.lifePhoto1) {
      imageUrl = candidate.images.lifePhoto1;
    }

    return {
      title: title,
      path: `/pages/agent/candidate-detail/candidate-detail?id=${this.data.candidateId}`,
      imageUrl: imageUrl
    };
  },

  /**
   * 主动触发分享
   */
  handleShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 显示提示
    wx.showToast({
      title: '点击右上角分享',
      icon: 'none',
      duration: 2000
    });
  }
});
