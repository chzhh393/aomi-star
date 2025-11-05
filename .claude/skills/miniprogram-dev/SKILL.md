# 微信小程序开发规范 Skill

> 专为 Aomi Star 多角色直播管理小程序优化的开发规范

**Skill ID**: `miniprogram-dev`
**版本**: 1.0.0
**创建日期**: 2025-11-05
**适用范围**: 微信小程序页面、组件、云函数开发

---

## 🎯 Skill 自动激活规则

当检测到以下关键词或场景时，自动激活此 Skill：

### 触发关键词
- "创建页面"、"新增页面"、"开发页面"
- "创建组件"、"新增组件"
- "云函数"、"cloud function"
- "TabBar"、"自定义导航"
- "角色切换"、"角色管理"
- "场景参数"、"scene"
- "候选人"、"主播"、"HR"、"经纪人"（任何角色名）

### 文件路径触发
- `miniprogram/pages/**/*.js`
- `miniprogram/components/**/*.js`
- `miniprogram/custom-tab-bar/**/*`
- `cloudfunctions/**/*`
- `miniprogram/utils/role-manager.js`
- `miniprogram/utils/scene-parser.js`

### 场景触发
- 用户要求创建新的角色工作台
- 需要修改登录流程
- 需要处理微信授权
- 需要操作云数据库

---

## 📚 核心开发原则

### 1. 项目特定约定

**多角色统一入口系统**：
- 所有用户通过同一个小程序进入
- 根据角色显示不同的工作台（使用 CustomTabBar）
- 页面路由需要考虑角色权限
- 严格的数据隔离（不同角色看到不同数据）

**关键技术特性**：
- ✅ 基于微信云开发（不需要自建后端服务器）
- ✅ 使用微信授权免登录
- ✅ 场景参数识别（推荐码、邀请码等）
- ✅ 角色动态切换（一个用户可以有多个角色）

### 2. 文件组织规范

#### 页面组织（按角色划分）
```
miniprogram/pages/
├── index/              # 登录和首页
│   ├── index.js
│   ├── index.json
│   ├── index.wxml
│   └── index.wxss
│
├── candidate/          # 候选人工作台
│   ├── dashboard/      # 候选人首页
│   ├── register/       # 报名页面
│   └── interview/      # 面试安排
│
├── anchor/             # 主播工作台
│   ├── dashboard/
│   ├── schedule/       # 排班
│   └── training/       # 培训
│
├── hr/                 # HR工作台
│   ├── dashboard/
│   ├── candidates/     # 候选人管理
│   └── interviews/     # 面试管理
│
└── [other-roles]/      # 其他角色工作台
```

#### 组件组织
```
miniprogram/components/
├── common/             # 通用组件
│   ├── avatar/
│   ├── button/
│   └── form-item/
│
├── candidate/          # 候选人专用组件
├── anchor/             # 主播专用组件
└── employee/           # 员工专用组件
```

#### 工具函数组织
```
miniprogram/utils/
├── role-manager.js     # 角色管理（核心）
├── scene-parser.js     # 场景参数解析（核心）
├── auth.js             # 认证相关
├── storage.js          # 存储封装
├── request.js          # 请求封装
└── validators.js       # 表单验证
```

### 3. 命名约定

**页面和组件**：小写字母 + 连字符
```javascript
// ✅ 正确
miniprogram/pages/candidate/register-info/register-info.js
miniprogram/components/common/user-card/user-card.js

// ❌ 错误
miniprogram/pages/candidate/RegisterInfo/RegisterInfo.js
miniprogram/components/common/UserCard/UserCard.js
```

**JS 文件**：小写驼峰
```javascript
// ✅ 正确
roleManager.js
sceneParser.js
userProfile.js

// ❌ 错误
role-manager.js
scene_parser.js
UserProfile.js
```

**云函数**：小写字母 + 连字符
```javascript
// ✅ 正确
cloudfunctions/get-user-info/
cloudfunctions/verify-invite-code/

// ❌ 错误
cloudfunctions/getUserInfo/
cloudfunctions/verify_invite_code/
```

---

## 🏗️ 页面开发标准

### 页面生命周期顺序

