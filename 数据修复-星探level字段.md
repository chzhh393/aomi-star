# 数据修复：为旧星探数据添加 level 字段

## 问题说明
在二级星探系统实施之前注册的星探，数据库中没有 `level` 字段，导致管理后台显示为"二级星探"。

## 修复方案

### 方案1：在微信开发者工具控制台执行（推荐）

1. 打开微信开发者工具
2. 进入"云开发控制台" → "数据库" → "scouts"
3. 点击"高级操作" → "执行脚本"
4. 复制以下脚本并执行：

```javascript
// 查询所有没有 level 字段的星探
db.collection('scouts')
  .where({
    level: _.exists(false)  // level 字段不存在
  })
  .get()
  .then(res => {
    console.log('找到', res.data.length, '个需要修复的星探');
    
    // 逐个更新
    const promises = res.data.map(scout => {
      return db.collection('scouts').doc(scout._id).update({
        data: {
          level: {
            depth: 1,              // 默认为一级星探
            parentScoutId: null,
            parentScoutName: '',
            parentInviteCode: ''
          },
          updatedAt: db.serverDate()
        }
      });
    });
    
    return Promise.all(promises);
  })
  .then(() => {
    console.log('修复完成！');
  })
  .catch(err => {
    console.error('修复失败:', err);
  });
```

### 方案2：创建修复云函数

创建临时云函数执行修复：

**cloudfunctions/fix-scout-level/index.js**
```javascript
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    // 查询没有 level 字段的星探
    const scoutsRes = await db.collection('scouts')
      .where({
        level: _.exists(false)
      })
      .get();
    
    console.log('找到需要修复的星探数量:', scoutsRes.data.length);
    
    let successCount = 0;
    let failCount = 0;
    
    // 逐个更新
    for (const scout of scoutsRes.data) {
      try {
        await db.collection('scouts').doc(scout._id).update({
          data: {
            level: {
              depth: 1,
              parentScoutId: null,
              parentScoutName: '',
              parentInviteCode: ''
            },
            // 如果没有邀请码，生成一个
            inviteCode: scout.inviteCode || generateInviteCode(),
            updatedAt: db.serverDate()
          }
        });
        
        successCount++;
        console.log(`✓ 修复成功: ${scout.profile?.name}`);
      } catch (error) {
        failCount++;
        console.error(`✗ 修复失败: ${scout.profile?.name}`, error);
      }
    }
    
    return {
      success: true,
      message: `修复完成！成功: ${successCount}, 失败: ${failCount}`,
      total: scoutsRes.data.length,
      successCount,
      failCount
    };
    
  } catch (error) {
    console.error('修复失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

**使用方法**：
1. 创建上述云函数
2. 上传并部署
3. 在云开发控制台测试运行
4. 运行成功后删除该云函数

### 方案3：使用 tcb CLI（命令行）

```bash
# 1. 登录
tcb login

# 2. 进入数据库操作
tcb db

# 3. 执行更新（需要手动编写脚本）
# 参考方案1的脚本内容
```

## 修复后验证

修复完成后，验证数据：

```javascript
// 查询所有星探的 level 信息
db.collection('scouts').get().then(res => {
  res.data.forEach(scout => {
    console.log(
      scout.profile.name,
      '层级:', scout.level?.depth || '无',
      '邀请码:', scout.inviteCode || '无'
    );
  });
});

// 统计
db.collection('scouts').get().then(res => {
  const level1 = res.data.filter(s => s.level?.depth === 1).length;
  const level2 = res.data.filter(s => s.level?.depth === 2).length;
  const noLevel = res.data.filter(s => !s.level).length;
  
  console.log('一级星探:', level1);
  console.log('二级星探:', level2);
  console.log('无层级:', noLevel);
});
```

## 注意事项

1. **备份数据**：修复前建议先备份 scouts 集合
2. **测试环境**：如有测试环境，先在测试环境验证
3. **邀请码唯一性**：如果旧数据没有邀请码，修复时会生成新的邀请码
4. **不影响业务**：修复过程中不会影响现有业务逻辑

## 执行顺序

推荐执行顺序：
1. ✅ 先更新前端代码（已完成）- 兼容旧数据显示
2. ✅ 部署管理后台更新
3. ⬜ 执行数据修复脚本（可选，但建议执行）
4. ⬜ 验证数据正确性

## 为什么前端已修复，数据修复是可选的？

前端代码已经添加了兼容逻辑：
```javascript
(row.level?.depth || 1) === 1  // 如果没有 level，默认为 1（一级星探）
```

这意味着：
- 即使不修复数据，管理后台也能正确显示
- 但为了数据完整性，建议执行数据修复
- 新注册的星探会自动包含 level 字段
