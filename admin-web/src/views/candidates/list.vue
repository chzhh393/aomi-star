<template>
  <div class="candidates-page">
    <MetricCardGrid :cards="metricCards" :active-key="activeFilter" @select="setFilter" />

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="6">
          <el-input
            v-model="keyword"
            placeholder="搜索姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </el-col>
        <el-col :xs="24" :sm="18" class="filter-radio-col">
          <el-radio-group v-model="activeFilter" @change="handleFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="pending">待审核</el-radio-button>
            <el-radio-button label="approved">待面试安排</el-radio-button>
            <el-radio-button label="interview_scheduled">已安排面试</el-radio-button>
            <el-radio-button label="online_test_completed">线上测试完成</el-radio-button>
            <el-radio-button label="rated">面试通过</el-radio-button>
            <el-radio-button label="rejected">未通过</el-radio-button>
            <el-radio-button label="signed">已签约</el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 批量操作栏 -->
    <transition name="batch-bar">
      <div v-if="selectedIds.length > 0" class="batch-bar">
        <div class="batch-bar-left">
          <el-checkbox
            :model-value="isAllSelected"
            :indeterminate="isIndeterminate"
            @change="handleSelectAll"
          >全选</el-checkbox>
          <span class="batch-count">已选 <strong>{{ selectedIds.length }}</strong> 人</span>
        </div>
        <div class="batch-bar-right">
          <el-button type="primary" @click="handleBatchAssign" v-if="hasPermission('assignCandidates')">
            <el-icon><Connection /></el-icon>
            批量分配
          </el-button>
          <el-button type="success" @click="handleBatchApprove" :disabled="!hasPendingSelected">批量通过</el-button>
          <el-button type="danger" @click="handleBatchReject" :disabled="!hasPendingSelected">批量拒绝</el-button>
          <el-button @click="clearSelection">取消选择</el-button>
        </div>
      </div>
    </transition>

    <!-- 候选人列表 -->
    <div class="candidate-list" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty-tip">暂无数据</div>

      <div v-for="row in list" :key="row._id" :class="['candidate-card', { 'is-selected': selectedIds.includes(row._id) }]" @click="handleView(row)">
        <!-- 勾选框 -->
        <el-checkbox
          :model-value="selectedIds.includes(row._id)"
          @change="(val) => toggleSelect(row, val)"
          @click.stop
          class="candidate-checkbox"
        />
        <!-- 左侧：头像 -->
        <el-avatar :size="56" :src="row.images?.facePhoto" class="candidate-avatar" />

        <!-- 中间：信息区 -->
        <div class="candidate-info">
          <div class="candidate-header">
            <span class="candidate-name">
              {{ row.basicInfo?.name || '-' }}
              <span v-if="row.basicInfo?.artName" class="stage-name-inline">
                ({{ row.basicInfo.artName }})
              </span>
            </span>
            <el-tag
              v-if="getInterviewDecisionTag(row)"
              :type="getInterviewDecisionTag(row).type"
              size="small"
              effect="plain"
              round
              class="decision-status-tag"
            >
              {{ getInterviewDecisionTag(row).label }}
            </el-tag>
            <el-tag :type="STATUS_MAP[row.status]?.type || 'info'" size="small" effect="dark" round>
              {{ STATUS_MAP[row.status]?.label || row.status }}
            </el-tag>
          </div>
          <div v-if="row.experience?.accountName" class="candidate-name-extra">
            <span class="name-pill name-pill-live">直播名：{{ row.experience.accountName }}</span>
          </div>
          <div v-if="row.assignedAgent?.agentName" class="candidate-name-extra">
            <span class="name-pill name-pill-agent">
              经纪人：{{ row.assignedAgent.agentName }}<template v-if="row.assignedAgent.agentPhone"> · {{ row.assignedAgent.agentPhone }}</template>
            </span>
          </div>
          <div v-if="getCandidateFailReason(row)" class="candidate-name-extra">
            <span class="name-pill name-pill-danger">
              未通过原因：{{ getCandidateFailReason(row) }}
            </span>
          </div>
          <div class="candidate-meta">
            <span class="meta-item">{{ row.basicInfo?.gender || '-' }}</span>
            <span class="meta-divider">/</span>
            <span class="meta-item">{{ row.basicInfo?.age || '-' }}岁</span>
            <span class="meta-divider">/</span>
            <span class="meta-item">{{ row.basicInfo?.height || '-' }}cm</span>
            <template v-if="!isAgent()">
              <span class="meta-divider">|</span>
              <span class="meta-item meta-phone">{{ row.basicInfo?.phone || '-' }}</span>
            </template>
            <template v-if="row.basicInfo?.mbti">
              <span class="meta-divider">|</span>
              <span class="meta-item meta-mbti">{{ row.basicInfo.mbti }}</span>
            </template>
            <span class="meta-divider">|</span>
            <span :class="['meta-item', row.experience?.hasExperience ? 'meta-exp-yes' : 'meta-exp-no']">
              {{ row.experience?.hasExperience ? '有直播经验' : '无经验' }}
            </span>
            <span v-if="row.experience?.hasExperience && row.experience?.guild" class="meta-item meta-guild">
              {{ row.experience.guild }}
            </span>
            <template v-if="row.referral && !isAgent()">
              <span class="meta-divider">|</span>
              <el-tag size="small" type="success" effect="plain" round class="meta-scout">
                ⭐ 星探推荐：{{ row.referral.scoutName || row.referral.scoutShareCode }}
              </el-tag>
            </template>
          </div>
          <div class="candidate-extra">
            <div class="talent-tags" v-if="row.talent?.talents?.length || row.talent?.otherTalent">
              <el-tag
                v-for="t in row.talent.talents.slice(0, 4)"
                :key="t"
                size="small"
                type="info"
                effect="plain"
                round
              >{{ t }}</el-tag>
              <el-tag
                v-if="row.talent?.otherTalent"
                size="small"
                type="warning"
                effect="plain"
                round
              >{{ row.talent.otherTalent }}</el-tag>
            </div>
            <div class="hobby-tags" v-if="row.basicInfo?.hobbies?.length">
              <el-tag
                v-for="h in row.basicInfo.hobbies.slice(0, 4)"
                :key="h"
                size="small"
                effect="plain"
                round
                class="hobby-chip"
              >{{ h }}</el-tag>
              <span v-if="row.basicInfo.hobbies.length > 4" class="more-count">+{{ row.basicInfo.hobbies.length - 4 }}</span>
            </div>
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
            <span v-if="row.interview" class="time-text interview-time">
              面试：{{ row.interview.date }} {{ row.interview.time }}
            </span>
          </div>
          <div
            v-if="isAdmin && canManageInterviewDecision(row)"
            :class="[
              'decision-inline-bar',
              row.interviewFinalDecision?.decision
                ? `decision-inline-bar-${row.interviewFinalDecision.decision}`
                : (canOpenHighlightedInterviewDecision(row) ? 'decision-inline-bar-ready' : 'decision-inline-bar-locked')
            ]"
          >
            <span class="decision-inline-label">面试终裁</span>
            <span class="decision-inline-value">
              {{
                row.interviewFinalDecision?.decision
                  ? getInterviewDecisionTag(row)?.label
                  : (canOpenHighlightedInterviewDecision(row) ? '可立即处理' : getInterviewDecisionLockReason(row))
              }}
            </span>
          </div>
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="candidate-actions" @click.stop>
          <el-button size="small" @click="handleView(row)">查看</el-button>
          <el-button
            v-if="canViewInterviewEvaluations(row)"
            size="small"
            type="primary"
            plain
            @click="handleViewInterviewEvaluations(row)"
          >
            面试评价
          </el-button>
          <button
            v-if="isAdmin && canManageInterviewDecision(row)"
            type="button"
            :class="[
              'decision-action-btn',
              row.interviewFinalDecision?.decision ? 'decision-action-btn-warning' : 'decision-action-btn-success'
            ]"
            @click.stop="handleOpenInterviewDecision(row)"
          >
            {{ row.interviewFinalDecision?.decision ? '修改终裁' : '面试终裁' }}
          </button>
          <el-button
            v-if="canAssignAgent(row)"
            size="small"
            type="warning"
            plain
            @click="handleAssignCandidate(row)"
          >
            {{ getAssignAgentActionText(row) }}
          </el-button>
          <el-button
            v-if="canManageContractWorkflow(row)"
            size="small"
            type="success"
            plain
            @click="handleOpenContractWorkflow(row)"
          >
            签约流程
          </el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="success" @click="handleApprove(row)">通过</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
          <el-button v-if="canScheduleInterview(row)" size="small" type="warning" @click="handleSchedule(row)">安排面试</el-button>
          <el-button v-if="isAdmin" size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrap" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="drawerVisible" :width="dialogWidth" top="3vh" align-center class="detail-dialog" :show-close="true">
      <template #header>
        <span></span>
      </template>
      <template v-if="currentCandidate">
        <!-- 1. 顶部个人概览 -->
        <div class="detail-profile">
          <el-avatar :size="80" :src="currentCandidate.images?.facePhoto" class="detail-avatar" />
          <div class="detail-profile-info">
            <div class="detail-profile-top">
              <span class="detail-name">
                {{ currentCandidate.basicInfo?.name }}
                <span v-if="currentCandidate.basicInfo?.artName" class="detail-art-name">
                  ({{ currentCandidate.basicInfo.artName }})
                </span>
              </span>
              <el-tag :type="STATUS_MAP[currentCandidate.status]?.type" effect="dark" round>
                {{ STATUS_MAP[currentCandidate.status]?.label }}
              </el-tag>
            </div>
            <div v-if="currentCandidate.experience?.accountName" class="detail-name-extra">
              <el-tag
                size="small"
                type="warning"
                effect="plain"
                round
                class="alias-tag alias-tag-live"
              >
                直播名：{{ currentCandidate.experience.accountName }}
              </el-tag>
            </div>
            <div class="detail-stats">
              <span class="stat-chip">{{ currentCandidate.basicInfo?.gender }}</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.age }}岁</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.height }}cm</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.weight }}kg</span>
              <span v-if="currentCandidate.basicInfo?.mbti" class="stat-chip stat-mbti">{{ currentCandidate.basicInfo.mbti }}</span>
              <span v-if="currentCandidate.basicInfo?.expectedSalary" class="stat-chip stat-salary">💰 期望收入{{ currentCandidate.basicInfo.expectedSalary }}元/月</span>
            </div>
            <div class="detail-style-labels" v-if="currentCandidate.basicInfo?.styleLabels?.length">
              <el-tag
                v-for="label in currentCandidate.basicInfo.styleLabels"
                :key="label"
                effect="plain"
                round
                class="style-label-chip"
              >{{ label }}</el-tag>
            </div>
            <div class="detail-talents" v-if="currentCandidate.talent?.talents?.length || currentCandidate.talent?.otherTalent">
              <el-tag
                v-for="t in currentCandidate.talent.talents"
                :key="t"
                effect="plain"
                round
                class="talent-chip"
              >{{ t }}</el-tag>
              <el-tag
                v-if="currentCandidate.talent?.otherTalent"
                type="warning"
                effect="plain"
                round
                class="talent-chip talent-chip-other"
              >{{ currentCandidate.talent.otherTalent }}</el-tag>
            </div>
          </div>
        </div>

        <!-- 2. 信息卡片网格 -->
        <div class="detail-grid">
          <!-- 联系方式 - 仅非经纪人可见 -->
          <div v-if="!isAgent()" class="info-block">
            <div class="info-block-title">联系方式</div>
            <div class="info-row">
              <span class="info-label">手机</span>
              <span class="info-value">{{ currentCandidate.basicInfo?.phone }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">微信</span>
              <span class="info-value">{{ currentCandidate.basicInfo?.wechat || '-' }}</span>
            </div>
          </div>

          <!-- 社交账号 - 仅非经纪人可见 -->
          <div v-if="!isAgent()" class="info-block">
            <div class="info-block-title">社交账号</div>
            <div class="info-row">
              <span class="info-label">抖音</span>
              <span class="info-value" :class="{'required-field': currentCandidate.basicInfo?.douyin}">
                {{ currentCandidate.basicInfo?.douyin || '-' }}
                <span class="fans-count" v-if="currentCandidate.basicInfo?.douyinFans != null && currentCandidate.basicInfo?.douyinFans !== ''">（{{ currentCandidate.basicInfo.douyinFans }}粉丝）</span>
                <span class="required-badge" v-if="currentCandidate.basicInfo?.douyin">必填项</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">小红书</span>
              <span class="info-value">{{ currentCandidate.basicInfo?.xiaohongshu || '-' }}<span class="fans-count" v-if="currentCandidate.basicInfo?.xiaohongshuFans != null && currentCandidate.basicInfo?.xiaohongshuFans !== ''">（{{ currentCandidate.basicInfo.xiaohongshuFans }}粉丝）</span></span>
            </div>
          </div>
          <div class="info-block">
            <div class="info-block-title">经验</div>
            <div class="info-row">
              <span class="info-label">直播经验</span>
              <span class="info-value">{{ currentCandidate.experience?.hasExperience ? '有' : '无' }}</span>
            </div>
            <div class="info-row" v-if="currentCandidate.experience?.hasExperience">
              <span class="info-label">所属公会</span>
              <span class="info-value">{{ currentCandidate.experience?.guild || '-' }}</span>
            </div>
            <div class="info-row" v-if="currentCandidate.experience?.hasExperience && currentCandidate.experience?.accountName">
              <span class="info-label">直播账号名</span>
              <span class="info-value">{{ currentCandidate.experience.accountName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">报名时间</span>
              <span class="info-value">{{ formatDate(currentCandidate.createdAt) }}</span>
            </div>
          </div>
          <div v-if="currentCandidate.assignedAgent?.agentName || canAssignAgent(currentCandidate)" class="info-block">
            <div class="info-block-title">
              经纪人
              <el-button
                v-if="canAssignAgent(currentCandidate)"
                type="primary"
                link
                size="small"
                style="float: right; margin-top: -4px"
                @click="handleAssignCandidate(currentCandidate)"
              >
                {{ currentCandidate.assignedAgent?.agentName ? '修改经纪人' : '去设置' }}
              </el-button>
            </div>
            <div class="info-row">
              <span class="info-label">经纪人姓名</span>
              <span class="info-value">{{ currentCandidate.assignedAgent?.agentName || '待设置' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">经纪人电话</span>
              <span class="info-value">{{ currentCandidate.assignedAgent?.agentPhone || '-' }}</span>
            </div>
          </div>
          <div v-if="getCandidateFailReason(currentCandidate)" class="info-block">
            <div class="info-block-title">未通过原因</div>
            <div class="info-row">
              <span class="info-value fail-reason-text">{{ getCandidateFailReason(currentCandidate) }}</span>
            </div>
          </div>
          <div v-if="isAdmin && !isRejectedCandidate(currentCandidate)" class="info-block training-camp-admin-block">
            <div class="info-block-title">入营邀请函</div>
            <div v-if="currentCandidate.trainingCampTodo" class="training-camp-summary">
              <div class="info-row">
                <span class="info-label">当前状态</span>
                <span class="info-value">
                  <el-tag :type="currentCandidate.trainingCampTodo.status === 'pending' ? 'warning' : 'success'" size="small" effect="plain">
                    {{ currentCandidate.trainingCampTodo.status === 'pending' ? '待主播处理' : '已处理' }}
                  </el-tag>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">训练营类型</span>
                <span class="info-value">{{ currentCandidate.trainingCampTodo.campType || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">报到时间</span>
                <span class="info-value">
                  {{ currentCandidate.trainingCampTodo.startDate || '-' }}
                  <template v-if="currentCandidate.trainingCampTodo.startTime"> {{ currentCandidate.trainingCampTodo.startTime }}</template>
                </span>
              </div>
            </div>
            <el-form label-width="96px" class="training-camp-form">
              <el-form-item label="指定经纪人" required>
                <el-select
                  v-model="trainingCampInviteForm.agentId"
                  filterable
                  placeholder="请选择经纪人"
                  :loading="loadingAgents"
                >
                  <el-option
                    v-for="agent in agentList"
                    :key="agent._id"
                    :label="agent.name || agent.username || agent._id"
                    :value="agent._id"
                  >
                    <div class="decision-agent-option">
                      <span>{{ agent.name || agent.username || agent._id }}</span>
                      <span class="decision-agent-option-meta">{{ agent.username || '未设置账号' }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="训练营类型" required>
                <el-select v-model="trainingCampInviteForm.campType" placeholder="请选择训练营类型">
                  <el-option
                    v-for="campType in TRAINING_CAMP_TYPE_OPTIONS"
                    :key="campType"
                    :label="campType"
                    :value="campType"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="报到日期" required>
                <el-date-picker
                  v-model="trainingCampInviteForm.startDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="报到时间" required>
                <el-time-picker
                  v-model="trainingCampInviteForm.startTime"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择时间"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="备注">
                <el-input
                  v-model="trainingCampInviteForm.remark"
                  type="textarea"
                  :rows="2"
                  maxlength="300"
                  show-word-limit
                  placeholder="补充集合要求、携带资料或报到提醒"
                />
              </el-form-item>
            </el-form>
            <div class="training-camp-tip">管理员可忽略当前面试进展，直接指定经纪人并发送邀请函。发送时训练营类型以本次指定内容为准。</div>
            <div class="training-camp-actions">
              <el-button
                type="primary"
                :loading="trainingCampSubmitting"
                :disabled="currentCandidate.trainingCampTodo?.status === 'pending'"
                @click="handleSendTrainingCampTodo"
              >
                {{ currentCandidate.trainingCampTodo?.status === 'pending' ? '已有待处理邀请函' : '指定经纪人并发送邀请函' }}
              </el-button>
            </div>
          </div>
          <!-- 星探推荐 - 仅非经纪人可见 -->
          <div v-if="currentCandidate.referral && !isAgent()" class="info-block">
            <div class="info-block-title">
              星探推荐
              <el-button
                v-if="hasPermission('manageUsers')"
                type="primary"
                link
                size="small"
                style="float: right; margin-top: -4px"
                @click="handleChangeReferral"
              >
                更改星探
              </el-button>
            </div>

            <!-- 推荐链条 -->
            <div class="info-row" v-if="currentCandidate.referral.scoutChainNames && currentCandidate.referral.scoutChainNames.length > 0">
              <span class="info-label">推荐链条</span>
              <span class="info-value chain-value">
                <span
                  v-for="(name, index) in currentCandidate.referral.scoutChainNames"
                  :key="index"
                  class="chain-item"
                >
                  <el-tag
                    :type="index === 0 ? 'warning' : 'info'"
                    size="small"
                    effect="plain"
                  >
                    {{ name }} ({{ index === 0 ? 'SP' : 'SS' }})
                  </el-tag>
                  <span v-if="index < currentCandidate.referral.scoutChainNames.length - 1" class="chain-arrow">→</span>
                </span>
              </span>
            </div>

            <!-- 直接推荐人 -->
            <div class="info-row">
              <span class="info-label">直接推荐人</span>
              <span class="info-value">
                {{ currentCandidate.referral.scoutName || '-' }}
                <el-tag
                  v-if="currentCandidate.referral.scoutLevel"
                  :type="currentCandidate.referral.scoutLevel === 1 ? 'warning' : 'info'"
                  size="small"
                  effect="plain"
                  style="margin-left: 8px"
                >
                  {{ currentCandidate.referral.scoutLevel === 1 ? '星探合伙人 (SP)' : '特约星探 (SS)' }}
                </el-tag>
              </span>
            </div>

            <!-- 推荐码 -->
            <div class="info-row">
              <span class="info-label">推荐码</span>
              <span class="info-value">{{ currentCandidate.referral.scoutShareCode }}</span>
            </div>

            <!-- 推荐时间 -->
            <div class="info-row">
              <span class="info-label">推荐时间</span>
              <span class="info-value">{{ formatDate(currentCandidate.referral.referredAt) }}</span>
            </div>
          </div>
          <!-- 无推荐关系时，管理员可手动指定 -->
          <div v-if="!currentCandidate.referral && !isAgent() && hasPermission('manageUsers')" class="info-block">
            <div class="info-block-title">星探推荐</div>
            <div style="text-align: center; padding: 12px">
              <el-button type="primary" plain size="small" @click="handleChangeReferral">
                指定推荐星探
              </el-button>
            </div>
          </div>
        </div>

        <!-- 3. 面试信息 -->
        <div v-if="currentCandidate.interview" class="detail-section">
          <div class="section-title section-title-with-action">
            <span>面试安排</span>
            <el-button
              v-if="canViewInterviewEvaluations(currentCandidate)"
              type="primary"
              link
              @click="handleViewInterviewEvaluations(currentCandidate)"
            >
              面试评价
            </el-button>
          </div>
          <div class="interview-card">
            <div class="interview-main">
              <span class="interview-date">{{ currentCandidate.interview.date }}</span>
              <span class="interview-time">{{ currentCandidate.interview.time }}</span>
            </div>
            <div class="interview-details" v-if="currentCandidate.interview.location">
              <span class="info-label">地点</span>
              <span class="info-value">{{ currentCandidate.interview.location }}</span>
            </div>
            <div class="interview-details" v-if="currentCandidate.interview.interviewers?.length">
              <span class="info-label">面试官</span>
              <span class="info-value">{{ formatInterviewers(currentCandidate.interview.interviewers) }}</span>
            </div>
            <div class="interview-details" v-if="currentCandidate.interview.notes">
              <span class="info-label">备注</span>
              <span class="info-value">{{ currentCandidate.interview.notes }}</span>
            </div>
          </div>

          <!-- 面试打分 -->
          <div v-if="currentCandidate.interview?.score" class="score-display">
            <div class="score-result">
              <el-tag :type="getScoreResultType(currentCandidate.interview.score.result)" size="large">
                {{ getScoreResultText(currentCandidate.interview.score.result) }}
              </el-tag>
              <span class="score-by">评分人：{{ currentCandidate.interview.score.scoredBy }}</span>
              <span class="score-time">{{ formatDate(currentCandidate.interview.score.scoredAt) }}</span>
            </div>
            <div v-if="Object.keys(currentCandidate.interview.score.tags || {}).length > 0" class="score-tags">
              <template v-for="(tags, category) in currentCandidate.interview.score.tags" :key="category">
                <div v-if="tags && tags.length > 0" class="tag-category">
                  <span class="tag-category-name">{{ getTagCategoryName(category) }}：</span>
                  <el-tag v-for="tag in tags" :key="tag" size="small" class="score-tag">{{ tag }}</el-tag>
                </div>
              </template>
            </div>
            <div v-if="currentCandidate.interview.score.comment" class="score-comment">
              <strong>评语：</strong>{{ currentCandidate.interview.score.comment }}
            </div>
          </div>

          <!-- 打分按钮 - 已移至小程序端 -->
          <!-- <div v-if="hasPermission('scoreInterview') && !currentCandidate.interview?.score" class="score-action">
            <el-button type="primary" @click="handleScoreInterview(currentCandidate)">
              面试打分
            </el-button>
          </div> -->

          <!-- 面试资料 -->
          <div v-if="currentCandidate.interview?.materials" class="materials-display">
            <div class="materials-title">面试资料</div>

            <!-- 面试照片 -->
            <div v-if="currentCandidate.interview.materials.photos?.length > 0" class="materials-section">
              <div class="materials-subtitle">面试照片（{{ currentCandidate.interview.materials.photos.length }}）</div>
              <div class="materials-grid">
                <div v-for="(photo, index) in currentCandidate.interview.materials.photos" :key="index" class="material-item">
                  <el-image
                    :src="photo.url"
                    fit="cover"
                    class="material-image"
                    :preview-src-list="currentCandidate.interview.materials.photos.map(p => p.url)"
                    :initial-index="index"
                  />
                  <div class="material-info">
                    <span class="material-uploader">{{ photo.uploadedBy }}</span>
                    <span class="material-time">{{ formatDate(photo.uploadedAt) }}</span>
                  </div>
                  <!-- 删除按钮已移除 - 资料只读显示 -->
                  <!-- <el-button
                    v-if="hasPermission('uploadInterviewMaterials')"
                    link
                    type="danger"
                    size="small"
                    class="material-delete"
                    @click="handleDeleteMaterial(currentCandidate._id, 'photos', photo.fileId)"
                  >
                    删除
                  </el-button> -->
                </div>
              </div>
            </div>

            <!-- 才艺视频 -->
            <div v-if="currentCandidate.interview.materials.videos?.length > 0" class="materials-section">
              <div class="materials-subtitle">才艺视频（{{ currentCandidate.interview.materials.videos.length }}）</div>
              <div class="materials-grid">
                <div v-for="(video, index) in currentCandidate.interview.materials.videos" :key="index" class="material-item">
                  <video
                    :src="video.url"
                    controls
                    class="material-video"
                  />
                  <div class="material-info">
                    <span class="material-uploader">{{ video.uploadedBy }}</span>
                    <span class="material-time">{{ formatDate(video.uploadedAt) }}</span>
                  </div>
                  <!-- 删除按钮已移除 - 资料只读显示 -->
                  <!-- <el-button
                    v-if="hasPermission('uploadInterviewMaterials')"
                    link
                    type="danger"
                    size="small"
                    class="material-delete"
                    @click="handleDeleteMaterial(currentCandidate._id, 'videos', video.fileId)"
                  >
                    删除
                  </el-button> -->
                </div>
              </div>
            </div>
          </div>

          <!-- 上传资料按钮 - 已移至小程序端 -->
          <!-- <div v-if="hasPermission('uploadInterviewMaterials') && currentCandidate.interview" class="upload-materials-action">
            <el-button @click="handleUploadPhotos(currentCandidate)">
              <el-icon><Plus /></el-icon>
              上传面试照片
            </el-button>
            <el-button @click="handleUploadVideos(currentCandidate)">
              <el-icon><Plus /></el-icon>
              上传才艺视频
            </el-button>
          </div> -->
        </div>

        <div v-if="canViewContractWorkflowDetails(currentCandidate)" class="detail-section">
          <div class="section-title section-title-with-action">
            <span>签约流程</span>
            <el-button
              v-if="canManageContractWorkflow(currentCandidate)"
              type="success"
              link
              @click="handleOpenContractWorkflow(currentCandidate)"
            >
              打开流程
            </el-button>
          </div>
          <div class="contract-overview-card">
            <div class="contract-overview-head">
              <el-tag :type="getContractWorkflowTagType(currentCandidate.contractWorkflow?.status)" effect="plain" round>
                {{ getContractWorkflowLabel(currentCandidate.contractWorkflow?.status) }}
              </el-tag>
              <span v-if="currentCandidate.contractWorkflow?.recommendation?.allS" class="contract-highlight">
                全员 S 级评价，建议优先推进签约
              </span>
            </div>
            <div class="contract-overview-grid">
              <div class="contract-overview-item">
                <span class="contract-overview-label">合同类型</span>
                <span class="contract-overview-value">{{ currentCandidate.contractWorkflow?.draft?.type || '-' }}</span>
              </div>
              <div class="contract-overview-item">
                <span class="contract-overview-label">合同期限</span>
                <span class="contract-overview-value">{{ currentCandidate.contractWorkflow?.draft?.durationMonths ? `${currentCandidate.contractWorkflow.draft.durationMonths}个月` : '-' }}</span>
              </div>
              <div class="contract-overview-item">
                <span class="contract-overview-label">财务审核</span>
                <span class="contract-overview-value">{{ getApprovalLabel(currentCandidate.contractWorkflow?.financeReview?.status) }}</span>
              </div>
              <div class="contract-overview-item">
                <span class="contract-overview-label">管理员审批</span>
                <span class="contract-overview-value">{{ getApprovalLabel(currentCandidate.contractWorkflow?.adminApproval?.status) }}</span>
              </div>
            </div>
            <div v-if="currentCandidate.contractWorkflow?.draft?.fileUrl" class="contract-link-row">
              <span class="contract-overview-label">合同文件</span>
              <a :href="currentCandidate.contractWorkflow.draft.fileUrl" target="_blank" rel="noreferrer" class="contract-file-link">
                {{ currentCandidate.contractWorkflow?.draft?.fileName || '查看合同文件' }}
              </a>
            </div>
            <div v-if="currentCandidate.contractWorkflow?.negotiation?.note" class="contract-note-block">
              <div class="contract-overview-label">协商备注</div>
              <div class="contract-note-text">{{ currentCandidate.contractWorkflow.negotiation.note }}</div>
            </div>
            <div v-if="currentCandidate.contractWorkflow?.eSign?.taskId || currentCandidate.contractWorkflow?.eSign?.status" class="contract-note-block">
              <div class="contract-overview-label">电子签状态</div>
              <div class="contract-note-text">
                {{ getESignStatusLabel(currentCandidate.contractWorkflow?.eSign?.status) }}
                <template v-if="currentCandidate.contractWorkflow?.eSign?.lastMessage"> · {{ currentCandidate.contractWorkflow.eSign.lastMessage }}</template>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 照片 -->
        <div class="detail-section">
          <div class="section-title">照片</div>
          <div class="photo-grid">
            <el-image
              v-for="(photo, index) in candidatePhotoList"
              :key="photo.key"
              :src="photo.url"
              class="photo-item"
              fit="cover"
              :preview-src-list="candidatePhotoPreviewList"
              :initial-index="index"
              preview-teleported
            />
          </div>
        </div>

        <!-- 5. 流水截图 -->
        <div v-if="currentCandidate.experience?.hasExperience && currentCandidate.experience?.incomeScreenshot" class="detail-section">
          <div class="section-title">流水截图</div>
          <div class="income-screenshot-section">
            <el-image
              :src="currentCandidate.experience.incomeScreenshot"
              class="income-screenshot-item"
              fit="contain"
              :preview-src-list="[currentCandidate.experience.incomeScreenshot]"
            />
            <div class="screenshot-note">
              <span class="note-icon">📊</span>
              <span class="note-text">直播流水截图（有经验者必填）</span>
            </div>
          </div>
        </div>

        <!-- 6. 视频 -->
        <div v-if="candidateVideos.length > 0" class="detail-section">
          <div class="section-title">才艺视频</div>
          <div class="video-grid">
            <video
              v-for="(v, i) in candidateVideos"
              :key="i"
              :src="v.url"
              :poster="v.thumb"
              controls
              class="video-item"
            />
          </div>
        </div>

        <div v-if="isAdmin && canManageInterviewDecision(currentCandidate)" class="detail-section decision-section">
          <div class="section-title">面试终裁</div>
          <div v-loading="interviewSummaryLoading" class="decision-panel">
            <template v-if="interviewSummary">
              <div v-if="canBypassInterviewDecision(currentCandidate)" class="decision-admin-tip">
                管理员可无视当前面试流程直接通过面试。通过时必须指定经纪人，后续可继续按经纪人模板补发训练营邀请函。
              </div>
              <div class="decision-progress">
                <div class="decision-progress-head">
                  <span>面试反馈进度</span>
                  <span>{{ interviewProgressText }}</span>
                </div>
                <el-progress
                  :percentage="interviewProgressPercent"
                  :stroke-width="10"
                  :show-text="false"
                  color="#13e8dd"
                />
              </div>

              <div class="decision-meta-grid">
                <div class="decision-meta-item">
                  <span class="decision-meta-label">流程状态</span>
                  <span class="decision-meta-value">{{ getWorkflowStatusLabel(interviewSummary.progress?.workflowStatus) }}</span>
                </div>
                <div class="decision-meta-item">
                  <span class="decision-meta-label">已提交反馈</span>
                  <span class="decision-meta-value">{{ interviewSummary.progress?.submittedCount || 0 }} / {{ interviewSummary.progress?.totalAssigned || 0 }}</span>
                </div>
                <div class="decision-meta-item">
                  <span class="decision-meta-label">当前终裁</span>
                  <span class="decision-meta-value">{{ currentDecisionLabel }}</span>
                </div>
                <div class="decision-meta-item">
                  <span class="decision-meta-label">决策人</span>
                  <span class="decision-meta-value">{{ interviewSummary.finalDecision?.decidedBy?.name || '-' }}</span>
                </div>
              </div>

              <div class="decision-actions">
                <el-radio-group v-model="decisionForm.decision">
                  <el-radio-button value="accepted">通过</el-radio-button>
                  <el-radio-button value="pending">待定</el-radio-button>
                  <el-radio-button value="rejected">不通过</el-radio-button>
                </el-radio-group>
              </div>

              <el-input
                v-model="decisionForm.comment"
                type="textarea"
                :rows="3"
                placeholder="填写管理员终裁备注"
              />

              <div class="decision-agent-card">
                <div class="decision-agent-title">指定经纪人</div>
                <div class="decision-agent-desc">终裁“通过”时必须同时指定经纪人；待定或不通过可不选。</div>
                <el-select
                  v-model="decisionForm.agentId"
                  filterable
                  :clearable="decisionForm.decision !== 'accepted'"
                  :loading="loadingAgents"
                  placeholder="请选择签约经纪人"
                >
                  <el-option
                    v-for="agent in agentList"
                    :key="agent._id"
                    :label="agent.name || agent.username || agent._id"
                    :value="agent._id"
                  >
                    <div class="decision-agent-option">
                      <span>{{ agent.name || agent.username || agent._id }}</span>
                      <span class="decision-agent-option-meta">{{ agent.username || '未设置账号' }}</span>
                    </div>
                  </el-option>
                </el-select>
                <div class="decision-agent-tip">终裁通过时会与经纪人指定一起提交，避免终裁和分配状态不一致。</div>
              </div>

              <div v-if="interviewSummary.finalDecision?.comment" class="decision-history">
                <div class="decision-history-title">最近终裁备注</div>
                <div class="decision-history-text">{{ interviewSummary.finalDecision.comment }}</div>
              </div>

              <div class="decision-footer">
                <el-button
                  type="primary"
                  :loading="decisionSubmitting"
                  @click="handleSubmitInterviewDecision"
                >
                  保存面试决定
                </el-button>
                <el-button plain @click="handleViewInterviewEvaluations(currentCandidate)">查看面试反馈详情</el-button>
              </div>
            </template>

            <el-empty v-else description="暂无面试反馈数据" />
          </div>
        </div>

        <!-- 7. 底部操作 -->
        <div class="detail-footer" v-if="currentCandidate.status === 'pending' || currentCandidate.status === 'approved' || isAdmin">
          <template v-if="currentCandidate.status === 'pending'">
            <el-button type="success" size="large" @click="handleApprove(currentCandidate)">审核通过</el-button>
            <el-button type="danger" size="large" @click="handleReject(currentCandidate)">拒绝</el-button>
          </template>
          <el-button v-if="canScheduleInterview(currentCandidate)" type="primary" size="large" @click="handleSchedule(currentCandidate)">安排面试</el-button>
          <el-button v-if="canAssignAgent(currentCandidate)" type="warning" size="large" plain @click="handleAssignCandidate(currentCandidate)">{{ getAssignAgentActionText(currentCandidate) }}</el-button>
          <el-button v-if="isAdmin" type="danger" size="large" plain @click="handleDelete(currentCandidate)">删除</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝原因对话框 -->
    <el-dialog v-model="rejectDialogVisible" title="拒绝原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入拒绝原因（可选）" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 安排面试对话框 -->
    <el-dialog v-model="scheduleDialogVisible" title="安排面试" width="500px">
      <el-form :model="scheduleForm" label-width="80px">
        <el-form-item label="面试日期" required>
          <el-date-picker v-model="scheduleForm.interviewDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="面试时间" required>
          <el-time-picker v-model="scheduleForm.interviewTime" placeholder="选择时间" format="HH:mm" value-format="HH:mm" style="width: 100%" />
        </el-form-item>
        <el-form-item label="面试地点">
          <el-input v-model="scheduleForm.location" placeholder="如：公司会议室A / 线上链接" />
        </el-form-item>
        <el-form-item label="面试官">
          <el-select
            v-model="scheduleForm.interviewers"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择面试官"
            style="width: 100%"
            :loading="loadingInterviewers"
          >
            <el-option
              v-for="interviewer in interviewerOptions"
              :key="interviewer._id"
              :label="formatInterviewerOption(interviewer)"
              :value="interviewer._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="scheduleForm.notes" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSchedule">确认安排</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="decisionDialogVisible"
      title="面试终裁"
      :width="isMobile ? '96vw' : '680px'"
      destroy-on-close
      class="decision-dialog"
    >
      <div v-loading="interviewSummaryLoading" class="decision-panel decision-dialog-panel">
        <template v-if="decisionDialogCandidate && interviewSummary">
          <div class="decision-dialog-summary">
            <div class="decision-dialog-name">
              {{ decisionDialogCandidate.basicInfo?.name || decisionDialogCandidate.name || '-' }}
            </div>
            <div class="decision-dialog-meta">
              <span>状态：{{ STATUS_MAP[decisionDialogCandidate.status]?.label || decisionDialogCandidate.status || '-' }}</span>
              <span v-if="decisionDialogCandidate.assignedAgent?.agentName">
                当前经纪人：{{ decisionDialogCandidate.assignedAgent.agentName }}
              </span>
              <span v-if="decisionDialogCandidate.assignedAgent?.agentPhone">
                经纪人电话：{{ decisionDialogCandidate.assignedAgent.agentPhone }}
              </span>
            </div>
          </div>

          <div class="decision-progress">
            <div class="decision-progress-head">
              <span>面试反馈进度</span>
              <span>{{ interviewProgressText }}</span>
            </div>
            <el-progress
              :percentage="interviewProgressPercent"
              :stroke-width="10"
              :show-text="false"
              color="#13e8dd"
            />
          </div>

          <div class="decision-meta-grid">
            <div class="decision-meta-item">
              <span class="decision-meta-label">流程状态</span>
              <span class="decision-meta-value">{{ getWorkflowStatusLabel(interviewSummary.progress?.workflowStatus) }}</span>
            </div>
            <div class="decision-meta-item">
              <span class="decision-meta-label">已提交反馈</span>
              <span class="decision-meta-value">{{ interviewSummary.progress?.submittedCount || 0 }} / {{ interviewSummary.progress?.totalAssigned || 0 }}</span>
            </div>
            <div class="decision-meta-item">
              <span class="decision-meta-label">当前终裁</span>
              <span class="decision-meta-value">{{ currentDecisionLabel }}</span>
            </div>
            <div class="decision-meta-item">
              <span class="decision-meta-label">决策人</span>
              <span class="decision-meta-value">{{ interviewSummary.finalDecision?.decidedBy?.name || '-' }}</span>
            </div>
          </div>

          <div class="decision-actions">
            <el-radio-group v-model="decisionForm.decision">
              <el-radio-button value="accepted">通过</el-radio-button>
              <el-radio-button value="pending">待定</el-radio-button>
              <el-radio-button value="rejected">不通过</el-radio-button>
            </el-radio-group>
          </div>

          <el-input
            v-model="decisionForm.comment"
            type="textarea"
            :rows="3"
            placeholder="填写管理员终裁备注"
          />

          <div class="decision-agent-card">
            <div class="decision-agent-title">指定经纪人</div>
            <div class="decision-agent-desc">终裁“通过”时必须同时指定经纪人；待定或不通过可不选。</div>
            <el-select
              v-model="decisionForm.agentId"
              filterable
              :clearable="decisionForm.decision !== 'accepted'"
              :loading="loadingAgents"
              placeholder="请选择签约经纪人"
            >
              <el-option
                v-for="agent in agentList"
                :key="agent._id"
                :label="agent.name || agent.username || agent._id"
                :value="agent._id"
              >
                <div class="decision-agent-option">
                  <span>{{ agent.name || agent.username || agent._id }}</span>
                  <span class="decision-agent-option-meta">{{ agent.username || '未设置账号' }}</span>
                </div>
              </el-option>
            </el-select>
            <div class="decision-agent-tip">终裁通过时会与经纪人指定一起提交，避免终裁和分配状态不一致。</div>
          </div>

          <div v-if="isAdmin" class="decision-agent-card">
            <div class="decision-agent-title">补发入营邀请函</div>
            <div class="decision-agent-desc">管理员可代指定经纪人补发，发送后沿用经纪人侧相同的逻辑与模板。</div>
            <div v-if="decisionDialogCandidate?.trainingCampTodo" class="training-camp-summary">
              <div class="info-row">
                <span class="info-label">当前状态</span>
                <span class="info-value">
                  <el-tag :type="decisionDialogCandidate.trainingCampTodo.status === 'pending' ? 'warning' : 'success'" size="small" effect="plain">
                    {{ decisionDialogCandidate.trainingCampTodo.status === 'pending' ? '待主播处理' : '已处理' }}
                  </el-tag>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">训练营类型</span>
                <span class="info-value">{{ decisionDialogCandidate.trainingCampTodo.campType || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">报到时间</span>
                <span class="info-value">
                  {{ decisionDialogCandidate.trainingCampTodo.startDate || '-' }}
                  <template v-if="decisionDialogCandidate.trainingCampTodo.startTime"> {{ decisionDialogCandidate.trainingCampTodo.startTime }}</template>
                </span>
              </div>
            </div>
            <el-form label-width="96px" class="training-camp-form">
              <el-form-item label="指定经纪人" required>
                <el-select
                  v-model="trainingCampInviteForm.agentId"
                  filterable
                  placeholder="请选择经纪人"
                  :loading="loadingAgents"
                >
                  <el-option
                    v-for="agent in agentList"
                    :key="agent._id"
                    :label="agent.name || agent.username || agent._id"
                    :value="agent._id"
                  >
                    <div class="decision-agent-option">
                      <span>{{ agent.name || agent.username || agent._id }}</span>
                      <span class="decision-agent-option-meta">{{ agent.username || '未设置账号' }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="训练营类型" required>
                <el-select v-model="trainingCampInviteForm.campType" placeholder="请选择训练营类型">
                  <el-option
                    v-for="campType in TRAINING_CAMP_TYPE_OPTIONS"
                    :key="campType"
                    :label="campType"
                    :value="campType"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="报到日期" required>
                <el-date-picker
                  v-model="trainingCampInviteForm.startDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="报到时间" required>
                <el-time-picker
                  v-model="trainingCampInviteForm.startTime"
                  format="HH:mm"
                  value-format="HH:mm"
                  placeholder="选择时间"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item label="备注">
                <el-input
                  v-model="trainingCampInviteForm.remark"
                  type="textarea"
                  :rows="2"
                  maxlength="300"
                  show-word-limit
                  placeholder="补充集合要求、携带资料或报到提醒"
                />
              </el-form-item>
            </el-form>
            <div class="training-camp-tip">发送时将按当前指定经纪人身份补发，训练营类型以本次填写内容为准。</div>
            <div class="training-camp-actions">
              <el-button
                type="primary"
                :loading="trainingCampSubmitting"
                :disabled="decisionDialogCandidate?.trainingCampTodo?.status === 'pending'"
                @click="handleSendTrainingCampTodo(decisionDialogCandidate)"
              >
                {{ decisionDialogCandidate?.trainingCampTodo?.status === 'pending' ? '已有待处理邀请函' : '补发入营邀请函' }}
              </el-button>
            </div>
          </div>

          <div v-if="interviewSummary.finalDecision?.comment" class="decision-history">
            <div class="decision-history-title">最近终裁备注</div>
            <div class="decision-history-text">{{ interviewSummary.finalDecision.comment }}</div>
          </div>
        </template>

        <el-empty v-else description="暂无面试反馈数据" />
      </div>

      <template #footer>
        <div class="decision-footer">
          <el-button plain @click="handleViewInterviewEvaluations(decisionDialogCandidate)">查看面试反馈详情</el-button>
          <el-button @click="decisionDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="decisionSubmitting"
            @click="handleSubmitInterviewDecision(decisionDialogCandidate)"
          >
            保存面试决定
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 面试打分对话框 -->
    <el-dialog v-model="scoreDialogVisible" title="面试打分" width="600px">
      <el-form :model="scoreForm" label-width="100px">
        <el-form-item label="评分结果" required>
          <el-radio-group v-model="scoreForm.result">
            <el-radio value="pass_s">通过 S（优秀）</el-radio>
            <el-radio value="pass_a">通过 A（良好）</el-radio>
            <el-radio value="pass_b">通过 B（合格）</el-radio>
            <el-radio value="fail">不通过</el-radio>
            <el-radio value="pending">待定</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="形象气质">
          <el-checkbox-group v-model="scoreForm.tags.appearance">
            <el-checkbox value="优秀">优秀</el-checkbox>
            <el-checkbox value="良好">良好</el-checkbox>
            <el-checkbox value="一般">一般</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="才艺表现">
          <el-checkbox-group v-model="scoreForm.tags.talent">
            <el-checkbox value="专业">专业</el-checkbox>
            <el-checkbox value="有潜力">有潜力</el-checkbox>
            <el-checkbox value="需提升">需提升</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="表达能力">
          <el-checkbox-group v-model="scoreForm.tags.expression">
            <el-checkbox value="流畅">流畅</el-checkbox>
            <el-checkbox value="清晰">清晰</el-checkbox>
            <el-checkbox value="需锻炼">需锻炼</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="个性特点">
          <el-checkbox-group v-model="scoreForm.tags.personality">
            <el-checkbox value="外向">外向</el-checkbox>
            <el-checkbox value="稳重">稳重</el-checkbox>
            <el-checkbox value="活泼">活泼</el-checkbox>
            <el-checkbox value="内敛">内敛</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="配合度">
          <el-checkbox-group v-model="scoreForm.tags.cooperation">
            <el-checkbox value="积极">积极</el-checkbox>
            <el-checkbox value="主动">主动</el-checkbox>
            <el-checkbox value="被动">被动</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="综合评语">
          <el-input
            v-model="scoreForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入综合评价"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmScore">确认提交</el-button>
      </template>
    </el-dialog>

    <!-- 上传面试资料对话框 -->
    <el-dialog
      v-model="uploadMaterialsDialogVisible"
      :title="uploadMaterialsType === 'photos' ? '上传面试照片' : '上传才艺视频'"
      width="600px"
    >
      <div class="upload-area">
        <input
          ref="fileInputRef"
          type="file"
          :accept="uploadMaterialsType === 'photos' ? 'image/*' : 'video/*'"
          multiple
          style="display: none"
          @change="handleFileSelect"
        />
        <div class="file-select-area" @click="triggerFileSelect">
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="upload-text">点击选择文件</div>
          <div class="upload-tip">
            {{ uploadMaterialsType === 'photos' ? '支持 JPG、PNG 格式，每张图片不超过 5MB' : '支持 MP4、MOV 格式，每个视频不超过 50MB' }}
          </div>
        </div>
        <div v-if="selectedFiles.length > 0" class="selected-files">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
            <el-button link type="danger" size="small" @click="removeSelectedFile(index)">删除</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="uploadMaterialsDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="selectedFiles.length === 0"
          @click="confirmUploadMaterials"
        >
          确认上传（{{ selectedFiles.length }}）
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量拒绝原因对话框 -->
    <el-dialog v-model="batchRejectDialogVisible" title="批量拒绝" width="450px">
      <p style="margin-bottom: 12px; color: #ccc">
        即将拒绝 <strong style="color: #fff">{{ batchRejectCandidates.length }}</strong> 名候选人
      </p>
      <el-input v-model="batchRejectReason" type="textarea" :rows="3" placeholder="请输入拒绝原因（可选）" />
      <template #footer>
        <el-button @click="batchRejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmBatchReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置经纪人对话框 -->
    <el-dialog v-model="batchAssignDialogVisible" title="批量设置经纪人" width="500px">
      <div class="batch-assign-dialog">
        <div class="selected-info">
          <p style="margin-bottom: 12px; color: #ccc">
            已选择 <strong style="color: #fff">{{ selectedIds.length }}</strong> 名候选人
          </p>
          <div class="candidate-chips">
            <el-tag
              v-for="row in selectedRows.slice(0, 5)"
              :key="row._id"
              size="small"
              style="margin: 4px"
            >
              {{ row.basicInfo?.name }}
            </el-tag>
            <el-tag v-if="selectedRows.length > 5" size="small" type="info" style="margin: 4px">
              等{{ selectedRows.length }}人
            </el-tag>
          </div>
        </div>

        <el-form style="margin-top: 20px">
          <el-form-item label="选择经纪人">
            <el-select
              v-model="selectedAgentId"
              placeholder="请选择经纪人"
              style="width: 100%"
              filterable
              :loading="loadingAgents"
            >
              <el-option
                v-for="agent in agentList"
                :key="agent._id"
                :label="`${agent.name} (${agent.username}) - 已分配: ${agent.assignedCount || 0}人`"
                :value="agent._id"
              >
                <div style="display: flex; justify-content: space-between">
                  <span>{{ agent.name }} ({{ agent.username }})</span>
                  <span style="color: #909399; font-size: 12px">
                    已分配: {{ agent.assignedCount || 0 }}人
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!selectedAgentId"
          @click="confirmBatchAssign"
        >
          确认分配
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="contractDialogVisible" :width="isMobile ? '96vw' : '880px'" top="4vh" class="contract-dialog" destroy-on-close>
      <template #header>
        <div class="contract-dialog-header">
          <div>
            <div class="contract-dialog-title">签约流程</div>
            <div class="contract-dialog-subtitle">
              {{ contractCandidate?.basicInfo?.name || '-' }}
              <span v-if="contractCandidate?.assignedAgent?.agentName"> · 经纪人：{{ contractCandidate.assignedAgent.agentName }}</span>
            </div>
          </div>
          <el-tag :type="getContractWorkflowTagType(contractForm.status)" effect="plain" round>
            {{ getContractWorkflowLabel(contractForm.status) }}
          </el-tag>
        </div>
      </template>

      <div v-loading="contractSubmitting" class="contract-dialog-body">
        <div v-if="contractForm.recommendationReason" class="contract-tip-card">
          <div class="contract-tip-title">{{ contractForm.recommendationAllS ? '签约建议' : '当前判断' }}</div>
          <div class="contract-tip-text">{{ contractForm.recommendationReason }}</div>
        </div>

        <el-form label-width="110px" class="contract-form">
          <el-form-item label="合同标题">
            <el-input v-model="contractForm.title" :disabled="!canEditContractDraft" placeholder="例如：主播经纪合作协议" />
          </el-form-item>
          <el-form-item label="合同类型">
            <el-input v-model="contractForm.type" :disabled="!canEditContractDraft" placeholder="例如：全职经纪约 / 训练营协议" />
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="期限（月）">
                <el-input-number v-model="contractForm.durationMonths" :min="1" :disabled="!canEditContractDraft" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="底薪">
                <el-input-number v-model="contractForm.salary" :min="0" :disabled="!canEditContractDraft" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="提成比例">
                <el-input-number v-model="contractForm.commission" :min="0" :max="100" :disabled="!canEditContractDraft" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="合同文件">
            <el-input v-model="contractForm.fileUrl" :disabled="!canEditContractDraft" placeholder="请输入合同文件 URL 或 CloudBase 文件地址" />
          </el-form-item>
          <el-form-item label="文件名称">
            <el-input v-model="contractForm.fileName" :disabled="!canEditContractDraft" placeholder="例如：薛测试-经纪合同.pdf" />
          </el-form-item>
          <el-form-item label="草稿备注">
            <el-input v-model="contractForm.remark" type="textarea" :rows="3" :disabled="!canEditContractDraft" placeholder="补充合同重点、签约条件、特殊条款" />
          </el-form-item>
        </el-form>

        <div class="contract-status-grid">
          <div class="contract-status-card">
            <div class="contract-status-title">财务审核</div>
            <div class="contract-status-value">{{ getApprovalLabel(contractForm.financeStatus) }}</div>
            <div v-if="contractForm.financeComment" class="contract-status-note">{{ contractForm.financeComment }}</div>
          </div>
          <div class="contract-status-card">
            <div class="contract-status-title">管理员审批</div>
            <div class="contract-status-value">{{ getApprovalLabel(contractForm.adminStatus) }}</div>
            <div v-if="contractForm.adminComment" class="contract-status-note">{{ contractForm.adminComment }}</div>
          </div>
          <div class="contract-status-card">
            <div class="contract-status-title">协商状态</div>
            <div class="contract-status-value">{{ getNegotiationLabel(contractForm.negotiationStatus) }}</div>
            <div v-if="contractForm.negotiationNote" class="contract-status-note">{{ contractForm.negotiationNote }}</div>
          </div>
          <div class="contract-status-card">
            <div class="contract-status-title">电子签状态</div>
            <div class="contract-status-value">{{ getESignStatusLabel(contractForm.eSignStatus) }}</div>
            <div v-if="contractForm.eSignMessage" class="contract-status-note">{{ contractForm.eSignMessage }}</div>
            <a v-if="contractForm.eSignUrl" :href="contractForm.eSignUrl" target="_blank" rel="noreferrer" class="contract-file-link">打开签署链接</a>
          </div>
        </div>

        <el-form label-width="110px" class="contract-form contract-review-form">
          <el-form-item label="财务意见">
            <el-input v-model="contractReviewForm.financeComment" type="textarea" :rows="2" :disabled="!canFinanceReview" placeholder="记录财务审核意见" />
          </el-form-item>
          <el-form-item label="管理员意见">
            <el-input v-model="contractReviewForm.adminComment" type="textarea" :rows="2" :disabled="!canAdminApprove" placeholder="记录管理员审批意见" />
          </el-form-item>
          <el-form-item label="协商备注">
            <el-input v-model="contractReviewForm.negotiationNote" type="textarea" :rows="3" :disabled="!canUpdateNegotiation" placeholder="记录 HR / 经纪人与主播的协商进展" />
          </el-form-item>
          <el-form-item label="协商结果">
            <el-select v-model="contractReviewForm.negotiationStatus" :disabled="!canUpdateNegotiation" style="width: 100%">
              <el-option label="待开始" value="pending" />
              <el-option label="协商中" value="in_progress" />
              <el-option label="需修订" value="revising" />
              <el-option label="已达成一致" value="agreed" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="contract-dialog-footer">
          <el-button @click="contractDialogVisible = false">关闭</el-button>
          <el-button v-if="canEditContractDraft" type="primary" plain @click="handleSaveContractDraft">保存草稿</el-button>
          <el-button v-if="canSubmitFinanceReview" type="warning" @click="handleSubmitContractFinanceReview">提交财务审核</el-button>
          <el-button v-if="canFinanceReview" type="success" plain @click="handleFinanceReview(true)">财务通过</el-button>
          <el-button v-if="canFinanceReview" type="danger" plain @click="handleFinanceReview(false)">财务驳回</el-button>
          <el-button v-if="canAdminApprove" type="success" @click="handleAdminApprove(true)">管理员通过</el-button>
          <el-button v-if="canAdminApprove" type="danger" plain @click="handleAdminApprove(false)">管理员驳回</el-button>
          <el-button v-if="canUpdateNegotiation" type="primary" @click="handleUpdateNegotiation">更新协商进度</el-button>
          <el-button v-if="canLaunchESign" type="success" @click="handleCreateContractESignTask(true)">发起法大大测试签署</el-button>
          <el-button v-if="canRefreshESign" type="info" plain @click="handleRefreshContractESignStatus">刷新签署状态</el-button>
          <el-button v-if="canMockCompleteESign" type="warning" plain @click="handleMockCompleteContractESign">模拟签署完成</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 更改推荐星探对话框 -->
    <el-dialog v-model="referralDialogVisible" title="更改推荐星探" width="500px">
      <div>
        <div v-if="currentCandidate?.referral" style="margin-bottom: 16px">
          <span style="color: #888">当前推荐星探：</span>
          <el-tag type="success" effect="plain">
            {{ currentCandidate.referral.scoutName || currentCandidate.referral.scoutShareCode }}
          </el-tag>
        </div>
        <el-form label-width="80px">
          <el-form-item label="新星探" required>
            <el-select
              v-model="newScoutId"
              placeholder="输入姓名搜索星探"
              style="width: 100%"
              filterable
              remote
              :remote-method="searchScoutList"
              :loading="searchingScouts"
              clearable
            >
              <el-option
                v-for="scout in scoutSearchResults"
                :key="scout._id"
                :label="`${scout.profile?.name || '-'} (${referralGradeLabel(scout.grade)})`"
                :value="scout._id"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ scout.profile?.name || '-' }}</span>
                  <span style="color: #909399; font-size: 12px">
                    {{ referralGradeLabel(scout.grade) }} | {{ scout.profile?.phone || '-' }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="变更原因">
            <el-input v-model="referralChangeReason" placeholder="如：星探离职转移（选填）" />
          </el-form-item>
        </el-form>
        <div v-if="currentCandidate?.referral" style="margin-top: 16px; border-top: 1px solid #333; padding-top: 16px">
          <el-button type="danger" plain size="small" @click="handleRemoveReferral">
            移除推荐关系
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="referralDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="referralSubmitting" :disabled="!newScoutId" @click="confirmChangeReferral">
          确认更改
        </el-button>
      </template>
    </el-dialog>

    <InterviewEvaluationDialog
      v-model="interviewEvaluationVisible"
      :candidate-id="interviewEvaluationCandidateId"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Plus, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAPI, getScouts } from '../../api/admin'
import { interviewAPI } from '../../api/interview'
import InterviewEvaluationDialog from '../../components/candidates/interview-evaluation-dialog.vue'
import MetricCardGrid from '../../components/common/metric-card-grid.vue'
import { STATUS_MAP, formatDate } from '../../utils/constants'
import { resolveCandidateImages } from '../../utils/cloudfile'
import { hasPermission, getUserRole, isAgent } from '../../utils/permission'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const activeFilter = ref('all')
const keyword = ref('')
const route = useRoute()
const router = useRouter()
const candidateStats = reactive({
  total: 0,
  pending: 0,
  approved: 0,
  signed: 0
})
const metricCards = computed(() => [
  { key: 'all', value: candidateStats.total, label: '全部候选人', tone: 'default' },
  { key: 'pending', value: candidateStats.pending, label: '待审核', tone: 'pending' },
  { key: 'approved', value: candidateStats.approved, label: '待面试安排', tone: 'approved' },
  { key: 'signed', value: candidateStats.signed, label: '已签约', tone: 'signed' }
])

// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
const dialogWidth = computed(() => isMobile.value ? '95vw' : '900px')

function onResize() {
  windowWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// 详情抽屉
const drawerVisible = ref(false)
const currentCandidate = ref(null)
const interviewEvaluationVisible = ref(false)
const interviewEvaluationCandidateId = ref('')

const candidatePhotoList = computed(() => {
  if (!currentCandidate.value?.images) return []
  const imgs = currentCandidate.value.images
  return Object.entries(imgs)
    .filter(([, url]) => !!url)
    .map(([key, url]) => ({ key, url }))
})

const candidatePhotoPreviewList = computed(() => candidatePhotoList.value.map(item => item.url))

const candidateVideos = computed(() => {
  return (currentCandidate.value?.talent?.videos || []).filter(v => v.url)
})

const interviewSummary = ref(null)
const interviewSummaryLoading = ref(false)
const decisionSubmitting = ref(false)
const decisionDialogVisible = ref(false)
const decisionDialogCandidate = ref(null)
const decisionForm = reactive({
  decision: '',
  comment: '',
  agentId: ''
})
const TRAINING_CAMP_TYPE_OPTIONS = ['新星训练营', '早早鸟训练营']
const trainingCampSubmitting = ref(false)
const trainingCampInviteForm = reactive({
  agentId: '',
  campType: '',
  startDate: '',
  startTime: '13:00',
  remark: ''
})

const DECISION_LABEL_MAP = {
  accepted: '通过',
  pending: '待定',
  rejected: '不通过'
}

const WORKFLOW_STATUS_LABEL_MAP = {
  pending: '待终裁',
  scheduled: '已安排面试',
  in_progress: '面试进行中',
  collecting: '待收集反馈',
  completed: '反馈已齐',
  finalized: '已终裁'
}

const interviewProgressPercent = computed(() => {
  const progress = interviewSummary.value?.progress || {}
  const total = Number(progress.totalAssigned || 0)
  const submitted = Number(progress.submittedCount || 0)
  return total > 0 ? Math.round((submitted / total) * 100) : 0
})

const interviewProgressText = computed(() => {
  const progress = interviewSummary.value?.progress || {}
  return `${progress.submittedCount || 0} / ${progress.totalAssigned || 0}`
})

const currentDecisionLabel = computed(() => {
  const decision = interviewSummary.value?.finalDecision?.decision || ''
  return DECISION_LABEL_MAP[decision] || '-'
})

const currentRole = computed(() => getUserRole() || '')

const CONTRACT_STATUS_LABELS = {
  drafting: 'HR拟定中',
  finance_review: '待财务审核',
  admin_review: '待管理员审批',
  negotiating: '协商中',
  ready_to_sign: '可组织线上签约',
  signed: '已签约'
}

const NEGOTIATION_STATUS_LABELS = {
  pending: '待开始',
  in_progress: '协商中',
  revising: '需修订',
  agreed: '已达成一致'
}

const ESIGN_STATUS_LABELS = {
  not_started: '未发起',
  signing: '签署中',
  signed: '已签署',
  pending_launch: '待发起',
  failed: '失败',
  config_pending: '待配置'
}

// 判断是否是admin角色（有删除权限）
const isAdmin = computed(() => {
  try {
    const userInfo = localStorage.getItem('userInfo')
    if (!userInfo) return false
    const info = JSON.parse(userInfo)
    return info.role === 'admin'
  } catch {
    return false
  }
})

const contractDialogVisible = ref(false)
const contractSubmitting = ref(false)
const contractCandidate = ref(null)
const contractForm = reactive({
  status: 'drafting',
  recommendationAllS: false,
  recommendationReason: '',
  title: '',
  type: '',
  durationMonths: 12,
  salary: null,
  commission: null,
  fileUrl: '',
  fileName: '',
  remark: '',
  financeStatus: 'pending',
  financeComment: '',
  adminStatus: 'pending',
  adminComment: '',
  negotiationStatus: 'pending',
  negotiationNote: '',
  eSignMode: 'mock',
  eSignStatus: 'not_started',
  eSignUrl: '',
  eSignTaskId: '',
  eSignMessage: ''
})
const contractReviewForm = reactive({
  financeComment: '',
  adminComment: '',
  negotiationStatus: 'pending',
  negotiationNote: ''
})

const canEditContractDraft = computed(() => ['admin', 'hr'].includes(currentRole.value))
const canSubmitFinanceReview = computed(() => ['admin', 'hr'].includes(currentRole.value))
const canFinanceReview = computed(() => ['admin', 'operations', 'finance'].includes(currentRole.value))
const canAdminApprove = computed(() => currentRole.value === 'admin')
const canUpdateNegotiation = computed(() => ['admin', 'hr', 'agent'].includes(currentRole.value))
const canLaunchESign = computed(() => ['admin', 'hr'].includes(currentRole.value) && contractForm.status === 'ready_to_sign')
const canRefreshESign = computed(() => ['admin', 'hr', 'operations', 'finance'].includes(currentRole.value) && !!contractForm.eSignTaskId)
const canMockCompleteESign = computed(() => currentRole.value === 'admin' && contractForm.eSignMode === 'mock' && contractForm.eSignStatus !== 'signed' && !!contractForm.eSignTaskId)

// 拒绝对话框
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingCandidate = ref(null)

// 面试安排对话框
const scheduleDialogVisible = ref(false)
const schedulingCandidate = ref(null)
const interviewerOptions = ref([])
const loadingInterviewers = ref(false)
const INTERVIEWER_ROLE_LABELS = {
  admin: '管理员',
  agent: '经纪人',
  dance_teacher: '舞蹈老师',
  photographer: '摄影师',
  host_mc: '主持/MC',
  makeup_artist: '化妆师',
  stylist: '造型师'
}
const scheduleForm = reactive({
  interviewDate: '',
  interviewTime: '',
  location: '',
  interviewers: [],
  notes: ''
})

// 面试打分对话框
const scoreDialogVisible = ref(false)
const scoringCandidate = ref(null)
const scoreForm = reactive({
  result: '',
  tags: {
    appearance: [],
    talent: [],
    expression: [],
    personality: [],
    cooperation: []
  },
  comment: ''
})

// 上传面试资料对话框
const uploadMaterialsDialogVisible = ref(false)
const uploadMaterialsType = ref('photos') // 'photos' 或 'videos'
const uploadingCandidate = ref(null)
const fileInputRef = ref()
const selectedFiles = ref([])
const uploading = ref(false)

// 批量选择
const selectedIds = ref([])
const selectedRows = ref([])

const isAllSelected = computed(() =>
  list.value.length > 0 && selectedIds.value.length === list.value.length
)
const isIndeterminate = computed(() =>
  selectedIds.value.length > 0 && selectedIds.value.length < list.value.length
)
const hasPendingSelected = computed(() =>
  selectedRows.value.some(r => r.status === 'pending')
)

function toggleSelect(row, checked) {
  if (checked) {
    selectedIds.value.push(row._id)
    selectedRows.value.push(row)
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== row._id)
    selectedRows.value = selectedRows.value.filter(r => r._id !== row._id)
  }
}

function handleSelectAll(checked) {
  if (checked) {
    selectedIds.value = list.value.map(r => r._id)
    selectedRows.value = [...list.value]
  } else {
    clearSelection()
  }
}

function clearSelection() {
  selectedIds.value = []
  selectedRows.value = []
}

async function handleBatchApprove() {
  const pendingRows = selectedRows.value.filter(r => r.status === 'pending')
  if (pendingRows.length === 0) {
    ElMessage.warning('所选候选人中没有待审核状态的')
    return
  }
  const names = pendingRows.slice(0, 3).map(r => r.basicInfo?.name).join('、')
  const suffix = pendingRows.length > 3 ? `等${pendingRows.length}人` : ''
  await ElMessageBox.confirm(`确认批量通过 ${names}${suffix} 的审核？`, '批量审核')
  submitting.value = true
  try {
    const res = await adminAPI.batchUpdateStatus(
      pendingRows.map(r => r._id),
      'approved'
    )
    if (res.success) {
      ElMessage.success(res.message)
      clearSelection()
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleBatchReject() {
  const pendingRows = selectedRows.value.filter(r => r.status === 'pending')
  if (pendingRows.length === 0) {
    ElMessage.warning('所选候选人中没有待审核状态的')
    return
  }
  batchRejectCandidates.value = pendingRows
  batchRejectReason.value = ''
  batchRejectDialogVisible.value = true
}

// 批量拒绝对话框
const batchRejectDialogVisible = ref(false)
const batchRejectReason = ref('')
const batchRejectCandidates = ref([])

async function confirmBatchReject() {
  submitting.value = true
  try {
    const res = await adminAPI.batchUpdateStatus(
      batchRejectCandidates.value.map(r => r._id),
      'rejected',
      batchRejectReason.value
    )
    if (res.success) {
      ElMessage.success(res.message)
      batchRejectDialogVisible.value = false
      clearSelection()
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 批量分配经纪人
const batchAssignDialogVisible = ref(false)
const selectedAgentId = ref('')
const agentList = ref([])
const loadingAgents = ref(false)

function handleBatchAssign() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择候选人')
    return
  }

  if (selectedRows.value.some((row) => isRejectedCandidate(row))) {
    ElMessage.warning('未通过的候选人不能分配经纪人')
    return
  }

  selectedAgentId.value = ''
  batchAssignDialogVisible.value = true
  loadAgentList()
}

function isRejectedCandidate(row) {
  if (!row) return false
  return row.status === 'rejected' || row.interviewFinalDecision?.decision === 'rejected'
}

function getCandidateFailReason(row) {
  if (!row) return ''

  if (row.interviewFinalDecision?.decision === 'rejected') {
    return String(row.interviewFinalDecision?.comment || '').trim()
  }

  if (row.status === 'rejected') {
    return String(row.reviewReason || '').trim()
  }

  return ''
}

function canAssignAgent(row) {
  if (!row || !hasPermission('assignCandidates')) {
    return false
  }
  if (isRejectedCandidate(row)) {
    return false
  }
  return true
}

function getAssignAgentActionText(row) {
  return row?.assignedAgent?.agentId ? '修改经纪人' : '分配经纪人'
}

function canScheduleInterview(row) {
  if (!row) return false
  if (isRejectedCandidate(row)) return false
  return row.status === 'approved'
}

function canManageContractWorkflow(row) {
  if (!row?._id) return false
  if (!['admin', 'hr', 'operations', 'finance', 'agent'].includes(currentRole.value)) return false
  if (row.interviewFinalDecision?.decision !== 'accepted') return false
  if (currentRole.value === 'agent') {
    return Boolean(row.assignedAgent?.agentId)
  }
  return true
}

function canViewContractWorkflowDetails(row) {
  if (!row?._id) return false
  if (!['admin', 'hr', 'operations', 'finance'].includes(currentRole.value)) return false
  return Boolean(row.contractWorkflow || row.interviewFinalDecision?.decision === 'accepted')
}

function getContractWorkflowLabel(status) {
  return CONTRACT_STATUS_LABELS[status] || '未开始'
}

function getContractWorkflowTagType(status) {
  const map = {
    drafting: 'info',
    finance_review: 'warning',
    admin_review: 'warning',
    negotiating: 'primary',
    ready_to_sign: 'success',
    signed: 'success'
  }
  return map[status] || 'info'
}

function getApprovalLabel(status) {
  const map = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已驳回'
  }
  return map[status] || '待处理'
}

function getNegotiationLabel(status) {
  return NEGOTIATION_STATUS_LABELS[status] || '待开始'
}

function getESignStatusLabel(status) {
  return ESIGN_STATUS_LABELS[status] || '未发起'
}

function fillContractForm(candidate) {
  const workflow = candidate?.contractWorkflow || {}
  const draft = workflow.draft || {}
  const financeReview = workflow.financeReview || {}
  const adminApproval = workflow.adminApproval || {}
  const negotiation = workflow.negotiation || {}
  const eSign = workflow.eSign || {}

  contractForm.status = workflow.status || 'drafting'
  contractForm.recommendationAllS = Boolean(workflow.recommendation?.allS)
  contractForm.recommendationReason = workflow.recommendation?.reason || ''
  contractForm.title = draft.title || ''
  contractForm.type = draft.type || ''
  contractForm.durationMonths = draft.durationMonths || 12
  contractForm.salary = draft.salary ?? null
  contractForm.commission = draft.commission ?? null
  contractForm.fileUrl = draft.fileUrl || ''
  contractForm.fileName = draft.fileName || ''
  contractForm.remark = draft.remark || ''
  contractForm.financeStatus = financeReview.status || 'pending'
  contractForm.financeComment = financeReview.comment || ''
  contractForm.adminStatus = adminApproval.status || 'pending'
  contractForm.adminComment = adminApproval.comment || ''
  contractForm.negotiationStatus = negotiation.status || 'pending'
  contractForm.negotiationNote = negotiation.note || ''
  contractForm.eSignMode = eSign.mode || 'mock'
  contractForm.eSignStatus = eSign.status || 'not_started'
  contractForm.eSignUrl = eSign.signUrl || ''
  contractForm.eSignTaskId = eSign.taskId || ''
  contractForm.eSignMessage = eSign.lastMessage || ''

  contractReviewForm.financeComment = financeReview.comment || ''
  contractReviewForm.adminComment = adminApproval.comment || ''
  contractReviewForm.negotiationStatus = negotiation.status || 'pending'
  contractReviewForm.negotiationNote = negotiation.note || ''
}

function handleAssignCandidate(row) {
  const candidateId = getCandidatePrimaryId(row)
  if (!candidateId) {
    ElMessage.warning('候选人信息不完整')
    return
  }

  if (isRejectedCandidate(row)) {
    ElMessage.warning('未通过的候选人不能分配经纪人')
    return
  }

  selectedIds.value = [candidateId]
  selectedRows.value = [normalizeCandidateRecord(row)]
  handleBatchAssign()
}

async function handleOpenContractWorkflow(row) {
  const candidateId = getCandidatePrimaryId(row)
  if (!candidateId) {
    ElMessage.warning('候选人信息不完整')
    return
  }

  contractSubmitting.value = true
  contractDialogVisible.value = true
  try {
    const res = await adminAPI.getCandidateDetail(candidateId)
    const rawCandidate = normalizeCandidateRecord(res.success ? (res.candidate || res.data || row) : row)
    const resolvedList = await resolveCandidateImages([rawCandidate])
    contractCandidate.value = normalizeCandidateRecord(resolvedList[0] || rawCandidate)
    fillContractForm(contractCandidate.value)
  } catch (error) {
    contractCandidate.value = normalizeCandidateRecord(row)
    fillContractForm(contractCandidate.value)
    ElMessage.error(error?.message || '加载签约流程失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function refreshContractCandidate() {
  const candidateId = getCandidatePrimaryId(contractCandidate.value)
  if (!candidateId) return

  const res = await adminAPI.getCandidateDetail(candidateId)
  if (res.success) {
    const rawCandidate = normalizeCandidateRecord(res.candidate || res.data || contractCandidate.value)
    const resolvedList = await resolveCandidateImages([rawCandidate])
    contractCandidate.value = normalizeCandidateRecord(resolvedList[0] || rawCandidate)
    fillContractForm(contractCandidate.value)
    if (getCandidatePrimaryId(currentCandidate.value) === candidateId) {
      currentCandidate.value = contractCandidate.value
    }
    fetchList()
  }
}

async function refreshCurrentCandidateDetail() {
  if (!currentCandidate.value?._id) {
    return
  }

  const detailRes = await adminAPI.getCandidateDetail(currentCandidate.value._id)
  if (detailRes.success && (detailRes.candidate || detailRes.data)) {
    const rawCandidate = normalizeCandidateRecord(detailRes.candidate || detailRes.data)
    const detail = await resolveCandidateImages([rawCandidate])
    currentCandidate.value = normalizeCandidateRecord(detail[0] || rawCandidate)
    fillTrainingCampInviteForm(currentCandidate.value)
  }
}

async function loadAgentList() {
  loadingAgents.value = true
  try {
    const res = await adminAPI.getAgentList()
    if (res.success) {
      agentList.value = res.data || []
    }
  } catch (error) {
    console.error('加载经纪人列表失败:', error)
    ElMessage.error('加载经纪人列表失败')
  } finally {
    loadingAgents.value = false
  }
}

function formatInterviewerOption(interviewer) {
  if (!interviewer) return ''
  const roleLabel = INTERVIEWER_ROLE_LABELS[interviewer.role] || interviewer.role || '面试官'
  const name = interviewer.name || interviewer.username || interviewer._id
  const username = interviewer.username ? ` (${interviewer.username})` : ''
  return `${roleLabel} - ${name}${username}`
}

function formatInterviewers(interviewers = []) {
  if (!Array.isArray(interviewers) || interviewers.length === 0) {
    return '-'
  }

  return interviewers.map((item) => {
    if (typeof item === 'string') {
      return item
    }

    const roleLabel = INTERVIEWER_ROLE_LABELS[item?.role] || ''
    const name = item?.name || item?.username || item?.account || item?.id || item?._id || ''
    return roleLabel && name ? `${roleLabel}(${name})` : (name || roleLabel || '-')
  }).join('、')
}

async function loadInterviewerOptions() {
  if (interviewerOptions.value.length > 0) {
    return
  }

  loadingInterviewers.value = true
  try {
    const res = await adminAPI.getAdminList()
    if (res.success) {
      interviewerOptions.value = (res.data || []).filter((item) => (
        item.status !== 'deleted' &&
        Object.prototype.hasOwnProperty.call(INTERVIEWER_ROLE_LABELS, item.role)
      ))
    } else {
      ElMessage.error(res.error || '加载面试官列表失败')
    }
  } catch (error) {
    console.error('加载面试官列表失败:', error)
    ElMessage.error('加载面试官列表失败')
  } finally {
    loadingInterviewers.value = false
  }
}

async function confirmBatchAssign() {
  if (!selectedAgentId.value) {
    ElMessage.warning('请选择经纪人')
    return
  }

  submitting.value = true
  try {
    const res = await adminAPI.batchAssignCandidates({
      candidateIds: selectedIds.value,
      agentId: selectedAgentId.value
    })

    if (res.success) {
      if (res.unchangedCandidates && res.unchangedCandidates.length > 0) {
        const assignedNames = res.unchangedCandidates
          .slice(0, 3)
          .map(r => r.candidateName)
          .join('、')
        const moreCount = res.unchangedCandidates.length - 3

        ElMessageBox.alert(
          `以下主播的经纪人未发生变化：${assignedNames}${moreCount > 0 ? ` 等${res.unchangedCandidates.length}人` : ''}`,
          '处理完成',
          {
            type: 'info',
            confirmButtonText: '知道了'
          }
        )
      }

      if ((res.successCount || 0) > 0) {
        ElMessage.success(`成功更新 ${res.successCount} 人的经纪人`)
      } else if ((res.unchangedCount || 0) > 0) {
        ElMessage.success('所选主播的经纪人已是当前选择')
      }

      batchAssignDialogVisible.value = false
      await refreshCurrentCandidateDetail()
      clearSelection()
      fetchList()
    } else {
      ElMessage.error(res.error || '分配失败')
    }
  } catch (error) {
    console.error('批量分配失败:', error)
    ElMessage.error('批量分配失败：' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const submitting = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const [res, statsRes] = await Promise.all([
      adminAPI.getCandidateList({
        page: currentPage.value,
        pageSize: pageSize.value,
        status: activeFilter.value,
        keyword: keyword.value
      }),
      keyword.value
        ? Promise.resolve(null)
        : Promise.all([
            adminAPI.getCandidateList({ page: 1, pageSize: 1, status: 'all' }),
            adminAPI.getCandidateList({ page: 1, pageSize: 1, status: 'pending' }),
            adminAPI.getCandidateList({ page: 1, pageSize: 1, status: 'approved' }),
            adminAPI.getCandidateList({ page: 1, pageSize: 1, status: 'signed' })
          ])
    ])
    if (res.success) {
      list.value = await resolveCandidateImages(res.data.list)
      total.value = res.data.total
      if (statsRes) {
        candidateStats.total = statsRes[0]?.data?.total || 0
        candidateStats.pending = statsRes[1]?.data?.total || 0
        candidateStats.approved = statsRes[2]?.data?.total || 0
        candidateStats.signed = statsRes[3]?.data?.total || 0
      } else {
        candidateStats.total = total.value
      }
    } else {
      list.value = []
      total.value = 0
      ElMessage.error(res.error || '获取列表失败')
    }
  } catch (err) {
    ElMessage.error(err?.message || '获取列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  clearSelection()
  syncQuery()
  fetchList()
}

function handleFilterChange() {
  currentPage.value = 1
  clearSelection()
  syncQuery()
  fetchList()
}

function setFilter(filter) {
  if (activeFilter.value === filter) {
    return
  }
  activeFilter.value = filter
  handleFilterChange()
}

function syncQuery() {
  router.replace({
    query: {
      ...route.query,
      status: activeFilter.value === 'all' ? undefined : activeFilter.value,
      keyword: keyword.value || undefined
    }
  })
}

function canViewInterviewEvaluations(row) {
  if (!row) return false
  return Boolean(
    row.interview ||
    ['interview_scheduled', 'online_test_completed', 'pending_rating', 'rated', 'signed'].includes(row.status)
  )
}

function canManageInterviewDecision(row) {
  if (!row) return false
  if (isRejectedCandidate(row)) return false
  if (isAdmin.value) {
    return Boolean(
      row.interview ||
      row.interviewFinalDecision ||
      ['approved', 'interview_scheduled', 'online_test_completed', 'pending_rating', 'rated', 'signed', 'training', 'active'].includes(row.status)
    )
  }
  return Boolean(
    row.interview ||
    row.interviewFinalDecision ||
    ['interview_scheduled', 'online_test_completed', 'pending_rating', 'rated', 'signed'].includes(row.status)
  )
}

function canBypassInterviewDecision(row) {
  return Boolean(
    isAdmin.value &&
    row &&
    !row.interviewFinalDecision?.decision &&
    ['approved', 'interview_scheduled', 'online_test_completed', 'pending_rating', 'rated', 'signed', 'training', 'active'].includes(row.status)
  )
}

function canOpenHighlightedInterviewDecision(row) {
  if (!row || !isAdmin.value) return false
  const hasDecision = Boolean(row.interviewFinalDecision?.decision)
  const readyForDecision = isInterviewDecisionReady(row)
  return !hasDecision && readyForDecision
}

function getInterviewDecisionTag(row) {
  const decision = row?.interviewFinalDecision?.decision
  if (!decision) return null

  const map = {
    accepted: { label: '终裁通过', type: 'success' },
    pending: { label: '终裁待定', type: 'warning' },
    rejected: { label: '终裁不通过', type: 'danger' }
  }

  return map[decision] || { label: '已终裁', type: 'info' }
}

function getWorkflowStatusLabel(status) {
  if (!status) return '-'
  return WORKFLOW_STATUS_LABEL_MAP[status] || status
}

function getCandidatePrimaryId(candidate) {
  return candidate?._id || candidate?.id || candidate?.candidateId || ''
}

function normalizeCandidateRecord(candidate) {
  if (!candidate) return candidate
  const primaryId = getCandidatePrimaryId(candidate)
  return primaryId ? { ...candidate, _id: primaryId } : candidate
}

function isInterviewDecisionReady(row) {
  if (!row) return false
  if (['rated', 'signed'].includes(row.status)) return true

  const submittedCount = Number(row.interviewProgress?.submittedCount || 0)
  const totalAssigned = Number(row.interviewProgress?.totalAssigned || 0)
  return totalAssigned > 0 && submittedCount >= totalAssigned
}

function isInterviewDecisionLocked(row) {
  if (!row) return true
  if (isAdmin.value && canManageInterviewDecision(row)) return false
  if (row.interviewFinalDecision?.decision) return false
  return !isInterviewDecisionReady(row)
}

function getInterviewDecisionLockReason(row) {
  if (!row) return '候选人信息缺失'
  if (isAdmin.value && canManageInterviewDecision(row)) return '管理员可直接处理'
  if (row.interviewFinalDecision?.decision) return ''

  const submittedCount = Number(row.interviewProgress?.submittedCount || 0)
  const totalAssigned = Number(row.interviewProgress?.totalAssigned || 0)

  if (totalAssigned > 0 && submittedCount < totalAssigned) {
    return `待完成反馈 ${submittedCount}/${totalAssigned}`
  }

  if (['interview_scheduled', 'online_test_completed', 'pending_rating'].includes(row.status)) {
    return '待面试反馈完成'
  }

  return '当前不可终裁'
}

function fillDecisionForm(summary, candidate) {
  decisionForm.decision = summary?.finalDecision?.decision || ''
  decisionForm.comment = summary?.finalDecision?.comment || ''
  decisionForm.agentId = candidate?.assignedAgent?.agentId || ''
}

function fillTrainingCampInviteForm(candidate) {
  trainingCampInviteForm.agentId = candidate?.assignedAgent?.agentId || ''
  trainingCampInviteForm.campType = candidate?.trainingCampTodo?.campType || ''
  trainingCampInviteForm.startDate = candidate?.trainingCampTodo?.startDate || ''
  trainingCampInviteForm.startTime = candidate?.trainingCampTodo?.startTime || '13:00'
  trainingCampInviteForm.remark = candidate?.trainingCampTodo?.remark || ''
}

async function loadInterviewSummary(candidateId, candidate = null) {
  if (!candidateId) {
    interviewSummary.value = null
    return
  }

  interviewSummaryLoading.value = true
  try {
    const res = await interviewAPI.getCandidateSummary(candidateId)
    if (res.success) {
      interviewSummary.value = res.data || null
      fillDecisionForm(res.data || null, candidate || currentCandidate.value || decisionDialogCandidate.value)
    } else {
      interviewSummary.value = null
      ElMessage.error(res.error || '加载面试汇总失败')
    }
  } catch (error) {
    interviewSummary.value = null
    ElMessage.error(error?.message || '加载面试汇总失败')
  } finally {
    interviewSummaryLoading.value = false
  }
}

function handleViewInterviewEvaluations(row) {
  if (!row?._id) return
  interviewEvaluationCandidateId.value = row._id
  interviewEvaluationVisible.value = true
}

async function handleOpenInterviewDecision(row) {
  if (!row?._id) {
    ElMessage.warning('候选人信息不完整')
    return
  }

  if (isRejectedCandidate(row)) {
    ElMessage.warning('未通过的候选人已关闭面试终裁入口')
    return
  }

  decisionDialogCandidate.value = row
  decisionDialogVisible.value = true
  interviewSummary.value = null
  fillDecisionForm(null, row)
  fillTrainingCampInviteForm(row)
  await Promise.all([
    loadAgentList(),
    loadInterviewSummary(row._id, row)
  ])
}

async function handleSaveContractDraft() {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.saveContractWorkflowDraft({
      candidateId: contractCandidate.value._id,
      title: contractForm.title,
      type: contractForm.type,
      durationMonths: contractForm.durationMonths,
      salary: contractForm.salary,
      commission: contractForm.commission,
      fileUrl: contractForm.fileUrl,
      fileName: contractForm.fileName,
      remark: contractForm.remark
    })
    if (res.success) {
      ElMessage.success(res.message || '合同草稿已保存')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleSubmitContractFinanceReview() {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.submitContractFinanceReview(contractCandidate.value._id)
    if (res.success) {
      ElMessage.success(res.message || '已提交财务审核')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '提交失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '提交失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleFinanceReview(approved) {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.reviewContractFinance(
      contractCandidate.value._id,
      approved,
      contractReviewForm.financeComment
    )
    if (res.success) {
      ElMessage.success(res.message || '财务审核已更新')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '财务审核失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '财务审核失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleAdminApprove(approved) {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.approveContractAdmin(
      contractCandidate.value._id,
      approved,
      contractReviewForm.adminComment
    )
    if (res.success) {
      ElMessage.success(res.message || '管理员审批已更新')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '管理员审批失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '管理员审批失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleUpdateNegotiation() {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.updateContractNegotiation(
      contractCandidate.value._id,
      contractReviewForm.negotiationStatus,
      contractReviewForm.negotiationNote
    )
    if (res.success) {
      ElMessage.success(res.message || '协商进度已更新')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '更新失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleCreateContractESignTask(useMock = true) {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.createContractESignTask(contractCandidate.value._id, useMock)
    if (res.success) {
      ElMessage.success(res.message || '电子签任务已创建')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '发起电子签失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '发起电子签失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleRefreshContractESignStatus() {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.refreshContractESignStatus(contractCandidate.value._id)
    if (res.success) {
      ElMessage.success(res.message || '签署状态已刷新')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '刷新签署状态失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '刷新签署状态失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleMockCompleteContractESign() {
  if (!contractCandidate.value?._id) return
  contractSubmitting.value = true
  try {
    const res = await adminAPI.mockCompleteContractESign(contractCandidate.value._id)
    if (res.success) {
      ElMessage.success(res.message || '模拟签署已完成')
      await refreshContractCandidate()
    } else {
      ElMessage.error(res.error || '模拟签署失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '模拟签署失败')
  } finally {
    contractSubmitting.value = false
  }
}

async function handleView(row) {
  const candidateId = getCandidatePrimaryId(row)
  currentCandidate.value = normalizeCandidateRecord(row)
  fillTrainingCampInviteForm(currentCandidate.value)
  drawerVisible.value = true
  interviewSummary.value = null
  fillDecisionForm(null, currentCandidate.value)
  // 拉取详情获取完整数据
  try {
    if (candidateId) {
      const res = await adminAPI.getCandidateDetail(candidateId)
      const rawCandidate = normalizeCandidateRecord(res.success ? (res.candidate || res.data || row) : row)
      const detail = await resolveCandidateImages([rawCandidate])
      currentCandidate.value = normalizeCandidateRecord(detail[0] || rawCandidate)
      fillTrainingCampInviteForm(currentCandidate.value)
    }
  } catch {
    // 详情拉取失败时仍使用列表数据
  }

  if (isAdmin.value && canManageInterviewDecision(currentCandidate.value || row)) {
    loadAgentList()
    loadInterviewSummary(candidateId, currentCandidate.value || normalizeCandidateRecord(row))
  } else if (isAdmin.value) {
    loadAgentList()
  }
}

async function handleSendTrainingCampTodo(targetCandidate = currentCandidate.value || decisionDialogCandidate.value) {
  const candidateId = getCandidatePrimaryId(targetCandidate)
  if (!candidateId) {
    ElMessage.warning('候选人信息缺失')
    return
  }

  if (!trainingCampInviteForm.agentId && decisionForm.agentId) {
    trainingCampInviteForm.agentId = decisionForm.agentId
  }

  if (!trainingCampInviteForm.agentId) {
    ElMessage.warning('请选择经纪人')
    return
  }

  if (!trainingCampInviteForm.campType || !trainingCampInviteForm.startDate || !trainingCampInviteForm.startTime) {
    ElMessage.warning('请填写训练营类型和报到时间')
    return
  }

  trainingCampSubmitting.value = true
  try {
    const res = await adminAPI.createTrainingCampTodo({
      candidateId,
      agentId: trainingCampInviteForm.agentId,
      campType: trainingCampInviteForm.campType,
      startDate: trainingCampInviteForm.startDate,
      startTime: trainingCampInviteForm.startTime,
      remark: trainingCampInviteForm.remark.trim()
    })

    if (res.success) {
      ElMessage.success(res.message || '邀请函已发送')
      await refreshCurrentCandidateDetail()
      if (getCandidatePrimaryId(currentCandidate.value) === candidateId) {
        fillTrainingCampInviteForm(currentCandidate.value)
      }
      if (decisionDialogCandidate.value && getCandidatePrimaryId(decisionDialogCandidate.value) === candidateId) {
        const detailRes = await adminAPI.getCandidateDetail(candidateId)
        if (detailRes.success && (detailRes.candidate || detailRes.data)) {
          const rawCandidate = normalizeCandidateRecord(detailRes.candidate || detailRes.data)
          const detail = await resolveCandidateImages([rawCandidate])
          decisionDialogCandidate.value = normalizeCandidateRecord(detail[0] || rawCandidate)
          fillTrainingCampInviteForm(decisionDialogCandidate.value)
        }
      }
      fetchList()
    } else {
      ElMessage.error(res.error || '发送失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '发送失败')
  } finally {
    trainingCampSubmitting.value = false
  }
}

async function handleSubmitInterviewDecision(targetCandidate = currentCandidate.value) {
  const candidateId = getCandidatePrimaryId(targetCandidate)
  if (!candidateId) {
    ElMessage.warning('候选人信息缺失')
    return
  }

  if (!decisionForm.decision) {
    ElMessage.warning('请选择面试决定')
    return
  }

  if (decisionForm.decision === 'accepted' && !decisionForm.agentId) {
    ElMessage.warning('终裁通过时请选择经纪人')
    return
  }

  decisionSubmitting.value = true
  try {
    const res = await interviewAPI.submitFinalDecision({
      candidateId,
      finalDecision: decisionForm.decision,
      comment: decisionForm.comment.trim(),
      agentId: decisionForm.decision === 'accepted' ? decisionForm.agentId : '',
      skipInterviewFlow: isAdmin.value && decisionForm.decision === 'accepted'
    })

    if (res.success) {
      ElMessage.success(res.message || '面试决定已保存')
      await loadInterviewSummary(candidateId, normalizeCandidateRecord(targetCandidate))
      const detailRes = await adminAPI.getCandidateDetail(candidateId)
      if (detailRes.success && (detailRes.candidate || detailRes.data)) {
        const rawCandidate = normalizeCandidateRecord(detailRes.candidate || detailRes.data)
        const detail = await resolveCandidateImages([rawCandidate])
        const normalizedDetail = normalizeCandidateRecord(detail[0] || rawCandidate)
        if (getCandidatePrimaryId(currentCandidate.value) === candidateId) {
          currentCandidate.value = normalizedDetail
        }
        if (getCandidatePrimaryId(decisionDialogCandidate.value) === candidateId) {
          decisionDialogCandidate.value = normalizedDetail
        }
      }
      if (decisionDialogVisible.value && getCandidatePrimaryId(decisionDialogCandidate.value) === candidateId) {
        decisionDialogVisible.value = false
      }
      fetchList()
    } else {
      ElMessage.error(res.error || '面试决定保存失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '面试决定保存失败')
  } finally {
    decisionSubmitting.value = false
  }
}

async function handleApprove(row) {
  await ElMessageBox.confirm(`确认通过 ${row.basicInfo?.name} 的报名审核？`, '审核确认')
  submitting.value = true
  try {
    const res = await adminAPI.updateCandidateStatus(row._id, 'approved')
    if (res.success) {
      ElMessage.success('审核通过')
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleReject(row) {
  rejectingCandidate.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function confirmReject() {
  submitting.value = true
  try {
    const res = await adminAPI.updateCandidateStatus(
      rejectingCandidate.value._id,
      'rejected',
      rejectReason.value
    )
    if (res.success) {
      ElMessage.success('已拒绝')
      rejectDialogVisible.value = false
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

function handleSchedule(row) {
  schedulingCandidate.value = row
  scheduleForm.interviewDate = ''
  scheduleForm.interviewTime = ''
  scheduleForm.location = '成都市成华区府青路街道二环路北4段3号俊屹中心下沉广场奥米光年传媒'
  scheduleForm.interviewers = []
  scheduleForm.notes = ''
  scheduleDialogVisible.value = true
  loadInterviewerOptions()
}

async function confirmSchedule() {
  if (!scheduleForm.interviewDate || !scheduleForm.interviewTime) {
    ElMessage.warning('请选择面试日期和时间')
    return
  }

  if (scheduleForm.interviewers.length === 0) {
    ElMessage.warning('请选择至少一位面试官')
    return
  }

  const selectedInterviewers = interviewerOptions.value
    .filter((item) => scheduleForm.interviewers.includes(item._id))
    .map((item) => ({
      id: item._id,
      _id: item._id,
      adminId: item._id,
      userId: item._id,
      role: item.role,
      name: item.name || item.username || item._id,
      username: item.username || '',
      account: item.username || ''
    }))

  if (selectedInterviewers.length !== scheduleForm.interviewers.length) {
    ElMessage.warning('部分面试官数据无效，请重新选择')
    return
  }

  submitting.value = true
  try {
    const res = await adminAPI.scheduleInterview({
      candidateId: schedulingCandidate.value._id,
      interviewDate: scheduleForm.interviewDate,
      interviewTime: scheduleForm.interviewTime,
      location: scheduleForm.location,
      interviewers: selectedInterviewers,
      notes: scheduleForm.notes
    })
    if (res.success) {
      ElMessage.success('面试安排成功')
      scheduleDialogVisible.value = false
      drawerVisible.value = false
      fetchList()
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 面试打分
function handleScoreInterview(row) {
  scoringCandidate.value = row
  scoreForm.result = ''
  scoreForm.tags = {
    appearance: [],
    talent: [],
    expression: [],
    personality: [],
    cooperation: []
  }
  scoreForm.comment = ''
  scoreDialogVisible.value = true
}

async function confirmScore() {
  if (!scoreForm.result) {
    ElMessage.warning('请选择评分结果')
    return
  }
  submitting.value = true
  try {
    const res = await adminAPI.scoreInterview(scoringCandidate.value._id, scoreForm)
    if (res.success) {
      ElMessage.success('打分成功')
      scoreDialogVisible.value = false
      drawerVisible.value = false
      fetchList()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch (error) {
    console.error('打分失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 获取评分结果类型（用于标签颜色）
function getScoreResultType(result) {
  const typeMap = {
    pass_s: 'success',
    pass_a: 'success',
    pass_b: 'success',
    fail: 'danger',
    pending: 'warning'
  }
  return typeMap[result] || 'info'
}

// 获取评分结果文本
function getScoreResultText(result) {
  const textMap = {
    pass_s: '通过 S（优秀）',
    pass_a: '通过 A（良好）',
    pass_b: '通过 B（合格）',
    fail: '不通过',
    pending: '待定'
  }
  return textMap[result] || result
}

// 获取标签分类名称
function getTagCategoryName(category) {
  const nameMap = {
    appearance: '形象气质',
    talent: '才艺表现',
    expression: '表达能力',
    personality: '个性特点',
    cooperation: '配合度'
  }
  return nameMap[category] || category
}

// 上传面试照片
function handleUploadPhotos(row) {
  uploadingCandidate.value = row
  uploadMaterialsType.value = 'photos'
  selectedFiles.value = []
  uploadMaterialsDialogVisible.value = true
}

// 上传才艺视频
function handleUploadVideos(row) {
  uploadingCandidate.value = row
  uploadMaterialsType.value = 'videos'
  selectedFiles.value = []
  uploadMaterialsDialogVisible.value = true
}

// 触发文件选择
function triggerFileSelect() {
  fileInputRef.value?.click()
}

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files || [])
  const maxSize = uploadMaterialsType.value === 'photos' ? 5 * 1024 * 1024 : 50 * 1024 * 1024

  for (const file of files) {
    if (file.size > maxSize) {
      ElMessage.warning(`文件 ${file.name} 超过大小限制`)
      continue
    }
    selectedFiles.value.push(file)
  }

  // 清空input，以便可以重复选择同一文件
  event.target.value = ''
}

// 移除已选文件
function removeSelectedFile(index) {
  selectedFiles.value.splice(index, 1)
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// 确认上传资料
async function confirmUploadMaterials() {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请选择文件')
    return
  }

  uploading.value = true
  try {
    // 导入 CloudBase SDK
    const { default: wxcloud } = await import('../../api/wxcloud')

    const uploadedMaterials = []

    // 上传每个文件到云存储
    for (const file of selectedFiles.value) {
      const cloudPath = `interview-materials/${uploadMaterialsType.value}/${Date.now()}-${file.name}`

      const uploadResult = await wxcloud.uploadFile(cloudPath, file)

      if (uploadResult.fileID) {
        uploadedMaterials.push({
          url: uploadResult.fileID,
          fileId: uploadResult.fileID
        })
      }
    }

    if (uploadedMaterials.length === 0) {
      ElMessage.error('文件上传失败')
      return
    }

    // 调用云函数保存记录
    const res = await adminAPI.uploadInterviewMaterials(
      uploadingCandidate.value._id,
      uploadMaterialsType.value,
      uploadedMaterials
    )

    if (res.success) {
      ElMessage.success('上传成功')
      uploadMaterialsDialogVisible.value = false
      selectedFiles.value = []
      // 刷新候选人详情
      await viewDetail(uploadingCandidate.value._id)
    } else {
      ElMessage.error(res.error || '保存失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

// 删除面试资料
async function handleDeleteMaterial(candidateId, type, fileId) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个文件吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await adminAPI.deleteInterviewMaterial(candidateId, type, fileId)

    if (res.success) {
      ElMessage.success('删除成功')
      // 刷新候选人详情
      await viewDetail(candidateId)
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(
    `确认删除 ${row.basicInfo?.name} 的报名记录吗？删除后数据将无法恢复。`,
    '删除确认',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )

  submitting.value = true
  try {
    const res = await adminAPI.deleteCandidate(row._id)
    if (res.success) {
      ElMessage.success('删除成功')
      drawerVisible.value = false
      fetchList()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch {
    ElMessage.error('删除失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 更改推荐星探 ====================
const referralGradeLabel = (grade) => {
  const map = { rookie: '新锐', special: '特约', partner: '合伙人' }
  return map[grade] || grade || '新锐'
}

const referralDialogVisible = ref(false)
const newScoutId = ref('')
const referralChangeReason = ref('')
const referralSubmitting = ref(false)
const scoutSearchResults = ref([])
const searchingScouts = ref(false)

const handleChangeReferral = () => {
  newScoutId.value = ''
  referralChangeReason.value = ''
  scoutSearchResults.value = []
  referralDialogVisible.value = true
  searchScoutList('')
}

const searchScoutList = async (query) => {
  searchingScouts.value = true
  try {
    const result = await getScouts({ keyword: query, pageSize: 100 })
    if (result.success) {
      const currentScoutId = currentCandidate.value?.referral?.scoutId
      scoutSearchResults.value = (result.data?.list || [])
        .filter(s => s.status === 'active' && s._id !== currentScoutId)
    }
  } catch (error) {
    console.error('搜索星探失败:', error)
  } finally {
    searchingScouts.value = false
  }
}

const confirmChangeReferral = async () => {
  if (!newScoutId.value) return
  referralSubmitting.value = true
  try {
    const res = await adminAPI.updateCandidateReferral({
      candidateId: currentCandidate.value._id,
      newScoutId: newScoutId.value,
      reason: referralChangeReason.value
    })
    if (res.success) {
      ElMessage.success('推荐关系变更成功')
      referralDialogVisible.value = false
      // 刷新详情
      const detailRes = await adminAPI.getCandidateDetail(currentCandidate.value._id)
      if (detailRes.success && detailRes.candidate) {
        const detail = await resolveCandidateImages([detailRes.candidate])
        currentCandidate.value = detail[0]
      }
      fetchList()
    } else {
      ElMessage.error(res.error || '变更失败')
    }
  } catch (error) {
    ElMessage.error('变更失败：' + error.message)
  } finally {
    referralSubmitting.value = false
  }
}

const handleRemoveReferral = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要移除该候选人的推荐关系吗？移除后星探将不再与此候选人关联。',
      '移除推荐关系',
      { type: 'warning', confirmButtonText: '确认移除', cancelButtonText: '取消' }
    )
    referralSubmitting.value = true
    const res = await adminAPI.updateCandidateReferral({
      candidateId: currentCandidate.value._id,
      newScoutId: '',
      reason: referralChangeReason.value || '管理员手动移除'
    })
    if (res.success) {
      ElMessage.success('已移除推荐关系')
      referralDialogVisible.value = false
      const detailRes = await adminAPI.getCandidateDetail(currentCandidate.value._id)
      if (detailRes.success && detailRes.candidate) {
        const detail = await resolveCandidateImages([detailRes.candidate])
        currentCandidate.value = detail[0]
      }
      fetchList()
    } else {
      ElMessage.error(res.error || '移除失败')
    }
  } catch {
    // 用户取消
  } finally {
    referralSubmitting.value = false
  }
}

onMounted(() => {
  const routeStatus = route.query.status
  const routeKeyword = route.query.keyword
  const validStatuses = ['all', 'pending', 'approved', 'interview_scheduled', 'online_test_completed', 'rated', 'rejected', 'signed']

  if (typeof routeStatus === 'string' && validStatuses.includes(routeStatus)) {
    activeFilter.value = routeStatus
  }

  if (typeof routeKeyword === 'string') {
    keyword.value = routeKeyword
  }

  fetchList()
})
</script>

<style scoped>
.filter-card {
  margin-bottom: 0;
}

/* 批量操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  margin-top: 12px;
  background: #252525;
  border-radius: 10px;
  border: 1px solid #3a3a3a;
}

.batch-bar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.batch-count {
  font-size: 13px;
  color: #aaa;
}

.batch-count strong {
  color: var(--color-cyan, #13e8dd);
  font-size: 15px;
}

.batch-bar-right {
  display: flex;
  gap: 8px;
}

.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: all 0.25s ease;
}
.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 候选人列表 */
.candidate-list {
  margin-top: 12px;
  min-height: 200px;
}

.empty-tip {
  text-align: center;
  padding: 60px 0;
  color: #666;
  font-size: 14px;
}

.candidate-card {
  display: flex;
  position: relative;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-dark, #1e1e1e);
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.candidate-card:hover {
  background: #2a2a2a;
}

.candidate-card.is-selected {
  background: #1a2a2a;
  border: 1px solid rgba(19, 232, 221, 0.3);
}

.candidate-checkbox {
  flex-shrink: 0;
}

.candidate-checkbox :deep(.el-checkbox__inner) {
  width: 22px;
  height: 22px;
  border: 2px solid #555;
  border-radius: 6px;
  background: #2c2c2c;
}

.candidate-checkbox :deep(.el-checkbox__inner::after) {
  width: 6px;
  height: 10px;
  left: 6px;
  top: 2px;
  border-width: 2px;
}

.candidate-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: var(--color-cyan, #13e8dd);
  border-color: var(--color-cyan, #13e8dd);
}

.candidate-checkbox:hover :deep(.el-checkbox__inner) {
  border-color: var(--color-cyan, #13e8dd);
}

.candidate-avatar {
  flex-shrink: 0;
}

/* 信息区 */
.candidate-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.candidate-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.candidate-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.candidate-name-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.decision-status-tag {
  border-color: rgba(255, 255, 255, 0.14);
}

.name-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-cyan, #13e8dd);
  background: rgba(19, 232, 221, 0.1);
  border: 1px solid rgba(19, 232, 221, 0.28);
}

.name-pill-live {
  color: #ffb347;
  background: rgba(255, 179, 71, 0.1);
  border-color: rgba(255, 179, 71, 0.35);
}

.name-pill-agent {
  color: #7cdb86;
  background: rgba(124, 219, 134, 0.1);
  border-color: rgba(124, 219, 134, 0.35);
}

.name-pill-danger {
  color: #fecaca;
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
}

.fail-reason-text {
  color: #fca5a5;
  line-height: 1.7;
  white-space: pre-wrap;
}

.decision-section {
  border: 1px solid rgba(19, 232, 221, 0.18);
}

.decision-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.decision-dialog-panel {
  min-height: 240px;
}

.decision-dialog-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.decision-dialog-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.decision-dialog-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #9fb0b8;
}

.decision-progress {
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(19, 232, 221, 0.06);
}

.decision-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #cfd8dc;
}

.decision-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.decision-meta-item {
  padding: 12px 14px;
  border-radius: 10px;
  background: #252525;
  border: 1px solid #333;
}

.decision-meta-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.decision-meta-value {
  display: block;
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.decision-admin-tip {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 193, 7, 0.22);
  background: rgba(255, 193, 7, 0.08);
  color: #f4d27a;
  font-size: 13px;
  line-height: 1.6;
}

.decision-history {
  padding: 14px 16px;
  border-radius: 10px;
  background: #20242a;
  border: 1px solid #2d3640;
}

.decision-history-title {
  font-size: 12px;
  color: #8fa1b3;
  margin-bottom: 8px;
}

.decision-history-text {
  font-size: 13px;
  line-height: 1.6;
  color: #fff;
  white-space: pre-wrap;
}

.decision-footer {
  display: flex;
  gap: 12px;
}

.decision-agent-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #20242a;
  border: 1px solid #2d3640;
}

.decision-agent-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.decision-agent-desc {
  font-size: 12px;
  line-height: 1.6;
  color: #8fa1b3;
}

.decision-agent-tip {
  font-size: 12px;
  line-height: 1.6;
  color: #7f8c99;
}

.decision-agent-option {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.decision-agent-option-meta {
  color: #909399;
  font-size: 12px;
}

.candidate-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #aaa;
}

.meta-divider {
  color: #555;
  margin: 0 2px;
}

.meta-phone {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

.candidate-extra {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.talent-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-mbti {
  color: var(--color-cyan, #13e8dd);
  font-weight: 500;
}

.meta-exp-yes {
  color: var(--card-green, #00e676);
}

.meta-exp-no {
  color: #666;
}

.meta-guild {
  background: #2a2a2a;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #aaa;
  border: 1px solid #3a3a3a;
}

.meta-scout {
  border-color: rgba(103, 194, 58, 0.4);
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.talent-tags .el-tag {
  border-color: #444;
  color: #ccc;
  background: #2c2c2c;
}

.hobby-tags {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.hobby-chip {
  border-color: rgba(171, 71, 188, 0.3);
  color: var(--card-purple, #ab47bc);
  background: rgba(171, 71, 188, 0.08);
}

.more-count {
  font-size: 12px;
  color: #666;
}

.time-text {
  font-size: 12px;
  color: #666;
}

.interview-time {
  color: var(--color-cyan, #13e8dd);
}

/* 操作按钮 */
.candidate-actions {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  pointer-events: auto;
}

.candidate-actions :deep(.decision-action-btn) {
  position: relative;
  z-index: 3;
  box-shadow: 0 0 0 1px rgba(103, 194, 58, 0.16), 0 6px 18px rgba(103, 194, 58, 0.18);
}

.decision-action-btn {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 15px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: 0.2s;
  box-shadow: 0 0 0 1px rgba(103, 194, 58, 0.16), 0 6px 18px rgba(103, 194, 58, 0.18);
}

.decision-action-btn:hover {
  transform: translateY(-1px);
}

.decision-action-btn-success {
  color: #fff;
  background: #67c23a;
  border-color: #67c23a;
}

.decision-action-btn-success:hover {
  background: #7bcf54;
  border-color: #7bcf54;
}

.decision-action-btn-warning {
  color: #fff;
  background: #e6a23c;
  border-color: #e6a23c;
  box-shadow: 0 0 0 1px rgba(230, 162, 60, 0.18), 0 6px 18px rgba(230, 162, 60, 0.18);
}

.decision-action-btn-warning:hover {
  background: #ebb563;
  border-color: #ebb563;
}

.decision-inline-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.decision-inline-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #a9b4ba;
}

.decision-inline-value {
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.decision-inline-bar-ready {
  background: rgba(103, 194, 58, 0.12);
  border-color: rgba(103, 194, 58, 0.26);
}

.decision-inline-bar-ready .decision-inline-value {
  color: #8ee26b;
}

.decision-inline-bar-locked {
  background: rgba(144, 147, 153, 0.08);
  border-color: rgba(144, 147, 153, 0.16);
}

.decision-inline-bar-locked .decision-inline-value {
  color: #aeb6bf;
}

.decision-inline-bar-accepted {
  background: rgba(103, 194, 58, 0.14);
  border-color: rgba(103, 194, 58, 0.28);
}

.decision-inline-bar-accepted .decision-inline-value {
  color: #8ee26b;
}

.decision-inline-bar-pending {
  background: rgba(230, 162, 60, 0.14);
  border-color: rgba(230, 162, 60, 0.3);
}

.decision-inline-bar-pending .decision-inline-value {
  color: #f3c969;
}

.decision-inline-bar-rejected {
  background: rgba(245, 108, 108, 0.14);
  border-color: rgba(245, 108, 108, 0.28);
}

.decision-inline-bar-rejected .decision-inline-value {
  color: #ff8f8f;
}

.contract-overview-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #1f2421;
  border: 1px solid rgba(124, 219, 134, 0.18);
}

.contract-overview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.contract-highlight {
  color: #9be27a;
  font-size: 13px;
  font-weight: 600;
}

.contract-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.contract-overview-item {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.contract-overview-label {
  display: block;
  font-size: 12px;
  color: #8ea097;
  margin-bottom: 6px;
}

.contract-overview-value {
  display: block;
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

.contract-link-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contract-file-link {
  color: var(--color-cyan, #13e8dd);
  text-decoration: none;
}

.contract-note-block {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.contract-note-text {
  color: #fff;
  line-height: 1.7;
  white-space: pre-wrap;
}

.contract-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.contract-dialog-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.contract-dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #97a6ae;
}

.contract-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contract-tip-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.2);
}

.contract-tip-title {
  font-size: 13px;
  font-weight: 700;
  color: #9be27a;
}

.contract-tip-text {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #d7e6db;
}

.contract-form {
  padding: 18px;
  border-radius: 14px;
  background: #1f1f1f;
  border: 1px solid #333;
}

.contract-review-form {
  margin-top: 4px;
}

.contract-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.contract-status-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #20242a;
  border: 1px solid #2d3640;
}

.contract-status-title {
  font-size: 12px;
  color: #90a1af;
}

.contract-status-value {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.contract-status-note {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #c9d2d8;
  white-space: pre-wrap;
}

.contract-dialog-footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 分页 */
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
}

/* ========== 详情弹窗 ========== */

/* 顶部个人概览 */
.detail-profile {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 24px;
  border-bottom: 1px solid #333;
}

.detail-avatar {
  flex-shrink: 0;
  border: 2px solid #444;
}

.detail-profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-profile-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-name-extra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.alias-tag {
  border-color: rgba(19, 232, 221, 0.35);
  color: var(--color-cyan, #13e8dd);
  background: rgba(19, 232, 221, 0.08);
}

.alias-tag-live {
  border-color: rgba(255, 179, 71, 0.4);
  color: #ffb347;
  background: rgba(255, 179, 71, 0.1);
}

.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.detail-art-name {
  font-size: 14px;
  color: #888;
}

.detail-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  background: #2a2a2a;
  color: #ccc;
  font-size: 13px;
  border: 1px solid #3a3a3a;
}

.stat-mbti {
  background: rgba(19, 232, 221, 0.1);
  border-color: rgba(19, 232, 221, 0.3);
  color: var(--color-cyan, #13e8dd);
}

.detail-talents {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.talent-chip {
  border-color: rgba(248, 213, 93, 0.3);
  color: var(--color-yellow, #f8d55d);
  background: rgba(248, 213, 93, 0.08);
}

.talent-chip-other {
  border-color: rgba(255, 152, 0, 0.3);
  color: #ff9800;
  background: rgba(255, 152, 0, 0.08);
}

.stat-salary {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
  color: #4caf50;
}

.detail-style-labels {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.style-label-chip {
  border-color: rgba(233, 30, 99, 0.3);
  color: #e91e63;
  background: rgba(233, 30, 99, 0.08);
}

/* 信息网格 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.info-block {
  background: #252525;
  border-radius: 10px;
  padding: 16px;
}

.info-block-title {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
}

.info-label {
  font-size: 13px;
  color: #888;
  flex-shrink: 0;
}

.info-value {
  font-size: 14px;
  color: #eee;
  text-align: right;
}

/* 推荐链条样式 */
.chain-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chain-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.chain-arrow {
  font-size: 16px;
  color: #666;
  font-weight: bold;
}

.fans-count {
  font-size: 12px;
  color: #666;
}

/* 分区标题 */
.detail-section {
  margin-top: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 14px;
  padding-left: 10px;
  border-left: 3px solid var(--color-cyan, #13e8dd);
}

.section-title-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 面试卡片 */
.interview-card {
  background: #252525;
  border-radius: 10px;
  padding: 16px;
}

.interview-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
}

.interview-date {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-cyan, #13e8dd);
}

.interview-time {
  font-size: 16px;
  color: #ccc;
}

.interview-details {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}

.interview-details .info-label {
  min-width: 48px;
}

/* 面试打分 */
.score-display {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.score-result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.score-by, .score-time {
  font-size: 13px;
  color: #888;
}

.score-tags {
  margin: 12px 0;
}

.tag-category {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-category-name {
  font-size: 13px;
  color: #999;
  min-width: 70px;
}

.score-tag {
  margin-right: 4px;
}

.score-comment {
  margin-top: 12px;
  padding: 12px;
  background: #252525;
  border-radius: 6px;
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
}

.score-comment strong {
  color: var(--color-cyan, #13e8dd);
  margin-right: 8px;
}

.score-action {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

/* 面试资料 */
.materials-display {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

.materials-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.materials-section {
  margin-bottom: 16px;
}

.materials-subtitle {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.material-item {
  position: relative;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #252525;
}

.material-image, .material-video {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.material-info {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.material-uploader {
  font-size: 13px;
  color: var(--color-cyan);
  font-weight: 500;
}

.material-time {
  font-size: 12px;
  color: #888;
}

.material-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px 8px;
}

.upload-materials-action {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
  display: flex;
  gap: 12px;
}

/* 上传对话框 */
.upload-area {
  padding: 20px 0;
}

.file-select-area {
  border: 2px dashed #666;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.file-select-area:hover {
  border-color: var(--color-cyan);
  background: rgba(19, 232, 221, 0.05);
}

.upload-icon {
  font-size: 48px;
  color: #666;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  color: var(--color-text);
  margin-bottom: 8px;
}

.upload-tip {
  font-size: 13px;
  color: #888;
}

.selected-files {
  margin-top: 20px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #252525;
  border-radius: 6px;
  margin-bottom: 8px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 13px;
  color: #888;
  min-width: 70px;
  text-align: right;
}

/* 照片网格 */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.photo-item {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  overflow: hidden;
  background: #252525;
}

/* 视频网格 */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.video-item {
  width: 100%;
  border-radius: 8px;
  background: #000;
  aspect-ratio: 16 / 9;
}

/* 底部操作 */
.detail-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.training-camp-admin-block {
  border: 1px solid rgba(19, 232, 221, 0.16);
  background: linear-gradient(180deg, rgba(19, 232, 221, 0.05), rgba(37, 37, 37, 0.96));
}

.training-camp-summary {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.training-camp-form :deep(.el-select),
.training-camp-form :deep(.el-date-editor) {
  width: 100%;
}

.training-camp-tip {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #9fb1b8;
}

.training-camp-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 流水截图区域 */
.income-screenshot-section {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.income-screenshot-item {
  max-width: 600px;
  width: 100%;
  border-radius: 8px;
  border: 2px solid #333;
  background: #1a1a1a;
}

.screenshot-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 107, 0, 0.1);
  border-left: 3px solid #ff6b00;
  border-radius: 4px;
  width: 100%;
}

.note-icon {
  font-size: 16px;
}

.note-text {
  font-size: 13px;
  color: #ff6b00;
  font-weight: 500;
}

/* 必填项标记 */
.required-badge {
  display: inline-block;
  font-size: 11px;
  color: #ff6b00;
  background: rgba(255, 107, 0, 0.1);
  padding: 2px 8px;
  border-radius: 3px;
  margin-left: 8px;
  font-weight: 600;
}

.required-field {
  font-weight: 500;
}

/* ========== 移动端适配 ========== */
.filter-radio-col {
  margin-top: 0;
}

@media (max-width: 767px) {
  .filter-radio-col {
    margin-top: 10px;
  }

  .batch-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .batch-bar-right {
    flex-wrap: wrap;
  }

  .candidate-card {
    padding: 12px;
    gap: 10px;
  }

  .candidate-avatar {
    width: 40px !important;
    height: 40px !important;
  }

  .candidate-actions {
    display: none;
  }

  .candidate-meta {
    flex-wrap: wrap;
  }

  .candidate-extra {
    flex-wrap: wrap;
  }

  .pagination-wrap {
    justify-content: center;
  }

  /* 详情弹窗内部 */
  .detail-profile {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-grid {
    grid-template-columns: 1fr;
  }

  .detail-footer {
    flex-wrap: wrap;
  }

  .detail-stats {
    justify-content: center;
  }

  .detail-talents {
    justify-content: center;
  }

  .detail-profile-top {
    justify-content: center;
  }

  .detail-name-extra {
    justify-content: center;
  }

  .distribution-item {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .interview-main {
    flex-direction: column;
  }

  .materials-grid {
    grid-template-columns: 1fr;
  }
}
</style>