```javascript
Page({
  // 1. 数据定义
  data: {
    userRole: '',
    userData: null,
    isLoading: true
  },

  // 2. 生命周期函数（按调用顺序）
  onLoad(options) {
    // 页面加载时：解析参数、初始化数据
    this.parseSceneParams(options);
    this.initPageData();
  },

  onShow() {
    // 页面显示时：刷新数据、恢复状态
    this.refreshData();
  },

  onReady() {
    // 页面渲染完成：初始化图表、动画等
  },

  onHide() {
    // 页面隐藏：保存状态
  },

  onUnload() {
    // 页面卸载：清理资源
  },

  onPullDownRefresh() {
    // 下拉刷新
  },

  onReachBottom() {
    // 上拉加载更多
  },

  onShareAppMessage() {
    // 分享配置
  },

  // 3. 页面交互方法（按功能分组，组内按字母序）
  // --- 数据加载 ---
  async loadUserData() {},
  async loadCandidateList() {},

  // --- 表单处理 ---
  handleSubmit() {},
  validateForm() {},

  // --- 导航跳转 ---
  navigateToDetail() {},
  navigateBack() {},

  // --- 工具方法 ---
  formatDate() {},
  showToast() {}
});
```

### 必备功能模板

#### 1. 角色检查（所有页面必须）
```javascript
Page({
  onLoad() {
    this.checkUserRole();
  },

  async checkUserRole() {
    try {
      const roleManager = require('../../utils/role-manager');
      const currentRole = await roleManager.getCurrentRole();

      // 检查当前角色是否有权限访问此页面
      const allowedRoles = ['hr', 'admin']; // 页面允许的角色
      if (!allowedRoles.includes(currentRole)) {
        wx.showToast({
          title: '无权限访问',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      this.setData({
        currentRole: currentRole
      });
    } catch (error) {
      console.error('角色检查失败', error);
    }
  }
});
```

#### 2. 场景参数解析（首页/登录页）
```javascript
Page({
  onLoad(options) {
    this.parseSceneParams(options);
  },

  parseSceneParams(options) {
    const sceneParser = require('../../utils/scene-parser');
    const params = sceneParser.parse(options.scene || options.q);

    // params 包含：
    // - type: 'invite' | 'referral' | 'direct'
    // - code: 邀请码或推荐码
    // - source: 来源信息

    this.setData({
      sceneType: params.type,
      inviteCode: params.code
    });

    // 根据场景类型处理
    if (params.type === 'invite') {
      this.handleInviteCode(params.code);
    } else if (params.type === 'referral') {
      this.handleReferralCode(params.code);
    }
  }
});
```

#### 3. 云函数调用标准模板
```javascript
async callCloudFunction() {
  try {
    wx.showLoading({ title: '加载中...' });

    const result = await wx.cloud.callFunction({
      name: 'get-user-info',
      data: {
        userId: this.data.userId
      }
    });

    wx.hideLoading();

    if (result.result.success) {
      this.setData({
        userData: result.result.data
      });
    } else {
      wx.showToast({
        title: result.result.message || '操作失败',
        icon: 'none'
      });
    }
  } catch (error) {
    wx.hideLoading();
    console.error('云函数调用失败', error);
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
}
```

#### 4. 表单提交标准流程
```javascript
async handleFormSubmit(e) {
  const formData = e.detail.value;

  // 1. 表单验证
  const errors = this.validateForm(formData);
  if (errors.length > 0) {
    wx.showToast({
      title: errors[0],
      icon: 'none'
    });
    return;
  }

  // 2. 确认弹窗（可选）
  const confirmed = await this.showConfirmDialog('确认提交？');
  if (!confirmed) return;

  // 3. 提交数据
  try {
    wx.showLoading({ title: '提交中...' });

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
      // 返回上一页或跳转
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
    wx.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    });
  }
},

// 辅助方法
showConfirmDialog(message) {
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: message,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
}
```

### 详细规范请参考
- [页面结构完整规范](./page-structure.md) - 页面四大部分详解、错误处理、状态管理
- [生命周期最佳实践](./lifecycle-best-practices.md) - 各生命周期详细使用场景和注意事项

