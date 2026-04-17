# HR工作台业务链路与数据模型设计

## 1. 目标说明

本文档用于统一 HR 工作台四大功能模块的业务认知、页面结构、数据模型与字段定义，支撑产品设计、研发建模与后续系统落地。

四大核心模块如下：

- 招募看板
- 面试数字化
- 入职与档案
- 人才回访库

目标是将上述模块设计为同一人才生命周期下的闭环链路，而不是相互割裂的功能岛。

## 2. 整体业务链路

理想状态下，HR 工作台应形成如下完整业务流程：

```text
候选人线索
  ↓
招募看板
  ↓
简历筛选
  ↓
面试数字化
  ↓
面试结果沉淀
  ├─ 不通过 → 人才回访库
  ├─ 暂缓/待定 → 人才回访库
  └─ 通过 → Offer/录用
                  ↓
              入职办理
                  ↓
              员工档案生成
                  ↓
      在职跟踪 / 转正 / 异动 / 离职
                  ↓
      优秀离职人才 / 储备人才回流到人才回访库
```

## 3. 四大功能对应关系

### 3.1 招募看板

负责候选人获取、岗位归属、流程推进、负责人协同，是招聘入口。

### 3.2 面试数字化

负责面试排期、面试记录、评价表、通过/淘汰结论，是筛选决策中心。

### 3.3 入职与档案

负责 offer 后的入职流程、资料收集、合同信息、员工档案建立，是招聘到雇佣的转换节点。

### 3.4 人才回访库

负责沉淀未录用优秀人才、待激活人才、离职可回流人才，是复用和再招聘资产池。

## 4. 是否打通的判断标准

如果链路真正打通，应满足以下条件：

- 候选人信息只录一次，后续节点自动继承
- 招聘进度可自动推进到面试、offer、入职
- 面试评价可沉淀进人才库
- 入职后自动转员工档案
- 未录用但优质人才自动进入回访库
- 离职优秀员工可回流至人才库
- 全链路可追踪来源、岗位、面试结果、入职结果、回访记录

如果链路不通，通常会出现以下问题：

- 各模块数据割裂，重复建档
- 面试记录无法带到入职
- 入职后员工档案需要重新录入
- 人才库和招聘池是两套数据

## 5. 推荐状态流转设计

```text
待筛选
→ 待沟通
→ 待面试
→ 面试中
→ 待定
→ 已淘汰
→ 已录用
→ 待入职
→ 已入职
→ 在职
→ 已离职
→ 回访中 / 人才库储备
```

## 6. 页面结构图

```text
HR工作台
├─ 1. 招募看板
│  ├─ 岗位列表
│  ├─ 候选人看板（按阶段拖拽）
│  ├─ 简历详情
│  ├─ 跟进记录
│  └─ 招聘数据统计
│
├─ 2. 面试数字化
│  ├─ 面试日程
│  ├─ 面试官安排
│  ├─ 面试评价表
│  ├─ 面试结论
│  └─ 淘汰/待定原因库
│
├─ 3. 入职与档案
│  ├─ 待入职名单
│  ├─ 入职资料收集
│  ├─ Offer信息
│  ├─ 入职办理进度
│  ├─ 员工档案
│  └─ 合同/证件/附件管理
│
├─ 4. 人才回访库
│  ├─ 储备人才池
│  ├─ 淘汰优质人才池
│  ├─ 离职回流人才池
│  ├─ 回访计划
│  ├─ 回访记录
│  └─ 再激活投递
│
└─ 5. 通用能力
   ├─ 搜索与筛选
   ├─ 消息提醒
   ├─ 标签体系
   ├─ 权限角色
   └─ 数据报表
```

## 7. 核心页面流转

```text
招募看板
→ 候选人详情
→ 发起面试
→ 面试评价与结果
→ 通过：进入待入职
→ 完成入职：生成员工档案
→ 不通过/待定：进入人才回访库
→ 回访激活：重新回到招募看板
```

## 8. 数据主线设计

建议使用 `talent_id` 作为全链路统一主键，贯穿以下业务对象：

- 人才主表
- 应聘记录
- 面试记录
- 录用记录
- 入职记录
- 员工档案
- 人才库
- 回访记录

原则如下：

- 一个候选人只保留一份主档
- 模块间只流转状态和业务单据，不重复造人
- 回访激活后，重新新建应聘记录，不重建人才主表

## 9. ER 数据模型

### 9.1 核心实体

