# Claude Code 配置说明

> Aomi Star 项目的 Claude Code 自动化配置

**创建日期**: 2025-11-05
**最后更新**: 2025-11-05

---

## 📁 目录结构

```
.claude/
├── README.md                  # 本文件（配置说明）
├── settings.local.json        # 本地配置（需手动启用 Hooks）
├── skill-rules.json           # Skill 自动激活规则
│
├── hooks/                     # Hooks 脚本
│   └── user-prompt-submit.js  # 用户提交 prompt 前的钩子
│
└── skills/                    # Skills 目录
    └── miniprogram-dev/       # 微信小程序开发规范
        ├── SKILL.md           # 主文件
        ├── page-structure.md  # 页面结构规范
        ├── component-guide.md # 组件开发指南
        └── lifecycle-best-practices.md  # 生命周期最佳实践
```

---

## 🎯 什么是 Skills 和 Hooks？

### Skills - 项目特定的开发规范

**Skills** 是针对特定技术栈或场景的详细开发规范。当 AI 助手检测到相关任务时，会自动加载对应的 Skill，确保代码符合项目标准。

**优势**：
- ✅ 自动激活 - 无需手动指定
- ✅ 规范统一 - 所有代码遵循相同标准
- ✅ 提高效率 - AI 助手直接了解项目约定
- ✅ 易于维护 - 集中管理开发规范

### Hooks - 自动化工作流

**Hooks** 是在特定事件时自动执行的脚本，用于实现自动化工作流。

**本项目使用的 Hook**：
- `user-prompt-submit.js` - 在用户提交 prompt 前自动检测并激活相关 Skill

---

## 🚀 快速开始

### 1. 启用 Hooks（必需）

在 `.claude/settings.local.json` 中添加配置：

```json
{
  "hooks": {
    "user-prompt-submit": {
      "command": "node .claude/hooks/user-prompt-submit.js",
      "enabled": true
    }
  }
}
```

如果文件不存在，创建它：

```bash
cat > .claude/settings.local.json << 'EOF'
{
  "hooks": {
    "user-prompt-submit": {
      "command": "node .claude/hooks/user-prompt-submit.js",
      "enabled": true
    }
  }
}
EOF
```

### 2. 测试 Skill 自动激活

尝试以下 prompt，应该会自动激活 `miniprogram-dev` Skill：

```
创建一个候选人列表页面
```

你应该看到提示：
```
🎯 已自动激活 Skill: 微信小程序开发规范
```

### 3. 验证配置

检查 Hook 脚本是否有执行权限：

```bash
ls -la .claude/hooks/user-prompt-submit.js
```

应该看到：`-rwxr-xr-x`（有 `x` 权限）

---

## 📚 已有的 Skills

### miniprogram-dev - 微信小程序开发规范

**适用场景**：开发微信小程序页面、组件、云函数

**触发条件**：
- **关键词**：创建页面、新增组件、云函数、TabBar、角色切换、场景参数等
- **文件路径**：修改 `miniprogram/pages/`, `miniprogram/components/`, `cloudfunctions/` 等
- **上下文**：开发工作台、实现功能、添加角色等

**包含内容**：
- 页面开发标准（生命周期、数据管理、事件处理）
- 组件开发标准（通信、复用、性能优化）
- 云函数开发标准（数据库操作、错误处理）
- 角色和权限管理
- 常见问题和最佳实践

**主文件**：[.claude/skills/miniprogram-dev/SKILL.md](.claude/skills/miniprogram-dev/SKILL.md)

**资源文件**：
- [page-structure.md](.claude/skills/miniprogram-dev/page-structure.md) - 页面结构详细规范
- [component-guide.md](.claude/skills/miniprogram-dev/component-guide.md) - 组件开发详细指南
- [lifecycle-best-practices.md](.claude/skills/miniprogram-dev/lifecycle-best-practices.md) - 生命周期最佳实践

---

## ⚙️ 配置详解

### skill-rules.json - Skill 激活规则

```json
{
  "skills": [
    {
      "id": "miniprogram-dev",
      "name": "微信小程序开发规范",
      "path": ".claude/skills/miniprogram-dev/SKILL.md",
      "enabled": true,
      "priority": 10,

      "triggers": {
        "keywords": ["创建页面", "云函数", ...],
        "filePatterns": ["**/miniprogram/pages/**/*.js", ...],
        "contextPatterns": ["开发.*工作台", ...]
      },

      "autoActivate": {
        "onKeywordMatch": true,
        "onFileMatch": true,
        "onContextMatch": true,
        "minConfidence": 0.7
      }
    }
  ],

  "globalSettings": {
    "enableAutoActivation": true,
    "maxActiveSkills": 3,
    "conflictResolution": "priority"
  }
}
```

**配置说明**：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `enabled` | 是否启用此 Skill | `true` |
| `priority` | 优先级（数字越大优先级越高）| `0` |
| `keywords` | 触发关键词列表 | `[]` |
| `filePatterns` | 文件路径匹配模式（glob） | `[]` |
| `contextPatterns` | 上下文正则表达式模式 | `[]` |
| `minConfidence` | 最小置信度（0-1） | `0.7` |
| `maxActiveSkills` | 同时激活的最大 Skill 数量 | `3` |

### 自定义触发条件

编辑 `.claude/skill-rules.json`，添加你自己的关键词或模式：

