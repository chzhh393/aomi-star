# 认证 API

> 登录、授权相关的云函数接口

**创建日期**: 2025-11-05
**最后更新**: 2025-11-05
**维护者**: 技术团队
**源文档**: multi-role-system.md

---

## 相关文档
- [返回业务文档中心](../README.md)
- [登录流程设计](../workflows/login-flow.md)
- [角色管理 API](./role-api.md)

---

## 登录相关 API

### 1. 用户登录

**云函数名称**：`login`

**功能**：微信授权登录，查询用户角色信息

**请求参数**：
```javascript
{
  sceneParams: {
    scene: 1047,  // 场景值
    query: {      // 场景参数
      scout_code: 'SC-EXT-20250102-A3B9',  // 可选
      invite_code: 'INV-HR-20250102-X7Y9'  // 可选
    }
  }
}
```

**返回数据**：
```javascript
// 已注册用户
{
  registered: true,
  userId: 'user_001',
  userRole: 'candidate',
  roleData: { /* 角色详细数据 */ }
}

// 未注册用户
{
  registered: false,
  openid: 'wx_xxx',
  sceneParams: { /* 场景参数 */ }
}
```

**实现代码**：
```javascript
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { sceneParams } = event;

  // 1. 查询用户是否已注册
  const userRecord = await db.collection('users')
    .where({ openid: OPENID })
    .get();

  if (userRecord.data.length > 0) {
    // 已注册，返回角色信息
    const user = userRecord.data[0];
    return {
      registered: true,
      userId: user._id,
      userRole: user.role_type,
      roleData: await getRoleData(user.role_type, user.role_id)
    };
  } else {
    // 未注册，返回场景参数用于注册
    return {
      registered: false,
      openid: OPENID,
      sceneParams: sceneParams
    };
  }
};

// 获取角色详细数据
async function getRoleData(roleType, roleId) {
  switch (roleType) {
    case 'candidate':
      return await db.collection('candidates').doc(roleId).get();
    case 'streamer':
      return await db.collection('streamers').doc(roleId).get();
    case 'agent':
      return await db.collection('agents').doc(roleId).get();
    case 'scout_external':
      return await db.collection('scouts').doc(roleId).get();
    default:
      return null;
  }
}
```

---

### 2. 检查用户是否存在

**云函数名称**：`checkUser`

**功能**：检查指定 openid 的用户是否已注册

**请求参数**：
```javascript
{
  openId: 'wx_xxx'
}
```

**返回数据**：
```javascript
{
  exists: true,
  user: {
    _id: 'user_001',
    role: 'candidate',
    // ... 其他用户信息
  }
}
```

**实现代码**：
```javascript
// cloudfunctions/checkUser/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { openId } = event;

  const userRecord = await db.collection('users')
    .where({ openId: openId })
    .get();

  if (userRecord.data.length > 0) {
    return {
      exists: true,
      user: userRecord.data[0]
    };
  } else {
    return {
      exists: false
    };
  }
};
```

---

### 3. 获取用户信息

**云函数名称**：`getUserInfo`

**功能**：获取当前登录用户的完整信息

**请求参数**：无（自动获取 OPENID）

**返回数据**：
```javascript
{
  success: true,
  user: {
    _id: 'user_001',
    openId: 'wx_xxx',
    role: 'candidate',
    profile: { /* 个人资料 */ },
    candidateInfo: { /* 候选人信息 */ }
  }
}
```

**实现代码**：
```javascript
// cloudfunctions/getUserInfo/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    const userRecord = await db.collection('users')
      .where({ openId: OPENID })
      .get();

    if (userRecord.data.length === 0) {
      throw new Error('用户不存在');
    }

    return {
      success: true,
      user: userRecord.data[0]
    };

  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};
```

---

## 权限验证 API

### 4. 检查权限

**云函数名称**：`checkPermission`

**功能**：检查用户是否有权限访问特定资源

**请求参数**：
```javascript
{
  resource: 'streamer_data',  // 资源类型
  action: 'read',             // 操作类型：read / write / delete
  resourceId: 'streamer_001'  // 资源ID（可选）
}
```

**返回数据**：
```javascript
{
  hasPermission: true
}
```

