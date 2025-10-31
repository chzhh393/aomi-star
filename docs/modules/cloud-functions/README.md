# ☁️ Cloud Functions 模块文档

> 微信云函数模块的详细文档

## 📋 模块概述

Cloud Functions 模块包含所有的云函数,运行在云端的 Node.js 代码,用于处理业务逻辑、数据库操作等。

## 📂 目录结构

```
cloudfunctions/
├── [云函数名]/
│   ├── index.js          # 云函数入口文件
│   ├── package.json      # 依赖配置
│   └── config.json       # 云函数配置(可选)
```

## 🎯 云函数列表

| 函数名 | 功能描述 | 触发方式 | 状态 |
|--------|---------|---------|------|
| - | 暂无 | - | - |

## 📝 开发规范

### 云函数模板

```javascript
// index.js
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取调用者信息
  const wxContext = cloud.getWXContext()

  try {
    // 业务逻辑
    const result = await someOperation()

    return {
      success: true,
      data: result,
      openid: wxContext.OPENID
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

### package.json 配置

```json
{
  "name": "function-name",
  "version": "1.0.0",
  "description": "云函数描述",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

## 🔧 常用功能

### 数据库操作

```javascript
const db = cloud.database()
const _ = db.command

// 查询数据
const { data } = await db.collection('users')
  .where({
    status: 'active'
  })
  .get()

// 插入数据
await db.collection('users').add({
  data: {
    name: '用户名',
    createTime: new Date()
  }
})

// 更新数据
await db.collection('users')
  .doc('user-id')
  .update({
    data: {
      status: 'inactive'
    }
  })

// 删除数据
await db.collection('users')
  .doc('user-id')
  .remove()
```

### 云存储操作

```javascript
// 上传文件
const uploadResult = await cloud.uploadFile({
  cloudPath: 'path/to/file.jpg',
  fileContent: buffer
})

// 获取文件下载链接
const { fileList } = await cloud.getTempFileURL({
  fileList: ['cloud://file-id']
})

// 删除文件
await cloud.deleteFile({
  fileList: ['cloud://file-id']
})
```

### 调用其他云函数

```javascript
const result = await cloud.callFunction({
  name: 'other-function',
  data: {
    param: 'value'
  }
})
```

### 获取用户信息

```javascript
const wxContext = cloud.getWXContext()

// OpenID: 用户唯一标识
const openid = wxContext.OPENID

// AppID: 小程序 ID
const appid = wxContext.APPID

// UnionID: 用户在开放平台的唯一标识
const unionid = wxContext.UNIONID
```

## 🚀 部署流程

### 创建云函数

1. 在 `cloudfunctions` 目录下创建新文件夹
2. 创建 `index.js` 和 `package.json`
3. 编写云函数代码

### 本地调试

```bash
cd cloudfunctions/function-name
npm install
```

### 上传部署

在微信开发者工具中:
1. 右键云函数目录
2. 选择"上传并部署: 云端安装依赖"
3. 等待部署完成

### 测试云函数

```javascript
// 在小程序中调用
wx.cloud.callFunction({
  name: 'function-name',
  data: {
    test: true
  }
}).then(res => {
  console.log(res.result)
})
```

## 📚 功能文档

详细的功能文档请查看 [features](./features/) 目录。

## 🔨 实施指南

- [创建新云函数](./implementation/create-new-function.md) (待创建)
- [云函数性能优化](./implementation/performance-optimization.md) (待创建)
- [云函数调试技巧](./implementation/debugging-tips.md) (待创建)

## 📝 开发日志

查看云函数模块的开发日志: [dev-logs](./dev-logs/)

## 🐛 问题追踪

查看云函数相关的问题: [issues](./issues/)

## ⚠️ 注意事项

1. **环境变量**: 使用 `cloud.DYNAMIC_CURRENT_ENV` 自动获取当前环境
2. **超时设置**: 默认超时 20 秒,可在配置中调整
3. **并发限制**: 注意云函数的并发限制
4. **冷启动**: 首次调用可能较慢
5. **日志查看**: 在云开发控制台查看日志

## 🔗 相关链接

- [微信云函数文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/functions.html)
- [wx-server-sdk API](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/)
- [云开发控制台](https://console.cloud.tencent.com/tcb)

---

**最后更新**: 2025-11-01
**维护者**: 后端团队
