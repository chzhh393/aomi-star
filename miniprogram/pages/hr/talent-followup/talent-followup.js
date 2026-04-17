import { buildFollowUpCandidates } from '../../../utils/hr-dashboard.js';
import { getHRCandidateList, saveHRFollowUp } from '../../../utils/hr-api.js';
import {
  getCandidateAvatar,
  getCandidateDisplayName,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

Page({
  data: {
    candidates: [],
    dueCount: 0
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const hydratedCandidates = await hydrateCandidateAvatarList(await getHRCandidateList({ page: 1, pageSize: 100 }));
      const candidates = buildFollowUpCandidates(hydratedCandidates)
        .map((candidate) => ({
          ...candidate,
          recordId: candidate._id || candidate.id,
          displayName: getCandidateDisplayName(candidate),
          displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
          avatar: candidate?.avatar || getCandidateAvatar(candidate)
        }));
      this.setData({
        candidates,
        dueCount: candidates.filter((item) => item.reminderDue).length
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  onViewCandidate(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.candidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    wx.showModal({
      title: candidate.basicInfo?.name || '候选人',
      content: `评级：${candidate.followUpGrade}\n提醒日期：${candidate.reminderDate || '待生成'}\n来源：${candidate.source || '未知来源'}\n说明：${candidate.followUp?.note || '该选手近期可能有变动，建议回访。'}`,
      showCancel: false
    });
  },

  async onMarkFollowed(e) {
    const { id } = e.currentTarget.dataset;
    try {
      await saveHRFollowUp({
        candidateId: id,
        action: 'callback',
        note: '已在人才回访库完成本轮回访，系统自动顺延 30 天提醒。'
      });
      this.loadData();
      wx.showToast({
        title: '已登记回访',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '登记失败',
        icon: 'none'
      });
    }
  }
});
