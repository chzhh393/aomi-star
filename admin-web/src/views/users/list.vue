<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        创建账号
      </el-button>
    </div>

    <!-- 用户列表 -->
    <el-table
      :data="userList"
      style="width: 100%"
      v-loading="loading"
      class="data-table"
    >
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'success' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '经纪人' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分配候选人数" width="120">
        <template #default="{ row }">
          {{ row.role === 'agent' ? (row.assignedCandidates?.length || 0) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="createdBy" label="创建者" width="120" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            link
            :type="row.status === 'active' ? 'warning' : 'success'"
            size="small"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 'active' ? '禁用' : '启用' }}
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            @click="handleDelete(row)"
            v-if="row.username !== 'admin'"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      :title="dialogMode === 'create' ? '创建账号' : '编辑账号'"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            :disabled="dialogMode === 'edit'"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" :prop="dialogMode === 'create' ? 'password' : ''">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="dialogMode === 'create' ? '请输入密码' : '留空则不修改密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" :disabled="dialogMode === 'edit'">
            <el-option label="管理员" value="admin" />
            <el-option label="经纪人" value="agent" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminAPI } from '../../api/admin'

const loading = ref(false)
const userList = ref([])
const dialogVisible = ref(false)
const dialogMode = ref('create') // 'create' 或 'edit'
const submitting = ref(false)
const formRef = ref()

const form = ref({
  id: '',
  username: '',
  name: '',
  password: '',
  role: 'agent'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 加载用户列表
async function loadUsers() {
  loading.value = true
  try {
    const res = await adminAPI.getAdminList()
    if (res.success) {
      userList.value = res.data
    } else {
      ElMessage.error(res.error || '加载失败')
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载失败，请重试')
  } finally {
    loading.value = false
  }
}

// 显示创建对话框
function showCreateDialog() {
  dialogMode.value = 'create'
  form.value = {
    id: '',
    username: '',
    name: '',
    password: '',
    role: 'agent'
  }
  dialogVisible.value = true
}

// 编辑用户
function handleEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    id: row._id,
    username: row.username,
    name: row.name,
    password: '',
    role: row.role
  }
  dialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    let res
    if (dialogMode.value === 'create') {
      res = await adminAPI.createAdmin(form.value)
    } else {
      const updateData = {
        id: form.value.id,
        name: form.value.name
      }
      if (form.value.password) {
        updateData.password = form.value.password
      }
      res = await adminAPI.updateAdmin(updateData)
    }

    if (res.success) {
      ElMessage.success(dialogMode.value === 'create' ? '创建成功' : '更新成功')
      dialogVisible.value = false
      loadUsers()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 切换状态
async function handleToggleStatus(row) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}该账号吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await adminAPI.updateAdmin({
      id: row._id,
      status: newStatus
    })

    if (res.success) {
      ElMessage.success(`${action}成功`)
      loadUsers()
    } else {
      ElMessage.error(res.error || `${action}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`${action}失败:`, error)
      ElMessage.error(`${action}失败，请重试`)
    }
  }
}

// 删除用户
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除账号"${row.name}"吗？此操作不可恢复。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    const res = await adminAPI.deleteAdmin(row._id)

    if (res.success) {
      ElMessage.success('删除成功')
      loadUsers()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

onMounted(() => {
  loadUsers()
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

.data-table {
  background: var(--card-dark);
  border: 2px solid #333;
}
</style>
