# 📏 Aomi Star 代码规范

> 项目特定的代码约定和风格指南

**创建日期**: 2025-11-01
**最后更新**: 2025-11-05
**维护者**: 开发团队

---

## 🎯 规范概述

本文档定义 **Aomi Star 项目特定** 的代码规范和约定。

**分工说明**：
- 本文档 - 项目特定的约定（命名、文件组织、提交规范）
- [@Skills/miniprogram-dev](../../../.claude/skills/miniprogram-dev/SKILL.md) - 微信小程序开发详细规范（会自动激活）
- [@全局 CLAUDE.md](../../CLAUDE.md) - 通用开发哲学和流程

---

## 📂 项目文件命名约定

### 1. 页面和组件目录

```bash
# ✅ 正确：小写字母 + 连字符
miniprogram/pages/candidate/register-info/
miniprogram/pages/hr/candidate-list/
miniprogram/components/common/user-card/

# ❌ 错误：大驼峰或下划线
miniprogram/pages/candidate/RegisterInfo/
miniprogram/pages/hr/candidate_list/
```

**原因**：
- 微信小程序路径区分大小写，小写可避免路径错误
- 连字符是 Web 标准，便于 URL 使用
- 保持跨平台兼容性

### 2. JavaScript 文件

```bash
# ✅ 正确：小驼峰
miniprogram/utils/roleManager.js
miniprogram/utils/sceneParser.js
miniprogram/services/userApi.js

# ❌ 错误：连字符或下划线
miniprogram/utils/role-manager.js
miniprogram/utils/scene_parser.js
```

**原因**：
- JavaScript 模块导入时不需要引号
- 符合 Node.js 和前端社区惯例
- 与变量命名风格一致

### 3. 云函数目录

```bash
# ✅ 正确：小写字母 + 连字符
cloudfunctions/get-user-info/
cloudfunctions/verify-invite-code/
cloudfunctions/update-candidate-status/

# ❌ 错误：小驼峰或下划线
cloudfunctions/getUserInfo/
cloudfunctions/verify_invite_code/
```

**原因**：
- 云函数名称会出现在 URL 路径中
- 连字符是 RESTful API 的标准约定
- 与页面/组件命名风格统一

### 4. 文档文件

```bash
# ✅ 正确：大写字母 + 下划线（核心文档）
docs/CLAUDE.md
docs/PROJECT_KNOWLEDGE.md
docs/TROUBLESHOOTING.md

# ✅ 正确：小写字母 + 连字符（普通文档）
docs/guides/development/code-standards.md
docs/guides/business/workflows/login-flow.md

# ❌ 错误：混用或空格
docs/Code Standards.md
docs/login_Flow.md
```

**原因**：
- 大写核心文档更醒目，便于识别
- 小写普通文档便于路径引用
- 避免空格导致的路径问题

---

## 🏷️ 变量和函数命名

### 1. 角色相关命名（项目特定）

```javascript
// ✅ 正确：使用完整单词
const currentRole = 'candidate'      // 候选人
const streamerInfo = {}              // 主播
const employeeData = {}              // 员工

// 角色类型常量
const ROLES = {
  CANDIDATE: 'candidate',
  STREAMER: 'anchor',                // 注意：数据库中是 'anchor'
  HR: 'hr',
  AGENT: 'agent',
  OPERATIONS: 'operations',
  TRAINER: 'dance-teacher',          // 注意：使用连字符
  STYLIST: 'stylist',
  MAKEUP_ARTIST: 'makeup-artist',
  PHOTOGRAPHER: 'photographer',
  EXTERNAL_SCOUT: 'external-scout',
  ADMIN: 'admin'
}

// ❌ 错误：使用缩写或不一致
const curRole = 'cand'
const anchorInfo = {}                // 应该用 streamerInfo
const empData = {}
```

**原因**：
- 保持术语一致性（系统统一称"候选人"为 candidate，"主播"为 anchor）
- 避免缩写导致的歧义
- 与数据库字段名称一致

### 2. 页面数据命名

```javascript
Page({
  data: {
    // 用户相关
    currentRole: '',           // 当前角色
    userId: '',                // 用户ID
    userInfo: null,            // 用户信息

    // 页面状态（使用 is/has 前缀）
    isLoading: true,
    isRefreshing: false,
    hasMore: true,
    hasPermission: false,

    // 表单数据（使用 Data 后缀）
    formData: {},
    formErrors: {},

    // 列表数据（使用 List 后缀）
    candidateList: [],
    interviewList: [],

    // UI 状态（使用 show 前缀）
    showModal: false,
    showTips: true,

    // 配置项（统一放在 config 对象中）
    config: {
      autoRefresh: true,
      refreshInterval: 30000
    }
  }
})
```

### 3. 云函数命名

