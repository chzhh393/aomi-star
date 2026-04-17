/**
 * 经纪人API服务
 * 封装所有经纪人相关的云函数调用
 */

import { getAgentToken, handleTokenExpired } from './agent-auth.js';

// ==================== 私有方法 ====================

/**
 * 统一调用云函数
 * @param {String} action - 操作类型
 * @param {Object} data - 请求数据
 * @returns {Promise<Object>}
 */
async function callAdminFunction(action, data = {}) {
  try {
    const token = getAgentToken();
    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const res = await wx.cloud.callFunction({
      name: 'admin',
      data: {
        action,
        token,
        data
      }
    });

    console.log(`[经纪人API] ${action} 返回:`, res.result);

    // 处理响应
    if (res.result && res.result.success) {
      return res.result;
    } else {
      const errorMsg = res.result?.message || res.result?.error || '请求失败';
      // 检查是否是Token过期
      if (errorMsg.includes('token') ||
          errorMsg.includes('登录') ||
          errorMsg.includes('过期')) {
        handleTokenExpired();
      }

      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error(`[经纪人API] ${action} 失败:`, error);
    throw error;
  }
}

// ==================== 候选人相关 ====================

/**
 * 获取候选人列表
 * @param {Object} params - 查询参数
 * @param {String} params.status - 筛选状态（可选）
 * @param {Number} params.page - 页码（可选，默认1）
 * @param {Number} params.pageSize - 每页数量（可选，默认20）
 * @returns {Promise<Object>} { list, total, page, pageSize }
 */
export async function getCandidateList(params = {}) {
  try {
    wx.showLoading({ title: '加载中...', mask: true });

    const result = await callAdminFunction('getCandidateList', {
      status: params.status,
      page: params.page || 1,
      pageSize: params.pageSize || 20
    });

    wx.hideLoading();
    return result.data || {
      list: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20
    };
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '获取候选人列表失败',
      icon: 'none'
    });
    throw error;
  }
}

/**
 * 获取候选人详情
 * @param {String} candidateId - 候选人ID
 * @returns {Promise<Object>} 候选人详情
 */
export async function getCandidateDetail(candidateId) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    wx.showLoading({ title: '加载中...', mask: true });

    const result = await callAdminFunction('getCandidateDetail', {
      id: candidateId
    });

    wx.hideLoading();
    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '获取候选人详情失败',
      icon: 'none'
    });
    throw error;
  }
}

export async function getCandidateInterviewEvaluations(candidateId) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    const result = await callAdminFunction('getCandidateInterviewEvaluations', {
      id: candidateId
    });

    return result.data || {
      candidate: null,
      sharedMaterials: null,
      evaluations: []
    };
  } catch (error) {
    console.error('[经纪人API] 获取面试评价汇总失败:', error);
    throw error;
  }
}

export async function getTrainingCampRecords(candidateId) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    const result = await callAdminFunction('getTrainingCampRecords', {
      candidateId
    });

    return result.data || {
      candidateId,
      trainingCamp: {},
      assignedAgent: null
    };
  } catch (error) {
    console.error('[经纪人API] 获取训练营记录失败:', error);
    throw error;
  }
}

export async function createTrainingCampTodo(candidateId, payload = {}) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    if (!payload.campType || !payload.startDate) {
      throw new Error('请填写训练营类型和入营时间');
    }

    wx.showLoading({ title: '发送中...', mask: true });

    const result = await callAdminFunction('createTrainingCampTodo', {
      candidateId,
      campType: payload.campType,
      startDate: payload.startDate,
      startTime: payload.startTime,
      remark: payload.remark || ''
    });

    wx.hideLoading();
    wx.showToast({
      title: '已发送',
      icon: 'success'
    });

    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '发送失败',
      icon: 'none'
    });
    throw error;
  }
}

export async function listDanceCourseSlots(params = {}) {
  try {
    const result = await callAdminFunction('listDanceCourseSlots', params);
    return result.data || { list: [] };
  } catch (error) {
    console.error('[经纪人API] 获取舞蹈课程表失败:', error);
    throw error;
  }
}

