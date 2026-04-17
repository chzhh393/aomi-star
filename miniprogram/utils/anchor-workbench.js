function syncAnchorIdentity(candidate = {}) {
  const user = wx.getStorageSync('user_info') || {};
  if (!user) {
    return;
  }

  wx.setStorageSync('user_info', {
    ...user,
    userType: 'anchor',
    role: 'anchor',
    candidateInfo: {
      ...(user.candidateInfo || {}),
      candidateId: candidate._id || user.candidateInfo?.candidateId || '',
      candidateNo: candidate.candidateNo || user.candidateInfo?.candidateNo || '',
      status: candidate.status || ''
    }
  });
  wx.setStorageSync('currentRole', 'anchor');
}

function clampProgress(value) {
  const num = Number(value) || 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizePhotoList(candidate = {}) {
  const photos = candidate.interviewMaterials?.photos || {};
  return Array.isArray(photos.afterMakeup) ? photos.afterMakeup : [];
}

function buildSkillTree(candidate = {}) {
  const talents = Array.isArray(candidate.talent?.mainTalents) ? candidate.talent.mainTalents : [];
  const danceScore = Number(candidate.evaluations?.danceTeacher?.totalScore || 0);
  const baseScore = clampProgress(danceScore * 10);
  const activeBoost = candidate.status === 'active' ? 10 : candidate.status === 'training' ? 4 : 0;

  const skillDefs = [
    { key: 'kpop', name: '韩舞', bonus: talents.includes('韩舞') || talents.includes('舞蹈') ? 18 : 0 },
    { key: 'jazz', name: '爵士', bonus: talents.includes('爵士舞') || talents.includes('舞蹈') ? 14 : 0 },
    { key: 'modern', name: '现代舞', bonus: talents.includes('现代舞') || talents.includes('舞蹈') ? 16 : 0 },
    { key: 'stage', name: '舞台表达', bonus: 12 }
  ];

  return skillDefs.map((item, index) => {
    const progress = clampProgress(baseScore + activeBoost - index * 6 + item.bonus);
    return {
      ...item,
      progress,
      mastered: progress >= 80,
      progressText: `${progress}%`,
      badgeText: progress >= 80 ? '已掌握' : progress >= 60 ? '冲刺中' : '训练中'
    };
  });
}

function buildDemoVideos(candidate = {}) {
  const danceTeacher = candidate.evaluations?.danceTeacher || {};
  const videos = Array.isArray(candidate.interviewMaterials?.videos) ? candidate.interviewMaterials.videos : [];
  const trainingCamp = candidate.trainingCamp || {};

  return videos.slice(0, 3).map((item, index) => ({
    id: `demo_${index}`,
    title: item.description || `标准 Demo ${index + 1}`,
    scene: item.type === 'dance' ? '老师动作拆解' : item.type === 'talent' ? '才艺补充示范' : '镜头表达参考',
    tip: danceTeacher.comments || trainingCamp.campType || '建议先看一遍原速，再切到 0.5x 跟练。',
    duration: item.duration || '--:--',
    url: item.path || '',
    canPlay: Boolean(item.path),
    rateHint: '支持 0.5x 慢速学习'
  }));
}

function buildDailyTasks(candidate = {}) {
  const booking = candidate.trainingCamp?.danceCourseBooking || {};
  const dailyRecords = Array.isArray(candidate.trainingCamp?.dailyRecords) ? candidate.trainingCamp.dailyRecords : [];
  const latestRecord = dailyRecords[dailyRecords.length - 1] || {};
  const danceTeacher = candidate.evaluations?.danceTeacher || {};
  const refinedPhotos = normalizePhotoList(candidate);

  return [
    {
      key: 'schedule',
      title: '今日训练安排',
      value: booking.slotLabel || booking.slotDate || '待老师排课',
      detail: booking.teacherName
        ? `舞蹈老师：${booking.teacherName}`
        : '暂未锁定具体课程，按经纪人通知到场训练。'
    },
    {
      key: 'comment',
      title: '老师评语',
      value: danceTeacher.evaluatorName || '舞蹈老师反馈',
      detail: danceTeacher.comments || latestRecord.reviewComment || '今天还没有新的老师评语，完成训练后会同步到这里。'
    },
    {
      key: 'retouch',
      title: '个人精修图',
      value: `${refinedPhotos.length} 张已上传`,
      detail: candidate.interviewMaterials?.uploadedByName
        ? `摄影师 ${candidate.interviewMaterials.uploadedByName} 已上传最新物料`
        : '摄影师上传后，会在这里展示你的最新精修图。'
    }
  ];
}

function buildAgentSummary(candidate = {}) {
  return {
    name: candidate.assignedAgent?.agentName || '-',
    phone: candidate.assignedAgent?.agentPhone || '-'
  };
}

function buildPayslipSummary(candidate = {}) {
  const payslip = candidate?.commission?.payslip || {};
  const totalAmountText = payslip.totalAmountText
    || (candidate?.commission?.totalAmount ? `¥${Number(candidate.commission.totalAmount).toLocaleString('zh-CN')}` : '¥0');

  return {
    exists: payslip.status === 'sent',
    status: payslip.status || 'pending',
    receiptStatus: payslip.receiptStatus === 'viewed' ? 'viewed' : 'pending',
    title: payslip.periodLabel || '最新电子工资条',
    totalAmountText,
    sentAtText: payslip.sentAtText || payslip.sentAt || '-'
  };
}

function buildAnchorCards(workspace = {}) {
  return [
    {
      key: 'payslip',
      title: '电子工资条',
      summary: workspace.payslipSummary?.exists
        ? `${workspace.payslipSummary.totalAmountText} · ${workspace.payslipSummary.receiptStatus === 'viewed' ? '已查看' : '待查看'}`
        : '暂无已发工资条',
      detail: workspace.payslipSummary?.exists
        ? `查看 ${workspace.payslipSummary.title} 的结算金额、分配明细和发放回执。`
        : '财务确认支付后，这里会收到你的最新电子工资条。',
      path: '/pages/anchor/payslip/payslip'
    },
    {
      key: 'skills',
      title: '我的技能树',
      summary: `${workspace.masteredCount || 0} / 4 已点亮`,
      detail: '查看 4 类舞蹈通关百分比，继续点亮“已掌握”勋章。',
      path: '/pages/anchor/welcome/welcome?tab=skills'
    },
    {
      key: 'learning',
      title: '资料学习中心',
      summary: `${workspace.demoVideos?.length || 0} 个老师 Demo`,
      detail: '在线观看标准示范视频，支持 0.5x 慢速跟练。',
      path: '/pages/anchor/welcome/welcome?tab=learning'
    },
    {
      key: 'tasks',
      title: '任务与评价',
      summary: `${workspace.refinedPhotos?.length || 0} 张个人精修图`,
      detail: '查看每日训练安排、老师评语和摄影师上传的个人物料。',
      path: '/pages/anchor/welcome/welcome?tab=tasks'
    }
  ];
}

function formatAnchorWorkbench(candidate = {}) {
  const skillTree = buildSkillTree(candidate);
  const demoVideos = buildDemoVideos(candidate);
  const refinedPhotos = normalizePhotoList(candidate);
  const masteredCount = skillTree.filter((item) => item.mastered).length;

  const workspace = {
    candidate,
    heroTitle: candidate.liveName || candidate.basicInfo?.name || '主播工作台',
    heroDesc: candidate.status === 'active'
      ? '正式主播阶段继续刷技能树、复盘老师评语，并沉淀个人物料库。'
      : '用任务闯关的方式推进训练，把技能掌握度、老师标准 Demo 和每日反馈放在一个成长中心里。',
    skillTree,
    masteredCount,
    demoVideos,
    playbackRateOptions: [
      { label: '1.0x', value: 1 },
      { label: '0.75x', value: 0.75 },
      { label: '0.5x', value: 0.5 }
    ],
    dailyTasks: buildDailyTasks(candidate),
    refinedPhotos,
    agentSummary: buildAgentSummary(candidate),
    payslipSummary: buildPayslipSummary(candidate)
  };

  return {
    ...workspace,
    anchorCards: buildAnchorCards(workspace)
  };
}

async function loadAnchorWorkbench() {
  const res = await wx.cloud.callFunction({
    name: 'candidate',
    data: { action: 'getByOpenId' }
  });

  const candidate = res.result?.candidate || null;
  if (!res.result?.success || !candidate) {
    throw new Error(res.result?.error || '未找到主播信息');
  }

  if (!['signed', 'training', 'active'].includes(candidate.status)) {
    const error = new Error('暂未开通主播中台');
    error.code = 'ANCHOR_STAGE_BLOCKED';
    error.candidate = candidate;
    throw error;
  }

  syncAnchorIdentity(candidate);
  return formatAnchorWorkbench(candidate);
}

export {
  loadAnchorWorkbench,
  syncAnchorIdentity
};
