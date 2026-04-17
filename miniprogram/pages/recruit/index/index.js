// pages/recruit/index/index.js
// 主播招募首页

import { requireLogin } from '../../../utils/auth.js';

function safeDecode(value) {
  const normalized = String(value || '');
  if (!normalized) {
    return '';
  }

  try {
    return decodeURIComponent(normalized);
  } catch (error) {
    return normalized;
  }
}

Page({
  data: {
    // 星探推荐码
    scoutShareCode: '',
    scoutReferral: null,

    // 公司信息
    companyName: '奥米光年',
    companySlogan: '在5000平的舞台上，做自己的合伙人',

    // 岗位基本信息
    jobInfo: {
      salary: '8000-13000元保底 + 22%-26%流水分成',
      age: '18-30',
      height: '175-190cm',
      experience: '经验不限，有无经验均可'
    },

    // 核心竞争力
    advantages: [
      { icon: '/images/recruit/icon-training.png', title: '国际化特训', desc: '韩国练习生体系化特训，顶级舞蹈老师编舞' },
      { icon: '/images/recruit/icon-influencer.png', title: '网红策划', desc: '定期策划与明星、大网红的合作机会' },
      { icon: '/images/recruit/icon-money.png', title: '多元变现', desc: '音乐节演出、品牌合作、综艺录制等' },
      { icon: '/images/recruit/icon-data.png', title: '数据驱动', desc: 'AI模型精准定位吸粉点，拒绝无效直播' }
    ],

    // 公司优势
    companyFeatures: [
      { title: '精英圈层', desc: '创始团队来自阿里、字节跳动等大厂' },
      { title: '硬核保障', desc: '5000平独栋实景直播基地' },
      { title: '全能进化', desc: '培养全链路闭环能力的全能型人才' },
      { title: '资源直通', desc: '一线网红及明星合作矩阵' }
    ]
  },

  onLoad(options) {
    // 获取星探推荐上下文（query > App全局 > 本地scene缓存）
    const app = getApp();
    const referralFromQuery = {
      scoutShareCode: safeDecode((options && (options.ref || options.shareCode)) || ''),
      scoutId: safeDecode((options && options.scoutId) || ''),
      scoutName: safeDecode((options && options.scoutName) || '')
    };
    const referralFromGlobal = app && typeof app.getScoutReferral === 'function'
      ? (app.getScoutReferral() || {})
      : {};
    const sceneParams = wx.getStorageSync('scene_params') || {};
    const referralFromScene = {
      scoutShareCode: safeDecode(sceneParams.scoutShareCode || ''),
      scoutId: safeDecode(sceneParams.scoutId || ''),
      scoutName: safeDecode(sceneParams.scoutName || '')
    };
    const scoutReferral = {
      scoutShareCode: referralFromQuery.scoutShareCode || safeDecode(referralFromGlobal.scoutShareCode) || referralFromScene.scoutShareCode || '',
      scoutId: referralFromQuery.scoutId || safeDecode(referralFromGlobal.scoutId) || referralFromScene.scoutId || '',
      scoutName: referralFromQuery.scoutName || safeDecode(referralFromGlobal.scoutName) || referralFromScene.scoutName || ''
    };
    const scoutShareCode = scoutReferral.scoutShareCode;

    if (scoutReferral.scoutShareCode || scoutReferral.scoutId || scoutReferral.scoutName) {
      this.setData({
        scoutShareCode,
        scoutReferral
      });
      console.log('[招募首页] 检测到星探推荐信息:', scoutReferral);
    }

    // 页面加载时不强制登录，让游客可以浏览
    console.log('[招募首页] 页面加载');
  },

  // 构建报名页链接（携带推荐码）
  getApplyUrl() {
    const referral = this.data.scoutReferral || {};
    const query = [];
    if (referral.scoutShareCode) {
      query.push(`ref=${encodeURIComponent(referral.scoutShareCode)}`);
    }
    if (referral.scoutId) {
      query.push(`scoutId=${encodeURIComponent(referral.scoutId)}`);
    }
    if (referral.scoutName) {
      query.push(`scoutName=${encodeURIComponent(referral.scoutName)}`);
    }
    return query.length
      ? `/pages/recruit/apply/apply?${query.join('&')}`
      : '/pages/recruit/apply/apply';
  },

  // 跳转到报名表单（需要登录）
  async goToApply() {
    // 检查本地是否有报名记录
    const candidateId = wx.getStorageSync('myCandidateId');
    if (candidateId) {
      // 向云端验证记录是否仍存在（后台可能已删除）
      try {
        wx.showLoading({ title: '检查中...' });
        const res = await wx.cloud.callFunction({
          name: 'candidate',
          data: { action: 'get', data: { id: candidateId } }
        });
        wx.hideLoading();

        if (res.result && res.result.success && res.result.candidate) {
          // 记录仍存在，提示已报名
          wx.showModal({
            title: '提示',
            content: '您已报名，是否查看报名状态？',
            confirmText: '查看状态',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: `/pages/recruit/status/status?id=${candidateId}`
                });
              }
            }
          });
          return;
        } else {
          // 记录已被删除，清除本地缓存
          wx.removeStorageSync('myCandidateId');
          console.log('[招募首页] 候选人记录已被删除，清除本地缓存');
        }
      } catch (error) {
        wx.hideLoading();
        // 查询失败时也清除缓存，允许重新报名
        wx.removeStorageSync('myCandidateId');
        console.error('[招募首页] 验证候选人记录失败:', error);
      }
    }

    // 需要登录后才能报名
    await requireLogin({
      title: '登录提示',
      content: '报名前需要登录微信账号，以便后续查看报名进度',
      onSuccess: () => {
        console.log('[招募首页] 登录成功，跳转报名页');
        // 传递星探推荐码
        const url = this.getApplyUrl();
        wx.navigateTo({ url });
      },
      onCancel: () => {
        console.log('[招募首页] 用户取消登录');
      }
    });
  },

  // 查询报名状态（需要登录）
  async checkStatus() {
    await requireLogin({
      title: '登录提示',
      content: '查看报名状态需要先登录',
      onSuccess: async () => {
        // 从云端查询最新状态（本地缓存可能已过期）
        wx.showLoading({ title: '查询中...' });

        try {
          const res = await wx.cloud.callFunction({
            name: 'candidate',
            data: { action: 'getByOpenId' }
          });

          wx.hideLoading();

          if (res.result && res.result.success && res.result.candidate) {
            // 找到报名记录，保存到本地并跳转
            const candidateId = res.result.candidate.candidateNo || res.result.candidate._id;
            wx.setStorageSync('myCandidateId', candidateId);
            wx.navigateTo({
              url: `/pages/recruit/status/status?id=${candidateId}`
            });
          } else {
            // 没有报名记录
            wx.showModal({
              title: '提示',
              content: '您还未报名，请先填写报名表单',
              confirmText: '去报名',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 传递星探推荐码
                  const url = this.getApplyUrl();
                  wx.navigateTo({ url });
                }
              }
            });
          }
        } catch (error) {
          wx.hideLoading();
          console.error('[招募首页] 查询报名状态失败:', error);
          wx.showToast({ title: '查询失败，请重试', icon: 'none' });
        }
      }
    });
  }
});