export async function bookDanceCourseSlot(candidateId, slotId) {
  try {
    if (!candidateId || !slotId) {
      throw new Error('请选择预约课程');
    }

    wx.showLoading({ title: '预约中...', mask: true });
    const result = await callAdminFunction('bookDanceCourseSlot', {
      candidateId,
      slotId
    });
    wx.hideLoading();
    wx.showToast({
      title: '预约成功',
      icon: 'success'
    });
    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '预约失败',
      icon: 'none'
    });
    throw error;
  }
}

// ==================== 面试打分 ====================

/**
 * 提交面试打分
 * @param {String} candidateId - 候选人ID
 * @param {Object} scoreData - 打分数据
 * @param {String} scoreData.result - 评分结果 (pass_s|pass_a|pass_b|fail|pending)
 * @param {Object} scoreData.tags - 评价标签 { appearance: [], talent: [], ... }
 * @param {String} scoreData.comment - 备注
 * @returns {Promise<Object>}
 */
export async function scoreInterview(candidateId, scoreData) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    if (!scoreData.result) {
      throw new Error('请选择评分结果');
    }

    wx.showLoading({ title: '提交中...', mask: true });

    const result = await callAdminFunction('scoreInterview', {
      candidateId,
      score: {
        result: scoreData.result,
        tags: scoreData.tags || {},
        comment: scoreData.comment || ''
      }
    });

    wx.hideLoading();

    wx.showToast({
      title: '提交成功',
      icon: 'success'
    });

    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '提交失败',
      icon: 'none'
    });
    throw error;
  }
}

/**
 * 提交面试官评价
 * @param {String} candidateId - 候选人ID
 * @param {String} role - 面试官角色
 * @param {Object} evaluation - 评价数据
 * @returns {Promise<Object>}
 */
export async function submitInterviewerEvaluation(candidateId, role, evaluation) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    if (!role) {
      throw new Error('角色不能为空');
    }

    if (!evaluation || typeof evaluation !== 'object') {
      throw new Error('评价数据不能为空');
    }

    wx.showLoading({ title: '提交中...', mask: true });

    const result = await callAdminFunction('submitInterviewerEvaluation', {
      candidateId,
      role,
      evaluation
    });

    wx.hideLoading();
    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '提交失败',
      icon: 'none'
    });
    throw error;
  }
}

// ==================== 面试资料上传 ====================

/**
 * 上传面试照片
 * @param {String} candidateId - 候选人ID
 * @param {Array<String>} photoUrls - 照片云存储URL数组
 * @returns {Promise<Object>}
 */
export async function uploadInterviewPhotos(candidateId, photoUrls) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    if (!photoUrls || photoUrls.length === 0) {
      throw new Error('请选择要上传的照片');
    }

    wx.showLoading({ title: '保存中...', mask: true });

    const result = await callAdminFunction('uploadInterviewMaterials', {
      candidateId,
      type: 'photos',
      urls: photoUrls
    });

    wx.hideLoading();

    wx.showToast({
      title: '上传成功',
      icon: 'success'
    });

    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    });
    throw error;
  }
}

/**
 * 上传面试视频
 * @param {String} candidateId - 候选人ID
 * @param {Array<String>} videoUrls - 视频云存储URL数组
 * @returns {Promise<Object>}
 */
export async function uploadInterviewVideos(candidateId, videoUrls) {
  try {
    if (!candidateId) {
      throw new Error('候选人ID不能为空');
    }

    if (!videoUrls || videoUrls.length === 0) {
      throw new Error('请选择要上传的视频');
    }

    wx.showLoading({ title: '保存中...', mask: true });

    const result = await callAdminFunction('uploadInterviewMaterials', {
      candidateId,
      type: 'videos',
      urls: videoUrls
    });

    wx.hideLoading();

    wx.showToast({
      title: '上传成功',
      icon: 'success'
    });

    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '上传失败',
      icon: 'none'
    });
    throw error;
  }
}

/**
 * 删除面试资料
 * @param {String} candidateId - 候选人ID
 * @param {String} materialId - 资料ID
 * @returns {Promise<Object>}
 */