**实现代码**：
```javascript
// cloudfunctions/checkPermission/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { resource, action, resourceId } = event;

  try {
    // 1. 获取用户角色
    const user = await db.collection('users')
      .where({ openid: OPENID })
      .get();

    if (user.data.length === 0) {
      throw new Error('用户不存在');
    }

    const { role_type, role_id } = user.data[0];

    // 2. 检查资源访问权限
    const hasPermission = await checkRolePermission(
      role_type,
      resource,
      action,
      role_id,
      resourceId
    );

    return {
      hasPermission: hasPermission
    };

  } catch (err) {
    return {
      hasPermission: false,
      error: err.message
    };
  }
};

// 示例：经纪人只能查看名下主播的数据
async function checkRolePermission(roleType, resource, action, roleId, resourceId) {
  if (roleType === 'agent' && resource === 'streamer_data') {
    // 验证该主播是否归属于该经纪人
    const streamer = await db.collection('streamers')
      .where({
        _id: resourceId,
        agent_id: roleId
      })
      .count();

    return streamer.total > 0;
  }

  // 其他角色权限规则...
  return false;
}
```

---

## 用户注册 API

### 5. 创建候选人账号

**云函数名称**：`createCandidate`

**功能**：候选人报名时创建账号

**请求参数**：
```javascript
{
  formData: {
    basicInfo: {
      name: '张三',
      phone: '13800138000',
      // ... 其他信息
    },
    // ... 其他表单数据
  },
  scoutCode: 'SC-EXT-20250102-A3B9'  // 可选
}
```

**返回数据**：
```javascript
{
  success: true,
  userId: 'user_001'
}
```

**实现代码**：
```javascript
// cloudfunctions/createCandidate/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { formData, scoutCode } = event;

  try {
    // 1. 验证推荐码（如果有）
    let scoutInfo = null;
    if (scoutCode) {
      const scout = await db.collection('scouts')
        .where({ code: scoutCode, status: 'active' })
        .get();

      if (scout.data.length === 0) {
        throw new Error('推荐码无效或已失效');
      }
      scoutInfo = scout.data[0];
    }

    // 2. 检查用户是否已存在
    const existingUser = await db.collection('users')
      .where({ openId: OPENID })
      .get();

    if (existingUser.data.length > 0) {
      throw new Error('该微信账号已注册');
    }

    // 3. 创建用户账号（role=candidate）
    const userResult = await db.collection('users').add({
      data: {
        openId: OPENID,
        userType: 'candidate',
        role: 'candidate',

        candidateInfo: {
          status: 'pending', // 待审核
          source: scoutCode ? 'scout_referral' : 'self_apply',
          applyData: formData,
          applyAt: new Date()
        },

        accountStatus: {
          isActivated: true,
          isFirstLogin: false,
          isProfileComplete: true
        },

        profile: {
          name: formData.basicInfo.name,
          phone: formData.basicInfo.phone
        },

        createdAt: new Date()
      }
    });

    // 4. 记录推荐关系（如果有）
    if (scoutInfo) {
      await db.collection('referral_records').add({
        data: {
          userId: userResult._id,
          scoutId: scoutInfo._id,
          scoutCode: scoutCode,
          referredAt: new Date(),
          status: 'pending',
          commissionRate: 0.05
        }
      });
    }

    return { success: true, userId: userResult._id };

  } catch (err) {
    console.error('创建候选人失败', err);
    return {
      success: false,
      error: err.message
    };
  }
};
```

---

## 安全相关 API

### 6. 防重复注册检查

**云函数名称**：`checkDuplicateRegistration`

**功能**：检查用户是否已注册

**请求参数**：
```javascript
{
  phone: '13800138000',
  roleType: 'candidate'
}
```

**返回数据**：
```javascript
{
  isDuplicate: false
}
```

**实现代码**：
```javascript
// cloudfunctions/checkDuplicateRegistration/index.js
async function checkDuplicateRegistration(openid, phone, roleType) {
  // 1. 检查 openid 是否已注册
  const existByOpenid = await db.collection('users')
    .where({ openid })
    .count();

  if (existByOpenid.total > 0) {
    throw new Error('该微信账号已注册，一个微信账号只能绑定一个身份');
  }

  // 2. 检查手机号是否已被使用（仅候选人和星探）
  if (roleType === 'candidate' || roleType === 'scout_external') {
    const existByPhone = await db.collection('candidates')
      .where({ phone })
      .count();

    if (existByPhone.total > 0) {
      throw new Error('该手机号已被注册');
    }
  }

  return { isDuplicate: false };
}
```

---

## 下一步阅读

- [角色管理 API](./role-api.md) - 角色升级和权限管理
- [邀请码 API](./invite-code-api.md) - 邀请码和推荐码管理
- [登录流程设计](../workflows/login-flow.md) - 完整登录流程

---

**文档版本**: v1.0
**最后更新**: 2025-11-05
**维护者**: 技术团队
