# 生命周期最佳实践

> 详细的生命周期使用场景和注意事项

**关联**: [SKILL.md](./SKILL.md)
**版本**: 1.0.0
**更新日期**: 2025-11-05

---

## 📊 生命周期执行顺序图

```
页面首次加载
├── onLoad(options)          ← 接收参数、初始化数据
├── onShow()                 ← 刷新数据、恢复状态
├── onReady()                ← 页面渲染完成
└── （用户交互...）

用户切换到其他页面
└── onHide()                 ← 暂停定时器、保存状态

用户返回此页面
└── onShow()                 ← 再次执行

用户关闭页面
└── onUnload()               ← 清理资源
```

---

## 🔄 onLoad - 页面加载（只执行一次）

### 适用场景

1. **接收和解析页面参数**
2. **初始化页面基础数据**
3. **设置页面标题**
4. **检查用户权限**
5. **加载初始数据**

### 详细示例

#### 1. 解析页面参数

```javascript
Page({
  onLoad(options) {
    // options 包含通过 URL 传递的参数
    console.log('页面参数', options);

    // 示例 URL: /pages/detail/detail?id=123&type=candidate
    const { id, type, source } = options;

    // 存储到 data 中
    this.setData({
      pageId: id,
      pageType: type,
      pageSource: source || 'direct'
    });

    // 根据参数加载不同数据
    if (type === 'candidate') {
      this.loadCandidateDetail(id);
    } else if (type === 'anchor') {
      this.loadAnchorDetail(id);
    }
  }
});
```

#### 2. 解析场景参数（扫码进入）

```javascript
Page({
  onLoad(options) {
    // 场景值来源（扫码、分享链接等）
    if (options.scene) {
      this.parseSceneParams(options.scene);
    }

    // 二维码链接参数
    if (options.q) {
      const url = decodeURIComponent(options.q);
      this.parseQRCodeUrl(url);
    }
  },

  parseSceneParams(scene) {
    // 场景参数通常是加密的字符串
    // 例如：scene = "invite_ABC123"
    const sceneParser = require('../../utils/scene-parser');
    const params = sceneParser.parse(scene);

    this.setData({
      sceneType: params.type,
      inviteCode: params.code
    });

    // 根据场景类型处理
    if (params.type === 'invite') {
      this.handleInviteCode(params.code);
    }
  },

  parseQRCodeUrl(url) {
    // 解析二维码中的完整 URL
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const type = urlObj.searchParams.get('type');

    this.setData({
      inviteCode: code,
      inviteType: type
    });
  }
});
```

#### 3. 设置页面标题

```javascript
Page({
  onLoad(options) {
    const { type } = options;

    // 动态设置标题
    const titles = {
      'create': '创建候选人',
      'edit': '编辑候选人',
      'detail': '候选人详情'
    };

    wx.setNavigationBarTitle({
      title: titles[type] || '页面'
    });

    // 也可以动态设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#000000'
    });
  }
});
```

#### 4. 权限检查

```javascript
Page({
  onLoad(options) {
    // 先检查权限，再加载数据
    this.checkPermission()
      .then((hasPermission) => {
        if (hasPermission) {
          this.loadInitialData();
        }
      });
  },

  async checkPermission() {
    try {
      const roleManager = require('../../utils/role-manager');
      const currentRole = await roleManager.getCurrentRole();

      // 定义允许访问的角色
      const allowedRoles = ['hr', 'admin', 'operations'];

      if (!allowedRoles.includes(currentRole)) {
        wx.showModal({
          title: '无权限',
          content: '您没有权限访问此页面',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return false;
      }

      this.setData({ currentRole });
      return true;
    } catch (error) {
      console.error('权限检查失败', error);
      return false;
    }
  }
});
```

#### 5. 加载初始数据

