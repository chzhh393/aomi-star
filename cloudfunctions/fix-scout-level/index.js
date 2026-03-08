// 临时修复云函数 - 为旧星探数据添加 level 字段
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INV';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

exports.main = async (event) => {
  console.log('[fix-scout-level] 开始修复星探数据...');
  
  try {
    // 查询所有没有 level 字段的星探
    const scoutsRes = await db.collection('scouts')
      .where({
        level: _.exists(false)
      })
      .get();
    
    const totalCount = scoutsRes.data.length;
    console.log(`[fix-scout-level] 找到 ${totalCount} 个需要修复的星探`);
    
    if (totalCount === 0) {
      return {
        success: true,
        message: '没有需要修复的数据',
        total: 0,
        successCount: 0,
        failCount: 0
      };
    }
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // 逐个更新星探数据
    for (const scout of scoutsRes.data) {
      try {
        const updateData = {
          level: {
            depth: 1,              // 默认为一级星探
            parentScoutId: null,
            parentScoutName: '',
            parentInviteCode: ''
          },
          updatedAt: db.serverDate()
        };
        
        // 如果没有邀请码，生成一个新的
        if (!scout.inviteCode) {
          let inviteCode = '';
          let retryCount = 0;
          
          // 生成唯一的邀请码
          while (retryCount < 10) {
            inviteCode = generateInviteCode();
            const checkRes = await db.collection('scouts').where({
              inviteCode: inviteCode
            }).count();
            
            if (checkRes.total === 0) {
              break;
            }
            retryCount++;
          }
          
          if (inviteCode) {
            updateData.inviteCode = inviteCode;
          }
        }
        
        // 更新星探数据
        await db.collection('scouts').doc(scout._id).update({
          data: updateData
        });
        
        successCount++;
        console.log(`✓ [${successCount}/${totalCount}] 修复成功: ${scout.profile?.name || scout._id}`);
        
        if (updateData.inviteCode) {
          console.log(`  - 生成邀请码: ${updateData.inviteCode}`);
        }
        
      } catch (error) {
        failCount++;
        const errorMsg = `修复失败: ${scout.profile?.name || scout._id} - ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    const result = {
      success: true,
      message: `修复完成！成功: ${successCount}, 失败: ${failCount}`,
      total: totalCount,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    };
    
    console.log('[fix-scout-level] 修复结果:', result);
    return result;
    
  } catch (error) {
    console.error('[fix-scout-level] 修复过程出错:', error);
    return {
      success: false,
      error: error.message,
      total: 0,
      successCount: 0,
      failCount: 0
    };
  }
};
