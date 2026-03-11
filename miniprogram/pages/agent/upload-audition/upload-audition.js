/**
 * 上传试镜视频页面
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateDetail } from '../../../utils/agent-api.js';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_COUNT = 3;

Page({
  data: {
    candidateId: '',
    candidate: null,
    videos: [], // 视频列表
    uploading: false,
    allUploaded: false
  },

  onLoad(options) {
    // 检查登录状态
    if (!requireAgentLogin()) {
      return;
    }

    // 获取候选人ID
    if (!options.id) {
      wx.showToast({
        title: '缺少候选人ID',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ candidateId: options.id });
    this.loadCandidate();
  },

  /**
   * 加载候选人信息
   */
  async loadCandidate() {
    wx.showLoading({ title: '加载中...' });

    try {
      const result = await getCandidateDetail(this.data.candidateId);
      console.log('[上传试镜视频] 候选人信息:', result);

      // 如果已有试镜视频，加载到列表
      const existingVideos = result.candidate.auditionVideos || [];

      this.setData({
        candidate: result.candidate,
        videos: existingVideos.map(v => ({
          ...v,
          uploaded: true
        })),
        allUploaded: existingVideos.length > 0
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('[上传试镜视频] 加载失败:', error);

      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载候选人信息',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 选择视频
   */
  chooseVideo() {
    const remainingCount = MAX_VIDEO_COUNT - this.data.videos.length;
    if (remainingCount <= 0) {
      wx.showToast({
        title: `最多上传${MAX_VIDEO_COUNT}个视频`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      maxDuration: 120, // 最长2分钟
      success: (res) => {
        const media = res.tempFiles[0];

        // 检查文件大小
        if (media.size > MAX_VIDEO_SIZE) {
          wx.showToast({
            title: '视频不能超过100MB',
            icon: 'none'
          });
          return;
        }

        // 添加到列表
        const newVideo = {
          tempPath: media.tempFilePath,
          duration: media.duration,
          size: media.size,
          uploading: false,
          uploaded: false,
          progress: 0
        };

        this.setData({
          videos: [...this.data.videos, newVideo]
        });

        // 自动开始上传
        this.uploadVideo(this.data.videos.length - 1);
      },
      fail: (error) => {
        console.error('[选择视频] 失败:', error);
        if (error.errMsg && !error.errMsg.includes('cancel')) {
          wx.showToast({
            title: '选择视频失败',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 上传单个视频到云存储
   */
  async uploadVideo(index) {
    const video = this.data.videos[index];
    if (!video || video.uploaded || video.uploading) {
      return;
    }

    // 标记为上传中
    this.setData({
      [`videos[${index}].uploading`]: true,
      uploading: true
    });

    try {
      const cloudPath = `audition-videos/${this.data.candidateId}/${Date.now()}_${index}.mp4`;

      // 上传到云存储
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: video.tempPath
      });

      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        this.setData({
          [`videos[${index}].progress`]: res.progress
        });
      });

      const uploadResult = await uploadTask;

      // 获取临时下载链接
      const tempFileURL = uploadResult.fileID;

      // 更新视频信息
      this.setData({
        [`videos[${index}].url`]: tempFileURL,
        [`videos[${index}].cloudPath`]: cloudPath,
        [`videos[${index}].fileID`]: uploadResult.fileID,
        [`videos[${index}].uploading`]: false,
        [`videos[${index}].uploaded`]: true
      });

      // 检查是否所有视频都已上传
      this.checkAllUploaded();

      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('[上传视频] 失败:', error);

      this.setData({
        [`videos[${index}].uploading`]: false
      });

      wx.showModal({
        title: '上传失败',
        content: error.message || '视频上传失败，请重试',
        showCancel: true,
        confirmText: '重试',
        cancelText: '删除',
        success: (res) => {
          if (res.confirm) {
            // 重试
            this.uploadVideo(index);
          } else {
            // 删除
            this.deleteVideo({ currentTarget: { dataset: { index } } });
          }
        }
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  /**
   * 删除视频
   */
  deleteVideo(e) {
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个视频吗？',
      success: (res) => {
        if (res.confirm) {
          const videos = [...this.data.videos];
          videos.splice(index, 1);

          this.setData({ videos });
          this.checkAllUploaded();
        }
      }
    });
  },

  /**
   * 检查是否所有视频都已上传
   */
  checkAllUploaded() {
    const allUploaded = this.data.videos.length > 0 &&
      this.data.videos.every(v => v.uploaded);

    this.setData({ allUploaded });
  },

  /**
   * 提交上传
   */
  async submitUpload() {
    if (this.data.videos.length === 0) {
      wx.showToast({
        title: '请先选择视频',
        icon: 'none'
      });
      return;
    }

    if (!this.data.allUploaded) {
      wx.showToast({
        title: '请等待视频上传完成',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      // 准备视频数据
      const auditionVideos = this.data.videos.map(v => ({
        url: v.url,
        fileID: v.fileID,
        cloudPath: v.cloudPath,
        duration: v.duration,
        size: v.size,
        uploadTime: Date.now()
      }));

      // 调用云函数保存数据
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: {
          action: 'uploadAuditionVideos',
          data: {
            candidateId: this.data.candidateId,
            auditionVideos: auditionVideos
          }
        }
      });

      wx.hideLoading();

      if (res.result.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showModal({
          title: '提交失败',
          content: res.result.error || '提交失败，请重试',
          showCancel: false
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('[提交上传] 失败:', error);

      wx.showModal({
        title: '提交失败',
        content: error.message || '提交失败，请重试',
        showCancel: false
      });
    }
  },

  /**
   * 格式化时长
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0秒';

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  },

  /**
   * 格式化文件大小
   */
  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (bytes / Math.pow(k, i)).toFixed(2) + sizes[i];
  }
});
