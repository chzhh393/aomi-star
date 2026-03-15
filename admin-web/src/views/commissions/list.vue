<template>
  <div class="commissions-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalPending }}</div>
            <div class="stat-label">待支付订单</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card pending">
          <div class="stat-content">
            <div class="stat-value">¥{{ stats.pendingAmount }}</div>
            <div class="stat-label">待支付金额</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card paid">
          <div class="stat-content">
            <div class="stat-value">¥{{ stats.paidAmount }}</div>
            <div class="stat-label">已支付金额</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card total">
          <div class="stat-content">
            <div class="stat-value">¥{{ stats.totalAmount }}</div>
            <div class="stat-label">累计分账总额</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <el-radio-group v-model="activeFilter" @change="loadCommissions">
        <el-radio-button value="calculated">待支付</el-radio-button>
        <el-radio-button value="paid">已支付</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
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
              :type="item.commission.status === 'paid' ? 'success' : 'warning'"
              size="small"
              effect="plain"
            >
              {{ item.commission.status === 'paid' ? '已支付' : '待支付' }}
            </el-tag>
          </div>
          <div class="total-amount">
            总金额：<span class="amount-value">¥{{ item.commission.totalAmount }}</span>
          </div>
        </div>

        <!-- 分账明细 -->
        <div class="distribution-list">
          <div
            v-for="(dist, index) in item.commission.distribution"
            :key="index"
            class="distribution-item"
          >
            <div class="scout-info">
              <el-tag
                :type="dist.level === 1 ? 'warning' : 'success'"
                size="small"
                effect="plain"
              >
                {{ dist.level === 1 ? '⭐ 一级' : '⭐⭐ 二级' }}
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
            <span class="time-value">{{ formatDate(item.commission.calculatedAt) }}</span>
          </div>
          <div v-if="item.commission.paidAt" class="time-info">
            <span class="time-label">支付时间：</span>
            <span class="time-value">{{ formatDate(item.commission.paidAt) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="item.commission.status === 'calculated'" class="card-actions">
          <el-button
            type="primary"
            size="small"
            @click="confirmPayment(item.candidateId)"
          >
            确认支付
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import wxcloud from '../../api/wxcloud'

// 筛选器
const activeFilter = ref('calculated')

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

// 加载分账列表
const loadCommissions = async () => {
  loading.value = true
  try {
    // 获取所有签约的候选人
    const result = await wxcloud.callFunction('admin', {
      action: 'getCandidateList',
      data: {
        status: 'signed'
      }
    })

    if (result.success) {
      const candidates = result.data?.list || []
      let allCommissions = candidates.filter(c => c.commission)

      // 根据筛选条件过滤
      if (activeFilter.value !== 'all') {
        allCommissions = allCommissions.filter(c => c.commission.status === activeFilter.value)
      }

      list.value = allCommissions.map(c => ({
        candidateId: c._id,
        candidateName: c.basicInfo?.name || '-',
        commission: c.commission
      }))

      // 计算统计数据
      calculateStats(candidates.filter(c => c.commission))
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

// 计算统计数据
const calculateStats = (allCommissions) => {
  stats.totalPending = allCommissions.filter(c => c.commission.status === 'calculated').length
  stats.pendingAmount = allCommissions
    .filter(c => c.commission.status === 'calculated')
    .reduce((sum, c) => sum + c.commission.totalAmount, 0)
  stats.paidAmount = allCommissions
    .filter(c => c.commission.status === 'paid')
    .reduce((sum, c) => sum + c.commission.totalAmount, 0)
  stats.totalAmount = stats.pendingAmount + stats.paidAmount
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

    const result = await wxcloud.callFunction('commission', {
      action: 'confirmPayment',
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
      <p><strong>总金额：</strong>¥${item.commission.totalAmount}</p>
      <p><strong>分账明细：</strong></p>
      ${item.commission.distribution.map(d => 
        `<p style="padding-left: 20px;">• ${d.scoutName}（${d.level === 1 ? '一级' : '二级'}星探）：¥${d.amount}（${d.percentage}%）</p>`
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
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: #252525;
  border: none;
  cursor: default;
}

.stat-card.pending {
  border-left: 3px solid #e6a23c;
}

.stat-card.paid {
  border-left: 3px solid #67c23a;
}

.stat-card.total {
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
