# Utils 模块变更日志

## [1.1.0] - 2025-11-06

### 改进

- **Mock数据层 - 角色升级机制增强**
  - 文件: `miniprogram/mock/candidates.js`
  - 功能: `upgradeToStreamer()` 函数添加users表同步
  - 改进内容:
    - 导入 `getUserByCandidateId` 和 `upgradeCandidateToAnchor` 函数
    - 在candidates表更新成功后，同步更新users表的角色
    - 添加详细的同步状态日志
    - 返回结果中包含 `usersTableSynced` 状态
  - 解决问题: 修复角色升级时candidates表和users表不同步导致的权限问题

**相关文档**: [开发日志](../../dev-logs/2025-11/recruitment-stages-0-6-verification-2025-11-06.md)

## [1.0.0] - 2025-11-01

### 说明

- 工具模块已初始化
- 当前无工具函数,等待后续开发

---

**说明**: 本文件记录 Utils 模块和 Mock 数据层的所有变更
