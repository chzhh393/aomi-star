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
  let html = escapeHtml(normalizedContent).replace(/\n/g, '<br/>');
  html = highlightFirst(html, normalizedCampType);

  const timeCandidates = formatInviteDateTime(startDate, startTime);
  for (const keyword of timeCandidates) {
    const nextHtml = highlightFirst(html, keyword);
    if (nextHtml !== html) {
      html = nextHtml;
      break;
    }
  }

  return html;
}

Page({
  data: {
    candidate: null,
    candidateId: '',
    todo: null,
    displayCampType: '',
    invitationRichText: '',
    addressRegionText: '请选择省 / 市 / 区',
    loading: true,
    submitting: false,
    decision: 'confirm',
    form: {
      rejectReason: '',
      idCardFront: '',
      idCardBack: '',
      bankCardImage: '',
      idCardName: '',
      idCardNumber: '',
      bankName: '',
      bankAccountName: '',
      bankCardNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      emergencyContactRemark: '',
      communicationAddress: '',
      addressRegion: [],
      addressDetail: ''
    }
  },

  getCandidateName(candidate = this.data.candidate) {
    return String(candidate?.basicInfo?.name || '').trim();
  },

  buildSubmission() {
    const candidateName = this.getCandidateName();
    const form = this.data.form || {};
    const addressRegion = Array.isArray(form.addressRegion) ? form.addressRegion.filter(Boolean) : [];
    const addressDetail = String(form.addressDetail || '').trim();
    const communicationAddress = [addressRegion.join(' '), addressDetail].filter(Boolean).join(' ');

    return {
      idCardFront: form.idCardFront,
      idCardBack: form.idCardBack,
      bankCardImage: form.bankCardImage,
      idCardName: String(form.idCardName || '').trim() || candidateName,
      idCardNumber: form.idCardNumber,
      bankName: form.bankName,
      bankAccountName: String(form.bankAccountName || '').trim() || candidateName,
      bankCardNumber: form.bankCardNumber,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
      emergencyContactRelation: form.emergencyContactRelation,
      emergencyContactRemark: form.emergencyContactRemark,
      communicationAddress: communicationAddress || String(form.communicationAddress || '').trim(),
      addressRegion,
      addressDetail
    };
  },

  buildAddressRegionText(addressRegion = []) {
    if (!Array.isArray(addressRegion) || addressRegion.length === 0) {
      return '请选择省 / 市 / 区';
    }
    return addressRegion.filter(Boolean).join(' / ');
  },

  onLoad(options) {
    const entryDecision = options?.decision === 'reject' ? 'reject' : 'confirm';
    this.setData({
      decision: entryDecision
    });
    this.loadCandidate(options.id);
  },

  async loadCandidate(id) {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: id
          ? { action: 'get', data: { id } }
          : { action: 'getByOpenId' }
      });

      const candidate = res.result?.candidate;
      if (!res.result?.success || !candidate) {
        throw new Error(res.result?.error || '未找到候选人');
      }

      const todo = candidate.trainingCampTodo || null;
      if (!todo || todo.status !== 'pending') {
        wx.showModal({
          title: '暂无待办',
          content: '当前没有待处理的入营待办',
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }

      const submission = todo.submission || candidate.onboardingProfile || {};
      const candidateName = this.getCandidateName(candidate);
      const addressRegion = Array.isArray(submission.addressRegion) ? submission.addressRegion : [];
      const addressDetail = String(submission.addressDetail || '').trim();
      this.setData({
        candidate,
        candidateId: candidate._id,
        todo,
        displayCampType: normalizeTrainingCampType(todo?.campType),
        invitationRichText: buildInvitationRichText(
          todo?.invitationContent,
          todo?.campType,
          todo?.startDate,
          todo?.startTime
        ),
        loading: false,
        form: {
          ...this.data.form,
          ...submission,
          idCardName: submission.idCardName || candidateName,
          bankAccountName: submission.bankAccountName || candidateName,
          addressRegion,
          addressDetail
        },
        addressRegionText: this.buildAddressRegionText(addressRegion)
      });
    } catch (error) {
      console.error('[training-camp] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1200);
    }
  },

  switchDecision(e) {
    this.setData({
      decision: e.currentTarget.dataset.value
    });
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  handleRegionChange(e) {
    const addressRegion = e.detail.value || [];
    this.setData({
      'form.addressRegion': addressRegion,
      addressRegionText: this.buildAddressRegionText(addressRegion)
    });
  },

  async chooseImage(e) {
    const field = e.currentTarget.dataset.field;
    if (!field || !this.data.candidateId) {
      return;
    }

    const res = await new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      });
    }).catch(() => null);

    const tempFilePath = res?.tempFiles?.[0]?.tempFilePath;
    if (!tempFilePath) {
      return;
    }

    wx.showLoading({ title: '上传中...', mask: true });
    try {
      const ext = tempFilePath.split('.').pop() || 'jpg';
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `training-camp/${this.data.candidateId}/${field}_${Date.now()}.${ext}`,
        filePath: tempFilePath
      });

      this.setData({
        [`form.${field}`]: uploadRes.fileID
      });
    } catch (error) {
      console.error('[training-camp] 上传失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  validateForm() {
    const { decision } = this.data;
    if (decision === 'reject') {
      if (!String(this.data.form.rejectReason || '').trim()) {
        return '请填写拒绝原因';
      }
      return '';
    }

    const form = this.buildSubmission();

    const requiredFields = [
      ['idCardFront', '请上传身份证人像面'],
      ['idCardBack', '请上传身份证国徽面'],
      ['bankCardImage', '请上传银行卡照片'],
      ['idCardName', '请输入身份证姓名'],
      ['idCardNumber', '请输入身份证号'],
      ['bankName', '请输入开户行'],
      ['bankAccountName', '请输入银行卡户名'],
      ['bankCardNumber', '请输入银行卡号'],
      ['emergencyContactName', '请输入紧急联系人姓名'],
      ['emergencyContactPhone', '请输入紧急联系人手机号'],
      ['emergencyContactRelation', '请输入紧急联系人关系'],
      ['addressRegion', '请选择省市区'],
      ['addressDetail', '请输入详细地址']
    ];

    for (const [field, message] of requiredFields) {
      if (field === 'addressRegion') {
        if (!Array.isArray(form.addressRegion) || form.addressRegion.length !== 3) {
          return message;
        }
        continue;
      }

      if (!String(form[field] || '').trim()) {
        return message;
      }
    }

    return '';
  },

  async handleSubmit() {
    const validationError = this.validateForm();
    if (validationError) {
      wx.showToast({
        title: validationError,
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      const submission = this.buildSubmission();
      const payload = {
        decision: this.data.decision,
        rejectReason: this.data.form.rejectReason,
        submission: this.data.decision === 'confirm' ? submission : {}
      };

      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'respondTrainingCampTodo',
          data: payload
        }
      });

      if (!res.result?.success) {
        throw new Error(res.result?.error || '提交失败');
      }

      wx.showToast({
        title: this.data.decision === 'confirm' ? '已确认入营' : '已提交拒绝',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1200);
    } catch (error) {
      console.error('[training-camp] 提交失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
