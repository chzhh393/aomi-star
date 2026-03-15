// pages/scout/home/home.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';
import { getGradeLabel, getUpgradeProgress } from '../../../utils/scout-level.js';

Page({
  data: {
    loading: true,
    scout: null,
    gradeLabel: '',
    upgradeProgress: null,
    referrals: [],
    filteredReferrals: [],
    currentFilter: 'all',
    shareImagePath: '',

    statusMap: {
      'pending': '信息审核',
      'approved': '审核通过',
      'interview_scheduled': '面试阶段',
      'training': '培训阶段',
      'signed': '签约阶段',
      'live': '成团开播',
      'probation': '考核期',
      'rejected': '未通过'
    },
    // 主播生命周期阶段（有序）
    lifecycleStages: [
      { key: 'pending', label: '审核' },
      { key: 'interview_scheduled', label: '面试' },
      { key: 'training', label: '培训' },
      { key: 'signed', label: '签约' },
      { key: 'live', label: '开播' },
      { key: 'probation', label: '考核' }
    ]
  },

  onLoad() {
    this.ensureLogin();
  },

  onShow() {
    this.loadScoutData();
  },

  onPullDownRefresh() {
    this.loadScoutData();
  },

  async ensureLogin() {
    const openId = getCurrentOpenId();
    if (!openId) {
      await requireLogin({
        title: '需要登录',
        content: '请先登录后查看星探工作台',
        onSuccess: () => {
          this.loadScoutData();
        },
        onCancel: () => {
          wx.navigateBack();
        }
      });
    }
  },

  async loadScoutData() {
    this.setData({ loading: true });

    try {
      const scoutRes = await wx.cloud.callFunction({
        name: 'scout',
        data: { action: 'getMyInfo' }
      });

      if (!scoutRes.result || !scoutRes.result.success) {
        wx.showModal({
          title: '提示',
          content: '您还未申请成为星探，是否前往申请？',
          confirmText: '去申请',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.redirectTo({ url: '/pages/scout/register/register' });
            } else {
              wx.navigateBack();
            }
          }
        });
        return;
      }

      const scout = scoutRes.result.scout;

      // 如果是待审核状态，只显示等待信息
      if (scout.status === 'pending') {
        this.setData({ scout, loading: false });
        wx.stopPullDownRefresh();
        return;
      }

      // 如果被拒绝
      if (scout.status === 'rejected') {
        this.setData({ scout, loading: false });
        wx.stopPullDownRefresh();
        return;
      }

      // 计算等级信息
      const grade = scout.grade || 'rookie';
      const gradeLabel = getGradeLabel(grade);
      const signedCount = scout.stats?.signedCount || 0;
      const upgradeProgress = getUpgradeProgress(grade, signedCount);

      // 获取推荐的候选人列表
      const referralsRes = await wx.cloud.callFunction({
        name: 'scout',
        data: {
          action: 'getMyReferrals',
          data: { status: 'all' }
        }
      });

      // 生命周期阶段序号映射
      const stageKeys = ['pending', 'interview_scheduled', 'training', 'signed', 'live', 'probation'];
      const stageOrder = {};
      stageKeys.forEach((k, i) => { stageOrder[k] = i; });
      stageOrder['approved'] = 0;

      let referrals = [];
      if (referralsRes.result && referralsRes.result.success) {
        referrals = (referralsRes.result.referrals || []).map(item => {
          item.createdAtText = this.formatTime(item.createdAt);
          const currentIdx = stageOrder[item.status] !== undefined ? stageOrder[item.status] : -1;
          // 预计算每个阶段的状态：done / current / future
          item._stages = stageKeys.map((key, i) => ({
            key,
            state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future'
          }));
          return item;
        });
      }

      this.setData({
        scout,
        gradeLabel,
        upgradeProgress,
        referrals,
        filteredReferrals: referrals,
        loading: false
      });

      wx.stopPullDownRefresh();

      // 生成分享海报
      this.generateShareImage();
    } catch (error) {
      console.error('[星探工作台] 加载数据失败:', error);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 生成分享海报图片
  generateShareImage() {
    if (this.data.shareImagePath) return; // 已生成过
    const query = this.createSelectorQuery();
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = 500 * dpr;
        canvas.height = 400 * dpr;
        ctx.scale(dpr, dpr);

        // 1. 纯黑背景
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 500, 400);

        // 2. 右侧斜切装饰色块（与报名页 banner 一致）
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(400, 0);
        ctx.lineTo(500, 0);
        ctx.lineTo(500, 400);
        ctx.lineTo(340, 400);
        ctx.closePath();
        ctx.fillStyle = '#13E8DD';
        ctx.fill();
        ctx.restore();

        // 3. 左上角装饰线条
        ctx.strokeStyle = 'rgba(19, 232, 221, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.lineTo(30, 80);
        ctx.lineTo(80, 80);
        ctx.stroke();

        // 4. 顶部英文标签
        ctx.fillStyle = 'rgba(19, 232, 221, 0.6)';
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('AOMI LIGHTYEAR', 40, 120);

        // 5. 主标题 - 奥米光年
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('奥米光年', 40, 180);

        // 6. 青色横线分隔
        ctx.fillStyle = '#13E8DD';
        ctx.fillRect(40, 200, 60, 4);

        // 7. 副标题
        ctx.fillStyle = '#13E8DD';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('主播招募中', 40, 248);

        // 8. 英文副标题
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '600 13px sans-serif';
        ctx.fillText('STREAMER WANTED', 40, 275);

        // 9. Slogan文字
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '20px sans-serif';
        ctx.fillText('你负责发光', 40, 318);
        ctx.fillText('我们负责让全世界看见', 40, 346);

        // 10. 底部CTA - 青色背景按钮
        ctx.fillStyle = '#13E8DD';
        ctx.fillRect(40, 362, 180, 30);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击进入报名 →', 130, 382);

        // 11. 右侧斜切区域上的英文竖排装饰
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.translate(460, 200);
        ctx.rotate(Math.PI / 2);
        ctx.fillText('TALENT RECRUITMENT', 0, 0);
        ctx.restore();

        // 导出为临时文件
        wx.canvasToTempFilePath({
          canvas,
          width: 500 * dpr,
          height: 400 * dpr,
          destWidth: 500,
          destHeight: 400,
          success: (res) => {
            this.setData({ shareImagePath: res.tempFilePath });
          },
          fail: (err) => {
            console.error('[星探工作台] 生成分享图失败:', err);
          }
        });
      });
  },

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  onShareAppMessage() {
    const shareCode = this.data.scout?.shareCode;
    const result = {
      title: '奥米光年 AOMI｜主播招募进行中，期待你的加入！',
      path: `/pages/recruit/index/index?ref=${shareCode}`
    };
    if (this.data.shareImagePath) {
      result.imageUrl = this.data.shareImagePath;
    }
    return result;
  },

  onFilterChange(e) {
    const { filter } = e.currentTarget.dataset;
    const { referrals } = this.data;
    let filtered = referrals;
    if (filter === 'in_progress') {
      // 进行中：审核/面试/培训阶段
      filtered = referrals.filter(item =>
        ['pending', 'approved', 'interview_scheduled', 'training'].includes(item.status)
      );
    } else if (filter === 'settled') {
      // 已签约：签约/开播/考核阶段
      filtered = referrals.filter(item =>
        ['signed', 'live', 'probation'].includes(item.status)
      );
    } else if (filter === 'rejected') {
      filtered = referrals.filter(item => item.status === 'rejected');
    }
    this.setData({
      currentFilter: filter,
      filteredReferrals: filtered
    });
  },

  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recruit/detail/detail?id=${id}&from=scout`
    });
  },

  goGradeIntro() {
    const grade = this.data.scout?.grade || 'rookie';
    const signedCount = this.data.scout?.stats?.signedCount || 0;
    wx.navigateTo({
      url: `/pages/scout/grade-intro/grade-intro?grade=${grade}&signedCount=${signedCount}`
    });
  },

  onRefresh() {
    wx.showLoading({ title: '刷新中...' });
    this.loadScoutData().then(() => {
      wx.hideLoading();
      wx.showToast({ title: '刷新成功', icon: 'success' });
    });
  }
});
