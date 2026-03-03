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
  padding: 20px 0;
  border: 4px solid #333;
  background: #1E1E1E; /* Default Dark */
  box-shadow: 4px 4px 0 rgba(255, 255, 255, 0.1);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(255, 255, 255, 0.2);
}

.stat-value {
  font-size: 36px;
  font-weight: 900;
  color: #FFF;
  font-family: 'Impact', sans-serif; /* Strong font */
  letter-spacing: 1px;
}

.stat-label {
  font-size: 14px;
  color: #888;
  margin-top: 8px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 1px;
}

/* Specific Card Themes */
:deep(.el-col:nth-child(1)) .stat-card {
  border-color: var(--color-cyan);
  box-shadow: var(--shadow-hard-cyan);
}

:deep(.el-col:nth-child(1)) .stat-value {
  color: var(--color-cyan);
  text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}

:deep(.el-col:nth-child(2)) .stat-card {
  border-color: var(--color-yellow);
  box-shadow: var(--shadow-hard-yellow);
}

:deep(.el-col:nth-child(2)) .stat-value {
  color: var(--color-yellow);
  text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
}
</style>
