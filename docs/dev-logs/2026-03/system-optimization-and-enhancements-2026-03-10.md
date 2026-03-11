# 系统优化与功能增强 - 2026-03-10

**日期**: 2026-03-10
**类型**: 功能增强 / 优化改进
**模块**: 管理后台 / 小程序 / 全局
**作者**: Claude Opus 4.6
**状态**: 🚧 进行中

---

## 📋 背景

基于实际使用反馈，系统需要进行一系列优化和功能增强，主要包括：
- 提升操作效率（批量分配）
- 完善权限控制（经纪人权限）
- 品牌升级（星探命名调整）
- 功能增强（试镜视频、用户审核）
- 体验优化（UI调整）

共计 **8 项需求**，分为 **3 个批次** 实施。

---

## 🎯 需求总览

| 编号 | 需求名称 | 类型 | 批次 | 优先级 | 状态 |
|------|---------|------|------|--------|------|
| 1 | 候选人批量分配经纪人 | 管理后台 | 第一批 | 高 | ⏸️ 待开始 |
| 2 | 经纪人权限控制优化 | 管理后台 | 第一批 | 高 | ⏸️ 待开始 |
| 3 | 试镜视频上传功能 | 小程序 | 第三批 | 中 | ⏸️ 待开始 |
| 4 | 用户申请审核制 | 管理后台 | 第三批 | 中 | ⏸️ 待开始 |
| 5 | 艺名显示优化 | 管理后台 | 第三批 | 低 | ⏸️ 待开始 |
| 6 | 星探删除功能 | 管理后台 | 第二批 | 中 | ⏸️ 待开始 |
| 7 | 星探命名升级 | 全局 | 第二批 | 中 | ⏸️ 待开始 |
| 8 | 星探层级手动调整 | 管理后台 | 第二批 | 中 | ⏸️ 待开始 |

---

# 第一批：高优先级需求（安全性 + 效率）

## 需求 1：候选人批量分配经纪人

### 📌 需求描述
当前候选人分配经纪人的操作流程：
- 打开候选人详情 → 选择经纪人 → 保存
- 需要逐个操作，效率低下

**优化目标**：
- 支持批量勾选候选人
- 一键分配给指定经纪人
- 显示分配结果统计

### 🎨 UI 设计

**候选人列表页面** (`admin-web/src/views/candidates/list.vue`)

```
┌──────────────────────────────────────────────────┐
│  候选人管理                  [批量分配]  [导出]   │
├──────────────────────────────────────────────────┤
│  □ 全选   [筛选▼] [搜索]            已选: 3人    │
├──────────────────────────────────────────────────┤
│  □ 张三  | 22岁 | 待审核 | 未分配  | 星探推荐    │
│  ☑ 李四  | 24岁 | 已通过 | 未分配  | 直接报名    │
│  ☑ 王五  | 21岁 | 待审核 | 未分配  | 星探推荐    │
│  □ 赵六  | 23岁 | 已通过 | 张经纪  | 星探推荐    │
│  ☑ 孙七  | 25岁 | 已通过 | 未分配  | 直接报名    │
└──────────────────────────────────────────────────┘

点击"批量分配"后弹窗：
┌────────────────────────────┐
│  批量分配经纪人              │
├────────────────────────────┤
│  已选择候选人：3人           │
│  • 李四（24岁）             │
│  • 王五（21岁）             │
│  • 孙七（25岁）             │
├────────────────────────────┤
│  选择经纪人：                │
│  ┌──────────────────────┐  │
│  │ 请选择经纪人    ▼    │  │
│  └──────────────────────┘  │
│                            │
│  经纪人列表：                │
│  ○ 张经纪（已分配: 5人）     │
│  ○ 李经纪（已分配: 3人）     │
│  ○ 王经纪（已分配: 8人）     │
├────────────────────────────┤
│      [取消]    [确认分配]   │
└────────────────────────────┘
```

### 🔨 实施方案

#### 1. 前端实现

**新增状态管理**：
```javascript
data() {
  return {
    selectedCandidates: [],    // 已选择的候选人ID列表
    selectAll: false,          // 全选状态
    showBatchDialog: false,    // 批量分配弹窗
    selectedAgent: null,       // 选择的经纪人
    agents: []                 // 经纪人列表
  }
}
```

**复选框功能**：
```javascript
// 切换单个候选人选择
toggleSelect(candidateId) {
  const index = this.selectedCandidates.indexOf(candidateId);
  if (index > -1) {
    this.selectedCandidates.splice(index, 1);
  } else {
    this.selectedCandidates.push(candidateId);
  }
},

// 全选/取消全选
toggleSelectAll() {
  if (this.selectAll) {
    this.selectedCandidates = this.candidates
      .filter(c => !c.assignedAgent) // 只选择未分配的
      .map(c => c._id);
  } else {
    this.selectedCandidates = [];
  }
}
```

**批量分配**：
```javascript
async batchAssignAgent() {
  if (!this.selectedAgent) {
    this.$message.warning('请选择经纪人');
    return;
  }

  if (this.selectedCandidates.length === 0) {
    this.$message.warning('请选择候选人');
    return;
  }

  try {
    const res = await batchAssignCandidates({
      candidateIds: this.selectedCandidates,
      agentId: this.selectedAgent
    });

    this.$message.success(`成功分配 ${res.successCount} 人`);
    this.showBatchDialog = false;
    this.selectedCandidates = [];
    this.loadCandidates(); // 刷新列表
  } catch (error) {
    this.$message.error('批量分配失败：' + error.message);
  }
}
```

#### 2. API 接口

**新增接口** (`admin-web/src/api/admin.js`)：
```javascript
// 批量分配候选人给经纪人
export function batchAssignCandidates(data) {
  return request({
    url: '/admin/candidates/batch-assign',
    method: 'post',
    data
  });
}

// 获取经纪人列表（含分配统计）
export function getAgentList() {
  return request({
    url: '/admin/agents/list',
    method: 'get'
  });
}
```

#### 3. 云函数实现

**扩展 admin 云函数** (`cloudfunctions/admin/index.js`)：

```javascript
case 'batchAssignCandidates':
  return await batchAssignCandidates(data, adminInfo);

// 批量分配候选人
async function batchAssignCandidates(data, adminInfo) {
  const { candidateIds, agentId } = data;

  // 权限检查
  if (!hasPermission(adminInfo.role, 'assignCandidate')) {
    return { success: false, error: '无权限操作' };
  }

  // 验证经纪人存在
  const agentRes = await db.collection('admins').doc(agentId).get();
  if (!agentRes.data || agentRes.data.role !== 'agent') {
    return { success: false, error: '经纪人不存在' };
  }

  const agentName = agentRes.data.username;
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  // 批量更新
  for (const candidateId of candidateIds) {
    try {
      await db.collection('candidates').doc(candidateId).update({
        data: {
          assignedAgent: {
            agentId: agentId,
            agentName: agentName,
            assignedAt: db.serverDate(),
            assignedBy: adminInfo._id
          },
          updatedAt: db.serverDate()
        }
      });
      successCount++;
    } catch (error) {
      failCount++;
      errors.push({ candidateId, error: error.message });
    }
  }

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: 'batch_assign_candidates',
    target: `${candidateIds.length} 个候选人`,
    details: {
      agentId,
      agentName,
      successCount,
      failCount
    }
  });

  return {
    success: true,
    successCount,
    failCount,
    errors
  };
}
```

### ✅ 验证标准

- [ ] 可以勾选多个候选人
- [ ] "全选"功能正常工作
- [ ] 批量分配弹窗显示正确
- [ ] 经纪人列表加载正常，显示已分配数量
- [ ] 批量分配成功，数据库更新
- [ ] 显示成功/失败统计
- [ ] 操作日志正确记录

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `admin-web/src/views/candidates/list.vue` | 修改 | 添加批量选择和分配功能 |
| `admin-web/src/api/admin.js` | 修改 | 新增批量分配接口 |
| `cloudfunctions/admin/index.js` | 修改 | 新增批量分配云函数 |

---

## 需求 2：经纪人权限控制优化

### 📌 需求描述

当前问题：
- 经纪人在管理后台可能看到候选人的手机号、微信号
- 可能看到社交账号（抖音、小红书、B站等）
- 可能看到数据看板（应该只有管理员可见）

**优化目标**：
- 经纪人登录管理后台时，自动隐藏敏感信息
- 不显示联系方式和社交账号
- 不显示系统数据看板

### 🔒 权限设计

#### 数据脱敏规则

**经纪人不可见的字段**：
```javascript
const AGENT_HIDDEN_FIELDS = {
  basicInfo: ['phone', 'wechat'],
  social: ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'],
  referral: ['scoutPhone', 'scoutWechat']
};
```

#### 页面权限控制

**经纪人不可访问的页面**：
- 系统设置
- 用户管理
- 数据看板（Dashboard）
- 操作日志
- 星探管理

### 🔨 实施方案

#### 1. 云函数数据脱敏

**修改 `getCandidateList` 和 `getCandidateDetail`**：

