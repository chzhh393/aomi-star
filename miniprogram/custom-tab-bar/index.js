// custom-tab-bar/index.js
const app = getApp();

// 不同角色的TabBar配置
const tabBarConfig = {
  anchor: {
    color: '#666666',
    selectedColor: '#13E8DD',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: '/pages/anchor/home/home',
        text: '工作台',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/anchor/schedule/schedule',
        text: '排班',
        iconPath: '/images/tabbar/schedule.png',
        selectedIconPath: '/images/tabbar/schedule-active.png'
      },
      {
        pagePath: '/pages/anchor/training/training',
        text: '培训',
        iconPath: '/images/tabbar/training.png',
        selectedIconPath: '/images/tabbar/training-active.png'
      },
      {
        pagePath: '/pages/anchor/profile/profile',
        text: '我的',
        iconPath: '/images/tabbar/profile.png',
        selectedIconPath: '/images/tabbar/profile-active.png'
      }
    ]
  },
  hr: {
    color: '#666666',
    selectedColor: '#F8D55D',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: '/pages/hr/home/home',
        text: '工作台',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/hr/candidates/candidates',
        text: '候选人',
        iconPath: '/images/tabbar/candidates.png',
        selectedIconPath: '/images/tabbar/candidates-active.png'
      },
      {
        pagePath: '/pages/hr/interview/interview',
        text: '面试',
        iconPath: '/images/tabbar/interview.png',
        selectedIconPath: '/images/tabbar/interview-active.png'
      },
      {
        pagePath: '/pages/hr/profile/profile',
        text: '我的',
        iconPath: '/images/tabbar/profile.png',
        selectedIconPath: '/images/tabbar/profile-active.png'
      }
    ]
  },
  agent: {
    color: '#666666',
    selectedColor: '#13E8DD',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: '/pages/agent/home/home',
        text: '工作台',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/agent/my-anchors/my-anchors',
        text: '我的主播',
        iconPath: '/images/tabbar/anchors.png',
        selectedIconPath: '/images/tabbar/anchors-active.png'
      },
      {
        pagePath: '/pages/agent/profile/profile',
        text: '我的',
        iconPath: '/images/tabbar/profile.png',
        selectedIconPath: '/images/tabbar/profile-active.png'
      }
    ]
  }
};

Component({
  data: {
    selected: 0,
    color: '#666666',
    selectedColor: '#13E8DD',
    list: []
  },

  attached() {
    this.updateTabBar();
  },

  methods: {
    updateTabBar() {
      const currentRole = wx.getStorageSync('currentRole') || 'anchor';
      const config = tabBarConfig[currentRole];

      if (config) {
        this.setData({
          list: config.list,
          color: config.color,
          selectedColor: config.selectedColor
        });
      }

      // 设置当前选中的tab
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentPath = '/' + currentPage.route;

      const selected = config.list.findIndex(item => item.pagePath === currentPath);
      this.setData({
        selected: selected >= 0 ? selected : 0
      });
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = e.currentTarget.dataset.path;

      wx.switchTab({
        url: path
      });

      this.setData({
        selected: index
      });
    }
  }
});
