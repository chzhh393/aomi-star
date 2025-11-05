# 页面结构完整规范

> 详细的页面开发指南和最佳实践

**关联**: [SKILL.md](./SKILL.md)
**版本**: 1.0.0
**更新日期**: 2025-11-05

---

## 📐 页面四大核心部分

### 1. 数据层（data）

```javascript
Page({
  data: {
    // === 用户相关 ===
    currentRole: '',          // 当前角色
    userId: '',               // 用户ID
    userInfo: null,          // 用户信息

    // === 页面状态 ===
    isLoading: true,         // 加载状态
    isRefreshing: false,     // 刷新状态
    hasMore: true,           // 是否还有更多数据

    // === 表单数据 ===
    formData: {
      name: '',
      phone: '',
      email: ''
    },
    formErrors: {},          // 表单错误信息

    // === 列表数据 ===
    dataList: [],            // 列表数据
    page: 1,                 // 当前页码
    pageSize: 20,            // 每页数量

    // === UI状态 ===
    activeTab: 0,            // 当前标签页
    showModal: false,        // 弹窗显示
    modalData: null,         // 弹窗数据

    // === 配置项 ===
    config: {
      autoRefresh: true,
      refreshInterval: 30000
    }
  }
});
```

**数据命名规范**：
- 布尔值：`is` 开头（`isLoading`、`isVisible`）
- 判断状态：`has` 开头（`hasMore`、`hasPermission`）
- 显示状态：`show` 开头（`showModal`、`showTips`）
- 当前值：`current` 开头（`currentRole`、`currentTab`）
- 配置项：单独分组到 `config` 对象

---

### 2. 生命周期层

#### onLoad - 页面加载（只执行一次）

**用途**：
- 接收并解析页面参数
- 初始化页面基础数据
- 设置页面标题
- 检查用户权限

```javascript
onLoad(options) {
  console.log('页面加载', options);

  // 1. 解析页面参数
  const { id, type, source } = options;
  this.setData({
    pageId: id,
    pageType: type,
    pageSource: source
  });

  // 2. 解析场景参数（如果有）
  if (options.scene) {
    this.parseSceneParams(options.scene);
  }

  // 3. 设置页面标题
  wx.setNavigationBarTitle({
    title: this.getPageTitle(type)
  });

  // 4. 检查用户权限
  this.checkUserPermission();

  // 5. 加载初始数据
  this.loadInitialData();
},

getPageTitle(type) {
  const titles = {
    'detail': '详情',
    'edit': '编辑',
    'create': '创建'
  };
  return titles[type] || '页面';
}
```

#### onShow - 页面显示（每次显示都执行）

**用途**：
- 刷新数据（从其他页面返回时）
- 恢复页面状态
- 重新获取角色信息（可能被修改）

```javascript
onShow() {
  console.log('页面显示');

  // 1. 刷新用户角色（可能在其他页面切换了）
  this.refreshUserRole();

  // 2. 刷新列表数据（如果需要）
  if (this.data.config.autoRefresh) {
    this.refreshData();
  }

  // 3. 恢复定时器（如果有）
  this.startAutoRefresh();
},

async refreshUserRole() {
  const roleManager = require('../../utils/role-manager');
  const currentRole = await roleManager.getCurrentRole();

  if (currentRole !== this.data.currentRole) {
    this.setData({ currentRole });
    // 角色变化，可能需要重新加载数据
    this.loadInitialData();
  }
}
```

#### onReady - 页面首次渲染完成（只执行一次）

**用途**：
- 获取节点信息
- 初始化动画
- 初始化图表
- 页面测量

```javascript
onReady() {
  console.log('页面渲染完成');

  // 1. 获取节点信息
  this.getElementBoundingRect();

  // 2. 初始化图表（如果有）
  this.initChart();

  // 3. 初始化动画
  this.initAnimation();
},

getElementBoundingRect() {
  const query = wx.createSelectorQuery();
  query.select('#container').boundingClientRect();
  query.exec((res) => {
    console.log('容器高度', res[0].height);
    this.setData({
      containerHeight: res[0].height
    });
  });
}
```

#### onHide - 页面隐藏

**用途**：
- 暂停定时器
- 暂停音视频播放
- 保存临时状态

