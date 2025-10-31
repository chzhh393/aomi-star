# 🗑️ 临时文档区

> 这里是临时文档和草稿的存放区域

## 📝 使用规则

### ✅ 可以做的

- 随意记录开发过程中的临时笔记
- 保存草稿和未完成的文档
- 记录临时的想法和待办事项
- 存放调试日志和测试记录

### ⚠️ 注意事项

- **不要有心理负担** - 这里的文档可以不完美
- **有价值的内容要及时转移** - 确认有长期价值后移至正式目录
- **重要内容不要只放这里** - 临时区的文件可能随时被清理
- **定期清理** - 每月1号自动清理30天前的文件

## 🔄 文档转移流程

当临时文档有长期价值时:

1. **确定文档类型**
   - 开发日志 → `docs/dev-logs/[年-月]/`
   - 模块文档 → `docs/modules/[模块名]/`
   - 问题追踪 → `docs/issues/[pending|resolved]/`
   - 通用指南 → `docs/guides/[类型]/`

2. **整理内容**
   - 使用对应的模板格式化内容
   - 补充必要的信息
   - 检查链接和引用

3. **移动文件**
   ```bash
   mv docs/temp/old-name.md docs/target/new-name.md
   ```

4. **更新导航**
   - 在 `docs/README.md` 添加导航链接(如需要)
   - 更新相关模块的 README

## 🧹 清理规则

### 自动清理

每月1号执行以下命令清理30天前的文件:

```bash
find docs/temp/ -name "*.md" -mtime +30 -delete
```

### 手动清理

随时可以手动删除不需要的文件:

```bash
# 删除特定文件
rm docs/temp/filename.md

# 清空临时目录(保留 README.md)
find docs/temp/ -name "*.md" ! -name "README.md" -delete
```

## 📋 命名建议

虽然这里的命名规则比较宽松,但建议:

- 使用日期前缀: `2025-11-01-feature-name.md`
- 使用清晰的描述: `login-debug-notes.md`
- 标注状态: `draft-user-guide.md`, `wip-api-design.md`

## 💡 使用场景示例

### 场景1: 快速记录想法

```markdown
# 2025-11-01-feature-ideas.md

## 用户登录优化
- 添加手机号登录
- 支持第三方登录(微信、QQ)
- 记住登录状态

待讨论和确认...
```

### 场景2: 调试笔记

```markdown
# debug-cloud-function.md

## 问题
云函数调用失败,返回 timeout

## 尝试过的方法
1. 增加超时时间 - 无效
2. 检查网络 - 正常
3. 查看日志 - 发现数据库查询慢

## 解决方案
优化数据库查询,添加索引

(解决后移至 issues/resolved/)
```

### 场景3: 待办清单

```markdown
# todo-list.md

## 本周待办
- [ ] 完成登录页面
- [ ] 优化首页加载速度
- [ ] 编写用户指南
- [x] 修复已知bug

(完成后整理到开发日志)
```

## 🔍 查找临时文档

```bash
# 搜索关键词
grep -r "关键词" docs/temp/ --include="*.md"

# 列出最近修改的文件
ls -lt docs/temp/*.md | head -10

# 查看文件大小
du -sh docs/temp/*
```

## 📊 当前状态

```bash
# 统计临时文档数量
find docs/temp/ -name "*.md" ! -name "README.md" | wc -l

# 查看最老的文件
find docs/temp/ -name "*.md" ! -name "README.md" -exec ls -lt {} + | tail -1
```

---

**最后更新**: 2025-11-01
**下次清理**: 2025-12-01

> 💡 提示: 养成定期整理临时文档的好习惯,保持文档系统的整洁!