---

## 🧩 组件开发标准

### 组件定义模板

```javascript
Component({
  // 1. 组件配置
  options: {
    multipleSlots: true,      // 支持多个 slot
    addGlobalClass: true       // 接受全局样式
  },

  // 2. 组件属性
  properties: {
    title: {
      type: String,
      value: '',
      observer: function(newVal, oldVal) {
        // 属性变化监听
      }
    },
    userRole: {
      type: String,
      value: 'candidate'
    },
    showAction: {
      type: Boolean,
      value: true
    }
  },

  // 3. 组件数据
  data: {
    internalState: ''
  },

  // 4. 生命周期
  lifetimes: {
    created() {
      // 组件实例刚被创建
    },
    attached() {
      // 组件实例进入页面节点树
      this.initComponent();
    },
    ready() {
      // 组件布局完成
    },
    detached() {
      // 组件实例从页面节点树移除
    }
  },

  // 5. 页面生命周期
  pageLifetimes: {
    show() {
      // 页面显示时
    },
    hide() {
      // 页面隐藏时
    }
  },

  // 6. 组件方法
  methods: {
    // --- 初始化方法 ---
    initComponent() {},

    // --- 事件处理 ---
    handleTap(e) {
      // 触发父组件事件
      this.triggerEvent('tap', {
        detail: 'data'
      });
    },

    // --- 公共方法（供父组件调用）---
    publicMethod() {}
  }
});
```

### 组件与页面通信

```javascript
// 子组件触发事件
Component({
  methods: {
    handleAction() {
      this.triggerEvent('action', {
        type: 'submit',
        data: this.data.formData
      });
    }
  }
});

// 父页面监听事件
Page({
  onLoad() {},

  handleAction(e) {
    const { type, data } = e.detail;
    console.log('收到组件事件', type, data);
  }
});

// WXML 绑定
// <custom-component bind:action="handleAction" />
```

### 详细规范请参考
- [组件开发指南](./component-guide.md) - 组件设计原则、通信模式、复用策略

---

## ☁️ 云函数开发标准

### 云函数基本结构

```javascript
// cloudfunctions/[function-name]/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 1. 参数验证
    if (!action) {
      return {
        success: false,
        message: '缺少 action 参数'
      };
    }

    // 2. 权限检查
    const hasPermission = await checkPermission(wxContext.OPENID, action);
    if (!hasPermission) {
      return {
        success: false,
        message: '无操作权限'
      };
    }

    // 3. 根据 action 执行不同操作
    let result;
    switch (action) {
      case 'get':
        result = await getData(data);
        break;
      case 'create':
        result = await createData(data);
        break;
      case 'update':
        result = await updateData(data);
        break;
      case 'delete':
        result = await deleteData(data);
        break;
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('云函数执行错误', error);
    return {
      success: false,
      message: error.message || '服务器错误'
    };
  }
};

// 业务逻辑函数
async function getData(params) {
  // 实现数据查询
}

async function createData(params) {
  // 实现数据创建
}

async function checkPermission(openid, action) {
  // 实现权限检查
  return true;
}
```

### 云数据库操作模板

```javascript
// 1. 查询单条数据
async function getUserInfo(userId) {
  const result = await db.collection('users')
    .doc(userId)
    .get();

  return result.data;
}

// 2. 条件查询
async function getCandidatesByStatus(status) {
  const result = await db.collection('users')
    .where({
      role: 'candidate',
      status: status
    })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return result.data;
}

// 3. 创建数据
async function createUser(userData) {
  const result = await db.collection('users')
    .add({
      data: {
        ...userData,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

  return result._id;
}

// 4. 更新数据
async function updateUserStatus(userId, newStatus) {
  const result = await db.collection('users')
    .doc(userId)
    .update({
      data: {
        status: newStatus,
        updatedAt: db.serverDate()
      }
    });

  return result.stats.updated;
}

// 5. 删除数据（软删除推荐）
async function softDeleteUser(userId) {
  const result = await db.collection('users')
    .doc(userId)
    .update({
      data: {
        isDeleted: true,
        deletedAt: db.serverDate()
      }
    });

  return result.stats.updated;
}
```

