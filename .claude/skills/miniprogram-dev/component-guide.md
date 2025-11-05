# 组件开发详细指南

> 组件设计原则、通信模式、复用策略

**关联**: [SKILL.md](./SKILL.md)
**版本**: 1.0.0
**更新日期**: 2025-11-05

---

## 🎯 组件设计原则

### 1. 单一职责原则

每个组件应该只负责一个功能。

```javascript
// ✅ 正确：单一职责
// components/user-card/user-card.js - 只负责显示用户卡片
Component({
  properties: {
    userData: Object
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { userId: this.properties.userData.id });
    }
  }
});

// ❌ 错误：职责过多
// components/user-manager/user-manager.js - 负责显示、编辑、删除等多个功能
Component({
  properties: {
    userData: Object
  },
  methods: {
    handleEdit() { /* ... */ },
    handleDelete() { /* ... */ },
    handleSave() { /* ... */ },
    handleCancel() { /* ... */ }
  }
});
```

### 2. 高内聚，低耦合

组件内部逻辑紧密相关，与外部依赖最小化。

```javascript
// ✅ 正确：通过 properties 和 events 通信
Component({
  properties: {
    title: String,
    items: Array
  },
  methods: {
    handleItemTap(e) {
      const { index } = e.currentTarget.dataset;
      this.triggerEvent('itemtap', { index, item: this.properties.items[index] });
    }
  }
});

// ❌ 错误：直接访问全局变量或页面实例
Component({
  methods: {
    handleTap() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      currentPage.setData({ /* ... */ });  // 不要这样做！
    }
  }
});
```

### 3. 可配置性

通过 properties 提供配置，而不是硬编码。

```javascript
// ✅ 正确：通过 properties 配置
Component({
  properties: {
    type: {
      type: String,
      value: 'default'  // primary | default | danger
    },
    size: {
      type: String,
      value: 'medium'   // small | medium | large
    },
    disabled: {
      type: Boolean,
      value: false
    }
  }
});

// ❌ 错误：硬编码样式和行为
Component({
  data: {
    buttonColor: '#ff0000',
    buttonSize: 32
  }
});
```

### 4. 可复用性

设计时考虑在不同场景下的使用。

```javascript
// ✅ 正确：通用的列表项组件
// components/list-item/list-item.js
Component({
  options: {
    multipleSlots: true
  },
  properties: {
    title: String,
    subtitle: String,
    showArrow: {
      type: Boolean,
      value: true
    }
  }
});

// 使用示例 1：候选人列表
<list-item
  title="{{candidate.name}}"
  subtitle="{{candidate.phone}}"
  bind:tap="handleTap"
/>

// 使用示例 2：设置列表
<list-item
  title="个人信息"
  subtitle="查看和编辑个人信息"
  bind:tap="navigateToProfile"
/>
```

---

## 📐 组件结构标准

### 完整组件模板

