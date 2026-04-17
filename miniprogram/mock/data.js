/**
 * Mock 数据
 * 用于MVP阶段的页面展示
 */

// 主播数据
export const mockAnchors = [
  {
    id: '001',
    name: '小美',
    artName: '甜心美美',
    level: 'S',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzAwRjBGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7lsI/nvo88L3RleHQ+PC9zdmc+',
    agentId: 'agent001',
    agentName: '张经纪',
    joinDate: '2024-01-15',
    status: 'active',
    monthRevenue: 85000,
    lastMonthRevenue: 76000,
    fansCount: 120000,
    newFans: 5200,
    liveHours: 120,
    lastMonthHours: 105,
    talents: ['唱歌', '舞蹈', '古风'],
    mbti: 'ENFP',
    platform: '抖音',
  },
  {
    id: '002',
    name: '小雪',
    artName: '雪儿',
    level: 'S',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0IwMjZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7pm6rlhL88L3RleHQ+PC9zdmc+',
    agentId: 'agent001',
    agentName: '张经纪',
    joinDate: '2024-02-20',
    status: 'active',
    monthRevenue: 78000,
    lastMonthRevenue: 72000,
    fansCount: 95000,
    newFans: 3800,
    liveHours: 115,
    lastMonthHours: 110,
    talents: ['舞蹈', '搞笑', '唱歌'],
    mbti: 'ESFJ',
    platform: '快手',
  },
  {
    id: '003',
    name: '琳琳',
    artName: '琳琳子',
    level: 'A',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzAwRkY4OCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7ni7PlsLw8L3RleHQ+PC9zdmc+',
    agentId: 'agent002',
    agentName: '李经纪',
    joinDate: '2024-03-10',
    status: 'active',
    monthRevenue: 56000,
    lastMonthRevenue: 48000,
    fansCount: 68000,
    newFans: 4200,
    liveHours: 100,
    lastMonthHours: 95,
    talents: ['脱口秀', '情感'],
    mbti: 'INFP',
    platform: '抖音',
  },
  {
    id: '004',
    name: '婷婷',
    artName: '小甜心',
    level: 'A',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0ZGRDcwMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7lqbflqbc8L3RleHQ+PC9zdmc+',
    agentId: 'agent002',
    agentName: '李经纪',
    joinDate: '2024-04-05',
    status: 'active',
    monthRevenue: 52000,
    lastMonthRevenue: 50000,
    fansCount: 61000,
    newFans: 2800,
    liveHours: 95,
    lastMonthHours: 92,
    talents: ['唱歌', '游戏'],
    mbti: 'ENFJ',
    platform: '抖音',
  },
  {
    id: '005',
    name: '萌萌',
    artName: '萌萌酱',
    level: 'B',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzAwRjBGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7oQIzojIk8L3RleHQ+PC9zdmc+',
    agentId: 'agent003',
    agentName: '王经纪',
    joinDate: '2024-05-12',
    status: 'active',
    monthRevenue: 32000,
    lastMonthRevenue: 28000,
    fansCount: 38000,
    newFans: 1500,
    liveHours: 80,
    lastMonthHours: 75,
    talents: ['美妆', '穿搭'],
    mbti: 'ISFP',
    platform: '快手',
  },
  {
    id: '006',
    name: '佳佳',
    artName: '佳佳宝贝',
    level: 'B',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI0IwMjZGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7kvbPlhbc8L3RleHQ+PC9zdmc+',
    agentId: 'agent003',
    agentName: '王经纪',
    joinDate: '2024-06-01',
    status: 'active',
    monthRevenue: 28000,
    lastMonthRevenue: 30000,
    fansCount: 35000,
    newFans: 800,
    liveHours: 75,
    lastMonthHours: 80,
    talents: ['舞蹈', '翻唱'],
    mbti: 'ESFP',
    platform: '抖音',
  },
  {
    id: '007',
    name: '娜娜',
    artName: '小娜',
    level: 'C',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iIzg4ODg4OCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZm9udC1mYW1pbHk9IkFyaWFsIj7lqJzlqJw8L3RleHQ+PC9zdmc+',
    agentId: 'agent004',
    agentName: '赵经纪',
    joinDate: '2024-08-15',
    status: 'training',
    monthRevenue: 12000,
    lastMonthRevenue: 10000,
    fansCount: 15000,
    newFans: 600,
    liveHours: 60,
    lastMonthHours: 55,
    talents: ['新人', '学习中'],
    mbti: 'ISFJ',
    platform: '抖音',
  },
];

