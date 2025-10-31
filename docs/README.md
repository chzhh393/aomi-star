# 📚 Aomi Star 项目文档中心

> 欢迎来到 Aomi Star 微信小程序项目文档中心！这里是所有项目文档的导航中枢。

## 📖 快速导航

### 我想了解...

| 需求 | 文档 | 说明 |
|------|------|------|
| **项目整体架构** | [system-overview.md](./architecture/system-overview.md) | 🌟 必读 - 了解项目整体设计 |
| **快速开始开发** | [getting-started.md](./guides/development/getting-started.md) | ⚡ 新人 - 5分钟上手开发 |
| **微信小程序基础** | [tech-stack.md](./architecture/tech-stack.md) | 📱 技术栈说明 |
| **文档系统设计** | [documentation-design.md](./architecture/documentation-design.md) | 📚 文档中心的设计理念 |
| **云开发使用指南** | [cloud-functions](./modules/cloud-functions/) | ☁️ 云函数开发文档 |
| **页面开发规范** | [pages](./modules/pages/) | 📄 页面模块文档 |
| **组件开发规范** | [components](./modules/components/) | 🧩 组件模块文档 |
| **Git 工作流程** | [git-workflow.md](./guides/development/git-workflow.md) | 🔀 代码协作规范 |
| **代码规范** | [code-standards.md](./guides/development/code-standards.md) | 📏 编码标准 |

### 我想查找...

| 查找内容 | 位置 | 说明 |
|---------|------|------|
| **某个模块的文档** | [modules/](./modules/) | 按模块查找详细文档 |
| **开发指南** | [guides/development/](./guides/development/) | 开发相关的所有指南 |
| **部署文档** | [guides/deployment/](./guides/deployment/) | 部署和发布流程 |
| **最近的改动记录** | [dev-logs/2025-11/](./dev-logs/2025-11/) | 查看开发日志 |
| **已知问题** | [issues/pending/](./issues/pending/) | 待解决问题列表 |
| **已解决问题** | [issues/resolved/](./issues/resolved/) | 问题解决方案 |
| **临时笔记** | [temp/](./temp/) | 临时文档和草稿 |

## 📁 完整文档结构

```
docs/
├── 🌟 README.md                          # 文档导航中枢 (当前文件)
├── 🤖 CLAUDE.md                         # 项目级 AI 指导文件
├── 📝 CHANGELOG.md                      # 项目变更历史
│
├── 📐 architecture/                     # 整体架构文档
│   ├── README.md                       # 架构概览
│   ├── system-overview.md              # 🌟 系统总览
│   ├── data-flow.md                    # 数据流程图
│   └── tech-stack.md                   # 技术栈说明
│
├── 🏗️ modules/                          # 模块专属文档
│   ├── pages/                          # 📄 页面模块
│   │   ├── README.md                   # 页面模块概览
│   │   ├── CHANGELOG.md                # 变更日志
│   │   ├── features/                   # 功能详细文档
│   │   ├── implementation/             # 实施指南
│   │   ├── dev-logs/                   # 开发日志
│   │   ├── issues/                     # 问题追踪
│   │   └── temp/                       # 临时文档
│   ├── cloud-functions/                # ☁️ 云函数模块
│   │   └── ...
│   ├── components/                     # 🧩 组件模块
│   │   └── ...
│   └── utils/                          # 🔧 工具函数模块
│       └── ...
│
├── 📚 guides/                           # 通用指南
│   ├── development/                    # 开发指南
│   │   ├── getting-started.md          # ⚡ 快速开始
│   │   ├── git-workflow.md             # Git 工作流
│   │   └── code-standards.md           # 代码规范
│   ├── deployment/                     # 部署指南
│   ├── integration/                    # 集成指南
│   └── business/                       # 业务文档
│
├── 📝 dev-logs/                         # 项目级开发日志
│   ├── TEMPLATE.md                     # 日志模板
│   └── 2025-11/                        # 按月归档
│       └── README.md                   # 月度摘要
│
├── 🐛 issues/                           # 项目级问题追踪
│   ├── TEMPLATE.md                     # 问题模板
│   ├── resolved/                       # 已解决问题
│   └── pending/                        # 待解决问题
│
└── 🗑️ temp/                             # 临时文档
    ├── .gitkeep
    └── README.md                       # 使用说明
```

## 🔍 搜索技巧

### 使用 grep 查找

```bash
# 在所有文档中搜索关键词
grep -r "关键词" docs/ --include="*.md"

# 搜索特定模块的文档
grep -r "关键词" docs/modules/pages/ --include="*.md"

# 搜索最近的开发日志
grep -r "关键词" docs/dev-logs/2025-11/ --include="*.md"
```

### 使用 AI 查找

在与 AI 对话时,可以这样提问:

