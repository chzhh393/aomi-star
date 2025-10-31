# 📏 代码规范

> 统一的代码规范,提高代码质量和可维护性

## 🎯 总体原则

1. **可读性优先**: 代码是给人看的,其次才是给机器执行的
2. **一致性**: 保持代码风格的一致性
3. **简洁性**: 简单清晰,避免过度设计
4. **可维护性**: 易于理解和修改

## 📝 命名规范

### JavaScript 命名

```javascript
// 变量和函数: 小驼峰
let userName = 'John'
function getUserInfo() {}

// 常量: 大写下划线
const MAX_COUNT = 100
const API_BASE_URL = 'https://api.example.com'

// 类和组件: 大驼峰
class UserProfile {}
Component UserCard {}

// 私有变量/方法: 下划线前缀
let _privateVar = 'private'
function _privateMethod() {}

// 布尔值: is/has/can 前缀
let isVisible = true
let hasPermission = false
let canEdit = true
```

### 文件命名

```bash
# 页面和组件: 小写连字符
pages/user-profile/
components/user-card/

# JS 文件: 小驼峰
utils/dateUtil.js
services/userApi.js

# 配置文件: 小写连字符
project.config.json
```

## 💻 JavaScript 规范

### 1. 使用 const 和 let

```javascript
// ✅ 推荐
const maxCount = 100
let currentCount = 0

// ❌ 避免
var count = 0
```

### 2. 字符串使用单引号

```javascript
// ✅ 推荐
const name = 'John'
const message = 'Hello World'

// ❌ 避免
const name = "John"
```

### 3. 对象和数组

```javascript
// ✅ 推荐
const obj = {
  name: 'John',
  age: 30
}

const arr = [1, 2, 3]

// 使用扩展运算符
const newObj = { ...obj, age: 31 }
const newArr = [...arr, 4]

// ❌ 避免
const obj = new Object()
const arr = new Array()
```

### 4. 函数

```javascript
// ✅ 推荐: 箭头函数
const add = (a, b) => a + b

const getUserInfo = async (id) => {
  const user = await fetchUser(id)
  return user
}

// 普通函数
function multiply(a, b) {
  return a * b
}

// ❌ 避免: 函数表达式
const add = function(a, b) {
  return a + b
}
```

### 5. 模板字符串

```javascript
// ✅ 推荐
const name = 'John'
const message = `Hello, ${name}!`

// ❌ 避免
const message = 'Hello, ' + name + '!'
```

### 6. 解构赋值

```javascript
// ✅ 推荐
const { name, age } = user
const [first, second] = array

// ❌ 避免
const name = user.name
const age = user.age
```

### 7. 条件判断

```javascript
// ✅ 推荐
if (value) {
  // 简洁的真值判断
}

// 使用三元运算符
const status = isActive ? 'active' : 'inactive'

// ❌ 避免
if (value == true) {
  // 不必要的比较
}
```

### 8. 异步处理

```javascript
// ✅ 推荐: async/await
async function fetchData() {
  try {
    const data = await api.getData()
    return data
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// ❌ 避免: 回调地狱
api.getData(function(data) {
  api.processData(data, function(result) {
    // 嵌套过深
  })
})
```

## 🎨 小程序规范

### 1. 页面结构

```javascript
// pages/user/user.js
Page({
  // 1. 页面数据
  data: {
    userName: '',
    userAge: 0
  },

  // 2. 生命周期函数
  onLoad(options) {
    this.getUserInfo()
  },

  onShow() {
    // ...
  },

  onReady() {
    // ...
  },

  // 3. 事件处理函数
  handleLogin() {
    // ...
  },

  handleSubmit(e) {
    // ...
  },

  // 4. 私有方法
  _updateUserInfo(data) {
    this.setData({ ...data })
  },

  // 5. API 调用
  async getUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUser'
      })
      this._updateUserInfo(res.result)
    } catch (error) {
      console.error(error)
    }
  }
})
```

### 2. 组件结构

```javascript
// components/user-card/index.js
Component({
  // 1. 组件选项
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated'
  },

  // 2. 组件属性
  properties: {
    user: {
      type: Object,
      value: {}
    }
  },

  // 3. 组件数据
  data: {
    innerValue: ''
  },

  // 4. 生命周期
  lifetimes: {
    attached() {
      // ...
    },
    detached() {
      // ...
    }
  },

  // 5. 组件方法
  methods: {
    handleTap() {
      this.triggerEvent('tap', {})
    },

    _privateMethod() {
      // ...
    }
  }
})
```

### 3. WXML 规范

