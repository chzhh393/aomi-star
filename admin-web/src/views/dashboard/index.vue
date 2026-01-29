<template>
  <div class="dashboard-page">
    <el-row :gutter="16">
      <el-col :span="6" v-for="item in statCards" :key="item.key">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats[item.key] ?? '-' }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminAPI } from '../../api/admin'

const stats = ref({})

const statCards = [
  { key: 'total', label: '总报名人数' },
  { key: 'pending', label: '待审核' },
  { key: 'interview_scheduled', label: '已安排面试' },
  { key: 'signed', label: '已签约' }
]

onMounted(async () => {
  try {
    const res = await adminAPI.getStatistics()
    if (res.success) {
      stats.value = res.data
    }
  } catch {
    // 静默处理
  }
})
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 8px 0;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #409eff;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}
</style>
