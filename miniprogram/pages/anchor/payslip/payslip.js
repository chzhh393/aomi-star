function buildEmptyPayslip() {
  return {
    exists: false,
    candidateName: '主播',
    periodLabel: '',
    slipNo: '',
    totalAmountText: '¥0',
    sentAtText: '-',
    paidAtText: '-',
    receiptStatusLabel: '待查看',
    receiptViewedAtText: '-',
    deliveryNote: '财务发放后可在这里查看电子工资条。',
    distribution: []
  };
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function normalizePayslip(candidate = {}) {
  const commission = candidate.commission || {};
  const payslip = commission.payslip || {};
  const distribution = Array.isArray(payslip.distribution) ? payslip.distribution : [];
  const receiptViewedAtText = payslip.receiptViewedAtText || formatDateTime(payslip.receiptViewedAt);

  if (payslip.status !== 'sent') {
    return buildEmptyPayslip();
  }

  return {
    exists: true,
    candidateName: candidate.liveName || candidate.basicInfo?.artName || candidate.basicInfo?.name || '主播',
    periodLabel: payslip.periodLabel || '本期电子工资条',
    slipNo: payslip.slipNo || '',
    totalAmountText: payslip.totalAmountText || '¥0',
    sentAtText: formatDateTime(payslip.sentAt),
    paidAtText: formatDateTime(payslip.paidAt),
    receiptStatusLabel: payslip.receiptStatus === 'viewed' ? '已查看' : '待查看',
    receiptViewedAtText: receiptViewedAtText || '-',
    deliveryNote: payslip.deliveryNote || '财务已发送电子工资条，可在主播端查看。',
    distribution: distribution.map((item) => ({
      scoutId: item.scoutId || '',
      scoutName: item.scoutName || '未命名星探',
      amountText: item.amountText || '¥0',
      percentage: item.percentage || 0,
      typeLabel: item.typeLabel || '直接推荐'
    }))
  };
}

Page({
  data: {
    loading: true,
    payslip: buildEmptyPayslip()
  },

  onShow() {
    this.loadPayslip();
  },

  async loadPayslip() {
    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });
      const result = res.result || {};
      if (!result.success || !result.candidate) {
        throw new Error(result.error || '未找到主播信息');
      }

      const payslip = normalizePayslip(result.candidate);
      this.setData({ payslip });

      if (payslip.exists && payslip.receiptStatusLabel !== '已查看') {
        await wx.cloud.callFunction({
          name: 'candidate',
          data: { action: 'markPayslipRead' }
        });

        this.setData({
          'payslip.receiptStatusLabel': '已查看',
          'payslip.receiptViewedAtText': formatDateTime(new Date())
        });
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '加载工资条失败',
        icon: 'none'
      });
      this.setData({
        payslip: buildEmptyPayslip()
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadPayslip().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
