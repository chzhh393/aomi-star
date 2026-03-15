<template>
  <div class="scouts-page">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="6">
          <el-input
            v-model="keyword"
            placeholder="搜索姓名或手机号"
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
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="rookie">新锐</el-radio-button>
            <el-radio-button value="special">特约</el-radio-button>
            <el-radio-button value="partner">合伙人</el-radio-button>
            <el-radio-button value="disabled">已停用</el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计卡片 -->
    <div class="stats-row-flex">
      <div class="stat-card-wrap">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总星探数</div>
          </div>
        </el-card>
      </div>
      <div class="stat-card-wrap">
        <el-card shadow="hover" class="stat-card pending">
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </el-card>
      </div>
      <div class="stat-card-wrap">
        <el-card shadow="hover" class="stat-card rookie">
          <div class="stat-content">
            <div class="stat-value">{{ stats.rookie }}</div>
            <div class="stat-label">新锐星探</div>
          </div>
        </el-card>
      </div>
      <div class="stat-card-wrap">
        <el-card shadow="hover" class="stat-card special">
          <div class="stat-content">
            <div class="stat-value">{{ stats.special }}</div>
            <div class="stat-label">特约星探</div>
          </div>
        </el-card>
      </div>
      <div class="stat-card-wrap">
        <el-card shadow="hover" class="stat-card partner">
          <div class="stat-content">
            <div class="stat-value">{{ stats.partner }}</div>
            <div class="stat-label">合伙人</div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 星探列表 -->
    <div class="scout-list" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty-tip">暂无数据</div>

      <div v-for="row in list" :key="row._id" class="scout-card" @click="handleView(row)">
        <!-- 左侧：等级标识 -->
        <div class="scout-level-indicator">
          <el-tag
            :type="gradeTagType(row.grade)"
            effect="dark"
            size="large"
          >
            {{ gradeLabel(row.grade) }}
          </el-tag>
        </div>

        <!-- 中间：信息区 -->
        <div class="scout-info">
          <div class="scout-header">
            <span class="scout-name">{{ row.profile?.name || '-' }}</span>
            <el-tag
              :type="gradeTagType(row.grade)"
              size="small"
              effect="plain"
            >
              {{ gradeLabel(row.grade) }}
            </el-tag>
            <el-tag
              :type="statusTagType(row.status)"
              size="small"
              effect="plain"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </div>

          <div class="scout-meta">
            <span class="meta-item">{{ row.profile?.phone || '-' }}</span>
            <span class="meta-divider">|</span>
            <span class="meta-item">{{ row.profile?.wechat || '-' }}</span>
          </div>
        </div>

        <!-- 右侧：统计数据 -->
        <div class="scout-stats">
          <div class="stat-item">
            <div class="stat-value">{{ row.stats?.referredCount || 0 }}</div>
            <div class="stat-label">总推荐</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">{{ row.stats?.signedCount || 0 }}</div>
            <div class="stat-label">已签约</div>
          </div>
        </div>

        <!-- 操作按钮（仅管理员可见） -->
        <div v-if="hasPermission('manageUsers')" class="scout-actions" @click.stop>
          <!-- 待审核状态：通过 + 拒绝 -->
          <template v-if="row.status === 'pending'">
            <el-button
              type="success"
              size="small"
              plain
              @click="confirmApprove(row)"
            >
              通过
            </el-button>
            <el-button
              type="danger"
              size="small"
              plain
              @click="confirmReject(row)"
            >
              拒绝
            </el-button>
          </template>
          <!-- 活跃状态：调整等级 + 停用 + 删除 -->
          <template v-if="row.status === 'active'">
            <el-button
              type="primary"
              size="small"
              plain
              @click="handleChangeGrade(row)"
            >
              调整等级
            </el-button>
            <el-button
              type="warning"
              size="small"
              plain
              @click="confirmDisable(row)"
            >
              停用
            </el-button>
            <el-button
              type="danger"
              size="small"
              plain
              @click="confirmHardDelete(row)"
            >
              删除
            </el-button>
          </template>
          <!-- 已停用状态：恢复 + 删除 -->
          <template v-if="row.status === 'disabled' || row.status === 'deleted'">
            <el-button
              type="success"
              size="small"
              plain
              @click="confirmRestore(row)"
            >
              恢复
            </el-button>
            <el-button
              type="danger"
              size="small"
              plain
              @click="confirmHardDelete(row)"
            >
              删除
            </el-button>
          </template>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-drawer
      v-model="detailVisible"
      title="星探详情"
      :size="drawerSize"
      direction="rtl"
      class="scout-detail-drawer"
    >
      <div v-if="currentScout" class="detail-content">
        <!-- 1. 基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <div class="info-block">
            <div class="info-row">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ currentScout.profile?.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">手机号</span>
              <span class="info-value">{{ currentScout.profile?.phone || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">微信号</span>
              <span class="info-value">{{ currentScout.profile?.wechat || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">等级</span>
              <span class="info-value">
                <el-tag
                  :type="gradeTagType(currentScout.grade)"
                  effect="plain"
                >
                  {{ gradeLabel(currentScout.grade) }}
                </el-tag>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">状态</span>
              <span class="info-value">
                <el-tag
                  :type="statusTagType(currentScout.status)"
                  effect="plain"
                >
                  {{ statusLabel(currentScout.status) }}
                </el-tag>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(currentScout.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 2. 申请信息 -->
        <div v-if="currentScout.application" class="detail-section">
          <div class="section-title">申请信息</div>
          <div class="info-block">
            <div v-if="currentScout.application.reason" class="info-row">
              <span class="info-label">申请理由</span>
              <span class="info-value">{{ currentScout.application.reason }}</span>
            </div>
            <div v-if="currentScout.application.reviewedBy" class="info-row">
              <span class="info-label">审核人</span>
              <span class="info-value">{{ currentScout.application.reviewedBy }}</span>
            </div>
            <div v-if="currentScout.application.reviewedAt" class="info-row">
              <span class="info-label">审核时间</span>
              <span class="info-value">{{ formatDate(currentScout.application.reviewedAt) }}</span>
            </div>
            <div v-if="currentScout.application.reviewNote" class="info-row">
              <span class="info-label">审核备注</span>
              <span class="info-value">{{ currentScout.application.reviewNote }}</span>
            </div>
          </div>
        </div>

        <!-- 4. 升级进度 -->
        <div class="detail-section">
          <div class="section-title">升级进度</div>
          <div class="info-block">
            <div class="upgrade-progress">
              <div
                v-for="g in gradeList"
                :key="g.key"
                class="upgrade-step"
                :class="{ active: isGradeReached(currentScout.grade, g.key) }"
              >
                <div class="step-dot"></div>
                <div class="step-info">
                  <div class="step-name">{{ g.label }}</div>
                  <div class="step-desc">{{ g.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. 推荐统计 -->
        <div class="detail-section">
          <div class="section-title">推荐统计</div>
          <div class="stats-grid">
            <div class="stats-card">
              <div class="stats-value">{{ currentScout.stats?.referredCount || 0 }}</div>
              <div class="stats-label">总推荐</div>
            </div>
            <div class="stats-card pending">
              <div class="stats-value">{{ currentScout.stats?.pendingCount || 0 }}</div>
              <div class="stats-label">待审核</div>
            </div>
            <div class="stats-card approved">
              <div class="stats-value">{{ currentScout.stats?.approvedCount || 0 }}</div>
              <div class="stats-label">已通过</div>
            </div>
            <div class="stats-card signed">
              <div class="stats-value">{{ currentScout.stats?.signedCount || 0 }}</div>
              <div class="stats-label">已签约</div>
            </div>
            <div class="stats-card rejected">
              <div class="stats-value">{{ currentScout.stats?.rejectedCount || 0 }}</div>
              <div class="stats-label">已拒绝</div>
            </div>
          </div>
        </div>

        <!-- 6. 推荐的候选人列表 -->
        <div v-if="scoutReferrals.length > 0" class="detail-section">
          <div class="section-title">推荐的候选人（{{ scoutReferrals.length }}人）</div>
          <div class="referral-list">
            <div
              v-for="candidate in scoutReferrals"
              :key="candidate._id"
              class="referral-item"
            >
              <div class="referral-name">{{ candidate.basicInfo?.name || '-' }}</div>
              <div class="referral-meta">
                {{ candidate.basicInfo?.age }}岁 / {{ candidate.basicInfo?.height }}cm
              </div>
              <el-tag
                :type="getCandidateStatusType(candidate.status)"
                size="small"
                effect="plain"
              >
                {{ getCandidateStatusLabel(candidate.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 调整等级对话框 -->
    <el-dialog v-model="gradeDialogVisible" title="调整星探等级" width="420px">
      <div v-if="gradingScout">
        <div style="margin-bottom: 16px">
          <span style="color: #888">星探：</span>
          <strong>{{ gradingScout.profile?.name || '-' }}</strong>
          <el-tag :type="gradeTagType(gradingScout.grade)" effect="plain" size="small" style="margin-left: 8px">
            {{ gradeLabel(gradingScout.grade) }}
          </el-tag>
        </div>
        <el-form label-width="80px">
          <el-form-item label="新等级" required>
            <el-radio-group v-model="newGrade">
              <el-radio-button
                v-for="(config, key) in GRADE_CONFIG"
                :key="key"
                :value="key"
                :disabled="key === (gradingScout.grade || 'rookie')"
              >
                {{ config.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="调整原因">
            <el-input v-model="gradeReason" placeholder="如：业绩优秀特批升级（选填）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="gradeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="gradeSubmitting" :disabled="!newGrade" @click="confirmChangeGrade">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getScouts, getScoutDetail } from '../../api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { hasPermission } from '../../utils/permission'

// 等级配置
const GRADE_CONFIG = {
  rookie: { label: '新锐', tagType: 'info' },
  special: { label: '特约', tagType: 'warning' },
  partner: { label: '合伙人', tagType: 'danger' }
}

const gradeList = [
  { key: 'rookie', label: '新锐星探', desc: '初始等级' },
  { key: 'special', label: '特约星探', desc: '签约 2 人升级' },
  { key: 'partner', label: '合伙人星探', desc: '签约 5 人升级' }
]

const gradeOrder = { rookie: 0, special: 1, partner: 2 }

const gradeLabel = (grade) => GRADE_CONFIG[grade]?.label || grade || '新锐'
const gradeTagType = (grade) => GRADE_CONFIG[grade]?.tagType || 'info'

const statusLabel = (status) => {
  const map = { pending: '待审核', active: '正常', disabled: '已停用', deleted: '已停用', rejected: '已拒绝' }
  return map[status] || status
}
const statusTagType = (status) => {
  const map = { pending: 'warning', active: 'success', disabled: 'info', deleted: 'info', rejected: 'danger' }
  return map[status] || 'info'
}

const isGradeReached = (currentGrade, targetGrade) => {
  return (gradeOrder[currentGrade] || 0) >= (gradeOrder[targetGrade] || 0)
}

// 筛选器
// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
const drawerSize = computed(() => isMobile.value ? '95%' : 800)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const keyword = ref('')
const activeFilter = ref('all')

// 列表数据
const loading = ref(false)
const list = ref([])
const fullList = ref([])

// 统计数据
const stats = reactive({
  total: 0,
  pending: 0,
  rookie: 0,
  special: 0,
  partner: 0
})

// 详情弹窗
const detailVisible = ref(false)
const currentScout = ref(null)
const scoutReferrals = ref([])

// 候选人状态映射
const getCandidateStatusType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    interview_scheduled: 'primary',
    training: '',
    signed: 'success',
    live: 'success',
    probation: 'warning',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const getCandidateStatusLabel = (status) => {
  const map = {
    pending: '信息审核',
    approved: '审核通过',
    interview_scheduled: '面试阶段',
    training: '培训阶段',
    signed: '签约阶段',
    live: '成团开播',
    probation: '考核期',
    rejected: '未通过'
  }
  return map[status] || status
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 加载星探列表
const loadScouts = async () => {
  loading.value = true
  try {
    const result = await getScouts()
    if (result.success) {
      fullList.value = result.data.list || []

      // 1. 计算统计（只统计活跃的按等级分组，以及待审核数）
      const activeScouts = fullList.value.filter(s => s.status === 'active')
      stats.total = fullList.value.length
      stats.pending = fullList.value.filter(s => s.status === 'pending').length
      stats.rookie = activeScouts.filter(s => s.grade === 'rookie' || !s.grade).length
      stats.special = activeScouts.filter(s => s.grade === 'special').length
      stats.partner = activeScouts.filter(s => s.grade === 'partner').length

      // 2. 应用筛选
      applyFilter()
    } else {
      ElMessage.error(result.error || '获取星探列表失败')
    }
  } catch (error) {
    console.error('获取星探列表失败:', error)
    ElMessage.error('获取星探列表失败')
  } finally {
    loading.value = false
  }
}

// 应用筛选
const applyFilter = () => {
  let filtered = [...fullList.value]

  // 关键词搜索
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    filtered = filtered.filter(s =>
      s.profile?.name?.toLowerCase().includes(kw) ||
      s.profile?.phone?.includes(kw)
    )
  }

  // 按状态/等级筛选
  switch (activeFilter.value) {
    case 'pending':
      filtered = filtered.filter(s => s.status === 'pending')
      break
    case 'rookie':
      filtered = filtered.filter(s => s.status === 'active' && (s.grade === 'rookie' || !s.grade))
      break
    case 'special':
      filtered = filtered.filter(s => s.status === 'active' && s.grade === 'special')
      break
    case 'partner':
      filtered = filtered.filter(s => s.status === 'active' && s.grade === 'partner')
      break
    case 'disabled':
      filtered = filtered.filter(s => s.status === 'disabled' || s.status === 'deleted')
      break
  }

  list.value = filtered
}

// 搜索处理
const handleSearch = () => {
  applyFilter()
}

// 筛选变化
const handleFilterChange = () => {
  applyFilter()
}

// 查看详情
const handleView = async (row) => {
  try {
    const result = await getScoutDetail(row._id)
    if (result.success) {
      currentScout.value = result.scout
      scoutReferrals.value = result.referrals || []
      detailVisible.value = true
    } else {
      ElMessage.error(result.error || '获取星探详情失败')
    }
  } catch (error) {
    console.error('获取星探详情失败:', error)
    ElMessage.error('获取星探详情失败')
  }
}

// 审核通过
const confirmApprove = (scout) => {
  ElMessageBox.confirm(
    `确定通过 ${scout.profile?.name || '-'} 的星探申请吗？`,
    '审核通过',
    { type: 'success', confirmButtonText: '确认通过', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      const wxcloud = await import('../../api/wxcloud')
      const result = await wxcloud.default.callFunction('admin', {
        action: 'reviewScoutApplication',
        data: { scoutId: scout._id, approved: true }
      })
      if (result.success) {
        ElMessage.success('审核通过')
        await loadScouts()
      } else {
        ElMessage.error(result.error || '操作失败')
      }
    } catch (error) {
      ElMessage.error('操作失败：' + error.message)
    }
  }).catch(() => {})
}

// 审核拒绝
const confirmReject = (scout) => {
  ElMessageBox.prompt(
    `请输入拒绝 ${scout.profile?.name || '-'} 的原因（选填）`,
    '拒绝申请',
    { type: 'warning', confirmButtonText: '确认拒绝', cancelButtonText: '取消', inputPlaceholder: '拒绝原因' }
  ).then(async ({ value }) => {
    try {
      const wxcloud = await import('../../api/wxcloud')
      const result = await wxcloud.default.callFunction('admin', {
        action: 'reviewScoutApplication',
        data: { scoutId: scout._id, approved: false, reviewNote: value || '' }
      })
      if (result.success) {
        ElMessage.success('已拒绝申请')
        await loadScouts()
      } else {
        ElMessage.error(result.error || '操作失败')
      }
    } catch (error) {
      ElMessage.error('操作失败：' + error.message)
    }
  }).catch(() => {})
}

// 停用星探
const confirmDisable = (scout) => {
  ElMessageBox.confirm(
    `确定要停用星探 ${scout.profile?.name || '-'} 吗？\n\n停用后该星探将无法登录，数据保留，可随时恢复。`,
    '确认停用',
    { type: 'warning', confirmButtonText: '确认停用', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      const wxcloud = await import('../../api/wxcloud')
      const result = await wxcloud.default.callFunction('admin', {
        action: 'deleteScout',
        data: { scoutId: scout._id }
      })
      if (result.success) {
        ElMessage.success('停用成功')
        await loadScouts()
      } else {
        ElMessage.error(result.error || '停用失败')
      }
    } catch (error) {
      ElMessage.error('停用失败：' + error.message)
    }
  }).catch(() => {})
}

// 硬删除星探
const confirmHardDelete = (scout) => {
  ElMessageBox.confirm(
    `确定要彻底删除星探 ${scout.profile?.name || '-'} 吗？\n\n⚠️ 此操作不可恢复，数据将从数据库中永久删除！`,
    '确认删除',
    { type: 'error', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      const wxcloud = await import('../../api/wxcloud')
      const result = await wxcloud.default.callFunction('admin', {
        action: 'hardDeleteScout',
        data: { scoutId: scout._id }
      })
      if (result.success) {
        ElMessage.success('删除成功')
        await loadScouts()
      } else {
        ElMessage.error(result.error || '删除失败')
      }
    } catch (error) {
      ElMessage.error('删除失败：' + error.message)
    }
  }).catch(() => {})
}

// 调整等级
const gradeDialogVisible = ref(false)
const gradingScout = ref(null)
const newGrade = ref('')
const gradeReason = ref('')
const gradeSubmitting = ref(false)

const handleChangeGrade = (scout) => {
  gradingScout.value = scout
  newGrade.value = ''
  gradeReason.value = ''
  gradeDialogVisible.value = true
}

const confirmChangeGrade = async () => {
  if (!newGrade.value) return
  gradeSubmitting.value = true
  try {
    const wxcloud = await import('../../api/wxcloud')
    const result = await wxcloud.default.callFunction('admin', {
      action: 'updateScoutGrade',
      data: {
        scoutId: gradingScout.value._id,
        newGrade: newGrade.value,
        reason: gradeReason.value
      }
    })
    if (result.success) {
      ElMessage.success('等级调整成功')
      gradeDialogVisible.value = false
      await loadScouts()
      if (detailVisible.value && currentScout.value?._id === gradingScout.value._id) {
        await handleView(gradingScout.value)
      }
    } else {
      ElMessage.error(result.error || '调整失败')
    }
  } catch (error) {
    ElMessage.error('调整失败：' + error.message)
  } finally {
    gradeSubmitting.value = false
  }
}

// 恢复星探
const confirmRestore = (scout) => {
  ElMessageBox.confirm(
    `确定要恢复星探 ${scout.profile?.name || '-'} 吗？\n\n恢复后该星探可以重新登录。`,
    '确认恢复',
    { type: 'info', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
  ).then(async () => {
    try {
      const wxcloud = await import('../../api/wxcloud')
      const result = await wxcloud.default.callFunction('admin', {
        action: 'restoreScout',
        data: { scoutId: scout._id }
      })
      if (result.success) {
        ElMessage.success('恢复成功')
        await loadScouts()
      } else {
        ElMessage.error(result.error || '恢复失败')
      }
    } catch (error) {
      ElMessage.error('恢复失败：' + error.message)
    }
  }).catch(() => {})
}

onMounted(() => {
  loadScouts()
})
</script>

<style scoped>
.scouts-page {
  padding: 20px;
  background: #1a1a1a;
  min-height: 100vh;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  background: #252525;
  border: none;
}

.filter-card :deep(.el-card__body) {
  padding: 16px;
}

/* 统计卡片 */
.stats-row-flex {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card-wrap {
  flex: 1;
  min-width: 0;
}

.stat-card {
  background: #252525;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.stat-card.pending {
  border-left: 3px solid #e6a23c;
}

.stat-card.rookie {
  border-left: 3px solid #909399;
}

.stat-card.special {
  border-left: 3px solid #e6a23c;
}

.stat-card.partner {
  border-left: 3px solid #f56c6c;
}

.stat-content {
  text-align: center;
}

.stat-content > .stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.stat-content > .stat-label {
  font-size: 14px;
  color: #999;
}

/* 星探列表 */
.scout-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-tip {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 14px;
}

.scout-card {
  background: #252525;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.scout-card:hover {
  background: #2a2a2a;
  border-color: #13e8dd;
  box-shadow: 0 4px 12px rgba(19, 232, 221, 0.1);
}

.scout-level-indicator {
  flex-shrink: 0;
}

.scout-info {
  flex: 1;
  min-width: 0;
}

.scout-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.scout-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.scout-meta {
  font-size: 13px;
  color: #999;
}

.meta-item {
  color: #aaa;
}

.meta-divider {
  margin: 0 8px;
  color: #555;
}

.scout-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #13e8dd;
  display: block;
  margin-bottom: 4px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #888;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #333;
}

/* 操作按钮 */
.scout-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px solid #333;
}

.scout-actions .el-button {
  margin: 0;
}

/* 详情抽屉 */
.scout-detail-drawer :deep(.el-drawer__header) {
  background: #1a1a1a;
  color: #fff;
  border-bottom: 1px solid #333;
  margin-bottom: 0;
  padding: 20px;
}

.scout-detail-drawer :deep(.el-drawer__body) {
  background: #1a1a1a;
  padding: 20px;
}

.detail-content {
  color: #eee;
}

.detail-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid #13e8dd;
}

.info-block {
  background: #252525;
  border-radius: 10px;
  padding: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #333;
}

.info-row:last-child {
  border-bottom: none;
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

/* 升级进度 */
.upgrade-progress {
  display: flex;
  gap: 0;
}

.upgrade-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 16px 8px;
}

.upgrade-step::after {
  content: '';
  position: absolute;
  top: 28px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #333;
  z-index: 0;
}

.upgrade-step:last-child::after {
  display: none;
}

.upgrade-step.active .step-dot {
  background: #13e8dd;
  border-color: #13e8dd;
  box-shadow: 0 0 8px rgba(19, 232, 221, 0.4);
}

.upgrade-step.active::after {
  background: #13e8dd;
}

.step-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #333;
  border: 2px solid #555;
  z-index: 1;
  margin-bottom: 10px;
}

.step-info {
  text-align: center;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #ccc;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 12px;
  color: #666;
}

/* 推荐统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.stats-card {
  background: #252525;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #333;
  transition: all 0.3s;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.stats-card.pending {
  border-color: rgba(230, 162, 60, 0.3);
}

.stats-card.approved {
  border-color: rgba(64, 158, 255, 0.3);
}

.stats-card.signed {
  border-color: rgba(103, 194, 58, 0.3);
}

.stats-card.rejected {
  border-color: rgba(245, 108, 108, 0.3);
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 6px;
}

.stats-label {
  font-size: 12px;
  color: #888;
}

/* 推荐候选人列表 */
.referral-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.referral-item {
  background: #252525;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s;
}

.referral-item:hover {
  background: #2a2a2a;
}

.referral-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;
}

.referral-meta {
  font-size: 12px;
  color: #888;
  flex: 1;
}

.filter-radio-col {
  margin-top: 0;
}

@media (max-width: 767px) {
  .filter-radio-col {
    margin-top: 10px;
  }

  .stats-row-flex {
    gap: 6px;
    margin-bottom: 12px;
  }

  .stat-card :deep(.el-card__body) {
    padding: 8px 4px;
  }

  .stat-content > .stat-value {
    font-size: 16px;
    margin-bottom: 2px;
  }

  .stat-content > .stat-label {
    font-size: 10px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }

  .scout-card {
    padding: 12px;
    gap: 10px;
  }

  .scout-actions {
    display: none;
  }

  .scout-detail-drawer :deep(.el-drawer__body) {
    padding: 12px;
  }
}
</style>
