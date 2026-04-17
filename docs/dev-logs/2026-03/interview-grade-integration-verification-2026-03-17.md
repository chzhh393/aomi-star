# 新面试等级制联调记录 2026-03-17

## 范围

- 核对范围：`docs/**`、`miniprogram/pages/recruit/interviewer-evaluation/**`、`miniprogram/utils/interview-*.js`、`miniprogram/utils/interviewer*.js`、`cloudfunctions/interview/**`
- 目标：验证新面试等级制流程是否能形成“小程序提交 -> 云函数落库 -> 汇总查看/终裁”的最小闭环，并排查旧 10 分制残留
- 约束：本轮不做大规模重构，仅输出联调记录、问题清单、残留整理、上线前检查项

## 测试方式

### 1. 静态联调核对

- 对照业务规则逐项核对前端页面、工具层、云函数、后台展示和文档定义
- 重点检查字段名是否统一为：
  - `appearance`
  - `talent`
  - `teaching`
  - `selfIntro`
  - `qa`

### 2. 本地校验执行

执行了 `miniprogram/utils/interview-grade-validator.js` 的直接校验，结果如下：

```text
all_valid:PASS
missing_dimension:请完成 qa 评级
missing_remark_for_s:appearance 选择 S 时必须填写备注
invalid_style_tags_0:风格标签需选择 1-2 个
invalid_style_tags_3:风格标签需选择 1-2 个
attachments_optional:PASS
draft_partial_ok:PASS
```

结论：

- 规则 1 可在校验器层命中
- 规则 2 可在校验器层命中
- 规则 3 可在校验器层命中
- 规则 4 可在校验器层命中
- 草稿允许部分填写，符合草稿保存预期

## 业务规则验证结果

| # | 规则 | 结果 | 说明 |
|---|---|---|---|
| 1 | 五个维度未全部选择时，不能提交 | 部分通过 | `miniprogram/utils/interview-grade-validator.js` 已实现；但评价页主实现未接入新表单结构 |
| 2 | 选中 `S` 或 `C` 时，备注必填 | 部分通过 | 校验器已实现；页面未形成新协议闭环 |
| 3 | 风格标签必须 1-2 个 | 部分通过 | 校验器已实现；页面未渲染新风格标签控件 |
| 4 | 图片/视频选填 | 部分通过 | 校验器未要求附件必填；页面现有媒体上传仍基于旧结构 |
| 5 | 草稿自动保存后，退出重进可恢复 | 未通过 | `interview-api` 调用了 `saveEvaluationDraft`，但 `cloudfunctions/interview` 未实现该 action |
| 6 | 面试官 A 无法看到面试官 B 的评分 | 未通过 | `getCandidateSummary` 直接返回全部 `roleSummaries`，没有按当前操作者裁剪 |
| 7 | 面试官无法看到老板终裁结果 | 未通过 | 当前无终裁字段隔离，也无 founder 决策链路 |
| 8 | 创始人可查看全部评分汇总 | 未通过 | 前端定义了 founder 角色入口，但云函数不支持 founder 角色 |
| 9 | 创始人可以终裁 | 未通过 | `submitFounderDecision` 前端已暴露，云函数未实现 |
| 10 | 全员提交后候选人状态变为 `Pending` | 未通过 | 云函数当前将状态改为 `pending_rating`，与目标不一致 |
| 11 | 终裁后候选人状态变为 `Finalized` | 未通过 | 当前不存在 `Finalized` 状态写入链路 |
| 12 | 同维度有人给 `S`、有人给 `C` 时显示严重分歧 | 未通过 | 当前汇总逻辑只统计提交数量，不做维度级冲突判断 |

## 关键发现

### 阻塞 1：新表单配置与评价页实现脱节

- 新等级制配置已经切到 `dimensions/styleTags/attachments` 结构，见 `miniprogram/utils/interview-evaluation.js`
- 评价页仍按旧 `formConfig.fields + score slider` 渲染和提交流程实现，见 `miniprogram/pages/recruit/interviewer-evaluation/interviewer-evaluation.js`
- 直接风险：
  - 页面模板循环 `formConfig.fields`
  - `hydrateFormData()` 依赖 `formConfig.fields.forEach`
  - `buildSubmitPayload()` 仍按均分 `score` 计算

结论：当前主评价页不是“缺少一点校验”，而是仍在跑旧版评价协议，无法完成新等级制联调。

### 阻塞 2：接口封装已声明新能力，但云函数未实现

