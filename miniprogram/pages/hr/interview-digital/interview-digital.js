import {
  buildInterviewNotice,
  buildRecruitBoardStats,
  getInterviewScoreEntryPath
} from '../../../utils/hr-dashboard.js';
import {
  getHRCandidateList,
  scheduleHRCandidateInterview
} from '../../../utils/hr-api.js';
import {
  getCandidateDisplayName,
  getCandidateAvatar,
  hydrateCandidateAvatarList
} from '../../../utils/interviewer.js';

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Page({
  data: {
    candidateId: '',
    arrangeCandidates: [],
    noticeCandidates: [],
    scoreCandidates: []
  },

  onLoad(options = {}) {
    this.setData({
      candidateId: options.candidateId || ''
    });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const candidates = await hydrateCandidateAvatarList(await getHRCandidateList({ page: 1, pageSize: 100 }));
      const recruitStats = buildRecruitBoardStats(candidates);
      const selectedId = this.data.candidateId;
      let arrangeCandidates = [
        ...recruitStats.buckets.pending_screen,
        ...recruitStats.buckets.pending_invite
      ].map((candidate) => ({
        ...candidate,
        recordId: candidate._id || candidate.id,
        displayName: getCandidateDisplayName(candidate),
        displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
        avatar: candidate?.avatar || getCandidateAvatar(candidate)
      }));
      let noticeCandidates = candidates
        .filter((candidate) => candidate.interview || candidate.interviewSchedule)
        .map((candidate) => ({
          ...candidate,
          recordId: candidate._id || candidate.id,
          displayName: getCandidateDisplayName(candidate),
          displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
          avatar: candidate?.avatar || getCandidateAvatar(candidate),
          scheduleText: `${candidate?.interview?.date || candidate?.interviewSchedule?.date || ''} ${candidate?.interview?.time || candidate?.interviewSchedule?.time || ''} · ${candidate?.interview?.location || candidate?.interviewSchedule?.location || ''}`.trim()
        }));
      let scoreCandidates = candidates
        .filter((candidate) => ['online_test_completed', 'pending_rating', 'rated'].includes(candidate.status))
        .map((candidate) => ({
          ...candidate,
          recordId: candidate._id || candidate.id,
          displayName: getCandidateDisplayName(candidate),
          displayInitial: String(getCandidateDisplayName(candidate) || '候').charAt(0),
          avatar: candidate?.avatar || getCandidateAvatar(candidate)
        }));

      if (selectedId) {
        const keepSelectedFirst = (list) => {
          const selected = list.find((item) => item.recordId === selectedId);
          if (!selected) {
            return list.slice(0, 6);
          }
          return [selected, ...list.filter((item) => item.recordId !== selectedId)].slice(0, 6);
        };
        arrangeCandidates = keepSelectedFirst(arrangeCandidates);
        noticeCandidates = keepSelectedFirst(noticeCandidates);
        scoreCandidates = keepSelectedFirst(scoreCandidates);
      } else {
        arrangeCandidates = arrangeCandidates.slice(0, 6);
        noticeCandidates = noticeCandidates.slice(0, 6);
        scoreCandidates = scoreCandidates.slice(0, 6);
      }

      this.setData({
        arrangeCandidates,
        noticeCandidates,
        scoreCandidates
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  async onArrangeInterview(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.arrangeCandidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '一键发起面试',
        content: `将为 ${candidate.basicInfo?.name || '该候选人'} 默认安排明日 14:00 面试，并自动生成通知。是否继续？`,
        success: (res) => resolve(Boolean(res.confirm))
      });
    });

    if (!confirmed) {
      return;
    }

    const userInfo = wx.getStorageSync('user_info') || {};
    const profile = userInfo.profile || {};

    try {
      wx.showLoading({ title: '安排中...', mask: true });
      await scheduleHRCandidateInterview({
        candidateId: id,
        interviewDate: getTomorrowDate(),
        interviewTime: '14:00',
        location: '奥米光年基地',
        interviewers: [{
          id: userInfo._id || userInfo.id || '',
          role: 'hr',
          name: profile.name || userInfo.username || 'HR'
        }],
        notes: '请携带身份证、淡妆到场，提前 10 分钟签到。'
      });
      wx.hideLoading();
      wx.showToast({
        title: '已发起面试',
        icon: 'success'
      });
      await this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '安排失败',
        icon: 'none'
      });
    }
  },

  onOpenScore(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: getInterviewScoreEntryPath(id) });
  },

  onGenerateNotice(e) {
    const { id } = e.currentTarget.dataset;
    const candidate = this.data.noticeCandidates.find((item) => item.recordId === id);
    if (!candidate) {
      return;
    }

    const noticeText = buildInterviewNotice(candidate);
    wx.setClipboardData({
      data: noticeText,
      success: () => {
        wx.showModal({
          title: '面试通知已生成',
          content: `${noticeText}\n\n内容已复制，可直接发短信或微信。`,
          showCancel: false
        });
      },
      fail: () => {
        wx.showModal({
          title: '面试通知',
          content: noticeText,
          showCancel: false
        });
      }
    });
  }
});
