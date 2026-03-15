<template>
  <div class="page-container">
    <div class="page-header">
      <h2>操作日志</h2>
      <div class="filter-group">
        <el-select v-model="filters.action" placeholder="操作类型" style="width: 180px" @change="loadLogs">
          <el-option label="全部操作" value="all" />
          <el-option label="查看候选人详情" value="view_candidate_detail" />
          <el-option label="删除候选人" value="delete_candidate" />
          <el-option label="创建账号" value="create_admin" />
          <el-option label="更新账号" value="update_admin" />
          <el-option label="删除账号" value="delete_admin" />
          <el-option label="分配候选人" value="assign_candidate" />
          <el-option label="取消分配" value="unassign_candidate" />
          <el-option label="面试打分" value="score_interview" />
          <el-option label="上传面试资料" value="upload_interview_materials" />
        </el-select>
        <el-select v-model="filters.operator" placeholder="操作人" style="width: 180px" @change="loadLogs">
          <el-option label="全部人员" value="all" />
          <el-option
            v-for="op in operators"
            :key="op"
            :label="op"
            :value="op"
          />
        </el-select>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 桌面端：表格 -->
    <el-table
      v-if="!isMobile"
      :data="logs"
      style="width: 100%"
      v-loading="loading"
      class="data-table"
    >
      <el-table-column label="操作时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column label="操作类型" width="150">
        <template #default="{ row }">
          <el-tag :type="getActionType(row.action)" size="small">
            {{ getActionText(row.action) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标对象" width="280">
        <template #default="{ row }">
          <span class="target-text">{{ getTargetText(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="详细信息">
        <template #default="{ row }">
          <div class="log-details">
            <span v-for="(value, key) in row.details" :key="key" class="detail-item">
              <strong>{{ getDetailKeyText(key) }}:</strong> {{ formatDetailValue(key, value) }}
            </span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 移动端：卡片列表 -->
    <div v-else v-loading="loading" class="mobile-log-list">
      <div v-for="row in logs" :key="row._id" class="mobile-log-card">
        <div class="mobile-log-top">
          <el-tag :type="getActionType(row.action)" size="small">
            {{ getActionText(row.action) }}
          </el-tag>
          <span class="mobile-log-operator">{{ row.operator }}</span>
        </div>
        <div class="mobile-log-target">{{ getTargetText(row) }}</div>
        <div v-if="row.details" class="mobile-log-details">
          <span v-for="(value, key) in row.details" :key="key" class="detail-item">
            <strong>{{ getDetailKeyText(key) }}:</strong> {{ formatDetailValue(key, value) }}
          </span>
        </div>
        <div class="mobile-log-time">{{ formatDate(row.createdAt) }}</div>
      </div>
      <div v-if="logs.length === 0 && !loading" class="empty-tip">暂无日志</div>
    </div>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @current-change="loadLogs"
      @size-change="loadLogs"
      class="pagination"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAPI } from '../../api/admin'

// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const loading = ref(false)
const logs = ref([])

const filters = ref({
  action: 'all',
  operator: 'all'
})

const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0
})

// 操作类型映射
const actionMap = {
  view_candidate_detail: '查看候选人详情',
  delete_candidate: '删除候选人',
  create_admin: '创建账号',
  update_admin: '更新账号',
  delete_admin: '删除账号',
  assign_candidate: '分配候选人',
  unassign_candidate: '取消分配',
  score_interview: '面试打分',
  upload_interview_materials: '上传面试资料'
}

const actionTypeMap = {
  view_candidate_detail: 'info',
  delete_candidate: 'danger',
  create_admin: 'success',
  update_admin: 'warning',
  delete_admin: 'danger',
  assign_candidate: 'primary',
  unassign_candidate: 'warning',
  score_interview: 'success',
  upload_interview_materials: 'primary'
}

const detailKeyMap = {
  candidateName: '候选人姓名',
  hardDelete: '硬删除',
  openId: 'OpenID',
  username: '用户名',
  name: '姓名',
  role: '角色',
  status: '状态',
  passwordChanged: '修改密码',
  agentId: '经纪人ID',
  agentName: '经纪人姓名',
  type: '资料类型',
  count: '资料数量',
  result: '打分结果',
  comment: '评语'
}

function getActionText(action) {
  return actionMap[action] || action
}

function getActionType(action) {
  return actionTypeMap[action] || 'info'
}

function getTargetText(row) {
  if (!row?.target) return '-'

  const candidateActions = [
    'view_candidate_detail',
    'delete_candidate',
    'assign_candidate',
    'unassign_candidate',
    'score_interview',
    'upload_interview_materials'
  ]

  if (candidateActions.includes(row.action)) {
    return `候选人ID: ${row.target}`
  }

  const adminActions = ['create_admin', 'update_admin', 'delete_admin']
  if (adminActions.includes(row.action)) {
    return `账号ID: ${row.target}`
  }

  return row.target
}

function getDetailKeyText(key) {
  return detailKeyMap[key] || key
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatDetailValue(key, value) {
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  if (value === null || value === undefined) {
    return '-'
  }

  if (key === 'role') {
    if (value === 'admin') return '管理员'
    if (value === 'agent') return '经纪人'
  }

  if (key === 'status') {
    if (value === 'active') return '启用'
    if (value === 'disabled') return '禁用'
    if (value === 'deleted') return '已删除'
  }

  if (key === 'type') {
    if (value === 'photos') return '面试照片'
    if (value === 'videos') return '才艺视频'
  }

  if (key === 'result') {
    const scoreMap = {
      pass_s: '通过 S',
      pass_a: '通过 A',
      pass_b: '通过 B',
      fail: '不通过',
      pending: '待定'
    }
    return scoreMap[value] || String(value)
  }

  if (Array.isArray(value)) {
    return value.join('、')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

// 从日志中提取所有操作人
const operators = computed(() => {
  const ops = new Set()
  logs.value.forEach(log => {
    if (log.operator) {
      ops.add(log.operator)
    }
  })
  return Array.from(ops).sort()
})

// 加载日志
async function loadLogs() {
  loading.value = true
  try {
    const res = await adminAPI.getAuditLogs({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      action: filters.value.action,
      operator: filters.value.operator
    })

    if (res.success) {
      logs.value = res.data.list
      pagination.value.total = res.data.total
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (error) {
    console.error('加载操作日志失败:', error)
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 重置筛选
function resetFilters() {
  filters.value = {
    action: 'all',
    operator: 'all'
  }
  pagination.value.page = 1
  loadLogs()
}

onMounted(() => {
  loadLogs()
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

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.data-table {
  background: var(--card-dark);
  border: 2px solid #333;
  margin-bottom: 24px;
}

.log-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.target-text {
  color: #ddd;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  word-break: break-all;
}

.detail-item {
  font-size: 13px;
  color: #ccc;
}

.detail-item strong {
  color: var(--color-cyan);
  margin-right: 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

/* 移动端卡片列表 */
.mobile-log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.mobile-log-card {
  background: #252525;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #3a3a3a;
}

.mobile-log-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.mobile-log-operator {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.mobile-log-target {
  font-size: 12px;
  color: #aaa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
  margin-bottom: 6px;
}

.mobile-log-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.mobile-log-time {
  font-size: 12px;
  color: #666;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #666;
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

  .filter-group {
    flex-wrap: wrap;
    width: 100%;
  }

  .filter-group .el-select {
    width: 100% !important;
  }

  .pagination {
    justify-content: center;
  }
}
</style>