```javascript
// cloudfunctions/admin/index.js

function desensitizeCandidateForAgent(candidate) {
  const sanitized = { ...candidate };

  // 移除联系方式
  if (sanitized.basicInfo) {
    delete sanitized.basicInfo.phone;
    delete sanitized.basicInfo.wechat;
  }

  // 移除社交账号
  if (sanitized.social) {
    delete sanitized.social.douyin;
    delete sanitized.social.xiaohongshu;
    delete sanitized.social.bilibili;
    delete sanitized.social.kuaishou;
  }

  // 移除推荐人敏感信息
  if (sanitized.referral) {
    delete sanitized.referral.scoutPhone;
    delete sanitized.referral.scoutWechat;
  }

  return sanitized;
}

// 在 getCandidateList 中应用
async function getCandidateList(data, adminInfo) {
  // ... 查询逻辑 ...

  let candidates = res.data;

  // 如果是经纪人，脱敏处理
  if (adminInfo.role === 'agent') {
    candidates = candidates.map(c => desensitizeCandidateForAgent(c));
  }

  return {
    success: true,
    data: candidates,
    total: countRes.total
  };
}
```

#### 2. 前端权限控制

**修改候选人详情显示** (`admin-web/src/views/candidates/list.vue`)：

```vue
<template>
  <el-dialog title="候选人详情" :visible.sync="showDetail">
    <!-- 基本信息 -->
    <div class="info-block">
      <div class="info-block-title">基本信息</div>
      <div class="info-row">
        <span class="info-label">姓名</span>
        <span class="info-value">{{ currentCandidate.basicInfo.name }}</span>
      </div>

      <!-- 只有非经纪人角色才显示联系方式 -->
      <div v-if="userRole !== 'agent'" class="info-row">
        <span class="info-label">手机号</span>
        <span class="info-value">{{ currentCandidate.basicInfo.phone }}</span>
      </div>

      <div v-if="userRole !== 'agent'" class="info-row">
        <span class="info-label">微信号</span>
        <span class="info-value">{{ currentCandidate.basicInfo.wechat }}</span>
      </div>

      <!-- 经纪人看到的提示 -->
      <div v-if="userRole === 'agent'" class="info-tip">
        <i class="el-icon-info"></i>
        联系方式和社交账号已隐藏，如需查看请联系管理员
      </div>
    </div>

    <!-- 社交账号 - 只有非经纪人可见 -->
    <div v-if="userRole !== 'agent' && currentCandidate.social" class="info-block">
      <div class="info-block-title">社交账号</div>
      <!-- ... -->
    </div>
  </el-dialog>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  computed: {
    ...mapGetters(['userRole'])
  }
}
</script>
```

#### 3. 路由权限控制

**修改路由配置** (`admin-web/src/router/index.js`)：

```javascript
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      title: '数据看板',
      roles: ['admin', 'hr'] // 只有管理员和HR可访问
    }
  },
  {
    path: '/users',
    component: UserManagement,
    meta: {
      title: '用户管理',
      roles: ['admin'] // 只有管理员可访问
    }
  },
  {
    path: '/scouts',
    component: ScoutManagement,
    meta: {
      title: '星探管理',
      roles: ['admin', 'hr'] // 经纪人不可访问
    }
  },
  {
    path: '/candidates',
    component: CandidateManagement,
    meta: {
      title: '候选人管理',
      roles: ['admin', 'hr', 'agent'] // 经纪人可访问
    }
  }
];

// 路由守卫
router.beforeEach((to, from, next) => {
  const userRole = store.getters.userRole;
  const requiredRoles = to.meta.roles;

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    Message.error('您没有访问该页面的权限');
    next('/candidates'); // 重定向到候选人管理
    return;
  }

  next();
});
```

#### 4. 菜单权限控制

**修改侧边栏菜单** (`admin-web/src/layout/index.vue`)：

```vue
<el-menu>
  <!-- 候选人管理 - 所有角色可见 -->
  <el-menu-item index="/candidates">
    <i class="el-icon-user"></i>
    <span>候选人管理</span>
  </el-menu-item>

  <!-- 数据看板 - 只有管理员和HR可见 -->
  <el-menu-item
    v-if="['admin', 'hr'].includes(userRole)"
    index="/dashboard">
    <i class="el-icon-data-line"></i>
    <span>数据看板</span>
  </el-menu-item>

  <!-- 星探管理 - 只有管理员和HR可见 -->
  <el-menu-item
    v-if="['admin', 'hr'].includes(userRole)"
    index="/scouts">
    <i class="el-icon-share"></i>
    <span>星探管理</span>
  </el-menu-item>

  <!-- 用户管理 - 只有管理员可见 -->
  <el-menu-item
    v-if="userRole === 'admin'"
    index="/users">
    <i class="el-icon-setting"></i>
    <span>用户管理</span>
  </el-menu-item>

  <!-- 操作日志 - 只有管理员可见 -->
  <el-menu-item
    v-if="userRole === 'admin'"
    index="/audit-logs">
    <i class="el-icon-document"></i>
    <span>操作日志</span>
  </el-menu-item>
</el-menu>
```

### ✅ 验证标准

- [ ] 经纪人登录后看不到手机号、微信号
- [ ] 经纪人登录后看不到社交账号
- [ ] 经纪人登录后看不到数据看板菜单
- [ ] 经纪人登录后看不到星探管理菜单
- [ ] 经纪人登录后看不到用户管理菜单
- [ ] 经纪人登录后看不到操作日志菜单
- [ ] 经纪人尝试访问受限页面时被重定向
- [ ] 管理员和HR登录后可以看到所有信息

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `cloudfunctions/admin/index.js` | 修改 | 新增数据脱敏函数 |
| `admin-web/src/views/candidates/list.vue` | 修改 | 根据角色显示/隐藏字段 |
| `admin-web/src/router/index.js` | 修改 | 添加路由权限控制 |
| `admin-web/src/layout/index.vue` | 修改 | 根据角色显示菜单 |

---

# 第二批：品牌升级（星探系统）

## 需求 7：星探命名升级

### 📌 需求描述

**当前命名**：
- 一级星探 (L1)
- 二级星探 (L2)

**新命名方案**：
- 一级星探 → **星探合伙人** (Senior Partner, SP)
- 二级星探 → **特约星探** (Special Scout, SS)

**特殊说明**：
- 当前所有星探均为**特约星探**（SS）
- 未来可以通过审核/升级成为**星探合伙人**（SP）

### 🔨 实施方案

#### 1. 数据库层面

**不需要修改数据结构**，只需要修改显示文案：
```javascript
// 层级映射
const LEVEL_LABELS = {
  1: {
    zh: '星探合伙人',
    en: 'Senior Partner',
    abbr: 'SP'
  },
  2: {
    zh: '特约星探',
    en: 'Special Scout',
    abbr: 'SS'
  }
};

// 使用示例
function getLevelLabel(depth) {
  return LEVEL_LABELS[depth]?.zh || '星探';
}
```

#### 2. 云函数文案更新

**修改 `cloudfunctions/scout/index.js`**：

```javascript
// 在返回数据时添加层级标签
function enrichScoutData(scout) {
  const levelDepth = scout.level?.depth || 2; // 默认为特约星探

  return {
    ...scout,
    levelLabel: {
      zh: levelDepth === 1 ? '星探合伙人' : '特约星探',
      en: levelDepth === 1 ? 'Senior Partner' : 'Special Scout',
      abbr: levelDepth === 1 ? 'SP' : 'SS'
    }
  };
}
```

#### 3. 小程序文案更新

**涉及页面**：

##### 3.1 星探注册页面
`miniprogram/pages/scout/register/register.wxml`

```xml
<!-- 修改前 -->
<view class="title">成为星探</view>

<!-- 修改后 -->
<view class="title">成为特约星探</view>
<view class="subtitle">Special Scout</view>

<!-- 邀请码说明 -->
<view class="invite-tip">
  填写邀请码后，你将成为该星探合伙人的团队成员
</view>
```

##### 3.2 星探工作台
`miniprogram/pages/scout/home/home.wxml`

```xml
<!-- 星探信息卡片 -->
<view class="scout-info">
  <view class="scout-name">{{ scoutInfo.profile.name }}</view>
  <view class="scout-level">
    {{ scoutInfo.level.depth === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)' }}
  </view>
</view>

<!-- 邀请码区域（只有星探合伙人显示） -->
<view wx:if="{{ scoutInfo.level.depth === 1 }}" class="invite-section">
  <view class="section-title">我的邀请码</view>
  <view class="invite-desc">邀请朋友成为特约星探</view>
  <!-- ... -->
</view>
```

##### 3.3 我的团队页面
`miniprogram/pages/scout/team/team.wxml`

```xml
<view class="my-info">
  <text class="name">{{ myInfo.name }}</text>
  <text class="level">星探合伙人 (SP)</text>
</view>

<view class="scouts-list">
  <view class="section-title">我的特约星探团队</view>
  <!-- ... -->
</view>
```

##### 3.4 经纪人查看候选人推荐信息
`miniprogram/pages/agent/candidate-detail/candidate-detail.wxml`

```xml
<view wx:if="{{ candidate.referral }}" class="info-block">
  <view class="info-block-title">星探推荐</view>

  <!-- 推荐链条 -->
  <view class="info-row" wx:if="{{ candidate.referral.scoutChainNames }}">
    <span class="info-label">推荐链条</span>
    <span class="info-value">
      {{ formatScoutChain(candidate.referral) }}
    </span>
  </view>
</view>
```

```javascript
// candidate-detail.js
formatScoutChain(referral) {
  const names = referral.scoutChainNames || [];
  const labels = names.map((name, index) => {
    const level = index === 0 ? 'SP' : 'SS';
    return `${name}(${level})`;
  });
  return labels.join(' → ');
}
```

#### 4. 管理后台文案更新

##### 4.1 星探管理页面
`admin-web/src/views/scouts/list.vue`