```javascript
Page({
  data: {
    isLoading: true,
    userData: null,
    relatedList: []
  },

  onLoad(options) {
    this.loadInitialData();
  },

  async loadInitialData() {
    this.setData({ isLoading: true });

    try {
      // 并行加载多个数据源
      const [userData, relatedList] = await Promise.all([
        this.loadUserData(),
        this.loadRelatedList()
      ]);

      this.setData({
        userData,
        relatedList,
        isLoading: false
      });
    } catch (error) {
      console.error('数据加载失败', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  async loadUserData() {
    const result = await wx.cloud.callFunction({
      name: 'get-user-data'
    });
    return result.result.data;
  },

  async loadRelatedList() {
    const result = await wx.cloud.callFunction({
      name: 'get-related-list'
    });
    return result.result.data;
  }
});
```

### ⚠️ 注意事项

1. **onLoad 只执行一次**：用户返回到此页面时不会再次执行
2. **避免耗时操作阻塞渲染**：使用异步加载数据
3. **参数解析要考虑缺失情况**：使用默认值或容错处理
4. **不要在 onLoad 中直接操作 DOM**：DOM 还未渲染完成

```javascript
// ❌ 错误：onLoad 中操作 DOM
Page({
  onLoad() {
    // DOM 还没渲染，这里无法获取
    const query = wx.createSelectorQuery();
    query.select('#container').boundingClientRect();
    query.exec();  // 获取不到
  }
});

// ✅ 正确：在 onReady 中操作 DOM
Page({
  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#container').boundingClientRect();
    query.exec((res) => {
      console.log('容器高度', res[0].height);
    });
  }
});
```

---

## 👁️ onShow - 页面显示（每次显示都执行）

### 适用场景

1. **刷新数据**（从其他页面返回时）
2. **恢复页面状态**
3. **重新获取角色信息**（可能被修改）
4. **启动定时任务**

### 详细示例

#### 1. 刷新数据

```javascript
Page({
  data: {
    needRefresh: false,
    lastUpdateTime: null
  },

  onShow() {
    // 方案 1：每次显示都刷新
    this.refreshData();

    // 方案 2：根据标志决定是否刷新
    if (this.data.needRefresh) {
      this.refreshData();
      this.setData({ needRefresh: false });
    }

    // 方案 3：根据时间间隔决定是否刷新
    const now = Date.now();
    const lastUpdate = this.data.lastUpdateTime || 0;
    const interval = 5 * 60 * 1000; // 5分钟

    if (now - lastUpdate > interval) {
      this.refreshData();
      this.setData({ lastUpdateTime: now });
    }
  },

  async refreshData() {
    console.log('刷新数据');
    // 重新加载数据
  }
});
```

#### 2. 检查角色变化

```javascript
Page({
  data: {
    currentRole: ''
  },

  onLoad() {
    this.initUserRole();
  },

  onShow() {
    // 用户可能在其他页面切换了角色
    this.checkRoleChange();
  },

  async initUserRole() {
    const roleManager = require('../../utils/role-manager');
    const currentRole = await roleManager.getCurrentRole();
    this.setData({ currentRole });
  },

  async checkRoleChange() {
    const roleManager = require('../../utils/role-manager');
    const currentRole = await roleManager.getCurrentRole();

    // 如果角色变化了
    if (currentRole !== this.data.currentRole) {
      console.log('角色变化', this.data.currentRole, '->', currentRole);
      this.setData({ currentRole });

      // 角色变化可能需要重新加载数据
      this.refreshData();

      // 或者重新检查权限
      this.checkPermission();
    }
  }
});
```

#### 3. 启动定时任务

```javascript
Page({
  data: {
    config: {
      autoRefresh: true,
      refreshInterval: 30000  // 30秒
    }
  },

  onShow() {
    // 页面显示时启动定时刷新
    if (this.data.config.autoRefresh) {
      this.startAutoRefresh();
    }
  },

  onHide() {
    // 页面隐藏时停止定时刷新
    this.stopAutoRefresh();
  },

  startAutoRefresh() {
    if (this.refreshTimer) return;  // 避免重复启动

    this.refreshTimer = setInterval(() => {
      console.log('自动刷新');
      this.refreshData();
    }, this.data.config.refreshInterval);
  },

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  onUnload() {
    // 页面卸载时确保清理
    this.stopAutoRefresh();
  }
});
```

#### 4. 恢复页面状态

