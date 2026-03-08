// pages/role-select/role-select.js
const app = getApp();

Page({
  data: {
    roles: [
      {
        id: 'anchor',
        name: '主播端',
        icon: '🎬',
        desc: '查看工作台、排班、收益等',
        color: '#13E8DD',
        homePath: '/pages/anchor/home/home'
      },
      {
        id: 'agent',
        name: '经纪人',
        icon: '⭐',
        desc: '面试打分、资料上传、候选人管理',
        color: '#FFD700',
        homePath: '/pages/agent/login/login'
      },
      {
        id: 'hr',
        name: 'HR招聘',
        icon: '👔',
        desc: '候选人管理、面试安排',
        color: '#4A90E2',
        homePath: '/pages/hr/home/home'
      },
      {
        id: 'operations',
        name: '运营管理',
        icon: '📊',
        desc: '内容策划、数据分析、活动运营',
        color: '#9B59B6',
        homePath: '/pages/operations/home/home'
      },
      {
        id: 'dance-teacher',
        name: '舞蹈老师',
        icon: '💃',
        desc: '舞蹈培训、才艺评估',
        color: '#E74C3C',
        homePath: '/pages/dance-teacher/home/home'
      },
      {
        id: 'photographer',
        name: '摄影师',
        icon: '📸',
        desc: '形象拍摄、物料制作',
        color: '#3498DB',
        homePath: '/pages/photographer/home/home'
      },
      {
        id: 'makeup-artist',
        name: '化妆师',
        icon: '💄',
        desc: '妆容造型、形象设计',
        color: '#E91E63',
        homePath: '/pages/makeup-artist/home/home'
      },
      {
        id: 'stylist',
        name: '造型师',
        icon: '👗',
        desc: '服装搭配、整体造型',
        color: '#FF9800',
        homePath: '/pages/stylist/home/home'
      },
      {
        id: 'admin',
        name: '系统管理',
        icon: '⚙️',
        desc: '权限管理、系统配置',
        color: '#607D8B',
        homePath: '/pages/admin/home/home'
      }
    ]
  },

  onLoad() {
    // 检查是否已有保存的角色
    const savedRole = wx.getStorageSync('currentRole');
    if (savedRole) {
      console.log('已保存角色：', savedRole);
    }
  },

  selectRole(e) {
    const { role } = e.currentTarget.dataset;
    const selectedRole = this.data.roles.find(r => r.id === role);

    if (!selectedRole) return;

    // 保存当前选择的角色
    wx.setStorageSync('currentRole', selectedRole.id);

    // 跳转到对应页面
    if (selectedRole.homePath) {
      wx.redirectTo({
        url: selectedRole.homePath,
        fail: () => {
          wx.showModal({
            title: '提示',
            content: '该功能暂未开放',
            showCancel: false,
            confirmText: '我知道了'
          });
        }
      });
    } else {
      wx.showModal({
        title: '提示',
        content: '该功能正在开发中',
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  }
});