```javascript
onHide() {
  console.log('页面隐藏');

  // 1. 停止定时器
  this.stopAutoRefresh();

  // 2. 暂停播放器（如果有）
  if (this.data.videoContext) {
    this.data.videoContext.pause();
  }

  // 3. 保存草稿（如果是表单页面）
  this.saveDraft();
}
```

#### onUnload - 页面卸载

**用途**：
- 清理定时器
- 清理监听器
- 释放资源

```javascript
onUnload() {
  console.log('页面卸载');

  // 1. 清理定时器
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }

  // 2. 清理资源
  this.cleanup();
}
```

#### onPullDownRefresh - 下拉刷新

```javascript
onPullDownRefresh() {
  console.log('下拉刷新');

  // 1. 重置分页
  this.setData({
    page: 1,
    dataList: [],
    hasMore: true
  });

  // 2. 加载数据
  this.loadData()
    .then(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    })
    .catch(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    });
}
```

**配置要求**：在页面的 `.json` 文件中启用
```json
{
  "enablePullDownRefresh": true,
  "backgroundColor": "#f8f8f8"
}
```

#### onReachBottom - 上拉加载更多

```javascript
onReachBottom() {
  console.log('触底加载');

  // 1. 检查是否还有更多数据
  if (!this.data.hasMore || this.data.isLoading) {
    return;
  }

  // 2. 加载下一页
  this.setData({
    page: this.data.page + 1
  });

  this.loadData();
}
```

**配置要求**：在页面的 `.json` 文件中配置
```json
{
  "onReachBottomDistance": 50
}
```

#### onShareAppMessage - 分享配置

```javascript
onShareAppMessage(options) {
  console.log('分享', options);

  // options.from: 'button' | 'menu'
  // options.target: 触发分享的组件（如果 from 是 'button'）

  return {
    title: '邀请你加入 Aomi Star',
    path: `/pages/index/index?inviteCode=${this.data.inviteCode}`,
    imageUrl: '/images/share-cover.png'
  };
}
```

**启用分享**：在页面的 `.json` 文件中配置
```json
{
  "navigationBarTitleText": "页面标题"
}
```

---

### 3. 交互方法层

#### 数据加载方法

```javascript
// 加载初始数据
async loadInitialData() {
  this.setData({ isLoading: true });

  try {
    await Promise.all([
      this.loadUserInfo(),
      this.loadCandidateList()
    ]);
  } catch (error) {
    console.error('数据加载失败', error);
    this.showError('数据加载失败，请重试');
  } finally {
    this.setData({ isLoading: false });
  }
},

// 加载列表数据（支持分页）
async loadData() {
  if (this.data.isLoading) return;

  this.setData({ isLoading: true });

  try {
    const result = await wx.cloud.callFunction({
      name: 'get-candidate-list',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize,
        status: this.data.filterStatus
      }
    });

    const newList = result.result.data;

    this.setData({
      dataList: this.data.page === 1
        ? newList
        : [...this.data.dataList, ...newList],
      hasMore: newList.length === this.data.pageSize,
      isLoading: false
    });
  } catch (error) {
    console.error('加载数据失败', error);
    this.setData({ isLoading: false });
    this.showError('加载失败');
  }
}
```

#### 表单处理方法

```javascript
// 表单输入处理
handleInput(e) {
  const { field } = e.currentTarget.dataset;
  const { value } = e.detail;

  this.setData({
    [`formData.${field}`]: value,
    [`formErrors.${field}`]: ''  // 清除错误
  });
},

// 表单验证
validateForm(formData) {
  const errors = {};

  // 姓名验证
  if (!formData.name || formData.name.trim() === '') {
    errors.name = '请输入姓名';
  }

  // 手机号验证
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!formData.phone) {
    errors.phone = '请输入手机号';
  } else if (!phoneRegex.test(formData.phone)) {
    errors.phone = '手机号格式不正确';
  }

  // 邮箱验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (formData.email && !emailRegex.test(formData.email)) {
    errors.email = '邮箱格式不正确';
  }

  return errors;
},

// 表单提交
async handleSubmit(e) {
  const formData = e.detail.value;

  // 1. 表单验证
  const errors = this.validateForm(formData);
  if (Object.keys(errors).length > 0) {
    this.setData({ formErrors: errors });
    const firstError = Object.values(errors)[0];
    wx.showToast({
      title: firstError,
      icon: 'none'
    });
    return;
  }

  // 2. 确认提交
  const confirmed = await this.showConfirm('确认提交吗？');
  if (!confirmed) return;

  // 3. 提交数据
  wx.showLoading({ title: '提交中...' });

  try {
    const result = await wx.cloud.callFunction({
      name: 'submit-form',
      data: formData
    });

    wx.hideLoading();

    if (result.result.success) {
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } else {
      wx.showToast({
        title: result.result.message || '提交失败',
        icon: 'none'
      });
    }
  } catch (error) {
    wx.hideLoading();
    console.error('提交失败', error);
    this.showError('网络错误，请重试');
  }
}
```