```text
Talent 人才主表
- talent_id PK
- name
- mobile
- email
- gender
- age
- source
- current_company
- current_position
- status
- tags
- created_at
- updated_at

Job 岗位表
- job_id PK
- job_name
- dept_id
- hc_count
- recruiter_id
- status
- created_at

Application 应聘记录表
- application_id PK
- talent_id FK
- job_id FK
- apply_channel
- apply_date
- stage
- owner_id
- resume_url
- status
- created_at

Interview 面试记录表
- interview_id PK
- application_id FK
- round_no
- interviewer_id
- interview_time
- interview_type
- score
- result
- feedback
- created_at

Offer 录用表
- offer_id PK
- application_id FK
- salary
- level
- join_date_plan
- offer_status
- approved_by
- created_at

Onboarding 入职表
- onboarding_id PK
- offer_id FK
- talent_id FK
- job_id FK
- entry_date
- onboarding_status
- documents_status
- created_at

EmployeeProfile 员工档案表
- employee_id PK
- talent_id FK
- employee_no
- dept_id
- position
- manager_id
- entry_date
- probation_end_date
- employee_status
- created_at

TalentPool 人才库表
- pool_id PK
- talent_id FK
- pool_type
- source_type
- last_contact_time
- next_contact_time
- reactivate_status
- created_at

FollowUp 回访记录表
- followup_id PK
- talent_id FK
- pool_id FK
- followup_type
- followup_result
- followup_note
- followup_time
- owner_id
- created_at
```

### 9.2 核心关系

```text
Talent 1:N Application
Job 1:N Application
Application 1:N Interview
Application 1:1 Offer
Offer 1:1 Onboarding
Talent 1:1 EmployeeProfile
Talent 1:N TalentPool
TalentPool 1:N FollowUp
```

## 10. 字段级 PRD 清单

### 10.1 Talent 人才主表

作用：全链路唯一人才档案，所有模块共用。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `talent_id` | bigint / uuid | 是 | 人才唯一ID |
| `name` | varchar(100) | 是 | 姓名 |
| `mobile` | varchar(30) | 是 | 手机号，建议参与查重 |
| `email` | varchar(100) | 否 | 邮箱，建议参与查重 |
| `id_no` | varchar(50) | 否 | 身份证/证件号，强查重字段 |
| `gender` | varchar(20) | 否 | 性别 |
| `birth_date` | date | 否 | 出生日期 |
| `age` | int | 否 | 冗余字段，可计算 |
| `city` | varchar(100) | 否 | 所在城市 |
| `education` | varchar(50) | 否 | 最高学历 |
| `school` | varchar(200) | 否 | 毕业院校 |
| `major` | varchar(100) | 否 | 专业 |
| `work_years` | decimal(4,1) | 否 | 工作年限 |
| `current_company` | varchar(200) | 否 | 当前公司 |
| `current_position` | varchar(100) | 否 | 当前职位 |
| `source` | varchar(50) | 是 | 来源，如BOSS/内推/回访激活 |
| `source_detail` | varchar(200) | 否 | 来源补充说明 |
| `resume_url` | varchar(500) | 否 | 简历附件地址 |
| `tags` | json / text | 否 | 标签 |
| `status` | varchar(50) | 是 | 人才主状态 |
| `remark` | text | 否 | 备注 |
| `created_by` | bigint | 是 | 创建人 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

建议唯一校验：

- `mobile`
- `email`
- `id_no`

### 10.2 Job 岗位表

作用：招聘岗位主数据。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `job_id` | bigint / uuid | 是 | 岗位ID |
| `job_code` | varchar(50) | 否 | 岗位编码 |
| `job_name` | varchar(100) | 是 | 岗位名称 |
| `dept_id` | bigint | 是 | 所属部门 |
| `hc_count` | int | 否 | 招聘人数 |
| `job_desc` | text | 否 | 岗位描述 |
| `city` | varchar(100) | 否 | 工作地点 |
| `employment_type` | varchar(50) | 否 | 全职/实习/兼职 |
| `priority` | varchar(20) | 否 | 紧急度 |
| `recruiter_id` | bigint | 是 | 招聘负责人 |
| `hiring_manager_id` | bigint | 否 | 用人经理 |
| `status` | varchar(30) | 是 | 招聘中/暂停/关闭 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.3 Application 应聘记录表

