/**
 * 测试登录页面
 * 快速切换测试账号
 */

import { ROLE, getRoleDisplayName, getRoleHomePage } from '../../mock/users.js';

Page({
  data: {
    currentUser: null,
    testAccounts: [
      {
        id: 'HR001',
        role: ROLE.HR,
        emoji: '👔',
        label: 'HR',
        userType: 'internal_employee',
        profile: {
          name: 'HR001',
          phone: '138****2001',
          department: '人力资源部',
          jobTitle: '招聘专员'
        }
      },
      {
        id: 'PH001',
        role: ROLE.PHOTOGRAPHER,
        emoji: '📸',
        label: '摄像师',
        userType: 'internal_employee',
        profile: {
          name: '王摄影',
          nickname: '王老师',
          phone: '138****1001',
          department: '制作部',
          jobTitle: '摄像师'
        }
      },
      {
        id: 'DT001',
        role: ROLE.DANCE_TEACHER,
        emoji: '💃',
        label: '舞蹈导师',
        userType: 'internal_employee',
        profile: {
          name: '刘舞蹈',
          nickname: '刘老师',
          phone: '138****1002',
          department: '培训部',
          jobTitle: '舞蹈导师'
        }
      },
      {
        id: 'MC001',
        role: ROLE.HOST_MC,
        emoji: '🎤',
        label: '主持/MC',
        userType: 'internal_employee',
        profile: {
          name: '周主持',
          nickname: '周MC',
          phone: '138****1005',
          department: '主持部',
          jobTitle: '主持/MC'
        }
      },
      {
        id: 'MA001',
        role: ROLE.MAKEUP_ARTIST,
        emoji: '💄',
        label: '化妆师',
        userType: 'internal_employee',
        profile: {
          name: '陈化妆',
          nickname: '陈老师',
          phone: '138****1003',
          department: '制作部',
          jobTitle: '化妆师'
        }
      },
      {
        id: 'ST001',
        role: ROLE.STYLIST,
        emoji: '✨',
        label: '造型师',
        userType: 'internal_employee',
        profile: {
          name: '林造型',
          nickname: '林老师',
          phone: '138****1004',
          department: '制作部',
          jobTitle: '造型师'
        }
      },
      {
        id: 'AG001',
        role: ROLE.AGENT,
        emoji: '🤝',
        label: '经纪人',
        userType: 'internal_employee',
        profile: {
          name: '经纪人A',
          phone: '138****3001',
          department: '艺人部',
          jobTitle: '经纪人'
        }
      },
      {
        id: 'ADM001',
        role: ROLE.ADMIN,
        emoji: '⚙️',
        label: '管理员',
        userType: 'internal_employee',
        profile: {
          name: '系统管理员',
          phone: '138****0000',
          department: '管理部',
          jobTitle: '系统管理员'
        }
      },
      {
        id: 'OP001',
        role: ROLE.OPERATIONS,
        emoji: '⚙️',
        label: '运营',
        userType: 'internal_employee',
        profile: {
          name: '运营A',
          phone: '138****4001',
          department: '运营部',
          jobTitle: '运营专员'
        }
      },
      {
        id: 'FIN001',
        role: ROLE.FINANCE,
        emoji: '💰',
        label: '财务',
        userType: 'internal_employee',
        profile: {
          name: '财务A',
          phone: '138****5001',
          department: '财务部',
          jobTitle: '财务专员'
        }
      },
      {
        id: 'CAN001',
        role: ROLE.CANDIDATE,
        emoji: '👤',
        label: '候选人',
        userType: 'candidate',
        profile: {
          name: '测试候选人',
          phone: '138****0001'
        }
      }
    ]
  },

  onLoad() {
    this.loadCurrentUser();
  },

  onShow() {
    this.loadCurrentUser();
  },

  /**
   * 加载当前登录用户
   */
  loadCurrentUser() {
    const userInfo = wx.getStorageSync('user_info');

    if (userInfo) {
      const roleLabel = getRoleDisplayName(userInfo.role);
      this.setData({
        currentUser: {
          ...userInfo,
          roleLabel
        }
      });
    }
  },

  /**
   * 切换账号
   */
  onSwitchAccount(e) {
    const account = e.currentTarget.dataset.account;

    wx.showLoading({
      title: '切换中...'
    });

    // 构建用户信息对象
    const userInfo = {
      id: account.id,
      openId: `mock_${account.role}_${account.id}`,
      userType: account.userType,
      role: account.role,
      profile: account.profile
    };

    // 保存到Storage
    wx.setStorageSync('user_info', userInfo);
    wx.setStorageSync('openId', userInfo.openId);

    // 更新页面显示
    const roleLabel = getRoleDisplayName(account.role);
    this.setData({
      currentUser: {
        ...userInfo,
        roleLabel
      }
    });

    wx.hideLoading();

    // 提示切换成功
    wx.showToast({
      title: `已切换为${roleLabel}`,
      icon: 'success',
      duration: 1500
    });

    // 1.5秒后跳转到对应工作台
    setTimeout(() => {
      const homePage = getRoleHomePage(account.role);

      wx.reLaunch({
        url: homePage
      });
    }, 1500);

    console.log('[测试登录] 切换账号:', {
      id: account.id,
      role: account.role,
      roleLabel
    });
  },

  /**
   * 重置测试数据
   */
  onResetData() {
    wx.showModal({
      title: '确认重置',
      content: '这将清空所有本地数据并重新加载测试数据，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '重置中...'
          });

          // 清空所有Storage
          wx.clearStorageSync();

          wx.hideLoading();

          wx.showToast({
            title: '重置成功',
            icon: 'success'
          });

          // 重新加载页面
          setTimeout(() => {
            this.setData({
              currentUser: null
            });
          }, 1500);

          console.log('[测试登录] 测试数据已重置');
        }
      }
    });
  },

  /**
   * 查看测试数据
   */
  onViewTestData() {
    wx.showModal({
      title: '测试数据说明',
      content: '系统已准备6个不同阶段的测试候选人：\n\n' +
               '• C20250102001 - 待审核\n' +
               '• C20250102002 - 已安排面试\n' +
               '• C20250102003 - 已完成测试\n' +
               '• C20250102004 - 待评分\n' +
               '• C20250102005 - 已评级\n' +
               '• C20250102006 - 已签约\n\n' +
               '详细信息请查看 mock/test-data.js',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 前往招聘首页
   */
  onGoRecruitPage() {
    wx.reLaunch({
      url: '/pages/recruit/index/index'
    });
  },

  /**
   * 返回首页
   */
  onGoHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