```javascript
// components/custom-card/custom-card.js
Component({
  // 1. 组件配置选项
  options: {
    multipleSlots: true,        // 启用多 slot 支持
    addGlobalClass: true,        // 接受外部样式类
    styleIsolation: 'apply-shared'  // 样式隔离方式
  },

  // 2. 组件外部样式类
  externalClasses: ['custom-class', 'title-class'],

  // 3. 组件属性
  properties: {
    // 基础类型
    title: {
      type: String,
      value: '',
      observer: 'onTitleChange'  // 属性变化监听
    },

    // 对象类型
    userData: {
      type: Object,
      value: null
    },

    // 数组类型
    items: {
      type: Array,
      value: []
    },

    // 布尔类型
    showIcon: {
      type: Boolean,
      value: true
    },

    // 数字类型
    maxCount: {
      type: Number,
      value: 10
    }
  },

  // 4. 组件内部数据
  data: {
    isExpanded: false,
    internalCounter: 0
  },

  // 5. 组件生命周期
  lifetimes: {
    created() {
      // 组件实例刚被创建
      console.log('组件创建');
    },

    attached() {
      // 组件实例进入页面节点树
      console.log('组件挂载');
      this.initComponent();
    },

    ready() {
      // 组件布局完成
      console.log('组件就绪');
    },

    moved() {
      // 组件实例被移动到节点树另一个位置
      console.log('组件移动');
    },

    detached() {
      // 组件实例从页面节点树移除
      console.log('组件卸载');
      this.cleanup();
    },

    error(err) {
      // 组件方法抛出错误
      console.error('组件错误', err);
    }
  },

  // 6. 页面生命周期（组件所在页面的生命周期）
  pageLifetimes: {
    show() {
      // 页面显示
      console.log('页面显示');
    },

    hide() {
      // 页面隐藏
      console.log('页面隐藏');
    },

    resize(size) {
      // 页面尺寸变化
      console.log('尺寸变化', size.width, size.height);
    }
  },

  // 7. 组件方法
  methods: {
    // --- 初始化 ---
    initComponent() {
      console.log('初始化组件');
      this.loadData();
    },

    // --- 数据加载 ---
    async loadData() {
      // 加载数据逻辑
    },

    // --- 事件处理 ---
    handleTap(e) {
      console.log('点击事件', e);
      this.triggerEvent('tap', {
        type: 'card',
        data: this.properties.userData
      });
    },

    handleExpand() {
      this.setData({
        isExpanded: !this.data.isExpanded
      });
      this.triggerEvent('expand', {
        isExpanded: this.data.isExpanded
      });
    },

    // --- 属性观察器 ---
    onTitleChange(newVal, oldVal) {
      console.log('标题变化', oldVal, '->', newVal);
      // 属性变化时的处理逻辑
    },

    // --- 公共方法（供父组件调用）---
    /**
     * 刷新组件数据
     * @public
     */
    refresh() {
      this.loadData();
    },

    /**
     * 重置组件状态
     * @public
     */
    reset() {
      this.setData({
        isExpanded: false,
        internalCounter: 0
      });
    },

    // --- 清理 ---
    cleanup() {
      console.log('清理资源');
      // 清理定时器、监听器等
    }
  }
});
```

### 组件 WXML 模板

```xml
<!-- components/custom-card/custom-card.wxml -->
<view class="custom-card {{custom-class}}">
  <!-- 头部 -->
  <view class="card-header" bind:tap="handleExpand">
    <text class="card-title {{title-class}}">{{title}}</text>
    <image
      wx:if="{{showIcon}}"
      class="expand-icon {{isExpanded ? 'expanded' : ''}}"
      src="/images/arrow-down.png"
    />
  </view>

  <!-- 内容区 -->
  <view class="card-content" wx:if="{{isExpanded}}">
    <!-- 默认插槽 -->
    <slot></slot>

    <!-- 具名插槽 -->
    <view class="card-footer">
      <slot name="footer"></slot>
    </view>
  </view>
</view>
```

### 组件 WXSS 样式

```css
/* components/custom-card/custom-card.wxss */
.custom-card {
  background: #fff;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.expand-icon {
  width: 32rpx;
  height: 32rpx;
  transition: transform 0.3s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.card-content {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #eee;
}

.card-footer {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #eee;
}
```

### 组件配置文件

```json
{
  "component": true,
  "usingComponents": {}
}
```

---

## 🔗 组件通信方式

### 1. 父组件 → 子组件（通过 properties）

```javascript
// 父页面
Page({
  data: {
    user: {
      name: '张三',
      role: 'candidate'
    }
  }
});
```

```xml
<!-- 父页面 WXML -->
<user-card userData="{{user}}" />
```

```javascript
// 子组件
Component({
  properties: {
    userData: {
      type: Object,
      value: null
    }
  }
});
```

### 2. 子组件 → 父组件（通过 triggerEvent）

```javascript
// 子组件
Component({
  methods: {
    handleAction(e) {
      this.triggerEvent('action', {
        type: 'submit',
        data: this.data.formData
      }, {
        bubbles: true,      // 是否冒泡
        composed: true,     // 是否可以穿越组件边界
        capturePhase: false // 是否在捕获阶段触发
      });
    }
  }
});
```

