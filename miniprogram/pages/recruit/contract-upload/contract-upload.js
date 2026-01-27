import { getCandidateById, saveContract, updateCandidateStatus, upgradeToStreamer, CANDIDATE_STATUS } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    contractTypes: ['全职合同', '兼职合同', '实习合同'],
    contractTypeIndex: 0,
    formData: {
      type: '全职合同',
      duration: '12',
      salary: '',
      commission: '20', // 默认提成比例20%
      contractPath: ''
    }
  },

  onLoad(options) {
    this.setData({ candidateId: options.candidateId });
    this.loadCandidate();
  },

  loadCandidate() {
    const candidate = getCandidateById(this.data.candidateId);

    // 从评级中提取建议薪资的平均值
    const salaryRange = candidate.rating?.suggestedSalary || '5000-6000';
    const [min, max] = salaryRange.split('-').map(s => parseInt(s));
    const avgSalary = Math.floor((min + max) / 2);

    this.setData({
      candidate,
      'formData.salary': avgSalary.toString()
    });
  },

  onContractTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      contractTypeIndex: index,
      'formData.type': this.data.contractTypes[index]
    });
  },

  onDurationInput(e) {
    this.setData({ 'formData.duration': e.detail.value });
  },

  onSalaryInput(e) {
    this.setData({ 'formData.salary': e.detail.value });
  },

  onCommissionInput(e) {
    this.setData({ 'formData.commission': e.detail.value });
  },

  onMockUploadContract() {
    const mockPath = `/mock/contracts/contract_${this.data.candidateId}_${Date.now()}.pdf`;
    this.setData({ 'formData.contractPath': mockPath });
    wx.showToast({ title: 'Mock合同已选择', icon: 'success' });
  },

  onSubmit() {
    const { type, duration, salary, commission, contractPath } = this.data.formData;

    // 1. 表单验证
    if (!contractPath) {
      wx.showToast({ title: '请上传合同文件', icon: 'none' });
      return;
    }

    if (!salary || parseInt(salary) <= 0) {
      wx.showToast({ title: '请输入有效薪资', icon: 'none' });
      return;
    }

    if (!commission || parseInt(commission) <= 0 || parseInt(commission) > 100) {
      wx.showToast({ title: '请输入有效提成比例(1-100)', icon: 'none' });
      return;
    }

    const userInfo = wx.getStorageSync('user_info');
    const userId = userInfo?.id || 'AG001';
    const userName = userInfo?.profile?.name || '经纪人';

    wx.showLoading({ title: '处理中...' });

    // 2. 保存合同
    const contractData = {
      type,
      duration: parseInt(duration),
      salary: parseInt(salary),
      filePath: contractPath,
      signedBy: userId,
      signedAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };

    const contractSaved = saveContract(this.data.candidateId, contractData);

    if (!contractSaved) {
      wx.hideLoading();
      wx.showToast({ title: '合同保存失败', icon: 'none' });
      return;
    }

    // 3. 执行角色升级
    const upgradeResult = upgradeToStreamer(this.data.candidateId, {
      agentId: userId,
      agentName: userName,
      salary: parseInt(salary),
      commission: parseInt(commission),
      contractUrl: contractPath
    });

    wx.hideLoading();

    if (upgradeResult.success) {
      console.log('[合同上传] 角色升级成功:', upgradeResult);

      wx.showToast({
        title: upgradeResult.message,
        icon: 'success',
        duration: 2000
      });

      // 4. 跳转到主播欢迎页面
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/anchor/welcome/welcome?streamerId=${this.data.candidateId}`
        });
      }, 2000);
    } else {
      console.error('[合同上传] 角色升级失败:', upgradeResult.message);
      wx.showToast({
        title: upgradeResult.message,
        icon: 'none'
      });
    }
  }
});