作用：人才投递某岗位的一次业务记录。一个人才可多次应聘不同岗位。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `application_id` | bigint / uuid | 是 | 应聘记录ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `job_id` | bigint / uuid | 是 | 岗位ID |
| `apply_channel` | varchar(50) | 是 | 投递渠道 |
| `apply_date` | datetime | 是 | 投递时间 |
| `owner_id` | bigint | 是 | 当前跟进人 |
| `stage` | varchar(50) | 是 | 当前招聘阶段 |
| `status` | varchar(50) | 是 | 状态 |
| `resume_url` | varchar(500) | 否 | 本次投递简历版本 |
| `recommended_by` | bigint | 否 | 内推人 |
| `expected_salary` | decimal(10,2) | 否 | 期望薪资 |
| `current_salary` | decimal(10,2) | 否 | 当前薪资 |
| `available_date` | date | 否 | 最快到岗日期 |
| `reject_reason` | varchar(200) | 否 | 淘汰原因 |
| `cancel_reason` | varchar(200) | 否 | 终止原因 |
| `last_follow_time` | datetime | 否 | 最近跟进时间 |
| `next_action_time` | datetime | 否 | 下次跟进时间 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

建议唯一约束：

- 同一 `talent_id + job_id + 有效状态` 不重复

### 10.4 Interview 面试记录表

作用：记录每一轮面试。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `interview_id` | bigint / uuid | 是 | 面试ID |
| `application_id` | bigint / uuid | 是 | 应聘记录ID |
| `round_no` | int | 是 | 第几轮 |
| `interviewer_id` | bigint | 是 | 面试官 |
| `interview_time` | datetime | 是 | 面试时间 |
| `interview_type` | varchar(30) | 是 | 现场/视频/电话 |
| `duration_min` | int | 否 | 面试时长 |
| `score` | decimal(5,2) | 否 | 面试评分 |
| `result` | varchar(30) | 是 | 通过/待定/淘汰 |
| `evaluation` | text | 否 | 综合评价 |
| `strengths` | text | 否 | 优势 |
| `risks` | text | 否 | 风险点 |
| `record_url` | varchar(500) | 否 | 录音/附件 |
| `feedback_time` | datetime | 否 | 提交反馈时间 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.5 Offer 录用表

作用：面试通过后的录用决策与 offer 信息。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `offer_id` | bigint / uuid | 是 | Offer ID |
| `application_id` | bigint / uuid | 是 | 应聘记录ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `job_id` | bigint / uuid | 是 | 岗位ID |
| `salary_monthly` | decimal(10,2) | 否 | 月薪 |
| `salary_annual` | decimal(12,2) | 否 | 年包 |
| `level` | varchar(50) | 否 | 职级 |
| `title` | varchar(100) | 否 | 拟入职岗位 |
| `join_date_plan` | date | 否 | 预计入职日期 |
| `offer_status` | varchar(30) | 是 | 草稿/审批中/已发放/已接受/已拒绝 |
| `approved_by` | bigint | 否 | 审批人 |
| `approved_at` | datetime | 否 | 审批时间 |
| `sent_at` | datetime | 否 | 发放时间 |
| `accepted_at` | datetime | 否 | 接受时间 |
| `rejected_at` | datetime | 否 | 拒绝时间 |
| `reject_reason` | varchar(200) | 否 | 拒绝原因 |
| `remark` | text | 否 | 备注 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.6 Onboarding 入职表

作用：管理待入职到入职完成全过程。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `onboarding_id` | bigint / uuid | 是 | 入职记录ID |
| `offer_id` | bigint / uuid | 是 | Offer ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `job_id` | bigint / uuid | 是 | 岗位ID |
| `entry_date` | date | 否 | 实际入职日期 |
| `entry_date_plan` | date | 否 | 计划入职日期 |
| `onboarding_status` | varchar(30) | 是 | 待提交资料/待审核/待入职/已入职/放弃入职 |
| `documents_status` | varchar(30) | 否 | 资料状态 |
| `contract_status` | varchar(30) | 否 | 合同状态 |
| `emergency_contact` | varchar(100) | 否 | 紧急联系人 |
| `emergency_mobile` | varchar(30) | 否 | 紧急联系人电话 |
| `bank_account` | varchar(100) | 否 | 银行卡号 |
| `social_security_city` | varchar(100) | 否 | 社保缴纳地 |
| `housing_fund_city` | varchar(100) | 否 | 公积金缴纳地 |
| `abandon_reason` | varchar(200) | 否 | 放弃入职原因 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.7 EmployeeProfile 员工档案表