- `miniprogram/utils/interview-api.js` 已暴露：
  - `saveInterviewEvaluationDraft`
  - `submitFounderDecision`
  - `getCandidateEvaluationSummary`
- `cloudfunctions/interview/index.js` 的 `switch(action)` 实际仅支持：
  - `getEnums`
  - `getPendingCandidates`
  - `getCompletedCandidates`
  - `getCandidateBasicInfo`
  - `submitEvaluation`
  - `getCandidateSummary`
  - `getRoleEvaluationDetail`

结论：草稿保存、创始人终裁目前都是前端接口占位，未落到服务端。

### 阻塞 3：角色定义不一致

- `miniprogram/utils/interviewer.js` 已配置 `founder`
- `cloudfunctions/interview/index.js` 中 `INTERVIEW_ROLES` 不包含 `founder`

结论：创始人入口已出现在前端，但调用服务端会直接落入“无效的面试角色”。

### 阻塞 4：状态流转仍是旧候选人状态

- 当前云函数在全部已分配角色提交后，将候选人状态从 `interview_scheduled` 改到 `pending_rating`
- 目标要求：
  - 全员提交后 -> `Pending`
  - 终裁后 -> `Finalized`

结论：状态机未切到本次新面试等级制目标。

### 阻塞 5：权限隔离未形成

- `getCandidateSummary` 当前直接拼装所有角色的 `roleSummaries`
- `getRoleEvaluationDetail` 也未对当前操作者做“只看自己”的额外限制
- 当前仅有“候选人是否分配给该角色/操作者”的基础校验，不等于“同角色不同人互相隔离”和“终裁结果隔离”

结论：规则 6、7、8 不能以“理论上可用”判定通过。

## 旧 10 分制/旧评级逻辑残留

### 必须清理

1. `miniprogram/pages/recruit/interviewer-evaluation/interviewer-evaluation.js`
   - 仍按旧 `score` 均分模型提交
   - 是当前新流程主入口，必须优先切换

2. `cloudfunctions/interview/index.js`
   - `submitEvaluation()` 强依赖 `score/comment/images/videos/videoLinks`
   - 汇总结构 `buildEvaluationBrief()`、`getCandidateSummary()` 仍以旧 `score` 为主
   - 会阻断新等级制主链路

3. `miniprogram/utils/interview-api.js`
   - 已暴露 `saveEvaluationDraft`、`submitFounderDecision`，但服务端未实现
   - 必须与云函数 action 对齐，否则联调误判为“可用”

4. `docs/guides/business/api/interview-evaluation-api.md`
   - 文档仍以 `score: 88` 为核心模型
   - 如果不更新，前后端会继续对着旧接口联调

5. 旧 `score` 字段作为主流程判断依据
   - `cloudfunctions/interview/index.js`
   - `cloudfunctions/admin/index.js`
   - 管理端评价展示逻辑
   - 这些位置若继续以 `score` 为主，会导致新等级制字段被降级成附属信息

### 可暂时保留

1. `miniprogram/utils/rating-calculator.js`
   - 仍有 `calculateRating` 和 `A级/B级/C级/D级`
   - 当前看主要服务于旧招聘评分页和历史页面，不是新面试等级制主入口

2. `miniprogram/pages/recruit/rating-review/**`
   - 仍依赖 `calculateRating`
   - 可在新面试等级制闭环跑通后再并行下线或迁移

3. `miniprogram/pages/recruit/dance-evaluation/**`
4. `miniprogram/pages/recruit/makeup-artist-evaluation/**`
5. `miniprogram/pages/recruit/stylist-evaluation/**`
6. `miniprogram/pages/recruit/agent-evaluation/**`
   - 这些页面仍有 `score: parseFloat(...)`
   - 需确认是否已退出主流程；如果仍在主路径，则升级为“必须清理”

7. 业务说明类文档中的 `A级/B级/C级/D级`
   - 如为历史方案说明可暂存
   - 但任何“当前接口/当前流程/当前页面”的说明必须改成新等级制

## 问题清单

### 阻塞上线

1. 主评价页仍是旧评分页，不是新等级制页面
   - 位置：`miniprogram/pages/recruit/interviewer-evaluation/interviewer-evaluation.js`
   - 影响：规则 1-4、5 无法在真实页面闭环验证

2. 云函数缺失 `saveEvaluationDraft`
   - 位置：`miniprogram/utils/interview-api.js` 与 `cloudfunctions/interview/index.js`
   - 影响：规则 5 无法上线

3. 云函数缺失 `submitFounderDecision`
   - 位置：`miniprogram/utils/interview-api.js` 与 `cloudfunctions/interview/index.js`
   - 影响：规则 8、9、11 无法上线

