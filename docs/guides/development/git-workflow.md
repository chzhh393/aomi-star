# 🔀 Git 工作流

> 项目的 Git 协作规范和工作流程

## 📋 分支策略

### 主要分支

- **main/master**: 生产环境分支,始终保持可发布状态
- **develop**: 开发分支,包含最新的开发代码
- **feature/***: 功能分支,用于开发新功能
- **bugfix/***: 修复分支,用于修复 bug
- **hotfix/***: 紧急修复分支,用于生产环境的紧急修复

### 分支命名规范

```
feature/功能名称      # 例: feature/user-login
bugfix/问题描述      # 例: bugfix/fix-loading-error
hotfix/紧急问题      # 例: hotfix/critical-security-fix
```

## 🔄 工作流程

### 1. 开发新功能

```bash
# 1. 从 develop 分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. 开发功能并提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建 Pull Request
# 在 GitHub/GitLab 上创建 PR, 请求合并到 develop

# 5. 代码审查通过后合并
# 合并后删除功能分支
git branch -d feature/new-feature
```

### 2. 修复 Bug

```bash
# 1. 从 develop 分支创建修复分支
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-issue

# 2. 修复 bug 并提交
git add .
git commit -m "fix: 修复问题描述"

# 3. 推送并创建 PR
git push origin bugfix/fix-issue
```

### 3. 紧急修复(Hotfix)

```bash
# 1. 从 main 分支创建 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix

# 2. 修复问题
git add .
git commit -m "hotfix: 紧急修复问题"

# 3. 合并到 main 和 develop
git checkout main
git merge hotfix/critical-fix
git push origin main

git checkout develop
git merge hotfix/critical-fix
git push origin develop

# 4. 删除 hotfix 分支
git branch -d hotfix/critical-fix
```

## 📝 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat: 添加用户登录功能` |
| fix | 修复 bug | `fix: 修复登录失败的问题` |
| docs | 文档更新 | `docs: 更新 API 文档` |
| style | 代码格式(不影响代码运行) | `style: 格式化代码` |
| refactor | 重构 | `refactor: 重构用户模块` |
| perf | 性能优化 | `perf: 优化列表加载速度` |
| test | 测试 | `test: 添加登录单元测试` |
| chore | 构建/工具变动 | `chore: 更新依赖包` |

### Scope(可选)

指定影响的范围,如: `pages`, `components`, `utils` 等。

### 示例

```bash
# 简单提交
git commit -m "feat: 添加用户登录页面"

# 详细提交
git commit -m "feat(pages): 添加用户登录页面

- 实现手机号登录
- 添加记住密码功能
- 添加第三方登录入口

Closes #123"
```

## 🔍 代码审查(Code Review)

### Pull Request 规范

#### PR 标题

使用与 commit message 相同的格式:

```
feat(pages): 添加用户登录页面
```

#### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 重构
- [ ] 性能优化

## 变更说明
简要描述这次变更的内容和原因。

## 测试说明
描述如何测试这次变更。

## 截图(如有必要)
添加相关截图。

## Checklist
- [ ] 代码遵循项目规范
- [ ] 已添加必要的注释
- [ ] 已更新相关文档
- [ ] 测试通过
- [ ] 无 linter 警告
```

### Code Review 要点

#### 代码审查者应该检查:

1. **代码质量**
   - 代码是否清晰易懂
   - 命名是否合理
   - 是否有重复代码

2. **功能正确性**
   - 是否实现了预期功能
   - 是否有边界情况未处理

3. **性能**
   - 是否有性能问题
   - 是否需要优化

4. **安全性**
   - 是否有安全隐患
   - 用户输入是否验证

5. **测试**
   - 是否有相应的测试
   - 测试覆盖是否充分

## 🚫 注意事项

### 不要做的事

1. ❌ 不要直接提交到 main/master 分支
2. ❌ 不要提交包含敏感信息的代码
3. ❌ 不要提交调试代码和临时文件
4. ❌ 不要提交 `node_modules` 等依赖目录
5. ❌ 不要 force push 到共享分支

### 应该做的事

1. ✅ 提交前运行 linter 和测试
2. ✅ 编写清晰的 commit message
3. ✅ 保持提交粒度适中
4. ✅ 及时 pull 最新代码
5. ✅ 解决冲突后再提交

## 🛠️ 常用命令

### 查看状态

```bash
# 查看当前状态
git status

# 查看提交历史
git log --oneline --graph

# 查看分支
git branch -a
```

### 撤销操作

```bash
# 撤销工作区的修改
git checkout -- file.js

# 撤销暂存区的文件
git reset HEAD file.js

# 撤销最后一次提交(保留修改)
git reset --soft HEAD^

# 撤销最后一次提交(不保留修改)
git reset --hard HEAD^
```

### 分支操作

```bash
# 创建并切换分支
git checkout -b feature/new-feature

# 切换分支
git checkout develop

# 删除本地分支
git branch -d feature/old-feature

# 删除远程分支
git push origin --delete feature/old-feature
```

### 合并操作

```bash
# 合并分支
git merge feature/new-feature

# 取消合并
git merge --abort

# 使用 rebase 合并
git rebase develop
```

### 标签操作

```bash
# 创建标签
git tag v1.0.0

# 推送标签
git push origin v1.0.0

# 推送所有标签
git push origin --tags
```

## 📊 发布流程

### 版本发布

```bash
# 1. 确保 develop 分支最新
git checkout develop
git pull origin develop

# 2. 创建 release 分支
git checkout -b release/v1.0.0

# 3. 更新版本号和 CHANGELOG
# 修改 project.config.json 中的版本号
# 更新 docs/CHANGELOG.md

# 4. 提交更改
git add .
git commit -m "chore: 发布 v1.0.0"

# 5. 合并到 main
git checkout main
git merge release/v1.0.0

# 6. 打标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# 7. 合并回 develop
git checkout develop
git merge release/v1.0.0

# 8. 删除 release 分支
git branch -d release/v1.0.0
```

## 🔗 相关资源

- [Git 官方文档](https://git-scm.com/doc)
- [Git 工作流比较](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [语义化版本](https://semver.org/lang/zh-CN/)

---

**最后更新**: 2025-11-01
**维护者**: 开发团队