```xml
<!-- 父页面 WXML -->
<custom-form bind:action="handleAction" />
```

```javascript
// 父页面
Page({
  handleAction(e) {
    const { type, data } = e.detail;
    console.log('收到组件事件', type, data);
  }
});
```

### 3. 父组件调用子组件方法（通过 selectComponent）

```javascript
// 父页面
Page({
  onLoad() {
    // 获取组件实例
    const customCard = this.selectComponent('#custom-card');
    // 调用组件公共方法
    customCard.refresh();
  },

  refreshCard() {
    const customCard = this.selectComponent('#custom-card');
    if (customCard) {
      customCard.refresh();
    }
  }
});
```

```xml
<!-- 父页面 WXML -->
<custom-card id="custom-card" />
```

```javascript
// 子组件
Component({
  methods: {
    /**
     * 刷新组件（公共方法）
     * @public
     */
    refresh() {
      this.loadData();
    }
  }
});
```

### 4. 组件间通信（通过事件总线）

```javascript
// utils/event-bus.js
class EventBus {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

module.exports = new EventBus();
```

```javascript
// 组件 A：发送事件
const EventBus = require('../../utils/event-bus');

Component({
  methods: {
    handleUpdate() {
      EventBus.emit('data-updated', {
        type: 'user',
        id: this.data.userId
      });
    }
  }
});

// 组件 B：监听事件
const EventBus = require('../../utils/event-bus');

Component({
  lifetimes: {
    attached() {
      this.handleDataUpdate = (data) => {
        console.log('数据更新', data);
        this.refresh();
      };
      EventBus.on('data-updated', this.handleDataUpdate);
    },

    detached() {
      EventBus.off('data-updated', this.handleDataUpdate);
    }
  }
});
```

---

## 🎨 常用组件示例

### 1. 用户卡片组件

```javascript
// components/user-card/user-card.js
Component({
  options: {
    addGlobalClass: true
  },

  externalClasses: ['custom-class'],

  properties: {
    userData: {
      type: Object,
      value: null
    },
    showActions: {
      type: Boolean,
      value: false
    }
  },

  data: {
    defaultAvatar: '/images/default-avatar.png'
  },

  methods: {
    handleTap() {
      this.triggerEvent('tap', {
        userId: this.properties.userData._id
      });
    },

    handleEdit() {
      this.triggerEvent('edit', {
        userId: this.properties.userData._id
      });
    },

    handleDelete() {
      this.triggerEvent('delete', {
        userId: this.properties.userData._id
      });
    },

    // 获取头像 URL（有默认值）
    getAvatarUrl() {
      return this.properties.userData?.avatar || this.data.defaultAvatar;
    }
  }
});
```

```xml
<!-- components/user-card/user-card.wxml -->
<view class="user-card {{custom-class}}" bind:tap="handleTap">
  <image class="avatar" src="{{userData.avatar || defaultAvatar}}" />
  <view class="info">
    <text class="name">{{userData.name}}</text>
    <text class="role">{{userData.role}}</text>
  </view>
  <view class="actions" wx:if="{{showActions}}" catch:tap="stopPropagation">
    <button size="mini" bind:tap="handleEdit">编辑</button>
    <button size="mini" type="warn" bind:tap="handleDelete">删除</button>
  </view>
</view>
```

### 2. 表单项组件

```javascript
// components/form-item/form-item.js
Component({
  options: {
    multipleSlots: true
  },

  properties: {
    label: {
      type: String,
      value: ''
    },
    required: {
      type: Boolean,
      value: false
    },
    error: {
      type: String,
      value: ''
    }
  }
});
```

```xml
<!-- components/form-item/form-item.wxml -->
<view class="form-item {{error ? 'error' : ''}}">
  <view class="label">
    <text class="required" wx:if="{{required}}">*</text>
    <text>{{label}}</text>
  </view>
  <view class="content">
    <slot></slot>
  </view>
  <text class="error-message" wx:if="{{error}}">{{error}}</text>
</view>
```