4. `founder` 角色前后端定义不一致
   - 位置：`miniprogram/utils/interviewer.js`、`cloudfunctions/interview/index.js`
   - 影响：创始人入口不可用

5. 全员提交后的候选人状态仍写成 `pending_rating`
   - 位置：`cloudfunctions/interview/index.js`
   - 影响：规则 10 与目标状态机不一致

6. 汇总逻辑未实现“严重分歧”
   - 位置：`cloudfunctions/interview/index.js`
   - 影响：规则 12 缺失，无法支持创始人判断

7. 面试官互相隔离未完成
   - 位置：`cloudfunctions/interview/index.js`
   - 影响：规则 6、7 存在权限泄漏风险

### 高优先级

1. 接口文档仍以旧 `score` 模型描述
   - 位置：`docs/guides/business/api/interview-evaluation-api.md`

2. 管理端/后台聚合展示仍以 `score` 为主
   - 位置：`cloudfunctions/admin/index.js`、`admin-web/src/components/candidates/interview-evaluation-dialog.vue`

3. 旧 `A级/B级/C级/D级` 文案仍散落在业务文档和旧页面中
   - 影响：联调沟通易混淆，测试口径不一致

### 可延期

1. 非主路径旧评分工具清理
   - 位置：`miniprogram/utils/rating-calculator.js`、`miniprogram/pages/recruit/rating-review/**`

2. 历史说明文档中的旧评级文案替换
   - 仅在确认不作为当前流程说明时可延后

## 回归结果

### 已完成回归

- `miniprogram/utils/interview-grade-validator.js`
  - 规则 1-4 校验通过
- `miniprogram/utils/interview-evaluation.js`
  - 字段名已统一为 `appearance/talent/teaching/selfIntro/qa`
- `miniprogram/utils/interview-api.js`
  - 已识别出接口声明和云函数 action 不一致
- `cloudfunctions/interview/index.js`
  - 已确认候选人汇总、状态推进、权限裁剪都未覆盖目标规则

### 未完成回归

- 小程序真机/开发者工具完整提交流程
- 草稿退出重进恢复
- 创始人汇总页与终裁页
- 管理端基于新等级制的聚合展示

未完成原因：

- 当前代码主链路未形成可运行闭环，继续执行只能得到一致的失败结果，不具备有效联调价值

## 上线前检查清单

### 必须完成

- 评价页改为新等级制表单，不能再依赖 `formConfig.fields` 和旧 `score` 均分模型
- 云函数补齐 `saveEvaluationDraft`
- 云函数补齐 `submitFounderDecision`
- 前后端统一 `founder` 角色支持
- 提交接口以新字段为主：
  - `dimensions`
  - `dimensionRemarks`
  - `styleTags`
  - `attachments`
  - `summaryComment`
- 补齐“同维度 S/C 严重分歧”聚合逻辑
- 补齐“面试官仅可见本人评价、不可见终裁”的权限裁剪
- 候选人状态流转改为目标值：
  - 全员提交后 -> `Pending`
  - 终裁后 -> `Finalized`
- 更新接口文档，删除旧 `score: 88` 作为主流程示例

### 建议完成

- 清点所有主流程页面是否仍引用 `calculateRating`
- 清点所有当前流程页面是否仍展示 `A级/B级/C级/D级`
- 管理端展示改为以新等级制维度字段为主，不再只展示旧 `score`
- 增加最小化回归脚本，覆盖规则 1-4、10-12

## 建议统一说明

```text
统一约束：
1. 先阅读自己负责范围内的现有实现，再开始改。
2. 不要跨范围修改文件，避免冲突。
3. 所有手工代码编辑必须使用 apply_patch。
4. 对外字段名统一使用：
   - appearance
   - talent
   - teaching
   - selfIntro
   - qa
5. 如果接口字段名不确定，先以后端终端定义为准，其他终端对齐。
6. 完成后汇报：修改文件、核心实现、待联调事项、未解决风险。
```

## 结论

当前版本不能作为“新面试等级制”上线候选版本。

原因不是单一 bug，而是四个关键段落尚未收敛到同一协议：

- 小程序评价页仍是旧评分模型
- 云函数缺失草稿/终裁 action
- 权限与状态机未切到目标规则
- 文档和后台展示仍大量沿用旧 `score`/旧评级语义

建议按“先闭环主链路，再清理旧逻辑残留”的顺序推进，避免在旧页面和旧文档上继续叠加兼容逻辑。
