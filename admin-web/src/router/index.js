import { createRouter, createWebHistory } from 'vue-router'
import { getUserInfo, hasPermission } from '../utils/permission'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '数据看板' }
      },
      {
        path: 'candidates',
        name: 'Candidates',
        component: () => import('../views/candidates/list.vue'),
        meta: { title: '候选人管理' }
      },
      {
        path: 'scouts',
        name: 'Scouts',
        component: () => import('../views/scouts/list.vue'),
        meta: {
          title: '星探管理',
          permission: 'viewReferralInfo' // 只有管理员可以查看
        }
      },
      {
        path: 'commissions',
        name: 'Commissions',
        component: () => import('../views/commissions/list.vue'),
        meta: {
          title: '分账管理',
          permission: 'viewReferralInfo' // 只有管理员可以查看
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/users/list.vue'),
        meta: {
          title: '用户管理',
          permission: 'manageUsers' // 只有管理员可以管理用户
        }
      },
      {
        path: 'assignments',
        name: 'Assignments',
        component: () => import('../views/assignments/index.vue'),
        meta: {
          title: '候选人分配',
          permission: 'assignCandidates' // 只有管理员可以分配
        }
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('../views/audit-logs/index.vue'),
        meta: {
          title: '操作日志',
          permission: 'viewAuditLog' // 只有管理员可以查看
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  // 不需要认证的页面
  if (to.meta.requiresAuth === false) {
    next()
    return
  }

  // 未登录，跳转到登录页
  if (!token) {
    next('/login')
    return
  }

  // 检查权限
  if (to.meta.permission) {
    const userInfo = getUserInfo()
    if (!userInfo) {
      next('/login')
      return
    }

    // 检查是否有该权限
    if (!hasPermission(to.meta.permission)) {
      // 没有权限，跳转到首页
      next('/dashboard')
      return
    }
  }

  next()
})

export default router