**使用示例**：
```xml
<form-item label="姓名" required="{{true}}" error="{{formErrors.name}}">
  <input
    value="{{formData.name}}"
    placeholder="请输入姓名"
    bind:input="handleNameInput"
  />
</form-item>
```

### 3. 列表加载组件

```javascript
// components/list-loader/list-loader.js
Component({
  properties: {
    loading: {
      type: Boolean,
      value: false
    },
    hasMore: {
      type: Boolean,
      value: true
    },
    isEmpty: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleLoadMore() {
      if (!this.properties.loading && this.properties.hasMore) {
        this.triggerEvent('loadmore');
      }
    }
  }
});
```

```xml
<!-- components/list-loader/list-loader.wxml -->
<view class="list-loader">
  <!-- 加载中 -->
  <view class="loading" wx:if="{{loading}}">
    <text>加载中...</text>
  </view>

  <!-- 没有更多 -->
  <view class="no-more" wx:elif="{{!hasMore}}">
    <text>没有更多了</text>
  </view>

  <!-- 空状态 -->
  <view class="empty" wx:elif="{{isEmpty}}">
    <image src="/images/empty.png" />
    <text>暂无数据</text>
  </view>

  <!-- 加载更多按钮 -->
  <view class="load-more" wx:else bind:tap="handleLoadMore">
    <text>加载更多</text>
  </view>
</view>
```

---

## 🔧 组件开发最佳实践

### 1. 使用 Behaviors 复用逻辑

```javascript
// behaviors/pagination.js
module.exports = Behavior({
  data: {
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoading: false
  },

  methods: {
    resetPagination() {
      this.setData({
        page: 1,
        hasMore: true
      });
    },

    nextPage() {
      if (this.data.hasMore && !this.data.isLoading) {
        this.setData({
          page: this.data.page + 1
        });
      }
    }
  }
});
```

```javascript
// components/user-list/user-list.js
const paginationBehavior = require('../../behaviors/pagination');

Component({
  behaviors: [paginationBehavior],

  methods: {
    async loadData() {
      this.setData({ isLoading: true });

      const result = await wx.cloud.callFunction({
        name: 'get-users',
        data: {
          page: this.data.page,
          pageSize: this.data.pageSize
        }
      });

      this.setData({
        hasMore: result.result.data.length === this.data.pageSize,
        isLoading: false
      });
    }
  }
});
```

### 2. 使用 Relations 关联组件

```javascript
// components/tabs/tabs.js
Component({
  relations: {
    './tab-item': {
      type: 'child',
      linked(target) {
        // 子组件插入时
        this.data.children.push(target);
      },
      unlinked(target) {
        // 子组件移除时
        const index = this.data.children.indexOf(target);
        this.data.children.splice(index, 1);
      }
    }
  },

  data: {
    children: []
  },

  methods: {
    selectTab(index) {
      this.data.children.forEach((child, i) => {
        child.setActive(i === index);
      });
    }
  }
});

// components/tabs/tab-item.js
Component({
  relations: {
    './tabs': {
      type: 'parent'
    }
  },

  data: {
    isActive: false
  },

  methods: {
    setActive(active) {
      this.setData({ isActive: active });
    }
  }
});
```

### 3. 组件性能优化

```javascript
Component({
  options: {
    // 启用纯数据字段（不用于界面渲染）
    pureDataPattern: /^_/
  },

  data: {
    // 用于渲染
    displayList: [],

    // 纯数据字段（不会触发界面更新）
    _rawData: [],
    _cache: {}
  },

  methods: {
    updateData(newData) {
      // 纯数据字段的更新不会触发视图更新
      this.setData({
        _rawData: newData
      });

      // 处理后再更新显示
      const processedData = this.processData(newData);
      this.setData({
        displayList: processedData
      });
    }
  }
});
```

---

**最后更新**: 2025-11-05
**维护者**: 开发团队
