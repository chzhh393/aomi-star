# 🧩 Components 模块文档

> 小程序自定义组件模块的详细文档

## 📋 模块概述

Components 模块包含所有可复用的自定义组件,每个组件由 `.js`、`.json`、`.wxml`、`.wxss` 四个文件组成。

## 📂 目录结构

```
miniprogram/components/
├── [组件名]/
│   ├── index.js        # 组件逻辑
│   ├── index.json      # 组件配置
│   ├── index.wxml      # 组件结构
│   └── index.wxss      # 组件样式
```

## 🎯 组件列表

| 组件名 | 功能描述 | 使用场景 | 状态 |
|--------|---------|---------|------|
| - | 暂无 | - | - |

## 📝 开发规范

### 组件模板

```javascript
// index.js
Component({
  options: {
    multipleSlots: true,      // 启用多slot支持
    styleIsolation: 'isolated' // 样式隔离
  },

  properties: {
    // 组件的对外属性
    title: {
      type: String,
      value: '默认标题'
    },
    count: {
      type: Number,
      value: 0
    }
  },

  data: {
    // 组件的内部数据
    innerValue: ''
  },

  lifetimes: {
    // 生命周期函数
    attached() {
      // 在组件实例进入页面节点树时执行
    },
    detached() {
      // 在组件实例被从页面节点树移除时执行
    }
  },

  methods: {
    // 组件的方法
    handleTap() {
      // 触发事件
      this.triggerEvent('tap', { detail: 'data' })
    },

    _privateMethod() {
      // 私有方法(建议以_开头)
    }
  }
})
```

### 组件配置

```json
// index.json
{
  "component": true,
  "usingComponents": {
    "sub-component": "/components/sub-component/index"
  }
}
```

### 组件模板

```xml
<!-- index.wxml -->
<view class="component-wrapper">
  <view class="component-title">{{title}}</view>
  <view class="component-content">
    <!-- 默认插槽 -->
    <slot></slot>

    <!-- 具名插槽 -->
    <slot name="footer"></slot>
  </view>
  <view bindtap="handleTap">点击触发事件</view>
</view>
```

### 组件样式

```css
/* index.wxss */
.component-wrapper {
  padding: 20rpx;
}

.component-title {
  font-size: 32rpx;
  font-weight: bold;
}
```

## 🔧 组件使用

### 1. 注册组件

在页面的 `.json` 文件中注册:

```json
{
  "usingComponents": {
    "custom-component": "/components/custom-component/index"
  }
}
```

### 2. 使用组件

```xml
<custom-component
  title="标题"
  count="{{count}}"
  bind:tap="handleComponentTap">
  <!-- 默认插槽内容 -->
  <view>插槽内容</view>

  <!-- 具名插槽内容 -->
  <view slot="footer">底部内容</view>
</custom-component>
```

### 3. 处理组件事件

```javascript
Page({
  handleComponentTap(e) {
    console.log('组件触发的事件', e.detail)
  }
})
```

## 🎨 组件设计原则

### 1. 单一职责

每个组件只负责一个功能模块,保持简单和专注。

### 2. 可复用性

组件应该是通用的,可以在不同场景下使用。

### 3. 可配置性

通过 properties 提供丰富的配置选项。

### 4. 松耦合

组件之间避免直接依赖,通过事件通信。

### 5. 样式隔离

使用 `styleIsolation` 避免样式冲突。

## 📚 常用组件类型

### 基础组件
- 按钮组件
- 输入框组件
- 卡片组件

### 布局组件
- 列表组件
- 网格组件
- 标签页组件

### 业务组件
- 用户信息卡片
- 商品卡片
- 订单列表项

### 功能组件
- 上拉加载
- 下拉刷新
- 图片上传

## 🔨 实施指南

- [创建新组件](./implementation/create-new-component.md) (待创建)
- [组件通信方式](./implementation/component-communication.md) (待创建)
- [组件性能优化](./implementation/performance-optimization.md) (待创建)

## 📚 功能文档

详细的功能文档请查看 [features](./features/) 目录。

## 📝 开发日志

查看组件模块的开发日志: [dev-logs](./dev-logs/)

## 🐛 问题追踪

查看组件相关的问题: [issues](./issues/)

## ⚠️ 注意事项

1. **组件命名**: 使用小写字母和连字符,避免与原生组件重名
2. **样式隔离**: 建议使用 `styleIsolation: 'isolated'`
3. **数据监听**: 使用 `observers` 监听属性变化
4. **性能优化**: 避免频繁的 setData 操作
5. **兼容性**: 注意基础库版本要求

## 🔗 相关链接

- [微信小程序自定义组件文档](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/)
- [组件生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html)
- [组件通信](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/events.html)

---

**最后更新**: 2025-11-01
**维护者**: 前端团队
