# 📄 Pages 模块文档

> 小程序页面模块的详细文档

## 📋 模块概述

Pages 模块包含小程序的所有页面,每个页面由 `.js`、`.json`、`.wxml`、`.wxss` 四个文件组成。

## 📂 目录结构

```
miniprogram/pages/
├── home/                # 首页
│   ├── home.js
│   ├── home.json
│   ├── home.wxml
│   └── home.wxss
└── [其他页面]/
```

## 🎯 页面列表

| 页面路径 | 页面名称 | 功能描述 | 状态 |
|---------|---------|---------|------|
| `pages/home/home` | 首页 | 应用主页面 | ✅ 已完成 |

## 📝 开发规范

### 页面命名

- 使用小写字母
- 多个单词用连字符分隔
- 例: `user-profile`, `order-list`

### 页面结构

```javascript
// pageName.js
Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 页面加载时执行
  },

  onShow() {
    // 页面显示时执行
  },

  // 自定义方法
  handleClick() {
    // 处理逻辑
  }
})
```

### 页面配置

```json
// pageName.json
{
  "navigationBarTitleText": "页面标题",
  "usingComponents": {
    "custom-component": "/components/custom-component/index"
  }
}
```

## 🔧 常用功能

### 页面跳转

```javascript
// 保留当前页面,跳转到应用内的某个页面
wx.navigateTo({
  url: '/pages/detail/detail?id=123'
})

// 关闭当前页面,跳转到应用内的某个页面
wx.redirectTo({
  url: '/pages/index/index'
})

// 跳转到 tabBar 页面
wx.switchTab({
  url: '/pages/index/index'
})
```

### 数据绑定

```xml
<!-- wxml -->
<view>{{message}}</view>
<view wx:for="{{list}}" wx:key="id">
  {{item.name}}
</view>
```

```javascript
// js
Page({
  data: {
    message: 'Hello World',
    list: [{id: 1, name: 'Item 1'}]
  }
})
```

### 事件处理

```xml
<!-- wxml -->
<button bindtap="handleClick">点击</button>
```

```javascript
// js
Page({
  handleClick(e) {
    console.log('点击事件', e)
  }
})
```

## 📚 功能文档

详细的功能文档请查看 [features](./features/) 目录:

- [首页功能](./features/home.md) (待创建)

## 🔨 实施指南

开发新页面的步骤请查看 [implementation](./implementation/) 目录:

- [创建新页面](./implementation/create-new-page.md) (待创建)
- [页面性能优化](./implementation/performance-optimization.md) (待创建)

## 📝 开发日志

查看页面模块的开发日志: [dev-logs](./dev-logs/)

## 🐛 问题追踪

查看页面相关的问题: [issues](./issues/)

## 🔗 相关链接

- [微信小程序页面文档](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page.html)
- [页面路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)
- [页面生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)

---

**最后更新**: 2025-11-01
**维护者**: 前端团队
