import { getWorkspacePathByRole, isInterviewerRole } from '../../utils/interviewer.js';
import {
  agentLogout,
  getAgentInfo,
  getAgentSessionExpiry,
  isAgentLoggedIn,
  saveAgentSession
} from '../../utils/agent-auth.js';
import {
  getCurrentOpenId,
  getCurrentUser,
  logout as logoutMiniUser,
  requireLogin,
  updateLocalUser
} from '../../utils/auth.js';

const ROLE_OPTIONS = [
  { value: 'hr', label: 'HR' },
  { value: 'agent', label: '经纪人' },
  { value: 'operations', label: '运营' },
  { value: 'finance', label: '财务' },
  { value: 'trainer', label: '培训师' },
  { value: 'dance_teacher', label: '舞蹈老师' },
  { value: 'photographer', label: '摄影师' },
  { value: 'host_mc', label: '主持/MC' },
  { value: 'makeup_artist', label: '化妆师' },
  { value: 'stylist', label: '造型师' },
  { value: 'admin', label: '管理员' }
];

function getWorkspacePath(role) {
  if (!role) {
    return '';
  }

  if (role === 'hr') {
    return '/pages/hr/home/home';
  }

  if (role === 'operations') {
    return '/pages/operations/home/home';
  }

  if (role === 'finance') {
    return '/pages/finance/home/home';
  }

  if (role === 'trainer') {
    return '/pages/trainer/home/home';
  }

  if (isInterviewerRole(role) || role === 'admin') {
    return getWorkspacePathByRole(role);
  }

  return '';
}

function getRoleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || '';
}

function buildMiniProgramUser(admin) {
  return {
    userType: 'internal_employee',
    role: admin.role,
    username: admin.username,
    profile: {
      name: admin.name || admin.username,
      nickname: admin.name || admin.username,
      phone: admin.phone || ''
    },
    permissions: admin.permissions || {},
    status: admin.status || 'active'
  };
}

function isAnchorWorkspaceUser(user = {}) {
  const status = user?.candidateInfo?.status || '';
  return user?.role === 'anchor' || ['signed', 'training', 'active'].includes(status);
}

