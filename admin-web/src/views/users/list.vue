<template>
  <div class="users-page">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="loadUsers">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="pending">
          待审核
          <el-badge v-if="pendingCount > 0" :value="pendingCount" class="badge-item" />
        </el-radio-button>
        <el-radio-button value="active">已通过</el-radio-button>
        <el-radio-button value="rejected">已拒绝</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 桌面端：表格 -->
    <el-table v-if="!isMobile" :data="users" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="name" label="姓名" width="120" />

      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.role === 'pending'" type="info">待分配</el-tag>
          <el-tag v-else :type="getRoleType(row.role)">
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'active' ? 'success' :
                   row.status === 'pending' ? 'warning' : 'danger'">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="申请时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.application?.appliedAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            type="primary"
            size="small"
            @click="reviewUser(row)">
            审核
          </el-button>

          <el-button
            v-if="row.status === 'active'"
            link
            size="small"
            @click="editUser(row)">
            编辑
          </el-button>

          <el-button
            v-if="row.status === 'active'"
            link
            size="small"
            style="color: #f56c6c;"
            @click="deactivateUser(row)">
            停用
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 移动端：卡片列表 -->
    <div v-else v-loading="loading" class="mobile-user-list">
      <div v-for="row in users" :key="row._id" class="mobile-user-card">
        <div class="mobile-user-top">
          <span class="mobile-user-name">{{ row.name || '-' }}</span>
          <el-tag
            size="small"
            :type="row.status === 'active' ? 'success' :
                   row.status === 'pending' ? 'warning' : 'danger'">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </div>
        <div class="mobile-user-meta">
          <span class="mobile-user-username">@{{ row.username }}</span>
          <el-tag v-if="row.role !== 'pending'" :type="getRoleType(row.role)" size="small">
            {{ getRoleLabel(row.role) }}
          </el-tag>
        </div>
        <div class="mobile-user-bottom">
          <span class="mobile-user-time">{{ formatDate(row.application?.appliedAt) }}</span>
          <div class="mobile-user-actions">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="reviewUser(row)">
              审核
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              link
              size="small"
              @click="editUser(row)">
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              link
              size="small"
              style="color: #f56c6c;"
              @click="deactivateUser(row)">
              停用
            </el-button>
          </div>
        </div>
      </div>
      <div v-if="users.length === 0 && !loading" class="empty-tip">暂无数据</div>
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="showReview" title="审核用户申请" width="500px">
      <div v-if="currentUser" class="review-dialog">
        <div class="user-info">
          <div class="info-row">
            <span class="label">用户名：</span>
            <span class="value">{{ currentUser.username }}</span>
          </div>
          <div class="info-row">
            <span class="label">姓名：</span>
            <span class="value">{{ currentUser.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">期望角色：</span>
            <span class="value">
              <el-tag :type="getRoleType(currentUser.application?.desiredRole)">
                {{ getRoleLabel(currentUser.application?.desiredRole) }}
              </el-tag>
            </span>
          </div>
          <div class="info-row">
            <span class="label">申请时间：</span>
            <span class="value">{{ formatDate(currentUser.application?.appliedAt) }}</span>
          </div>
          <div class="info-row">
            <span class="label">申请理由：</span>
            <span class="value">{{ currentUser.application?.reason || '无' }}</span>
          </div>
        </div>

        <el-form :model="reviewForm" label-width="100px" style="margin-top: 20px;">
          <el-form-item label="分配角色">
            <el-radio-group v-model="reviewForm.role">
              <el-radio value="admin">管理员</el-radio>
              <el-radio value="hr">HR</el-radio>
              <el-radio value="agent">经纪人</el-radio>
              <el-radio value="operations">运营</el-radio>
              <el-radio value="trainer">培训师</el-radio>
            </el-radio-group>
            <div style="margin-top: 8px; color: #909399; font-size: 13px;">
              提示：用户期望角色为 <strong>{{ getRoleLabel(currentUser.application?.desiredRole) }}</strong>
            </div>
          </el-form-item>

          <el-form-item label="审核备注">
            <el-input
              v-model="reviewForm.note"
              type="textarea"
              :rows="3"
              placeholder="选填"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="rejectUser">拒绝</el-button>
        <el-button type="primary" @click="approveUser">通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { formatDate } from '../../utils/constants'

// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const users = ref([])
const filterStatus = ref('')
const pendingCount = ref(0)
const loading = ref(false)
const showReview = ref(false)
const currentUser = ref(null)
const reviewForm = ref({
  role: 'hr',
  note: ''
})

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminAPI.getUserList({
      status: filterStatus.value || undefined
    })
    if (res.success) {
      users.value = res.data || []
      pendingCount.value = res.pendingCount || 0
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function reviewUser(user) {
  currentUser.value = user
  reviewForm.value.role = user.application?.desiredRole || 'hr'
  reviewForm.value.note = ''
  showReview.value = true
}

async function approveUser() {
  if (!reviewForm.value.role) {
    ElMessage.warning('请选择要分配的角色')
    return
  }

  try {
    await adminAPI.reviewUser({
      userId: currentUser.value._id,
      approved: true,
      role: reviewForm.value.role,
      note: reviewForm.value.note
    })

    ElMessage.success('审核通过')
    showReview.value = false
    loadUsers()
  } catch (error) {
    console.error('审核失败:', error)
    ElMessage.error('审核失败：' + (error.message || '未知错误'))
  }
}

async function rejectUser() {
  await ElMessageBox.confirm(`确认拒绝 ${currentUser.value.name} 的申请吗？`, '确认拒绝')

  try {
    await adminAPI.reviewUser({
      userId: currentUser.value._id,
      approved: false,
      note: reviewForm.value.note
    })

    ElMessage.success('已拒绝申请')
    showReview.value = false
    loadUsers()
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败：' + (error.message || '未知错误'))
  }
}

function editUser(user) {
  ElMessage.info('编辑功能待开发')
}

function deactivateUser(user) {
  ElMessage.info('停用功能待开发')
}

function getRoleLabel(role) {
  const labels = {
    admin: '管理员',
    hr: 'HR',
    agent: '经纪人',
    operations: '运营',
    trainer: '培训师',
    pending: '待分配'
  }
  return labels[role] || role
}

function getRoleType(role) {
  const types = {
    admin: 'danger',
    hr: 'success',
    agent: 'warning',
    operations: 'info',
    trainer: 'primary'
  }
  return types[role] || 'info'
}

function getStatusLabel(status) {
  const labels = {
    pending: '待审核',
    active: '已通过',
    rejected: '已拒绝'
  }
  return labels[status] || status
}
</script>

<style scoped>
.users-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin: 0;
}

.filter-bar {
  margin-bottom: 20px;
}

.badge-item {
  margin-left: 8px;
}

.review-dialog {
  padding: 10px 0;
}

.user-info {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  width: 100px;
  color: #606266;
  font-weight: 500;
}

.info-row .value {
  flex: 1;
  color: #303133;
}

/* 移动端卡片列表 */
.mobile-user-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-user-card {
  background: #252525;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #3a3a3a;
}

.mobile-user-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-user-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.mobile-user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.mobile-user-username {
  font-size: 13px;
  color: #888;
}

.mobile-user-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #333;
}

.mobile-user-time {
  font-size: 12px;
  color: #666;
}

.mobile-user-actions {
  display: flex;
  gap: 4px;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #666;
}

@media (max-width: 767px) {
  .users-page {
    padding: 12px;
  }

  .page-header {
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .info-row .label {
    width: 80px;
    font-size: 13px;
  }
}
</style>