export async function deleteInterviewMaterial(candidateId, materialId) {
  try {
    if (!candidateId || !materialId) {
      throw new Error('参数不能为空');
    }

    wx.showLoading({ title: '删除中...', mask: true });

    const result = await callAdminFunction('deleteInterviewMaterial', {
      candidateId,
      materialId
    });

    wx.hideLoading();

    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });

    return result;
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: error.message || '删除失败',
      icon: 'none'
    });
    throw error;
  }
}

// ==================== 统计数据 ====================

/**
 * 获取经纪人工作统计
 * @returns {Promise<Object>} 统计数据
 */
export async function getAgentStats() {
  try {
    const result = await callAdminFunction('getAgentStats');
    return result.stats || {
      totalCount: 0,
      scoredCount: 0,
      pendingCount: 0,
      monthCount: 0
    };
  } catch (error) {
    console.error('[经纪人API] 获取统计数据失败:', error);
    return {
      totalCount: 0,
      scoredCount: 0,
      pendingCount: 0,
      monthCount: 0
    };
  }
}

// ==================== 云存储上传 ====================

/**
 * 上传图片到云存储
 * @param {String} tempFilePath - 临时文件路径
 * @param {String} candidateId - 候选人ID
 * @returns {Promise<String>} 云存储URL
 */
export async function uploadImageToCloud(tempFilePath, candidateId) {
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const cloudPath = `interview/${candidateId}/photo_${timestamp}_${randomStr}.jpg`;

    const result = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath
    });

    console.log('[云存储] 图片上传成功:', result.fileID);
    return result.fileID;
  } catch (error) {
    console.error('[云存储] 图片上传失败:', error);
    throw new Error('图片上传失败，请重试');
  }
}

/**
 * 上传视频到云存储
 * @param {String} tempFilePath - 临时文件路径
 * @param {String} candidateId - 候选人ID
 * @returns {Promise<String>} 云存储URL
 */
export async function uploadVideoToCloud(tempFilePath, candidateId) {
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    const cloudPath = `interview/${candidateId}/video_${timestamp}_${randomStr}.mp4`;

    const result = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath
    });

    console.log('[云存储] 视频上传成功:', result.fileID);
    return result.fileID;
  } catch (error) {
    console.error('[云存储] 视频上传失败:', error);
    throw new Error('视频上传失败，请重试');
  }
}

/**
 * 批量上传图片到云存储（带进度）
 * @param {Array<String>} tempFilePaths - 临时文件路径数组
 * @param {String} candidateId - 候选人ID
 * @param {Function} onProgress - 进度回调 (current, total)
 * @returns {Promise<Array<String>>} 云存储URL数组
 */
export async function batchUploadImages(tempFilePaths, candidateId, onProgress) {
  const urls = new Array(tempFilePaths.length).fill('');
  const total = tempFilePaths.length;

  for (let i = 0; i < total; i++) {
    try {
      const url = await uploadImageToCloud(tempFilePaths[i], candidateId);
      urls[i] = url;

      // 更新进度
      if (onProgress) {
        onProgress(i + 1, total);
      }
    } catch (error) {
      console.error(`[云存储] 第${i + 1}张图片上传失败:`, error);
      // 继续上传其他图片
    }
  }

  return urls;
}

/**
 * 批量上传视频到云存储（带进度）
 * @param {Array<String>} tempFilePaths - 临时文件路径数组
 * @param {String} candidateId - 候选人ID
 * @param {Function} onProgress - 进度回调 (current, total)
 * @returns {Promise<Array<String>>} 云存储URL数组
 */
export async function batchUploadVideos(tempFilePaths, candidateId, onProgress) {
  const urls = new Array(tempFilePaths.length).fill('');
  const total = tempFilePaths.length;

  for (let i = 0; i < total; i++) {
    try {
      const url = await uploadVideoToCloud(tempFilePaths[i], candidateId);
      urls[i] = url;

      // 更新进度
      if (onProgress) {
        onProgress(i + 1, total);
      }
    } catch (error) {
      console.error(`[云存储] 第${i + 1}个视频上传失败:`, error);
      // 继续上传其他视频
    }
  }

  return urls;
}