```javascript
Page({
  onShow() {
    // 恢复滚动位置
    this.restoreScrollPosition();

    // 恢复播放状态
    this.restorePlayState();
  },

  onHide() {
    // 保存滚动位置
    this.saveScrollPosition();

    // 保存播放状态
    this.savePlayState();
  },

  saveScrollPosition() {
    const query = wx.createSelectorQuery();
    query.select('#scroll-view').scrollOffset();
    query.exec((res) => {
      if (res[0]) {
        this.scrollTop = res[0].scrollTop;
      }
    });
  },

  restoreScrollPosition() {
    if (this.scrollTop !== undefined) {
      this.setData({
        scrollTop: this.scrollTop
      });
    }
  },

  savePlayState() {
    // 保存视频播放位置
    if (this.videoContext) {
      this.videoContext.pause();
      // 保存播放时间等状态
    }
  },

  restorePlayState() {
    // 恢复视频播放
    if (this.videoContext && this.shouldAutoPlay) {
      this.videoContext.play();
    }
  }
});
```

### ⚠️ 注意事项

1. **onShow 会多次执行**：每次页面显示都会触发
2. **首次加载也会执行**：在 onLoad 之后立即执行
3. **避免重复初始化**：使用标志位控制
4. **性能考虑**：不要每次都全量刷新数据

```javascript
// ❌ 错误：每次 onShow 都全量刷新
Page({
  onShow() {
    this.loadAllData();  // 太频繁了
  }
});

// ✅ 正确：智能刷新
Page({
  data: {
    needRefresh: false
  },

  onShow() {
    if (this.data.needRefresh) {
      this.loadAllData();
      this.setData({ needRefresh: false });
    } else {
      this.loadPartialData();  // 只刷新必要的数据
    }
  }
});
```

---

## ✅ onReady - 页面首次渲染完成（只执行一次）

### 适用场景

1. **获取节点信息**（宽高、位置等）
2. **初始化动画**
3. **初始化图表**
4. **获取组件实例**

### 详细示例

#### 1. 获取节点信息

```javascript
Page({
  onReady() {
    this.getContainerHeight();
    this.getScrollViewPosition();
  },

  getContainerHeight() {
    const query = wx.createSelectorQuery();
    query.select('#container').boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        console.log('容器高度', res[0].height);
        this.setData({
          containerHeight: res[0].height
        });
      }
    });
  },

  getScrollViewPosition() {
    const query = wx.createSelectorQuery();
    query.select('#scroll-view').scrollOffset();
    query.select('#scroll-view').boundingClientRect();
    query.exec((res) => {
      console.log('滚动位置', res[0].scrollTop);
      console.log('容器信息', res[1]);
    });
  }
});
```

#### 2. 初始化动画

```javascript
Page({
  data: {
    animation: null
  },

  onReady() {
    this.initAnimation();
  },

  initAnimation() {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out'
    });

    this.animation = animation;

    // 执行动画
    this.startAnimation();
  },

  startAnimation() {
    this.animation
      .translateY(-20)
      .opacity(1)
      .step();

    this.setData({
      animation: this.animation.export()
    });
  }
});
```

#### 3. 获取组件实例

```javascript
Page({
  onReady() {
    // 获取自定义组件实例
    this.customCard = this.selectComponent('#custom-card');

    // 调用组件方法
    if (this.customCard) {
      this.customCard.refresh();
    }
  },

  refreshCard() {
    if (this.customCard) {
      this.customCard.refresh();
    }
  }
});
```

#### 4. 初始化第三方库

```javascript
Page({
  onReady() {
    // 初始化图表库
    this.initChart();
  },

  initChart() {
    // 使用 canvas 绘制图表
    const ctx = wx.createCanvasContext('myCanvas', this);

    // 绘制逻辑...
    ctx.draw();
  }
});
```

### ⚠️ 注意事项

1. **onReady 只执行一次**：与 onLoad 类似
2. **此时 DOM 已渲染完成**：可以安全操作节点
3. **可以获取组件实例**：使用 selectComponent
4. **不要在这里做耗时操作**：会阻塞用户交互

---

## 👋 onHide - 页面隐藏

### 适用场景

1. **暂停定时器**
2. **暂停音视频播放**
3. **保存临时状态**
4. **释放部分资源**

### 详细示例

