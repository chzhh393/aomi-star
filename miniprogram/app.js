// app.js
import { autoLogin, getCurrentUser } from './utils/auth.js';
import { handleAppLaunch } from './utils/router.js';
import { parseSceneParams, saveSceneParams } from './utils/scene-parser.js';

App({
  globalData: {
    env: "",                  // 云开发环境
    sceneParams: null,        // 启动场景参数
    scoutShareCode: null      // 星探分享码
  },

  /**
   * 应用启动
   */
  async onLaunch(options) {
    console.log('========== 应用启动 ==========');
    console.log('[App] 启动参数:', options);

    // 1. 初始化云开发
    this.initCloud();

    // 2. 解析场景参数
    this.parseSceneParams(options);

    // 3. 自动登录
    const loginResult = await autoLogin();

    // 4. 路由决策
    handleAppLaunch(loginResult);
  },

  /**
   * 应用显示（从后台进入前台）
   */
  onShow(options) {
    console.log('[App] 应用显示:', options);

    // 解析场景参数（可能从分享进入）
    if (options) {
      this.parseSceneParams(options);
    }
  },

  /**
   * 应用隐藏（从前台进入后台）
   */
  onHide() {
    console.log('[App] 应用隐藏');
  },

  /**
   * 初始化云开发
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('[云开发] 请使用 2.2.3 或以上的基础库');
      return;
    }

    try {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      console.log('[云开发] 初始化成功');
    } catch (error) {
      console.error('[云开发] 初始化失败:', error);
    }
  },

  /**
   * 解析场景参数
   */
  parseSceneParams(options) {
    const sceneParams = parseSceneParams(options);

    // 保存到全局数据
    this.globalData.sceneParams = sceneParams;

    // 保存星探分享码
    if (sceneParams.scoutShareCode) {
      this.globalData.scoutShareCode = sceneParams.scoutShareCode;
      console.log('[App] 检测到星探推荐码:', sceneParams.scoutShareCode);
    }

    // 保存到本地存储（供后续页面使用）
    saveSceneParams(sceneParams);

    console.log('[App] 场景参数解析完成:', sceneParams);
  },

  /**
   * 获取当前用户（兼容旧代码）
   */
  getCurrentUser() {
    return getCurrentUser();
  },

  /**
   * 获取星探推荐码
   */
  getScoutShareCode() {
    return this.globalData.scoutShareCode;
  }
});
