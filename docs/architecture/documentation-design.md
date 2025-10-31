# 📐 文档系统设计说明

> Aomi Star 项目文档中心的设计理念和架构说明

## 📋 概述

本文档记录了 Aomi Star 项目文档系统的设计理念、结构和维护规范。这套文档系统已经成功实施，用于管理项目的所有文档资产。

**设计时间**: 2025-11-01
**当前版本**: v1.0
**维护者**: 开发团队

## 📐 文档系统设计理念

  ### 核心原则
  1. **中心化导航** - 所有文档从
  `docs/README.md` 可以找到
  2. **场景化查找** -
  提供"我想了解..."和"我想查找..."快速导航表
  3. **模块化组织** -
  每个模块有独立的文档子目录
  4. **生命周期管理** -
  临时文档定期清理,正式文档长期维护
  5. **AI友好设计** -
  提供标准化的指令模板和查找指南

  ### 目录结构

  请按照以下结构创建文档系统:

  docs/
  ├── 🌟 核心文档
  │   ├── README.md                    #
  总导航中枢(最重要!)
  │   ├── CLAUDE.md                    #
  项目级 AI 指导文件
  │   └── CHANGELOG.md                 #
  项目级变更历史
  │
  ├── 📐 architecture/                 #
  整体架构文档
  │   ├── README.md                   #
  架构概览
  │   ├── system-overview.md          #
  系统总览
  │   ├── data-flow.md                #
  数据流程
  │   └── tech-stack.md               #
  技术栈说明
  │
  ├── 🏗️ modules/                      #
  模块专属文档
  │   ├── [模块A]/                    #
  每个模块独立目录
  │   │   ├── README.md               #
  模块概览
  │   │   ├── CHANGELOG.md            #
  变更日志
  │   │   ├── features/               #
  功能详细文档
  │   │   ├── implementation/         #
  实施指南
  │   │   ├── dev-logs/               #
  开发日志(按月归档)
  │   │   ├── issues/                 #
  问题追踪
  │   │   └── temp/                   #
  临时文档
  │   └── [模块B]/
  │       └── ...
  │
  ├── 📚 guides/                       #
  通用指南
  │   ├── development/                #
  开发指南
  │   │   ├── getting-started.md      #
  快速开始
  │   │   ├── git-workflow.md         # Git
  工作流
  │   │   └── code-standards.md       #
  代码规范
  │   ├── deployment/                 #
  部署指南
  │   ├── integration/                #
  集成指南
  │   └── business/                   #
  业务文档
  │
  ├── 📝 dev-logs/                     #
  项目级开发日志
  │   ├── TEMPLATE.md                 #
  日志模板
  │   └── {年-月}/                    #
  按月归档
  │       └── README.md               #
  月度摘要
  │
  ├── 🐛 issues/                       #
  项目级问题追踪
  │   ├── TEMPLATE.md                 #
  问题模板
  │   ├── resolved/                   #
  已解决问题
  │   └── pending/                    #
  待解决问题
  │
  └── 🗑️ temp/                         #
  临时文档
      ├── .gitkeep
      └── README.md                   #
  使用说明

  ## 📋 核心文件内容要求

  ### 1. docs/README.md (最重要!)

  必须包含以下部分:

  #### A. 快速导航表
  ```markdown
  ## 📖 快速导航

  ### 我想了解...

  | 需求 | 文档 |
  |------|------|
  | **项目整体架构** | [system-overview.md](.
  /architecture/system-overview.md) 🌟 必读 |
  | **快速开始开发** | [getting-started.md](.
  /guides/development/getting-started.md) ⚡
  新人 |
  | **[核心功能A]** | [链接] |
  | **[核心功能B]** | [链接] |

  ### 我想查找...

  | 查找内容 | 位置 |
  |---------|------|
  | **某个模块的文档** |
  [modules/](./modules/) |
  | **开发指南** | [guides/development/](./gu
  ides/development/) |
  | **最近的改动记录** |
  [dev-logs/{年-月}/](./dev-logs/) |

  B. 完整文档结构树

  - 用ASCII树形图展示完整目录
  - 用emoji标注重要性(🌟⚡✨)
  - 为每个目录添加简短说明

  C. 搜索技巧

  ## 🔍 搜索技巧

  ### 使用 grep 查找
  grep -r "关键词" docs/ --include="*.md"

  ### 使用 AI 查找
  - "查找关于[功能]的文档"
  - "[模块]的所有文档"
  - "[时间]做了哪些改动"

  D. AI友好指令模板

  ## 🤖 AI 友好设计

  ### 给 AI 的指令模板

  #### 1. 创建新文档
  请根据 @docs/README.md
  的指引,帮我创建一个关于 [功能名称] 的文档。
  类型:[模块文档/通用指南/开发日志/问题追踪]
  模块:[模块名/通用]
  主要内容:[简要描述]

  #### 2. 查找文档
  根据 @docs/README.md,帮我找到关于 [关键词]
  的所有相关文档。

  E. 按角色推荐阅读

  ## 🎯 按角色推荐阅读

  ### 新人开发者
  1. [快速开始](./guides/development/getting-
  started.md) ⚡
  2. [系统概览](./architecture/system-overvie
  w.md)
  3. [Git 工作流](./guides/development/git-wo
  rkflow.md)

  ### 前端开发
  [列出前端相关文档]

  ### 后端开发
  [列出后端相关文档]

  2. dev-logs/TEMPLATE.md

  提供统一的开发日志模板:

  # [简短标题] - YYYY-MM-DD

  **日期**: YYYY-MM-DD
  **类型**:
  [Bug修复/新功能/文档更新/重构/优化]
  **模块**: [模块名/通用]
  **作者**: [姓名/团队]

  ---

  ## 📋 背景
  [为什么要做这个改动]

  ## 🎯 目标
  - 目标1
  - 目标2

  ## 🔨 实现方案
  [详细实现步骤]

  ## ✅ 测试验证
  [测试方法和结果]

  ## 📊 影响范围
  [受影响的功能和兼容性]

  ## 💡 经验总结
  [遇到的问题和改进建议]

  3. temp/README.md

  说明临时文档区的使用规则:

  # 临时文档区

  ## 使用规则
  - ✅ 随意记录,不要有心理负担
  - ✅ 有价值的内容及时转移到正式目录
  - ✅ 每月1号清理30天前的文件
  - ✅ 重要内容不要只放在临时目录

  ## 清理命令
  find docs/temp/ -name "*.md" -mtime +30 
  -delete

  📝 文档维护规范

  创建新文档时

  1. 确定文档类型和位置
  2. 使用统一命名:小写字母,连字符分隔(例:wech
  at-integration.md)
  3. 添加到 docs/README.md 的快速导航表
  4. 重要文档标注 🌟 或 ⚡

  月度维护任务

  每月1号执行:
  1. 清理临时文档(30天前的文件)
  2. 创建月度摘要(dev-logs/{年-月}/README.md)
  3. 审核待解决问题状态

  🎯 实施步骤

  请按以下步骤实施:

  1. 创建目录结构
  mkdir -p docs/{architecture,modules,guides,
  dev-logs,issues,temp}
  mkdir -p docs/guides/{development,deploymen
  t,integration,business}
  mkdir -p docs/dev-logs/$(date +%Y-%m)
  mkdir -p docs/issues/{resolved,pending}
  2. 创建核心文件
    - docs/README.md
  (按上述要求,包含所有部分)
    - docs/CLAUDE.md (项目级AI指导)
    - docs/CHANGELOG.md
    - dev-logs/TEMPLATE.md
    - issues/TEMPLATE.md
    - temp/README.md
  3. 为现有模块补充文档
    - 识别项目中的主要模块
    - 为每个模块创建
  docs/modules/{模块名}/README.md
    - 补充必要的架构和指南文档
  4. 更新导航
    - 在 docs/README.md
  添加所有重要文档的快速导航链接
    - 确保链接有效且描述清晰

  ✅ 完成标准

  文档系统建立完成后应该满足:
  - ✅ 所有文档可从 docs/README.md 找到
  - ✅ 快速导航表覆盖核心功能
  - ✅ 提供了AI友好的指令模板
  - ✅ 有统一的开发日志和问题追踪模板
  - ✅ 目录结构清晰,分类合理
  - ✅ 有临时文档区和清理机制

  请开始实施,有任何问题随时告诉我!

