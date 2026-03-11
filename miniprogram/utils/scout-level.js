/**
 * 星探层级工具函数
 * 用于统一管理星探层级的显示文案和样式
 */

// 星探层级配置
export const SCOUT_LEVELS = {
  1: {
    zh: '星探合伙人',
    en: 'Senior Partner',
    abbr: 'SP',
    color: 'warning' // Element UI 标签颜色
  },
  2: {
    zh: '特约星探',
    en: 'Special Scout',
    abbr: 'SS',
    color: 'info'
  }
};

/**
 * 获取层级标签文案
 * @param {number} depth - 层级深度 (1 或 2)
 * @param {string} format - 格式：'full' | 'abbr' | 'zh' | 'en'
 * @returns {string} 层级标签
 *
 * 示例：
 * getLevelLabel(1, 'full')  => '星探合伙人 (SP)'
 * getLevelLabel(1, 'abbr')  => 'SP'
 * getLevelLabel(1, 'zh')    => '星探合伙人'
 * getLevelLabel(1, 'en')    => 'Senior Partner'
 */
export function getLevelLabel(depth, format = 'full') {
  // 默认为特约星探（二级）
  const level = SCOUT_LEVELS[depth] || SCOUT_LEVELS[2];

  switch (format) {
    case 'full':
      return `${level.zh} (${level.abbr})`;
    case 'abbr':
      return level.abbr;
    case 'zh':
      return level.zh;
    case 'en':
      return level.en;
    default:
      return level.zh;
  }
}

/**
 * 获取层级颜色（用于标签样式）
 * @param {number} depth - 层级深度
 * @returns {string} Element UI 标签颜色类型
 */
export function getLevelColor(depth) {
  return SCOUT_LEVELS[depth]?.color || 'info';
}

/**
 * 格式化星探推荐链条
 * @param {Array<string>} scoutChainNames - 星探链条名字数组
 * @returns {string} 格式化后的链条字符串
 *
 * 示例：
 * formatScoutChain(['张三', '李四', '王五'])
 * => '张三(SP) → 李四(SS) → 王五(SS)'
 */
export function formatScoutChain(scoutChainNames = []) {
  if (!Array.isArray(scoutChainNames) || scoutChainNames.length === 0) {
    return '-';
  }

  return scoutChainNames.map((name, index) => {
    // 第一个是星探合伙人，其余都是特约星探
    const level = index === 0 ? 'SP' : 'SS';
    return `${name}(${level})`;
  }).join(' → ');
}

/**
 * 判断是否为星探合伙人
 * @param {number} depth - 层级深度
 * @returns {boolean}
 */
export function isPartner(depth) {
  return depth === 1;
}

/**
 * 判断是否为特约星探
 * @param {number} depth - 层级深度
 * @returns {boolean}
 */
export function isSpecialScout(depth) {
  return depth === 2;
}
