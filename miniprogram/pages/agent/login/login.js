/**
 * 经纪人登录页
 */

import { agentLogin, getAgentInfo, isAgentLoggedIn } from '../../../utils/agent-auth.js';
import { getInterviewerRoleConfig, getWorkspacePathByRole, isInterviewerRole } from '../../../utils/interviewer.js';

Page({
  data: {
    username: '',
    password: '',
    showPassword: false,
    loading: false,
    role: 'agent',
    roleConfig: getInterviewerRoleConfig('agent')
  },

  onLoad(options) {
    const role = isInterviewerRole(options?.role) ? options.role : 'agent';
    const roleConfig = getInterviewerRoleConfig(role);
    this.setData({ role, roleConfig });

    // 检查是否已登录
    if (isAgentLoggedIn()) {
      const agentInfo = getAgentInfo();
      if (agentInfo?.role === role) {
        wx.redirectTo({
          url: getWorkspacePathByRole(role)
        });
        return;
      }
    }

    // 保存重定向URL（如果有）
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect);
    }
  },

  /**
   * 用户名输入
   */
  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  /**
   * 密码输入
   */
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  /**
   * 切换密码显示
   */
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  /**
   * 处理登录
   */
  async handleLogin() {
    const { username, password } = this.data;

    // 1. 参数校验
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    // 2. 执行登录
    this.setData({ loading: true });

    try {
      const result = await agentLogin(username, password);

      if (result.success) {
        console.log('[员工登录] 登录成功:', result.agent);

        if (result.agent.role !== this.data.role) {
          wx.removeStorageSync('agent_token');
          wx.removeStorageSync('agent_info');
          wx.showToast({
            title: `请使用${this.data.roleConfig.name}账号登录`,
            icon: 'none'
          });
          return;
        }

        // 显示欢迎信息
        wx.showToast({
          title: `欢迎，${result.agent.name || result.agent.username}`,
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转到主页或重定向页面
        setTimeout(() => {
          const url = this.redirectUrl || getWorkspacePathByRole(result.agent.role);
          wx.redirectTo({ url });
        }, 1500);
      }
    } catch (error) {
      console.error('[经纪人登录] 登录失败:', error);
      // 错误提示已在 agentLogin 函数中处理
    } finally {
      this.setData({ loading: false });
    }
  }
});