```vue
<template>
  <!-- 筛选标签 -->
  <el-radio-group v-model="filterLevel">
    <el-radio-button label="">全部</el-radio-button>
    <el-radio-button label="1">星探合伙人 (SP)</el-radio-button>
    <el-radio-button label="2">特约星探 (SS)</el-radio-button>
  </el-radio-group>

  <!-- 星探列表 -->
  <el-table :data="scouts">
    <el-table-column label="层级" width="150">
      <template slot-scope="{ row }">
        <el-tag
          :type="row.level.depth === 1 ? 'warning' : 'info'"
          size="small">
          {{ row.level.depth === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)' }}
        </el-tag>
      </template>
    </el-table-column>

    <!-- 上级星探 -->
    <el-table-column label="上级" width="150">
      <template slot-scope="{ row }">
        <span v-if="row.level.parentScoutName">
          {{ row.level.parentScoutName }} (SP)
        </span>
        <span v-else>-</span>
      </template>
    </el-table-column>
  </el-table>
</template>
```

##### 4.2 候选人详情 - 推荐链条
`admin-web/src/views/candidates/list.vue`

```vue
<!-- 星探推荐信息块 -->
<div class="info-block" v-if="currentCandidate.referral">
  <div class="info-block-title">星探推荐</div>

  <!-- 推荐链条 -->
  <div class="info-row" v-if="currentCandidate.referral.scoutChainNames">
    <span class="info-label">推荐链条</span>
    <span class="info-value">
      {{ formatScoutChain(currentCandidate.referral) }}
    </span>
  </div>

  <!-- 直接推荐人 -->
  <div class="info-row">
    <span class="info-label">直接推荐人</span>
    <span class="info-value">
      {{ currentCandidate.referral.scoutName }}
      ({{ currentCandidate.referral.scoutLevel === 1 ? '星探合伙人 SP' : '特约星探 SS' }})
    </span>
  </div>
</div>
```

```javascript
methods: {
  formatScoutChain(referral) {
    const names = referral.scoutChainNames || [];
    return names.map((name, index) => {
      const label = index === 0 ? 'SP' : 'SS';
      return `${name}(${label})`;
    }).join(' → ');
  }
}
```

#### 5. 创建工具函数（可选）

**新建 `miniprogram/utils/scout-level.js`**：

```javascript
/**
 * 星探层级工具函数
 */

// 层级配置
export const SCOUT_LEVELS = {
  1: {
    zh: '星探合伙人',
    en: 'Senior Partner',
    abbr: 'SP',
    color: 'warning'
  },
  2: {
    zh: '特约星探',
    en: 'Special Scout',
    abbr: 'SS',
    color: 'info'
  }
};

/**
 * 获取层级标签
 * @param {number} depth - 层级深度
 * @param {string} format - 格式：'full'|'abbr'|'zh'|'en'
 */
export function getLevelLabel(depth, format = 'full') {
  const level = SCOUT_LEVELS[depth] || SCOUT_LEVELS[2];

  switch (format) {
    case 'full':
      return `${level.zh} (${level.abbr})`;
    case 'abbr':
      return level.abbr;
    case 'zh':
      return level.zh;
    case 'en':
      return level.en;
    default:
      return level.zh;
  }
}

/**
 * 获取层级颜色（用于标签）
 */
export function getLevelColor(depth) {
  return SCOUT_LEVELS[depth]?.color || 'info';
}
```

### ✅ 验证标准

- [ ] 小程序所有页面文案已更新
- [ ] 管理后台所有页面文案已更新
- [ ] 推荐链条显示正确的层级标签
- [ ] 邀请码说明文案已更新
- [ ] 星探列表筛选标签已更新
- [ ] 所有"一级星探"改为"星探合伙人 (SP)"
- [ ] 所有"二级星探"改为"特约星探 (SS)"

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `miniprogram/utils/scout-level.js` | 新增 | 星探层级工具函数 |
| `miniprogram/pages/scout/register/register.wxml` | 修改 | 注册页文案 |
| `miniprogram/pages/scout/home/home.wxml` | 修改 | 工作台文案 |
| `miniprogram/pages/scout/team/team.wxml` | 修改 | 团队页文案 |
| `miniprogram/pages/agent/candidate-detail/candidate-detail.*` | 修改 | 推荐信息显示 |
| `admin-web/src/views/scouts/list.vue` | 修改 | 星探管理文案 |
| `admin-web/src/views/candidates/list.vue` | 修改 | 推荐链条文案 |
| `cloudfunctions/scout/index.js` | 修改 | 添加层级标签 |

---

## 需求 8：星探层级手动调整

### 📌 需求描述

管理员可以手动调整星探的层级：
- 将优秀的"特约星探"（SS）升级为"星探合伙人"（SP）
- 将不活跃的"星探合伙人"（SP）降级为"特约星探"（SS）

**注意事项**：
- 降级星探合伙人时，其下级星探怎么处理？
  - 方案A：同时降级所有下级（不推荐，影响范围大）
  - 方案B：下级星探保持不变，但失去上级关系（推荐）
- 升级特约星探时，需要生成邀请码

### 🎨 UI 设计

**星探管理页面** (`admin-web/src/views/scouts/list.vue`)

```
星探详情弹窗：
┌────────────────────────────────────┐
│  星探详情                 [编辑层级] │
├────────────────────────────────────┤
│  姓名：张三                         │
│  当前层级：特约星探 (SS)            │
│  推荐码：ABC123                     │
│  邀请码：-（特约星探无邀请码）       │
├────────────────────────────────────┤
│  推荐统计：                         │
│  • 总推荐：15人                     │
│  • 已签约：5人                      │
└────────────────────────────────────┘

点击"编辑层级"后：
┌────────────────────────────┐
│  调整星探层级               │
├────────────────────────────┤
│  当前层级：特约星探 (SS)     │
│                            │
│  调整为：                   │
│  ○ 特约星探 (SS)           │
│  ○ 星探合伙人 (SP)         │
├────────────────────────────┤
│  说明：                     │
│  • 升级为星探合伙人后将获得  │
│    邀请码，可以邀请下级      │
│  • 升级不影响现有推荐数据    │
├────────────────────────────┤
│      [取消]    [确认调整]   │
└────────────────────────────┘
```

### 🔨 实施方案

#### 1. 前端实现

**星探详情弹窗添加编辑层级功能**：

```vue
<template>
  <el-dialog title="星探详情" :visible.sync="showDetail">
    <!-- 星探信息 -->
    <div class="scout-info">
      <div class="info-row">
        <span class="label">姓名</span>
        <span class="value">{{ currentScout.profile.name }}</span>
      </div>

      <div class="info-row">
        <span class="label">当前层级</span>
        <span class="value">
          <el-tag :type="currentScout.level.depth === 1 ? 'warning' : 'info'">
            {{ getLevelLabel(currentScout.level.depth) }}
          </el-tag>
          <el-button
            v-if="userRole === 'admin'"
            type="text"
            size="mini"
            @click="showLevelEdit = true">
            编辑层级
          </el-button>
        </span>
      </div>

      <div class="info-row">
        <span class="label">推荐码</span>
        <span class="value">{{ currentScout.shareCode }}</span>
      </div>

      <div class="info-row">
        <span class="label">邀请码</span>
        <span class="value">
          {{ currentScout.inviteCode || '-（特约星探无邀请码）' }}
        </span>
      </div>

      <!-- 如果是星探合伙人，显示下级统计 -->
      <div v-if="currentScout.level.depth === 1" class="info-row">
        <span class="label">下级星探</span>
        <span class="value">{{ currentScout.team.directScouts }} 人</span>
      </div>
    </div>

    <!-- 层级编辑弹窗 -->
    <el-dialog
      title="调整星探层级"
      :visible.sync="showLevelEdit"
      append-to-body
      width="400px">
      <div class="level-edit-form">
        <div class="current-level">
          当前层级：
          <el-tag>{{ getLevelLabel(currentScout.level.depth) }}</el-tag>
        </div>

        <el-form :model="levelForm" style="margin-top: 20px;">
          <el-form-item label="调整为">
            <el-radio-group v-model="levelForm.newDepth">
              <el-radio :label="2">特约星探 (SS)</el-radio>
              <el-radio :label="1">星探合伙人 (SP)</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 降级警告 -->
          <el-alert
            v-if="currentScout.level.depth === 1 && levelForm.newDepth === 2"
            type="warning"
            :closable="false"
            style="margin-bottom: 15px;">
            <div>降级为特约星探后：</div>
            <ul style="margin: 5px 0 0 20px; padding: 0;">
              <li>将失去邀请码，无法再邀请下级</li>
              <li>现有下级星探（{{ currentScout.team.directScouts }}人）将失去上级关系</li>
              <li>推荐数据不受影响</li>
            </ul>
          </el-alert>

          <!-- 升级提示 -->
          <el-alert
            v-if="currentScout.level.depth === 2 && levelForm.newDepth === 1"
            type="success"
            :closable="false"
            style="margin-bottom: 15px;">
            <div>升级为星探合伙人后：</div>
            <ul style="margin: 5px 0 0 20px; padding: 0;">
              <li>将自动获得邀请码</li>
              <li>可以邀请特约星探加入团队</li>
              <li>推荐数据不受影响</li>
            </ul>
          </el-alert>

          <el-form-item label="调整原因">
            <el-input
              v-model="levelForm.reason"
              type="textarea"
              :rows="3"
              placeholder="请输入调整原因（选填）"
            />
          </el-form-item>
        </el-form>
      </div>

      <span slot="footer">
        <el-button @click="showLevelEdit = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmLevelChange"
          :disabled="levelForm.newDepth === currentScout.level.depth">
          确认调整
        </el-button>
      </span>
    </el-dialog>
  </el-dialog>
</template>

<script>
export default {
  data() {
    return {
      showDetail: false,
      showLevelEdit: false,
      currentScout: null,
      levelForm: {
        newDepth: 2,
        reason: ''
      }
    };
  },
  methods: {
    // 打开层级编辑
    openLevelEdit(scout) {
      this.currentScout = scout;
      this.levelForm.newDepth = scout.level.depth;
      this.showLevelEdit = true;
    },

    // 确认层级调整
    async confirmLevelChange() {
      try {
        const res = await this.$api.updateScoutLevel({
          scoutId: this.currentScout._id,
          newDepth: this.levelForm.newDepth,
          reason: this.levelForm.reason
        });

        this.$message.success('层级调整成功');
        this.showLevelEdit = false;
        this.loadScouts(); // 刷新列表
      } catch (error) {
        this.$message.error('层级调整失败：' + error.message);
      }
    },

    getLevelLabel(depth) {
      return depth === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)';
    }
  }
};
</script>
```

