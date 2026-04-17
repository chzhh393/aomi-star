import { getFinanceToken, requireFinanceLogin } from '../../../utils/finance-auth.js';

function formatDate(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch {
    return String(value);
  }
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `¥${amount.toLocaleString('zh-CN')}`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return String(value);
  }
}

function normalizeMediaUrl(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.url || value.fileID || value.fileId || value.path || '';
}

function mapSharedMaterials(sharedMaterials = {}) {
  return {
    comment: sharedMaterials.comment || '',
    uploadedBy: sharedMaterials.uploadedBy || '',
    uploadedAt: formatDateTime(sharedMaterials.uploadedAt),
    images: Array.isArray(sharedMaterials.images) ? sharedMaterials.images : [],
    videos: Array.isArray(sharedMaterials.videos) ? sharedMaterials.videos : []
  };
}

function mapInterviewEvaluations(evaluations = []) {
  return evaluations.map((item) => ({
    roleName: item.roleName || item.roleKey || '面试官',
    statusLabel: item.completed ? '已完成' : '待完成',
    evaluatorName: item.evaluatorName || '-',
    evaluatedAtText: formatDateTime(item.evaluatedAt),
    scoreText: item.score || '-',
    commentText: item.comment || '',
    dimensionEntries: Object.entries(item.rawFields?.dimensions || {}),
    styleTags: Array.isArray(item.rawFields?.styleTags) ? item.rawFields.styleTags : []
  }));
}

function mapCandidate(candidate = {}) {
  const basicInfo = candidate.basicInfo || {};
  const experience = candidate.experience || {};
  const expectation = candidate.expectation || {};
  const contractWorkflow = candidate.contractWorkflow || {};
  const draft = contractWorkflow.draft || {};
  const financeReview = contractWorkflow.financeReview || {};
  const commission = candidate.commission || {};
  const distribution = Array.isArray(commission.distribution) ? commission.distribution : [];
  const images = candidate.images || {};
  const interview = candidate.interview || {};
  const interviewMaterials = candidate.interviewMaterials || {};
  const photoUrls = [
    images.facePhoto,
    images.lifePhoto1,
    images.lifePhoto2,
    images.fullBody,
    ...(Array.isArray(interview.photos) ? interview.photos : []),
    ...(Array.isArray(interviewMaterials.beforeMakeup) ? interviewMaterials.beforeMakeup : []),
    ...(Array.isArray(interviewMaterials.afterMakeup) ? interviewMaterials.afterMakeup : [])
  ].map(normalizeMediaUrl).filter(Boolean);
  const auditionVideos = Array.isArray(candidate.auditionVideos)
    ? candidate.auditionVideos.map((item) => ({
      url: normalizeMediaUrl(item),
      name: item?.name || item?.title || item?.fileName || '试镜视频'
    })).filter((item) => item.url)
    : [];

  return {
    id: candidate._id || '',
    name: basicInfo.name || basicInfo.artName || '未命名候选人',
    artName: basicInfo.artName || '-',
    phone: basicInfo.phone || '-',
    city: basicInfo.city || '-',
    age: basicInfo.age || '-',
    gender: basicInfo.gender || '-',
    height: basicInfo.height ? `${basicInfo.height}cm` : '-',
    weight: basicInfo.weight ? `${basicInfo.weight}kg` : '-',
    status: candidate.status || '-',
    maxFans: experience.maxFans || '-',
    maxIncome: experience.maxIncome ? formatCurrency(experience.maxIncome) : '-',
    platform: experience.platform || '-',
    salaryRange: expectation.salaryRange || '-',
    timeCommitment: expectation.timeCommitment || '-',
    contractTitle: draft.title || draft.fileName || '未创建合同',
    contractType: draft.type || '-',
    contractCommission: draft.commission ? `${draft.commission}%` : '-',
    contractFileName: draft.fileName || '暂无合同文件',
    contractFileUrl: draft.fileUrl || '',
    workflowStatus: contractWorkflow.status || '未开始',
    financeStatus: financeReview.status || '未提交',
    financeComment: financeReview.comment || '暂无',
    financeReviewer: financeReview.reviewedBy?.name || '-',
    financeReviewedAt: formatDate(financeReview.reviewedAt),
    commissionStatus: commission.status === 'paid' ? '已支付' : commission.status === 'calculated' ? '待支付' : '未生成',
    commissionAmount: commission.totalAmount ? formatCurrency(commission.totalAmount) : '¥0',
    commissionCalculatedAt: formatDate(commission.calculatedAt),
    commissionPaidAt: formatDate(commission.paidAt),
    photos: [...new Set(photoUrls)],
    auditionVideos,
    distribution: distribution.map((item) => ({
      scoutName: item.scoutName || '未命名',
      amountText: formatCurrency(item.amount || 0),
      percentage: Number(item.percentage || 0),
      typeLabel: item.type === 'team' ? '团队管理费' : '直接推荐'
    }))
  };
}

