# 📊 业务文档中心

> 直播公司主播全生命周期管理系统 - 业务文档导航

**创建日期**: 2025-11-01
**最后更新**: 2025-11-05
**维护者**: 业务团队
**状态**: 已发布

---

## 📖 快速导航

| 文档 | 说明 | 推荐阅读对象 |
|------|------|-------------|
| [requirements.md](./requirements.md) | 🌟 需求文档 - 完整的系统需求说明 | 全员必读 |
| [multi-role-system.md](./multi-role-system.md) | 🔐 多角色系统设计（原始完整版） | 前端开发者、产品经理 |
| [business-flow.md](./business-flow.md) | ⚡ 业务流程详解 - 8个阶段完整流程图 | 产品经理、开发者 |
| [roles-responsibilities.md](./roles-responsibilities.md) | 👥 角色职责矩阵 - 8大角色详细职责 | 管理者、HR、产品经理 |
| [data-flow.md](./data-flow.md) | 💾 数据流转设计 - 数据库设计参考 | 后端开发者、架构师 |

---

## 🆕 拆分后的文档结构

为了更好的可维护性，`multi-role-system.md`（2100行）已拆分成以下文件：

### 📐 架构设计 (architecture/)

| 文档 | 说明 | 行数 |
|------|------|------|
| [multi-role-overview.md](./architecture/multi-role-overview.md) | 系统概述、核心特性、四大用户类型 | 250 行 |
| [role-definitions.md](./architecture/role-definitions.md) | 候选人、主播、员工、星探角色详解 | 300 行 |
| [upgrade-mechanism.md](./architecture/upgrade-mechanism.md) | 候选人→主播角色升级机制 | 200 行 |

### 🔄 业务流程 (workflows/)

| 文档 | 说明 | 行数 |
|------|------|------|
| [login-flow.md](./workflows/login-flow.md) | 登录流程、角色识别、自动路由 | 350 行 |
| [candidate-journey.md](./workflows/candidate-journey.md) | 候选人完整旅程、工作台设计 | 500 行 |
| [employee-onboarding.md](./workflows/employee-onboarding.md) | 员工邀请码机制、信息绑定 | 250 行 |
| [scout-referral.md](./workflows/scout-referral.md) | 星探推荐码、佣金计算 | 200 行 |

### 🔌 API 文档 (api/)

| 文档 | 说明 | 行数 |
|------|------|------|
| [auth-api.md](./api/auth-api.md) | 登录、认证相关云函数 | 200 行 |
| [role-api.md](./api/role-api.md) | 角色管理、权限检查云函数 | 150 行 |
| [invite-code-api.md](./api/invite-code-api.md) | 邀请码和推荐码云函数 | 200 行 |

---

## 🎯 按角色推荐阅读

### 💼 产品经理 / 项目经理
**必读顺序**:
1. [requirements.md](./requirements.md) - 了解完整需求
2. [architecture/multi-role-overview.md](./architecture/multi-role-overview.md) - 系统架构概览
3. [business-flow.md](./business-flow.md) - 掌握业务流程
4. [roles-responsibilities.md](./roles-responsibilities.md) - 理解角色协作

**目的**: 全面掌握业务需求和流程设计

---

### 👨‍💻 后端开发者
**必读顺序**:
1. [architecture/multi-role-overview.md](./architecture/multi-role-overview.md) - 理解多角色系统
2. [workflows/login-flow.md](./workflows/login-flow.md) - 登录和角色识别
3. [data-flow.md](./data-flow.md) - 数据库设计参考
4. [api/](./api/) - 云函数接口文档

**目的**: 指导数据库设计、API开发和用户认证实现

---

### 🎨 前端开发者
**必读顺序**:
1. [architecture/multi-role-overview.md](./architecture/multi-role-overview.md) - 系统架构和路由
2. [workflows/login-flow.md](./workflows/login-flow.md) - 登录流程实现
3. [workflows/candidate-journey.md](./workflows/candidate-journey.md) - 候选人工作台设计
4. [architecture/role-definitions.md](./architecture/role-definitions.md) - 各角色工作台

**目的**: 指导页面流程、用户注册和权限控制实现

---

### 👥 HR / 业务人员
**必读顺序**:
1. [requirements.md](./requirements.md) - 了解系统能做什么
2. [architecture/multi-role-overview.md](./architecture/multi-role-overview.md) - 系统概览
3. [business-flow.md](./business-flow.md) - 了解工作流程
4. [roles-responsibilities.md](./roles-responsibilities.md) - 明确自己的职责