#### 2. API 接口

**新增接口** (`admin-web/src/api/admin.js`)：

```javascript
// 更新星探层级
export function updateScoutLevel(data) {
  return request({
    url: '/admin/scouts/update-level',
    method: 'post',
    data
  });
}
```

#### 3. 云函数实现

**扩展 admin 云函数** (`cloudfunctions/admin/index.js`)：

```javascript
case 'updateScoutLevel':
  return await updateScoutLevel(data, adminInfo);

// 更新星探层级
async function updateScoutLevel(data, adminInfo) {
  const { scoutId, newDepth, reason } = data;

  // 权限检查 - 只有管理员可以调整
  if (adminInfo.role !== 'admin') {
    return { success: false, error: '只有管理员可以调整星探层级' };
  }

  // 验证新层级
  if (![1, 2].includes(newDepth)) {
    return { success: false, error: '无效的层级' };
  }

  // 获取星探当前信息
  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  const scout = scoutRes.data;
  const oldDepth = scout.level?.depth || 2;

  // 如果层级没有变化
  if (oldDepth === newDepth) {
    return { success: false, error: '层级未发生变化' };
  }

  const updateData = {
    'level.depth': newDepth,
    updatedAt: db.serverDate()
  };

  // 情况1：升级为星探合伙人（SS → SP）
  if (oldDepth === 2 && newDepth === 1) {
    // 生成邀请码
    let inviteCode = '';
    let retryCount = 0;
    while (retryCount < 10) {
      inviteCode = generateInviteCode();
      const checkRes = await db.collection('scouts').where({
        inviteCode: inviteCode
      }).get();
      if (checkRes.data.length === 0) break;
      retryCount++;
    }

    if (retryCount >= 10) {
      return { success: false, error: '生成邀请码失败' };
    }

    updateData.inviteCode = inviteCode;

    // 如果原来有上级，需要解除上级关系
    if (scout.level?.parentScoutId) {
      updateData['level.parentScoutId'] = null;
      updateData['level.parentScoutName'] = '';
      updateData['level.parentInviteCode'] = '';

      // 更新原上级的下级统计
      await db.collection('scouts').doc(scout.level.parentScoutId).update({
        data: {
          'team.directScouts': _.inc(-1),
          'team.totalScouts': _.inc(-1),
          updatedAt: db.serverDate()
        }
      });
    }
  }

  // 情况2：降级为特约星探（SP → SS）
  if (oldDepth === 1 && newDepth === 2) {
    // 移除邀请码
    updateData.inviteCode = null;

    // 处理下级星探
    if (scout.team?.directScouts > 0) {
      // 查找所有下级星探
      const childrenRes = await db.collection('scouts').where({
        'level.parentScoutId': scoutId
      }).get();

      // 解除所有下级的上级关系
      const batch = db.batch();
      for (const child of childrenRes.data) {
        // 特约星探变为独立星探，升级为星探合伙人
        const childInviteCode = generateInviteCode();
        batch.update(db.collection('scouts').doc(child._id), {
          data: {
            'level.depth': 1,
            'level.parentScoutId': null,
            'level.parentScoutName': '',
            'level.parentInviteCode': '',
            inviteCode: childInviteCode,
            updatedAt: db.serverDate()
          }
        });
      }
      await batch.commit();
    }

    // 清空团队统计
    updateData['team.directScouts'] = 0;
    updateData['team.totalScouts'] = 0;
  }

  // 更新星探信息
  await db.collection('scouts').doc(scoutId).update({
    data: updateData
  });

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: 'update_scout_level',
    target: scoutId,
    details: {
      scoutName: scout.profile.name,
      oldLevel: oldDepth === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)',
      newLevel: newDepth === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)',
      reason: reason || '无'
    }
  });

  return {
    success: true,
    message: '层级调整成功',
    inviteCode: updateData.inviteCode || null
  };
}

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

### ✅ 验证标准

- [ ] 管理员可以看到"编辑层级"按钮
- [ ] 非管理员看不到"编辑层级"按钮
- [ ] 升级SS为SP时，自动生成邀请码
- [ ] 降级SP为SS时，移除邀请码
- [ ] 降级SP为SS时，下级星探自动升级为SP
- [ ] 层级调整记录到操作日志
- [ ] 调整后星探列表正确显示新层级
- [ ] 调整后推荐链条正确显示新层级

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `admin-web/src/views/scouts/list.vue` | 修改 | 添加层级编辑功能 |
| `admin-web/src/api/admin.js` | 修改 | 新增更新层级接口 |
| `cloudfunctions/admin/index.js` | 修改 | 新增层级调整云函数 |

---

## 需求 6：星探删除功能

### 📌 需求描述

管理后台星探管理页面需要支持删除星探功能。

**注意事项**：
- 使用"软删除"，不真正删除数据
- 删除后星探无法登录
- 删除后推荐的候选人数据保留
- 如果是星探合伙人，删除前需要处理下级星探

### 🎨 UI 设计

```
星探列表页面：
┌────────────────────────────────────────────────┐
│  姓名  | 层级  | 推荐数 | 状态   | 操作        │
├────────────────────────────────────────────────┤
│  张三  | SP   | 15人   | 活跃   | [详情] [删除] │
│  李四  | SS   | 8人    | 活跃   | [详情] [删除] │
│  王五  | SP   | 3人    | 已停用 | [详情] [恢复] │
└────────────────────────────────────────────────┘

点击"删除"后：
┌────────────────────────────┐
│  确认删除星探               │
├────────────────────────────┤
│  确定要删除星探 张三 吗？    │
│                            │
│  ⚠️ 注意：                 │
│  • 该星探将无法登录         │
│  • 推荐的候选人数据保留     │
│  • 该星探有3个下级，删除后  │
│    下级将自动升级为星探合伙人│
├────────────────────────────┤
│      [取消]    [确认删除]   │
└────────────────────────────┘
```

### 🔨 实施方案

#### 1. 前端实现

**星探列表添加删除按钮**：

```vue
<template>
  <el-table :data="scouts">
    <!-- ... 其他列 ... -->

    <el-table-column label="操作" width="150">
      <template slot-scope="{ row }">
        <el-button type="text" size="small" @click="viewDetail(row)">
          详情
        </el-button>

        <el-button
          v-if="row.status === 'active'"
          type="text"
          size="small"
          style="color: #f56c6c;"
          @click="confirmDelete(row)">
          删除
        </el-button>

        <el-button
          v-if="row.status === 'deleted'"
          type="text"
          size="small"
          style="color: #67c23a;"
          @click="confirmRestore(row)">
          恢复
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
export default {
  methods: {
    // 确认删除
    confirmDelete(scout) {
      const hasChildren = scout.level.depth === 1 && scout.team.directScouts > 0;

      let message = `确定要删除星探 ${scout.profile.name} 吗？`;
      if (hasChildren) {
        message += `\n\n该星探有 ${scout.team.directScouts} 个下级星探，删除后下级将自动升级为星探合伙人。`;
      }

      this.$confirm(message, '确认删除', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }).then(async () => {
        try {
          await this.$api.deleteScout({ scoutId: scout._id });
          this.$message.success('删除成功');
          this.loadScouts();
        } catch (error) {
          this.$message.error('删除失败：' + error.message);
        }
      }).catch(() => {});
    },

    // 确认恢复
    confirmRestore(scout) {
      this.$confirm(`确定要恢复星探 ${scout.profile.name} 吗？`, '确认恢复', {
        type: 'info',
        confirmButtonText: '确认恢复',
        cancelButtonText: '取消'
      }).then(async () => {
        try {
          await this.$api.restoreScout({ scoutId: scout._id });
          this.$message.success('恢复成功');
          this.loadScouts();
        } catch (error) {
          this.$message.error('恢复失败：' + error.message);
        }
      }).catch(() => {});
    }
  }
};
</script>
```

#### 2. API 接口

**新增接口** (`admin-web/src/api/admin.js`)：

```javascript
// 删除星探（软删除）
export function deleteScout(data) {
  return request({
    url: '/admin/scouts/delete',
    method: 'post',
    data
  });
}

// 恢复星探
export function restoreScout(data) {
  return request({
    url: '/admin/scouts/restore',
    method: 'post',
    data
  });
}
```

#### 3. 云函数实现

**扩展 admin 云函数** (`cloudfunctions/admin/index.js`)：

```javascript
case 'deleteScout':
  return await deleteScout(data, adminInfo);
case 'restoreScout':
  return await restoreScout(data, adminInfo);

