<template>
  <div class="login-page">
    <div class="login-card">
      <h2>奥米光年 管理后台</h2>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" native-type="submit">
            登录
          </el-button>
          <div style="margin-top: 16px; text-align: center;">
            <router-link to="/apply" style="color: #409eff; text-decoration: none;">
              还没有账号？点击申请
            </router-link>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminAPI } from '../../api/admin'
import { saveUserInfo } from '../../utils/permission'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await adminAPI.login(form.username, form.password)
    if (res.success) {
      // 保存 token
      localStorage.setItem('token', res.token)
      // 保存用户信息（包括 role 和 permissions）
      saveUserInfo(res.admin)

      ElMessage.success('登录成功')

      // 根据角色跳转到不同页面
      if (res.admin.role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/candidates')
      }
    } else {
      ElMessage.error(res.error || '登录失败')
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
  background-image: radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: var(--card-dark);
  border-radius: 16px;
  box-shadow: var(--shadow-card);
  border: 1px solid #333;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 32px;
  color: var(--color-text);
  font-weight: bold;
}
</style>