**目的**: 理解系统功能和使用方式

---

### 🏗️ 架构师 / 技术负责人
**全部必读**:
1. [requirements.md](./requirements.md) - 完整需求
2. [architecture/](./architecture/) - 架构设计文档
3. [workflows/](./workflows/) - 业务流程
4. [data-flow.md](./data-flow.md) - 数据设计
5. [api/](./api/) - API接口

**目的**: 全面掌握业务逻辑，指导架构设计

---

## 📚 文档说明

### requirements.md - 需求文档
**内容概览**:
- 系统概述：项目背景、核心目标、系统价值
- 用户角色与权限设计：8大核心角色详细说明
- 核心功能模块详细设计：10大功能模块（招聘、面试、签约、培训、排班、舞蹈、形象、协同、数据分析、结算）
- 技术要求和非功能性需求

**关键点**:
- ✅ 8大核心角色定义
- ✅ 10大功能模块详细设计
- ✅ AI功能需求说明
- ✅ 数据分析和预警机制

**适合**：全员必读，了解系统全貌

---

### architecture/ - 架构设计文档

#### multi-role-overview.md
**内容概览**:
- 系统概述和设计目标
- 四大用户类型架构图
- 场景参数路由机制
- 工作台设计原则
- 技术实现要点

**适合**：架构师、前端开发者、产品经理

#### role-definitions.md
**内容概览**:
- 候选人角色详解（状态流转、数据模型）
- 主播角色详解（工作台功能模块）
- 内部员工9种角色详解（职责、权限、工作台）
- 外部星探角色详解（佣金机制）

**适合**：开发者、产品经理

#### upgrade-mechanism.md
**内容概览**:
- 候选人→主播升级触发条件
- 数据变更对比
- 升级后首次登录流程
- 消息通知设计
- 回退机制

**适合**：后端开发者、产品经理

---

### workflows/ - 业务流程文档

#### login-flow.md
**内容概览**:
- 微信授权登录流程
- 静默登录实现
- 角色识别逻辑
- 自动路由跳转
- 登录状态管理

**适合**：前端开发者、后端开发者

#### candidate-journey.md
**内容概览**:
- 用户未注册处理方案（3种场景）
- 星探推荐码流程
- 无参数直接打开流程
- 候选人工作台设计（首页布局、核心功能）
- 候选人状态流转

**适合**：前端开发者、产品经理

#### employee-onboarding.md
**内容概览**:
- 员工邀请码机制
- 员工信息绑定页面
- 验证逻辑
- 员工预登记流程
- 邀请码管理

**适合**：后端开发者、HR

#### scout-referral.md
**内容概览**:
- 星探推荐码机制
- 佣金计算规则
- 星探工作台设计
- 佣金结算流程
- 防滥用机制

**适合**：后端开发者、财务专员

---

### api/ - API 文档

#### auth-api.md
**内容概览**:
- 用户登录 (login)
- 检查用户是否存在 (checkUser)
- 获取用户信息 (getUserInfo)
- 检查权限 (checkPermission)
- 创建候选人账号 (createCandidate)
- 防重复注册检查

**适合**：后端开发者、前端开发者

#### role-api.md
**内容概览**:
- 确认合同签署（触发角色升级）(confirmContract)
- 回退角色 (rollbackRole)
- 获取角色数据 (getRoleData)
- 验证角色权限 (checkRolePermission)

**适合**：后端开发者

#### invite-code-api.md
**内容概览**:
- 生成邀请码 (generateInviteCode)
- 验证邀请码 (verifyInviteCode)
- 绑定员工信息 (bindEmployee)
- 作废邀请码 (revokeInviteCode)
- 生成推荐码 (generateScoutCode)
- 获取推荐记录 (getScoutReferrals)
- 获取佣金明细 (getScoutCommissions)
- 提现申请 (submitWithdrawRequest)

**适合**：后端开发者

---

### business-flow.md - 业务流程详解
**内容概览**:
- 主播全生命周期8个阶段流程
- 每个阶段的详细节点和操作
- 候选人视角的完整体验
- 关键决策点说明
- 角色在各阶段的参与情况
- Mermaid流程图

**关键点**:
- ✅ 阶段0：用户注册和角色识别
- ✅ 招募 → 筛选 → 面试 → 签约(角色升级) → 培训 → 运营 → 结算
- ✅ 每个阶段的输入输出和候选人体验
- ✅ 关键决策点（审批、评估、角色升级）
- ✅ 可视化流程图