// 删除星探（软删除）
async function deleteScout(data, adminInfo) {
  const { scoutId } = data;

  // 权限检查
  if (!hasPermission(adminInfo.role, 'deleteScout')) {
    return { success: false, error: '无权限操作' };
  }

  // 获取星探信息
  const scoutRes = await db.collection('scouts').doc(scoutId).get();
  if (!scoutRes.data) {
    return { success: false, error: '星探不存在' };
  }

  const scout = scoutRes.data;

  // 软删除星探
  await db.collection('scouts').doc(scoutId).update({
    data: {
      status: 'deleted',
      deletedAt: db.serverDate(),
      deletedBy: adminInfo._id,
      updatedAt: db.serverDate()
    }
  });

  // 如果是星探合伙人，处理下级星探
  if (scout.level.depth === 1 && scout.team.directScouts > 0) {
    const childrenRes = await db.collection('scouts').where({
      'level.parentScoutId': scoutId
    }).get();

    const batch = db.batch();
    for (const child of childrenRes.data) {
      // 下级星探升级为星探合伙人
      const childInviteCode = generateInviteCode();
      batch.update(db.collection('scouts').doc(child._id), {
        data: {
          'level.depth': 1,
          'level.parentScoutId': null,
          'level.parentScoutName': '',
          'level.parentInviteCode': '',
          inviteCode: childInviteCode,
          updatedAt: db.serverDate()
        }
      });
    }
    await batch.commit();
  }

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: 'delete_scout',
    target: scoutId,
    details: {
      scoutName: scout.profile.name,
      scoutLevel: scout.level.depth,
      hadChildren: scout.team?.directScouts > 0
    }
  });

  return {
    success: true,
    message: '删除成功'
  };
}

// 恢复星探
async function restoreScout(data, adminInfo) {
  const { scoutId } = data;

  // 权限检查
  if (!hasPermission(adminInfo.role, 'deleteScout')) {
    return { success: false, error: '无权限操作' };
  }

  // 恢复星探
  await db.collection('scouts').doc(scoutId).update({
    data: {
      status: 'active',
      deletedAt: _.remove(),
      deletedBy: _.remove(),
      updatedAt: db.serverDate()
    }
  });

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: 'restore_scout',
    target: scoutId,
    details: {}
  });

  return {
    success: true,
    message: '恢复成功'
  };
}
```

### ✅ 验证标准

- [ ] 删除按钮仅管理员可见
- [ ] 点击删除显示确认弹窗
- [ ] 有下级时提示下级处理方式
- [ ] 删除成功后状态变为"已停用"
- [ ] 已停用星探显示"恢复"按钮
- [ ] 恢复成功后状态变为"活跃"
- [ ] 删除后星探无法登录
- [ ] 推荐的候选人数据保留
- [ ] 操作记录到日志

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `admin-web/src/views/scouts/list.vue` | 修改 | 添加删除/恢复按钮 |
| `admin-web/src/api/admin.js` | 修改 | 新增删除/恢复接口 |
| `cloudfunctions/admin/index.js` | 修改 | 新增删除/恢复云函数 |

---

# 第三批：功能增强与体验优化

## 需求 3：试镜视频上传功能

### 📌 需求描述

经纪人小程序端需要增加试镜视频上传功能，区别于现有的"面试资料上传"。

**业务场景**：
- 面试资料：候选人面试时的照片和视频（已有功能）
- 试镜视频：专业的试镜表演视频，用于进一步评估

**功能要求**：
- 支持拍摄或选择视频
- 单个视频最大 100MB
- 最多上传 3 个试镜视频
- 显示上传进度
- 支持预览和删除

### 🎨 UI 设计

**候选人详情页添加入口** (`miniprogram/pages/agent/candidate-detail/`)

```
┌──────────────────────────────┐
│  候选人详情                   │
├──────────────────────────────┤
│  基本信息                     │
│  ...                         │
├──────────────────────────────┤
│  面试资料                     │
│  照片：3张  视频：1个         │
│  [查看资料]                   │
├──────────────────────────────┤
│  🆕 试镜视频                 │
│  已上传：0个                  │
│  [上传试镜视频]               │
└──────────────────────────────┘
```

**试镜视频上传页面** (`miniprogram/pages/agent/upload-audition/`)

```
┌──────────────────────────────┐
│  上传试镜视频                 │
├──────────────────────────────┤
│  候选人：张三（22岁）         │
├──────────────────────────────┤
│  试镜视频（最多3个）          │
│                              │
│  ┌────────┐  ┌────────┐     │
│  │ [播放]  │  │  📹   │     │
│  │ 视频1   │  │ 点击录制│    │
│  │ 30秒    │  │ 或选择  │    │
│  │ [删除]  │  │        │    │
│  └────────┘  └────────┘     │
│                              │
│  说明：                       │
│  • 每个视频不超过100MB        │
│  • 建议时长：30秒-2分钟       │
│  • 内容：才艺展示、自我介绍等 │
├──────────────────────────────┤
│         [提交上传]            │
└──────────────────────────────┘
```

### 🔨 实施方案

#### 1. 新建试镜视频上传页面

**创建文件**：
- `miniprogram/pages/agent/upload-audition/upload-audition.wxml`
- `miniprogram/pages/agent/upload-audition/upload-audition.wxss`
- `miniprogram/pages/agent/upload-audition/upload-audition.js`
- `miniprogram/pages/agent/upload-audition/upload-audition.json`

**WXML**：
```xml
<view class="upload-audition-page">
  <!-- 候选人信息 -->
  <view class="candidate-info">
    <text class="name">{{ candidate.basicInfo.name }}</text>
    <text class="age">{{ candidate.basicInfo.age }}岁</text>
  </view>

  <!-- 视频列表 -->
  <view class="videos-section">
    <view class="section-title">试镜视频（最多3个）</view>

    <view class="videos-grid">
      <!-- 已上传的视频 -->
      <view
        wx:for="{{ auditionVideos }}"
        wx:key="index"
        class="video-item">
        <video
          src="{{ item.tempUrl || item.url }}"
          class="video-preview"
          controls>
        </video>
        <view class="video-info">
          <text class="duration">{{ formatDuration(item.duration) }}</text>
          <button
            class="delete-btn"
            size="mini"
            bindtap="deleteVideo"
            data-index="{{ index }}">
            删除
          </button>
        </view>

        <!-- 上传进度 -->
        <view wx:if="{{ item.uploading }}" class="upload-progress">
          <progress percent="{{ item.progress }}" stroke-width="4" />
          <text>{{ item.progress }}%</text>
        </view>
      </view>

      <!-- 添加视频按钮 -->
      <view
        wx:if="{{ auditionVideos.length < 3 }}"
        class="add-video-btn"
        bindtap="chooseVideo">
        <text class="icon">📹</text>
        <text class="text">录制或选择视频</text>
      </view>
    </view>
  </view>

  <!-- 说明 -->
  <view class="tips">
    <view class="tip-item">• 每个视频不超过100MB</view>
    <view class="tip-item">• 建议时长：30秒-2分钟</view>
    <view class="tip-item">• 内容：才艺展示、自我介绍等</view>
  </view>

  <!-- 提交按钮 -->
  <view class="submit-section">
    <button
      class="submit-btn"
      type="primary"
      bindtap="submitUpload"
      :disabled="{{ auditionVideos.length === 0 || uploading }}">
      {{ uploading ? '上传中...' : '提交上传' }}
    </button>
  </view>
</view>
```

**JS**：
```javascript
const AgentAPI = require('../../../utils/agent-api');

Page({
  data: {
    candidateId: '',
    candidate: null,
    auditionVideos: [],
    uploading: false
  },

  onLoad(options) {
    this.setData({
      candidateId: options.id
    });
    this.loadCandidate();
    this.loadAuditionVideos();
  },

  // 加载候选人信息
  async loadCandidate() {
    try {
      const candidate = await AgentAPI.getCandidateDetail(this.data.candidateId);
      this.setData({ candidate });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 加载已上传的试镜视频
  async loadAuditionVideos() {
    try {
      const videos = await AgentAPI.getAuditionVideos(this.data.candidateId);
      this.setData({ auditionVideos: videos || [] });
    } catch (error) {
      console.error('加载试镜视频失败:', error);
    }
  },

  // 选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 3 - this.data.auditionVideos.length,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 120, // 最长2分钟
      camera: 'back',
      success: (res) => {
        const videos = res.tempFiles.map(file => {
          // 检查文件大小
          if (file.size > 100 * 1024 * 1024) {
            wx.showToast({
              title: '视频超过100MB',
              icon: 'error'
            });
            return null;
          }

          return {
            tempUrl: file.tempFilePath,
            size: file.size,
            duration: file.duration,
            uploading: false,
            progress: 0
          };
        }).filter(v => v !== null);

        this.setData({
          auditionVideos: [...this.data.auditionVideos, ...videos]
        });
      }
    });
  },

  // 删除视频
  deleteVideo(e) {
    const index = e.currentTarget.dataset.index;
    const videos = [...this.data.auditionVideos];
    videos.splice(index, 1);
    this.setData({ auditionVideos: videos });
  },

  // 提交上传
  async submitUpload() {
    if (this.data.auditionVideos.length === 0) {
      wx.showToast({
        title: '请先选择视频',
        icon: 'error'
      });
      return;
    }

    this.setData({ uploading: true });

    try {
      // 上传所有视频到云存储
      const uploadedVideos = [];

      for (let i = 0; i < this.data.auditionVideos.length; i++) {
        const video = this.data.auditionVideos[i];

        // 如果已经上传过（有url），跳过
        if (video.url) {
          uploadedVideos.push(video);
          continue;
        }

        // 更新上传状态
        this.setData({
          [`auditionVideos[${i}].uploading`]: true
        });

        // 上传到云存储
        const cloudPath = `audition/${this.data.candidateId}/video_${Date.now()}_${i}.mp4`;

        const uploadTask = wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: video.tempUrl
        });

        // 监听上传进度
        uploadTask.onProgressUpdate((res) => {
          this.setData({
            [`auditionVideos[${i}].progress`]: res.progress
          });
        });

        const uploadRes = await uploadTask;

        uploadedVideos.push({
          url: uploadRes.fileID,
          size: video.size,
          duration: video.duration,
          uploadedAt: new Date().toISOString()
        });

        this.setData({
          [`auditionVideos[${i}].uploading`]: false,
          [`auditionVideos[${i}].url`]: uploadRes.fileID
        });
      }

      // 调用云函数保存
      await AgentAPI.uploadAuditionVideos(
        this.data.candidateId,
        uploadedVideos
      );

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('上传失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'error'
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 格式化时长
  formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
});
```

#### 2. Agent API 扩展

**新增方法** (`miniprogram/utils/agent-api.js`)：

```javascript
// 获取试镜视频列表
async getAuditionVideos(candidateId) {
  const res = await callAdminFunction('getAuditionVideos', {
    candidateId
  });
  return res.videos;
},