- "查找关于云函数的文档"
- "pages模块的所有文档"
- "2025年11月做了哪些改动"
- "有关用户认证的问题追踪"

## 🤖 AI 友好设计

### 给 AI 的指令模板

#### 1. 创建新文档

```
请根据 @docs/README.md 的指引,帮我创建一个关于 [功能名称] 的文档。

类型: [模块文档/通用指南/开发日志/问题追踪]
模块: [模块名/通用]
主要内容: [简要描述]
```

**示例**:
```
请根据 @docs/README.md 的指引,帮我创建一个关于"用户登录功能"的文档。

类型: 模块文档
模块: pages
主要内容: 用户登录页面的功能设计、实现方案和API对接
```

#### 2. 查找文档

```
根据 @docs/README.md,帮我找到关于 [关键词] 的所有相关文档。
```

#### 3. 更新文档

```
请查看 @docs/modules/[模块名]/README.md,帮我更新关于 [功能] 的文档。
```

#### 4. 记录开发日志

```
请根据 @docs/dev-logs/TEMPLATE.md 模板,帮我创建今天的开发日志。

类型: [Bug修复/新功能/文档更新/重构/优化]
模块: [模块名]
主要内容: [简要描述]
```

## 🎯 按角色推荐阅读

### 🆕 新人开发者

**必读顺序**:
1. [快速开始](./guides/development/getting-started.md) ⚡
2. [系统概览](./architecture/system-overview.md) 🌟
3. [技术栈说明](./architecture/tech-stack.md)
4. [Git 工作流](./guides/development/git-workflow.md)
5. [代码规范](./guides/development/code-standards.md)

### 📱 前端开发者

**推荐阅读**:
1. [页面模块文档](./modules/pages/)
2. [组件模块文档](./modules/components/)
3. [数据流程](./architecture/data-flow.md)
4. [代码规范](./guides/development/code-standards.md)

### ☁️ 云开发工程师

**推荐阅读**:
1. [云函数模块文档](./modules/cloud-functions/)
2. [系统概览](./architecture/system-overview.md)
3. [集成指南](./guides/integration/)

### 🚀 DevOps 工程师

**推荐阅读**:
1. [部署指南](./guides/deployment/)
2. [系统概览](./architecture/system-overview.md)
3. [技术栈说明](./architecture/tech-stack.md)

### 💼 产品经理 / 业务人员

**推荐阅读**:
1. [业务文档](./guides/business/)
2. [系统概览](./architecture/system-overview.md)
3. [功能文档](./modules/pages/features/)

## 📝 文档维护规范

### 创建新文档时

1. **确定文档类型和位置**
   - 模块文档 → `docs/modules/[模块名]/`
   - 通用指南 → `docs/guides/[类型]/`
   - 开发日志 → `docs/dev-logs/[年-月]/`
   - 问题追踪 → `docs/issues/[pending|resolved]/`

2. **使用统一命名**
   - 小写字母
   - 连字符分隔
   - 例: `wechat-login.md`, `user-profile-page.md`

3. **添加到快速导航表**
   - 在本文件的"快速导航"部分添加链接
   - 重要文档标注 🌟 或 ⚡

4. **填写文档头部信息**
   ```markdown
   # 文档标题

   > 简短描述

   **创建日期**: YYYY-MM-DD
   **最后更新**: YYYY-MM-DD
   **维护者**: [姓名]
   **状态**: [草稿/审核中/已发布]
   ```

### 月度维护任务

每月1号执行:

1. ✅ 清理临时文档(30天前的文件)
   ```bash
   find docs/temp/ -name "*.md" -mtime +30 -delete
   ```

2. ✅ 创建月度摘要
   - 文件: `docs/dev-logs/[年-月]/README.md`
   - 总结本月主要改动和成果

3. ✅ 审核待解决问题状态
   - 检查 `docs/issues/pending/`
   - 已解决的移至 `docs/issues/resolved/`

4. ✅ 更新 CHANGELOG.md
   - 汇总本月重要变更

## 💡 文档编写技巧

### Markdown 最佳实践

1. **使用标题层级**: 合理使用 # ## ### #### 来组织内容
2. **添加目录**: 长文档添加目录链接
3. **使用代码块**: 代码要指定语言高亮
4. **添加图表**: 复杂流程用 Mermaid 图表说明
5. **引用其他文档**: 使用相对路径链接

### 文档质量检查清单

- [ ] 标题清晰,层级合理
- [ ] 有简短的描述或摘要
- [ ] 代码示例完整可运行
- [ ] 链接都能正常访问
- [ ] 图片或图表清晰易懂
- [ ] 更新了修改日期

## 🔗 相关资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [项目 Git 仓库](../README.md)

---

**最后更新**: 2025-11-01
**维护者**: 开发团队
**版本**: v1.0

> 💡 提示: 建议将本文件加入浏览器书签,方便随时查阅!
