// 云函数入口文件 - 微信登录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  console.log('[login] openId:', openId);

  if (!openId) {
    return {
      success: false,
      error: '获取用户信息失败'
    };
  }

  try {
    // 查询用户是否已存在
    const userRes = await db.collection('users').where({
      openId: openId
    }).get();

    let user = null;
    let isNewUser = false;

    if (userRes.data.length > 0) {
      // 老用户，更新最后登录时间
      user = userRes.data[0];
      await db.collection('users').doc(user._id).update({
        data: {
          lastLoginAt: db.serverDate()
        }
      });
      console.log('[login] 老用户登录:', user._id);
    } else {
      // 新用户，创建用户记录
      isNewUser = true;
      const newUser = {
        openId: openId,
        userType: 'candidate',
        role: 'candidate',
        profile: {
          name: '',
          nickname: '',
          avatar: '',
          phone: ''
        },
        status: 'active',
        createdAt: db.serverDate(),
        lastLoginAt: db.serverDate()
      };

      const createRes = await db.collection('users').add({
        data: newUser
      });

      user = {
        _id: createRes._id,
        ...newUser
      };
      console.log('[login] 新用户创建:', createRes._id);
    }

    return {
      success: true,
      openId: openId,
      isNewUser: isNewUser,
      user: user
    };

  } catch (error) {
    console.error('[login] 错误:', error);
    return {
      success: false,
      error: error.message || '登录失败'
    };
  }
};