```xml
<!-- ✅ 推荐 -->
<view class="container">
  <view class="user-info">
    <text class="user-name">{{userName}}</text>
    <text class="user-age">{{userAge}}</text>
  </view>

  <!-- 列表渲染 -->
  <view wx:for="{{list}}" wx:key="id" class="list-item">
    {{item.name}}
  </view>

  <!-- 条件渲染 -->
  <view wx:if="{{isVisible}}">显示内容</view>
  <view wx:else>隐藏内容</view>
</view>

<!-- ❌ 避免 -->
<!-- 不要用 wx:key="*this" -->
<view wx:for="{{list}}" wx:key="*this">
  {{item}}
</view>

<!-- 不要省略 class -->
<view>内容</view>
```

### 4. WXSS 规范

```css
/* ✅ 推荐 */
.container {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
}

.user-info {
  background-color: #fff;
  border-radius: 10rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

/* 使用 rpx 单位 */
.box {
  width: 750rpx;
  height: 200rpx;
}

/* ❌ 避免 */
/* 不要使用 ID 选择器 */
#user-info {
  /* ... */
}

/* 不要过度嵌套 */
.container .content .item .text {
  /* 嵌套过深 */
}
```

## 📦 云函数规范

```javascript
// cloudfunctions/getUser/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 获取用户信息
 * @param {Object} event - 云函数参数
 * @param {string} event.userId - 用户ID
 * @returns {Object} 用户信息
 */
exports.main = async (event, context) => {
  const { userId } = event
  const wxContext = cloud.getWXContext()

  // 参数验证
  if (!userId) {
    return {
      success: false,
      error: '缺少用户ID'
    }
  }

  try {
    // 业务逻辑
    const { data } = await db
      .collection('users')
      .doc(userId)
      .get()

    return {
      success: true,
      data: data,
      openid: wxContext.OPENID
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

## 📝 注释规范

### 1. 文件注释

```javascript
/**
 * 用户工具函数
 * @file userUtil.js
 * @author 开发者姓名
 * @date 2025-11-01
 */
```

### 2. 函数注释

```javascript
/**
 * 格式化用户信息
 * @param {Object} user - 用户对象
 * @param {string} user.name - 用户名
 * @param {number} user.age - 年龄
 * @returns {string} 格式化后的字符串
 * @example
 * formatUser({ name: 'John', age: 30 })
 * // returns "John (30岁)"
 */
function formatUser(user) {
  return `${user.name} (${user.age}岁)`
}
```

### 3. 代码注释

```javascript
// ✅ 推荐: 解释"为什么"
// 使用防抖避免频繁请求
const debouncedSearch = debounce(search, 300)

// ❌ 避免: 解释"做什么"(代码本身已经清楚)
// 声明变量
let count = 0
```

## ⚠️ 错误处理

```javascript
// ✅ 推荐: 统一的错误处理
async function fetchData() {
  try {
    const data = await api.getData()
    return data
  } catch (error) {
    console.error('获取数据失败:', error)
    wx.showToast({
      title: '操作失败',
      icon: 'none'
    })
    throw error
  }
}

// ❌ 避免: 静默失败
async function fetchData() {
  try {
    const data = await api.getData()
    return data
  } catch (error) {
    // 什么都不做
  }
}
```

## 🧪 代码质量

### 1. 避免魔法数字

```javascript
// ✅ 推荐
const MAX_RETRY_COUNT = 3
const TIMEOUT_MS = 5000

if (retryCount > MAX_RETRY_COUNT) {
  // ...
}

// ❌ 避免
if (retryCount > 3) {
  // 3 是什么意思?
}
```

### 2. 函数单一职责

```javascript
// ✅ 推荐: 一个函数做一件事
function validateUser(user) {
  return user && user.name && user.age > 0
}

function saveUser(user) {
  db.collection('users').add({ data: user })
}

// ❌ 避免: 一个函数做多件事
function validateAndSaveUser(user) {
  if (user && user.name && user.age > 0) {
    db.collection('users').add({ data: user })
  }
}
```

### 3. 早期返回

```javascript
// ✅ 推荐
function processUser(user) {
  if (!user) return null
  if (!user.name) return null

  // 主要逻辑
  return formatUser(user)
}

// ❌ 避免: 嵌套过深
function processUser(user) {
  if (user) {
    if (user.name) {
      // 主要逻辑
      return formatUser(user)
    }
  }
  return null
}
```

## 🔍 代码检查

### ESLint 配置(建议)

```json
{
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "no-console": "off"
  }
}
```

## 📚 参考资源

- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [微信小程序开发规范](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxs/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

---

**最后更新**: 2025-11-01
**维护者**: 开发团队

> 💡 代码规范是团队协作的基础,请严格遵守!
