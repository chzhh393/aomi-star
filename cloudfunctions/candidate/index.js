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

function normalizeText(value, max = 100) {
  return String(value || '').trim().slice(0, max);
}

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isValidIdCard(value) {
  return /^[1-9]\d{16}[\dXx]$/.test(String(value || '').trim());
}

function isValidPhone(value) {
  return /^1\d{10}$/.test(String(value || '').trim());
}

function normalizeNumber(value, decimals = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Number(num.toFixed(decimals));
}

async function resolveScoutReferral(data = {}) {
  const scoutId = normalizeText(data.scoutId, 64);
  const scoutShareCode = normalizeText(data.scoutShareCode, 64);
  const scoutName = normalizeText(data.scoutName, 100);

  let scout = null;

  if (scoutId) {
    const scoutRes = await db.collection('scouts').doc(scoutId).get().catch(() => null);
    if (scoutRes?.data?.status === 'active') {
      scout = scoutRes.data;
    }
  }

  if (!scout && scoutShareCode) {
    const scoutRes = await db.collection('scouts').where({
      shareCode: scoutShareCode,
      status: 'active'
    }).limit(1).get();
    if (scoutRes.data.length > 0) {
      scout = scoutRes.data[0];
    }
  }

  if (!scout) {
    return {
      scout: null,
      input: {
        scoutId,
        scoutShareCode,
        scoutName
      }
    };
  }

  return {
    scout,
    input: {
      scoutId,
      scoutShareCode: scout.shareCode || scoutShareCode,
      scoutName: scout.profile?.name || scoutName
    }
  };
}

function isActiveCandidate(candidate) {
  return !!candidate && !candidate.deletedAt;
}