Page({
  data: {
    loading: false,
    openingContract: false,
    candidateId: '',
    candidate: null,
    sharedMaterials: {
      comment: '',
      uploadedBy: '',
      uploadedAt: '-',
      images: [],
      videos: []
    },
    interviewEvaluations: []
  },

  onLoad(options = {}) {
    this.setData({
      candidateId: decodeURIComponent(options.id || '')
    });
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/candidate-detail/detail')) {
      return;
    }

    this.loadCandidate();
  },

  async loadCandidate() {
    const { candidateId } = this.data;
    if (!candidateId) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      return;
    }

    const token = getFinanceToken();
    if (!token) {
      wx.showToast({
        title: '登录已失效，请重新登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const [detailRes, evaluationsRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'admin',
          data: {
            action: 'getCandidateDetail',
            data: { id: candidateId },
            token
          }
        }),
        wx.cloud.callFunction({
          name: 'admin',
          data: {
            action: 'getCandidateInterviewEvaluations',
            data: { id: candidateId },
            token
          }
        }).catch(() => ({ result: { success: false, data: {} } }))
      ]);

      const result = detailRes.result || {};
      if (!result.success) {
        throw new Error(result.error || '加载候选人失败');
      }

      const candidate = mapCandidate(result.candidate || {});
      const evaluationResult = evaluationsRes.result || {};
      wx.setNavigationBarTitle({
        title: `${candidate.name}详情`
      });

      this.setData({
        candidate,
        sharedMaterials: mapSharedMaterials(evaluationResult.data?.sharedMaterials || {}),
        interviewEvaluations: mapInterviewEvaluations(evaluationResult.data?.evaluations || [])
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载候选人失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadCandidate().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.candidate?.photos || [];
    if (!url) {
      return;
    }

    wx.previewImage({
      current: url,
      urls
    });
  },

  previewSharedImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = (this.data.sharedMaterials.images || []).map((item) => item.url).filter(Boolean);
    if (!url) {
      return;
    }

    wx.previewImage({
      current: url,
      urls
    });
  },

  openVideo(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) {
      wx.showToast({
        title: '视频地址缺失',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '视频链接已复制',
          icon: 'success'
        });
      }
    });
  },

  async openContract() {
    const candidate = this.data.candidate || {};
    const fileUrl = candidate.contractFileUrl || '';
    if (!fileUrl || this.data.openingContract) {
      if (!fileUrl) {
        wx.showToast({
          title: '暂无可查看的合同文件',
          icon: 'none'
        });
      }
      return;
    }

    this.setData({ openingContract: true });
    wx.showLoading({
      title: '打开合同中...'
    });

    try {
      let filePath = '';
      if (fileUrl.startsWith('cloud://')) {
        const downloadRes = await wx.cloud.downloadFile({
          fileID: fileUrl
        });
        filePath = downloadRes.tempFilePath;
      } else {
        const downloadRes = await wx.downloadFile({
          url: fileUrl
        });
        if (downloadRes.statusCode !== 200) {
          throw new Error('合同下载失败');
        }
        filePath = downloadRes.tempFilePath;
      }

      await wx.openDocument({
        filePath,
        showMenu: true,
        fileType: 'pdf'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '打开合同失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({ openingContract: false });
    }
  },

  openContractReview() {
    const candidateId = this.data.candidate?.id || this.data.candidateId;
    if (!candidateId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/finance/contracts/contracts?candidateId=${encodeURIComponent(candidateId)}`
    });
  },

  openProfitSharingDetail() {
    const candidate = this.data.candidate || {};
    const candidateId = candidate.id || this.data.candidateId;
    const candidateName = candidate.name || '';
    if (!candidateId && !candidateName) {
      return;
    }

    const params = [];
    if (candidateId) {
      params.push(`id=${encodeURIComponent(candidateId)}`);
    }
    if (candidateName) {
      params.push(`name=${encodeURIComponent(candidateName)}`);
    }

    wx.navigateTo({
      url: `/pages/finance/profit-sharing-detail/detail${params.length ? `?${params.join('&')}` : ''}`
    });
  }
});
