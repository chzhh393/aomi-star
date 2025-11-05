# 📚 Aomi Star 项目核心知识库

> 本文档包含项目的核心架构、设计理念和关键技术机制。AI 助手首次接触项目时应优先阅读此文档。

**创建日期**: 2025-11-05
**最后更新**: 2025-11-05
**维护者**: 开发团队

---

## 目录

- [系统架构](#系统架构)
- [核心数据模型](#核心数据模型)
- [多角色系统设计](#多角色系统设计)
- [关键技术机制](#关键技术机制)
- [集成点说明](#集成点说明)
- [技术决策记录](#技术决策记录)

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      微信小程序客户端                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  候选人工作台  │  │  主播工作台   │  │  员工工作台   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────┴────────┐                       │
│                    │  场景参数路由   │                       │
│                    │  角色识别系统   │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼──────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  微信云开发后端  │
                    │                  │
                    │  ┌────────────┐ │
                    │  │  云函数层   │ │
                    │  └─────┬──────┘ │
                    │        │         │
                    │  ┌─────┴──────┐ │
                    │  │  云数据库   │ │
                    │  └────────────┘ │
                    └─────────────────┘
```

### 技术栈

**前端**：
- 微信小程序原生框架
- WXML + WXSS + JavaScript
- CustomTabBar（动态 TabBar）

**后端**：
- 微信云开发（Serverless）
- 云函数（Node.js）
- 云数据库（MongoDB）
- 云存储

**开发工具**：
- 微信开发者工具
- Git 版本控制

### 架构特点

1. **前后端一体化**：使用微信云开发，无需单独的后端服务器
2. **Serverless 架构**：云函数按需执行，自动扩缩容
3. **数据库即服务**：云数据库无需维护，自动备份
4. **安全隔离**：云函数运行在隔离环境，数据库权限严格控制

---

## 核心数据模型

### 用户数据结构

```javascript
// 用户表（users collection）
{
  _id: "user_xxx",
  _openid: "微信OpenID",           // 微信用户唯一标识
  role: "candidate",               // 用户角色
  nickname: "张三",                // 昵称
  avatar: "https://...",           // 头像
  phone: "13800138000",            // 手机号
  status: "active",                // 账号状态
  createdAt: "2025-11-05T10:00:00Z",
  updatedAt: "2025-11-05T10:00:00Z",

  // 角色特定数据
  roleData: {
    // 候选人专属数据
    candidateInfo: {
      applicationStatus: "pending",  // 申请状态
      interviewDate: null,           // 面试日期
      ...
    },

    // 主播专属数据
    streamerInfo: {
      agentId: "agent_xxx",          // 经纪人ID
      teamId: "team_xxx",            // 团队ID
      ...
    },

    // 员工专属数据
    employeeInfo: {
      employeeRole: "hr_admin",      // 员工角色类型
      department: "HR",              // 部门
      ...
    }
  }
}
```

### 角色类型定义

```javascript
// 角色枚举
const UserRole = {
  CANDIDATE: 'candidate',           // 候选人
  STREAMER: 'streamer',             // 主播

  // 内部员工（9种）
  HR_ADMIN: 'hr_admin',             // HR管理员
  AGENT: 'agent',                   // 经纪人
  OPERATOR: 'operator',             // 运营专员
  DANCE_TEACHER: 'dance_teacher',   // 舞蹈培训师
  MAKEUP_ARTIST: 'makeup_artist',   // 化妆师
  STYLIST: 'stylist',               // 搭配师
  SCOUT_INTERNAL: 'scout_internal', // 内部星探
  FINANCE: 'finance',               // 财务专员
  VIDEOGRAPHER: 'videographer',     // 摄像师

  // 外部合作
  SCOUT_EXTERNAL: 'scout_external'  // 外部星探
};

// 角色状态
const UserStatus = {
  ACTIVE: 'active',        // 激活
  INACTIVE: 'inactive',    // 未激活
  SUSPENDED: 'suspended',  // 暂停
  DELETED: 'deleted'       // 已删除
};
```

### 邀请码数据模型

```javascript
// 邀请码表（invite_codes collection）
{
  _id: "invite_xxx",
  code: "INVITE2025",              // 邀请码
  type: "employee",                // 类型：employee/scout
  targetRole: "hr_admin",          // 目标角色
  createdBy: "admin_xxx",          // 创建者
  usedBy: null,                    // 使用者（null=未使用）
  usedAt: null,                    // 使用时间
  expiresAt: "2025-12-31T23:59:59Z", // 过期时间
  maxUses: 1,                      // 最大使用次数（-1=无限）
  currentUses: 0,                  // 当前使用次数
  status: "active",                // 状态：active/used/expired
  createdAt: "2025-11-05T10:00:00Z"
}
```

### 推荐码数据模型

```javascript
// 推荐码表（referral_codes collection）
{
  _id: "ref_xxx",
  code: "REF2025",                 // 推荐码
  scoutId: "scout_xxx",            // 星探ID
  scoutType: "external",           // 星探类型：internal/external
  referredCandidates: [            // 推荐的候选人列表
    {
      candidateId: "user_xxx",
      referredAt: "2025-11-05T10:00:00Z",
      status: "pending",            // pending/signed/rejected
      commission: 0                 // 佣金
    }
  ],
  totalCommission: 0,              // 总佣金
  createdAt: "2025-11-05T10:00:00Z"
}
```

---

## 多角色系统设计

### 角色分类体系

#### 四大用户类型

```
系统用户
├── 1. 主播候选人（Candidate）
│   └── 状态流转：pending → reviewing → interviewed → offered → signed
│
├── 2. 主播（Streamer）
│   └── 已签约的正式主播
│
├── 3. 内部员工（Employee）
│   ├── HR管理员 - 候选人管理、面试安排
│   ├── 经纪人 - 团队管理、周报复盘
│   ├── 运营专员 - 排班管理、数据监控
│   ├── 舞蹈培训师 - 舞蹈训练、考核评估
│   ├── 化妆师 - 妆容设计、形象指导
│   ├── 搭配师 - 造型设计、服装搭配
│   ├── 内部星探 - 主播招募、候选人筛选
│   ├── 财务专员 - 收益结算、发放管理
│   └── 摄像师 - 面试录制、视频管理
│
└── 4. 外部星探（External Scout）
    └── 外部合作推荐人，推荐候选人获得佣金
```

### 角色权限矩阵

| 功能模块 | 候选人 | 主播 | HR | 经纪人 | 运营 | 外部星探 |
|---------|--------|------|-----|--------|------|---------|
| 提交报名表 | ✅ | - | - | - | - | - |
| 查看面试状态 | ✅ | - | - | - | - | - |
| 查看排班 | - | ✅ | - | ✅ | ✅ | - |
| 管理候选人 | - | - | ✅ | - | - | - |
| 安排面试 | - | - | ✅ | - | - | - |
| 团队管理 | - | - | - | ✅ | - | - |
| 排班管理 | - | - | - | - | ✅ | - |
| 推荐候选人 | - | - | - | - | - | ✅ |
| 查看佣金 | - | - | - | - | - | ✅ |

### 角色升级机制

```
候选人生命周期：
扫码/搜索进入
    ↓
微信授权登录
    ↓
填写报名表
    ↓
创建账号（role = candidate）
    ↓
状态流转：
  - pending（待审核）
  - reviewing（审核中）
  - interviewed（已面试）
  - offered（已发offer）
    ↓
签约成功
    ↓
角色升级：candidate → streamer
```

---

## 关键技术机制

### 场景参数路由系统

#### 工作原理

微信小程序支持通过场景值（scene）传递参数，系统利用此机制实现智能路由：

```javascript
// app.js - 启动时解析场景参数
App({
  onLaunch(options) {
    const scene = options.scene;       // 场景值
    const query = options.query;       // 查询参数
    const referrerInfo = options.referrerInfo; // 来源信息

    // 解析场景参数
    this.parseSceneParams(scene, query);
  },

  parseSceneParams(scene, query) {
    // 1. 邀请码场景
    if (query.inviteCode) {
      // 验证邀请码 → 引导员工注册
      this.handleInviteCode(query.inviteCode);
    }

    // 2. 推荐码场景
    if (query.refCode) {
      // 验证推荐码 → 引导候选人报名
      this.handleReferralCode(query.refCode);
    }

    // 3. 直接搜索/扫码
    if (!query.inviteCode && !query.refCode) {
      // 默认进入候选人报名流程
      this.handleDirectEntry();
    }
  }
});
```

#### 支持的场景

| 场景 | 参数 | 目标用户 | 流程 |
|------|------|---------|------|
| 邀请码扫码 | `?inviteCode=INVITE2025` | 内部员工 | 验证邀请码 → 员工注册 |
| 推荐码扫码 | `?refCode=REF2025` | 候选人 | 验证推荐码 → 候选人报名 |
| 直接搜索 | 无参数 | 候选人 | 直接进入候选人报名 |
| 分享转发 | 携带分享者信息 | 根据分享者角色决定 |

### 智能工作台切换

#### CustomTabBar 实现

```javascript
// custom-tab-bar/index.js
Component({
  data: {
    role: '',      // 当前角色
    tabList: []    // TabBar 配置
  },

  lifetimes: {
    attached() {
      // 根据用户角色动态生成 TabBar
      const userRole = getApp().globalData.userRole;
      const tabConfig = this.getTabConfigByRole(userRole);
      this.setData({
        role: userRole,
        tabList: tabConfig
      });
    }
  },

  methods: {
    getTabConfigByRole(role) {
      const tabConfigs = {
        // 候选人 TabBar
        candidate: [
          { text: '我的申请', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/candidate/home' },
          { text: '面试通知', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/candidate/interview' }
        ],

        // 主播 TabBar
        streamer: [
          { text: '我的排班', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/anchor/schedule' },
          { text: '培训任务', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/anchor/training' },
          { text: '我的数据', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/anchor/stats' }
        ],

        // HR TabBar
        hr_admin: [
          { text: '候选人', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/hr/candidates' },
          { text: '面试安排', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/hr/interviews' },
          { text: '合同管理', iconPath: '...', selectedIconPath: '...', pagePath: '/pages/hr/contracts' }
        ]

        // ... 其他角色配置
      };

      return tabConfigs[role] || tabConfigs.candidate;
    }
  }
});
```

### 角色识别与鉴权

#### 用户身份验证流程

```
小程序启动
    ↓
调用 wx.cloud.callFunction({name: 'login'})
    ↓
云函数通过 context.openid 识别用户
    ↓
查询数据库获取用户信息和角色
    ↓
返回用户信息（包含 role）
    ↓
根据 role 加载对应工作台
    ↓
CustomTabBar 根据 role 显示对应导航
```

#### 权限检查机制

```javascript
// 云函数中的权限检查
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 1. 获取用户信息
  const user = await db.collection('users')
    .where({ _openid: openid })
    .getOne();

  // 2. 检查角色权限
  const requiredRole = 'hr_admin';
  if (user.role !== requiredRole) {
    return {
      success: false,
      error: '权限不足'
    };
  }

  // 3. 执行业务逻辑
  // ...
};
```

---

## 集成点说明

### 微信授权登录

**流程**：
1. 小程序调用 `wx.getUserProfile()` 获取用户信息（昵称、头像）
2. 调用 `wx.cloud.callFunction({name: 'login'})` 登录
3. 云函数通过 `context.openid` 识别用户
4. 查询数据库判断用户是否已注册
5. 已注册 → 返回用户信息 → 跳转工作台
6. 未注册 → 引导注册流程

**关键代码位置**：
- 前端：`miniprogram/pages/index/login.js`
- 云函数：`cloudfunctions/login/index.js`

### 云函数调用

**统一调用封装**：

```javascript
// miniprogram/utils/cloud.js
export async function callCloudFunction(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({
      name: name,
      data: data
    });

    if (res.result.success) {
      return res.result.data;
    } else {
      throw new Error(res.result.error || '操作失败');
    }
  } catch (error) {
    console.error(`云函数 ${name} 调用失败:`, error);
    wx.showToast({
      title: error.message || '网络错误',
      icon: 'none'
    });
    throw error;
  }
}
```

### 云数据库操作

**最佳实践**：
- ✅ 前端只做读取操作（受权限限制）
- ✅ 所有写操作通过云函数完成
- ✅ 云函数中使用管理员权限操作数据库
- ✅ 严格的权限校验

**数据库权限配置**：
```json
{
  "read": true,       // 允许用户读取自己的数据
  "write": false      // 禁止直接写入，必须通过云函数
}
```

---

## 技术决策记录

### 为什么选择微信云开发？

**优势**：
1. **快速开发**：无需搭建后端服务器，专注业务逻辑
2. **免运维**：自动扩容、自动备份、无需担心服务器管理
3. **原生集成**：与微信小程序深度集成，调用简单
4. **成本低**：按量付费，初期成本极低
5. **安全性**：云函数运行在隔离环境，数据库权限严格控制

**劣势**：
1. 供应商锁定（仅微信生态）
2. 调试相对不便（需要上传云函数）
3. 性能受限（冷启动时间）

### 为什么使用 CustomTabBar？

**原因**：
1. **动态切换**：不同角色需要不同的 TabBar
2. **灵活定制**：可以完全自定义样式和交互
3. **权限控制**：根据角色显示/隐藏特定功能

**实现成本**：
- 需要手动管理 TabBar 状态
- 每个页面需要同步 active 状态

### 为什么使用邀请码机制？

**原因**：
1. **安全控制**：防止随意注册员工账号
2. **身份验证**：确保员工身份真实
3. **角色分配**：通过邀请码指定员工角色
4. **审计追踪**：记录谁邀请了谁

### 为什么候选人也创建账号？

**原因**：
1. **状态追踪**：候选人需要实时查看申请进度
2. **通知推送**：面试通知需要推送到候选人
3. **数据完整性**：统一的用户数据模型
4. **升级机制**：签约后直接升级为主播，无需重新注册

---

## 数据流示意图

### 候选人注册流程

```
候选人扫码/搜索小程序
    ↓
是否携带推荐码？
    ├─ 是 → 验证推荐码（关联星探）
    └─ 否 → 直接进入
    ↓
微信授权（获取 openid）
    ↓
填写报名表
    ↓
调用云函数 createCandidate
    ↓
创建 users 记录（role=candidate）
    ↓
如有推荐码，更新推荐记录
    ↓
返回候选人工作台
```

### 员工注册流程

```
员工扫描邀请码
    ↓
解析邀请码参数
    ↓
调用云函数 verifyInviteCode
    ↓
验证邀请码有效性
    ├─ 无效 → 提示错误
    └─ 有效 → 继续
    ↓
微信授权（获取 openid）
    ↓
填写员工信息
    ↓
调用云函数 createEmployee
    ↓
创建 users 记录（role=hr_admin 等）
    ↓
标记邀请码已使用
    ↓
返回员工工作台
```

---

## 关键文件位置

### 前端核心文件

- **登录入口**：`miniprogram/pages/index/login.js`
- **场景参数解析**：`miniprogram/utils/scene-parser.js`
- **角色管理**：`miniprogram/utils/role-manager.js`
- **CustomTabBar**：`miniprogram/custom-tab-bar/index.js`
- **全局配置**：`miniprogram/app.js`、`miniprogram/app.json`

### 云函数核心

- **登录**：`cloudfunctions/login/index.js`
- **用户管理**：`cloudfunctions/user-info/index.js`
- **邀请码验证**：`cloudfunctions/verify-invite-code/index.js`
- **推荐码验证**：`cloudfunctions/verify-referral-code/index.js`

### 数据库集合

- **users**：用户表
- **invite_codes**：邀请码表
- **referral_codes**：推荐码表
- **applications**：候选人申请表
- **interviews**：面试记录表

---

## 下一步阅读

完成本文档阅读后，根据开发任务查阅：

- **业务流程详解** → [@docs/guides/business/workflows/](./guides/business/workflows/)
- **API 文档** → [@docs/guides/business/api/](./guides/business/api/)
- **开发规范** → [@docs/guides/development/code-standards.md](./guides/development/code-standards.md)
- **问题排查** → [@docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**文档维护说明**：
- 新增核心数据模型时，更新"核心数据模型"部分
- 新增角色类型时，更新"多角色系统设计"部分
- 重要技术决策时，添加到"技术决策记录"部分
- 架构变更时，更新"系统架构"部分

> 💡 **重要**：本文档是项目的核心知识库，应保持更新。任何重大架构或设计变更都应该在此记录。