function formatDateSegment(dateValue) {
  const date = new Date(dateValue || Date.now());
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatDateTime(dateValue = Date.now()) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function buildCandidateNo(docId, dateValue) {
  const normalizedId = normalizeText(docId, 64).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = normalizedId.slice(-6).padStart(6, '0');
  return `C${formatDateSegment(dateValue)}${suffix}`;
}

async function ensureCandidateNo(candidate) {
  if (!candidate || !candidate._id) {
    return candidate || null;
  }

  if (candidate.candidateNo) {
    return candidate;
  }

  const candidateNo = buildCandidateNo(candidate._id, candidate.createdAt || candidate.updatedAt || Date.now());

  await db.collection('candidates').doc(candidate._id).update({
    data: {
      candidateNo,
      updatedAt: db.serverDate()
    }
  }).catch(() => null);

  if (candidate.openId) {
    await db.collection('users').where({
      openId: candidate.openId
    }).update({
      data: {
        'candidateInfo.candidateNo': candidateNo,
        updatedAt: db.serverDate()
      }
    }).catch(() => null);
  }

  return {
    ...candidate,
    candidateNo
  };
}

async function getCandidateByIdentifier(identifier) {
  const normalized = normalizeText(identifier, 100);
  if (!normalized) {
    return null;
  }

  const directRes = await db.collection('candidates').doc(normalized).get().catch(() => null);
  if (directRes?.data && isActiveCandidate(directRes.data)) {
    return ensureCandidateNo(directRes.data);
  }

  const candidateNoRes = await db.collection('candidates').where({
    candidateNo: normalized
  }).limit(1).get();
  const candidate = candidateNoRes.data?.[0];
  if (candidate && isActiveCandidate(candidate)) {
    return ensureCandidateNo(candidate);
  }

  return null;
}

async function getLatestActiveCandidateByOpenId(openId) {
  const res = await db.collection('candidates').where({
    openId
  }).get();

  const candidates = (res.data || [])
    .filter((candidate) => isActiveCandidate(candidate))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

  return ensureCandidateNo(candidates[0] || null);
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
      case 'list':
        return await listCandidates(data);
      case 'markPayslipRead':
        return await markPayslipRead(openId);
      case 'update':
        return await updateCandidate(openId, data);
      case 'updateStatus':
        return await updateCandidateStatus(data.id, data.status);
      case 'respondTrainingCampTodo':
        return await respondTrainingCampTodo(openId, data);
      case 'submitTrainingDailyRecord':
        return await submitTrainingDailyRecord(openId, data);
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
  const existingCandidate = await getLatestActiveCandidateByOpenId(openId);
  if (existingCandidate) {
    return {
      success: false,
      error: '您已经报名过了',
      candidate: existingCandidate
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

  const referralResult = await resolveScoutReferral(data);

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
    referredBy: referralResult.input.scoutShareCode || null,

    // 状态
    status: 'pending',

    // 时间
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  // 如果有推荐码，查找星探并关联（扁平推荐，不再构建链条）
  if (referralResult.scout) {
    const scout = referralResult.scout;

    candidateData.referral = {
      scoutId: scout._id,
      scoutShareCode: scout.shareCode || referralResult.input.scoutShareCode || '',
      scoutName: scout.profile?.name || referralResult.input.scoutName || '',
      scoutGrade: scout.grade || 'rookie',
      referredAt: db.serverDate()
    };

    console.log('[candidate] 关联星探成功:', candidateData.referral.scoutName, '等级:', scout.grade || 'rookie');
  } else if (referralResult.input.scoutId || referralResult.input.scoutShareCode) {
    console.log('[candidate] 推荐星探未匹配成功:', referralResult.input);
  }

  const createRes = await db.collection('candidates').add({
    data: candidateData
  });

  const candidateNo = buildCandidateNo(createRes._id, Date.now());

  await db.collection('candidates').doc(createRes._id).update({
    data: {
      candidateNo,
      updatedAt: db.serverDate()
    }
  });

  // 更新用户信息，关联候选人ID
  await db.collection('users').where({
    openId: openId
  }).update({
    data: {
      'candidateInfo.candidateId': createRes._id,
      'candidateInfo.candidateNo': candidateNo,
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
          'stats.referredCount': _.inc(1),
          updatedAt: db.serverDate()
        }
      });
      console.log('[candidate] 星探统计数据更新成功');
    } catch (error) {
      console.error('[candidate] 星探统计数据更新失败:', error);
    }
  }

  return {
    success: true,
    candidateId: createRes._id,
    candidateNo,
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
  const candidate = await getLatestActiveCandidateByOpenId(openId);
  if (!candidate) {
    return { success: false, error: '未找到报名记录' };
  }

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
    candidateNo: candidate.candidateNo || '',
    message: '修改成功'
  };
}

// 根据ID获取候选人信息
async function getCandidate(id) {
  const candidate = await getCandidateByIdentifier(id);

  if (!candidate) {
    return {
      success: false,
      error: '候选人不存在'
    };
  }

  return {
    success: true,
    candidate
  };
}

// 根据 openId 获取候选人信息
async function getCandidateByOpenId(openId) {
  const candidate = await getLatestActiveCandidateByOpenId(openId);
  if (!candidate) {
    return {
      success: false,
      error: '未找到报名记录'
    };
  }

  return {
    success: true,
    candidate
  };
}

async function listCandidates(data = {}) {
  const page = Math.max(1, Number(data.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(data.pageSize || 20)));
  const keyword = normalizeText(data.keyword || '', 100);
  const inputStatuses = Array.isArray(data.statuses) ? data.statuses : [];
  const statuses = inputStatuses
    .map((item) => normalizeText(item, 40))
    .filter(Boolean);

  const conditions = {
    deletedAt: _.exists(false)
  };

  if (statuses.length > 0) {
    conditions.status = _.in(statuses);
  }

  if (keyword) {
    conditions['basicInfo.name'] = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  const query = db.collection('candidates').where(conditions);
  const skip = (page - 1) * pageSize;
  const countRes = await query.count();
  const total = countRes.total || 0;
  const res = await query
    .orderBy('updatedAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  const list = await Promise.all((res.data || []).map((item) => ensureCandidateNo(item)));

  return {
    success: true,
    data: {
      list,
      total,
      page,
      pageSize
    }
  };
}

async function markPayslipRead(openId) {
  const candidate = await getLatestActiveCandidateByOpenId(openId);
  if (!candidate) {
    return {
      success: false,
      error: '未找到主播信息'
    };
  }

  const payslip = candidate?.commission?.payslip || null;
  if (!payslip || payslip.status !== 'sent') {
    return {
      success: false,
      error: '暂无可查看工资条'
    };
  }

  if (payslip.receiptStatus === 'viewed') {
    return {
      success: true,
      message: '工资条已查看'
    };
  }

  await db.collection('candidates').doc(candidate._id).update({
    data: {
      'commission.payslip.receiptStatus': 'viewed',
      'commission.payslip.receiptViewedAt': new Date(),
      'commission.payslip.receiptViewedAtText': formatDateTime(),
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    message: '工资条查看回执已记录'
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

  // 如果状态变更为已签约，检查星探等级升级
  if (status === 'signed' && oldStatus !== 'signed' && candidate.referral && candidate.referral.scoutId) {
    try {
      await cloud.callFunction({
        name: 'scout',
        data: {
          action: 'checkAndUpgradeGrade',
          data: { scoutId: candidate.referral.scoutId }
        }
      });
    } catch (error) {
      console.error('[candidate] 检查星探等级升级失败:', error);
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

async function syncCandidateStatusToUser(openId, status) {
  if (!openId || !status) {
    return;
  }
  const isAnchor = ['signed', 'training', 'active'].includes(status);

  await db.collection('users').where({
    openId
  }).update({
    data: {
      userType: isAnchor ? 'anchor' : 'candidate',
      role: isAnchor ? 'anchor' : 'candidate',
      'candidateInfo.status': status,
      updatedAt: db.serverDate()
    }
  }).catch(() => null);
}

function validateTrainingCampSubmission(submission) {
  if (!submission || typeof submission !== 'object') {
    return '请完善入营资料';
  }

  if (isEmpty(submission.idCardFront)) {
    return '请上传身份证人像面';
  }

  if (isEmpty(submission.idCardBack)) {
    return '请上传身份证国徽面';
  }

  if (isEmpty(submission.bankCardImage)) {
    return '请上传银行卡照片';
  }

  if (isEmpty(submission.idCardName)) {
    return '请输入身份证姓名';
  }

  if (!isValidIdCard(submission.idCardNumber)) {
    return '请输入正确的身份证号';
  }

  if (isEmpty(submission.bankName)) {
    return '请输入开户行';
  }

  if (isEmpty(submission.bankAccountName)) {
    return '请输入银行卡户名';
  }

  if (isEmpty(submission.bankCardNumber)) {
    return '请输入银行卡号';
  }

  if (isEmpty(submission.emergencyContactName)) {
    return '请输入紧急联系人姓名';
  }

  if (!isValidPhone(submission.emergencyContactPhone)) {
    return '请输入正确的紧急联系人手机号';
  }

  if (isEmpty(submission.emergencyContactRelation)) {
    return '请输入与紧急联系人的关系';
  }

  return '';
}

function buildTrainingCampSubmission(candidate, submission) {
  const candidateName = normalizeText(candidate?.basicInfo?.name, 50);
  const addressRegion = Array.isArray(submission.addressRegion)
    ? submission.addressRegion.map((item) => normalizeText(item, 30)).filter(Boolean).slice(0, 3)
    : [];
  const addressDetail = normalizeText(submission.addressDetail, 120);
  const normalizedSubmission = {
    idCardFront: submission.idCardFront,
    idCardBack: submission.idCardBack,
    bankCardImage: submission.bankCardImage,
    idCardName: normalizeText(submission.idCardName, 50) || candidateName,
    idCardNumber: normalizeText(submission.idCardNumber, 18).toUpperCase(),
    bankName: normalizeText(submission.bankName, 80),
    bankAccountName: normalizeText(submission.bankAccountName, 50) || candidateName,
    bankCardNumber: normalizeText(submission.bankCardNumber, 40),
    emergencyContactName: normalizeText(submission.emergencyContactName, 50),
    emergencyContactPhone: normalizeText(submission.emergencyContactPhone, 20),
    emergencyContactRelation: normalizeText(submission.emergencyContactRelation, 30),
    emergencyContactRemark: normalizeText(submission.emergencyContactRemark, 100),
    communicationAddress: normalizeText(
      submission.communicationAddress || [addressRegion.join(' '), addressDetail].filter(Boolean).join(' '),
      200
    ),
    addressRegion,
    addressDetail
  };

  return normalizedSubmission;
}

async function respondTrainingCampTodo(openId, data) {
  const candidate = await getLatestActiveCandidateByOpenId(openId);
  if (!candidate) {
    return { success: false, error: '未找到报名记录' };
  }

  const todo = candidate.trainingCampTodo;
  if (!todo || todo.status !== 'pending') {
    return { success: false, error: '当前没有待处理的入营待办' };
  }

  const decision = normalizeText(data?.decision, 20);
  if (!['confirm', 'reject'].includes(decision)) {
    return { success: false, error: '无效的处理结果' };
  }

  const updateData = {
    'trainingCampTodo.status': decision === 'confirm' ? 'confirmed' : 'rejected',
    'trainingCampTodo.decision': decision,
    'trainingCampTodo.respondedAt': db.serverDate(),
    updatedAt: db.serverDate()
  };

  if (decision === 'reject') {
    const rejectReason = normalizeText(data?.rejectReason, 300);
    if (!rejectReason) {
      return { success: false, error: '请填写拒绝原因' };
    }

    updateData['trainingCampTodo.rejectReason'] = rejectReason;

    await db.collection('candidates').doc(candidate._id).update({
      data: updateData
    });

    return {
      success: true,
      message: '已提交拒绝原因'
    };
  }

  const submission = buildTrainingCampSubmission(candidate, data?.submission || {});
  const validationError = validateTrainingCampSubmission(submission);
  if (validationError) {
    return { success: false, error: validationError };
  }

  updateData.status = 'training';
  updateData.trainingCamp = {
    campType: todo.campType || '',
    startDate: todo.startDate || '',
    startTime: todo.startTime || '',
    remark: todo.remark || '',
    invitationContent: todo.invitationContent || '',
    assignedBy: todo.sentBy || {},
    confirmedAt: db.serverDate(),
    status: 'scheduled'
  };
  updateData.onboardingProfile = submission;
  updateData['trainingCampTodo.submission'] = submission;

  await db.collection('candidates').doc(candidate._id).update({
    data: updateData
  });

  await syncCandidateStatusToUser(openId, 'training');

  return {
    success: true,
    message: '入营确认成功'
  };
}

async function submitTrainingDailyRecord(openId, data) {
  const candidate = await getLatestActiveCandidateByOpenId(openId);
  if (!candidate) {
    return { success: false, error: '未找到报名记录' };
  }

  if (candidate.status !== 'training') {
    return { success: false, error: '当前不在训练营阶段' };
  }

  const recordDate = normalizeText(data?.recordDate, 20) || new Date().toISOString().slice(0, 10);
  const recordType = normalizeText(data?.recordType, 30) || 'entry_note';
  const typeTitleMap = {
    entry_note: '舞蹈室入场训练记录',
    exit_note: '舞蹈室离场复盘记录'
  };
  const title = normalizeText(data?.title, 60) || typeTitleMap[recordType] || '舞蹈室训练记录';
  const summary = normalizeText(data?.summary, 300);
  const photos = Array.isArray(data?.photos) ? data.photos.filter((item) => !isEmpty(item)).slice(0, 6) : [];
  const rawLocationSnapshot = data?.locationSnapshot && typeof data.locationSnapshot === 'object'
    ? data.locationSnapshot
    : null;
  const locationSnapshot = rawLocationSnapshot ? {
    latitude: normalizeNumber(rawLocationSnapshot.latitude),
    longitude: normalizeNumber(rawLocationSnapshot.longitude),
    distanceMeters: Math.max(0, Math.round(Number(rawLocationSnapshot.distanceMeters) || 0)),
    checkedAt: normalizeText(rawLocationSnapshot.checkedAt, 40),
    baseName: normalizeText(rawLocationSnapshot.baseName, 50)
  } : null;

  if (!summary) {
    return { success: false, error: '请填写今日训练心得或成果记录' };
  }

  const currentRecords = Array.isArray(candidate.trainingCamp?.dailyRecords)
    ? candidate.trainingCamp.dailyRecords
    : [];

  const duplicated = currentRecords.find((item) => (
    item &&
    item.recordDate === recordDate &&
    item.recordType === recordType
  ));

  if (duplicated) {
    return { success: false, error: '今天已提交过同类型训练记录' };
  }

  const recordId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nextRecord = {
    recordId,
    recordDate,
    recordType,
    title,
    summary,
    photos,
    locationSnapshot,
    status: 'pending_review',
    reviewComment: '',
    createdAt: db.serverDate()
  };

  await db.collection('candidates').doc(candidate._id).update({
    data: {
      'trainingCamp.dailyRecords': [...currentRecords, nextRecord],
      'trainingCamp.lastRecordDate': recordDate,
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    message: '训练记录提交成功',
    recordId
  };
}

// 根据状态变化更新星探统计数据（新模式：只跟踪 signedCount）
async function updateScoutStatsOnStatusChange(scoutId, oldStatus, newStatus) {
  const updateData = {
    updatedAt: db.serverDate()
  };

  // 新增签约
  if (newStatus === 'signed' && oldStatus !== 'signed') {
    updateData['stats.signedCount'] = _.inc(1);
  }
  // 取消签约（罕见但防御性处理）
  else if (oldStatus === 'signed' && newStatus !== 'signed') {
    updateData['stats.signedCount'] = _.inc(-1);
  }
  // 其他状态变化不再更新 scout stats（pendingCount 等已移除）
  else {
    return;
  }

  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });
}
