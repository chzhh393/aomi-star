/**
 * 候选人详情页
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import {
  createTrainingCampTodo,
  getCandidateDetail,
  getCandidateInterviewEvaluations,
  getTrainingCampRecords
} from '../../../utils/agent-api.js';
import {
  getCandidateAssignedAgent,
  getCandidateDisplayName,
  hydrateSingleCandidateAvatar
} from '../../../utils/interviewer.js';
import { TRAINING_CAMP_TYPE_OPTIONS } from '../../../utils/training-camp.js';

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatInviteDateTime(startDate, startTime) {
  const matched = String(startDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeText = String(startTime || '').trim();
  if (!matched) {
    return [String(startDate || '').trim(), `${String(startDate || '').trim()} ${timeText}`.trim()].filter(Boolean);
  }

  const month = String(Number(matched[2]));
  const day = String(Number(matched[3]));
  const dateText = `${month}月${day}日`;
  return [dateText + timeText, `${dateText} ${timeText}`.trim(), startDate].filter(Boolean);
}

function normalizeTrainingCampType(campType) {
  const normalized = String(campType || '').trim();
  if (normalized === '基础训练营') {
    return '新星训练营';
  }
  return normalized;
}

function highlightFirst(html, keyword) {
  if (!html || !keyword) {
    return html;
  }

  const reg = new RegExp(escapeRegExp(keyword));
  return html.replace(reg, `<span style="display:inline-block;padding:2px 10px;margin:0 4px;border-radius:999px;background:#fff0c2;color:#b45309;font-weight:700;border:1px solid #f59e0b;">${escapeHtml(keyword)}</span>`);
}

function buildInvitationRichText(content, campType, startDate, startTime) {
  const normalizedCampType = normalizeTrainingCampType(campType);
  const normalizedContent = String(content || '').replace(/基础训练营/g, '新星训练营');
  const lines = normalizedContent.split('\n');
  const signatureLines = lines.slice(-2).map((line) => escapeHtml(line).trim()).filter(Boolean);
  const bodyLines = signatureLines.length > 0 ? lines.slice(0, -2) : lines;

  let html = bodyLines.map((line) => escapeHtml(line)).join('<br/>');
  html = highlightFirst(html, normalizedCampType);

  const timeCandidates = formatInviteDateTime(startDate, startTime);
  for (const keyword of timeCandidates) {
    const nextHtml = highlightFirst(html, keyword);
    if (nextHtml !== html) {
      html = nextHtml;
      break;
    }
  }

  if (signatureLines.length > 0) {
    const signatureHtml = signatureLines.join('<br/>');
    html = `${html}<div style="margin-top:16px;text-align:right;">${signatureHtml}</div>`;
  }

  return html;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getEvaluationStatusLabel(evaluation) {
  return evaluation?.completed ? '已完成' : '待完成';
}

function formatEvaluationSummary(evaluation = {}) {
  const rawFields = evaluation.rawFields || {};
  const dimensions = rawFields.dimensions || {};
  const styleTags = Array.isArray(rawFields.styleTags) ? rawFields.styleTags : [];
  const scoreText = evaluation.score || '';
  const commentText = evaluation.comment || '';

  return {
    ...evaluation,
    statusLabel: getEvaluationStatusLabel(evaluation),
    evaluatedAtText: formatDateTime(evaluation.evaluatedAt),
    dimensionEntries: Object.entries(dimensions),
    styleTags,
    scoreText,
    commentText,
    hasAttachments: (evaluation.images || []).length > 0 || (evaluation.videos || []).length > 0 || (evaluation.videoLinks || []).length > 0
  };
}

function formatTrainingRecord(record = {}) {
  const locationSnapshot = record.locationSnapshot || {};
  return {
    ...record,
    statusLabel: record.status === 'approved'
      ? '已通过'
      : record.status === 'rejected'
        ? '已驳回'
        : '待复核',
    recordTypeLabel: record.recordType === 'exit_note' ? '离场复盘' : '入场训练',
    checkedAtText: formatDateTime(locationSnapshot.checkedAt),
    locationText: locationSnapshot.baseName && locationSnapshot.distanceMeters >= 0
      ? `${locationSnapshot.baseName} · ${locationSnapshot.distanceMeters}米`
      : '',
    photos: Array.isArray(record.photos) ? record.photos : [],
    supportComment: String(record.supportComment || ''),
    coachingComment: String(record.coachingComment || ''),
    reviewComment: String(record.reviewComment || '')
  };
}

function normalizeTalentInfo(candidate = {}) {
  const talent = candidate.talent || {};
  const mainTalents = Array.isArray(talent.mainTalents)
    ? talent.mainTalents
    : (talent.mainTalent ? [talent.mainTalent] : []);

  return {
    ...talent,
    types: Array.isArray(talent.types) && talent.types.length > 0 ? talent.types : mainTalents,
    description: talent.description || (mainTalents.length ? `主打方向：${mainTalents.join('、')}` : ''),
    awards: talent.awards || '',
    works: Array.isArray(talent.works) ? talent.works : []
  };
}

function normalizeSocialInfo(candidate = {}) {
  const basicInfo = candidate.basicInfo || {};
  return {
    douyin: basicInfo.douyin || '',
    xiaohongshu: basicInfo.xiaohongshu || '',
    bilibili: basicInfo.bilibili || basicInfo.bilibiliName || basicInfo.bilibiliUsername || '',
    kuaishou: basicInfo.kuaishou || ''
  };
}

function normalizeLiveExperience(candidate = {}) {
  const experience = candidate.experience || {};
  const platforms = Array.isArray(experience.platforms) ? experience.platforms : [];

  return {
    hasExperience: Boolean(experience.hasExperience),
    platform: experience.platform || platforms.join('、'),
    duration: experience.duration || experience.guild || '',
    fans: experience.fans || experience.maxFans || '',
    accountName: experience.accountName || ''
  };
}

function normalizeInterviewInfo(candidate = {}) {
  const interview = candidate.interview || {};
  const materials = candidate.interviewMaterials || {};
  const photos = interview.photos || [
    ...(Array.isArray(materials.beforeMakeup) ? materials.beforeMakeup : []),
    ...(Array.isArray(materials.afterMakeup) ? materials.afterMakeup : [])
  ];
  const videos = interview.videos || (Array.isArray(materials.videos)
    ? materials.videos.map((item) => (typeof item === 'string' ? item : item.url)).filter(Boolean)
    : []);

  return {
    ...interview,
    photos,
    videos
  };
}

function normalizeBasicInfo(candidate = {}) {
  const basicInfo = candidate.basicInfo || {};
  return {
    ...basicInfo,
    location: basicInfo.location || basicInfo.city || '',
    education: basicInfo.education || '未填写'
  };
}

function normalizeCandidateForDetail(candidate = {}) {
  const displayName = getCandidateDisplayName(candidate);
  return {
    ...candidate,
    assignedAgentDisplay: getCandidateAssignedAgent(candidate),
    displayName,
    nameInitial: displayName ? displayName.slice(0, 1) : '?',
    basicInfo: normalizeBasicInfo(candidate),
    talent: normalizeTalentInfo(candidate),
    social: normalizeSocialInfo(candidate),
    liveExperience: normalizeLiveExperience(candidate),
    interview: normalizeInterviewInfo(candidate),
    auditionVideos: Array.isArray(candidate.auditionVideos) ? candidate.auditionVideos : []
  };
}

Page({
  data: {
    candidateId: '',
    candidate: null,
    loading: false,
    scoreTags: [],  // 评分标签（格式化后的）
    auditionVideos: [],  // 试镜视频列表
    sharedMaterials: {
      images: [],
      videos: [],
      uploadedBy: '',
      uploadedAt: '',
      comment: ''
    },
    interviewEvaluations: [],
    trainingRecords: [],
    canSendTrainingCampTodo: false,
    trainingCampTodoStatusText: '',
    displayCampType: '',
    invitationRichText: '',
    campTypeOptions: TRAINING_CAMP_TYPE_OPTIONS,
    trainingCampForm: {
      campType: '',
      startDate: '',
      startTime: '13:00',
      remark: ''
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
    this.loadCandidate();
  },

  /**
   * 加载候选人详情
   */
  async loadCandidate() {
    this.setData({ loading: true });

    try {
      const [detailResult, evaluationsResult, trainingCampResult] = await Promise.all([
        getCandidateDetail(this.data.candidateId),
        getCandidateInterviewEvaluations(this.data.candidateId).catch((error) => {
          console.warn('[候选人详情] 面试评价汇总加载失败:', error);
          return null;
        }),
        getTrainingCampRecords(this.data.candidateId).catch((error) => {
          console.warn('[候选人详情] 训练营记录加载失败:', error);
          return null;
        })
      ]);

      const result = detailResult;
      const hydratedCandidate = await hydrateSingleCandidateAvatar(result.candidate || {});
      const candidate = normalizeCandidateForDetail(hydratedCandidate || {});
      console.log('[候选人详情] 加载结果:', result);

      // 处理评分标签（转换为显示格式）
      let scoreTags = [];
      if (candidate.interview && candidate.interview.score && candidate.interview.score.tags) {
        const tags = candidate.interview.score.tags;
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
        candidate,
        scoreTags: scoreTags,
        auditionVideos: candidate.auditionVideos || [],
        sharedMaterials: evaluationsResult?.sharedMaterials || {
          images: [],
          videos: [],
          uploadedBy: '',
          uploadedAt: '',
          comment: ''
        },
        interviewEvaluations: Array.isArray(evaluationsResult?.evaluations)
          ? evaluationsResult.evaluations.map((item) => formatEvaluationSummary(item))
          : [],
        trainingRecords: Array.isArray(trainingCampResult?.trainingCamp?.dailyRecords)
          ? trainingCampResult.trainingCamp.dailyRecords.map((item) => formatTrainingRecord(item))
          : [],
        canSendTrainingCampTodo: this.canSendTrainingCampTodo(candidate),
        trainingCampTodoStatusText: this.getTrainingCampTodoStatusText(candidate.trainingCampTodo),
        displayCampType: normalizeTrainingCampType(candidate.trainingCampTodo?.campType),
        invitationRichText: buildInvitationRichText(
          candidate.trainingCampTodo?.invitationContent,
          candidate.trainingCampTodo?.campType,
          candidate.trainingCampTodo?.startDate,
          candidate.trainingCampTodo?.startTime
        ),
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

  canSendTrainingCampTodo(candidate) {
    if (!candidate) return false;

    const status = candidate.status || '';
    const todoStatus = candidate.trainingCampTodo?.status || '';
    return Boolean(
      candidate.assignedAgent?.agentId &&
      ['rated', 'signed', 'training'].includes(status) &&
      todoStatus !== 'pending'
    );
  },

  getTrainingCampTodoStatusText(todo) {
    const map = {
      pending: '待主播处理',
      confirmed: '主播已确认入营',
      rejected: '主播已拒绝入营'
    };

    const status = todo?.status || '';
    return map[status] || '未发送';
  },

  bindCampTypeChange(e) {
    const index = Number(e.detail.value || 0);
    const campType = this.data.campTypeOptions[index] || '';
    this.setData({
      'trainingCampForm.campType': campType
    });
  },

  bindStartDateChange(e) {
    this.setData({
      'trainingCampForm.startDate': e.detail.value
    });
  },

  bindStartTimeChange(e) {
    this.setData({
      'trainingCampForm.startTime': e.detail.value
    });
  },

  bindRemarkInput(e) {
    this.setData({
      'trainingCampForm.remark': e.detail.value
    });
  },

  async submitTrainingCampTodo() {
    const { candidateId, trainingCampForm } = this.data;

    if (!trainingCampForm.campType) {
      wx.showToast({ title: '请选择训练营类型', icon: 'none' });
      return;
    }

    if (!trainingCampForm.startDate) {
      wx.showToast({ title: '请选择入营时间', icon: 'none' });
      return;
    }

    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '发送入营待办',
        content: `确认向主播发送${trainingCampForm.campType}待办吗？`,
        success: (res) => resolve(Boolean(res.confirm)),
        fail: () => resolve(false)
      });
    });

    if (!confirm) {
      return;
    }

    try {
      await createTrainingCampTodo(candidateId, trainingCampForm);
      this.setData({
        'trainingCampForm.campType': '',
        'trainingCampForm.startDate': '',
        'trainingCampForm.startTime': '13:00',
        'trainingCampForm.remark': ''
      });
      await this.loadCandidate();
    } catch (error) {
      console.error('[候选人详情] 发送入营待办失败:', error);
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

  handleAvatarError() {
    this.setData({
      'candidate.avatar': ''
    });
  },

  /**
   * 去打分
   */
  goToScore() {
    wx.navigateTo({
      url: `/pages/interviewer/detail/detail?id=${this.data.candidateId}&role=agent`
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
   * 去上传试镜视频
   */
  goToUploadAudition() {
    wx.navigateTo({
      url: `/pages/agent/upload-audition/upload-audition?id=${this.data.candidateId}`
    });
  },

  goToDanceCourseBooking() {
    wx.navigateTo({
      url: `/pages/agent/dance-course-booking/dance-course-booking?id=${this.data.candidateId}`
    });
  },

  previewSharedImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = (this.data.sharedMaterials.images || []).map((item) => item.url).filter(Boolean);
    if (!url || !urls.length) return;
    wx.previewImage({
      current: url,
      urls
    });
  },

  previewTrainingPhoto(e) {
    const { url, urls } = e.currentTarget.dataset;
    if (!url || !urls || !urls.length) return;
    wx.previewImage({
      current: url,
      urls
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
   * 格式化视频时长
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0秒';

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
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
