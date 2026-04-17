<template>
  <div class="dashboard-page">
    <MetricCardGrid :cards="metricCards" @select="goToCandidates" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '../../api/admin'
import MetricCardGrid from '../../components/common/metric-card-grid.vue'

const stats = ref({})
const router = useRouter()

const statCards = [
  { key: 'total', label: '总报名人数', filter: 'all', className: 'total' },
  { key: 'pending', label: '待审核', filter: 'pending', className: 'pending' },
  { key: 'interview_scheduled', label: '已安排面试', filter: 'interview_scheduled', className: 'scheduled' },
  { key: 'signed', label: '已签约', filter: 'signed', className: 'signed' }
]

const metricCards = computed(() => statCards.map((item) => ({
  key: item.filter,
  value: stats.value[item.key] ?? 0,
  label: item.label,
  tone: item.className === 'total' ? 'default' : item.className
})))

const goToCandidates = (filter) => {
  router.push({
    path: '/candidates',
    query: filter && filter !== 'all' ? { status: filter } : {}
  })
}

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
.dashboard-page {
  width: 100%;
  overflow-x: hidden;
}
</style>