#### 导航跳转方法

```javascript
// 跳转到详情页
navigateToDetail(e) {
  const { id } = e.currentTarget.dataset;
  wx.navigateTo({
    url: `/pages/candidate/detail/detail?id=${id}`
  });
},

// 跳转到编辑页
navigateToEdit(e) {
  const { id } = e.currentTarget.dataset;
  wx.navigateTo({
    url: `/pages/candidate/edit/edit?id=${id}`
  });
},

// 返回上一页
navigateBack() {
  wx.navigateBack();
},

// 返回首页
navigateToHome() {
  wx.switchTab({
    url: '/pages/index/index'
  });
}
```

#### 工具方法

```javascript
// 显示确认对话框
showConfirm(message, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: message,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
},

// 显示错误提示
showError(message) {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
},

// 显示成功提示
showSuccess(message) {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 1500
  });
},

// 日期格式化
formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
},

// 手机号脱敏
maskPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
```

---

### 4. 辅助功能层

#### 权限检查

```javascript
async checkUserPermission() {
  try {
    const roleManager = require('../../utils/role-manager');
    const currentRole = await roleManager.getCurrentRole();

    // 定义页面允许的角色
    const allowedRoles = ['hr', 'admin', 'operations'];

    if (!allowedRoles.includes(currentRole)) {
      wx.showModal({
        title: '无权限',
        content: '您没有权限访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }

    this.setData({ currentRole });
    return true;
  } catch (error) {
    console.error('权限检查失败', error);
    return false;
  }
}
```

#### 定时刷新

```javascript
// 开始自动刷新
startAutoRefresh() {
  if (!this.data.config.autoRefresh) return;

  this.timer = setInterval(() => {
    this.refreshData();
  }, this.data.config.refreshInterval);
},

// 停止自动刷新
stopAutoRefresh() {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
},

// 刷新数据
async refreshData() {
  this.setData({
    page: 1,
    dataList: []
  });
  await this.loadData();
}
```

#### 草稿保存

```javascript
// 保存草稿
saveDraft() {
  const draft = {
    formData: this.data.formData,
    timestamp: Date.now()
  };

  wx.setStorageSync('form_draft', draft);
  console.log('草稿已保存');
},

// 恢复草稿
restoreDraft() {
  try {
    const draft = wx.getStorageSync('form_draft');
    if (draft) {
      // 检查草稿是否过期（24小时）
      const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000;
      if (!isExpired) {
        this.setData({
          formData: draft.formData
        });
        wx.showToast({
          title: '已恢复草稿',
          icon: 'none'
        });
      }
    }
  } catch (error) {
    console.error('恢复草稿失败', error);
  }
},

// 清除草稿
clearDraft() {
  wx.removeStorageSync('form_draft');
}
```

---

## 🎨 完整页面示例

### 候选人列表页

