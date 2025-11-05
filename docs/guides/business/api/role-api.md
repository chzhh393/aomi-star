# 角色管理 API

> 角色升级、权限检查相关的云函数接口

**创建日期**: 2025-11-05
**最后更新**: 2025-11-05
**维护者**: 技术团队
**源文档**: multi-role-system.md

---

## 相关文档
- [返回业务文档中心](../README.md)
- [角色升级机制](../architecture/upgrade-mechanism.md)
- [认证 API](./auth-api.md)

---

## 角色升级 API

### 1. 确认合同签署（触发角色升级）

**云函数名称**：`confirmContract`

**功能**：HR确认合同签署完成后，自动将候选人升级为主播

**请求参数**：
```javascript
{
  userId: 'user_001',
  contractId: 'contract_001'
}
```

**返回数据**：
```javascript
{
  success: true,
  newRole: 'streamer'
}
```

**实现代码**：
```javascript
// cloudfunctions/confirmContract/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId, contractId } = event;

  try {
    // 1. 验证合同状态
    const contract = await db.collection('contracts')
      .doc(contractId)
      .get();

    if (contract.data.status !== 'signed') {
      throw new Error('合同尚未签署');
    }

    // 2. 更新用户角色
    await db.collection('users').doc(userId).update({
      data: {
        role: 'streamer', // 从 candidate 升级为 streamer
        roleUpgradedAt: new Date(),

        // 保留候选人信息作为历史记录
        candidateHistory: {
          appliedAt: _.get('candidateInfo.applyAt'),
          source: _.get('candidateInfo.source'),
          scoutCode: _.get('candidateInfo.scoutCode'),
          upgradedAt: new Date()
        },

        // 初始化主播信息
        streamerInfo: {
          status: 'onboarding',
          stageLevel: 'trainee',
          agentId: contract.data.agentId,
          contractId: contractId,
          joinedAt: new Date(),
          totalLiveHours: 0,
          totalIncome: 0,
          followerCount: 0
        }
      }
    });

    // 3. 如果有星探推荐，更新推荐状态为"已转化"
    if (contract.data.scoutCode) {
      await db.collection('referral_records')
        .where({
          userId: userId,
          scoutCode: contract.data.scoutCode
        })
        .update({
          data: {
            status: 'converted',
            convertedAt: new Date(),
            contractId: contractId
          }
        });
    }

    // 4. 发送通知
    // ... 发送模板消息代码

    return { success: true, newRole: 'streamer' };

  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};
```

---

### 2. 回退角色

**云函数名称**：`rollbackRole`

**功能**：HR回退用户角色（从主播回退到候选人）

**权限要求**：hr_admin 或 super_admin

**请求参数**：
```javascript
{
  userId: 'user_001',
  reason: '合同签署错误'
}
```

**返回数据**：
```javascript
{
  success: true
}
```

**实现代码**：
```javascript
// cloudfunctions/rollbackRole/index.js
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { userId, reason } = event;

  try {
    // 验证权限
    const caller = await db.collection('users')
      .where({ openid: OPENID })
      .get();

    if (!['hr_admin', 'super_admin'].includes(caller.data[0].role_type)) {
      throw new Error('无权限执行此操作');
    }

    // 回退角色
    await db.collection('users').doc(userId).update({
      data: {
        role: 'candidate',
        candidateInfo: _.get('candidateHistory'),
        streamerInfo: _.remove(),
        roleChangeLog: _.push({
          from: 'streamer',
          to: 'candidate',
          reason: reason,
          operator: caller.data[0]._id,
          operatedAt: new Date()
        })
      }
    });

    return { success: true };

  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};
```

---

## 权限检查 API

### 3. 获取角色数据

**云函数名称**：`getRoleData`

**功能**：根据角色类型和ID获取角色详细数据

**请求参数**：
```javascript
{
  roleType: 'agent',
  roleId: 'agent_001'
}
```

**返回数据**：
```javascript
{
  success: true,
  data: { /* 角色详细数据 */ }
}
```

---

### 4. 验证角色权限

**云函数名称**：`checkRolePermission`

**功能**：检查角色是否有权限执行特定操作

**实现代码**：
```javascript
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

  // HR 可以查看所有候选人
  if (roleType === 'hr_admin' && resource === 'candidate_data') {
    return true;
  }

  // 主播只能查看自己的数据
  if (roleType === 'streamer' && resource === 'streamer_data') {
    return resourceId === roleId;
  }

  return false;
}
```

---

## 下一步阅读

- [角色升级机制](../architecture/upgrade-mechanism.md) - 升级流程详解
- [邀请码 API](./invite-code-api.md) - 邀请码管理
- [认证 API](./auth-api.md) - 登录认证

---

**文档版本**: v1.0
**最后更新**: 2025-11-05
**维护者**: 技术团队
