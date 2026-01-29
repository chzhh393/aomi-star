// 云函数入口文件 - 用户管理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, data } = event;

  console.log('[user] action:', action, 'openId:', openId);

  try {
    switch (action) {
      case 'get':
        return await getUser(openId);
      case 'create':
        return await createUser(openId, data);
      case 'update':
        return await updateUser(openId, data);
      default:
        return {
          success: false,
          error: '未知操作'
        };
    }
  } catch (error) {
    console.error('[user] 错误:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

// 获取用户信息
async function getUser(openId) {
  const res = await db.collection('users').where({
    openId: openId
  }).get();

  if (res.data.length === 0) {
    return {
      success: false,
      error: '用户不存在'
    };
  }

  return {
    success: true,
    user: res.data[0]
  };
}

// 创建用户
async function createUser(openId, data) {
  // 检查用户是否已存在
  const existRes = await db.collection('users').where({
    openId: openId
  }).get();

  if (existRes.data.length > 0) {
    return {
      success: false,
      error: '用户已存在'
    };
  }

  const newUser = {
    openId: openId,
    userType: data.userType || 'candidate',
    role: data.role || 'candidate',
    profile: {
      name: data.name || '',
      nickname: data.nickname || '',
      avatar: data.avatar || '',
      phone: data.phone || ''
    },
    status: 'active',
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate()
  };

  const createRes = await db.collection('users').add({
    data: newUser
  });

  return {
    success: true,
    userId: createRes._id,
    user: {
      _id: createRes._id,
      ...newUser
    }
  };
}

// 更新用户信息
async function updateUser(openId, data) {
  const userRes = await db.collection('users').where({
    openId: openId
  }).get();

  if (userRes.data.length === 0) {
    return {
      success: false,
      error: '用户不存在'
    };
  }

  const userId = userRes.data[0]._id;

  // 只允许更新特定字段
  const updateData = {};
  if (data.profile) {
    updateData['profile.name'] = data.profile.name;
    updateData['profile.nickname'] = data.profile.nickname;
    updateData['profile.avatar'] = data.profile.avatar;
    updateData['profile.phone'] = data.profile.phone;
  }
  updateData.updatedAt = db.serverDate();

  await db.collection('users').doc(userId).update({
    data: updateData
  });

  // 返回更新后的用户信息
  const updatedRes = await db.collection('users').doc(userId).get();

  return {
    success: true,
    user: updatedRes.data
  };
}
