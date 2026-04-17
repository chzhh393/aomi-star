import { getAgentInfo, requireAgentLogin } from '../../../utils/agent-auth.js';
import {
  getCandidateAssignedAgent,
  getCandidateAvatar,
  getCandidateDisplayName,
  getCandidateLiveName
} from '../../../utils/interviewer.js';
import {
  getCompletedInterviewCandidates,
  getPendingInterviewCandidates
} from '../../../utils/interview-api.js';

const TAB_OPTIONS = [
  { value: 'pending', label: '待总评' },
  { value: 'reviewed', label: '已评价' }
];

async function hydrateCandidateAvatars(list = []) {
  const candidateList = Array.isArray(list) ? list : [];
  const cloudFileIds = Array.from(new Set(
    candidateList
      .map((item) => item?.avatar)
      .filter((avatar) => typeof avatar === 'string' && avatar.startsWith('cloud://'))
  ));

  if (!cloudFileIds.length) {
    return candidateList;
  }

  const applyTempUrls = (fileList = []) => {
    const tempUrlMap = new Map(
      fileList.map((item) => [
        item.fileID || item.fileid,
        item.tempFileURL || item.download_url || ''
      ])
    );

    return candidateList.map((item) => ({
      ...item,
      avatar: item.avatar && item.avatar.startsWith('cloud://')
        ? (tempUrlMap.get(item.avatar) || '')
        : item.avatar
    }));
  };

  const getTempUrlsByAdminApi = async () => {
    const res = await wx.cloud.callFunction({
      name: 'admin-api',
      data: {
        apiPath: '/cloudfile',
        apiBody: {
          fileIds: cloudFileIds
        }
      }
    });
    const body = res?.result?.body
      ? JSON.parse(res.result.body)
      : (res?.result || {});
    const fileList = Array.isArray(body?.file_list) ? body.file_list : [];
    console.log('[review-board] avatar temp urls from admin-api', fileList);
    return applyTempUrls(fileList);
  };

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: cloudFileIds
    });
    const fileList = Array.isArray(res?.fileList) ? res.fileList : [];

    console.log('[review-board] avatar temp urls', fileList.map((item) => ({
      fileID: item.fileID,
      status: item.status,
      tempFileURL: item.tempFileURL,
      errMsg: item.errMsg
    })));

    const hasAuthorityError = fileList.some((item) => String(item?.errMsg || '').includes('STORAGE_EXCEED_AUTHORITY'));
    if (hasAuthorityError) {
      return await getTempUrlsByAdminApi();
    }

    return applyTempUrls(fileList);
  } catch (error) {
    console.warn('[review-board] 获取头像临时链接失败:', error);
    try {
      return await getTempUrlsByAdminApi();
    } catch (fallbackError) {
      console.warn('[review-board] admin-api 获取头像临时链接失败:', fallbackError);
      return candidateList.map((item) => ({
        ...item,
        avatar: item.avatar && item.avatar.startsWith('cloud://') ? '' : item.avatar
      }));
    }
  }
}

function mapCandidate(candidate = {}) {
  const assignedAgent = getCandidateAssignedAgent(candidate);
  const name = getCandidateDisplayName(candidate);
  const finalDecision = candidate.interviewFinalDecision || {};
  const decision = finalDecision.decision || '';

  return {
    _id: candidate._id || candidate.candidateId || '',
    name,
    nameInitial: String(name || '候').charAt(0),
    avatar: getCandidateAvatar(candidate),
    liveName: getCandidateLiveName(candidate) || '待补直播名',
    assignedAgentName: assignedAgent?.name || '待分配',
    assignedAgentPhone: assignedAgent?.phone || '暂未补充',
    statusLabel: decision === 'rejected'
      ? '未通过'
      : decision === 'accepted'
        ? '已录取'
        : decision === 'pending'
          ? '待定区'
          : (candidate.status || '处理中'),
    rejectReason: decision === 'rejected' ? String(finalDecision.comment || '').trim() : '',
    detailPath: `/pages/recruit/rating-review/rating-review?candidateId=${candidate._id || candidate.candidateId}&role=admin`
  };
}

Page({
  data: {
    loading: false,
    currentTab: 'pending',
    tabs: TAB_OPTIONS,
    pendingList: [],
    reviewedList: [],
    candidateList: [],
    stats: {
      pending: 0,
      reviewed: 0
    }
  },

  onShow() {
    if (!requireAgentLogin({
      redirectUrl: '/pages/admin/review-board/review-board',
      allowedRoles: ['admin']
    })) {
      return;
    }

    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const agentInfo = getAgentInfo() || {};
      const operatorId = agentInfo._id || agentInfo.id || agentInfo.username || agentInfo.name || '';
      const operatorName = agentInfo.name || agentInfo.username || '';
      const [pendingRes, reviewedRes] = await Promise.all([
        getPendingInterviewCandidates({
          role: 'admin',
          operatorId,
          operatorName,
          page: 1,
          pageSize: 100
        }).catch(() => ({ data: { list: [] } })),
        getCompletedInterviewCandidates({
          role: 'admin',
          operatorId,
          operatorName,
          page: 1,
          pageSize: 100
        }).catch(() => ({ data: { list: [] } }))
      ]);

      console.log('[review-board] raw pending candidates', (pendingRes?.data?.list || []).slice(0, 8).map((item) => ({
        id: item?._id || item?.candidateId,
        name: item?.name || item?.basicInfo?.name,
        avatar: item?.avatar,
        avatarUrl: item?.avatarUrl,
        photo: item?.photo,
        basicAvatar: item?.basicInfo?.avatar,
        basicFacePhoto: item?.basicInfo?.facePhoto,
        imageFacePhoto: item?.images?.facePhoto,
        imageLifePhoto1: item?.images?.lifePhoto1
      })));

      const pendingList = Array.isArray(pendingRes?.data?.list)
        ? pendingRes.data.list.map(mapCandidate)
        : [];
      const reviewedList = Array.isArray(reviewedRes?.data?.list)
        ? reviewedRes.data.list.map(mapCandidate)
        : [];

      console.log('[review-board] mapped pending candidates', pendingList.slice(0, 8).map((item) => ({
        id: item._id,
        name: item.name,
        avatar: item.avatar
      })));

      const [hydratedPendingList, hydratedReviewedList] = await Promise.all([
        hydrateCandidateAvatars(pendingList),
        hydrateCandidateAvatars(reviewedList)
      ]);

      console.log('[review-board] hydrated pending candidates', hydratedPendingList.slice(0, 8).map((item) => ({
        id: item._id,
        name: item.name,
        avatar: item.avatar
      })));

      this.setData({
        pendingList: hydratedPendingList,
        reviewedList: hydratedReviewedList,
        stats: {
          pending: hydratedPendingList.length,
          reviewed: hydratedReviewedList.length
        }
      }, () => {
        this.applyTab();
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  applyTab() {
    const { currentTab, pendingList, reviewedList } = this.data;
    this.setData({
      candidateList: currentTab === 'pending' ? pendingList : reviewedList
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: tab
    }, () => {
      this.applyTab();
    });
  },

  goToDetail(e) {
    const { path } = e.currentTarget.dataset;
    if (!path) {
      return;
    }

    wx.navigateTo({ url: path });
  },

  handleAvatarError(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const patchAvatar = (list = []) => list.map((item) => (
      item._id === id
        ? { ...item, avatar: '' }
        : item
    ));

    this.setData({
      pendingList: patchAvatar(this.data.pendingList),
      reviewedList: patchAvatar(this.data.reviewedList),
      candidateList: patchAvatar(this.data.candidateList)
    });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
