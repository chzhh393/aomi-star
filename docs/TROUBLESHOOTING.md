# 🔧 Aomi Star 问题排查指南

> 本文档收录项目开发过程中的常见问题及解决方案。遇到问题时请先查阅本文档，大部分问题都能快速解决。

**创建日期**: 2025-11-05
**最后更新**: 2025-11-05
**维护者**: 开发团队

---

## 目录

- [云开发相关](#云开发相关)
- [页面相关](#页面相关)
- [组件相关](#组件相关)
- [权限和认证](#权限和认证)
- [数据库相关](#数据库相关)
- [云函数相关](#云函数相关)
- [CustomTabBar 相关](#customtabbar-相关)
- [场景参数和路由](#场景参数和路由)
- [性能问题](#性能问题)

---

## 云开发相关

### ❌ 问题：云开发初始化失败

**症状**：
- 控制台报错：`cloud init error`
- 无法调用云函数
- 云数据库无法连接

**可能原因**：
1. 未开通云开发服务
2. 环境 ID 配置错误
3. 网络问题

**解决方案**：

**步骤 1：检查云开发服务状态**
1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 确认云开发环境已创建

**步骤 2：检查环境 ID 配置**
```javascript
// miniprogram/app.js
wx.cloud.init({
  env: 'your-env-id',  // ❌ 错误：环境 ID 不正确
  traceUser: true
});

// ✅ 正确：使用正确的环境 ID
wx.cloud.init({
  env: 'prod-xxxxx',   // 从云开发控制台获取
  traceUser: true
});
```

**步骤 3：检查网络**
- 确保开发者工具网络正常
- 尝试切换网络或使用代理

**步骤 4：重启开发者工具**
- 有时需要重启开发者工具才能生效

---

### ❌ 问题：云开发环境切换失败

**症状**：
- 本地开发正常，真机测试失败
- 云函数调用返回 `env not found`

**原因**：
- 小程序发布后使用的环境 ID 与开发环境不同

**解决方案**：

**使用动态环境 ID**：
```javascript
// miniprogram/app.js
wx.cloud.init({
  env: wx.cloud.DYNAMIC_CURRENT_ENV  // ✅ 推荐：使用动态环境
});
```

**或者根据版本切换**：
```javascript
// miniprogram/app.js
const env = __wxConfig.envVersion === 'release'
  ? 'prod-xxxxx'      // 正式版环境
  : 'test-xxxxx';     // 开发版环境

wx.cloud.init({ env });
```

---

## 页面相关

### ❌ 问题：页面不显示 / 白屏

**症状**：
- 页面跳转后显示空白
- 控制台无报错

**排查清单**：

**✅ 1. 检查页面是否在 app.json 中注册**
```json
// miniprogram/app.json
{
  "pages": [
    "pages/index/index",
    "pages/candidate/home",  // ❌ 路径不正确
    // ✅ 正确路径
    "pages/candidate/home/home"
  ]
}
```

**✅ 2. 检查页面文件是否完整**
```
pages/candidate/home/
├── home.js     ✅
├── home.json   ✅
├── home.wxml   ✅
└── home.wxss   ✅
```

**✅ 3. 检查 wxml 语法**
```xml
<!-- ❌ 错误：标签未闭合 -->
<view class="container">
  <text>Hello

<!-- ✅ 正确 -->
<view class="container">
  <text>Hello</text>
</view>
```

**✅ 4. 检查 js 文件是否有语法错误**
```javascript
// 打开调试器，查看 Console 面板
// 是否有 JavaScript 错误
```

---

### ❌ 问题：页面跳转失败

**症状**：
- 调用 `wx.navigateTo()` 后无反应
- 控制台报错：`navigateTo fail`

**常见原因**：

**原因 1：页面路径错误**
```javascript
// ❌ 错误：路径不正确
wx.navigateTo({
  url: '/pages/candidate/home'  // 缺少文件名
});

// ✅ 正确
wx.navigateTo({
  url: '/pages/candidate/home/home'
});
```

**原因 2：页面栈超过 10 层**
```javascript
// ❌ 错误：不断 navigateTo，页面栈会溢出
for (let i = 0; i < 15; i++) {
  wx.navigateTo({ url: '/pages/test/test' });
}

// ✅ 正确：使用 redirectTo 或 reLaunch
wx.redirectTo({ url: '/pages/test/test' });
```

**原因 3：TabBar 页面使用了 navigateTo**
```javascript
// ❌ 错误：TabBar 页面不能用 navigateTo
wx.navigateTo({
  url: '/pages/candidate/home/home'  // 如果这是 TabBar 页面
});

// ✅ 正确：使用 switchTab
wx.switchTab({
  url: '/pages/candidate/home/home'
});
```

**解决方案总结**：

| 跳转方式 | 使用场景 | 是否保留当前页面 | 是否可返回 |
|---------|---------|----------------|-----------|
| `navigateTo` | 普通页面跳转 | ✅ 保留 | ✅ 可以 |
| `redirectTo` | 替换当前页面 | ❌ 不保留 | ❌ 不可以 |
| `switchTab` | 跳转 TabBar 页面 | ❌ 关闭其他页面 | ❌ 不可以 |
| `reLaunch` | 重启小程序 | ❌ 关闭所有页面 | ❌ 不可以 |
| `navigateBack` | 返回上一页 | - | - |

---

### ❌ 问题：页面数据不更新

**症状**：
- 修改了 `this.data.xxx`，但页面不显示
- `console.log` 能看到数据变化，但页面没反应

**原因**：
- 直接修改 `this.data` 不会触发视图更新

**解决方案**：

```javascript
// ❌ 错误：直接修改 data
this.data.userName = '新名字';
this.data.list.push('新项');

// ✅ 正确：使用 setData
this.setData({
  userName: '新名字',
  'list[2]': '新项',           // 修改数组指定项
  'user.name': '新名字'        // 修改对象属性
});
```

**性能优化建议**：
```javascript
// ❌ 不好：频繁调用 setData
for (let i = 0; i < 100; i++) {
  this.setData({ count: i });
}

// ✅ 好：批量更新
let count = 0;
for (let i = 0; i < 100; i++) {
  count = i;
}
this.setData({ count });
```

---

## 组件相关

### ❌ 问题：自定义组件不显示

**症状**：
- 页面中使用了组件，但不显示
- 控制台无报错

**排查清单**：

**✅ 1. 检查页面 json 配置**
```json
// pages/candidate/home/home.json
{
  "usingComponents": {
    "user-card": "/components/user-card/user-card"  // ✅ 必须注册
  }
}
```

**✅ 2. 检查组件路径是否正确**
```json
// ❌ 错误：路径不存在
"user-card": "/components/user-card"

// ✅ 正确：包含完整路径（不含扩展名）
"user-card": "/components/user-card/user-card"
```

**✅ 3. 检查组件文件是否完整**
```
components/user-card/
├── user-card.js     ✅ 必须有
├── user-card.json   ✅ 必须有，且包含 {"component": true}
├── user-card.wxml   ✅
└── user-card.wxss   ✅
```

**✅ 4. 检查 component.json 配置**
```json
// components/user-card/user-card.json
{
  "component": true,  // ✅ 必须声明这是组件
  "usingComponents": {}
}
```

---

### ❌ 问题：组件事件无法触发

**症状**：
- 在组件上绑定了事件，但点击无反应
- 控制台无报错

**常见原因**：

**原因 1：事件名写错**
```xml
<!-- ❌ 错误：组件不支持 @tap 语法（Vue风格） -->
<user-card @tap="handleTap"></user-card>

<!-- ✅ 正确：使用 bind: 或 catch: -->
<user-card bindtap="handleTap"></user-card>
<user-card catchtap="handleTap"></user-card>
```

**原因 2：自定义事件未触发**
```javascript
// 组件内部 - components/user-card/user-card.js
Component({
  methods: {
    onTap() {
      // ❌ 错误：忘记触发自定义事件
      console.log('组件被点击');
    }
  }
});

// ✅ 正确：触发自定义事件
Component({
  methods: {
    onTap() {
      this.triggerEvent('tap', { data: '传递的数据' });
    }
  }
});
```

```xml
<!-- 页面中使用 -->
<user-card bindtap="handleCardTap"></user-card>
```

---

## 权限和认证

### ❌ 问题：获取用户信息失败

**症状**：
- `wx.getUserProfile()` 报错
- 无法获取用户昵称和头像

**可能原因**：

**原因 1：基础库版本过低**
```javascript
// wx.getUserProfile 要求基础库 >= 2.10.4
// 检查 project.config.json
{
  "miniprogramRoot": "miniprogram/",
  "libVersion": "2.10.4"  // 确保版本足够
}
```

**原因 2：必须由用户主动触发**
```javascript
// ❌ 错误：页面加载时自动调用
Page({
  onLoad() {
    wx.getUserProfile({  // 会失败
      desc: '用于完善会员资料'
    });
  }
});

// ✅ 正确：必须在按钮点击等用户操作中调用
Page({
  handleGetUserInfo() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log(res.userInfo);
      }
    });
  }
});
```

```xml
<!-- wxml -->
<button bindtap="handleGetUserInfo">获取用户信息</button>
```

---

### ❌ 问题：角色权限验证失败

**症状**：
- 云函数返回"权限不足"
- 用户明明有权限但被拒绝访问

**排查步骤**：

**✅ 1. 检查用户角色是否正确**
```javascript
// 在云函数中打印用户信息
const user = await db.collection('users')
  .where({ _openid: openid })
  .getOne();

console.log('用户角色:', user.role);  // 查看实际角色
```

**✅ 2. 检查权限判断逻辑**
```javascript
// ❌ 错误：字符串比较大小写敏感
if (user.role === 'HR_ADMIN') {  // 数据库中是 'hr_admin'
  // ...
}

// ✅ 正确：统一小写或使用常量
const UserRole = {
  HR_ADMIN: 'hr_admin'
};

if (user.role === UserRole.HR_ADMIN) {
  // ...
}
```

**✅ 3. 检查用户状态**
```javascript
// 除了角色，还要检查状态
if (user.role === 'hr_admin' && user.status === 'active') {
  // 有权限
}
```

---

### ❌ 问题：登录态失效

**症状**：
- 用户已登录，但再次打开小程序需要重新登录
- 云函数无法识别用户

**原因**：
- 小程序登录态过期（默认 7 天）

**解决方案**：

**方案 1：检查登录态并自动刷新**
```javascript
// miniprogram/app.js
App({
  onLaunch() {
    // 检查登录态
    wx.checkSession({
      success: () => {
        // 登录态有效，直接使用
        this.getUserInfo();
      },
      fail: () => {
        // 登录态失效，重新登录
        this.doLogin();
      }
    });
  },

  doLogin() {
    wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      // 存储用户信息
      this.globalData.userInfo = res.result.data;
    });
  }
});
```

---

## 数据库相关

### ❌ 问题：数据库查询无结果

**症状**：
- 明明有数据，但查询返回空数组
- `count` 为 0

**常见原因**：

**原因 1：权限不足**
```javascript
// 前端直接查询（受权限限制）
db.collection('users').get()
  .then(res => {
    console.log(res.data);  // 可能为空
  });

// ✅ 解决：通过云函数查询（管理员权限）
wx.cloud.callFunction({
  name: 'getUserList'
}).then(res => {
  console.log(res.result.data);  // 完整数据
});
```

**原因 2：查询条件错误**
```javascript
// ❌ 错误：字段名拼写错误
db.collection('users')
  .where({ openId: 'xxx' })  // 应该是 _openid
  .get();

// ✅ 正确
db.collection('users')
  .where({ _openid: 'xxx' })
  .get();
```

**原因 3：数据类型不匹配**
```javascript
// ❌ 错误：role 是字符串，不是数字
db.collection('users')
  .where({ role: 1 })  // 数据库中是 'candidate'
  .get();

// ✅ 正确
db.collection('users')
  .where({ role: 'candidate' })
  .get();
```

---

### ❌ 问题：数据库更新失败

**症状**：
- `update()` 返回成功，但数据未变化
- `updated` 为 0

**常见原因**：

**原因 1：没有匹配的文档**
```javascript
// 先查询确认文档存在
const res = await db.collection('users')
  .where({ _openid: 'xxx' })
  .get();

console.log('找到文档数:', res.data.length);

if (res.data.length > 0) {
  // 再更新
  await db.collection('users')
    .where({ _openid: 'xxx' })
    .update({
      data: { status: 'active' }
    });
}
```

**原因 2：权限不足（前端操作）**
```javascript
// ❌ 错误：前端直接更新可能失败
db.collection('users')
  .where({ _id: 'xxx' })
  .update({
    data: { role: 'streamer' }
  });

// ✅ 正确：通过云函数更新
wx.cloud.callFunction({
  name: 'updateUserRole',
  data: { userId: 'xxx', newRole: 'streamer' }
});
```

---

## 云函数相关

### ❌ 问题：云函数调用失败

**症状**：
- 控制台报错：`cloud function execution error`
- 返回 `errCode: -1`

**排查步骤**：

**✅ 1. 检查云函数是否已上传部署**
1. 打开微信开发者工具
2. 在云函数目录上右键
3. 选择"上传并部署：云端安装依赖"

**✅ 2. 检查云函数名称是否正确**
```javascript
// ❌ 错误：函数名拼写错误
wx.cloud.callFunction({
  name: 'getUserInfo'  // 实际是 'user-info'
});

// ✅ 正确
wx.cloud.callFunction({
  name: 'user-info'
});
```

**✅ 3. 查看云函数日志**
1. 打开云开发控制台
2. 点击"云函数"
3. 选择对应函数
4. 查看"日志"标签页

---

### ❌ 问题：云函数获取不到 openid

**症状**：
- `cloud.getWXContext().OPENID` 返回 undefined
- 无法识别用户身份

**原因**：
- 云函数环境未正确初始化

**解决方案**：

```javascript
// ❌ 错误：未初始化 cloud
const wxContext = cloud.getWXContext();
console.log(wxContext.OPENID);  // undefined

// ✅ 正确：先初始化
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  console.log(wxContext.OPENID);  // 正确获取

  return {
    openid: wxContext.OPENID
  };
};
```

---

## CustomTabBar 相关

### ❌ 问题：CustomTabBar 不显示

**症状**：
- 设置了自定义 TabBar，但不显示
- 显示原生 TabBar

**排查清单**：

**✅ 1. 检查 app.json 配置**
```json
// miniprogram/app.json
{
  "tabBar": {
    "custom": true,  // ✅ 必须设置为 true
    "list": [
      { "pagePath": "pages/candidate/home/home", "text": "首页" },
      { "pagePath": "pages/candidate/profile/profile", "text": "我的" }
    ]
  }
}
```

**✅ 2. 检查 custom-tab-bar 目录位置**
```
miniprogram/
└── custom-tab-bar/     ✅ 必须在根目录
    ├── index.js        ✅
    ├── index.json      ✅
    ├── index.wxml      ✅
    └── index.wxss      ✅
```

**✅ 3. 检查 custom-tab-bar/index.json**
```json
{
  "component": true  // ✅ 必须声明为组件
}
```

---

### ❌ 问题：TabBar 选中状态不对

**症状**：
- 切换页面后，TabBar 高亮的 tab 不正确
- 总是显示第一个 tab 为选中状态

**原因**：
- 未在每个页面中更新 TabBar 的 selected 属性

**解决方案**：

```javascript
// pages/candidate/home/home.js
Page({
  onShow() {
    // ✅ 在每个 TabBar 页面的 onShow 中更新
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0  // 当前页面对应的 tab 索引
      });
    }
  }
});

// pages/candidate/profile/profile.js
Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 我的页面是第 2 个 tab（索引为 1）
      });
    }
  }
});
```

---

## 场景参数和路由

### ❌ 问题：场景参数获取不到

**症状**：
- 扫码进入小程序，`options.query` 为空
- 无法获取邀请码或推荐码

**原因**：
- 小程序码生成时未正确传参

**解决方案**：

**✅ 1. 生成小程序码时传参**
```javascript
// 云函数：生成小程序码
const result = await cloud.openapi.wxacode.getUnlimited({
  scene: 'inviteCode=INVITE2025',  // ✅ 使用 scene 参数
  page: 'pages/index/login/login',
  width: 280
});
```

**✅ 2. 解析场景参数**
```javascript
// pages/index/login/login.js
Page({
  onLoad(options) {
    // 从 scene 参数中解析
    const scene = decodeURIComponent(options.scene || '');
    console.log('Scene:', scene);  // 'inviteCode=INVITE2025'

    const params = {};
    scene.split('&').forEach(item => {
      const [key, value] = item.split('=');
      params[key] = value;
    });

    console.log('邀请码:', params.inviteCode);  // 'INVITE2025'
  }
});
```

---

## 性能问题

### ❌ 问题：页面渲染卡顿

**症状**：
- 页面滚动不流畅
- setData 调用后页面卡顿

**优化方案**：

**✅ 1. 减少 setData 数据量**
```javascript
// ❌ 不好：传输大量数据
this.setData({
  list: this.data.list  // 假设 list 很大
});

// ✅ 好：只更新需要变化的部分
this.setData({
  'list[2].status': 'active'  // 只更新一项
});
```

**✅ 2. 使用虚拟列表**
```xml
<!-- 对于超长列表，使用 scroll-view + 虚拟列表 -->
<scroll-view scroll-y>
  <block wx:for="{{visibleList}}" wx:key="id">
    <view>{{item.name}}</view>
  </block>
</scroll-view>
```

**✅ 3. 图片优化**
```xml
<!-- 使用 lazy-load -->
<image src="{{imgUrl}}" lazy-load mode="aspectFill"></image>

<!-- 使用 WebP 格式 -->
<image src="{{imgUrl}}?x-oss-process=image/format,webp"></image>
```

---

### ❌ 问题：小程序体积过大

**症状**：
- 小程序包体积超过 2MB
- 上传失败或审核被拒

**优化方案**：

**✅ 1. 使用分包**
```json
// app.json
{
  "pages": [
    "pages/index/index"
  ],
  "subpackages": [
    {
      "root": "pages/hr/",
      "pages": [
        "candidates/candidates",
        "interviews/interviews"
      ]
    },
    {
      "root": "pages/agent/",
      "pages": [
        "team/team",
        "schedule/schedule"
      ]
    }
  ]
}
```

**✅ 2. 图片使用云存储**
```javascript
// ❌ 不好：图片放在小程序包内
<image src="/images/banner.jpg"></image>

// ✅ 好：使用云存储
<image src="{{cloudImageUrl}}"></image>
```

**✅ 3. 清理无用文件**
- 删除未使用的图片
- 删除未使用的页面和组件
- 压缩 JavaScript 代码

---

## 获取更多帮助

如果以上方案都无法解决你的问题：

1. **查看官方文档**
   - [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
   - [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

2. **查看项目已解决问题**
   - 查看 [@docs/issues/resolved/](./issues/resolved/)

3. **创建问题追踪**
   - 在 `docs/issues/pending/` 创建新问题
   - 详细描述问题和复现步骤

4. **社区求助**
   - 微信开发者社区
   - Stack Overflow（搜索 `wechat-miniprogram`）

---

## 文档维护

**新增问题时的格式**：

```markdown
### ❌ 问题：[问题简短描述]

**症状**：
- [具体表现]

**可能原因**：
1. [原因1]
2. [原因2]

**解决方案**：
[详细步骤]
```

**维护原则**：
- ✅ 每次遇到新问题并解决后，立即添加到本文档
- ✅ 使用清晰的标题和分类
- ✅ 提供具体的代码示例
- ✅ 注明问题的症状和解决方案

---

**最后更新**: 2025-11-05
**维护者**: 开发团队

> 💡 提示：本文档会持续更新。如果你解决了新问题，请及时添加到本文档，帮助团队其他成员。
