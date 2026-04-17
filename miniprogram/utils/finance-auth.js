import { agentLogout, getAgentInfo, getAgentToken, isAgentLoggedIn } from './agent-auth.js';

const ALLOWED_FINANCE_ROLES = ['finance', 'admin', 'operations'];

export function getFinanceUserInfo() {
  const agent = getAgentInfo() || {};
  const displayName = agent.name || agent.username || '财务用户';
  const roleLabelMap = {
    finance: '财务专员',
    admin: '管理员',
    operations: '运营'
  };

  return {
    raw: agent,
    profile: {
      name: displayName,
      nickname: displayName,
      department: '财务中心',
      jobTitle: roleLabelMap[agent.role] || '财务工作台'
    }
  };
}

export function getFinanceToken() {
  return getAgentToken();
}

export function requireFinanceLogin(redirectUrl = '/pages/finance/home/home') {
  if (!isAgentLoggedIn()) {
    wx.redirectTo({
      url: `/pages/role-select/role-select?redirect=${encodeURIComponent(redirectUrl)}&role=finance`
    });
    return false;
  }

  const agent = getAgentInfo() || {};
  if (!ALLOWED_FINANCE_ROLES.includes(agent.role)) {
    wx.showToast({
      title: '请使用财务账号登录',
      icon: 'none'
    });
    setTimeout(() => {
      agentLogout();
    }, 1200);
    return false;
  }

  return true;
}