作用：入职完成后生成正式员工档案。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `employee_id` | bigint / uuid | 是 | 员工ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `employee_no` | varchar(50) | 是 | 工号 |
| `name` | varchar(100) | 是 | 姓名 |
| `mobile` | varchar(30) | 是 | 手机号 |
| `email` | varchar(100) | 否 | 邮箱 |
| `dept_id` | bigint | 是 | 部门 |
| `position` | varchar(100) | 是 | 岗位 |
| `manager_id` | bigint | 否 | 直属上级 |
| `entry_date` | date | 是 | 入职日期 |
| `probation_end_date` | date | 否 | 转正日期/试用期结束 |
| `employee_status` | varchar(30) | 是 | 在职/试用/离职 |
| `contract_start_date` | date | 否 | 合同开始 |
| `contract_end_date` | date | 否 | 合同结束 |
| `id_no` | varchar(50) | 否 | 证件号 |
| `address` | varchar(300) | 否 | 联系地址 |
| `education` | varchar(50) | 否 | 学历 |
| `school` | varchar(200) | 否 | 学校 |
| `remark` | text | 否 | 备注 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.8 TalentPool 人才库表

作用：沉淀可回访人才，不管来源是淘汰、待定、离职回流还是历史储备。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `pool_id` | bigint / uuid | 是 | 人才池记录ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `pool_type` | varchar(50) | 是 | 储备池/优质淘汰池/离职回流池 |
| `source_type` | varchar(50) | 是 | 招聘转入/离职转入/手工导入 |
| `source_ref_id` | bigint / uuid | 否 | 来源业务单号 |
| `owner_id` | bigint | 否 | 当前归属人 |
| `level_tag` | varchar(30) | 否 | A/B/C级 |
| `industry_tag` | varchar(100) | 否 | 行业标签 |
| `position_tag` | varchar(100) | 否 | 岗位标签 |
| `last_contact_time` | datetime | 否 | 最近联系时间 |
| `next_contact_time` | datetime | 否 | 下次联系时间 |
| `reactivate_status` | varchar(30) | 否 | 未激活/已激活/失效 |
| `status` | varchar(30) | 是 | 有效/冻结/移除 |
| `remark` | text | 否 | 备注 |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 10.9 FollowUp 回访记录表

作用：记录人才库运营过程。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `followup_id` | bigint / uuid | 是 | 回访ID |
| `pool_id` | bigint / uuid | 是 | 人才池ID |
| `talent_id` | bigint / uuid | 是 | 人才ID |
| `owner_id` | bigint | 是 | 回访负责人 |
| `followup_type` | varchar(30) | 是 | 电话/微信/邮件/系统触达 |
| `followup_result` | varchar(50) | 是 | 有兴趣/暂不考虑/无法联系/待跟进 |
| `followup_note` | text | 否 | 回访内容 |
| `followup_time` | datetime | 是 | 回访时间 |
| `next_followup_time` | datetime | 否 | 下次回访时间 |
| `reactivate_job_id` | bigint | 否 | 激活对应岗位 |
| `reactivate_application_id` | bigint | 否 | 激活后生成的应聘记录 |
| `created_at` | datetime | 是 | 创建时间 |

### 10.10 操作日志 / 状态流转表

作用：用于审计和过程追踪，建议单独建表。

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `log_id` | bigint / uuid | 是 | 日志ID |
| `biz_type` | varchar(30) | 是 | talent/application/interview/offer/onboarding |
| `biz_id` | bigint / uuid | 是 | 业务ID |
| `from_status` | varchar(50) | 否 | 原状态 |
| `to_status` | varchar(50) | 否 | 新状态 |
| `action` | varchar(50) | 是 | 创建/分配/淘汰/通过/激活 |
| `operator_id` | bigint | 是 | 操作人 |
| `operator_name` | varchar(100) | 否 | 操作人名称 |
| `content` | text | 否 | 操作说明 |
| `created_at` | datetime | 是 | 操作时间 |

## 11. 核心状态建议

### 11.1 Application.stage

- `new`
- `screening`
- `interview_1`
- `interview_2`
- `pending`
- `rejected`
- `offer`
- `to_onboard`
- `onboarded`

### 11.2 Talent.status

- `new`
- `in_process`
- `rejected`
- `offered`
- `employed`
- `left`
- `in_talent_pool`

### 11.3 TalentPool.pool_type

- `backup`
- `rejected_but_good`
- `left_and_recallable`

## 12. 自动化流转规则

- 面试结果为 `淘汰` 或 `待定且优质` 时，自动写入 `TalentPool`
- Offer 状态为 `已接受` 时，自动生成 `Onboarding`
- 入职状态为 `已入职` 时，自动生成 `EmployeeProfile`
- 员工状态为 `离职且可回流` 时，自动写入 `TalentPool`
- 回访结果为 `重新应聘` 时，自动新建 `Application`