```javascript
// pages/hr/candidates/candidates.js
const roleManager = require('../../../utils/role-manager');

Page({
  // 1. 数据定义
  data: {
    // 用户相关
    currentRole: '',

    // 页面状态
    isLoading: true,
    isRefreshing: false,
    hasMore: true,

    // 列表数据
    candidateList: [],
    page: 1,
    pageSize: 20,

    // 筛选条件
    filterStatus: 'all',
    statusTabs: [
      { value: 'all', label: '全部' },
      { value: 'pending', label: '待审核' },
      { value: 'approved', label: '已通过' },
      { value: 'rejected', label: '已拒绝' }
    ],

    // 配置
    config: {
      autoRefresh: true,
      refreshInterval: 60000  // 1分钟
    }
  },

  // 2. 生命周期
  onLoad(options) {
    console.log('页面加载', options);
    this.checkUserPermission();
    this.loadInitialData();
  },

  onShow() {
    this.refreshUserRole();
    if (this.data.config.autoRefresh) {
      this.startAutoRefresh();
    }
  },

  onHide() {
    this.stopAutoRefresh();
  },

  onUnload() {
    this.stopAutoRefresh();
  },

  onPullDownRefresh() {
    this.refreshData()
      .then(() => {
        wx.stopPullDownRefresh();
        this.showSuccess('刷新成功');
      })
      .catch(() => {
        wx.stopPullDownRefresh();
        this.showError('刷新失败');
      });
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.isLoading) {
      return;
    }
    this.setData({ page: this.data.page + 1 });
    this.loadData();
  },

  // 3. 交互方法
  // --- 数据加载 ---
  async loadInitialData() {
    this.setData({ isLoading: true });
    try {
      await this.loadData();
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async loadData() {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'get-candidate-list',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize,
          status: this.data.filterStatus
        }
      });

      const newList = result.result.data;

      this.setData({
        candidateList: this.data.page === 1
          ? newList
          : [...this.data.candidateList, ...newList],
        hasMore: newList.length === this.data.pageSize,
        isLoading: false
      });
    } catch (error) {
      console.error('加载数据失败', error);
      this.setData({ isLoading: false });
      this.showError('加载失败');
    }
  },

  async refreshData() {
    this.setData({
      page: 1,
      candidateList: []
    });
    await this.loadData();
  },

  // --- 筛选 ---
  handleFilterChange(e) {
    const { status } = e.currentTarget.dataset;
    this.setData({
      filterStatus: status,
      page: 1,
      candidateList: []
    });
    this.loadData();
  },

  // --- 导航 ---
  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/candidate/detail/detail?id=${id}`
    });
  },

  // --- 权限检查 ---
  async checkUserPermission() {
    const currentRole = await roleManager.getCurrentRole();
    const allowedRoles = ['hr', 'admin'];

    if (!allowedRoles.includes(currentRole)) {
      wx.showModal({
        title: '无权限',
        content: '您没有权限访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }

    this.setData({ currentRole });
  },

  async refreshUserRole() {
    const currentRole = await roleManager.getCurrentRole();
    if (currentRole !== this.data.currentRole) {
      this.setData({ currentRole });
      this.refreshData();
    }
  },

  // --- 定时刷新 ---
  startAutoRefresh() {
    this.timer = setInterval(() => {
      this.refreshData();
    }, this.data.config.refreshInterval);
  },

  stopAutoRefresh() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // --- 工具方法 ---
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },

  showSuccess(message) {
    wx.showToast({
      title: message,
      icon: 'success'
    });
  }
});
```

---

## ⚡ 性能优化建议

### 1. setData 优化

```javascript
// ❌ 错误：频繁 setData
for (let i = 0; i < 100; i++) {
  this.setData({
    [`list[${i}]`]: data[i]
  });
}

// ✅ 正确：批量 setData
const updates = {};
for (let i = 0; i < 100; i++) {
  updates[`list[${i}]`] = data[i];
}
this.setData(updates);

// ✅ 更好：直接替换整个数组
this.setData({
  list: data
});
```

### 2. 长列表优化

使用虚拟列表或分页加载，避免一次性渲染过多数据。

### 3. 图片优化

```javascript
// 使用懒加载
<image lazy-load="{{true}}" src="{{imageUrl}}" />

// 使用 webp 格式
const imageUrl = `${baseUrl}?x-oss-process=image/format,webp`;
```

### 4. 避免不必要的渲染

```wxml
<!-- 使用 wx:if 代替 hidden（对于不常切换的元素） -->
<view wx:if="{{showDetail}}">详情内容</view>

<!-- 使用 hidden 代替 wx:if（对于频繁切换的元素） -->
<view hidden="{{!showTips}}">提示信息</view>
```

---

**最后更新**: 2025-11-05
**维护者**: 开发团队