// 上传试镜视频
async uploadAuditionVideos(candidateId, videos) {
  return await callAdminFunction('uploadAuditionVideos', {
    candidateId,
    videos
  });
}
```

#### 3. 云函数实现

**扩展 admin 云函数** (`cloudfunctions/admin/index.js`)：

```javascript
case 'getAuditionVideos':
  return await getAuditionVideos(data, adminInfo);
case 'uploadAuditionVideos':
  return await uploadAuditionVideos(data, adminInfo);

// 获取试镜视频
async function getAuditionVideos(data, adminInfo) {
  const { candidateId } = data;

  // 获取候选人信息
  const candidateRes = await db.collection('candidates').doc(candidateId).get();
  if (!candidateRes.data) {
    return { success: false, error: '候选人不存在' };
  }

  const candidate = candidateRes.data;

  // 权限检查：经纪人只能查看分配给自己的候选人
  if (adminInfo.role === 'agent') {
    if (candidate.assignedAgent?.agentId !== adminInfo._id) {
      return { success: false, error: '无权限查看' };
    }
  }

  return {
    success: true,
    videos: candidate.audition?.videos || []
  };
}

// 上传试镜视频
async function uploadAuditionVideos(data, adminInfo) {
  const { candidateId, videos } = data;

  // 权限检查
  if (adminInfo.role === 'agent') {
    const candidateRes = await db.collection('candidates').doc(candidateId).get();
    if (!candidateRes.data || candidateRes.data.assignedAgent?.agentId !== adminInfo._id) {
      return { success: false, error: '无权限操作' };
    }
  }

  // 更新候选人记录
  await db.collection('candidates').doc(candidateId).update({
    data: {
      audition: {
        videos: videos,
        uploadedBy: adminInfo._id,
        uploadedByName: adminInfo.username,
        uploadedAt: db.serverDate()
      },
      updatedAt: db.serverDate()
    }
  });

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: 'upload_audition_videos',
    target: candidateId,
    details: {
      videoCount: videos.length
    }
  });

  return {
    success: true,
    message: '上传成功'
  };
}
```

#### 4. 候选人详情页添加入口

**修改** `miniprogram/pages/agent/candidate-detail/candidate-detail.wxml`：

```xml
<!-- 试镜视频区块 -->
<view class="info-block">
  <view class="info-block-title">试镜视频</view>

  <view wx:if="{{ candidate.audition && candidate.audition.videos.length > 0 }}" class="audition-info">
    <text>已上传：{{ candidate.audition.videos.length }} 个视频</text>
    <button size="mini" bindtap="viewAuditionVideos">查看视频</button>
  </view>

  <view wx:else class="audition-info">
    <text>暂无试镜视频</text>
  </view>

  <button
    class="upload-btn"
    size="small"
    bindtap="uploadAudition">
    上传试镜视频
  </button>
