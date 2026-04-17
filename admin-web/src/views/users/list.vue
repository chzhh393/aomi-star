<template>
  <div class="users-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">员工与面试官管理</h2>
        <p class="page-subtitle">管理员可新增、审核、编辑员工账号，并调整各类面试官角色。</p>
      </div>
      <el-button type="primary" @click="openCreateUserDialog">新增员工/面试官</el-button>
    </div>

    <MetricCardGrid :cards="metricCards" :active-key="filterStatus" @select="setStatusFilter" />

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-row">
        <el-radio-group v-model="filterStatus" @change="handleStatusChange">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="pending">
            待审核
            <el-badge v-if="pendingCount > 0" :value="pendingCount" class="badge-item" />
          </el-radio-button>
          <el-radio-button label="active">已通过</el-radio-button>
          <el-radio-button label="rejected">已拒绝</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterRole" placeholder="筛选角色" clearable class="role-filter" @change="handleRoleChange">
          <el-option label="全部角色" value="" />
          <el-option label="仅看面试官" value="interviewer" />
          <el-option
            v-for="role in roleOptions"
            :key="role.value"
            :label="role.label"
            :value="role.value"
          />
        </el-select>
      </div>
    </div>

    <!-- 桌面端：表格 -->
    <el-table v-if="!isMobile" :data="filteredUsers" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="140" />

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
            v-if="row.status !== 'deleted'"
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
      <div v-for="row in filteredUsers" :key="row._id" class="mobile-user-card">
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
        <div class="mobile-user-phone">{{ row.phone || '-' }}</div>
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
              v-if="row.status !== 'deleted'"
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
      <div v-if="filteredUsers.length === 0 && !loading" class="empty-tip">暂无数据</div>
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
            <span class="label">手机号：</span>
            <span class="value">{{ currentUser.phone || currentUser.application?.phone || '-' }}</span>
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
              <el-radio value="finance">财务</el-radio>
              <el-radio value="trainer">培训师</el-radio>
              <el-radio value="dance_teacher">舞蹈老师</el-radio>
              <el-radio value="photographer">摄影师</el-radio>
              <el-radio value="host_mc">主持/MC</el-radio>
              <el-radio value="makeup_artist">化妆师</el-radio>
              <el-radio value="stylist">造型师</el-radio>
            </el-radio-group>
            <div style="margin-top: 8px; color: #909399; font-size: 13px;">
              提示：用户期望角色为 <strong>{{ getRoleLabel(currentUser.application?.desiredRole) }}</strong>
            </div>
            <div style="margin-top: 6px; color: #909399; font-size: 13px;">
              管理员可在此调整员工角色，主播除外的员工角色均可参与面试评价。
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

    <el-dialog v-model="showCreate" title="新增员工/面试官" width="520px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="88px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" maxlength="30" placeholder="请输入登录用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="createForm.name" maxlength="20" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createForm.phone" maxlength="11" placeholder="请输入手机号，选填" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <template v-if="createForm.role === 'agent'">
          <el-form-item label="所属团" prop="teamName">
            <el-input v-model="createForm.teamName" maxlength="30" placeholder="请输入团名称，选填" />
          </el-form-item>
          <el-form-item label="经纪人小组" prop="groupName">
            <el-input v-model="createForm.groupName" maxlength="30" placeholder="请输入经纪人小组名称，选填" />
          </el-form-item>
        </template>
        <el-form-item label="初始密码" prop="password">
          <el-input
            v-model="createForm.password"
            type="password"
            show-password
            maxlength="50"
            placeholder="请输入至少 6 位密码"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="submitCreateUser">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEdit" title="编辑员工/面试官" width="520px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="88px">
        <el-form-item label="用户名">
          <el-input :model-value="editForm.username" disabled />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" maxlength="20" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" maxlength="11" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <template v-if="editForm.role === 'agent'">
          <el-form-item label="所属团" prop="teamName">
            <el-input v-model="editForm.teamName" maxlength="30" placeholder="请输入团名称，选填" />
          </el-form-item>
          <el-form-item label="经纪人小组" prop="groupName">
            <el-input v-model="editForm.groupName" maxlength="30" placeholder="请输入经纪人小组名称，选填" />
          </el-form-item>
        </template>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="active" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="editForm.password"
            type="password"
            show-password
            maxlength="50"
            placeholder="不修改则留空"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="saveUserEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { formatDate } from '../../utils/constants'