**适合**：产品经理、开发者，理解业务逻辑和用户体验

---

### roles-responsibilities.md - 角色职责矩阵
**内容概览**:
- 8大核心角色详细职责
- 角色在7个阶段的参与度矩阵
- 角色协同关系图
- 权限范围和数据访问控制

**关键点**:
- ✅ 超级管理员、HR管理员、经纪人、运营专员
- ✅ 舞蹈导师、化妆师、搭配师、财务专员
- ✅ 角色协作关系
- ✅ 权限设计建议

**适合**：管理者、HR、产品经理，理解组织架构

---

### data-flow.md - 数据流转设计
**内容概览**:
- 微信云开发NoSQL数据库设计
- 8个阶段产生的核心数据
- 统一用户集合(users)设计
- 候选人→主播角色升级数据流
- 数据在系统中的流转路径
- 邀请码和推荐码集合设计
- 数据安全和权限控制设计

**关键点**:
- ✅ NoSQL文档数据库(微信云开发)
- ✅ 统一users集合(包含候选人、主播、员工、星探)
- ✅ candidateInfo → candidateHistory迁移机制
- ✅ roleChanges数组追踪角色升级
- ✅ 主要数据集合（users、interviews、contracts、referral_records等）
- ✅ 数据关联关系和索引策略
- ✅ 数据权限控制

**适合**：后端开发者、架构师，指导技术实现

---

## 🔗 与技术文档的关联

### 与架构文档的关系
```
业务需求 (requirements.md)
    ↓
业务流程 (business-flow.md)
    ↓
系统架构 (architecture/multi-role-overview.md)
    ↓
技术实现 (modules/)
```

### 开发流程建议
1. **需求理解阶段** → 阅读业务文档
2. **架构设计阶段** → 参考 [system-overview.md](../../architecture/system-overview.md)
3. **数据库设计阶段** → 参考 [data-flow.md](./data-flow.md)
4. **模块开发阶段** → 参考 [modules/](../../modules/)
5. **集成测试阶段** → 参考 [business-flow.md](./business-flow.md) 验证流程

---

## 💡 使用技巧

### 查找功能点
```bash
# 搜索特定功能的需求
grep -r "招聘" docs/guides/business/ --include="*.md"

# 搜索角色相关内容
grep -r "经纪人" docs/guides/business/ --include="*.md"
```

### AI 辅助查询
向 AI 提问示例：
- "主播签约流程是怎样的？" → 查看 architecture/upgrade-mechanism.md
- "经纪人的主要职责是什么？" → 查看 architecture/role-definitions.md
- "需要哪些数据表？" → 查看 data-flow.md
- "如何实现登录？" → 查看 workflows/login-flow.md 和 api/auth-api.md

---

## 📝 文档维护

### 更新规则
1. **需求变更** → 更新 requirements.md
2. **流程调整** → 更新 business-flow.md 和 workflows/
3. **角色变化** → 更新 architecture/role-definitions.md
4. **数据结构调整** → 更新 data-flow.md
5. **API 变更** → 更新 api/

### 变更记录
所有业务文档的重大变更应记录在 [CHANGELOG.md](../../CHANGELOG.md)

---

## 🤝 反馈与贡献

如有业务相关问题或建议：
1. 查看现有文档是否已涵盖
2. 在项目 Issues 中提出
3. 联系产品经理或业务负责人

---

## 📊 文档清单

### 拆分完成统计

| 类别 | 文件数 | 总行数 | 状态 |
|------|--------|--------|------|
| **架构设计** | 3 | 750 行 | ✅ 完成 |
| **业务流程** | 4 | 1300 行 | ✅ 完成 |
| **API 文档** | 3 | 550 行 | ✅ 完成 |
| **合计** | 10 | 2600 行 | ✅ 完成 |

**原文件**：multi-role-system.md（2100行）
**拆分后**：10个文件（2600行，包含元信息和交叉引用）

---

**文档版本**: v2.0
**最后审核**: 2025-11-05
**下次审核**: 2025-12-01

**v2.0 更新内容**:
- ✅ 拆分 multi-role-system.md 为 10 个独立文件
- ✅ 新增 architecture/ 目录（3个文件）
- ✅ 新增 workflows/ 目录（4个文件）
- ✅ 新增 api/ 目录（3个文件）
- ✅ 更新导航结构，按角色推荐阅读路径
- ✅ 添加文档清单和统计信息
