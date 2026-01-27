/**
 * 场景参数解析工具
 * 用于处理小程序启动时的场景值和参数
 */

/**
 * 解析场景参数
 * @param {Object} options - 小程序启动参数 (onLaunch/onShow的options)
 * @returns {Object} 解析后的参数对象
 */
export function parseSceneParams(options) {
  const result = {
    scene: null,           // 场景值
    query: {},             // URL查询参数
    scoutShareCode: null,  // 星探分享码
    referralPath: null,    // 推荐路径
    rawOptions: options    // 原始参数
  };

  if (!options) {
    return result;
  }

  // 1. 保存场景值
  result.scene = options.scene || null;

  // 2. 解析URL query参数
  if (options.query) {
    result.query = options.query;

    // 检查星探推荐码 (来自URL参数)
    if (options.query.ref) {
      result.scoutShareCode = options.query.ref;
    }
    if (options.query.shareCode) {
      result.scoutShareCode = options.query.shareCode;
    }
  }

  // 3. 解析场景值中的参数 (小程序码场景)
  if (options.scene) {
    const sceneParams = parseSceneString(options.scene);

    // 场景值中的推荐码优先级更高
    if (sceneParams.shareCode) {
      result.scoutShareCode = sceneParams.shareCode;
    }
    if (sceneParams.ref) {
      result.scoutShareCode = sceneParams.ref;
    }

    // 合并场景参数到query
    result.query = { ...result.query, ...sceneParams };
  }

  // 4. 解析referralInfo (分享场景)
  if (options.referrerInfo && options.referrerInfo.extraData) {
    const extraData = options.referrerInfo.extraData;
    if (extraData.shareCode) {
      result.scoutShareCode = extraData.shareCode;
    }
  }

  // 5. 记录推荐路径
  if (result.scoutShareCode) {
    result.referralPath = options.path || '';
  }

  return result;
}

/**
 * 解析场景值字符串
 * 场景值格式示例：
 * - "shareCode=SHARE001"
 * - "shareCode%3DSHARE001" (URL编码)
 * - "a=1&b=2" (多个参数)
 *
 * @param {String|Number} scene - 场景值
 * @returns {Object} 解析后的参数对象
 */
function parseSceneString(scene) {
  const params = {};

  if (!scene) {
    return params;
  }

  try {
    // 转换为字符串
    let sceneStr = String(scene);

    // URL解码
    sceneStr = decodeURIComponent(sceneStr);

    // 分割参数
    const pairs = sceneStr.split('&');

    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key.trim()] = decodeURIComponent(value.trim());
      }
    });
  } catch (error) {
    console.error('解析场景值失败:', error, scene);
  }

  return params;
}

/**
 * 获取场景值类型描述
 * @param {Number} scene - 场景值ID
 * @returns {String} 场景描述
 */
export function getSceneDescription(scene) {
  const sceneMap = {
    1001: '发现栏小程序主入口',
    1005: '顶部搜索框的搜索结果页',
    1006: '发现栏小程序主入口搜索框的搜索结果页',
    1007: '单人聊天会话中的消息卡片',
    1008: '群聊会话中的消息卡片',
    1011: '扫描二维码',
    1012: '长按图片识别二维码',
    1013: '扫描手机相册中选取的二维码',
    1020: '公众号profile页相关小程序列表',
    1035: '公众号自定义菜单',
    1036: 'App分享消息卡片',
    1037: '小程序打开小程序',
    1038: '从另一个小程序返回',
    1043: '公众号模板消息',
    1044: '带shareTicket的小程序消息卡片',
    1047: '扫描小程序码',
    1048: '长按图片识别小程序码',
    1049: '手机相册选取小程序码'
  };

  return sceneMap[scene] || `未知场景(${scene})`;
}

/**
 * 判断是否来自分享
 * @param {Number} scene - 场景值ID
 * @returns {Boolean}
 */
export function isFromShare(scene) {
  const shareScenes = [1007, 1008, 1036, 1044];
  return shareScenes.includes(scene);
}

/**
 * 判断是否来自扫码
 * @param {Number} scene - 场景值ID
 * @returns {Boolean}
 */
export function isFromScan(scene) {
  const scanScenes = [1011, 1012, 1013, 1047, 1048, 1049];
  return scanScenes.includes(scene);
}

/**
 * 保存场景参数到本地存储
 * @param {Object} sceneParams - 场景参数对象
 */
export function saveSceneParams(sceneParams) {
  try {
    wx.setStorageSync('scene_params', sceneParams);
    console.log('[场景参数] 已保存:', sceneParams);
  } catch (error) {
    console.error('[场景参数] 保存失败:', error);
  }
}

/**
 * 从本地存储获取场景参数
 * @returns {Object|null}
 */
export function getSceneParams() {
  try {
    const params = wx.getStorageSync('scene_params');
    return params || null;
  } catch (error) {
    console.error('[场景参数] 获取失败:', error);
    return null;
  }
}

/**
 * 清除场景参数
 */
export function clearSceneParams() {
  try {
    wx.removeStorageSync('scene_params');
    console.log('[场景参数] 已清除');
  } catch (error) {
    console.error('[场景参数] 清除失败:', error);
  }
}
