/**
 * 角色升级工具
 * 处理候选人升级为主播的完整流程
 */

import { getUserByCandidateId, updateUser, USER_TYPE, ROLE } from '../mock/users.js';
import { getCandidateById } from '../mock/candidates.js';

// ==================== 角色升级主函数 ====================

/**
 * 候选人升级为主播（核心函数）
 * 触发时机：合同上传并签约后
 *
 * @param {String} candidateId - 候选人ID
 * @param {Object} upgradeData - 升级相关数据
 * @returns {Object} 升级结果
 */
export async function upgradeCandidateToStreamer(candidateId, upgradeData = {}) {
  try {
    console.log('[角色升级] 开始升级流程:', candidateId);

    // 1. 获取候选人数据
    const candidate = getCandidateById(candidateId);
    if (!candidate) {
      throw new Error('候选人不存在');
    }

    // 2. 验证候选人状态
    if (candidate.status !== 'signed') {
      throw new Error(`候选人状态不符合升级条件，当前状态：${candidate.status}`);
    }

    // 3. 获取关联的用户账号
    const user = getUserByCandidateId(candidateId);
    if (!user) {
      throw new Error('未找到关联的用户账号');
    }

    // 4. 数据迁移：candidateInfo → candidateHistory
    const candidateHistory = {
      ...candidate,
      upgradedAt: new Date().toLocaleString('zh-CN'),
      upgradedBy: upgradeData.upgradedBy || 'SYSTEM'
    };

    // 5. 创建主播档案：streamerInfo
    const streamerInfo = {
      streamerId: `S${Date.now().toString().slice(-6)}`,
      candidateId: candidateId,

      // 从候选人数据继承基础信息
      basicInfo: candidate.basicInfo,

      // 合同信息
      contract: candidate.contract,

      // 评级信息
      rating: candidate.rating,

      // 分配的经纪人
      agentId: upgradeData.agentId || null,

      // 主播状态
      status: 'training', // training, active, suspended

      // 培训信息
      training: {
        startDate: new Date().toISOString().split('T')[0],
        duration: candidate.rating?.trainingDuration || 2,
        status: 'in_progress', // in_progress, completed
        completedDate: null
      },

      // 直播数据（初始化）
      streamingData: {
        totalHours: 0,
        totalRevenue: 0,
        fansCount: 0,
        averageViewers: 0
      },

      // 时间戳
      joinedAt: new Date().toLocaleString('zh-CN'),
      lastActiveAt: new Date().toLocaleString('zh-CN')
    };

    // 6. 角色变更记录
    const roleChange = {
      from: ROLE.CANDIDATE,
      to: ROLE.ANCHOR,
      changedAt: new Date().toLocaleString('zh-CN'),
      reason: 'contract_signed',
      changedBy: upgradeData.upgradedBy || 'SYSTEM'
    };

    // 7. 更新用户信息
    const updatedUser = updateUser(user.id, {
      userType: USER_TYPE.ANCHOR,
      role: ROLE.ANCHOR,

      // 保留候选人历史
      candidateHistory: candidateHistory,

      // 新增主播信息
      streamerInfo: streamerInfo,

      // 角色变更记录
      roleChanges: [...(user.roleChanges || []), roleChange],

      // 更新首次登录标记（让用户重新进入主播工作台）
      isFirstLogin: true
    });

    console.log('[角色升级] 升级成功:', user.id, '→', ROLE.ANCHOR);

    // 8. 更新本地存储中的用户信息（如果是当前用户）
    const currentUser = wx.getStorageSync('user_info');
    if (currentUser && currentUser.id === user.id) {
      wx.setStorageSync('user_info', updatedUser);
      console.log('[角色升级] 已更新本地用户信息');
    }

    return {
      success: true,
      user: updatedUser,
      streamerInfo: streamerInfo,
      message: '候选人已成功升级为主播'
    };

  } catch (error) {
    console.error('[角色升级] 升级失败:', error);
    return {
      success: false,
      error: error.message,
      message: `升级失败：${error.message}`
    };
  }
}

// ==================== 辅助函数 ====================

/**
 * 检查候选人是否可以升级
 * @param {String} candidateId - 候选人ID
 * @returns {Object} 检查结果
 */
export function canUpgradeToStreamer(candidateId) {
  const candidate = getCandidateById(candidateId);

  if (!candidate) {
    return {
      canUpgrade: false,
      reason: '候选人不存在'
    };
  }

  if (candidate.status !== 'signed') {
    return {
      canUpgrade: false,
      reason: `候选人状态不符合，当前状态：${candidate.status}`
    };
  }

  if (!candidate.contract) {
    return {
      canUpgrade: false,
      reason: '缺少合同信息'
    };
  }

  if (!candidate.rating) {
    return {
      canUpgrade: false,
      reason: '缺少评级信息'
    };
  }

  return {
    canUpgrade: true,
    reason: '符合升级条件'
  };
}

/**
 * 完成培训（主播状态：training → active）
 * @param {String} userId - 用户ID
 * @returns {Object} 操作结果
 */
export function completeTraining(userId) {
  const user = getUserById(userId);

  if (!user || user.role !== ROLE.ANCHOR) {
    return {
      success: false,
      message: '用户不是主播角色'
    };
  }

  if (!user.streamerInfo || user.streamerInfo.status !== 'training') {
    return {
      success: false,
      message: '主播不在培训状态'
    };
  }

  // 更新主播状态
  const updatedUser = updateUser(userId, {
    'streamerInfo.status': 'active',
    'streamerInfo.training.status': 'completed',
    'streamerInfo.training.completedDate': new Date().toISOString().split('T')[0]
  });

  // 更新本地存储
  const currentUser = wx.getStorageSync('user_info');
  if (currentUser && currentUser.id === userId) {
    wx.setStorageSync('user_info', updatedUser);
  }

  return {
    success: true,
    user: updatedUser,
    message: '培训已完成，主播状态已更新为活跃'
  };
}

/**
 * 获取主播培训进度
 * @param {String} userId - 用户ID
 * @returns {Object} 培训进度信息
 */
export function getTrainingProgress(userId) {
  const user = getUserById(userId);

  if (!user || !user.streamerInfo) {
    return null;
  }

  const training = user.streamerInfo.training;
  if (!training) {
    return null;
  }

  // 计算培训进度
  const startDate = new Date(training.startDate);
  const now = new Date();
  const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const totalDays = training.duration * 7; // 周转天
  const progress = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

  return {
    status: training.status,
    progress: progress,
    daysElapsed: daysElapsed,
    totalDays: totalDays,
    remainingDays: Math.max(0, totalDays - daysElapsed),
    startDate: training.startDate,
    completedDate: training.completedDate
  };
}

/**
 * 批量升级候选人
 * @param {Array} candidateIds - 候选人ID数组
 * @returns {Object} 批量升级结果
 */
export async function batchUpgradeCandidates(candidateIds, upgradeData = {}) {
  const results = {
    success: [],
    failed: []
  };

  for (const candidateId of candidateIds) {
    const result = await upgradeCandidateToStreamer(candidateId, upgradeData);

    if (result.success) {
      results.success.push({
        candidateId,
        userId: result.user.id
      });
    } else {
      results.failed.push({
        candidateId,
        error: result.error
      });
    }
  }

  return {
    total: candidateIds.length,
    successCount: results.success.length,
    failedCount: results.failed.length,
    details: results
  };
}

// 导入 getUserById（避免循环依赖）
function getUserById(userId) {
  const { getUserById: _getUserById } = require('../mock/users.js');
  return _getUserById(userId);
}
