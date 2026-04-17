<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <h2>内部员工注册</h2>
        <p>填写信息完成注册，管理员审核通过后即可登录</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="register-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="form.username"
                placeholder="字母、数字、下划线，3-20位"
                maxlength="20"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入真实姓名" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model="form.phone"
                placeholder="请输入 11 位手机号"
                maxlength="11"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="desiredRole">
              <el-select
                v-model="form.desiredRole"
                placeholder="请选择角色"
                class="role-select"
                clearable>
                <el-option
                  v-for="role in roleOptions"
                  :key="role.value"
                  :label="role.label"
                  :value="role.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="至少6位"
                show-password
                maxlength="50"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                show-password
                maxlength="50"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item class="form-actions">
          <el-button type="primary" @click="submitForm" :loading="submitting" class="submit-btn">
            注册
          </el-button>
        </el-form-item>

        <div class="login-link">
          已有账号？<a @click="goBack">返回登录</a>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminAPI } from '../../api/admin'

const router = useRouter()
const formRef = ref(null)
const submitting = ref(false)
const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: 'HR', value: 'hr' },
  { label: '经纪人', value: 'agent' },
  { label: '运营', value: 'operations' },
  { label: '培训师', value: 'trainer' },
  { label: '舞蹈老师', value: 'dance_teacher' },
  { label: '摄影师', value: 'photographer' },
  { label: '主持/MC', value: 'host_mc' },
  { label: '化妆师', value: 'makeup_artist' },
  { label: '造型师', value: 'stylist' }
]

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  phone: '',
  desiredRole: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字、下划线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '姓名长度应在1-20个字符之间', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/, message: '姓名只能包含中文、英文和空格', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' }
  ],
  desiredRole: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

async function submitForm() {
  await formRef.value.validate()

  submitting.value = true
  try {
    const res = await adminAPI.applyUser({
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      phone: form.phone.trim(),
      desiredRole: form.desiredRole
    })

    if (!res?.success) {
      ElMessage.error(res?.error || '申请提交失败')
      return
    }

    ElMessage.success(res.message || '注册成功，请等待管理员审核')
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error) {
    console.error('注册失败:', error)
    ElMessage.error('注册失败：' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/login')
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-container {
  width: 480px;
  max-width: 90vw;
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

@media (max-width: 767px) {
  .register-container {
    padding: 24px 20px 20px;
  }
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h2 {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.register-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.register-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
  padding-bottom: 4px;
}

.role-select {
  width: 100%;
}

.form-actions {
  margin-top: 8px;
  margin-bottom: 0;
}

.submit-btn {
  width: 100%;
  height: 42px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.login-link {
  text-align: center;
  font-size: 14px;
  color: #909399;
  margin-top: 16px;
}

.login-link a {
  color: #667eea;
  cursor: pointer;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
