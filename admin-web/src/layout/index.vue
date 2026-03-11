<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <h2>奥米光年</h2>
        <span>管理后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#000000"
        text-color="#888888"
        active-text-color="#000000"
      >
        <el-menu-item index="/candidates">
          <el-icon><User /></el-icon>
          <span>候选人管理</span>
        </el-menu-item>
        <el-menu-item index="/dashboard" v-if="hasRole(['admin', 'hr'])">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/scouts" v-if="hasPermission('viewReferralInfo')">
          <el-icon><UserFilled /></el-icon>
          <span>星探管理</span>
        </el-menu-item>
        <el-menu-item index="/commissions" v-if="hasPermission('viewReferralInfo')">
          <el-icon><Wallet /></el-icon>
          <span>分账管理</span>
        </el-menu-item>
        <el-menu-item index="/users" v-if="hasPermission('manageUsers')">
          <el-icon><Setting /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/assignments" v-if="hasPermission('assignCandidates')">
          <el-icon><Connection /></el-icon>
          <span>候选人分配</span>
        </el-menu-item>
        <el-menu-item index="/audit-logs" v-if="hasPermission('viewAuditLog')">
          <el-icon><Document /></el-icon>
          <span>操作日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-right">
          <el-tag :type="userInfo?.role === 'admin' ? 'success' : 'info'" size="small">
            {{ userInfo?.role === 'admin' ? '管理员' : '经纪人' }}
          </el-tag>
          <span class="admin-name">{{ userInfo?.name || '未知用户' }}</span>
          <el-button link @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, UserFilled, DataAnalysis, Setting, Connection, Document, Wallet } from '@element-plus/icons-vue'
import { getUserInfo, clearUserInfo, hasPermission as checkPermission, getUserRole } from '../utils/permission'

const route = useRoute()
const router = useRouter()

const userInfo = ref(getUserInfo())

const activeMenu = computed(() => route.path)

// 检查权限
function hasPermission(permission) {
  return checkPermission(permission)
}

// 检查角色
function hasRole(roles) {
  const role = getUserRole()
  return Array.isArray(roles) ? roles.includes(role) : roles === role
}

function handleLogout() {
  clearUserInfo()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100%;
}

.layout-aside {
  background-color: #000000;
  border-right: 2px solid #333;
  overflow-y: auto;
}

.logo {
  padding: 24px 20px;
  text-align: center;
  color: #FFFFFF;
  border-bottom: 2px solid #333;
  background: #000;
}

.logo h2 {
  font-size: 24px;
  margin-bottom: 4px;
  font-weight: 900;
  font-style: italic;
  letter-spacing: 1px;
  text-shadow: 2px 2px 0 rgba(19, 232, 221, 0.3);
}

.logo span {
  font-size: 12px;
  color: var(--color-cyan);
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.layout-header {
  background: #1E1E1E;
  border-bottom: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-name {
  color: #FFFFFF;
  font-weight: bold;
  font-size: 14px;
}

.layout-main {
  background: #000000;
  padding: 24px;
}

/* Menu Overrides for Street Style */
:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item.is-active) {
  color: #000000 !important;
  background: var(--color-cyan) !important;
  font-weight: 900;
  clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
}

:deep(.el-menu-item:hover) {
  color: var(--color-cyan) !important;
  background: rgba(19, 232, 221, 0.1) !important;
}</style>