Page({
  data: {
    mode: 'login',
    loading: false,
    isLoggedIn: false,
    loggedUserType: '',
    sessionExpiryText: '',
    currentUserName: '',
    currentRoleLabel: '',
    selectedRole: '',
    selectedRoleLabel: '',
    roleOptions: ROLE_OPTIONS,
    roleIndex: -1,
    loginForm: {
      username: '',
      password: ''
    },
    registerForm: {
      username: '',
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      desiredRole: ''
    }
  },

  onShow() {
    this.syncLoginState();
  },

  onLoad(options = {}) {
    this._redirectUrl = decodeURIComponent(options.redirect || '');
    this._presetRole = options.role || '';
    if (this._presetRole) {
      this.applySelectedRole(this._presetRole);
    }
    this.maybePromptAnchorLogin();
  },

  async maybePromptAnchorLogin() {
    if (this._anchorPrompted || isAgentLoggedIn() || isAnchorWorkspaceUser(getCurrentUser() || {})) {
      return;
    }

    this._anchorPrompted = true;

    const hasLogin = await requireLogin({
      title: '进入工作台',
      content: '主播候选人可通过微信直接查看状态与工作台，员工可继续使用账号密码登录。',
      onCancel: () => {
        this._anchorPrompted = false;
      }
    });

    if (!hasLogin) {
      return;
    }

    try {
      wx.showLoading({ title: '识别身份中...' });
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });
      wx.hideLoading();

      const candidate = res.result?.candidate || null;
      const candidateId = candidate?.candidateNo || candidate?._id || '';
      if (candidateId) {
        wx.setStorageSync('myCandidateId', candidateId);
      }

      if (candidate && ['signed', 'training', 'active'].includes(candidate.status)) {
        updateLocalUser({
          userType: 'anchor',
          role: 'anchor',
          candidateInfo: {
            candidateId: candidate._id || '',
            candidateNo: candidate.candidateNo || '',
            status: candidate.status || ''
          }
        });
        wx.setStorageSync('currentRole', 'anchor');
      }

      this.syncLoginState();
    } catch (error) {
      wx.hideLoading();
      console.error('[员工入口] 识别主播身份失败:', error);
    }
  },

  syncLoginState() {
    const agentLoggedIn = isAgentLoggedIn();
    const agent = agentLoggedIn ? getAgentInfo() : null;
    const miniUser = getCurrentUser() || {};
    const anchorLoggedIn = Boolean(getCurrentOpenId()) && isAnchorWorkspaceUser(miniUser);
    const loggedIn = agentLoggedIn || anchorLoggedIn;
    const expiresAt = agentLoggedIn ? getAgentSessionExpiry() : 0;
    const roleLabel = agentLoggedIn
      ? (ROLE_OPTIONS.find((item) => item.value === agent?.role)?.label || '')
      : (anchorLoggedIn ? '主播' : '');
    const currentUserName = agentLoggedIn
      ? (agent?.name || agent?.username || '')
      : (miniUser?.profile?.name || miniUser?.profile?.nickname || miniUser?.candidateInfo?.candidateNo || '主播账号');

    this.setData({
      isLoggedIn: loggedIn,
      loggedUserType: agentLoggedIn ? 'employee' : (anchorLoggedIn ? 'anchor' : ''),
      currentUserName,
      currentRoleLabel: roleLabel,
      sessionExpiryText: agentLoggedIn && expiresAt
        ? `${this.formatSessionDuration(expiresAt)}内免登录`
        : (anchorLoggedIn ? '微信已登录，可直接进入主播工作台' : '')
    });
  },

  formatSessionDuration(expiresAt) {
    const remainMs = Math.max(expiresAt - Date.now(), 0);
    const remainMinutes = Math.max(Math.ceil(remainMs / 60000), 0);

    if (remainMinutes >= 24 * 60) {
      const days = Math.ceil(remainMinutes / (24 * 60));
      return `${days}天`;
    }

    if (remainMinutes >= 60) {
      const hours = Math.ceil(remainMinutes / 60);
      return `${hours}小时`;
    }

    return `${remainMinutes}分钟`;
  },

  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    if (!mode || mode === this.data.mode) {
      return;
    }

    this.setData({ mode });
  },

  onLoginInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`loginForm.${field}`]: e.detail.value
    });
  },

  onRegisterInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`registerForm.${field}`]: e.detail.value
    });
  },

  applySelectedRole(role) {
    const roleIndex = ROLE_OPTIONS.findIndex((item) => item.value === role);
    const roleLabel = ROLE_OPTIONS[roleIndex]?.label || '';
    if (roleIndex < 0) {
      return;
    }

    this.setData({
      selectedRole: role,
      selectedRoleLabel: roleLabel,
      roleIndex,
      'registerForm.desiredRole': role
    });
  },

  onSelectRole(e) {
    const { role } = e.currentTarget.dataset;
    if (!role || role === this.data.selectedRole) {
      return;
    }

    this.applySelectedRole(role);
  },

  ensureRoleSelected() {
    if (this.data.selectedRole) {
      return true;
    }

    wx.showToast({
      title: '请先选择岗位',
      icon: 'none'
    });
    return false;
  },

  async submitLogin() {
    const { username, password } = this.data.loginForm;
    const selectedRole = this.data.selectedRole;

    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }

    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'login',
          data: {
            username: username.trim(),
            password
          }
        }
      });

      const result = res.result || {};
      if (!result.success) {
        wx.showToast({
          title: result.error || '登录失败',
          icon: 'none'
        });
        return;
      }

      const admin = result.admin || {};
      if (selectedRole && admin.role !== selectedRole) {
        wx.showToast({
          title: `该账号不是${getRoleLabel(selectedRole) || '当前岗位'}账号`,
          icon: 'none'
        });
        return;
      }

      const targetPath = this._redirectUrl || getWorkspacePath(admin.role);
      if (!targetPath) {
        wx.showToast({
          title: '该角色暂未开通小程序登录工作台',
          icon: 'none'
        });
        return;
      }

      wx.setStorageSync('currentRole', admin.role);
      saveAgentSession(result.token || '', admin);
      wx.setStorageSync('user_info', buildMiniProgramUser(admin));

      this.syncLoginState();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      setTimeout(() => {
        const method = isInterviewerRole(admin.role) || admin.role === 'admin'
          ? 'redirectTo'
          : 'reLaunch';

        wx[method]({
          url: targetPath
        });
      }, 300);
    } catch (error) {
      console.error('[员工入口] 登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  enterWorkspace() {
    if (this.data.loggedUserType === 'anchor') {
      wx.reLaunch({
        url: '/pages/anchor/home/home'
      });
      return;
    }

    const agent = getAgentInfo();
    const targetPath = this._redirectUrl || getWorkspacePath(agent?.role);

    if (!agent || !targetPath) {
      this.syncLoginState();
      wx.showToast({
        title: '登录状态已失效，请重新登录',
        icon: 'none'
      });
      return;
    }

    const method = isInterviewerRole(agent.role) || agent.role === 'admin'
      ? 'redirectTo'
      : 'reLaunch';

    wx[method]({
      url: targetPath
    });
  },

  switchAccount() {
    if (this.data.loggedUserType === 'anchor') {
      logoutMiniUser();
      return;
    }

    agentLogout();
  },

  goToRegister() {
    if (!this.ensureRoleSelected()) return;
    this.setData({ mode: 'register' });
  },

  goToLogin() {
    if (!this.ensureRoleSelected()) return;
    this.setData({ mode: 'login' });
  },

  async submitRegister() {
    const form = this.data.registerForm;
    const username = form.username.trim();
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!username || !name || !phone || !form.password || !form.confirmPassword || !form.desiredRole) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      wx.showToast({ title: '用户名需为3-20位字母数字下划线', icon: 'none' });
      return;
    }

    if (!/^[\u4e00-\u9fa5a-zA-Z\s]{1,20}$/.test(name)) {
      wx.showToast({ title: '姓名格式不正确', icon: 'none' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    if (form.password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'applyUser',
          data: {
            username,
            name,
            phone,
            password: form.password,
            desiredRole: form.desiredRole
          }
        }
      });

      const result = res.result || {};
      if (!result.success) {
        wx.showToast({
          title: result.error || '注册申请失败',
          icon: 'none'
        });
        return;
      }

      wx.showModal({
        title: '申请已提交',
        content: '注册申请已提交，请等待管理员审核通过后再登录。',
        showCancel: false,
        success: () => {
          const nextRole = this.data.selectedRole || form.desiredRole || '';
          this.setData({
            mode: 'login',
            'loginForm.username': username,
            'loginForm.password': '',
            registerForm: {
              username: '',
              name: '',
              phone: '',
              password: '',
              confirmPassword: '',
              desiredRole: nextRole
            },
            roleIndex: ROLE_OPTIONS.findIndex((item) => item.value === nextRole)
          });
        }
      });
    } catch (error) {
      console.error('[员工入口] 注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
