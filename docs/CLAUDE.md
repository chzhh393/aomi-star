# 🤖 Aomi Star - AI 开发助手指南

> 本文档为 AI 助手提供项目核心信息和快速导航。详细的开发规范请查阅 Skills 和项目文档。

## 📋 项目概览

**项目名称**: Aomi Star
**项目类型**: 微信小程序（多角色直播主播管理系统）
**技术栈**: 微信小程序原生框架 + 微信云开发
**开发环境**: macOS
**开发工具**: 微信开发者工具

## 🎯 项目核心特点

### 多角色统一入口系统

这是一个基于微信小程序的**多角色工作台系统**，通过智能路由实现不同用户的差异化体验：

**四大用户类型**：
1. **主播候选人** - 应聘者工作台（报名、面试、查看结果）
2. **主播** - 已签约主播工作台（排班、培训、数据查看）
3. **内部员工** - 9种角色专属工作台（HR、经纪人、运营、培训师等）
4. **外部星探** - 推荐工作台（推荐主播、查看佣金）

**核心特性**：
- 🔐 **微信免登录**：利用微信授权，无需账号密码
- 🎯 **智能路由**：根据场景参数和角色自动跳转对应工作台
- 🔗 **场景码识别**：支持推荐码、邀请码等多种进入方式
- 🛡️ **安全机制**：邀请码控制注册，防止随意访问
- 📱 **多端统一**：一个小程序满足所有角色需求

### 关键技术机制

**场景参数路由**：
- 通过小程序启动时的场景参数（scene）识别用户来源
- 支持：邀请码、推荐码、直接搜索等多种进入方式
- 自动解析并路由到对应的注册/登录流程

**动态工作台**：
- 使用 CustomTabBar 实现角色切换
- 每个角色看到完全不同的工作台界面
- 权限严格控制，确保数据安全

## 📂 项目结构

```
aomi-star/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面目录（按角色组织）
│   │   ├── index/          # 登录和首页
│   │   ├── candidate/      # 候选人工作台
│   │   ├── anchor/         # 主播工作台
│   │   ├── hr/             # HR工作台
│   │   ├── agent/          # 经纪人工作台
│   │   ├── operations/     # 运营工作台
│   │   ├── external-scout/ # 外部星探工作台
│   │   └── ...             # 其他角色工作台
│   │
│   ├── components/         # 自定义组件
│   ├── custom-tab-bar/     # 自定义 TabBar
│   ├── utils/              # 工具函数
│   │   ├── role-manager.js # 角色管理
│   │   └── scene-parser.js # 场景参数解析
│   │
│   ├── mock/               # Mock 数据
│   ├── styles/             # 公共样式
│   ├── app.js              # 小程序入口（云开发初始化）
│   ├── app.json            # 小程序配置
│   └── app.wxss            # 全局样式
│
├── cloudfunctions/          # 云函数目录
│   ├── login/              # 登录相关
│   ├── user-info/          # 用户信息管理
│   └── ...                 # 其他云函数
│
├── docs/                    # 📚 项目文档
│   ├── CLAUDE.md           # 本文件（总览）
│   ├── PROJECT_KNOWLEDGE.md # 核心知识库 ⭐
│   ├── TROUBLESHOOTING.md  # 问题排查指南 ⭐
│   ├── README.md           # 文档导航
│   ├── architecture/       # 架构设计
│   ├── guides/             # 开发和业务指南
│   ├── modules/            # 模块文档
│   └── dev/                # 任务级开发文档
│
├── project.config.json      # 项目配置
└── project.private.config.json  # 私有配置
```

## 🔧 文件命名规范

### 项目约定

- **页面/组件**: 小写字母，连字符分隔
  例：`user-profile`、`candidate-workspace`

- **JS 文件**: 小写驼峰
  例：`roleManager.js`、`sceneParser.js`

- **云函数**: 小写字母，连字符分隔
  例：`get-user-info`、`verify-invite-code`

- **代码风格**: 2空格缩进，单引号，语句结尾加分号

## 🚀 AI 助手快速上手

### 新任务开始前（必读）

**第一步 - 理解项目**：
1. 首次接触项目 → 阅读 [@docs/PROJECT_KNOWLEDGE.md](./PROJECT_KNOWLEDGE.md)
   了解：系统架构、多角色设计、数据模型、技术机制

