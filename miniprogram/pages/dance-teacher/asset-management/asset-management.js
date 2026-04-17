import { requireAgentLogin } from '../../../utils/agent-auth.js';

const VERSION_LABELS = [
  '横屏镜面教学版',
  '竖屏镜头演绎版',
  '运镜集体走位版'
];

const DANCE_LIBRARY_CATEGORIES = [
  {
    key: 'lead',
    name: '引流舞',
    count: 36,
    difficulty: '高难度',
    duration: '长时长',
    positioning: '带灯光走位建议',
    desc: '用于拉新破圈，默认补充镜头、灯光和舞台走位建议。'
  },
  {
    key: 'group',
    name: '团舞',
    count: 48,
    difficulty: '中难度',
    duration: '30s',
    positioning: '支持任意C位勾选',
    desc: '用于多人协作训练，保持固定时长和多人站位适配。'
  },
  {
    key: 'exclusive',
    name: '粉丝专属舞',
    count: 24,
    difficulty: '中低难度',
    duration: '强互动',
    positioning: '提升粉丝陪伴感',
    desc: '强调互动手势、表情和直播间互动记忆点。'
  },
  {
    key: 'pk',
    name: 'PK舞',
    count: 60,
    difficulty: '简单',
    duration: '快速通关',
    positioning: '支持大批量训练',
    desc: '适合大批量训练和批量通关，优先保证动作统一。'
  }
];

Page({
  data: {
    categories: [],
    totalDanceCount: 0,
    totalVersionCount: 0
  },

  onLoad() {
    if (!requireAgentLogin({
      allowedRoles: ['dance_teacher'],
      redirectUrl: '/pages/dance-teacher/asset-management/asset-management'
    })) {
      return;
    }

    const categories = DANCE_LIBRARY_CATEGORIES.map((item) => ({
      ...item,
      versionLabels: VERSION_LABELS
    }));
    const totalDanceCount = categories.reduce((sum, item) => sum + item.count, 0);

    this.setData({
      categories,
      totalDanceCount,
      totalVersionCount: totalDanceCount * VERSION_LABELS.length
    });
  },

  showVersionGuide() {
    wx.showModal({
      title: '版本管理说明',
      content: '当前舞蹈资产默认按横屏镜面教学版、竖屏镜头演绎版、运镜集体走位版三类版本进行维护。',
      showCancel: false
    });
  }
});
