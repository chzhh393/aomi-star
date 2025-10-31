# 🔧 Utils 模块文档

> 工具函数模块的详细文档

## 📋 模块概述

Utils 模块包含项目中所有的工具函数和辅助方法,提供通用的功能支持。

## 📂 目录结构

```
miniprogram/utils/
├── api.js            # API 请求封装
├── storage.js        # 本地存储工具
├── format.js         # 数据格式化工具
├── validate.js       # 数据验证工具
├── date.js          # 日期处理工具
└── common.js        # 通用工具函数
```

## 🎯 工具列表

| 文件名 | 功能描述 | 状态 |
|--------|---------|------|
| - | 待创建 | 📝 规划中 |

## 📝 开发规范

### 工具函数模板

```javascript
/**
 * 函数功能描述
 * @param {Type} param - 参数说明
 * @returns {Type} 返回值说明
 * @example
 * functionName(param)
 */
export function functionName(param) {
  // 参数验证
  if (!param) {
    throw new Error('参数不能为空')
  }

  // 业务逻辑
  const result = doSomething(param)

  return result
}
```

### 命名规范

- 函数名使用小驼峰: `getUserInfo`
- 常量名使用大写下划线: `MAX_RETRY_COUNT`
- 类名使用大驼峰: `RequestHandler`

## 🔧 常用工具类别

### 1. API 请求工具

```javascript
// api.js
export const request = (url, data = {}, method = 'GET') => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      data,
      method,
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: reject
    })
  })
}

// 云函数调用封装
export const callCloudFunction = (name, data = {}) => {
  return wx.cloud.callFunction({
    name,
    data
  }).then(res => res.result)
}
```

### 2. 本地存储工具

```javascript
// storage.js
export const storage = {
  set(key, value) {
    try {
      wx.setStorageSync(key, value)
      return true
    } catch (e) {
      console.error('存储失败', e)
      return false
    }
  },

  get(key, defaultValue = null) {
    try {
      return wx.getStorageSync(key) || defaultValue
    } catch (e) {
      console.error('读取失败', e)
      return defaultValue
    }
  },

  remove(key) {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (e) {
      console.error('删除失败', e)
      return false
    }
  },

  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (e) {
      console.error('清空失败', e)
      return false
    }
  }
}
```

### 3. 数据格式化工具

```javascript
// format.js
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
}

export const formatNumber = (num, decimals = 2) => {
  return Number(num).toFixed(decimals)
}

export const formatPrice = (price) => {
  return `¥${formatNumber(price, 2)}`
}
```

### 4. 数据验证工具

```javascript
// validate.js
export const validate = {
  // 手机号验证
  phone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  // 邮箱验证
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  },

  // 身份证验证
  idCard(idCard) {
    return /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard)
  },

  // 非空验证
  required(value) {
    return value !== null && value !== undefined && value !== ''
  }
}
```

### 5. 日期处理工具

```javascript
// date.js
export const dateUtil = {
  // 获取当前时间戳
  now() {
    return Date.now()
  },

  // 格式化日期
  format(date, format = 'YYYY-MM-DD HH:mm:ss') {
    // 实现格式化逻辑
  },

  // 计算时间差
  diff(date1, date2, unit = 'days') {
    // 实现时间差计算
  },

  // 相对时间
  relative(date) {
    const now = Date.now()
    const diff = now - new Date(date).getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }
}
```

### 6. 通用工具函数

```javascript
// common.js
// 防抖
export const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 节流
export const throttle = (fn, delay = 300) => {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

// 深拷贝
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))

  const cloned = {}
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key])
  })
  return cloned
}

// 生成唯一ID
export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
```

## 🔨 使用示例

### 在页面中使用

```javascript
import { request } from '../../utils/api'
import { storage } from '../../utils/storage'
import { formatDate } from '../../utils/format'

Page({
  async onLoad() {
    // 使用 API 请求
    const data = await request('/api/user')

    // 使用本地存储
    storage.set('userInfo', data)

    // 使用格式化
    const formattedDate = formatDate(new Date())
  }
})
```

## 📚 功能文档

详细的功能文档请查看 [features](./features/) 目录。

## 🔨 实施指南

- [创建新工具函数](./implementation/create-new-util.md) (待创建)
- [单元测试编写](./implementation/unit-testing.md) (待创建)

## 📝 开发日志

查看工具模块的开发日志: [dev-logs](./dev-logs/)

## 🐛 问题追踪

查看工具相关的问题: [issues](./issues/)

## ⚠️ 注意事项

1. **纯函数**: 工具函数应该是纯函数,无副作用
2. **参数验证**: 对输入参数进行验证
3. **错误处理**: 合理处理异常情况
4. **文档注释**: 添加详细的 JSDoc 注释
5. **单元测试**: 为工具函数编写单元测试

## 🔗 相关链接

- [JavaScript 工具库](https://lodash.com/)
- [Day.js 日期处理](https://day.js.org/)

---

**最后更新**: 2025-11-01
**维护者**: 开发团队
