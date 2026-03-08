<template>
  <div class="scouts-page">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="6">
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
        <el-col :span="18">
          <el-radio-group v-model="activeFilter" @change="handleFilterChange">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="level1">一级星探</el-radio-button>
            <el-radio-button value="level2">二级星探</el-radio-button>
            <el-radio-button value="active">活跃</el-radio-button>
          </el-radio-group>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总星探数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card level1">
          <div class="stat-content">
            <div class="stat-value">{{ stats.level1 }}</div>
            <div class="stat-label">一级星探</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card level2">
          <div class="stat-content">
            <div class="stat-value">{{ stats.level2 }}</div>
            <div class="stat-label">二级星探</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card active">
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalReferred }}</div>
            <div class="stat-label">总推荐数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 星探列表 -->
    <div class="scout-list" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty-tip">暂无数据</div>

      <div v-for="row in list" :key="row._id" class="scout-card" @click="handleView(row)">
        <!-- 左侧：等级标识 -->
        <div class="scout-level-indicator">
          <el-tag
            :type="(row.level?.depth || 1) === 1 ? 'warning' : 'success'"
            effect="dark"
            size="large"
          >
            {{ (row.level?.depth || 1) === 1 ? '⭐' : '⭐⭐' }}
          </el-tag>
        </div>

        <!-- 中间：信息区 -->
        <div class="scout-info">
          <div class="scout-header">
            <span class="scout-name">{{ row.profile?.name || '-' }}</span>
            <el-tag
              :type="(row.level?.depth || 1) === 1 ? 'warning' : 'success'"
              size="small"
              effect="plain"
            >
              {{ (row.level?.depth || 1) === 1 ? '一级星探' : '二级星探' }}
            </el-tag>
            <el-tag
              v-if="row.status === 'active'"
              type="success"
              size="small"
              effect="plain"
            >
              活跃
            </el-tag>
          </div>

          <div class="scout-meta">
            <span class="meta-item">📱 {{ row.profile?.phone || '-' }}</span>
            <span class="meta-divider">|</span>
            <span class="meta-item">💬 {{ row.profile?.wechat || '-' }}</span>
            <span class="meta-divider">|</span>
            <span class="meta-item">📋 推荐码：{{ row.shareCode }}</span>
            <template v-if="(row.level?.depth || 1) === 1 && row.inviteCode">
              <span class="meta-divider">|</span>
              <span class="meta-item">🔑 邀请码：{{ row.inviteCode }}</span>
            </template>
          </div>

          <!-- 二级星探显示上级信息 -->
          <div v-if="row.level?.depth === 2 && row.level?.parentScoutName" class="scout-parent">
            <el-icon><TopRight /></el-icon>
            上级星探：{{ row.level.parentScoutName }}
          </div>
        </div>

        <!-- 右侧：统计数据 -->
        <div class="scout-stats">
          <!-- 一级星探显示团队统计 -->
          <template v-if="(row.level?.depth || 1) === 1">
            <div class="stat-item">
              <div class="stat-value">{{ row.team?.directScouts || 0 }}</div>
              <div class="stat-label">下级星探</div>
            </div>
            <div class="stat-divider"></div>
          </template>

          <div class="stat-item">
            <div class="stat-value">{{ row.stats?.totalReferred || 0 }}</div>
            <div class="stat-label">总推荐</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">{{ row.stats?.signedCount || 0 }}</div>
            <div class="stat-label">已签约</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-drawer
      v-model="detailVisible"
      title="星探详情"
      :size="800"
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
              <span class="info-label">层级</span>
              <span class="info-value">
                <el-tag
                  :type="(currentScout.level?.depth || 1) === 1 ? 'warning' : 'success'"
                  effect="plain"
                >
                  {{ (currentScout.level?.depth || 1) === 1 ? '⭐ 一级星探' : '⭐⭐ 二级星探' }}
                </el-tag>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">状态</span>
              <span class="info-value">
                <el-tag
                  :type="currentScout.status === 'active' ? 'success' : 'info'"
                  effect="plain"
                >
                  {{ currentScout.status === 'active' ? '活跃' : '停用' }}
                </el-tag>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(currentScout.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 2. 推荐码信息 -->
        <div class="detail-section">
          <div class="section-title">推荐码信息</div>
          <div class="info-block">
            <div class="info-row">
              <span class="info-label">推荐码（用于推荐候选人）</span>
              <span class="info-value code-value">{{ currentScout.shareCode }}</span>
            </div>
            <div v-if="(currentScout.level?.depth || 1) === 1" class="info-row">
              <span class="info-label">邀请码（用于邀请下级星探）</span>
              <span class="info-value code-value">{{ currentScout.inviteCode || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 3. 层级关系（二级星探） -->
        <div v-if="currentScout.level?.depth === 2" class="detail-section">
          <div class="section-title">层级关系</div>
          <div class="info-block">
            <div class="info-row">
              <span class="info-label">上级星探</span>
              <span class="info-value">{{ currentScout.level?.parentScoutName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">使用的邀请码</span>
              <span class="info-value">{{ currentScout.level?.parentInviteCode || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 4. 团队统计（一级星探） -->
        <div v-if="(currentScout.level?.depth || 1) === 1" class="detail-section">
          <div class="section-title">团队统计</div>
          <div class="team-stats-grid">
            <div class="team-stat-card">
              <div class="team-stat-value">{{ currentScout.team?.directScouts || 0 }}</div>
              <div class="team-stat-label">下级星探数量</div>
            </div>
            <div class="team-stat-card">
              <div class="team-stat-value">{{ currentScout.team?.totalReferred || 0 }}</div>
              <div class="team-stat-label">团队总推荐</div>
            </div>
            <div class="team-stat-card">
              <div class="team-stat-value">{{ currentScout.team?.totalSigned || 0 }}</div>
              <div class="team-stat-label">团队总签约</div>
            </div>
          </div>
        </div>

        <!-- 5. 推荐统计 -->
        <div class="detail-section">
          <div class="section-title">推荐统计</div>
          <div class="stats-grid">
            <div class="stats-card">
              <div class="stats-value">{{ currentScout.stats?.totalReferred || 0 }}</div>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, TopRight } from '@element-plus/icons-vue'
import { getScouts, getScoutDetail } from '../../api/admin'
import { ElMessage } from 'element-plus'

// 筛选器
const keyword = ref('')
const activeFilter = ref('all')

// 列表数据
const loading = ref(false)
const list = ref([])
const fullList = ref([])

// 统计数据
const stats = reactive({
  total: 0,
  level1: 0,
  level2: 0,
  totalReferred: 0
})

// 详情弹窗
const detailVisible = ref(false)
const currentScout = ref(null)
const scoutReferrals = ref([])

// 候选人状态映射
const getCandidateStatusType = (status) => {
  const map = {
    pending: 'warning',
    approved: 'primary',
    interview_scheduled: 'info',
    signed: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const getCandidateStatusLabel = (status) => {
  const map = {
    pending: '待审核',
    approved: '已通过',
    interview_scheduled: '面试中',
    signed: '已签约',
    rejected: '已拒绝'
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

      // 计算统计数据
      stats.total = fullList.value.length
      stats.level1 = fullList.value.filter(s => (s.level?.depth || 1) === 1).length
      stats.level2 = fullList.value.filter(s => s.level?.depth === 2).length
      stats.totalReferred = fullList.value.reduce((sum, s) => sum + (s.stats?.totalReferred || 0), 0)

      // 应用筛选
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

  // 层级筛选
  if (activeFilter.value === 'level1') {
    filtered = filtered.filter(s => (s.level?.depth || 1) === 1)
  } else if (activeFilter.value === 'level2') {
    filtered = filtered.filter(s => s.level?.depth === 2)
  } else if (activeFilter.value === 'active') {
    filtered = filtered.filter(s => s.status === 'active' && s.stats?.totalReferred > 0)
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
.stats-row {
  margin-bottom: 20px;
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

.stat-card.level1 {
  border-left: 3px solid #e6a23c;
}

.stat-card.level2 {
  border-left: 3px solid #67c23a;
}

.stat-card.active {
  border-left: 3px solid #409eff;
}

.stat-content {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 8px;
}

.stat-label {
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
  margin-bottom: 6px;
}

.meta-item {
  color: #aaa;
}

.meta-divider {
  margin: 0 8px;
  color: #555;
}

.scout-parent {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #67c23a;
  margin-top: 6px;
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

.code-value {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #13e8dd;
  letter-spacing: 1px;
}

/* 团队统计网格 */
.team-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.team-stat-card {
  background: linear-gradient(135deg, rgba(19, 232, 221, 0.1) 0%, rgba(19, 232, 221, 0.05) 100%);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  border: 1px solid rgba(19, 232, 221, 0.2);
}

.team-stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #13e8dd;
  margin-bottom: 8px;
}

.team-stat-label {
  font-size: 13px;
  color: #888;
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
</style>
