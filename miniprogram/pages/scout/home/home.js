// pages/scout/home/home.js
import { requireLogin, getCurrentOpenId } from '../../../utils/auth.js';
import { getGradeLabel, getUpgradeProgress } from '../../../utils/scout-level.js';

Page({
  data: {
    loading: true,
    scout: {
      _id: '',
      status: '',
      grade: 'rookie',
      shareCode: '',
      profile: {
        name: '',
        phone: ''
      },
      stats: {
        referredCount: 0,
        signedCount: 0,
        totalCommission: 0,
        paidCommission: 0
      }
    },
    gradeLabel: '',
    upgradeProgress: null,
    showUpgradeProgress: false,
    showPending: false,
    scoutGradeClass: 'rookie',
    isPartner: false,
    showPartnerLock: true,
    shareCodeText: '-',
    aceFeatureKicker: 'LOCKED FEATURE',
    aceFeatureDesc: '升级到合伙人星探后可开启',
    aceActionClass: 'share-action-disabled',
    referrals: [],
    filteredReferrals: [],
    hasSubScouts: false,
    showReferralEmpty: true,
    subScouts: [],
    teamStats: {
      totalSubScouts: 0,
      activeSubScouts: 0,
      totalReferrals: 0,
      totalSigned: 0
    },
    currentFilter: 'all',
    filterTabs: [
      { key: 'all', label: '全部', activeClass: 'active' },
      { key: 'in_progress', label: '进行中', activeClass: '' },
      { key: 'settled', label: '已签约', activeClass: '' },
      { key: 'rejected', label: '未通过', activeClass: '' }
    ],
    shareImagePath: '',
    aceShareImagePath: '',
    renderShareCanvas: false,
    renderAceShareCanvas: false,
    acePlanVisible: false,
    aceRewards: {
      signingTotal: 300,
      signingAceAmount: '200',
      levelTotals: {
        S: 800,
        A: 500,
        B: 300
      },
      levelAceAmounts: {
        S: '500',
        A: '300',
        B: '200'
      }
    },
    aceManagementAllowance: {
      signing: 100,
      level: {
        S: 300,
        A: 200,
        B: 100
      }
    },
    aceInviteGenerated: false,
    aceInviteLink: '',
    aceInviteSummary: '',
    aceInviteCode: '',
    aceInviteClipboardText: '',
    aceGenerateButtonText: '确定生成',

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

      const rawScout = scoutRes.result.scout || {};
      const scout = {
        _id: rawScout._id || '',
        status: rawScout.status || '',
        grade: rawScout.grade || 'rookie',
        shareCode: rawScout.shareCode || '',
        profile: {
          name: rawScout.profile?.name || '',
          phone: rawScout.profile?.phone || ''
        },
        stats: {
          referredCount: rawScout.stats?.referredCount || 0,
          signedCount: rawScout.stats?.signedCount || 0,
          totalCommission: rawScout.stats?.totalCommission || 0,
          paidCommission: rawScout.stats?.paidCommission || 0
        },
        teamStats: rawScout.teamStats || null
      };
      const subScouts = (scoutRes.result.subScouts || []).map(item => this.normalizeSubScout(item));

      // 如果是待审核状态，只显示等待信息
      if (scout.status === 'pending') {
        this.setData({ scout, showPending: true, loading: false });
        wx.stopPullDownRefresh();
        return;
      }

      // 如果被拒绝，直接进入申请页，避免重复展示未通过界面
      if (scout.status === 'rejected') {
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
        wx.redirectTo({ url: '/pages/scout/register/register' });
        return;
      }

      // 计算等级信息
      const grade = scout.grade || 'rookie';
      const gradeLabel = getGradeLabel(grade);
      const signedCount = scout.stats?.signedCount || 0;
      const upgradeProgress = getUpgradeProgress(grade, signedCount);
      const isPartner = grade === 'partner';

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
          const currentIdx = stageOrder[item.status] !== undefined ? stageOrder[item.status] : -1;
          const stages = stageKeys.map((key, i) => ({
            key,
            label: this.data.lifecycleStages[i].label,
            state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'future'
          }));
          return {
            ...item,
            basicInfo: {
              name: item.basicInfo?.name || '未命名候选人',
              age: item.basicInfo?.age || '-',
              height: item.basicInfo?.height || '-'
            },
            displayMeta: `${item.basicInfo?.age || '-'}岁 | ${item.basicInfo?.height || '-'}cm`,
            createdAtText: this.formatTime(item.createdAt),
            statusText: this.data.statusMap[item.status] || item.status || '',
            showLifecycle: item.status !== 'rejected',
            showSignedHint: item.status === 'signed',
            showProbationHint: item.status === 'probation',
            _stages: stages
          };
        });
      }

      this.setData({
        scout,
        gradeLabel,
        upgradeProgress,
        showPending: false,
        showUpgradeProgress: !!(upgradeProgress && upgradeProgress.nextGrade),
        scoutGradeClass: scout.grade || 'rookie',
        isPartner,
        showPartnerLock: !isPartner,
        shareCodeText: scout.shareCode || '-',
        aceFeatureKicker: isPartner ? 'BUILD TEAM' : 'LOCKED FEATURE',
        aceFeatureDesc: isPartner ? '配置收益分配方案' : '升级到合伙人星探后可开启',
        aceActionClass: isPartner ? '' : 'share-action-disabled',
        hasSubScouts: subScouts.length > 0,
        showReferralEmpty: referrals.length === 0,
        filterTabs: this.buildFilterTabs('all', referrals.length),
        subScouts,
        teamStats: scout.teamStats || this.data.teamStats,
        referrals,
        filteredReferrals: referrals,
        loading: false
      });

      wx.stopPullDownRefresh();
      setTimeout(() => {
        this.prepareRecruitShare();
      }, 300);
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
    if (!this.data.renderShareCanvas) {
      this.setData({ renderShareCanvas: true }, () => {
        setTimeout(() => this.generateShareImage(), 0);
      });
      return;
    }
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
            this.setData({
              shareImagePath: res.tempFilePath,
              renderShareCanvas: false
            });
          },
          fail: (err) => {
            console.error('[星探工作台] 生成分享图失败:', err);
            this.setData({ renderShareCanvas: false });
          }
        });
      });
  },

  normalizeSubScout(item = {}) {
    const status = item.status || '';
    const grade = item.grade || 'rookie';
    return {
      ...item,
      displayName: item.profile?.name || item.name || '未命名星探',
      displayPhone: item.profile?.phone || item.phone || '-',
      statusText: status === 'active' ? '正常' : (status === 'pending' ? '待审核' : '未通过'),
      gradeText: grade === 'partner' ? '合伙人星探' : (grade === 'special' ? '特约星探' : '新锐星探'),
      referredCountText: `${item.stats?.referredCount || 0} 人`,
      signedCountText: `${item.stats?.signedCount || 0} 人`
    };
  },

  buildFilterTabs(currentFilter, referralCount) {
    return [
      { key: 'all', label: `全部(${referralCount})`, activeClass: currentFilter === 'all' ? 'active' : '' },
      { key: 'in_progress', label: '进行中', activeClass: currentFilter === 'in_progress' ? 'active' : '' },
      { key: 'settled', label: '已签约', activeClass: currentFilter === 'settled' ? 'active' : '' },
      { key: 'rejected', label: '未通过', activeClass: currentFilter === 'rejected' ? 'active' : '' }
    ];
  },

  drawAceShareTextBlock(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = String(text || '').split('');
    let line = '';
    let currentY = y;

    chars.forEach((char) => {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });

    if (line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  },

  generateAceShareImage(aceRewards) {
    return new Promise((resolve) => {
      if (!this.data.renderAceShareCanvas) {
        this.setData({ renderAceShareCanvas: true }, () => {
          setTimeout(async () => {
            const result = await this.generateAceShareImage(aceRewards);
            resolve(result);
          }, 0);
        });
        return;
      }
      const aceInvite = this.buildAceInvitePayload(aceRewards);
      const scoutName = this.data.scout?.profile?.name || '星探';
      const signingAmount = this.sanitizeAmount(
        aceRewards.signingAceAmount,
        aceRewards.signingTotal
      );
      const levelS = this.sanitizeAmount(aceRewards.levelAceAmounts.S, aceRewards.levelTotals.S);
      const levelA = this.sanitizeAmount(aceRewards.levelAceAmounts.A, aceRewards.levelTotals.A);
      const levelB = this.sanitizeAmount(aceRewards.levelAceAmounts.B, aceRewards.levelTotals.B);
      const query = this.createSelectorQuery();

      query.select('#aceShareCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            resolve('');
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getWindowInfo().pixelRatio;
          canvas.width = 500 * dpr;
          canvas.height = 560 * dpr;
          ctx.scale(dpr, dpr);

          ctx.fillStyle = '#0b1220';
          ctx.fillRect(0, 0, 500, 560);

          const gradient = ctx.createLinearGradient(0, 0, 500, 220);
          gradient.addColorStop(0, '#fbbf24');
          gradient.addColorStop(0.55, '#f59e0b');
          gradient.addColorStop(1, '#c2410c');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 500, 214);

          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.arc(430, 62, 96, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(458, 86, 48, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.76)';
          ctx.font = '600 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('AOMI LIGHTYEAR  |  ACE INVITATION', 34, 42);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px sans-serif';
          ctx.fillText('王牌星探', 34, 98);
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('专属收益邀请方案', 34, 132);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.font = '20px sans-serif';
          ctx.fillText(`${scoutName} 邀请你加入奥米光年`, 34, 166);

          ctx.fillStyle = '#111827';
          ctx.fillRect(32, 188, 436, 326);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(28, 184, 436, 326);

          ctx.fillStyle = '#fff7ed';
          ctx.fillRect(28, 184, 436, 76);
          ctx.fillStyle = '#9a3412';
          ctx.font = 'bold 30px sans-serif';
          ctx.fillText('收益分配方案', 50, 229);
          ctx.fillStyle = 'rgba(154, 52, 18, 0.72)';
          ctx.font = '18px sans-serif';
          ctx.fillText('收益清晰可见，加入即按此方案绑定', 50, 252);

          const rowTop = 290;
          const rowHeight = 54;
          const labels = ['签约奖', 'S档定级奖', 'A档定级奖', 'B档定级奖'];
          const values = [`${signingAmount} 元`, `${levelS} 元`, `${levelA} 元`, `${levelB} 元`];
          labels.forEach((label, index) => {
            const y = rowTop + (index * rowHeight);
            if (index > 0) {
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(48, y - 24, 396, 1);
            }
            ctx.fillStyle = '#374151';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(label, 50, y);
            ctx.fillStyle = '#111827';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(values[index], 442, y);
          });

          ctx.textAlign = 'left';
          ctx.fillStyle = '#6b7280';
          ctx.font = '18px sans-serif';
          this.drawAceShareTextBlock(ctx, aceInvite.summary, 50, 462, 340, 26);

          ctx.fillStyle = '#111827';
          ctx.fillRect(352, 438, 86, 46);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(348, 434, 86, 46);
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('立即加入', 391, 463);

          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '18px sans-serif';
          let textY = this.drawAceShareTextBlock(ctx, `邀请人：${scoutName}`, 34, 534, 180, 24);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
          ctx.font = '16px sans-serif';
          textY = this.drawAceShareTextBlock(ctx, '打开小程序填写申请，系统将按当前方案记录收益分配。', 34, textY + 4, 268, 22);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
          ctx.textAlign = 'right';
          ctx.fillText('AOMI  ACE  PLAN', 466, textY);

          wx.canvasToTempFilePath({
            canvas,
            width: 500 * dpr,
            height: 560 * dpr,
            destWidth: 500,
            destHeight: 560,
            success: (fileRes) => {
              this.setData({
                aceShareImagePath: fileRes.tempFilePath,
                renderAceShareCanvas: false
              });
              resolve(fileRes.tempFilePath);
            },
            fail: (err) => {
              console.error('[星探工作台] 生成王牌分享图失败:', err);
              this.setData({ renderAceShareCanvas: false });
              resolve('');
            }
          });
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

  sanitizeAmount(value, maxAmount) {
    const cleaned = String(value || '').replace(/[^\d]/g, '');
    const numeric = cleaned ? Number(cleaned) : 0;
    return Math.min(Math.max(numeric, 0), maxAmount);
  },

  calculateAceManagementAllowance(aceRewards) {
    const signingAceAmount = this.sanitizeAmount(
      aceRewards.signingAceAmount,
      aceRewards.signingTotal
    );
    const level = {};
    ['S', 'A', 'B'].forEach((grade) => {
      const total = aceRewards.levelTotals[grade] || 0;
      const amount = this.sanitizeAmount(aceRewards.levelAceAmounts[grade], total);
      level[grade] = total - amount;
    });

    return {
      signing: aceRewards.signingTotal - signingAceAmount,
      level
    };
  },

  buildAceInvitePayload(aceRewards = this.data.aceRewards) {
    const scoutName = this.data.scout?.profile?.name || '星探';
    const signingAmount = this.sanitizeAmount(
      aceRewards.signingAceAmount,
      aceRewards.signingTotal
    );
    const levelS = this.sanitizeAmount(aceRewards.levelAceAmounts.S, aceRewards.levelTotals.S);
    const levelA = this.sanitizeAmount(aceRewards.levelAceAmounts.A, aceRewards.levelTotals.A);
    const levelB = this.sanitizeAmount(aceRewards.levelAceAmounts.B, aceRewards.levelTotals.B);
    const inviteCode = this.data.aceInviteCode || '';
    const path = inviteCode
      ? `/pages/scout/register/register?inviteCode=${encodeURIComponent(inviteCode)}`
      : '';
    const summary = `签约奖${signingAmount}元，定级奖S/A/B分别${levelS}/${levelA}/${levelB}元`;

    return {
      title: `${scoutName}邀请你加入奥米光年，成为王牌星探`,
      path,
      summary,
      inviteCode
    };
  },

  buildRecruitAnchorShare() {
    const shareCode = encodeURIComponent(this.data.scout?.shareCode || '');
    const scoutId = encodeURIComponent(this.data.scout?._id || '');
    const scoutName = encodeURIComponent(this.data.scout?.profile?.name || '');
    const inviterName = this.data.scout?.profile?.name || '星探';
    const result = {
      title: `${inviterName}邀请你加入奥米光年 AOMI | 主播招募进行中，期待你的加入!`,
      path: `/pages/recruit/index/index?ref=${shareCode}&scoutId=${scoutId}&scoutName=${scoutName}`
    };
    if (this.data.shareImagePath) {
      result.imageUrl = this.data.shareImagePath;
    }
    return result;
  },

  prepareRecruitShare() {
    if (this.data.shareImagePath) {
      return;
    }
    this.generateShareImage();
  },

  async prepareAceShare() {
    if (this.data.aceShareImagePath) {
      return;
    }
    if (!this.data.aceInviteGenerated) {
      return;
    }
    wx.showLoading({ title: '准备海报...' });
    try {
      const aceShareImagePath = await this.generateAceShareImage(this.data.aceRewards);
      if (aceShareImagePath) {
        this.setData({ aceShareImagePath });
      }
    } finally {
      wx.hideLoading();
    }
  },

  onShareTimeline() {
    return this.buildRecruitAnchorShare();
  },

  onShareAppMessage(options) {
    if (options?.target?.dataset?.shareType === 'ace-scout') {
      const aceInvite = this.buildAceInvitePayload();
      const result = {
        title: `${aceInvite.title} | ${aceInvite.summary}`,
        path: aceInvite.path
      };
      if (this.data.aceShareImagePath) {
        result.imageUrl = this.data.aceShareImagePath;
      }
      return result;
    }

    if (options?.target?.dataset?.shareType === 'recruit-scout') {
      const scoutId = encodeURIComponent(this.data.scout?._id || '');
      const scoutName = encodeURIComponent(this.data.scout?.profile?.name || '');
      const parentShareCode = encodeURIComponent(this.data.scout?.shareCode || '');
      return {
        title: `${this.data.scout?.profile?.name || '星探'}正在招募王牌星探`,
        path: `/pages/scout/register/register?parentScoutId=${scoutId}&parentScoutName=${scoutName}&parentShareCode=${parentShareCode}&inviteRole=ace`
      };
    }

    return this.buildRecruitAnchorShare();
  },

  openAcePlanModal() {
    if (this.data.scout?.grade !== 'partner') {
      wx.showToast({
        title: '仅合伙人星探可招募王牌星探',
        icon: 'none'
      });
      return;
    }
    this.setData({ acePlanVisible: true });
  },

  closeAcePlanModal() {
    this.setData({ acePlanVisible: false });
  },

  stopModalPropagation() {},

  onAceSigningAmountInput(e) {
    const value = e.detail.value;
    const aceRewards = {
      ...this.data.aceRewards,
      signingAceAmount: value
    };
    this.setData({
      aceRewards,
      aceManagementAllowance: this.calculateAceManagementAllowance(aceRewards),
      aceInviteGenerated: false,
      aceShareImagePath: '',
      aceInviteCode: ''
    });
  },

  onAceLevelAmountInput(e) {
    const { grade } = e.currentTarget.dataset;
    const value = e.detail.value;
    const aceRewards = {
      ...this.data.aceRewards,
      levelAceAmounts: {
        ...this.data.aceRewards.levelAceAmounts,
        [grade]: value
      }
    };
    this.setData({
      aceRewards,
      aceManagementAllowance: this.calculateAceManagementAllowance(aceRewards),
      aceInviteGenerated: false,
      aceShareImagePath: '',
      aceInviteCode: ''
    });
  },

async onGenerateAceInvite() {
    if (this.data.scout?.grade !== 'partner') {
      wx.showToast({
        title: '仅合伙人星探可生成专属邀请',
        icon: 'none'
      });
      return;
    }
    try {
      const aceRewards = {
        ...this.data.aceRewards,
        signingAceAmount: String(this.sanitizeAmount(
          this.data.aceRewards.signingAceAmount,
          this.data.aceRewards.signingTotal
        )),
        levelAceAmounts: {
          S: String(this.sanitizeAmount(this.data.aceRewards.levelAceAmounts.S, this.data.aceRewards.levelTotals.S)),
          A: String(this.sanitizeAmount(this.data.aceRewards.levelAceAmounts.A, this.data.aceRewards.levelTotals.A)),
          B: String(this.sanitizeAmount(this.data.aceRewards.levelAceAmounts.B, this.data.aceRewards.levelTotals.B))
        }
      };
      const aceManagementAllowance = this.calculateAceManagementAllowance(aceRewards);
      const inviteCreateRes = await wx.cloud.callFunction({
        name: 'scout',
        data: {
          action: 'generateAceInvite',
          data: {
            signingAward: Number(aceRewards.signingAceAmount),
            levelAwards: {
              S: Number(aceRewards.levelAceAmounts.S),
              A: Number(aceRewards.levelAceAmounts.A),
              B: Number(aceRewards.levelAceAmounts.B)
            }
          }
        }
      });
      if (!inviteCreateRes.result?.success || !inviteCreateRes.result?.inviteCode) {
        wx.showToast({
          title: inviteCreateRes.result?.error || '生成邀请码失败',
          icon: 'none'
        });
        return;
      }
      this.setData({
        aceInviteCode: inviteCreateRes.result.inviteCode
      });
      const aceInvite = {
        ...this.buildAceInvitePayload(aceRewards),
        inviteCode: inviteCreateRes.result.inviteCode
      };
      wx.showLoading({ title: '生成中...' });
      const aceShareImagePath = await this.generateAceShareImage(aceRewards);
      wx.hideLoading();
      this.setData({
        aceRewards,
        aceManagementAllowance,
        aceInviteGenerated: true,
        aceInviteLink: aceInvite.path,
        aceInviteSummary: aceInvite.summary,
        aceInviteCode: inviteCreateRes.result.inviteCode,
        aceInviteClipboardText: `${aceInvite.title}\n邀请码：${inviteCreateRes.result.inviteCode}\n${aceInvite.summary}\n小程序路径：${aceInvite.path}`,
        aceShareImagePath,
        aceGenerateButtonText: '重新生成专属邀请'
      });

      wx.showToast({
        title: aceShareImagePath ? '已生成专属海报' : '已生成邀请信息',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      console.error('[星探工作台] 生成王牌邀请码失败:', error);
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
    }
  },

  onCopyAceInviteLink() {
    if (!this.data.aceInviteGenerated || !this.data.aceInviteClipboardText) {
      wx.showToast({
        title: '请先生成邀请信息',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: this.data.aceInviteClipboardText
    });
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
      filteredReferrals: filtered,
      showReferralEmpty: filtered.length === 0,
      filterTabs: this.buildFilterTabs(filter, referrals.length)
    });
  },

  onViewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/recruit/detail/detail?id=${id}&from=scout`
    });
  },

  onViewSubScoutDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: id ? `/pages/scout/team/team?scoutId=${id}` : '/pages/scout/team/team'
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
