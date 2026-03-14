// 数据迁移云函数 - 星探体系从分销模式迁移到直营模式
// SP(depth=1) → partner, SS(depth=2) → special, 无level → rookie
// 幂等设计：检查 grade 是否已存在，已迁移的跳过
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 生成新格式推荐码（SC-EXT-YYYYMMDD-XXXX）
function generateShareCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SC-EXT-${y}${m}${d}-${suffix}`;
}

// 生成唯一推荐码
async function generateUniqueShareCode() {
  let retryCount = 0;
  while (retryCount < 20) {
    const code = generateShareCode();
    const checkRes = await db.collection('scouts').where({
      shareCode: code
    }).get();
    if (checkRes.data.length === 0) {
      return code;
    }
    retryCount++;
  }
  throw new Error('无法生成唯一推荐码');
}

exports.main = async (event) => {
  const { dryRun = false } = event;
  console.log(`[migration] 开始星探数据迁移... dryRun=${dryRun}`);

  try {
    // 1. 分页获取所有 scouts
    const allScouts = [];
    const pageSize = 100;
    let skip = 0;
    while (true) {
      const page = await db.collection('scouts')
        .skip(skip)
        .limit(pageSize)
        .get();
      if (page.data.length === 0) break;
      allScouts.push(...page.data);
      if (page.data.length < pageSize) break;
      skip += pageSize;
    }

    console.log(`[migration] 共找到 ${allScouts.length} 个星探记录`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failCount = 0;
    const errors = [];

    // 2. 逐个迁移星探
    for (const scout of allScouts) {
      try {
        // 幂等检查：如果已有 grade 字段，跳过
        if (scout.grade) {
          skippedCount++;
          continue;
        }

        // 确定新等级
        let newGrade = 'rookie';
        if (scout.level) {
          if (scout.level.depth === 1) {
            newGrade = 'partner';  // SP → partner（尊重历史地位）
          } else if (scout.level.depth === 2) {
            newGrade = 'special';  // SS → special
          }
        }

        // 生成新格式推荐码（如果当前是旧格式6位码）
        let newShareCode = scout.shareCode;
        if (scout.shareCode && !scout.shareCode.startsWith('SC-EXT-')) {
          // 旧格式，保留旧码但同时生成新码
          // 不替换旧码以保持向后兼容，新码作为额外字段
          // 实际上按计划直接替换
          if (!dryRun) {
            newShareCode = await generateUniqueShareCode();
          } else {
            newShareCode = 'SC-EXT-DRYRUN-XXXX';
          }
        }

        const updateData = {
          grade: newGrade,
          gradeHistory: [{
            from: null,
            to: newGrade,
            reason: `数据迁移：原层级 depth=${scout.level?.depth || 'none'}`,
            upgradedAt: db.serverDate()
          }],
          application: scout.application || null,
          shareCode: newShareCode,
          // 迁移 stats 字段格式
          stats: {
            referredCount: scout.stats?.totalReferred || 0,
            signedCount: scout.stats?.signedCount || 0,
            totalCommission: scout.earnings?.totalEarned || 0,
            paidCommission: scout.earnings?.paidAmount || 0
          },
          // 添加 idCard 占位（迁移后需要星探自行补充）
          'profile.idCard': scout.profile?.idCard || '',
          updatedAt: db.serverDate()
        };

        if (!dryRun) {
          await db.collection('scouts').doc(scout._id).update({
            data: updateData
          });

          // 移除旧字段
          await db.collection('scouts').doc(scout._id).update({
            data: {
              level: _.remove(),
              inviteCode: _.remove(),
              team: _.remove(),
              earnings: _.remove()
            }
          });
        }

        migratedCount++;
        console.log(`[migration] [${migratedCount}] ${scout.profile?.name || scout._id}: ${newGrade} (shareCode: ${newShareCode})`);

      } catch (error) {
        failCount++;
        const msg = `迁移失败: ${scout.profile?.name || scout._id} - ${error.message}`;
        console.error(`[migration] ${msg}`);
        errors.push(msg);
      }
    }

    // 3. 迁移 status: 'deleted' → 'disabled'（停用语义变更）
    console.log('[migration] 开始迁移 deleted → disabled 状态...');
    let statusMigrated = 0;

    const deletedScouts = allScouts.filter(s => s.status === 'deleted');
    for (const scout of deletedScouts) {
      try {
        if (!dryRun) {
          await db.collection('scouts').doc(scout._id).update({
            data: {
              status: 'disabled',
              disabledAt: scout.deletedAt || db.serverDate(),
              disabledBy: scout.deletedBy || '',
              deletedAt: _.remove(),
              deletedBy: _.remove(),
              updatedAt: db.serverDate()
            }
          });
        }
        statusMigrated++;
        console.log(`[migration] 状态迁移: ${scout.profile?.name || scout._id} deleted → disabled`);
      } catch (error) {
        const msg = `状态迁移失败: ${scout.profile?.name || scout._id} - ${error.message}`;
        console.error(`[migration] ${msg}`);
        errors.push(msg);
      }
    }

    // 4. 迁移 candidates 的 referral 字段
    console.log('[migration] 开始迁移候选人 referral 字段...');

    let candidateMigrated = 0;
    let candidateSkipped = 0;
    skip = 0;

    while (true) {
      const page = await db.collection('candidates')
        .where({
          'referral.scoutId': _.exists(true)
        })
        .skip(skip)
        .limit(pageSize)
        .get();

      if (page.data.length === 0) break;

      for (const candidate of page.data) {
        try {
          // 幂等检查：如果已有 scoutGrade 字段，跳过
          if (candidate.referral?.scoutGrade) {
            candidateSkipped++;
            continue;
          }

          // 查找星探获取等级
          let scoutGrade = 'rookie';
          if (candidate.referral?.scoutId) {
            try {
              const scoutRes = await db.collection('scouts').doc(candidate.referral.scoutId).get();
              if (scoutRes.data) {
                scoutGrade = scoutRes.data.grade || 'rookie';
              }
            } catch (e) {
              // 星探可能已被删除
              console.warn(`[migration] 星探 ${candidate.referral.scoutId} 不存在`);
            }
          }

          if (!dryRun) {
            const referralUpdate = {
              'referral.scoutGrade': scoutGrade,
              updatedAt: db.serverDate()
            };

            // 移除旧字段
            referralUpdate['referral.scoutLevel'] = _.remove();
            referralUpdate['referral.scoutChain'] = _.remove();
            referralUpdate['referral.scoutChainNames'] = _.remove();

            await db.collection('candidates').doc(candidate._id).update({
              data: referralUpdate
            });
          }

          candidateMigrated++;
        } catch (error) {
          const msg = `候选人迁移失败: ${candidate._id} - ${error.message}`;
          console.error(`[migration] ${msg}`);
          errors.push(msg);
        }
      }

      if (page.data.length < pageSize) break;
      skip += pageSize;
    }

    const result = {
      success: true,
      dryRun,
      message: `迁移完成${dryRun ? '（试运行）' : ''}`,
      scouts: {
        total: allScouts.length,
        migrated: migratedCount,
        skipped: skippedCount,
        failed: failCount,
        statusMigrated
      },
      candidates: {
        migrated: candidateMigrated,
        skipped: candidateSkipped
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('[migration] 迁移结果:', JSON.stringify(result));
    return result;

  } catch (error) {
    console.error('[migration] 迁移过程出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
