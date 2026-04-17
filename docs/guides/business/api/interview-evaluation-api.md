# 面试评价接口与数据模型

## 目标

本次实现优先跑通“小程序多角色面试评价 -> 云函数 -> 落库 -> 后台按候选人聚合查看”的闭环。

## 角色枚举

```js
const INTERVIEW_ROLES = {
  admin: '管理员',
  agent: '经纪人',
  dance_teacher: '舞蹈老师',
  photographer: '摄影师',
  makeup_artist: '化妆师',
  stylist: '造型师'
}
```

说明：
- 当前支持 `管理员 / 经纪人 / 舞蹈老师 / 摄影师 / 化妆师 / 造型师`
- 面试评价统一包含 3 个固定环节：`3段20s的才艺展示`、`现场教学`、`自我介绍&基础问答`
- 后续新增角色时，只需要扩展枚举，不影响现有表结构

## 评价状态枚举

```js
const EVALUATION_STATUS = {
  draft: '草稿',
  submitted: '已提交',
  archived: '已归档'
}
```

当前阶段实际主流程使用 `submitted`。

## 数据模型

### 1. 候选人表复用

复用现有 `candidates` collection，不新建候选人主表。

新增回写字段：

```js
{
  interviewEvaluationSummary: {
    candidateId: 'candidate_xxx',
    totalRoles: 3,
    submittedRoles: 2,
    pendingRoles: ['photographer'],
    completionStatus: 'partially_completed', // not_started | partially_completed | completed
    lastSubmittedAt: ISODate('2026-03-17T10:00:00Z'),
    roleMap: {
      dance_teacher: {
        role: 'dance_teacher',
        roleLabel: '舞蹈老师',
        status: 'submitted',
        score: 88,
        submittedAt: ISODate('2026-03-17T09:00:00Z'),
        operator: {
          id: 'admin_xxx',
          name: '张老师'
        }
      },
      reserved_1: {
        role: 'reserved_1',
        roleLabel: '预留角色1',
        status: 'not_assigned'
      }
    }
  }
}
```

用途：
- 后台按候选人维度快速查看评价完成度
- 避免每次列表页都全量扫描评价明细
- `totalRoles` / `pendingRoles` 按“已分配面试角色”计算，预留角色未分配时不会阻塞流程

### 2. 新增面试评价表

新增 `interview_evaluations` collection，一条记录对应“某候选人 + 某角色”的一份评价。

```js
{
  _id: 'eval_xxx',
  candidateId: 'candidate_xxx',
  candidateOpenId: 'openid_xxx',
  candidateSnapshot: {
    candidateId: 'candidate_xxx',
    name: '候选人A',
    avatar: 'cloud://face.jpg',
    gender: '女',
    age: 22,
    status: 'pending_rating',
    interview: {
      date: '2026-03-17',
      time: '15:00'
    }
  },
  role: 'dance_teacher',
  roleLabel: '舞蹈老师',
  status: 'submitted',
  score: 88,
  comment: '节奏感不错，可塑性较强',
  images: ['cloud://img1.jpg'],
  videos: ['cloud://video1.mp4'],
  videoLinks: ['https://example.com/video.mp4'],
  ext: {},
  assignedInterviewer: {
    id: 'teacher_001',
    name: '张老师',
    role: 'dance_teacher'
  },
  operator: {
    id: 'teacher_001',
    name: '张老师',
    role: 'dance_teacher',
    openId: 'openid_operator_xxx',
    source: 'frontend'
  },
  schemaVersion: 1,
  createdAt: ISODate('2026-03-17T09:00:00Z'),
  submittedAt: ISODate('2026-03-17T09:00:00Z'),
  updatedAt: ISODate('2026-03-17T09:00:00Z')
}
```

设计说明：
- 通用字段统一为 `score/comment/images/videos/videoLinks/ext`
- 不把字段写死到某个角色，角色差异先通过 `ext` 承载
- 允许同一角色重复提交，当前实现为覆盖更新同一候选人同一角色记录

## 云函数

云函数名：`interview`

## 接口说明

### 1. 获取当前角色待评价候选人列表

action: `getPendingCandidates`

请求：

```js
{
  role: 'dance_teacher',
  operatorId: 'teacher_001',
  keyword: '小米',
  page: 1,
  pageSize: 20
}
```

返回：
- `list`: 当前角色已分配但尚未提交评价的候选人
- 每条包含候选人基础信息、分配面试官、聚合摘要

### 2. 获取当前角色已评价候选人列表

action: `getCompletedCandidates`

请求参数同上。

返回：
- `list`: 当前角色已提交评价的候选人

### 3. 获取候选人基础信息

action: `getCandidateBasicInfo`

请求：

```js
{
  candidateId: 'candidate_xxx'
}
```

返回字段：
- `candidateId`
- `name`
- `avatar`
- `gender`
- `age`
- `phone`
- `status`
- `interview`

### 4. 提交某角色对某候选人的面试评价

action: `submitEvaluation`

请求：

```js
{
  candidateId: 'candidate_xxx',
  role: 'dance_teacher',
  operatorId: 'teacher_001',
  operatorName: '张老师',
  score: 88,
  comment: '节奏感不错',
  images: ['cloud://img1.jpg'],
  videos: ['cloud://video1.mp4'],
  videoLinks: ['https://example.com/video.mp4'],
  ext: {
    tags: ['节奏感好', '有镜头感']
  }
}
```

行为：
- 写入/更新 `interview_evaluations`
- 自动回写 `candidates.interviewEvaluationSummary`

### 5. 获取某候选人的所有角色评价汇总

action: `getCandidateSummary`

请求：

```js
{
  candidateId: 'candidate_xxx'
}
```

返回：
- `candidate`: 候选人基础信息
- `summary`: 聚合完成度
- `roleSummaries`: 每个角色的分配情况、评价简要信息、媒体数量与明细

### 6. 获取某角色对某候选人的评价详情

action: `getRoleEvaluationDetail`

请求：

```js
{
  candidateId: 'candidate_xxx',
  role: 'dance_teacher'
}
```

返回：
- 角色信息
- 分配面试官信息
- 当前角色评价详情

## 当前实现的约束

- 当前项目还没有完整的面试官登录态体系，因此接口按“前端传 `role/operatorId` + 候选人面试官分配关系校验”运行
- 分配关系优先读取 `candidate.interview.interviewers`，兼容旧字段 `candidate.interviewSchedule.interviewers`
- 当前阶段只保证流程可跑通和可落库，复杂权限、草稿、多版本历史暂未展开

## 新增文件

- `cloudfunctions/interview/index.js`
- `cloudfunctions/interview/package.json`
- `miniprogram/utils/interview-api.js`
- `admin-web/src/api/interview.js`
- `docs/guides/business/api/interview-evaluation-api.md`
