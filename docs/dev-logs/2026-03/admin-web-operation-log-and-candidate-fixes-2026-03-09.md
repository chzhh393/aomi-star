# 管理后台文案与候选人展示修复（含云环境发布） - 2026-03-09

**日期**: 2026-03-09  
**类型**: Bug修复 / 优化 / 发布  
**模块**: admin-web / cloudfunctions/admin / docs  
**作者**: 开发团队  
**状态**: 已完成

---

## 背景

近期管理后台存在以下问题：

- 日志模块文案不统一（“审计日志”与“操作日志”混用）
- 候选人艺名/直播名在关键列表位置不够直观
- 候选人详情照片预览点击第二张及后续时索引异常
- 本地环境存在 token 兼容问题与 `cloud://` 资源渲染不稳定问题

## 实现内容

### 1) 文案统一

- 菜单、路由标题、日志页面标题与权限文案统一为「操作日志」。

### 2) 候选人展示优化

- 候选人列表增加「艺名 / 直播名」胶囊标签外显。
- 候选人详情顶部增加「艺名 / 直播名」标签，提升识别效率。

### 3) 详情照片预览修复

- 详情照片区改为稳定数组与显式 `initial-index` 预览，修复索引始终落在第一张的问题。

### 4) 本地可用性修复

- 云函数调用 token 兼容 `token` 与 `admin_token`。
- `cloud://` 文件链接增加分批转换和兜底转换，避免浏览器错误加载 `cloud://` 协议。

### 5) 云函数侧变更

- 候选人删除逻辑改为硬删除，并清理关联数据（`users.candidateInfo`、经纪人分配残留等）。

## 主要变更文件

- `admin-web/src/layout/index.vue`
- `admin-web/src/router/index.js`
- `admin-web/src/views/audit-logs/index.vue`
- `admin-web/src/views/candidates/list.vue`
- `admin-web/src/views/scouts/list.vue`
- `admin-web/src/api/wxcloud.js`
- `admin-web/src/utils/cloudfile.js`
- `admin-web/src/utils/permission.js`
- `cloudfunctions/admin/index.js`
- `docs/CHANGELOG.md`

## 验证结果

- 管理后台构建通过（`npm run build`）。
- 操作日志字段可读性提升，候选人展示与照片预览问题修复完成。

## 发布说明

- 需发布 `cloudfunctions/admin`（云函数代码更新）。
- 需发布 `admin-web/dist`（静态托管更新）。

---

**创建时间**: 2026-03-09 00:00  
**最后更新**: 2026-03-09 00:00