import MetricCardGrid from '../../components/common/metric-card-grid.vue'

// 响应式
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const users = ref([])
const filterStatus = ref('')
const filterRole = ref('')
const pendingCount = ref(0)
const loading = ref(false)
const route = useRoute()
const router = useRouter()
const userStats = computed(() => {
  const source = Array.isArray(users.value) ? users.value : []
  return {
    total: source.length,
    pending: source.filter(item => item.status === 'pending').length,
    active: source.filter(item => item.status === 'active').length,
    rejected: source.filter(item => item.status === 'rejected').length
  }
})
const metricCards = computed(() => [
  { key: '', value: userStats.value.total, label: '全部账号', tone: 'default' },
  { key: 'pending', value: userStats.value.pending, label: '待审核', tone: 'pending' },
  { key: 'active', value: userStats.value.active, label: '已通过', tone: 'active-card' },
  { key: 'rejected', value: userStats.value.rejected, label: '已拒绝', tone: 'rejected' }
])
const showReview = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const currentUser = ref(null)
const createFormRef = ref(null)
const editFormRef = ref(null)
const reviewForm = ref({
  role: 'hr',
  note: ''
})
const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: 'HR', value: 'hr' },
  { label: '经纪人', value: 'agent' },
  { label: '运营', value: 'operations' },
  { label: '财务', value: 'finance' },
  { label: '培训师', value: 'trainer' },
  { label: '舞蹈老师', value: 'dance_teacher' },
  { label: '摄影师', value: 'photographer' },
  { label: '主持/MC', value: 'host_mc' },
  { label: '化妆师', value: 'makeup_artist' },
  { label: '造型师', value: 'stylist' }
]
const interviewerRoleSet = new Set([
  'admin',
  'hr',
  'agent',
  'operations',
  'finance',
  'trainer',
  'dance_teacher',
  'photographer',
  'host_mc',
  'makeup_artist',
  'stylist'
])
const filteredUsers = computed(() => {
  const source = Array.isArray(users.value) ? users.value : []
  const statusFiltered = filterStatus.value
    ? source.filter((item) => item.status === filterStatus.value)
    : source

  if (!filterRole.value) return statusFiltered
  if (filterRole.value === 'interviewer') {
    return statusFiltered.filter((item) => interviewerRoleSet.has(item.role))
  }
  return statusFiltered.filter((item) => item.role === filterRole.value)
})
const createForm = ref({
  username: '',
  name: '',
  phone: '',
  role: 'hr',
  teamName: '',
  groupName: '',
  password: ''
})
const editForm = ref({
  id: '',
  username: '',
  name: '',
  phone: '',
  role: 'hr',
  teamName: '',
  groupName: '',
  status: 'active',
  password: ''
})
const editRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 30, message: '用户名长度应在3-30个字符之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\-.]+$/, message: '用户名仅支持字母、数字、下划线、中划线和点', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '姓名长度应在1-20个字符之间', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文和空格', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^$|^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  teamName: [
    { max: 30, message: '团名称最多30个字符', trigger: 'blur' }
  ],
  groupName: [
    { max: 30, message: '经纪人小组名称最多30个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  password: [
    { pattern: /^$|^.{6,}$/, message: '密码至少6位', trigger: 'blur' }
  ]
}
const createRules = {
  username: editRules.username,
  name: editRules.name,
  phone: editRules.phone,
  role: editRules.role,
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { pattern: /^.{6,}$/, message: '密码至少6位', trigger: 'blur' }
  ]
}