```json
{
  "skills": [
    {
      "id": "miniprogram-dev",
      "triggers": {
        "keywords": [
          "你的新关键词",
          ...
        ]
      }
    }
  ]
}
```

---

## 🛠️ 创建新的 Skill

### 1. 创建 Skill 目录

```bash
mkdir -p .claude/skills/my-skill
```

### 2. 创建 SKILL.md 主文件

```markdown
# 我的技能规范

**Skill ID**: `my-skill`
**版本**: 1.0.0

## 🎯 Skill 自动激活规则

当检测到以下关键词或场景时，自动激活此 Skill：
- 关键词：xxx
- 文件路径：xxx

## 📚 核心规范

...
```

**注意**：主文件应控制在 400-500 行以内，详细内容放在资源文件中。

### 3. 添加到 skill-rules.json

```json
{
  "skills": [
    {
      "id": "my-skill",
      "name": "我的技能",
      "path": ".claude/skills/my-skill/SKILL.md",
      "enabled": true,
      "priority": 5,
      "triggers": {
        "keywords": ["关键词1", "关键词2"]
      },
      "autoActivate": {
        "onKeywordMatch": true,
        "minConfidence": 0.7
      }
    }
  ]
}
```

### 4. 测试新 Skill

提交包含触发关键词的 prompt，验证是否自动激活。

---

## 🔍 调试和故障排除

### 查看 Hook 日志

Hook 的输出会显示在终端中，包括：
- 匹配到的 Skill
- 置信度评分
- 触发的条件类型

### 手动测试 Hook

```bash
echo "创建一个候选人列表页面" | node .claude/hooks/user-prompt-submit.js
```

### 常见问题

#### 1. Hook 没有执行

**检查**：
- `.claude/settings.local.json` 中是否启用了 Hook
- Hook 脚本是否有执行权限（`chmod +x`）
- Node.js 是否已安装

**解决**：
```bash
chmod +x .claude/hooks/user-prompt-submit.js
```

#### 2. Skill 没有自动激活

**检查**：
- `skill-rules.json` 中 `enableAutoActivation` 是否为 `true`
- Skill 的 `enabled` 是否为 `true`
- 触发关键词是否匹配

**调试**：
```bash
# 测试关键词匹配
echo "你的 prompt" | node .claude/hooks/user-prompt-submit.js
```

#### 3. Skill 内容未加载

**检查**：
- Skill 文件路径是否正确
- 文件是否存在且可读

**验证**：
```bash
cat .claude/skills/miniprogram-dev/SKILL.md
```

---

## 📖 最佳实践

### 1. Skill 设计原则

- ✅ **单一职责**：每个 Skill 专注一个技术栈或场景
- ✅ **Progressive Disclosure**：主文件简洁，详细内容在资源文件
- ✅ **实用优先**：包含实际可用的代码模板和示例
- ✅ **持续更新**：随项目演进更新规范

### 2. 触发条件设置

- ✅ **关键词精确**：避免过于通用的词（如"修改"、"更新"）
- ✅ **文件模式具体**：使用明确的路径模式
- ✅ **置信度合理**：通常 0.7-0.8 是一个好的平衡点
- ✅ **优先级明确**：核心 Skill 设置更高优先级

### 3. Hook 使用建议

- ✅ **保持轻量**：Hook 脚本应快速执行（< 100ms）
- ✅ **容错设计**：Hook 失败时不应阻塞用户
- ✅ **记录日志**：便于调试和监控
- ✅ **版本控制**：将 Hooks 和 Skills 纳入 Git 管理

---

## 🔄 与其他文档的关系

```
Claude Code 配置 (.claude/)
├── 指导 AI 助手的行为和规范
├── 自动激活相关 Skill
└── 与项目文档互补

项目文档 (docs/)
├── 供人类开发者阅读
├── 系统架构和业务逻辑
└── 问题排查和最佳实践
```

**分工**：
- **CLAUDE.md** - AI 助手的总导航，简洁的项目概览
- **Skills** - 项目特定的开发规范，自动激活
- **PROJECT_KNOWLEDGE.md** - 详细的系统知识库
- **TROUBLESHOOTING.md** - 问题排查指南

---

## 📝 维护指南

### 定期更新

- 每次添加新的技术栈或模块时，考虑创建新的 Skill
- 发现常见错误或最佳实践时，更新现有 Skill
- 项目架构调整时，同步更新相关 Skill

### 版本管理

- Skill 文件包含版本号和更新日期
- 重大变更记录在 Skill 的"更新日志"部分
- 使用 Git 追踪所有变更

### 团队协作

- 所有开发者共享相同的 Skills 配置
- 新成员入职时，确保 Hooks 正确配置
- 定期回顾和优化触发条件

---

## 🚀 未来扩展

可以添加更多 Skills 和 Hooks：

**潜在的 Skills**：
- `backend-api-dev` - 后端 API 开发规范
- `database-design` - 数据库设计规范
- `testing-standards` - 测试规范
- `security-checklist` - 安全检查清单

**潜在的 Hooks**：
- `pre-commit` - 提交前代码质量检查
- `post-file-edit` - 文件编辑后自动更新文档
- `error-handler` - 错误发生时自动查找解决方案

---

**最后更新**: 2025-11-05
**维护者**: 开发团队

> 💡 提示：配置好 Skills 和 Hooks 后，AI 助手会自动遵循项目规范，大大提高开发效率和代码质量。