// 排班数据
export const mockSchedules = [
  {
    id: 'sch001',
    anchorId: '001',
    anchorName: '小美',
    date: '2025-11-19',
    startTime: '19:00',
    endTime: '23:00',
    slot: 'prime',
    slotName: '黄金档',
    status: 'confirmed',
    platform: '抖音',
  },
  {
    id: 'sch002',
    anchorId: '002',
    anchorName: '小雪',
    date: '2025-11-19',
    startTime: '20:00',
    endTime: '22:00',
    slot: 'silver',
    slotName: '白银档',
    status: 'confirmed',
    platform: '快手',
  },
  {
    id: 'sch003',
    anchorId: '003',
    anchorName: '琳琳',
    date: '2025-11-19',
    startTime: '14:00',
    endTime: '17:00',
    slot: 'silver',
    slotName: '白银档',
    status: 'pending',
    platform: '抖音',
  },
  {
    id: 'sch004',
    anchorId: '001',
    anchorName: '小美',
    date: '2025-11-20',
    startTime: '19:00',
    endTime: '23:00',
    slot: 'prime',
    slotName: '黄金档',
    status: 'confirmed',
    platform: '抖音',
  },
  {
    id: 'sch005',
    anchorId: '004',
    anchorName: '婷婷',
    date: '2025-11-20',
    startTime: '20:00',
    endTime: '23:00',
    slot: 'prime',
    slotName: '黄金档',
    status: 'confirmed',
    platform: '抖音',
  },
];

// 练习记录数据
export const mockPractices = [
  {
    id: 'prac001',
    anchorId: '001',
    anchorName: '小美',
    type: 'dance',
    typeName: '舞蹈',
    date: '2025-11-18',
    time: '20:30',
    videoUrl: '',
    description: '练习了《星辰大海》编舞',
    tutorId: 'tutor001',
    tutorName: '刘老师',
    rating: 5,
    comment: '进步很大！动作标准度提升明显，继续保持！',
    status: 'reviewed',
  },
  {
    id: 'prac002',
    anchorId: '001',
    anchorName: '小美',
    type: 'vocal',
    typeName: '声乐',
    date: '2025-11-17',
    time: '19:15',
    videoUrl: '',
    description: '练习了高音技巧',
    tutorId: 'tutor002',
    tutorName: '王老师',
    rating: 4,
    comment: '音准不错，气息控制还需加强',
    status: 'reviewed',
  },
  {
    id: 'prac003',
    anchorId: '001',
    anchorName: '小美',
    type: 'dance',
    typeName: '舞蹈',
    date: '2025-11-16',
    time: '21:00',
    videoUrl: '',
    description: '复习基础功',
    tutorId: 'tutor001',
    tutorName: '刘老师',
    rating: 5,
    comment: '基础扎实，表现力很好！',
    status: 'reviewed',
  },
];

