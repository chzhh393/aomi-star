<template>
  <div class="candidates-page">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
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
        <el-col :span="18">
          <el-radio-group v-model="activeFilter" @change="handleFilterChange">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="approved">待面试安排</el-radio-button>
            <el-radio-button value="interview_scheduled">已安排面试</el-radio-button>
            <el-radio-button value="rejected">未通过</el-radio-button>
            <el-radio-button value="signed">已签约</el-radio-button>
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
            <span class="candidate-name">{{ row.basicInfo?.name || '-' }}</span>
            <el-tag :type="STATUS_MAP[row.status]?.type || 'info'" size="small" effect="dark" round>
              {{ STATUS_MAP[row.status]?.label || row.status }}
            </el-tag>
          </div>
          <div class="candidate-meta">
            <span class="meta-item">{{ row.basicInfo?.gender || '-' }}</span>
            <span class="meta-divider">/</span>
            <span class="meta-item">{{ row.basicInfo?.age || '-' }}岁</span>
            <span class="meta-divider">/</span>
            <span class="meta-item">{{ row.basicInfo?.height || '-' }}cm</span>
            <span class="meta-divider">|</span>
            <span class="meta-item meta-phone">{{ row.basicInfo?.phone || '-' }}</span>
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
            <template v-if="row.referral">
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
        </div>

        <!-- 右侧：操作按钮 -->
        <div class="candidate-actions" @click.stop>
          <el-button size="small" @click="handleView(row)">查看</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="success" @click="handleApprove(row)">通过</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
          <el-button v-if="row.status === 'approved'" size="small" type="warning" @click="handleSchedule(row)">安排面试</el-button>
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
    <el-dialog v-model="drawerVisible" width="900px" top="3vh" align-center class="detail-dialog" :show-close="true">
      <template #header>
        <span></span>
      </template>
      <template v-if="currentCandidate">
        <!-- 1. 顶部个人概览 -->
        <div class="detail-profile">
          <el-avatar :size="80" :src="currentCandidate.images?.facePhoto" class="detail-avatar" />
          <div class="detail-profile-info">
            <div class="detail-profile-top">
              <span class="detail-name">{{ currentCandidate.basicInfo?.name }}</span>
              <span v-if="currentCandidate.basicInfo?.artName" class="detail-art-name">（{{ currentCandidate.basicInfo.artName }}）</span>
              <el-tag :type="STATUS_MAP[currentCandidate.status]?.type" effect="dark" round>
                {{ STATUS_MAP[currentCandidate.status]?.label }}
              </el-tag>
            </div>
            <div class="detail-stats">
              <span class="stat-chip">{{ currentCandidate.basicInfo?.gender }}</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.age }}岁</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.height }}cm</span>
              <span class="stat-chip">{{ currentCandidate.basicInfo?.weight }}kg</span>
              <span v-if="currentCandidate.basicInfo?.mbti" class="stat-chip stat-mbti">{{ currentCandidate.basicInfo.mbti }}</span>
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
          <div class="info-block">
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
          <div class="info-block">
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
          <div class="info-block" v-if="currentCandidate.referral">
            <div class="info-block-title">星探推荐</div>
            <div class="info-row">
              <span class="info-label">星探姓名</span>
              <span class="info-value">{{ currentCandidate.referral.scoutName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">推荐码</span>
              <span class="info-value">{{ currentCandidate.referral.scoutShareCode }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">推荐时间</span>
              <span class="info-value">{{ formatDate(currentCandidate.referral.referredAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 3. 面试信息 -->
        <div v-if="currentCandidate.interview" class="detail-section">
          <div class="section-title">面试安排</div>
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
              <span class="info-value">{{ currentCandidate.interview.interviewers.join('、') }}</span>
            </div>
            <div class="interview-details" v-if="currentCandidate.interview.notes">
              <span class="info-label">备注</span>
              <span class="info-value">{{ currentCandidate.interview.notes }}</span>
            </div>
          </div>
        </div>

        <!-- 4. 照片 -->
        <div class="detail-section">
          <div class="section-title">照片</div>
          <div class="photo-grid">
            <el-image
              v-for="(url, key) in candidatePhotos"
              :key="key"
              :src="url"
              class="photo-item"
              fit="cover"
              :preview-src-list="Object.values(candidatePhotos)"
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

        <!-- 7. 底部操作 -->
        <div class="detail-footer" v-if="currentCandidate.status === 'pending' || currentCandidate.status === 'approved'">
          <template v-if="currentCandidate.status === 'pending'">
            <el-button type="success" size="large" @click="handleApprove(currentCandidate)">审核通过</el-button>
            <el-button type="danger" size="large" @click="handleReject(currentCandidate)">拒绝</el-button>
          </template>
          <el-button v-if="currentCandidate.status === 'approved'" type="primary" size="large" @click="handleSchedule(currentCandidate)">安排面试</el-button>
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
          <el-input v-model="scheduleForm.interviewers" placeholder="多个面试官用逗号分隔" />
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { STATUS_MAP, formatDate } from '../../utils/constants'
import { resolveCandidateImages } from '../../utils/cloudfile'

const list = ref([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const activeFilter = ref('all')
const keyword = ref('')

// 详情抽屉
const drawerVisible = ref(false)
const currentCandidate = ref(null)

const candidatePhotos = computed(() => {
  if (!currentCandidate.value?.images) return {}
  const imgs = currentCandidate.value.images
  const result = {}
  for (const [key, url] of Object.entries(imgs)) {
    if (url) result[key] = url
  }
  return result
})

const candidateVideos = computed(() => {
  return (currentCandidate.value?.talent?.videos || []).filter(v => v.url)
})

// 判断是否是admin账号（有删除权限）
const isAdmin = computed(() => {
  try {
    const adminInfo = localStorage.getItem('admin_info')
    if (!adminInfo) return false
    const info = JSON.parse(adminInfo)
    return info.username === 'admin'
  } catch {
    return false
  }
})

// 拒绝对话框
const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectingCandidate = ref(null)

// 面试安排对话框
const scheduleDialogVisible = ref(false)
const schedulingCandidate = ref(null)
const scheduleForm = reactive({
  interviewDate: '',
  interviewTime: '',
  location: '',
  interviewers: '',
  notes: ''
})

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

const submitting = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res = await adminAPI.getCandidateList({
      page: currentPage.value,
      pageSize: pageSize.value,
      status: activeFilter.value,
      keyword: keyword.value
    })
    if (res.success) {
      list.value = await resolveCandidateImages(res.data.list)
      total.value = res.data.total
    }
  } catch (err) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  clearSelection()
  fetchList()
}

function handleFilterChange() {
  currentPage.value = 1
  clearSelection()
  fetchList()
}

async function handleView(row) {
  currentCandidate.value = row
  drawerVisible.value = true
  // 拉取详情获取完整数据
  try {
    const res = await adminAPI.getCandidateDetail(row._id)
    if (res.success && res.candidate) {
      const detail = await resolveCandidateImages([res.candidate])
      currentCandidate.value = detail[0]
    }
  } catch {
    // 详情拉取失败时仍使用列表数据
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
  scheduleForm.interviewers = ''
  scheduleForm.notes = ''
  scheduleDialogVisible.value = true
}

async function confirmSchedule() {
  if (!scheduleForm.interviewDate || !scheduleForm.interviewTime) {
    ElMessage.warning('请选择面试日期和时间')
    return
  }
  submitting.value = true
  try {
    const res = await adminAPI.scheduleInterview({
      candidateId: schedulingCandidate.value._id,
      interviewDate: scheduleForm.interviewDate,
      interviewTime: scheduleForm.interviewTime,
      location: scheduleForm.location,
      interviewers: scheduleForm.interviewers
        ? scheduleForm.interviewers.split(',').map(s => s.trim())
        : [],
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

onMounted(fetchList)
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
}

.candidate-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.candidate-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
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
  flex-shrink: 0;
  display: flex;
  gap: 8px;
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
</style>