2. 需要了解业务流程 → 阅读 [@docs/guides/business/README.md](./guides/business/README.md)
   根据任务类型查看对应的架构、流程或 API 文档

**第二步 - 查看相关文档**：
- 开发规范 → [@docs/guides/development/code-standards.md](./guides/development/code-standards.md)
- 架构设计 → [@docs/architecture/system-overview.md](./architecture/system-overview.md)
- 模块文档 → [@docs/modules/](./modules/)（按模块查找）

**第三步 - 遇到问题时**：
- 查阅 [@docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- 搜索 [@docs/issues/resolved/](./issues/resolved/)
- 必要时创建问题追踪

### 开发工作流

#### 🆕 开发新功能

**简单功能**（预计 < 4 小时）：
1. 查看相关模块文档
2. 遵循项目代码规范
3. 创建必要的文件
4. 测试功能
5. 更新相关文档

**复杂功能**（预计 ≥ 4 小时）：
1. **进入规划模式** - 制定详细计划
2. **创建 Dev Docs** - 在 `docs/dev/in-progress/[task-name]/` 下创建：
   - `plan.md` - 已批准的计划
   - `context.md` - 关键文件和决策
   - `tasks.md` - 任务清单
3. **分阶段实施** - 按计划逐步实现
4. **定期更新** - 及时更新 context 和 tasks
5. **完成后归档** - 移动到 `docs/dev/completed/`

#### 🐛 修复问题

1. 查看 `docs/issues/pending/` 中的问题追踪
2. 分析问题原因（参考 TROUBLESHOOTING.md）
3. 实施修复
4. 创建问题解决文档移至 `docs/issues/resolved/`
5. 更新相关文档（如果是新类型问题，更新 TROUBLESHOOTING.md）

#### 📝 文档维护原则

- ✅ 代码变更 = 文档同步更新
- ✅ 使用 `docs/dev-logs/TEMPLATE.md` 记录开发日志
- ✅ 临时笔记放在 `docs/temp/`
- ✅ 正式文档放在对应的模块目录
- ✅ 大型重构后更新 PROJECT_KNOWLEDGE.md

## 📝 常用命令

### 创建新页面

```bash
# 创建页面目录
mkdir -p miniprogram/pages/[role-name]/[page-name]

# 在微信开发者工具中右键创建页面，或手动创建：
# - [page-name].js
# - [page-name].json
# - [page-name].wxml
# - [page-name].wxss

# 在 app.json 的 pages 数组中注册页面路径
```

### 创建新组件

```bash
# 创建组件目录
mkdir -p miniprogram/components/[component-name]

# 创建组件文件（同页面）
```

### 创建云函数

```bash
# 在云函数根目录创建
mkdir -p cloudfunctions/[function-name]
cd cloudfunctions/[function-name]

# 初始化和安装依赖
npm init -y
npm install wx-server-sdk

# 创建 index.js
```

## 🔗 快速导航

### 核心文档
- [PROJECT_KNOWLEDGE.md](./PROJECT_KNOWLEDGE.md) - 系统架构和核心知识 ⭐
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 常见问题排查 ⭐
- [文档中心](./README.md) - 完整文档导航

### 开发指南
- [代码规范](./guides/development/code-standards.md)
- [Git 工作流](./guides/development/git-workflow.md)
- [快速开始](./guides/development/getting-started.md)

### 业务文档
- [多角色系统](./guides/business/README.md) - 业务架构总览
- [角色定义](./guides/business/architecture/) - 详细角色说明
- [业务流程](./guides/business/workflows/) - 各流程详解
- [API 文档](./guides/business/api/) - 云函数接口

### 架构设计
- [系统概述](./architecture/system-overview.md)
- [技术栈](./architecture/tech-stack.md)
- [数据流](./architecture/data-flow.md)

## 📞 获取帮助

遇到问题时的顺序：

1. **查看 TROUBLESHOOTING.md** - 常见问题和解决方案
2. **搜索已解决问题** - `docs/issues/resolved/`
3. **查看官方文档** - 微信小程序和云开发文档
4. **创建问题追踪** - `docs/issues/pending/` 记录新问题

---

**最后更新**: 2025-11-05
**维护者**: 开发团队

> 💡 提示：AI 助手应优先查阅 PROJECT_KNOWLEDGE.md 了解系统核心设计，遇到问题查阅 TROUBLESHOOTING.md。详细的代码规范和最佳实践请参考 Skills 系统。
