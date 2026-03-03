<template>
  <div class="scouts-page">
    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-number">{{ totalScouts }}</div>
          <div class="stat-label">总星探数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-number">{{ totalReferrals }}</div>
          <div class="stat-label">总推荐数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-number">{{ activeScouts }}</div>
          <div class="stat-label">活跃星探</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-number">{{ signedCount }}</div>
          <div class="stat-label">已签约推荐</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 星探列表 -->
    <el-card class="scouts-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">星探列表</span>
          <el-button :icon="Refresh" @click="loadScouts" circle />
        </div>
      </template>

      <el-table
        :data="scoutsList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="profile.name" label="姓名" width="120" />
        <el-table-column prop="shareCode" label="推荐码" width="120">
          <template #default="{ row }">
            <el-tag type="primary" effect="dark">{{ row.shareCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="profile.phone" label="手机号" width="140" />
        <el-table-column prop="profile.wechat" label="微信号" width="140" />
        <el-table-column label="推荐数据" width="300">
          <template #default="{ row }">
            <div class="scout-stats">
              <el-tag size="small" type="info">总: {{ row.stats.totalReferred }}</el-tag>
              <el-tag size="small" type="warning">待审: {{ row.stats.pendingCount }}</el-tag>
              <el-tag size="small" type="primary">通过: {{ row.stats.approvedCount }}</el-tag>
              <el-tag size="small" type="success">签约: {{ row.stats.signedCount }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewScoutDetail(row)">
              查看详情
            </el-button>
            <el-button link type="primary" @click="viewReferrals(row)">
              推荐列表
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 星探详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="星探详情"
      width="800px"
    >
      <div v-if="currentScout" class="scout-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentScout.profile.name }}</el-descriptions-item>
          <el-descriptions-item label="推荐码">
            <el-tag type="primary" effect="dark">{{ currentScout.shareCode }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentScout.profile.phone }}</el-descriptions-item>
          <el-descriptions-item label="微信号">{{ currentScout.profile.wechat }}</el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">
            {{ formatTime(currentScout.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>推荐数据</el-divider>

        <el-row :gutter="16">
          <el-col :span="6">
            <div class="detail-stat">
              <div class="detail-stat-value">{{ currentScout.stats.totalReferred }}</div>
              <div class="detail-stat-label">总推荐</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="detail-stat">
              <div class="detail-stat-value">{{ currentScout.stats.pendingCount }}</div>
              <div class="detail-stat-label">待审核</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="detail-stat">
              <div class="detail-stat-value">{{ currentScout.stats.approvedCount }}</div>
              <div class="detail-stat-label">已通过</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="detail-stat">
              <div class="detail-stat-value">{{ currentScout.stats.signedCount }}</div>
              <div class="detail-stat-label">已签约</div>
            </div>
          </el-col>
        </el-row>

        <el-divider>推荐的候选人</el-divider>

        <el-table :data="scoutReferrals" stripe max-height="400">
          <el-table-column prop="basicInfo.name" label="姓名" width="100" />
          <el-table-column prop="basicInfo.phone" label="手机号" width="140" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="报名时间">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { callScoutFunction } from '../../api/admin'

// 数据
const loading = ref(false)
const scoutsList = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 详情弹窗
const detailVisible = ref(false)
const currentScout = ref(null)
const scoutReferrals = ref([])

// 统计数据
const totalScouts = computed(() => scoutsList.value.length)
const totalReferrals = computed(() => scoutsList.value.reduce((sum, s) => sum + s.stats.totalReferred, 0))
const activeScouts = computed(() => scoutsList.value.filter(s => s.stats.totalReferred > 0).length)
const signedCount = computed(() => scoutsList.value.reduce((sum, s) => sum + s.stats.signedCount, 0))

// 加载星探列表
async function loadScouts() {
  loading.value = true
  try {
    const res = await callScoutFunction('getAllScouts', {
      page: currentPage.value,
      pageSize: pageSize.value
    })
    if (res.success) {
      scoutsList.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    console.error('加载星探列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 查看星探详情
async function viewScoutDetail(scout) {
  currentScout.value = scout
  detailVisible.value = true

  // 加载推荐的候选人
  try {
    const res = await callScoutFunction('getScoutDetail', { scoutId: scout._id })
    if (res.success) {
      scoutReferrals.value = res.referrals || []
    }
  } catch (error) {
    console.error('加载星探详情失败:', error)
  }
}

// 查看推荐列表
function viewReferrals(scout) {
  viewScoutDetail(scout)
}

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 状态标签类型
function getStatusType(status) {
  const map = {
    pending: 'warning',
    approved: 'primary',
    interview_scheduled: 'info',
    signed: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

// 状态标签文本
function getStatusLabel(status) {
  const map = {
    pending: '待审核',
    approved: '已通过',
    interview_scheduled: '面试中',
    signed: '已签约',
    rejected: '已拒绝'
  }
  return map[status] || status
}

// 分页
function handleSizeChange() {
  currentPage.value = 1
  loadScouts()
}

function handlePageChange() {
  loadScouts()
}

// 初始化
onMounted(() => {
  loadScouts()
})
</script>

<style scoped>
.scouts-page {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  background: #1E1E1E;
  border: 2px solid #333;
  color: #fff;
}

.stat-number {
  font-size: 36px;
  font-weight: 900;
  color: var(--color-cyan);
  margin-bottom: 8px;
  font-style: italic;
}

.stat-label {
  font-size: 14px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.scouts-card {
  background: #1E1E1E;
  border: 2px solid #333;
  color: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.scout-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.scout-detail {
  color: #333;
}

.detail-stat {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.detail-stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.detail-stat-label {
  font-size: 14px;
  color: #666;
}

/* Element Plus 样式覆盖 */
:deep(.el-table) {
  background: #1E1E1E;
  color: #fff;
}

:deep(.el-table th.el-table__cell) {
  background: #000;
  color: var(--color-cyan);
  border-color: #333;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

:deep(.el-table td.el-table__cell) {
  border-color: #333;
}

:deep(.el-table tr) {
  background: #1E1E1E;
}

:deep(.el-table__row:hover > td) {
  background: rgba(19, 232, 221, 0.05) !important;
}

:deep(.el-pagination) {
  color: #fff;
}

:deep(.el-pagination button) {
  background: #1E1E1E;
  color: #fff;
  border-color: #333;
}

:deep(.el-pagination .el-pager li) {
  background: #1E1E1E;
  color: #fff;
  border-color: #333;
}

:deep(.el-pagination .el-pager li.is-active) {
  background: var(--color-cyan);
  color: #000;
  font-weight: 900;
}
</style>
