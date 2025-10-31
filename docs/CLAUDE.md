# 🤖 Aomi Star - AI 开发助手指南

> 本文档为 AI 助手(如 Claude)提供项目开发指导,帮助 AI 更好地理解项目结构和开发规范。

## 📋 项目概览

**项目名称**: Aomi Star
**项目类型**: 微信小程序
**技术栈**: 微信小程序原生框架 + 微信云开发
**开发环境**: macOS
**开发工具**: 微信开发者工具

## 🎯 项目定位

这是一个基于微信小程序的项目,使用微信云开发作为后端服务。

## 📂 项目结构

```
aomi-star/
├── miniprogram/              # 小程序前端代码
│   ├── pages/               # 页面目录
│   │   └── home/           # 首页
│   ├── components/         # 自定义组件
│   ├── utils/              # 工具函数(待创建)
│   ├── app.js              # 小程序入口(含云开发初始化)
│   ├── app.json            # 小程序配置
│   ├── app.wxss            # 全局样式
│   └── sitemap.json        # 索引配置
│
├── cloudfunctions/          # 云函数目录
│   └── [云函数名]/         # 各个云函数
│
├── docs/                    # 📚 项目文档(完整文档系统)
│   ├── README.md           # 文档导航中枢
│   └── ...                 # 其他文档
│
├── project.config.json      # 项目配置
└── project.private.config.json  # 私有配置
```

## 🔧 开发规范

### 文件命名规范

- **页面/组件**: 小写字母,连字符分隔
  - 例: `user-profile`, `home-page`
- **JS 文件**: 小写驼峰
  - 例: `userApi.js`, `dateUtil.js`
- **云函数**: 小写字母,连字符分隔
  - 例: `get-user-info`, `send-message`

### 代码风格

1. **缩进**: 2 个空格
2. **引号**: 使用单引号
3. **分号**: 语句结尾添加分号
4. **命名**:
   - 变量/函数: 小驼峰 `userName`
   - 常量: 大写下划线 `MAX_COUNT`
   - 类/组件: 大驼峰 `UserProfile`

### 小程序开发约定

#### 页面结构

每个页面包含4个文件:
```
pages/pageName/
├── pageName.js       # 页面逻辑
├── pageName.json     # 页面配置
├── pageName.wxml     # 页面结构
└── pageName.wxss     # 页面样式
```

#### Page 生命周期

```javascript
Page({
  data: {
    // 页面数据
  },
  onLoad(options) {
    // 页面加载
  },
  onShow() {
    // 页面显示
  },
  onReady() {
    // 页面初次渲染完成
  }
})
```

#### 组件开发规范

```javascript
Component({
  properties: {
    // 组件属性
  },
  data: {
    // 组件内部数据
  },
  methods: {
    // 组件方法
  },
  lifetimes: {
    attached() {},
    detached() {}
  }
})
```

### 云开发规范

#### 云函数结构

```javascript
// cloudfunctions/functionName/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  // 获取调用者信息
  const wxContext = cloud.getWXContext()

  try {
    // 业务逻辑
    return {
      success: true,
      data: {}
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
```

#### 云函数调用

```javascript
wx.cloud.callFunction({
  name: 'functionName',
  data: {
    // 参数
  }
}).then(res => {
  console.log(res.result)
})
```

## 🚀 AI 助手工作流程

### 1. 接到新任务时

**首先阅读**:
- [@docs/README.md](./README.md) - 了解文档结构
- [@docs/architecture/system-overview.md](./architecture/system-overview.md) - 理解系统架构

**然后确认**:
- 任务属于哪个模块?
- 需要查看哪些相关文档?
- 是否需要创建新文档?

### 2. 开发新功能

**步骤**:
1. 查看相关模块文档
2. 遵循项目代码规范
3. 创建必要的文件
4. 测试功能
5. 记录开发日志(使用 `docs/dev-logs/TEMPLATE.md`)

### 3. 修复问题

**步骤**:
1. 查看问题追踪 `docs/issues/pending/`
2. 分析问题原因
3. 实施修复
4. 创建问题解决文档移至 `docs/issues/resolved/`
5. 更新相关文档

### 4. 文档维护

**原则**:
- 所有重要改动都要更新文档
- 使用 `docs/dev-logs/TEMPLATE.md` 模板记录
- 临时笔记放在 `docs/temp/`
- 正式文档放在对应的模块目录

## 📝 常用命令模板

### 创建新页面

```bash
# 创建页面目录
mkdir -p miniprogram/pages/pageName

# 创建页面文件(通过工具或手动创建)
# - pageName.js
# - pageName.json
# - pageName.wxml
# - pageName.wxss

# 在 app.json 中注册页面
```

### 创建新组件

```bash
# 创建组件目录
mkdir -p miniprogram/components/componentName

# 创建组件文件
# - componentName.js
# - componentName.json
# - componentName.wxml
# - componentName.wxss
```

### 创建云函数

```bash
# 在云函数根目录创建
mkdir -p cloudfunctions/functionName
cd cloudfunctions/functionName

# 初始化
npm init -y

# 安装依赖
npm install wx-server-sdk

# 创建 index.js
```

## 🔍 问题排查指南

### 常见问题

1. **云开发初始化失败**
   - 检查 `miniprogram/app.js` 中的 `env` 参数
   - 确认已开通云开发服务

2. **页面不显示**
   - 检查 `app.json` 中是否注册了页面路径
   - 确认 `.wxml` 文件语法正确

3. **组件不生效**
   - 检查页面的 `.json` 文件中是否引用了组件
   - 确认组件路径正确

4. **云函数调用失败**
   - 确认云函数已上传部署
   - 检查云函数权限配置

## 💡 最佳实践

### 代码组织

1. **模块化**: 相关功能放在同一目录
2. **复用性**: 公共逻辑抽取为工具函数或组件
3. **可维护性**: 添加必要的注释和文档

### 错误处理

```javascript
// 统一的错误处理
try {
  const res = await wx.cloud.callFunction({...})
  if (res.result.success) {
    // 成功处理
  } else {
    // 失败处理
    wx.showToast({
      title: res.result.error || '操作失败',
      icon: 'none'
    })
  }
} catch (error) {
  console.error('调用失败', error)
  wx.showToast({
    title: '网络错误',
    icon: 'none'
  })
}
```

### 性能优化

1. **按需加载**: 使用分包加载
2. **图片优化**: 使用云存储 + CDN
3. **数据缓存**: 合理使用本地存储
4. **请求优化**: 避免频繁调用云函数

## 🎓 学习资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [小程序 API 文档](https://developers.weixin.qq.com/miniprogram/dev/api/)

## 📞 获取帮助

遇到问题时:

1. 查看项目文档 `docs/`
2. 搜索已解决问题 `docs/issues/resolved/`
3. 查看官方文档
4. 创建问题追踪 `docs/issues/pending/`

---

**最后更新**: 2025-11-01
**维护者**: 开发团队

> 💡 提示: AI 助手在工作前应该先阅读本文档,确保遵循项目规范!