onMounted(() => {
  const routeStatus = route.query.status
  const routeRole = route.query.role
  if (typeof routeStatus === 'string' && ['', 'pending', 'active', 'rejected'].includes(routeStatus)) {
    filterStatus.value = routeStatus
  }
  if (typeof routeRole === 'string') {
    filterRole.value = routeRole
  }
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminAPI.getUserList()
    if (res.success) {
      users.value = res.data || []
      pendingCount.value = (res.data || []).filter(item => item.status === 'pending').length
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

function syncQuery() {
  router.replace({
    query: {
      ...route.query,
      status: filterStatus.value || undefined,
      role: filterRole.value || undefined
    }
  })
}

function handleStatusChange() {
  syncQuery()
}

function handleRoleChange() {
  syncQuery()
}

function setStatusFilter(status) {
  if (filterStatus.value === status) {
    return
  }
  filterStatus.value = status
  handleStatusChange()
}

function reviewUser(user) {
  currentUser.value = user
  reviewForm.value.role = user.application?.desiredRole || 'hr'
  reviewForm.value.note = ''
  showReview.value = true
}

function openCreateUserDialog() {
  createForm.value = {
    username: '',
    name: '',
    phone: '',
    role: 'hr',
    teamName: '',
    groupName: '',
    password: ''
  }
  showCreate.value = true
}

async function submitCreateUser() {
  await createFormRef.value.validate()

  try {
    const payload = {
      username: createForm.value.username.trim(),
      name: createForm.value.name.trim(),
      phone: createForm.value.phone.trim(),
      role: createForm.value.role,
      teamName: createForm.value.role === 'agent' ? createForm.value.teamName.trim() : '',
      groupName: createForm.value.role === 'agent' ? createForm.value.groupName.trim() : '',
      password: createForm.value.password
    }

    await adminAPI.createAdmin(payload)
    ElMessage.success('员工账号已创建')
    showCreate.value = false
    loadUsers()
  } catch (error) {
    console.error('创建用户失败:', error)
    ElMessage.error('创建失败：' + (error.message || '未知错误'))
  }
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
  editForm.value = {
    id: user._id,
    username: user.username || '',
    name: user.name || '',
    phone: user.phone || user.application?.phone || '',
    role: user.role === 'pending'
      ? (user.application?.desiredRole || 'hr')
      : (user.role || 'hr'),
    teamName: user.teamName || '',
    groupName: user.groupName || '',
    status: user.status || 'active',
    password: ''
  }
  showEdit.value = true
}

async function saveUserEdit() {
  await editFormRef.value.validate()

  try {
    await adminAPI.updateAdmin({
      id: editForm.value.id,
      name: editForm.value.name.trim(),
      phone: editForm.value.phone.trim(),
      role: editForm.value.role,
      teamName: editForm.value.role === 'agent' ? editForm.value.teamName.trim() : '',
      groupName: editForm.value.role === 'agent' ? editForm.value.groupName.trim() : '',
      status: editForm.value.status,
      password: editForm.value.password || undefined
    })

    ElMessage.success('用户信息已更新')
    showEdit.value = false
    loadUsers()
  } catch (error) {
    console.error('更新用户失败:', error)
    ElMessage.error('更新失败：' + (error.message || '未知错误'))
  }
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
    finance: '财务',
    trainer: '培训师',
    dance_teacher: '舞蹈老师',
    photographer: '摄影师',
    host_mc: '主持/MC',
    makeup_artist: '化妆师',
    stylist: '造型师',
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
    finance: 'success',
    trainer: 'primary',
    dance_teacher: 'success',
    photographer: 'warning',
    host_mc: 'danger',
    makeup_artist: '',
    stylist: 'info'
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin: 0;
}

.page-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.filter-bar {
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.role-filter {
  width: 180px;
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

.mobile-user-phone {
  font-size: 13px;
  color: #b8c0cc;
  margin-bottom: 10px;
  word-break: break-all;
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
