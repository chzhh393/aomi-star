// 云函数入口文件 - 候选人/报名管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function validateCandidateFormData(data) {
  if (!data || !data.formData) {
    return '提交数据不完整';
  }

  const basicInfo = data.formData.basicInfo || {};
  const experience = data.formData.experience || {};
  const hasExperience = toBoolean(experience.hasExperience);

  if (isEmpty(basicInfo.douyin)) {
    return '请输入抖音账号';
  }

  if (isEmpty(basicInfo.douyinFans)) {
    return '请输入抖音粉丝数';
  }

  if (hasExperience) {
    if (isEmpty(experience.guild)) {
      return '请填写之前所在工会';
    }

    if (isEmpty(experience.accountName)) {
      return '请填写直播账号名';
    }

    if (isEmpty(experience.incomeScreenshot)) {
      return '请上传流水截图';
    }
  }

  return '';
}

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  console.log('[candidate] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'submit':
        return await submitCandidate(openId, data);
      case 'get':
        return await getCandidate(data.id);
      case 'getByOpenId':
        return await getCandidateByOpenId(openId);
      case 'update':
        return await updateCandidate(openId, data);
      case 'updateStatus':
        return await updateCandidateStatus(data.id, data.status);
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (error) {
    console.error('[candidate] 错误:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

// 提交报名
async function submitCandidate(openId, data) {
  // 检查是否已经报名过
  const existRes = await db.collection('candidates').where({
    openId: openId
  }).get();

  if (existRes.data.length > 0) {
    return {
      success: false,
      error: '您已经报名过了',
      candidate: existRes.data[0]
    };
  }

  const validationError = validateCandidateFormData(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const hasExperience = toBoolean(data.formData.experience.hasExperience);

  // 上传照片到云存储
  const uploadedImages = await uploadImages(openId, data.formData.basicInfo);

  // 上传视频到云存储
  const uploadedVideos = await uploadVideos(openId, data.formData.talent.videos);

  // 创建候选人记录
  const candidateData = {
    openId: openId,

    // 基本信息
    basicInfo: {
      name: data.formData.basicInfo.name || '',
      artName: data.formData.basicInfo.artName || '',
      age: parseInt(data.formData.basicInfo.age) || 0,
      gender: data.formData.basicInfo.gender || '',
      height: parseInt(data.formData.basicInfo.height) || 0,
      weight: parseInt(data.formData.basicInfo.weight) || 0,
      phone: data.formData.basicInfo.phone || '',
      wechat: data.formData.basicInfo.wechat || '',
      mbti: data.formData.basicInfo.mbti || '',
      hobbies: data.formData.basicInfo.hobbies || [],
      otherHobby: data.formData.basicInfo.otherHobby || '',
      douyin: data.formData.basicInfo.douyin || '',
      douyinFans: data.formData.basicInfo.douyinFans || '',
      xiaohongshu: data.formData.basicInfo.xiaohongshu || '',
      xiaohongshuFans: data.formData.basicInfo.xiaohongshuFans || ''
    },

    // 照片
    images: uploadedImages,

    // 才艺信息
    talent: {
      talents: data.formData.talent.talents || [],
      otherTalent: data.formData.talent.otherTalent || '',
      videos: uploadedVideos,
      level: data.formData.talent.level || 5
    },

    // 直播经验
    experience: {
      hasExperience: hasExperience,
      guild: hasExperience ? (data.formData.experience.guild || '') : '',
      accountName: hasExperience ? (data.formData.experience.accountName || '') : '',
      incomeScreenshot: hasExperience ? (data.formData.experience.incomeScreenshot || '') : ''
    },

    // 来源
    source: data.source || '官网报名',
    referredBy: data.scoutShareCode || null,

    // 状态
    status: 'pending',

    // 时间
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  // 如果有推荐码，查找星探并关联
  if (data.scoutShareCode) {
    const scoutRes = await db.collection('scouts').where({
      shareCode: data.scoutShareCode,
      status: 'active'
    }).get();

    if (scoutRes.data.length > 0) {
      const scout = scoutRes.data[0];

      // 构建推荐链条
      const scoutChain = [scout._id];
      const scoutChainNames = [scout.profile.name];

      // 如果是二级星探，添加一级星探信息
      if (scout.level && scout.level.parentScoutId) {
        scoutChain.unshift(scout.level.parentScoutId);
        scoutChainNames.unshift(scout.level.parentScoutName);
      }

      candidateData.referral = {
        scoutId: scout._id,
        scoutShareCode: data.scoutShareCode,
        scoutName: scout.profile.name,
        scoutLevel: scout.level?.depth || 1,
        scoutChain: scoutChain,  // [一级ID, 二级ID] 或 [一级ID]
        scoutChainNames: scoutChainNames,  // [一级名称, 二级名称] 或 [一级名称]
        referredAt: db.serverDate()
      };

      console.log('[candidate] 关联星探成功:', scout.profile.name, '层级:', scout.level?.depth || 1);
    } else {
      console.log('[candidate] 推荐码无效或星探已停用:', data.scoutShareCode);
    }
  }

  const createRes = await db.collection('candidates').add({
    data: candidateData
  });

  // 更新用户信息，关联候选人ID
  await db.collection('users').where({
    openId: openId
  }).update({
    data: {
      'candidateInfo.candidateId': createRes._id,
      'candidateInfo.appliedAt': db.serverDate(),
      'candidateInfo.status': 'pending',
      'profile.name': candidateData.basicInfo.name,
      'profile.phone': candidateData.basicInfo.phone,
      candidateApplyDraft: _.remove(),
      updatedAt: db.serverDate()
    }
  });

  // 如果有星探推荐，更新星探统计数据
  if (candidateData.referral && candidateData.referral.scoutId) {
    try {
      await db.collection('scouts').doc(candidateData.referral.scoutId).update({
        data: {
          'stats.totalReferred': _.inc(1),
          'stats.pendingCount': _.inc(1),
          updatedAt: db.serverDate()
        }
      });
      console.log('[candidate] 星探统计数据更新成功');
    } catch (error) {
      console.error('[candidate] 星探统计数据更新失败:', error);
      // 不影响主流程，继续执行
    }
  }

  return {
    success: true,
    candidateId: createRes._id,
    message: '报名成功'
  };
}

// 上传图片到云存储
async function uploadImages(openId, basicInfo) {
  const images = {
    facePhoto: '',
    lifePhoto1: '',
    lifePhoto2: '',
    lifePhoto3: ''
  };

  const photoFields = ['facePhoto', 'lifePhoto1', 'lifePhoto2', 'lifePhoto3'];

  for (const field of photoFields) {
    const localPath = basicInfo[field];
    if (localPath && localPath.startsWith('wxfile://') || localPath && localPath.startsWith('http://tmp')) {
      try {
        const cloudPath = `candidates/${openId}/${field}_${Date.now()}.jpg`;
        const uploadRes = await cloud.uploadFile({
          cloudPath: cloudPath,
          fileContent: localPath // 注意：这在云函数中不能直接使用本地路径
        });
        images[field] = uploadRes.fileID;
      } catch (err) {
        console.error(`上传 ${field} 失败:`, err);
        // 如果是云端路径，直接使用
        if (localPath.startsWith('cloud://')) {
          images[field] = localPath;
        }
      }
    } else if (localPath && localPath.startsWith('cloud://')) {
      images[field] = localPath;
    }
  }

  return images;
}

// 上传视频到云存储
async function uploadVideos(openId, videos) {
  if (!videos || videos.length === 0) {
    return [];
  }

  const uploadedVideos = [];

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    if (video.cloudUrl) {
      uploadedVideos.push({
        url: video.cloudUrl,
        thumb: video.cloudThumb || ''
      });
    } else if (video.url && video.url.startsWith('cloud://')) {
      uploadedVideos.push({
        url: video.url,
        thumb: video.thumb || ''
      });
    }
  }

  return uploadedVideos;
}

// 修改报名信息（仅 pending 状态可修改）
async function updateCandidate(openId, data) {
  // 查找当前用户的报名记录
  const existRes = await db.collection('candidates').where({
    openId: openId
  }).get();

  if (existRes.data.length === 0) {
    return { success: false, error: '未找到报名记录' };
  }

  const candidate = existRes.data[0];

  if (candidate.status !== 'pending') {
    return { success: false, error: '当前状态不允许修改' };
  }

  const validationError = validateCandidateFormData(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const hasExperience = toBoolean(data.formData.experience.hasExperience);

  // 处理图片
  const uploadedImages = await uploadImages(openId, data.formData.basicInfo);
  // 处理视频
  const uploadedVideos = await uploadVideos(openId, data.formData.talent.videos);

  const updateData = {
    basicInfo: {
      name: data.formData.basicInfo.name || '',
      artName: data.formData.basicInfo.artName || '',
      age: parseInt(data.formData.basicInfo.age) || 0,
      gender: data.formData.basicInfo.gender || '',
      height: parseInt(data.formData.basicInfo.height) || 0,
      weight: parseInt(data.formData.basicInfo.weight) || 0,
      phone: data.formData.basicInfo.phone || '',
      wechat: data.formData.basicInfo.wechat || '',
      mbti: data.formData.basicInfo.mbti || '',
      hobbies: data.formData.basicInfo.hobbies || [],
      otherHobby: data.formData.basicInfo.otherHobby || '',
      douyin: data.formData.basicInfo.douyin || '',
      douyinFans: data.formData.basicInfo.douyinFans || '',
      xiaohongshu: data.formData.basicInfo.xiaohongshu || '',
      xiaohongshuFans: data.formData.basicInfo.xiaohongshuFans || ''
    },
    images: uploadedImages,
    talent: {
      talents: data.formData.talent.talents || [],
      otherTalent: data.formData.talent.otherTalent || '',
      videos: uploadedVideos,
      level: data.formData.talent.level || 5
    },
    experience: {
      hasExperience: hasExperience,
      guild: hasExperience ? (data.formData.experience.guild || '') : '',
      accountName: hasExperience ? (data.formData.experience.accountName || '') : '',
      incomeScreenshot: hasExperience ? (data.formData.experience.incomeScreenshot || '') : ''
    },
    updatedAt: db.serverDate()
  };

  await db.collection('candidates').doc(candidate._id).update({
    data: updateData
  });

  await db.collection('users').where({
    openId: openId
  }).update({
    data: {
      candidateApplyDraft: _.remove(),
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    candidateId: candidate._id,
    message: '修改成功'
  };
}

// 根据ID获取候选人信息
async function getCandidate(id) {
  const res = await db.collection('candidates').doc(id).get();

  if (!res.data) {
    return {
      success: false,
      error: '候选人不存在'
    };
  }

  return {
    success: true,
    candidate: res.data
  };
}

// 根据 openId 获取候选人信息
async function getCandidateByOpenId(openId) {
  const res = await db.collection('candidates').where({
    openId: openId
  }).get();

  if (res.data.length === 0) {
    return {
      success: false,
      error: '未找到报名记录'
    };
  }

  return {
    success: true,
    candidate: res.data[0]
  };
}

// 更新候选人状态
async function updateCandidateStatus(id, status) {
  // 获取候选人当前状态
  const candidateRes = await db.collection('candidates').doc(id).get();
  const candidate = candidateRes.data;

  if (!candidate) {
    return {
      success: false,
      error: '候选人不存在'
    };
  }

  const oldStatus = candidate.status;

  // 更新候选人状态
  await db.collection('candidates').doc(id).update({
    data: {
      status: status,
      updatedAt: db.serverDate()
    }
  });

  // 如果有星探推荐，更新星探统计数据
  if (candidate.referral && candidate.referral.scoutId) {
    try {
      await updateScoutStatsOnStatusChange(candidate.referral.scoutId, oldStatus, status);
      console.log('[candidate] 星探统计数据更新成功');
    } catch (error) {
      console.error('[candidate] 星探统计数据更新失败:', error);
      // 不影响主流程，继续执行
    }
  }

  // 如果状态变更为已签约，自动触发分账计算
  if (status === 'signed' && oldStatus !== 'signed') {
    try {
      console.log('[candidate] 触发分账计算, candidateId:', id);
      const commissionRes = await cloud.callFunction({
        name: 'commission',
        data: {
          action: 'calculate',
          data: { candidateId: id }
        }
      });

      if (commissionRes.result && commissionRes.result.success) {
        console.log('[candidate] 分账计算成功:', commissionRes.result.message);
      } else {
        console.error('[candidate] 分账计算失败:', commissionRes.result?.error);
      }
    } catch (error) {
      console.error('[candidate] 调用分账云函数失败:', error);
      // 不影响主流程，继续执行
    }
  }

  return {
    success: true,
    message: '状态更新成功'
  };
}

// 根据状态变化更新星探统计数据
async function updateScoutStatsOnStatusChange(scoutId, oldStatus, newStatus) {
  const updateData = {
    updatedAt: db.serverDate()
  };

  // 从旧状态中减少计数
  if (oldStatus === 'pending') {
    updateData['stats.pendingCount'] = _.inc(-1);
  } else if (oldStatus === 'approved' || oldStatus === 'interview_scheduled') {
    updateData['stats.approvedCount'] = _.inc(-1);
  } else if (oldStatus === 'signed') {
    updateData['stats.signedCount'] = _.inc(-1);
  }

  // 在新状态中增加计数
  if (newStatus === 'pending') {
    updateData['stats.pendingCount'] = _.inc(1);
  } else if (newStatus === 'approved' || newStatus === 'interview_scheduled') {
    updateData['stats.approvedCount'] = _.inc(1);
  } else if (newStatus === 'signed') {
    updateData['stats.signedCount'] = _.inc(1);
  } else if (newStatus === 'rejected') {
    updateData['stats.rejectedCount'] = _.inc(1);
  }

  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });
}