```javascript
// ✅ 正确：动词 + 名词
async function getUserInfo(userId) {}
async function createCandidate(data) {}
async function updateInterviewStatus(interviewId, status) {}
async function deleteReferralCode(codeId) {}
async function verifyInviteCode(code) {}

// ❌ 错误：只有名词或不清晰
async function user(userId) {}
async function candidate(data) {}
async function interview(id) {}
```

---

## 📝 注释规范

### 1. 文件头注释（仅在复杂文件中使用）

```javascript
/**
 * 角色管理工具
 *
 * 提供角色切换、权限检查等功能
 *
 * @file miniprogram/utils/roleManager.js
 * @author 开发团队
 * @date 2025-11-05
 */
```

### 2. 函数注释（公共 API 必须）

```javascript
/**
 * 获取当前用户的角色
 *
 * @returns {Promise<string>} 角色标识（如 'candidate', 'anchor'）
 * @throws {Error} 如果用户未登录
 *
 * @example
 * const role = await roleManager.getCurrentRole()
 * // returns 'candidate'
 */
async function getCurrentRole() {
  // 实现...
}
```

### 3. 代码注释（解释"为什么"）

```javascript
// ✅ 正确：解释原因或意图
// 使用防抖避免频繁的云函数调用，降低费用
const debouncedSearch = debounce(search, 300)

// 必须先检查角色，因为不同角色看到的数据不同
await this.checkUserRole()

// ❌ 错误：重复代码本身的意思
// 声明变量
let count = 0

// 调用函数
getUserInfo()
```

---

## 🗂️ 代码组织

### 1. 页面 JS 文件结构顺序

```javascript
Page({
  // 1. 数据定义（按类型分组）
  data: {
    // 用户相关
    currentRole: '',
    userId: '',

    // 页面状态
    isLoading: true,

    // 列表数据
    candidateList: []
  },

  // 2. 生命周期函数（按调用顺序）
  onLoad(options) {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {},
  onReachBottom() {},
  onShareAppMessage() {},

  // 3. 事件处理方法（按功能分组，组内按字母序）
  // --- 数据加载 ---
  async loadInitialData() {},
  async loadMoreData() {},

  // --- 表单处理 ---
  handleInput(e) {},
  handleSubmit(e) {},
  validateForm(data) {},

  // --- 导航跳转 ---
  navigateToDetail(e) {},
  navigateBack() {},

  // --- 工具方法 ---
  formatDate(date) {},
  showError(message) {}
})
```

### 2. 云函数文件结构

```javascript
// cloudfunctions/[function-name]/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ==================== 主函数 ====================

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()

  try {
    // 1. 参数验证
    // 2. 权限检查
    // 3. 业务逻辑
    // 4. 返回结果
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// ==================== 业务逻辑函数 ====================

async function getData() {}
async function createData() {}
async function updateData() {}
async function checkPermission() {}
```

---

## 🔧 项目特定的配置

### ESLint 配置

```json
{
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "no-console": "off",
    "no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_"
    }]
  },
  "globals": {
    "wx": "readonly",
    "App": "readonly",
    "Page": "readonly",
    "Component": "readonly",
    "getApp": "readonly",
    "getCurrentPages": "readonly"
  }
}
```

---

## 📦 Git 提交规范

### 提交信息格式

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

```bash
feat:     新功能
fix:      修复 Bug
docs:     文档更新
style:    代码格式（不影响代码运行）
refactor: 重构（既不是新功能，也不是修复 Bug）
perf:     性能优化
test:     添加测试
chore:    构建过程或辅助工具变动
```

### Scope 范围（项目特定）

```bash
candidate:  候选人相关
anchor:     主播相关
hr:         HR 相关
agent:      经纪人相关
operations: 运营相关
admin:      管理员相关
scout:      星探相关
auth:       认证登录
cloud:      云函数
utils:      工具函数
docs:       文档
```

### 示例

```bash
# 好的提交信息
feat(candidate): 添加候选人报名表单
fix(auth): 修复微信授权失败的问题
docs(dev): 更新 Dev Docs 使用说明
refactor(cloud): 重构用户信息查询云函数

# 不好的提交信息
update code
fix bug
修改文件
```

---

## 🔗 相关文档

- [微信小程序开发规范 Skill](../../../.claude/skills/miniprogram-dev/SKILL.md) - 详细的小程序开发标准
- [全局开发指南](../../CLAUDE.md) - 通用开发哲学
- [项目知识库](../../PROJECT_KNOWLEDGE.md) - 系统架构和核心概念
- [问题排查指南](../../TROUBLESHOOTING.md) - 常见问题和解决方案

---

**最后更新**: 2025-11-05
**维护者**: 开发团队

> 💡 代码规范是团队协作的基础。详细的技术规范请参考对应的 Skill，它们会在需要时自动激活。
