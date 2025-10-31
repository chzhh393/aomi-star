# 🔄 数据流程

> 数据在系统中的流转和处理流程

## 📊 数据流概览

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  用户   │ ───> │  页面   │ ───> │云函数   │ ───> │ 数据库  │
│ 操作    │      │ 事件    │      │ 处理    │      │ 存储    │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     ↑                │                 │                 │
     │                │                 │                 │
     └────────────────┴─────────────────┴─────────────────┘
                      返回结果并更新UI
```

## 🔍 详细流程

### 1. 用户登录流程

```
┌──────────────────────────────────────────────────┐
│ 1. 用户点击登录按钮                                │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 2. 页面调用 wx.login() 获取 code                  │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 3. 调用云函数 login                               │
│    传参: { code }                                 │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 4. 云函数获取 openid                              │
│    cloud.getWXContext()                          │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 5. 查询/创建用户记录                              │
│    db.collection('users').add(...)               │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 6. 返回用户信息                                   │
│    { success: true, data: userInfo }             │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 7. 页面保存用户信息                               │
│    storage.set('userInfo', data)                 │
│    this.setData({ userInfo: data })              │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 8. 跳转到主页                                     │
│    wx.switchTab({ url: '/pages/home/home' })    │
└──────────────────────────────────────────────────┘
```

### 2. 数据查询流程

#### 方式一: 云函数查询

```
用户请求
    ↓
页面调用云函数
    ↓
云函数查询数据库
    ↓
处理数据
    ↓
返回结果
    ↓
页面更新显示
```

**代码示例**:

```javascript
// 1. 页面调用
Page({
  async loadData() {
    wx.showLoading({ title: '加载中' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getData',
        data: { page: 1, limit: 10 }
      })

      if (res.result.success) {
        this.setData({
          list: res.result.data
        })
      }
    } catch (error) {
      console.error(error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})

// 2. 云函数处理
exports.main = async (event) => {
  const { page, limit } = event
  const db = cloud.database()

  try {
    const { data } = await db.collection('items')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()

    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

#### 方式二: 直接查询(小数据量)

```
用户请求
    ↓
页面直接查询数据库
    ↓
数据库返回结果
    ↓
页面更新显示
```

**代码示例**:

```javascript
Page({
  async loadData() {
    const db = wx.cloud.database()

    try {
      const { data } = await db.collection('items')
        .where({ status: 'active' })
        .get()

      this.setData({ list: data })
    } catch (error) {
      console.error(error)
    }
  }
})
```

### 3. 数据提交流程

```
┌──────────────────────────────────────────────────┐
│ 1. 用户填写表单                                   │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 2. 前端验证                                       │
│    - 必填项检查                                   │
│    - 格式验证                                     │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 3. 调用云函数提交                                 │
│    callFunction({ name: 'submitData', data })    │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 4. 云函数验证参数                                 │
│    - 二次验证数据                                 │
│    - 权限检查                                     │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 5. 数据库操作                                     │
│    - 插入/更新数据                                │
│    - 关联数据处理                                 │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 6. 返回结果                                       │
│    { success: true, data: { id: 'xxx' } }        │
└─────────────┬────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────┐
│ 7. 页面处理结果                                   │
│    - 显示成功提示                                 │
│    - 刷新数据                                     │
│    - 页面跳转                                     │
└──────────────────────────────────────────────────┘
```

## 🔐 数据安全

### 1. 数据加密

```javascript
// 敏感数据加密后传输
const encryptData = (data) => {
  // 使用加密算法
  return encrypted
}

// 云函数解密
const decryptData = (encrypted) => {
  // 解密
  return decrypted
}
```

### 2. 权限控制

```javascript
// 云函数中验证权限
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 查询用户权限
  const user = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (!user.data[0] || !user.data[0].hasPermission) {
    return {
      success: false,
      error: '无权限操作'
    }
  }

  // 执行操作
  // ...
}
```

## 🔄 数据同步

### 实时监听(数据库监听)

```javascript
// 监听数据变化
Page({
  onLoad() {
    const db = wx.cloud.database()

    this.watcher = db.collection('messages')
      .where({ userId: this.data.userId })
      .watch({
        onChange: (snapshot) => {
          console.log('数据变化', snapshot)
          this.setData({
            messages: snapshot.docs
          })
        },
        onError: (err) => {
          console.error('监听错误', err)
        }
      })
  },

  onUnload() {
    // 关闭监听
    if (this.watcher) {
      this.watcher.close()
    }
  }
})
```

## 📦 数据缓存策略

### 1. 本地缓存

```javascript
// 缓存工具
const cache = {
  set(key, data, expire = 3600000) {
    const cacheData = {
      data: data,
      expire: Date.now() + expire
    }
    wx.setStorageSync(key, cacheData)
  },

  get(key) {
    const cacheData = wx.getStorageSync(key)
    if (!cacheData) return null

    if (Date.now() > cacheData.expire) {
      wx.removeStorageSync(key)
      return null
    }

    return cacheData.data
  }
}

// 使用缓存
async function getData() {
  // 先查缓存
  let data = cache.get('userList')
  if (data) return data

  // 缓存不存在,请求数据
  const res = await callCloudFunction('getUserList')
  data = res.result.data

  // 保存缓存(1小时)
  cache.set('userList', data, 3600000)

  return data
}
```

### 2. 预加载

```javascript
// 在 app.js 中预加载常用数据
App({
  onLaunch() {
    this.preloadData()
  },

  async preloadData() {
    try {
      const [config, categories] = await Promise.all([
        this.getConfig(),
        this.getCategories()
      ])

      this.globalData.config = config
      this.globalData.categories = categories
    } catch (error) {
      console.error('预加载失败', error)
    }
  }
})
```

## 📊 数据统计

### 埋点数据收集

```javascript
// 事件追踪
const track = (event, data) => {
  wx.cloud.callFunction({
    name: 'track',
    data: {
      event,
      data,
      timestamp: Date.now()
    }
  })
}

// 使用
track('page_view', { page: 'home' })
track('button_click', { button: 'login' })
```

## ⚠️ 错误处理

### 统一错误处理

```javascript
// 错误处理函数
const handleError = (error, showToast = true) => {
  console.error('错误:', error)

  if (showToast) {
    wx.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }

  // 上报错误
  wx.cloud.callFunction({
    name: 'reportError',
    data: {
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    }
  })
}

// 使用
try {
  await someOperation()
} catch (error) {
  handleError(error)
}
```

## 📈 性能优化

### 1. 减少 setData 次数

```javascript
// ❌ 避免
this.setData({ name: 'John' })
this.setData({ age: 30 })
this.setData({ city: 'Beijing' })

// ✅ 推荐
this.setData({
  name: 'John',
  age: 30,
  city: 'Beijing'
})
```

### 2. 部分更新

```javascript
// ❌ 避免更新整个数组
this.setData({
  list: newList
})

// ✅ 推荐只更新变化的项
this.setData({
  [`list[${index}]`]: newItem
})
```

## 🔗 相关文档

- [系统总览](./system-overview.md)
- [技术栈说明](./tech-stack.md)
- [云函数模块](../modules/cloud-functions/)

---

**最后更新**: 2025-11-01
**维护者**: 架构团队

> 💡 理解数据流程是开发的关键!