#### 1. 暂停定时器

```javascript
Page({
  onShow() {
    this.startTimer();
  },

  onHide() {
    this.stopTimer();
  },

  startTimer() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      console.log('定时任务');
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
});
```

#### 2. 暂停播放器

```javascript
Page({
  onLoad() {
    this.videoContext = wx.createVideoContext('myVideo', this);
    this.audioContext = wx.createInnerAudioContext();
  },

  onHide() {
    // 暂停视频
    if (this.videoContext) {
      this.videoContext.pause();
    }

    // 暂停音频
    if (this.audioContext) {
      this.audioContext.pause();
    }
  },

  onUnload() {
    // 完全释放资源
    if (this.audioContext) {
      this.audioContext.destroy();
    }
  }
});
```

#### 3. 保存草稿

```javascript
Page({
  data: {
    formData: {
      name: '',
      phone: '',
      email: ''
    }
  },

  onHide() {
    // 保存表单草稿
    this.saveDraft();
  },

  saveDraft() {
    const draft = {
      formData: this.data.formData,
      timestamp: Date.now()
    };

    wx.setStorageSync('form_draft', draft);
    console.log('草稿已保存');
  },

  onLoad() {
    // 恢复草稿
    this.restoreDraft();
  },

  restoreDraft() {
    try {
      const draft = wx.getStorageSync('form_draft');
      if (draft) {
        // 检查草稿是否过期（24小时）
        const isExpired = Date.now() - draft.timestamp > 24 * 60 * 60 * 1000;
        if (!isExpired) {
          this.setData({
            formData: draft.formData
          });
          wx.showToast({
            title: '已恢复草稿',
            icon: 'none'
          });
        }
      }
    } catch (error) {
      console.error('恢复草稿失败', error);
    }
  }
});
```

---

## 🗑️ onUnload - 页面卸载

### 适用场景

1. **清理定时器**
2. **取消监听器**
3. **释放资源**
4. **清理缓存**

### 详细示例

#### 1. 清理定时器

```javascript
Page({
  onLoad() {
    this.timer = setInterval(() => {
      console.log('定时任务');
    }, 1000);
  },

  onUnload() {
    // 清理定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // 清理延时任务
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
});
```

#### 2. 取消监听器

```javascript
const EventBus = require('../../utils/event-bus');

Page({
  onLoad() {
    // 添加监听
    this.handleDataUpdate = (data) => {
      console.log('数据更新', data);
    };
    EventBus.on('data-updated', this.handleDataUpdate);
  },

  onUnload() {
    // 移除监听
    EventBus.off('data-updated', this.handleDataUpdate);
  }
});
```

#### 3. 释放音视频资源

```javascript
Page({
  onLoad() {
    this.videoContext = wx.createVideoContext('myVideo', this);
    this.audioContext = wx.createInnerAudioContext();
  },

  onUnload() {
    // 销毁音频上下文
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }

    // 视频上下文不需要手动销毁，但可以释放引用
    this.videoContext = null;
  }
});
```

#### 4. 清理缓存

```javascript
Page({
  onLoad() {
    // 创建临时缓存
    this.cache = {};
  },

  onUnload() {
    // 清理内存缓存
    this.cache = null;

    // 清理本地存储的临时数据（可选）
    wx.removeStorageSync('temp_data');
  }
});
```

---

## 🔄 下拉刷新和上拉加载

### onPullDownRefresh - 下拉刷新

```javascript
Page({
  data: {
    dataList: [],
    page: 1,
    pageSize: 20
  },

  onPullDownRefresh() {
    console.log('下拉刷新');

    // 重置分页
    this.setData({
      page: 1,
      dataList: [],
      hasMore: true
    });

    // 加载数据
    this.loadData()
      .then(() => {
        wx.stopPullDownRefresh();
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        });
      })
      .catch((error) => {
        wx.stopPullDownRefresh();
        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        });
      });
  },

  async loadData() {
    const result = await wx.cloud.callFunction({
      name: 'get-data-list',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      }
    });

    this.setData({
      dataList: result.result.data,
      hasMore: result.result.data.length === this.data.pageSize
    });
  }
});
```