## 13. 研发落地重点

- 候选人不能重复建档，优先按手机号、邮箱、证件号查重
- `EmployeeProfile` 不能脱离 `Talent` 独立存在
- 回访激活时应新建应聘记录，而不是新建人才档案
- `Interview` 与 `Application` 为一对多关系
- `Offer` 与 `Application` 通常为一对一关系
- 附件建议统一走文件表或对象存储，不直接放入大字段
- 关键业务表建议统一具备 `created_at`、`updated_at`、`created_by`

## 14. 管理者视角多维度统计

### 14.1 目标说明

管理者（老板）需要从经营视角查看招聘与团队经营结果，而不仅仅是流程进度。

系统应支持按以下维度进行统计分析：

- 按时间
- 按部门
- 按岗位
- 按经纪人
- 按团
- 按经纪人小组

其中，财务数据必须支持按 `团` 或 `经纪人小组` 进行统计，便于管理者快速判断：

- 哪个经纪人带的团在赚钱
- 哪个经纪人小组产出更高
- 哪个团或小组处于亏损状态
- 哪些团队需要调整人员、目标或激励策略

### 14.2 管理者首页建议展示内容

老板端建议提供经营总览看板，核心包括：

- 总营收
- 总成本
- 毛利润
- 净利润
- 利润率
- 新增候选人数
- 入职人数
- 离职人数
- 人均产出
- 团队排名

### 14.3 财务统计维度

财务数据建议至少支持以下拆分：

- 按团统计收入、成本、利润、利润率
- 按经纪人小组统计收入、成本、利润、利润率
- 按经纪人统计收入、成本、利润贡献
- 按月份统计趋势变化
- 按岗位或业务线统计投入产出比

推荐展示形式：

- 汇总卡片
- 趋势折线图
- 团队利润排行榜
- 亏损团队预警列表
- 收支结构占比图

### 14.4 推荐统计口径

#### 收入类

- 招聘服务收入
- 团队业绩收入
- 经纪人业务提成收入
- 其他业务收入

#### 成本类

- 团队人力成本
- 招聘成本
- 推广成本
- 激励奖金
- 运营成本
- 管理成本

#### 结果类

- 毛利润 = 收入 - 直接成本
- 净利润 = 收入 - 总成本
- 利润率 = 净利润 / 收入
- 人均利润 = 净利润 / 团队人数
- 入职转化率 = 入职人数 / 候选人数

### 14.5 数据模型扩展建议

如果后续要支持老板端经营分析，建议在现有模型基础上补充以下实体：

```text
BrokerGroup 经纪人小组表
- group_id PK
- group_name
- owner_broker_id
- manager_id
- status
- created_at

Team 团表
- team_id PK
- team_name
- group_id FK
- leader_broker_id
- status
- created_at

Broker 经纪人表
- broker_id PK
- broker_name
- group_id FK
- team_id FK
- status
- created_at

FinanceRecord 财务流水表
- finance_id PK
- biz_date
- biz_type
- income_amount
- cost_amount
- team_id FK
- group_id FK
- broker_id FK
- application_id FK
- talent_id FK
- remark
- created_at
```

### 14.6 老板关注的核心问题

系统应帮助管理者直接回答以下经营问题：

- 哪个团最赚钱
- 哪个经纪人小组利润最高
- 哪个小组持续亏损
- 哪个经纪人的投入产出比最高
- 哪个岗位招聘投入高但转化差
- 哪些团队需要优化激励或调整负责人

### 14.7 产品能力建议

为满足老板端使用场景，建议增加以下能力：

- 支持按 `团`、`经纪人小组`、`经纪人` 多维筛选
- 支持查看收入、成本、利润、利润率的对比排行
- 支持按月、季度、年度查看经营趋势
- 支持对亏损团队进行红色预警标识
- 支持点击团队后下钻到经纪人明细
- 支持从财务结果联动查看招聘、入职、离职等业务数据

## 15. 结论

HR 工作台的最佳实践不是四个独立模块并列，而是形成如下闭环：

`前招聘 -> 面试 -> 入职 -> 档案 -> 回访库 -> 再激活 -> 再招聘`

在系统设计上，应坚持以下原则：

- 用 `talent_id` 贯穿全链路
- 用业务单据承接各阶段动作
- 用状态流转替代重复建档
- 用人才库实现复用和沉淀

这样才能保证 HR 工作台既支持招聘流程协同，也能沉淀长期人才资产。
