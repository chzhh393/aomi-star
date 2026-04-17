<template>
  <div class="commissions-page">
    <!-- 统计卡片 -->
    <MetricCardGrid :cards="metricCards" :active-key="activeFilter" @select="setFilter" />

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-radio-group v-model="activeFilter" @change="handleFilterChange">
        <el-radio-button label="calculated">待支付</el-radio-button>
        <el-radio-button label="frozen">已冻结</el-radio-button>
        <el-radio-button label="paid">已支付</el-radio-button>
        <el-radio-button label="all">全部</el-radio-button>
      </el-radio-group>
    </el-card>

    <!-- 分账列表 -->
    <div class="commission-list" v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="empty-tip">暂无数据</div>

      <div v-for="item in list" :key="item.candidateId" class="commission-card">
        <!-- 候选人信息 -->
        <div class="card-header">
          <div class="candidate-info">
            <span class="candidate-name">{{ item.candidateName }}</span>
            <el-tag
              :type="item.freezeStatus === 'frozen' ? 'danger' : (item.status === 'paid' ? 'success' : 'warning')"
              size="small"
              effect="plain"
            >
              {{ item.statusLabel }}
            </el-tag>
          </div>
          <div class="total-amount">
            总金额：<span class="amount-value">{{ item.totalAmountText }}</span>
          </div>
        </div>

        <!-- 分账明细 -->
        <div class="distribution-list">
          <div
            v-for="(dist, index) in item.distribution"
            :key="index"
            class="distribution-item"
          >
            <div class="scout-info">
              <el-tag
                :type="dist.type === 'team' ? 'success' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ dist.type === 'team' ? '团队分账' : '直接推荐' }}
              </el-tag>
              <span class="scout-name">{{ dist.scoutName }}</span>
              <el-tag v-if="dist.type === 'team'" type="info" size="small" effect="plain">
                团队管理费
              </el-tag>
            </div>
            <div class="amount-info">
              <span class="percentage">{{ dist.percentage }}%</span>
              <span class="amount">¥{{ dist.amount }}</span>
            </div>
          </div>
        </div>

        <!-- 时间信息 -->
        <div class="card-footer">
          <div class="time-info">
            <span class="time-label">计算时间：</span>
            <span class="time-value">{{ item.calculatedAtText }}</span>
          </div>
          <div v-if="item.status === 'paid'" class="time-info">
            <span class="time-label">支付时间：</span>
            <span class="time-value">{{ item.paidAtText }}</span>
          </div>
        </div>

        <div v-if="item.freezeStatus === 'frozen'" class="freeze-panel">
          <div class="freeze-title">老板已冻结该笔提成</div>
          <div class="freeze-text">原因：{{ item.freezeReason || '未填写' }}</div>
          <div v-if="item.freezeNote" class="freeze-text">备注：{{ item.freezeNote }}</div>
          <div class="freeze-text">操作人：{{ item.freezeUpdatedByName || '老板' }} · {{ item.freezeUpdatedAtText || '-' }}</div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="item.status === 'calculated'" class="card-actions">
          <el-button
            type="primary"
            size="small"
            @click="confirmPayment(item.candidateId)"
            :disabled="!item.canPay"
          >
            {{ item.canPay ? '确认支付' : '已冻结不可支付' }}
          </el-button>
          <el-button
            size="small"
            @click="viewDetail(item)"
          >
            查看详情
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import wxcloud from '../../api/wxcloud'
import MetricCardGrid from '../../components/common/metric-card-grid.vue'

// 筛选器
const activeFilter = ref('calculated')
const route = useRoute()
const router = useRouter()

// 列表数据
const loading = ref(false)
const list = ref([])

// 统计数据
const stats = reactive({
  totalPending: 0,
  pendingAmount: 0,
  paidAmount: 0,
  totalAmount: 0
})
const metricCards = computed(() => [
  { key: 'calculated', value: stats.totalPending, label: '待支付订单', tone: 'default' },
  { key: 'pendingAmount', selectKey: 'calculated', active: activeFilter.value === 'calculated', value: `¥${stats.pendingAmount}`, label: '待支付金额', tone: 'pending' },
  { key: 'paid', value: `¥${stats.paidAmount}`, label: '已支付金额', tone: 'paid' },
  { key: 'all', value: `¥${stats.totalAmount}`, label: '累计分账总额', tone: 'total' }
])

