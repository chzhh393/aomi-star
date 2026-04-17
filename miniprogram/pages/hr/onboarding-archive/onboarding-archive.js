import { getCandidateGrade } from '../../../mock/candidates.js';
import { buildOnboardingStats, getAssetSummaryText } from '../../../utils/hr-dashboard.js';
import {
  completeHRMockESign,
  createHRContractESignTask,
  getHRCandidateList,
  refreshHRContractESignStatus,
  saveHRAssets,
  saveHRContractDraft,
  submitHRContractFinanceReview
} from '../../../utils/hr-api.js';
import {
  getCandidateAvatar,
  getCandidateDisplayName,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

const STANDARD_ASSETS = ['工牌', '宿舍钥匙', '训练服'];
const WORKFLOW_STATUS_LABELS = {
  drafting: '草稿中',
  finance_review: '财务审核中',
  admin_review: '管理员审核中',
  negotiating: '协商中',
  ready_to_sign: '待签署',
  signed: '已签署'
};
const ESIGN_STATUS_LABELS = {
  not_started: '未发起',
  signing: '签署中',
  signed: '已签署'
};

function parseSuggestedSalary(value) {
  if (typeof value === 'number') {
    return value;
  }

  const matches = String(value || '').match(/\d+/g) || [];
  if (matches.length === 0) {
    return 8000;
  }
  const numbers = matches.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
  if (numbers.length === 1) {
    return numbers[0];
  }
  return Math.round(numbers.reduce((sum, item) => sum + item, 0) / numbers.length);
}

function getCandidateId(candidate) {
  return candidate?._id || candidate?.id || '';
}

function formatOnboardingCandidate(candidate) {
  const workflow = candidate.contractWorkflow || {};
  const draft = workflow.draft || {};
  const eSign = workflow.eSign || {};

  return {
    ...candidate,
    recordId: getCandidateId(candidate),
    displayName: getCandidateDisplayName(candidate),
    displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
    avatar: candidate?.avatar || getCandidateAvatar(candidate),
    gradeTag: getCandidateGrade(candidate),
    assetSummaryText: getAssetSummaryText(candidate),
    workflowStatus: workflow.status || '',
    workflowStatusText: WORKFLOW_STATUS_LABELS[workflow.status] || '未开始',
    draftTitle: draft.title || '',
    eSignStatus: ESIGN_STATUS_LABELS[eSign.status] || '未发起',
    eSignMode: eSign.mode || 'mock'
  };
}

Page({
  data: {
    focusCandidateId: '',
    stats: {
      total: 0,
      contractPendingCount: 0,
      signedCount: 0,
      assetPendingCount: 0
    },
    candidates: []
  },

  onLoad(options = {}) {
    this.setData({
      focusCandidateId: options.candidateId || ''
    });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const candidates = await hydrateCandidateAvatarList(await getHRCandidateList({ page: 1, pageSize: 100 }));
      const onboardingStats = buildOnboardingStats(candidates);
      let list = onboardingStats.candidates.map(formatOnboardingCandidate);

      if (this.data.focusCandidateId) {
        const focus = list.find((item) => item.recordId === this.data.focusCandidateId);
        if (focus) {
          list = [focus, ...list.filter((item) => item.recordId !== this.data.focusCandidateId)];
        }
      }

      this.setData({
        stats: {
          total: onboardingStats.candidates.length,
          contractPendingCount: onboardingStats.contractPendingCount,
          signedCount: onboardingStats.signedCount,
          assetPendingCount: onboardingStats.assetPendingCount
        },
        candidates: list
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  async onOpenContract(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.candidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '生成签约草稿',
        content: `将为 ${candidate.basicInfo?.name || '该候选人'} 生成默认合同草稿，并录入底薪、分成与期限。是否继续？`,
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    try {
      wx.showLoading({ title: '保存草稿...', mask: true });
      const salary = parseSuggestedSalary(candidate.rating?.suggestedSalary || candidate.contract?.salary);
      await saveHRContractDraft({
        candidateId: id,
        title: `${candidate.basicInfo?.name || '候选人'}主播签约合同`,
        type: candidate.contract?.type || '主播签约',
        durationMonths: candidate.contract?.durationMonths || 12,
        salary,
        commission: Number(candidate.contract?.commission || candidate.streamerInfo?.commission || 20),
        fileUrl: candidate.contract?.contractUrl || candidate.contractWorkflow?.draft?.fileUrl || `https://example.com/contracts/${id}.pdf`,
        fileName: candidate.contractWorkflow?.draft?.fileName || `${candidate.basicInfo?.name || 'candidate'}-contract.pdf`,
        remark: `${candidate.rating?.grade || getCandidateGrade(candidate)} 级候选人自动生成签约草稿`
      });
      wx.hideLoading();
      wx.showToast({
        title: '合同草稿已保存',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    }
  },

  async onSubmitApproval(e) {
    const { id } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '提交中...', mask: true });
      await submitHRContractFinanceReview(id, 'HR 已完成签约建档，提交财务审核。');
      wx.hideLoading();
      wx.showToast({
        title: '已提交审批',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    }
  },

  async onStartESign(e) {
    const { id } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '发起签约...', mask: true });
      await createHRContractESignTask(id, true);
      wx.hideLoading();
      wx.showToast({
        title: '电子签任务已创建',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '发起失败',
        icon: 'none'
      });
    }
  },

  async onRefreshESign(e) {
    const { id } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '刷新中...', mask: true });
      await refreshHRContractESignStatus(id);
      wx.hideLoading();
      wx.showToast({
        title: '签约状态已刷新',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '刷新失败',
        icon: 'none'
      });
    }
  },

  async onCompleteMockSign(e) {
    const { id } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '签署中...', mask: true });
      await completeHRMockESign(id);
      wx.hideLoading();
      wx.showToast({
        title: '模拟签署完成',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '处理失败',
        icon: 'none'
      });
    }
  },

  async onIssueAssets(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await saveHRAssets({
        candidateId: id,
        items: STANDARD_ASSETS.map((name) => ({
          name,
          status: 'issued'
        }))
      });
      wx.showToast({
        title: '物资已登记',
        icon: 'success'
      });
      this.loadData();
    } catch (error) {
      wx.showToast({
        title: error.message || '登记失败',
        icon: 'none'
      });
    }
  },

  onViewSettlement(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.candidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    const items = Array.isArray(candidate.assets?.items) ? candidate.assets.items : [];
    const content = items.length
      ? items.map((item) => `${item.name}：${item.status === 'returned' ? '已归还' : '待归还 / 可能扣款'}`).join('\n')
      : '当前无物资记录，离职时无需生成扣款清单。';

    wx.showModal({
      title: '物资清单',
      content,
      showCancel: false
    });
  }
});