**配置文件**（页面的 .json）：
```json
{
  "enablePullDownRefresh": true,
  "backgroundColor": "#f8f8f8",
  "backgroundTextStyle": "dark"
}
```

### onReachBottom - 上拉加载更多

```javascript
Page({
  data: {
    dataList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoading: false
  },

  onReachBottom() {
    console.log('触底加载');

    // 检查是否还有更多数据
    if (!this.data.hasMore) {
      wx.showToast({
        title: '没有更多了',
        icon: 'none'
      });
      return;
    }

    // 防止重复加载
    if (this.data.isLoading) {
      return;
    }

    // 加载下一页
    this.setData({
      page: this.data.page + 1
    });

    this.loadMoreData();
  },

  async loadMoreData() {
    this.setData({ isLoading: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'get-data-list',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      });

      const newList = result.result.data;

      this.setData({
        dataList: [...this.data.dataList, ...newList],
        hasMore: newList.length === this.data.pageSize,
        isLoading: false
      });
    } catch (error) {
      console.error('加载失败', error);
      this.setData({
        page: this.data.page - 1,  // 回退页码
        isLoading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  }
});
```

**配置文件**（页面的 .json）：
```json
{
  "onReachBottomDistance": 50
}
```

---

## 📤 onShareAppMessage - 分享配置

```javascript
Page({
  data: {
    shareTitle: '邀请你加入 Aomi Star',
    sharePath: '/pages/index/index',
    shareImageUrl: '/images/share-cover.png'
  },

  onShareAppMessage(options) {
    console.log('分享来源', options.from);  // 'button' | 'menu'
    console.log('触发组件', options.target);

    // 从按钮触发
    if (options.from === 'button') {
      const { title, path } = options.target.dataset;
      return {
        title: title || this.data.shareTitle,
        path: path || this.data.sharePath,
        imageUrl: this.data.shareImageUrl
      };
    }

    // 从右上角菜单触发
    return {
      title: this.data.shareTitle,
      path: this.data.sharePath,
      imageUrl: this.data.shareImageUrl
    };
  },

  // 分享到朋友圈（需要自定义转发配置）
  onShareTimeline() {
    return {
      title: '邀请你加入 Aomi Star',
      query: 'source=timeline',
      imageUrl: '/images/share-cover.png'
    };
  }
});
```

**WXML 中的分享按钮**：
```xml
<button
  open-type="share"
  data-title="自定义分享标题"
  data-path="/pages/detail/detail?id=123"
>
  分享
</button>
```

---

## 🎯 生命周期最佳实践总结

### 1. 执行顺序记忆

```
首次进入页面：
onLoad → onShow → onReady

返回此页面：
onShow

离开页面：
onHide

关闭页面：
onUnload
```

### 2. 职责划分

| 生命周期 | 主要职责 | 执行次数 |
|---------|---------|---------|
| onLoad | 接收参数、初始化、权限检查 | 1次 |
| onShow | 刷新数据、恢复状态、启动定时器 | 多次 |
| onReady | 获取节点、初始化动画、获取组件 | 1次 |
| onHide | 暂停定时器、保存状态 | 多次 |
| onUnload | 清理资源、移除监听 | 1次 |

### 3. 常见错误

```javascript
// ❌ 错误 1：在 onLoad 中操作 DOM
Page({
  onLoad() {
    const query = wx.createSelectorQuery();
    query.select('#container').boundingClientRect();  // 获取不到
  }
});

// ✅ 正确：在 onReady 中操作 DOM
Page({
  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#container').boundingClientRect();
  }
});

// ❌ 错误 2：在 onUnload 中没有清理定时器
Page({
  onLoad() {
    this.timer = setInterval(() => {}, 1000);
  }
  // 忘记在 onUnload 中清理
});

// ✅ 正确：必须清理
Page({
  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
});

// ❌ 错误 3：每次 onShow 都全量刷新
Page({
  onShow() {
    this.loadAllData();  // 太频繁
  }
});

// ✅ 正确：智能刷新
Page({
  onShow() {
    if (this.shouldRefresh()) {
      this.loadAllData();
    }
  }
});
```

---

**最后更新**: 2025-11-05
**维护者**: 开发团队
