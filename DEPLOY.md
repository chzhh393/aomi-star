# 部署指南

## 部署状态 ✅

### 已完成
- ✅ 所有云函数依赖已安装
- ✅ 管理后台已构建（位于 `admin-web/dist/`）

## 一、云函数部署

### 方法1：使用微信开发者工具（推荐）

1. **打开微信开发者工具**
   - 打开项目：`/Users/shulie/Desktop/SynologyDrive/个人/cursor/aomi-star`

2. **上传云函数**
   - 在左侧目录树中找到 `cloudfunctions` 文件夹
   - 右键点击每个云函数文件夹，选择 **"上传并部署：云端安装依赖"**

   需要上传的云函数列表：
   - ✅ `admin` - 管理后台云函数
   - ✅ `admin-api` - 管理后台API
   - ✅ `candidate` - 候选人管理（已修改）
   - ✅ `login` - 登录云函数
   - ✅ `user` - 用户管理
   - ✅ `scout` - 星探管理

3. **验证部署**
   - 在开发者工具的"云开发"面板中，查看"云函数"列表
   - 确认所有函数状态为"部署成功"

### 方法2：使用命令行工具

```bash
# 安装微信云开发CLI工具（如果还没安装）
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署所有云函数
tcb functions:deploy admin
tcb functions:deploy admin-api
tcb functions:deploy candidate
tcb functions:deploy login
tcb functions:deploy user
tcb functions:deploy scout
```

## 二、管理后台部署

管理后台已构建完成，文件位于：`admin-web/dist/`

### 方法1：部署到微信云开发静态托管

1. **在微信开发者工具中**
   - 点击"云开发"面板
   - 选择"静态网站托管"
   - 点击"上传文件"
   - 选择 `admin-web/dist/` 目录下的所有文件并上传

2. **配置域名（可选）**
   - 在"静态网站托管"设置中，可以绑定自定义域名
   - 默认会提供一个 `.tcloudbaseapp.com` 的域名

### 方法2：部署到腾讯云COS

```bash
# 使用腾讯云COS CLI工具
# 将 dist 目录上传到COS存储桶
coscmd upload -r admin-web/dist/ /
```

### 方法3：部署到其他静态托管服务

可以将 `admin-web/dist/` 目录部署到：
- Vercel
- Netlify
- 阿里云OSS
- 七牛云
- 任何支持静态文件托管的服务

## 三、小程序代码上传

1. **在微信开发者工具中**
   - 点击右上角"上传"按钮
   - 填写版本号和项目备注
   - 点击"上传"

2. **提交审核**
   - 登录 [微信公众平台](https://mp.weixin.qq.com/)
   - 进入"版本管理" → "开发版本"
   - 选择刚上传的版本，点击"提交审核"

## 四、环境配置

### 云开发环境ID
确认 `miniprogram/app.js` 中的环境ID配置：
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的云开发环境ID
  traceUser: true
})
```

### 管理后台配置
确认 `admin-web/src/config/cloudbase.js` 中的配置：
```javascript
export const cloudbaseConfig = {
  env: 'your-env-id' // 替换为你的云开发环境ID
}
```

## 五、部署后检查清单

- [ ] 所有云函数部署成功
- [ ] 管理后台可以正常访问
- [ ] 小程序代码已上传
- [ ] 数据库权限配置正确
- [ ] 云存储权限配置正确
- [ ] 测试以下功能：
  - [ ] 小程序登录
  - [ ] 候选人报名
  - [ ] 管理后台登录
  - [ ] 候选人审核功能（显示补充才艺和直播账号名）
  - [ ] 星探推荐功能

## 六、常见问题

### 云函数调用失败
- 检查云函数是否部署成功
- 检查云函数权限配置
- 查看云函数日志排查错误

### 管理后台无法访问
- 检查静态托管配置
- 检查域名解析
- 查看浏览器控制台错误信息

### 数据库连接失败
- 确认环境ID配置正确
- 检查数据库权限设置
- 确认云开发服务已开通

## 七、本次更新内容

✅ **候选人审核页面优化**
- 新增显示用户自己补充的才艺（橙色标签）
- 新增显示直播账号名（在经验信息块中）
- 移除了才艺等级显示（因为不是用户填写的）

---

**部署时间**: 2026-03-03
**修改文件**:
- `admin-web/src/views/candidates/list.vue`