</view>
```

```javascript
// candidate-detail.js
uploadAudition() {
  wx.navigateTo({
    url: `/pages/agent/upload-audition/upload-audition?id=${this.data.candidateId}`
  });
}
```

### ✅ 验证标准

- [ ] 候选人详情页显示试镜视频区块
- [ ] 点击"上传试镜视频"进入上传页面
- [ ] 可以录制视频或从相册选择
- [ ] 超过100MB的视频提示错误
- [ ] 最多上传3个视频
- [ ] 显示上传进度
- [ ] 可以删除未上传的视频
- [ ] 上传成功后数据库保存
- [ ] 管理后台可以查看试镜视频

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `miniprogram/pages/agent/upload-audition/*` | 新增 | 试镜视频上传页面（4个文件） |
| `miniprogram/pages/agent/candidate-detail/*` | 修改 | 添加试镜视频入口 |
| `miniprogram/utils/agent-api.js` | 修改 | 新增试镜视频API |
| `cloudfunctions/admin/index.js` | 修改 | 新增试镜视频云函数 |
| `miniprogram/app.json` | 修改 | 注册新页面 |

---

## 需求 4：用户申请审核制

### 📌 需求描述

**当前问题**：
- 用户可能是管理员手动创建
- 缺少用户申请审核流程

**优化目标**：
- 用户自己填写申请信息（用户名、姓名、密码）
- 管理员审核并分配角色
- 审核通过后用户才能登录

### 🎨 UI 设计

#### 用户申请页面（新建）

```
┌────────────────────────────┐
│  申请成为管理员              │
├────────────────────────────┤
│  用户名 *                   │
│  ┌──────────────────────┐  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│  姓名 *                     │
│  ┌──────────────────────┐  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│  密码 *                     │
│  ┌──────────────────────┐  │
│  │ ••••••••            │  │
│  └──────────────────────┘  │
│                            │
│  确认密码 *                 │
│  ┌──────────────────────┐  │
│  │ ••••••••            │  │
│  └──────────────────────┘  │
│                            │
│  申请理由                   │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │                      │  │
│  └──────────────────────┘  │
├────────────────────────────┤
│         [提交申请]          │
└────────────────────────────┘
```

#### 用户管理页面（管理后台）

```
┌──────────────────────────────────────────────┐
│  用户管理            [待审核(3)] [全部]       │
├──────────────────────────────────────────────┤
│  用户名  | 姓名  | 角色     | 状态   | 操作  │
├──────────────────────────────────────────────┤
│  zhangsan| 张三  | 待分配   | 待审核 | [审核] │
│  lisi    | 李四  | 待分配   | 待审核 | [审核] │
│  wangwu  | 王五  | HR      | 已通过 | [编辑] │
│  zhaoliu | 赵六  | 经纪人  | 已通过 | [编辑] │
└──────────────────────────────────────────────┘

点击"审核"后：
┌────────────────────────────┐
│  审核用户申请               │
├────────────────────────────┤
│  用户名：zhangsan           │
│  姓名：张三                 │
│  申请时间：2026-03-10       │
│  申请理由：希望成为HR...    │
├────────────────────────────┤
│  分配角色：                 │
│  ○ 管理员 (admin)          │
│  ○ HR (hr)                 │
│  ○ 经纪人 (agent)          │
│  ○ 运营 (operations)       │
│  ○ 培训师 (trainer)        │
├────────────────────────────┤
│  审核备注（选填）：          │
│  ┌──────────────────────┐  │
│  │                      │  │
│  └──────────────────────┘  │
├────────────────────────────┤
│    [拒绝]       [通过]     │
└────────────────────────────┘
```

### 🔨 实施方案

#### 1. 数据库设计

**admins 集合添加字段**：

```javascript
{
  _id: "admin_id",
  username: "zhangsan",
  password: "hashed_password",
  name: "张三",
  role: "pending", // pending | admin | hr | agent | operations | trainer

  // 🆕 申请信息
  application: {
    reason: "申请理由",
    appliedAt: serverDate(),
    status: "pending" // pending | approved | rejected
  },

  // 🆕 审核信息
  review: {
    reviewedBy: "admin_id",
    reviewedByName: "管理员",
    reviewedAt: serverDate(),
    reviewNote: "审核备注",
    assignedRole: "hr"
  },

  status: "pending", // pending | active | inactive
  createdAt: serverDate(),
  updatedAt: serverDate()
}
```

#### 2. 用户申请页面（简化方案）

**方案A：独立小程序页面**（推荐）
- 创建一个简单的申请页面
- 提交后显示"申请已提交，等待审核"
- 审核通过后才能登录管理后台

**方案B：管理后台申请页面**
- 在登录页添加"申请账号"按钮
- 跳转到申请页面填写信息
- 提交后返回登录页

这里采用**方案B**，在管理后台实现。

**创建申请页面** (`admin-web/src/views/apply/index.vue`)：

```vue
<template>
  <div class="apply-page">
    <div class="apply-container">
      <h2>申请成为管理员</h2>

      <el-form :model="form" :rules="rules" ref="form" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名（4-20位字母数字）"
          />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入真实姓名" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="申请理由" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="4"
            placeholder="请简要说明申请理由"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitApply" :loading="submitting">
            提交申请
          </el-button>
          <el-button @click="goBack">返回登录</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
import { applyAccount } from '@/api/admin';

export default {
  data() {
    // 确认密码验证
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.form.password) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };

    return {
      form: {
        username: '',
        name: '',
        password: '',
        confirmPassword: '',
        reason: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 4, max: 20, message: '用户名长度4-20位', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9]+$/, message: '用户名只能包含字母和数字', trigger: 'blur' }
        ],
        name: [
          { required: true, message: '请输入姓名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请确认密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ],
        reason: [
          { required: true, message: '请填写申请理由', trigger: 'blur' }
        ]
      },
      submitting: false
    };
  },
  methods: {
    async submitApply() {
      this.$refs.form.validate(async (valid) => {
        if (!valid) return;

        this.submitting = true;
        try {
          await applyAccount({
            username: this.form.username,
            name: this.form.name,
            password: this.form.password,
            reason: this.form.reason
          });

          this.$message.success('申请已提交，请等待管理员审核');
          setTimeout(() => {
            this.$router.push('/login');
          }, 1500);
        } catch (error) {
          this.$message.error('申请失败：' + error.message);
        } finally {
          this.submitting = false;
        }
      });
    },

    goBack() {
      this.$router.push('/login');
    }
  }
};
</script>
```

**修改登录页** (`admin-web/src/views/login/index.vue`)：

```vue
<template>
  <div class="login-page">
    <!-- ... 登录表单 ... -->

    <div class="apply-link">
      <el-button type="text" @click="goToApply">申请账号</el-button>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    goToApply() {
      this.$router.push('/apply');
    }
  }
};
</script>
```

#### 3. 用户管理页面

**创建/修改** (`admin-web/src/views/users/list.vue`)：

```vue
<template>
  <div class="users-page">
    <!-- 顶部筛选 -->
    <div class="header">
      <el-radio-group v-model="filterStatus" @change="loadUsers">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="pending">
          待审核 <el-badge v-if="pendingCount > 0" :value="pendingCount" />
        </el-radio-button>
        <el-radio-button label="active">已通过</el-radio-button>
        <el-radio-button label="rejected">已拒绝</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 用户列表 -->
    <el-table :data="users" v-loading="loading">
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="name" label="姓名" width="120" />

      <el-table-column label="角色" width="120">
        <template slot-scope="{ row }">
          <el-tag v-if="row.role === 'pending'" type="info">待分配</el-tag>
          <el-tag v-else :type="getRoleType(row.role)">
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template slot-scope="{ row }">
          <el-tag
            :type="row.status === 'active' ? 'success' :
                   row.status === 'pending' ? 'warning' : 'danger'">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="申请时间" width="180">
        <template slot-scope="{ row }">
          {{ formatDate(row.application?.appliedAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200">
        <template slot-scope="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            type="text"
            size="small"
            @click="reviewUser(row)">
            审核
          </el-button>

          <el-button
            v-if="row.status === 'active'"
            type="text"
            size="small"
            @click="editUser(row)">
            编辑
          </el-button>

          <el-button
            v-if="row.status === 'active'"
            type="text"
            size="small"
            style="color: #f56c6c;"
            @click="deactivateUser(row)">
            停用
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 审核弹窗 -->
    <el-dialog title="审核用户申请" :visible.sync="showReview" width="500px">
      <div v-if="currentUser" class="review-dialog">
        <div class="user-info">
          <div class="info-row">
            <span class="label">用户名：</span>
            <span class="value">{{ currentUser.username }}</span>
          </div>
          <div class="info-row">
            <span class="label">姓名：</span>
            <span class="value">{{ currentUser.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">申请时间：</span>
            <span class="value">{{ formatDate(currentUser.application.appliedAt) }}</span>
          </div>
          <div class="info-row">
            <span class="label">申请理由：</span>
            <span class="value">{{ currentUser.application.reason }}</span>
          </div>
        </div>

        <el-form :model="reviewForm" label-width="100px" style="margin-top: 20px;">
          <el-form-item label="分配角色">
            <el-radio-group v-model="reviewForm.role">
              <el-radio label="admin">管理员</el-radio>
              <el-radio label="hr">HR</el-radio>
              <el-radio label="agent">经纪人</el-radio>
              <el-radio label="operations">运营</el-radio>
              <el-radio label="trainer">培训师</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="审核备注">
            <el-input
              v-model="reviewForm.note"
              type="textarea"
              :rows="3"
              placeholder="选填"
            />
          </el-form-item>
        </el-form>
      </div>

      <span slot="footer">
        <el-button @click="rejectUser">拒绝</el-button>
        <el-button type="primary" @click="approveUser">通过</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: [],
      filterStatus: '',
      pendingCount: 0,
      loading: false,
      showReview: false,
      currentUser: null,
      reviewForm: {
        role: 'hr',
        note: ''
      }
    };
  },
  created() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        const res = await this.$api.getUserList({
          status: this.filterStatus
        });
        this.users = res.data;
        this.pendingCount = res.pendingCount || 0;
      } catch (error) {
        this.$message.error('加载失败');
      } finally {
        this.loading = false;
      }
    },

    reviewUser(user) {
      this.currentUser = user;
      this.reviewForm.role = 'hr';
      this.reviewForm.note = '';
      this.showReview = true;
    },

    async approveUser() {
      try {
        await this.$api.reviewUser({
          userId: this.currentUser._id,
          approved: true,
          role: this.reviewForm.role,
          note: this.reviewForm.note
        });

        this.$message.success('审核通过');
        this.showReview = false;
        this.loadUsers();
      } catch (error) {
        this.$message.error('审核失败：' + error.message);
      }
    },

    async rejectUser() {
      try {
        await this.$api.reviewUser({
          userId: this.currentUser._id,
          approved: false,
          note: this.reviewForm.note
        });

        this.$message.success('已拒绝');
        this.showReview = false;
        this.loadUsers();
      } catch (error) {
        this.$message.error('操作失败：' + error.message);
      }
    },

    getRoleLabel(role) {
      const labels = {
        admin: '管理员',
        hr: 'HR',
        agent: '经纪人',
        operations: '运营',
        trainer: '培训师'
      };
      return labels[role] || role;
    },

    getRoleType(role) {
      const types = {
        admin: 'danger',
        hr: 'warning',
        agent: 'success',
        operations: 'info',
        trainer: 'primary'
      };
      return types[role] || '';
    },

    getStatusLabel(status) {
      const labels = {
        pending: '待审核',
        active: '已通过',
        rejected: '已拒绝',
        inactive: '已停用'
      };
      return labels[status] || status;
    },

    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleString('zh-CN');
    }
  }
};
</script>
```

#### 4. API 接口

**新增接口** (`admin-web/src/api/admin.js`)：

```javascript
// 申请账号
export function applyAccount(data) {
  return request({
    url: '/admin/users/apply',
    method: 'post',
    data
  });
}

// 获取用户列表
export function getUserList(params) {
  return request({
    url: '/admin/users/list',
    method: 'get',
    params
  });
}

// 审核用户
export function reviewUser(data) {
  return request({
    url: '/admin/users/review',
    method: 'post',
    data
  });
}
```

#### 5. 云函数实现

**扩展 admin 云函数** (`cloudfunctions/admin/index.js`)：

```javascript
case 'applyAccount':
  return await applyAccount(data);
case 'getUserList':
  return await getUserList(data, adminInfo);
case 'reviewUser':
  return await reviewUser(data, adminInfo);

// 申请账号
async function applyAccount(data) {
  const { username, name, password, reason } = data;

  // 检查用户名是否已存在
  const existRes = await db.collection('admins').where({
    username: username
  }).get();

  if (existRes.data.length > 0) {
    return { success: false, error: '用户名已存在' };
  }

  // 密码加密
  const crypto = require('crypto');
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

  // 创建申请记录
  await db.collection('admins').add({
    data: {
      username,
      password: hashedPassword,
      name,
      role: 'pending',
      application: {
        reason,
        appliedAt: db.serverDate(),
        status: 'pending'
      },
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    message: '申请已提交'
  };
}

// 获取用户列表
async function getUserList(data, adminInfo) {
  // 权限检查
  if (adminInfo.role !== 'admin') {
    return { success: false, error: '无权限' };
  }

  const { status } = data;

  let query = db.collection('admins');
  if (status) {
    query = query.where({ status });
  }

  const res = await query.orderBy('createdAt', 'desc').get();

  // 统计待审核数量
  const pendingRes = await db.collection('admins').where({
    status: 'pending'
  }).count();

  return {
    success: true,
    data: res.data,
    pendingCount: pendingRes.total
  };
}

// 审核用户
async function reviewUser(data, adminInfo) {
  const { userId, approved, role, note } = data;

  // 权限检查
  if (adminInfo.role !== 'admin') {
    return { success: false, error: '无权限' };
  }

  const updateData = {
    updatedAt: db.serverDate()
  };

  if (approved) {
    // 通过审核
    updateData.role = role;
    updateData.status = 'active';
    updateData.review = {
      reviewedBy: adminInfo._id,
      reviewedByName: adminInfo.username,
      reviewedAt: db.serverDate(),
      reviewNote: note || '',
      assignedRole: role
    };
    updateData['application.status'] = 'approved';
  } else {
    // 拒绝申请
    updateData.status = 'rejected';
    updateData['application.status'] = 'rejected';
    updateData.review = {
      reviewedBy: adminInfo._id,
      reviewedByName: adminInfo.username,
      reviewedAt: db.serverDate(),
      reviewNote: note || ''
    };
  }

  await db.collection('admins').doc(userId).update({
    data: updateData
  });

  // 记录操作日志
  await createAuditLog({
    adminId: adminInfo._id,
    adminName: adminInfo.username,
    action: approved ? 'approve_user' : 'reject_user',
    target: userId,
    details: {
      role: role || '',
      note: note || ''
    }
  });

  return {
    success: true,
    message: approved ? '审核通过' : '已拒绝'
  };
}
```

### ✅ 验证标准

- [ ] 登录页显示"申请账号"按钮
- [ ] 申请页面表单验证正常
- [ ] 用户名重复时提示错误
- [ ] 申请提交成功
- [ ] 管理员看到待审核用户列表
- [ ] 待审核badge显示正确数量
- [ ] 审核通过后用户可以登录
- [ ] 审核拒绝后用户无法登录
- [ ] 审核记录到操作日志

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `admin-web/src/views/apply/index.vue` | 新增 | 用户申请页面 |
| `admin-web/src/views/users/list.vue` | 新增/修改 | 用户管理页面 |
| `admin-web/src/views/login/index.vue` | 修改 | 添加申请入口 |
| `admin-web/src/api/admin.js` | 修改 | 新增用户申请和审核接口 |
| `admin-web/src/router/index.js` | 修改 | 注册申请页面路由 |
| `cloudfunctions/admin/index.js` | 修改 | 新增用户申请和审核云函数 |

---

## 需求 5：艺名显示优化

### 📌 需求描述

候选人管理界面中，艺名/直播名当前是单独一行显示，占用空间。

**优化方案**：
- 将艺名/直播名放在主播姓名后面
- 格式：`张三 (小张)`
- 如果没有艺名，只显示真实姓名

### 🔨 实施方案

**修改候选人列表** (`admin-web/src/views/candidates/list.vue`)：

```vue
<template>
  <!-- 候选人列表 -->
  <el-table :data="candidates">
    <el-table-column label="姓名" width="180">
      <template slot-scope="{ row }">
        <div class="name-cell">
          <span class="real-name">{{ row.basicInfo.name }}</span>
          <span v-if="row.basicInfo.stageName" class="stage-name">
            ({{ row.basicInfo.stageName }})
          </span>
        </div>
      </template>
    </el-table-column>

    <!-- 其他列... -->
  </el-table>

  <!-- 候选人详情弹窗 -->
  <el-dialog title="候选人详情" :visible.sync="showDetail">
    <div class="candidate-header">
      <h3 class="candidate-name">
        {{ currentCandidate.basicInfo.name }}
        <span v-if="currentCandidate.basicInfo.stageName" class="stage-name-tag">
          {{ currentCandidate.basicInfo.stageName }}
        </span>
      </h3>
    </div>

    <!-- 基本信息中移除单独的艺名行 -->
    <div class="info-block">
      <div class="info-block-title">基本信息</div>

      <!-- 移除这一行 -->
      <!-- <div class="info-row">
        <span class="info-label">艺名/直播名</span>
        <span class="info-value">{{ currentCandidate.basicInfo.stageName }}</span>
      </div> -->

      <div class="info-row">
        <span class="info-label">年龄</span>
        <span class="info-value">{{ currentCandidate.basicInfo.age }}岁</span>
      </div>
      <!-- ... -->
    </div>
  </el-dialog>
</template>

<style scoped>
.name-cell {
  display: flex;
  align-items: center;
}

.real-name {
  font-weight: 500;
  color: #303133;
}

.stage-name {
  margin-left: 6px;
  color: #909399;
  font-size: 13px;
}

.candidate-name {
  display: flex;
  align-items: center;
  margin: 0 0 20px 0;
}

.stage-name-tag {
  margin-left: 10px;
  padding: 2px 8px;
  background: #f4f4f5;
  border-radius: 4px;
  font-size: 14px;
  font-weight: normal;
  color: #909399;
}
</style>
```

### ✅ 验证标准

- [ ] 候选人列表姓名列显示格式正确
- [ ] 有艺名的显示为"张三 (小张)"
- [ ] 没有艺名的只显示"张三"
- [ ] 详情弹窗标题显示艺名标签
- [ ] 基本信息中移除了艺名单独行

### 📁 文件变更

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `admin-web/src/views/candidates/list.vue` | 修改 | 优化艺名显示格式 |

---

# 实施时间线

## 总体时间估算

| 批次 | 需求数量 | 预计时间 | 累计时间 |
|------|---------|---------|---------|
| 第一批 | 2个 | 8-12小时 | 12小时 |
| 第二批 | 3个 | 10-14小时 | 26小时 |
| 第三批 | 3个 | 12-16小时 | 42小时 |
| **总计** | **8个** | **30-42小时** | - |

## 详细时间分配

### 第一批（8-12小时）
- 需求1：批量分配经纪人（4-6小时）
  - 前端开发：2-3小时
  - 云函数开发：1-2小时
  - 测试验证：1小时

- 需求2：经纪人权限控制（4-6小时）
  - 云函数脱敏：1-2小时
  - 前端权限控制：2-3小时
  - 路由和菜单调整：1小时

### 第二批（10-14小时）
- 需求7：星探命名升级（4-6小时）
  - 小程序文案更新：2-3小时
  - 管理后台文案更新：1-2小时
  - 测试验证：1小时

- 需求8：星探层级调整（4-6小时）
  - 前端界面开发：2-3小时
  - 云函数开发：1-2小时
  - 测试验证：1小时

- 需求6：星探删除功能（2-3小时）
  - 前端开发：1小时
  - 云函数开发：1小时
  - 测试验证：30分钟

### 第三批（12-16小时）
- 需求3：试镜视频上传（6-8小时）
  - 小程序页面开发：3-4小时
  - 云函数开发：2-3小时
  - 测试验证：1小时

- 需求4：用户申请审核制（5-7小时）
  - 申请页面开发：2-3小时
  - 用户管理页面开发：2-3小时
  - 云函数开发：1小时

- 需求5：艺名显示优化（1小时）
  - 前端调整：30分钟
  - 测试验证：30分钟

---

# 测试计划

## 第一批测试

### 需求1：批量分配经纪人
- [ ] 勾选单个候选人
- [ ] 勾选多个候选人
- [ ] 全选功能
- [ ] 批量分配成功
- [ ] 显示分配结果统计
- [ ] 刷新列表显示正确
- [ ] 操作日志记录

### 需求2：经纪人权限控制
- [ ] 经纪人登录后看不到手机号
- [ ] 经纪人登录后看不到社交账号
- [ ] 经纪人登录后看不到数据看板
- [ ] 经纪人访问受限页面被拦截
- [ ] 管理员登录后看到所有信息
- [ ] HR登录后看到所有信息

## 第二批测试

### 需求7：星探命名升级
- [ ] 小程序所有页面文案正确
- [ ] 管理后台所有页面文案正确
- [ ] 推荐链条显示正确
- [ ] 筛选标签更新

### 需求8：星探层级调整
- [ ] 升级SS为SP生成邀请码
- [ ] 降级SP为SS移除邀请码
- [ ] 降级SP时下级自动升级
- [ ] 层级调整记录日志

### 需求6：星探删除功能
- [ ] 删除按钮仅管理员可见
- [ ] 删除确认提示正确
- [ ] 删除成功
- [ ] 恢复功能正常
- [ ] 操作记录日志

## 第三批测试

### 需求3：试镜视频上传
- [ ] 录制视频功能
- [ ] 选择视频功能
- [ ] 文件大小验证
- [ ] 上传进度显示
- [ ] 视频预览功能
- [ ] 删除视频功能
- [ ] 上传成功保存数据

### 需求4：用户申请审核制
- [ ] 申请表单验证
- [ ] 用户名重复检测
- [ ] 申请提交成功
- [ ] 管理员看到待审核列表
- [ ] 审核通过功能
- [ ] 审核拒绝功能
- [ ] 通过后可以登录

### 需求5：艺名显示优化
- [ ] 列表显示格式正确
- [ ] 详情显示格式正确
- [ ] 无艺名时显示正确

---

# 风险与注意事项

## 技术风险

### 1. 数据迁移风险
- **需求7**：星探命名修改需要更新所有显示文案
- **需求8**：层级调整可能影响现有星探关系
- **缓解措施**：先在测试环境验证，确保向后兼容

### 2. 权限控制风险
- **需求2**：经纪人权限控制需要多层防护
- **缓解措施**：云函数强制脱敏 + 前端二次验证

### 3. 性能风险
- **需求1**：批量分配大量候选人可能超时
- **缓解措施**：分批处理，显示进度

## 业务风险

### 1. 用户体验风险
- **需求4**：审核制可能导致用户等待时间长
- **缓解措施**：明确审核时效，提供审核进度查询

### 2. 数据一致性风险
- **需求8**：层级调整可能导致推荐链条混乱
- **缓解措施**：详细测试各种边界情况

---

# 部署计划

## 部署顺序

### 第一批（高优先级）
1. 部署云函数（admin）
2. 部署管理后台前端
3. 验证权限控制
4. 验证批量分配

### 第二批（品牌升级）
1. 部署云函数（scout, admin）
2. 部署小程序
3. 部署管理后台前端
4. 验证文案更新
5. 验证层级调整

### 第三批（功能增强）
1. 部署云函数（admin）
2. 部署小程序
3. 部署管理后台前端
4. 验证新功能

## 回滚方案

- 保留数据库备份
- 云函数保留上一版本
- 前端代码使用Git版本控制
- 如有问题立即回滚到上一稳定版本

---

**文档状态**: 🚧 进行中
**创建时间**: 2026-03-10
**最后更新**: 2026-03-10
**下一步**: 开始实施第一批需求
