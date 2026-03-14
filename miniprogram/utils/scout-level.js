/**
 * 星探等级工具函数（直营模式：rookie/special/partner三级扁平）
 */

// 星探等级配置
export const SCOUT_GRADES = {
  rookie: {
    zh: '新锐星探',
    color: 'default',
    upgradeAt: 0
  },
  special: {
    zh: '特约星探',
    color: 'info',
    upgradeAt: 2
  },
  partner: {
    zh: '合伙人星探',
    color: 'warning',
    upgradeAt: 5
  }
};

/**
 * 获取等级中文标签
 * @param {string} grade - 'rookie' | 'special' | 'partner'
 * @returns {string}
 */
export function getGradeLabel(grade) {
  return SCOUT_GRADES[grade]?.zh || '新锐星探';
}

/**
 * 获取等级颜色
 * @param {string} grade
 * @returns {string}
 */
export function getGradeColor(grade) {
  return SCOUT_GRADES[grade]?.color || 'default';
}

/**
 * 获取升级进度
 * @param {string} grade - 当前等级
 * @param {number} signedCount - 当前签约数
 * @returns {{ current: number, target: number, percentage: number, nextGrade: string|null }}
 */
export function getUpgradeProgress(grade, signedCount) {
  if (grade === 'partner') {
    return { current: signedCount, target: 0, percentage: 100, nextGrade: null };
  }

  const nextGrade = grade === 'rookie' ? 'special' : 'partner';
  const target = SCOUT_GRADES[nextGrade].upgradeAt;
  const percentage = Math.min(Math.round((signedCount / target) * 100), 100);

  return { current: signedCount, target, percentage, nextGrade };
}
