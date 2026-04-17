import {
  confirmFinanceCommissionPayment,
  getFinanceCommissionLedger,
  getFinanceContractReviewList,
  sendFinanceCommissionPayslip
} from '../../../utils/finance-api.js';
import { requireFinanceLogin } from '../../../utils/finance-auth.js';

function buildFallbackDetail(name = '') {
  return {
    candidateId: '',
    candidateName: name || '未命名主播',
    statusLabel: '暂无分润数据',
    totalAmountText: '¥0',
    anchorLevel: '-',
    scoutGrade: '-',
    calculatedAtText: '-',
    paidAtText: '-',
    distribution: [],
    financeStatusLabel: '未提交',
    workflowStatusLabel: '未开始',
    financeReviewer: '',
    contractFileName: '',
    contractFileUrl: '',
    payslipStatus: 'pending',
    payslipStatusLabel: '未发送工资条',
    payslipSentAtText: '-',
    payslipReceiptStatusLabel: '待主播查看',
    payslipViewedAtText: '-',
    payslipSlipNo: '',
    payslipPeriodLabel: '',
    payslipDeliveryNote: ''
  };
}

Page({
  data: {
    loading: false,
    paying: false,
    sendingPayslip: false,
    openingContract: false,
    candidateId: '',
    candidateName: '',
    detail: null
  },

  onLoad(options = {}) {
    const candidateId = decodeURIComponent(options.id || '');
    const candidateName = decodeURIComponent(options.name || '');
    this.setData({
      candidateId,
      candidateName
    });
  },

  onShow() {
    if (!requireFinanceLogin('/pages/finance/profit-sharing-detail/detail')) {
      return;
    }

    this.loadDetail();
  },

  async loadDetail() {
    const { candidateId, candidateName } = this.data;
    this.setData({ loading: true });

    try {
      const [ledgerResult, contractResult] = await Promise.all([
        getFinanceCommissionLedger(),
        getFinanceContractReviewList().catch(() => ({ list: [] }))
      ]);

      const list = ledgerResult.list || [];
      const detail = list.find((item) => item.candidateId === candidateId)
        || list.find((item) => item.candidateName === candidateName)
        || buildFallbackDetail(candidateName);
      const contract = (contractResult.list || []).find((item) => item._id === candidateId)
        || (contractResult.list || []).find((item) => item.displayName === detail.candidateName);
      const mergedDetail = {
        ...detail,
        candidateId: detail.candidateId || candidateId,
        financeStatusLabel: contract?.financeStatusLabel || '未提交',
        workflowStatusLabel: contract?.workflowStatusLabel || '未开始',
        financeReviewer: contract?.financeReviewer || '',
        contractFileName: contract?.contractFileName || '',
        contractFileUrl: contract?.contractFileUrl || ''
      };

      wx.setNavigationBarTitle({
        title: `${mergedDetail.candidateName || '分润'}明细`
      });

      this.setData({
        detail: mergedDetail
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      this.setData({
        detail: buildFallbackDetail(candidateName)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async confirmPayment() {
    const { detail, paying } = this.data;
    if (paying || !detail?.candidateId) {
      return;
    }

    if (detail.statusLabel === '已支付') {
      wx.showToast({
        title: '该分润已支付',
        icon: 'none'
      });
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '确认支付',
        content: '确认该主播分润已完成支付？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ paying: true });

    try {
      const result = await confirmFinanceCommissionPayment(detail.candidateId);

      wx.showToast({
        title: result.message || '支付确认成功',
        icon: 'success'
      });

      this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '确认支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ paying: false });
    }
  },

  async sendPayslip() {
    const { detail, sendingPayslip } = this.data;
    if (sendingPayslip || !detail?.candidateId) {
      return;
    }

    if (detail.status !== 'paid' && detail.statusLabel !== '已支付') {
      wx.showToast({
        title: '请先完成支付确认',
        icon: 'none'
      });
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '发送电子工资条',
        content: detail.payslipStatus === 'sent'
          ? '该主播已收到过工资条，确认重新发送并刷新回执状态？'
          : '确认将本期电子工资条发送到主播端？',
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    this.setData({ sendingPayslip: true });

    try {
      const result = await sendFinanceCommissionPayslip(detail.candidateId);

      wx.showToast({
        title: result.message || '工资条已发送',
        icon: 'success'
      });

      this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '发送工资条失败',
        icon: 'none'
      });
    } finally {
      this.setData({ sendingPayslip: false });
    }
  },

  async openContract() {
    const { detail, openingContract } = this.data;
    const fileUrl = detail?.contractFileUrl || '';
    const fileName = detail?.contractFileName || '合同文件.pdf';

    if (openingContract) {
      return;
    }

    if (!fileUrl) {
      wx.showToast({
        title: '暂无可查看的合同文件',
        icon: 'none'
      });
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

  openCandidate() {
    const candidateId = this.data.detail?.candidateId || this.data.candidateId;
    if (!candidateId) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/finance/candidate-detail/detail?id=${candidateId}`
    });
  },

  openContractReview() {
    const candidateId = this.data.detail?.candidateId || this.data.candidateId;
    wx.navigateTo({
      url: `/pages/finance/contracts/contracts?candidateId=${encodeURIComponent(candidateId || '')}`
    });
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