### 云函数返回格式规范

```javascript
// ✅ 正确：统一的返回格式
return {
  success: true,          // 必须：操作是否成功
  data: result,           // 可选：返回的数据
  message: '操作成功'      // 可选：提示信息
};

return {
  success: false,
  message: '操作失败的原因'
};

// ❌ 错误：不统一的返回格式
return result;  // 缺少 success 标识
return { code: 0, data: result };  // 不一致的字段名
throw new Error('错误');  // 直接抛出异常（除非是预期外的错误）
```

---

## 🔐 角色和权限管理

### 使用 roleManager 工具

```javascript
// 导入角色管理器
const roleManager = require('../../utils/role-manager');

// 1. 获取当前角色
const currentRole = await roleManager.getCurrentRole();

// 2. 检查是否有某个角色
const isCandidateRole = await roleManager.hasRole('candidate');

// 3. 获取角色数据
const roleData = await roleManager.getRoleData('candidate');

// 4. 切换角色
await roleManager.switchRole('anchor');

// 5. 获取所有角色
const allRoles = await roleManager.getAllRoles();
```

### 页面级权限控制

```javascript
Page({
  data: {
    allowedRoles: ['hr', 'admin']  // 定义允许访问的角色
  },

  onLoad() {
    this.checkAccess();
  },

  async checkAccess() {
    const roleManager = require('../../utils/role-manager');
    const currentRole = await roleManager.getCurrentRole();

    if (!this.data.allowedRoles.includes(currentRole)) {
      wx.showModal({
        title: '无权限',
        content: '您没有权限访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  }
});
```

---

## 🛠️ 常用工具函数

### 场景参数解析

```javascript
const sceneParser = require('../../utils/scene-parser');

// 解析二维码参数
const params = sceneParser.parse(options.scene);

// 解析结果示例：
// {
//   type: 'invite',         // 类型：invite | referral | direct
//   code: 'ABC123',         // 邀请码/推荐码
//   source: 'qrcode'        // 来源
// }
```

### 数据格式化

```javascript
// 日期格式化
function formatDate(date, format = 'YYYY-MM-DD') {
  // 实现略
}

// 手机号脱敏
function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 金额格式化
function formatMoney(amount) {
  return (amount / 100).toFixed(2);
}
```

---

## ⚠️ 常见问题和最佳实践

### 1. 云开发初始化

```javascript
// app.js
App({
  onLaunch() {
    // ✅ 正确：使用正确的环境 ID
    wx.cloud.init({
      env: 'prod-xxxxx',  // 从云开发控制台获取
      traceUser: true
    });
  }
});

// ❌ 错误：使用默认环境（可能不存在）
wx.cloud.init();
```

### 2. 异步操作处理

```javascript
// ✅ 正确：使用 async/await
async loadData() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'get-data'
    });
    this.setData({ data: result.result.data });
  } catch (error) {
    console.error(error);
  }
}

// ❌ 错误：回调地狱
loadData() {
  wx.cloud.callFunction({
    name: 'get-data',
    success: (res) => {
      this.setData({ data: res.result.data });
    },
    fail: (err) => {
      console.error(err);
    }
  });
}
```

### 3. setData 性能优化

```javascript
// ✅ 正确：只更新变化的数据
this.setData({
  'user.name': newName,
  'user.age': newAge
});

// ❌ 错误：更新整个对象
const user = this.data.user;
user.name = newName;
user.age = newAge;
this.setData({ user: user });
```

### 4. 避免内存泄漏

```javascript
Page({
  onLoad() {
    // 定时器
    this.timer = setInterval(() => {
      // ...
    }, 1000);
  },

  onUnload() {
    // ✅ 正确：清理定时器
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
});
```

---

## 📖 完整资源索引

- [页面结构完整规范](./page-structure.md)
- [组件开发指南](./component-guide.md)
- [生命周期最佳实践](./lifecycle-best-practices.md)

---

## 🔄 更新日志

- **2025-11-05**: 创建初始版本

---

**维护者**: 开发团队
**最后更新**: 2025-11-05

> 💡 此 Skill 会根据项目实际情况持续更新和完善。
