<template>
  <div class="page-container">
    <div class="page-header">
      <h2>候选人分配</h2>
      <el-button type="primary" @click="showAssignDialog">
        <el-icon><Plus /></el-icon>
        新增分配
      </el-button>
    </div>

    <!-- 分配列表 -->
    <div v-loading="loading">
      <el-collapse v-model="activeNames">
        <el-collapse-item
          v-for="assignment in assignments"
          :key="assignment.agentId"
          :name="assignment.agentId"
        >
          <template #title>
            <div class="agent-header">
              <el-tag type="info" size="large">经纪人</el-tag>
              <span class="agent-name">{{ assignment.agentName }}</span>
              <span class="agent-username">(@{{ assignment.agentUsername }})</span>
              <el-tag size="small" class="candidate-count">
                已分配 {{ assignment.candidates.length }} 人
              </el-tag>
            </div>
          </template>

          <!-- 桌面端：表格 -->
          <el-table
            v-if="!isMobile"
            :data="assignment.candidates"
            style="width: 100%"
            class="candidate-table"
          >
            <el-table-column prop="name" label="候选人姓名" width="150" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="报名时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleUnassign(row.id, assignment.agentName)"
                >
                  取消分配
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 移动端：卡片列表 -->
          <div v-else class="mobile-candidate-list">
            <div v-for="row in assignment.candidates" :key="row.id" class="mobile-candidate-card">
              <div class="mobile-card-top">
                <span class="mobile-card-name">{{ row.name }}</span>
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </div>
              <div class="mobile-card-meta">
                <span class="mobile-card-time">{{ formatDate(row.createdAt) }}</span>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleUnassign(row.id, assignment.agentName)"
                >
                  取消分配
                </el-button>
              </div>
            </div>
          </div>

          <el-empty v-if="assignment.candidates.length === 0" description="暂无分配的候选人" />
        </el-collapse-item>
      </el-collapse>

      <el-empty v-if="assignments.length === 0" description="暂无经纪人" />
    </div>

    <!-- 分配对话框 -->
    <el-dialog
      title="分配候选人"
      v-model="assignDialogVisible"
      width="600px"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="选择经纪人">
          <el-select
            v-model="assignForm.agentId"
            placeholder="请选择经纪人"
            style="width: 100%"
            @change="handleAgentChange"
          >
            <el-option
              v-for="agent in agentList"
              :key="agent._id"
              :label="`${agent.name} (@${agent.username})`"
              :value="agent._id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择候选人">
          <el-select
            v-model="assignForm.candidateId"
            placeholder="请选择候选人"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="candidate in availableCandidates"
              :key="candidate._id"
              :label="`${candidate.basicInfo?.name} - ${getStatusText(candidate.status)}`"
              :value="candidate._id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssign" :loading="assigning">
          确定分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminAPI } from '../../api/admin'

// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const loading = ref(false)
const assignments = ref([])
const activeNames = ref([])
const assignDialogVisible = ref(false)
const assigning = ref(false)

const agentList = ref([])
const allCandidates = ref([])
const availableCandidates = ref([])

const assignForm = ref({
  agentId: '',
  candidateId: ''
})

// 状态映射
const statusMap = {
  pending: '信息审核',
  approved: '审核通过',
  rejected: '未通过',
  interview_scheduled: '面试阶段',
  training: '培训阶段',
  signed: '签约阶段',
  live: '成团开播',
  probation: '考核期'
}

const statusTypeMap = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  interview_scheduled: 'primary',
  training: '',
  signed: 'success',
  live: 'success',
  probation: 'warning'
}

function getStatusText(status) {
  return statusMap[status] || status
}

function getStatusType(status) {
  return statusTypeMap[status] || 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 加载分配关系
async function loadAssignments() {
  loading.value = true
  try {
    const res = await adminAPI.getAssignments()
    if (res.success) {
      assignments.value = res.data
      // 默认展开第一个
      if (res.data.length > 0) {
        activeNames.value = [res.data[0].agentId]
      }
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (error) {
    console.error('加载分配关系失败:', error)
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 显示分配对话框
async function showAssignDialog() {
  // 加载经纪人列表
  try {
    const [agentRes, candidateRes] = await Promise.all([
      adminAPI.getAdminList(),
      adminAPI.getCandidateList({ page: 1, pageSize: 1000, status: 'all' })
    ])

    if (agentRes.success) {
      agentList.value = agentRes.data.filter(u => u.role === 'agent' && u.status === 'active')
    }

    if (candidateRes.success) {
      allCandidates.value = candidateRes.data.list
    }

    assignForm.value = {
      agentId: '',
      candidateId: ''
    }

    assignDialogVisible.value = true
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 经纪人改变时，筛选可用候选人
function handleAgentChange(agentId) {
  if (!agentId) {
    availableCandidates.value = []
    return
  }

  // 找到该经纪人已分配的候选人ID
  const assignment = assignments.value.find(a => a.agentId === agentId)
  const assignedIds = assignment ? assignment.candidates.map(c => c.id) : []

  // 过滤出未分配给该经纪人的候选人
  availableCandidates.value = allCandidates.value.filter(
    c => !assignedIds.includes(c._id) && !c.assignedAgent
  )
}

// 分配候选人
async function handleAssign() {
  if (!assignForm.value.agentId || !assignForm.value.candidateId) {
    ElMessage.warning('请选择经纪人和候选人')
    return
  }

  assigning.value = true
  try {
    const res = await adminAPI.assignCandidate(
      assignForm.value.candidateId,
      assignForm.value.agentId
    )

    if (res.success) {
      ElMessage.success('分配成功')
      assignDialogVisible.value = false
      loadAssignments()
    } else {
      ElMessage.error(res.error || '分配失败')
    }
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败，请重试')
  } finally {
    assigning.value = false
  }
}

// 取消分配
async function handleUnassign(candidateId, agentName) {
  try {
    await ElMessageBox.confirm(
      `确定要取消该候选人与经纪人"${agentName}"的分配关系吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await adminAPI.unassignCandidate(candidateId)

    if (res.success) {
      ElMessage.success('取消分配成功')
      loadAssignments()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消分配失败:', error)
      ElMessage.error('操作失败，请重试')
    }
  }
}

onMounted(() => {
  loadAssignments()
})
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-text);
  margin: 0;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.agent-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-text);
}

.agent-username {
  font-size: 14px;
  color: #888;
}

.candidate-count {
  margin-left: auto;
}

.candidate-table {
  background: var(--card-dark);
  border: 1px solid #333;
  margin-top: 12px;
}

:deep(.el-collapse) {
  border-top: none;
  border-bottom: none;
}

:deep(.el-collapse-item) {
  background: var(--card-dark);
  border: 2px solid #333;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-collapse-item__header) {
  background: #1a1a1a;
  color: var(--color-text);
  border-bottom: 2px solid #333;
  padding: 16px 20px;
  height: auto;
}

:deep(.el-collapse-item__header.is-active) {
  border-bottom-color: var(--color-cyan);
}

:deep(.el-collapse-item__wrap) {
  background: var(--card-dark);
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding: 16px;
}

/* 移动端卡片列表 */
.mobile-candidate-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.mobile-candidate-card {
  background: #252525;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #3a3a3a;
}

.mobile-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-card-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.mobile-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-card-time {
  font-size: 12px;
  color: #888;
}

@media (max-width: 767px) {
  .page-container {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .agent-header {
    flex-wrap: wrap;
  }

  :deep(.el-collapse-item__content) {
    padding: 10px;
  }
}
</style>