// 加载分账列表
const loadCommissions = async () => {
  loading.value = true
  try {
    const result = await wxcloud.callFunction('admin', {
      action: 'getFinanceCommissionLedger',
      data: {}
    })

    if (result.success) {
      const allCommissions = result.data?.list || []
      const ledgerStats = result.data?.stats || {}

      list.value = activeFilter.value === 'all'
        ? allCommissions
        : allCommissions.filter((item) => {
            if (activeFilter.value === 'frozen') {
              return item.freezeStatus === 'frozen'
            }
            return item.status === activeFilter.value
          })

      calculateStats(ledgerStats)
    } else {
      ElMessage.error(result.error || '获取分账列表失败')
    }
  } catch (error) {
    console.error('获取分账列表失败:', error)
    ElMessage.error('获取分账列表失败')
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  router.replace({
    query: activeFilter.value === 'calculated'
      ? { ...route.query, status: undefined }
      : { ...route.query, status: activeFilter.value }
  })
  loadCommissions()
}

const setFilter = (filter) => {
  if (activeFilter.value === filter) {
    return
  }
  activeFilter.value = filter
  handleFilterChange()
}

// 计算统计数据
const calculateStats = (ledgerStats = {}) => {
  stats.totalPending = ledgerStats.totalPending || 0
  stats.pendingAmount = ledgerStats.pendingAmount || 0
  stats.paidAmount = ledgerStats.paidAmount || 0
  stats.totalAmount = ledgerStats.totalAmount || 0
}

// 确认支付
const confirmPayment = async (candidateId) => {
  try {
    await ElMessageBox.confirm(
      '确认已支付该笔分账？此操作将更新星探的收益状态。',
      '确认支付',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await wxcloud.callFunction('admin', {
      action: 'confirmFinanceCommissionPayment',
      data: { candidateId }
    })

    if (result.success) {
      ElMessage.success('支付确认成功')
      loadCommissions()
    } else {
      ElMessage.error(result.error || '支付确认失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('确认支付失败:', error)
      ElMessage.error('确认支付失败')
    }
  }
}

// 查看详情
const viewDetail = (item) => {
  ElMessageBox.alert(
    `<div style="line-height: 1.8">
      <p><strong>候选人：</strong>${item.candidateName}</p>
      <p><strong>总金额：</strong>${item.totalAmountText}</p>
      <p><strong>状态：</strong>${item.statusLabel}</p>
      <p><strong>分账明细：</strong></p>
      ${item.distribution.map(d =>
        `<p style="padding-left: 20px;">• ${d.scoutName}（${d.typeLabel || '分账'}）：${d.amountText || `¥${d.amount || 0}`}（${d.percentage || 0}%）</p>`
      ).join('')}
    </div>`,
    '分账详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

onMounted(() => {
  const routeStatus = route.query.status
  if (routeStatus === 'paid' || routeStatus === 'all' || routeStatus === 'calculated' || routeStatus === 'frozen') {
    activeFilter.value = routeStatus
  }
  loadCommissions()
})
</script>

<style scoped>
.commissions-page {
  padding: 20px;
  background: #1a1a1a;
  min-height: 100vh;
}

/* 统计卡片 */
/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  background: #252525;
  border: none;
}

.filter-card :deep(.el-card__body) {
  padding: 16px;
}

/* 分账列表 */
.commission-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-tip {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 14px;
}

.commission-card {
  background: #252525;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #333;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #333;
  margin-bottom: 16px;
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.candidate-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.total-amount {
  font-size: 14px;
  color: #999;
}

.amount-value {
  font-size: 20px;
  font-weight: bold;
  color: #13e8dd;
  margin-left: 8px;
}

/* 分账明细 */
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.distribution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2a2a2a;
  border-radius: 8px;
}

.scout-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scout-name {
  font-size: 15px;
  color: #eee;
  font-weight: 500;
}

.amount-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.percentage {
  font-size: 14px;
  color: #999;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 12px;
  border-radius: 4px;
}

.amount {
  font-size: 18px;
  font-weight: bold;
  color: #67c23a;
}

/* 页脚信息 */
.card-footer {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #333;
  margin-top: 16px;
}

.time-info {
  font-size: 13px;
  color: #888;
}

.time-label {
  margin-right: 8px;
}

.time-value {
  color: #aaa;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #333;
}

@media (max-width: 767px) {
  .commissions-page {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .distribution-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .card-footer {
    flex-direction: column;
    gap: 8px;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
