# 邀请码和分享码 API

> 员工邀请码、星探分享码相关的云函数接口

**创建日期**: 2025-11-05
**最后更新**: 2026-03-13
**维护者**: 技术团队
**源文档**: multi-role-system.md
**版本**: v2.0

---

## 相关文档
- [返回业务文档中心](../README.md)
- [员工入职流程](../workflows/employee-onboarding.md)
- [星探推荐流程](../workflows/scout-referral.md)

---

## 员工邀请码 API

### 1. 生成邀请码

**云函数名称**：`generateInviteCode`

**功能**：HR生成员工邀请码

**权限要求**：hr_admin 或 super_admin

**请求参数**：
```javascript
{
  roleType: 'agent',
  employeeName: '李经理'
}
```

**返回数据**：
```javascript
{
  success: true,
  inviteCode: 'INV-AG-20250102-B3K8',
  qrCodeBuffer: Buffer  // 小程序码图片
}
```

**实现代码**：
```javascript
// cloudfunctions/generateInviteCode/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { roleType, employeeName } = event;

  try {
    // 1. 验证调用者权限
    const caller = await db.collection('users')
      .where({ openid: OPENID })
      .get();

    if (!['hr_admin', 'super_admin'].includes(caller.data[0].role_type)) {
      throw new Error('无权限生成邀请码');
    }

    // 2. 生成唯一邀请码
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const rolePrefix = roleType.split('_')[0].toUpperCase();
    const inviteCode = `INV-${rolePrefix}-${timestamp}-${random}`;

    // 3. 保存到数据库
    await db.collection('invite_codes').add({
      data: {
        code: inviteCode,
        role_type: roleType,
        employee_name: employeeName,
        created_by: caller.data[0]._id,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        used: false,
        used_by: null,
        used_at: null
      }
    });

    // 4. 生成小程序码
    const qrCodeResult = await cloud.openapi.wxacode.getUnlimited({
      scene: `invite_code=${inviteCode}`,
      page: 'pages/auth/login/login'
    });

    return {
      success: true,
      inviteCode: inviteCode,
      qrCodeBuffer: qrCodeResult.buffer
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

### 2. 验证邀请码

**云函数名称**：`verifyInviteCode`

**功能**：验证邀请码是否有效

**请求参数**：
```javascript
{
  inviteCode: 'INV-HR-20250102-X7Y9'
}
```

**返回数据**：
```javascript
{
  valid: true,
  inviteInfo: {
    role_type: 'hr_admin',
    employee_name: '张三',
    expires_at: '2025-01-09'
  }
}
```

**实现代码**：
```javascript
// cloudfunctions/verifyInviteCode/index.js
async function verifyInviteCode(code) {
  const invite = await db.collection('invite_codes')
    .where({ code })
    .get();

  // 检查1: 邀请码是否存在
  if (invite.data.length === 0) {
    throw new Error('邀请码不存在');
  }

  const inviteData = invite.data[0];

  // 检查2: 是否已使用
  if (inviteData.used) {
    throw new Error('该邀请码已被使用');
  }

  // 检查3: 是否过期
  if (new Date() > new Date(inviteData.expires_at)) {
    throw new Error('邀请码已过期');
  }

  return {
    valid: true,
    inviteInfo: inviteData
  };
}
```

---

### 3. 绑定员工信息

**云函数名称**：`bindEmployee`

**功能**：使用邀请码绑定员工openid

**请求参数**：
```javascript
{
  inviteCode: 'INV-HR-20250102-X7Y9',
  phone: '13800138000',
  realName: '张三'
}
```

**返回数据**：
```javascript
{
  success: true,
  employeeId: 'emp_001',
  roleType: 'hr_admin'
}
```

**实现代码**：
```javascript
// cloudfunctions/bindEmployee/index.js
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { inviteCode, phone, realName } = event;

  try {
    // 1. 验证邀请码
    const invite = await db.collection('invite_codes')
      .where({
        code: inviteCode,
        used: false,
        expires_at: db.command.gt(new Date())
      })
      .get();

    if (invite.data.length === 0) {
      throw new Error('邀请码无效或已过期');
    }

    // 2. 检查手机号是否已预登记
    const employee = await db.collection('employees')
      .where({
        phone: phone,
        status: 'pending_bind'
      })
      .get();

    if (employee.data.length === 0) {
      throw new Error('该手机号未在系统中预登记');
    }

    const employeeData = employee.data[0];

    // 3. 验证姓名和角色
    if (employeeData.real_name !== realName) {
      throw new Error('姓名不匹配');
    }

    if (employeeData.role_type !== invite.data[0].role_type) {
      throw new Error('邀请码与职位不匹配');
    }

    // 4. 绑定 openid
    await db.collection('employees').doc(employeeData._id).update({
      data: {
        openid: OPENID,
        status: 'active',
        bound_at: new Date()
      }
    });

    // 5. 创建用户记录
    await db.collection('users').add({
      data: {
        openid: OPENID,
        role_type: employeeData.role_type,
        role_id: employeeData._id,
        created_at: new Date()
      }
    });

    // 6. 标记邀请码已使用
    await db.collection('invite_codes').doc(invite.data[0]._id).update({
      data: {
        used: true,
        used_by: employeeData._id,
        used_at: new Date()
      }
    });

    return {
      success: true,
      employeeId: employeeData._id,
      roleType: employeeData.role_type
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

### 4. 作废邀请码

**云函数名称**：`revokeInviteCode`

**功能**：HR作废未使用的邀请码

**权限要求**：hr_admin

**请求参数**：
```javascript
{
  codeId: 'invite_code_001'
}
```

---

## 星探分享码 API

> 星探体系已从分销模式改为直营模式（2026-03-13），采用审核准入制和三级等级体系（新锐/特约/合伙人），详见 [星探推荐流程](../workflows/scout-referral.md)。

### 5. 星探申请注册

**云函数名称**：`applyScout`

**功能**：提交星探申请（需管理员审核）

**请求参数**：
```javascript
{
  name: '王推荐',
  phone: '13700137000',
  idCard: '110101199001011234',
  reason: '有丰富的主播资源' // 必填：申请理由
}
```

**返回数据**：
```javascript
{
  success: true,
  scoutId: 'scout_003',
  status: 'pending' // 待审核
}
```

---

### 6. 生成分享码

**云函数名称**：`generateShareCode`

**功能**：审核通过后为星探生成专属分享码（系统自动调用）

**实现代码**：
```javascript
// cloudfunctions/generateShareCode/index.js
exports.main = async (event, context) => {
  const { scoutId } = event;

  try {
    // 1. 生成分享码
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const shareCode = `SC-EXT-${date}-${random}`;

    // 2. 更新星探记录
    await db.collection('scouts')
      .doc(scoutId)
      .update({
        data: {
          shareCode: shareCode,
          status: 'active',
          grade: 'rookie' // 初始等级：新锐
        }
      });

    return {
      success: true,
      shareCode: shareCode
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

### 7. 获取推荐记录

**云函数名称**：`getScoutReferrals`

**功能**：获取星探的推荐记录

**请求参数**：
```javascript
{
  filter: 'all'  // all / pending / signed / rejected
}
```

**返回数据**：
```javascript
{
  success: true,
  referrals: [
    {
      _id: 'ref_001',
      candidate_name: '张三',
      referred_at: '2025-01-05',
      status: 'signed',
      anchorLevel: 'A', // 主播定级
      lifecycleStage: 'nurturing', // 生命周期阶段
      commission: {
        signBonus: 300, // 按等级×定级计算
        monthlyTotal: 450,
        total_commission: 750,
        paid_commission: 750
      }
    }
  ],
  scoutGrade: 'rookie', // 当前星探等级
  upgradeProgress: { current: 3, next: 5, nextGrade: 'special' }
}
```

---

### 8. 获取佣金明细

**云函数名称**：`getScoutCommissions`

**功能**：获取星探的佣金明细（差异化佣金）

**返回数据**：
```javascript
{
  success: true,
  commissions: [
    {
      type: 'sign_bonus',
      amount: 300, // 按星探等级×主播定级计算
      scoutGrade: 'rookie',
      anchorLevel: 'A',
      status: 'paid',
      created_at: '2026-01-20'
    },
    {
      type: 'monthly_commission',
      amount: 300, // 按星探等级×生命周期阶段计算
      scoutGrade: 'rookie',
      lifecycleStage: 'nurturing',
      rate: 0.03, // 新锐×培养期 = 3%
      month: '2026-02',
      status: 'paid',
      created_at: '2026-03-01'
    }
  ],
  total: 18500,
  paid: 15000,
  pending: 3500
}
```

---

### 9. 提现申请

**云函数名称**：`submitWithdrawRequest`

**功能**：星探申请提现

**请求参数**：
```javascript
{
  amount: 1000
}
```

**返回数据**：
```javascript
{
  success: true,
  requestId: 'withdraw_001'
}
```

---

## 安全机制

### 防止暴力破解

```javascript
// 限制邀请码验证次数
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_DURATION = 30 * 60 * 1000; // 30分钟

async function checkVerifyAttempts(openid) {
  const key = `invite_verify:${openid}`;
  const attempts = await getAttemptCount(key);

  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error('验证次数过多，请在30分钟后重试');
  }

  await incrementAttemptCount(key, LOCK_DURATION);
}
```

### 推荐频率限制

```javascript
// 检查推荐频率
async function checkRecommendFrequency(scoutId) {
  const today = new Date().toISOString().split('T')[0];

  const count = await db.collection('referral_records')
    .where({
      scout_id: scoutId,
      referred_at: db.command.gte(new Date(today))
    })
    .count();

  if (count.total >= 10) {
    throw new Error('今日推荐次数已达上限（10人/天）');
  }
}
```

---

## 下一步阅读

- [员工入职流程](../workflows/employee-onboarding.md) - 邀请码使用流程
- [星探推荐流程](../workflows/scout-referral.md) - 分享码和差异化佣金机制
- [认证 API](./auth-api.md) - 登录认证接口

---

**文档版本**: v2.0
**最后更新**: 2026-03-13
**维护者**: 技术团队