// 经纪人工作台 mock 数据
export const mockAgentWorkbench = {
  mentalitySummary: {
    greenCount: 4,
    yellowCount: 2,
    redCount: 1
  },
  talkTasks: [
    {
      id: 'talk001',
      anchorId: '001',
      anchorName: '小美',
      artName: '甜心美美',
      level: 'S',
      signal: 'red',
      signalLabel: '红灯',
      source: '舞蹈老师预警',
      moodScore: 38,
      reason: '连续两次训练迟到，直播后复盘表达强烈自我怀疑。',
      actionAdvice: '优先安排一对一谈心，暂停高压 PK 场次，先给正反馈。',
      deadline: '今天 18:30'
    },
    {
      id: 'talk002',
      anchorId: '003',
      anchorName: '琳琳',
      artName: '琳琳子',
      level: 'A',
      signal: 'yellow',
      signalLabel: '黄灯',
      source: '红绿灯手动标记',
      moodScore: 64,
      reason: '排班变动后有抵触情绪，担心人设切换过快。',
      actionAdvice: '同步本周排班逻辑，确认直播脚本只保留一个主卖点。',
      deadline: '今天 21:00'
    },
    {
      id: 'talk003',
      anchorId: '007',
      anchorName: '娜娜',
      artName: '小娜',
      level: 'C',
      signal: 'yellow',
      signalLabel: '黄灯',
      source: '宿舍巡查反馈',
      moodScore: 58,
      reason: '新人训练期状态波动，睡眠不足影响第二天直播表现。',
      actionAdvice: '协调训练节奏，先把晚场缩短 30 分钟。',
      deadline: '明天 12:00'
    }
  ],
  battleBoard: [
    {
      id: 'battle001',
      anchorId: '001',
      anchorName: '小美',
      artName: '甜心美美',
      level: 'S',
      archetype: '甜系陪伴',
      nextLiveTime: '今晚 19:30-23:30',
      liveGoal: '冲刺 2.8 万流水',
      scriptHint: '主打“下班陪伴局”，前 30 分钟用新舞蹈热场，后半程切大哥专属点歌。',
      skills: [
        { name: '开场留人', progress: 92 },
        { name: '情绪互动', progress: 88 },
        { name: '礼物转化', progress: 76 }
      ]
    },
    {
      id: 'battle002',
      anchorId: '002',
      anchorName: '小雪',
      artName: '雪儿',
      level: 'S',
      archetype: '高能热舞',
      nextLiveTime: '今晚 20:00-22:00',
      liveGoal: '稳定黄金档在线 3.5k+',
      scriptHint: '用“舞蹈 PK + 惩罚挑战”带节奏，中段安排新摄影物料做私域预热。',
      skills: [
        { name: '热场控节奏', progress: 89 },
        { name: '话题延展', progress: 71 },
        { name: '大哥维护', progress: 83 }
      ]
    },
    {
      id: 'battle003',
      anchorId: '003',
      anchorName: '琳琳',
      artName: '琳琳子',
      level: 'A',
      archetype: '情绪治愈',
      nextLiveTime: '明晚 18:30-21:30',
      liveGoal: '测试“深夜树洞”新话术',
      scriptHint: '先讲真实经历建立信任，再引导粉丝投票决定主题，不要频繁切段子。',
      skills: [
        { name: '故事表达', progress: 84 },
        { name: '停留转化', progress: 67 },
        { name: '私域引导', progress: 58 }
      ]
    }
  ],
  fanAssets: [
    {
      id: 'fan001',
      anchorId: '001',
      anchorName: '小美',
      fanName: '南城陈总',
      tier: '核心大哥',
      preference: '偏爱古风造型和慢歌陪伴，周五发车概率最高。',
      materialTag: '汉服棚拍九宫格',
      followUp: '直播前 2 小时发摄影师新图，提醒今晚有古风专场。'
    },
    {
      id: 'fan002',
      anchorId: '002',
      anchorName: '小雪',
      fanName: '阿May',
      tier: '核心大姐',
      preference: '喜欢反差感舞蹈花絮，会收藏训练室短视频。',
      materialTag: '训练室抓拍短片',
      followUp: '下周二推送幕后花絮，并邀请参与新舞蹈投票。'
    },
    {
      id: 'fan003',
      anchorId: '003',
      anchorName: '琳琳',
      fanName: '夜猫哥',
      tier: '潜力大哥',
      preference: '偏好深夜聊天、情绪价值和专属昵称互动。',
      materialTag: '治愈系夜景写真',
      followUp: '今晚直播后单独回访，确认是否愿意进铁粉群。'
    }
  ]
};

// 周报数据
export const mockWeeklyReports = [
  {
    id: 'report001',
    anchorId: '001',
    anchorName: '小美',
    week: '2025-W46',
    weekStart: '2025-11-11',
    weekEnd: '2025-11-17',
    revenue: 21000,
    liveHours: 28,
    newFans: 3500,
    avgViewers: 1200,
    peakViewers: 5600,
    highlights: ['收益破2万', '粉丝增长稳定', '新舞蹈视频爆了'],
    problems: ['周三状态不佳', '互动率略有下降'],
    nextWeekPlan: ['加强互动话术', '准备新才艺', '优化直播时间'],
    agentComment: '整体表现优秀，继续保持。建议周三调整状态。',
    status: 'completed',
  },
];

// 消息通知数据
export const mockNotifications = [
  {
    id: 'notif001',
    type: 'schedule',
    title: '今日排班提醒',
    content: '您今天19:00-23:00有直播排班，请提前准备',
    time: '2025-11-19 10:00',
    isRead: false,
  },
  {
    id: 'notif002',
    type: 'practice',
    title: '练习评价',
    content: '导师已评价您的舞蹈练习，快去查看吧！',
    time: '2025-11-18 21:00',
    isRead: false,
  },
  {
    id: 'notif003',
    type: 'system',
    title: '周报填写提醒',
    content: '请完成本周周报填写',
    time: '2025-11-18 09:00',
    isRead: true,
  },
];

// 获取主播列表（按等级筛选）
export function getAnchorsByLevel(level) {
  if (!level) return mockAnchors;
  return mockAnchors.filter(a => a.level === level);
}

// 获取单个主播详情
export function getAnchorById(id) {
  return mockAnchors.find(a => a.id === id);
}

// 获取指定日期的排班
export function getSchedulesByDate(date) {
  return mockSchedules.filter(s => s.date === date);
}

// 获取主播的练习记录
export function getPracticesByAnchorId(anchorId) {
  return mockPractices.filter(p => p.anchorId === anchorId);
}
