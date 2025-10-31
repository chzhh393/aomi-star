# 📱 技术栈说明

> 项目使用的技术和工具详细说明

## 🛠️ 核心技术

### 前端技术

| 技术 | 版本 | 用途 | 文档链接 |
|------|------|------|---------|
| 微信小程序 | 基础库 2.20.1+ | 小程序框架 | [官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/) |
| WXML | - | 页面结构 | [WXML 文档](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/) |
| WXSS | - | 页面样式 | [WXSS 文档](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html) |
| JavaScript | ES6+ | 业务逻辑 | [ES6 教程](https://es6.ruanyifeng.com/) |

### 后端技术

| 技术 | 版本 | 用途 | 文档链接 |
|------|------|------|---------|
| 微信云开发 | - | 后端服务 | [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html) |
| Node.js | 10+ | 云函数运行环境 | [Node.js 文档](https://nodejs.org/zh-cn/docs/) |
| wx-server-sdk | latest | 云开发 SDK | [SDK 文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/) |

## 🔧 开发工具

### 必备工具

| 工具 | 用途 | 下载链接 |
|------|------|---------|
| 微信开发者工具 | 小程序开发和调试 | [下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| VS Code | 代码编辑(可选) | [下载](https://code.visualstudio.com/) |
| Node.js | 包管理和工具 | [下载](https://nodejs.org/) |

### 推荐插件(VS Code)

| 插件 | 功能 |
|------|------|
| minapp | 小程序标签补全 |
| wechat-snippet | 代码片段 |
| ESLint | 代码检查 |
| Prettier | 代码格式化 |

## 📦 核心依赖

### 云函数依赖

```json
{
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

### 小程序依赖

小程序原生开发无需 package.json,所有 API 通过 `wx` 全局对象访问。

## 🎨 UI 组件

### 使用的组件库

当前使用微信小程序原生组件:

| 组件 | 用途 |
|------|------|
| view | 视图容器 |
| text | 文本 |
| button | 按钮 |
| image | 图片 |
| scroll-view | 可滚动视图 |
| swiper | 轮播图 |

[查看所有组件](https://developers.weixin.qq.com/miniprogram/dev/component/)

### 未来可能引入

- [WeUI](https://github.com/Tencent/weui-wxss) - 微信官方 UI 组件库
- [Vant Weapp](https://vant-contrib.gitee.io/vant-weapp/) - 有赞小程序 UI 组件库

## 🗄️ 数据存储

### 云数据库

| 特性 | 说明 |
|------|------|
| 类型 | NoSQL 文档型数据库 |
| 查询 | 支持复杂查询和聚合 |
| 权限 | 细粒度权限控制 |
| 容量 | 根据套餐不同 |

### 本地存储

| API | 容量 | 用途 |
|-----|------|------|
| wx.setStorageSync | 10MB | 同步存储 |
| wx.setStorage | 10MB | 异步存储 |
| wx.getStorageSync | - | 同步读取 |
| wx.getStorage | - | 异步读取 |

## 🔐 云开发能力

### 1. 云函数

**特点**:
- Node.js 运行环境
- 自动鉴权
- 弹性伸缩
- 按量付费

**使用场景**:
- 业务逻辑处理
- 数据库操作
- 第三方 API 调用
- 定时任务

### 2. 云数据库

**特点**:
- 文档型 NoSQL
- 支持 CRUD 操作
- 权限管理
- 数据备份

**使用场景**:
- 用户数据存储
- 业务数据管理
- 配置信息

### 3. 云存储

**特点**:
- 文件存储
- CDN 加速
- 权限控制
- 容量可扩展

**使用场景**:
- 图片存储
- 文件上传下载
- 静态资源

## 📊 数据格式

### 日期时间

```javascript
// 推荐使用 ISO 8601 格式
{
  createTime: new Date().toISOString()
  // "2025-11-01T00:00:00.000Z"
}
```

### 响应格式

```javascript
// 成功响应
{
  success: true,
  data: { ... },
  message: "操作成功"
}

// 失败响应
{
  success: false,
  error: "错误信息",
  code: "ERROR_CODE"
}
```

## 🔄 API 设计

### RESTful 风格

虽然云函数不是严格的 REST API,但建议遵循 RESTful 设计原则:

```javascript
// 获取列表
callFunction({ name: 'getUsers' })

// 获取详情
callFunction({ name: 'getUser', data: { id } })

// 创建
callFunction({ name: 'createUser', data: { ... } })

// 更新
callFunction({ name: 'updateUser', data: { id, ... } })

// 删除
callFunction({ name: 'deleteUser', data: { id } })
```

## 🎯 性能优化

### 1. 图片优化

- 使用云存储 + CDN
- 图片压缩
- 懒加载
- 使用 WebP 格式

### 2. 代码优化

- 代码分包
- 按需加载
- 减少 setData
- 使用虚拟列表

### 3. 网络优化

- 请求合并
- 接口缓存
- 预加载数据

## 🔍 调试工具

### 微信开发者工具

| 功能 | 说明 |
|------|------|
| 模拟器 | 模拟小程序运行 |
| 调试器 | Console/Network/Storage 等 |
| AppData | 查看页面数据 |
| Wxml | 查看页面结构 |
| 性能分析 | 分析性能瓶颈 |

### 真机调试

```bash
# 步骤
1. 点击开发者工具"预览"
2. 手机扫码打开
3. 点击右上角...开启调试
4. 在开发者工具中查看真机日志
```

## 📚 学习资源

### 官方文档

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [小程序 API](https://developers.weixin.qq.com/miniprogram/dev/api/)

### 社区资源

- [微信开放社区](https://developers.weixin.qq.com/community/minihome)
- [Awesome 小程序](https://github.com/justjavac/awesome-wechat-weapp)

## 🔮 技术演进计划

### 短期计划

- [ ] 引入状态管理(如需要)
- [ ] 添加 UI 组件库
- [ ] 建立组件库

### 长期计划

- [ ] 支持多端(H5/App)
- [ ] 微前端架构
- [ ] 性能监控系统

## ⚠️ 技术限制

### 小程序限制

| 限制 | 数值 |
|------|------|
| 代码包大小 | 主包 2MB, 总包 20MB |
| 本地存储 | 10MB |
| 文件上传 | 10MB |
| 并发请求 | 10个 |

### 云开发限制

根据套餐不同,具体限制请查看[云开发配额](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/billing/quota.html)。

## 📝 版本要求

### 基础库版本

- 最低版本: 2.2.3
- 推荐版本: 2.20.1+

### 兼容性处理

```javascript
// 检查 API 兼容性
if (wx.canIUse('getSystemInfoSync')) {
  // 可以使用
}

// 版本对比
const version = wx.getSystemInfoSync().SDKVersion
if (compareVersion(version, '2.2.3') >= 0) {
  // 版本足够
}
```

---

**最后更新**: 2025-11-01
**维护者**: 技术团队

> 💡 选择合适的技术栈是项目成功的关键!
