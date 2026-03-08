/**
 * 上传面试资料页面
 */

import { requireAgentLogin } from '../../../utils/agent-auth.js';
import { getCandidateDetail, uploadInterviewPhotos, uploadInterviewVideos, batchUploadImages, batchUploadVideos } from '../../../utils/agent-api.js';

Page({
  data: {
    candidateId: '',
    candidate: null,

    // 照片和视频（云存储URL）
    photos: [],
    videos: [],

    // 上传状态
    uploading: false,
    submitting: false,
    uploadProgress: {
      current: 0,
      total: 0,
      percent: 0
    }
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
    try {
      const result = await getCandidateDetail(this.data.candidateId);
      console.log('[上传资料] 候选人信息:', result.candidate);

      // 回填已上传的资料
      const photos = result.candidate.interview?.photos || [];
      const videos = result.candidate.interview?.videos || [];

      this.setData({
        candidate: result.candidate,
        photos: photos,
        videos: videos
      });
    } catch (error) {
      console.error('[上传资料] 加载候选人信息失败:', error);
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
   * 选择照片
   */
  choosePhotos() {
    const remainCount = 9 - this.data.photos.length;
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传9张照片',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        console.log('[选择照片] 选择结果:', res.tempFiles.length);

        // 立即显示临时图片（使用临时路径）
        const tempPaths = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          photos: [...this.data.photos, ...tempPaths]
        });

        // 后台上传到云存储
        this.uploadPhotosToCloud(tempPaths);
      }
    });
  },

  /**
   * 上传照片到云存储
   */
  async uploadPhotosToCloud(tempPaths) {
    this.setData({
      uploading: true,
      uploadProgress: {
        current: 0,
        total: tempPaths.length,
        percent: 0
      }
    });

    try {
      const cloudUrls = await batchUploadImages(
        tempPaths,
        this.data.candidateId,
        (current, total) => {
          // 更新进度
          this.setData({
            'uploadProgress.current': current,
            'uploadProgress.total': total,
            'uploadProgress.percent': Math.floor((current / total) * 100)
          });
        }
      );

      console.log('[上传照片] 上传成功:', cloudUrls);

      // 替换临时路径为云存储URL
      const photos = [...this.data.photos];
      tempPaths.forEach((tempPath, index) => {
        const photoIndex = photos.indexOf(tempPath);
        if (photoIndex > -1 && cloudUrls[index]) {
          photos[photoIndex] = cloudUrls[index];
        }
      });

      this.setData({
        photos,
        uploading: false
      });
    } catch (error) {
      console.error('[上传照片] 上传失败:', error);
      this.setData({ uploading: false });

      wx.showToast({
        title: '照片上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择视频
   */
  chooseVideos() {
    const remainCount = 5 - this.data.videos.length;
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传5个视频',
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,  // 最长60秒
      success: async (res) => {
        console.log('[选择视频] 选择结果:', res.tempFiles.length);

        // 立即显示临时视频（使用临时路径）
        const tempPaths = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          videos: [...this.data.videos, ...tempPaths]
        });

        // 后台上传到云存储
        this.uploadVideosToCloud(tempPaths);
      }
    });
  },

  /**
   * 上传视频到云存储
   */
  async uploadVideosToCloud(tempPaths) {
    this.setData({
      uploading: true,
      uploadProgress: {
        current: 0,
        total: tempPaths.length,
        percent: 0
      }
    });

    try {
      const cloudUrls = await batchUploadVideos(
        tempPaths,
        this.data.candidateId,
        (current, total) => {
          // 更新进度
          this.setData({
            'uploadProgress.current': current,
            'uploadProgress.total': total,
            'uploadProgress.percent': Math.floor((current / total) * 100)
          });
        }
      );

      console.log('[上传视频] 上传成功:', cloudUrls);

      // 替换临时路径为云存储URL
      const videos = [...this.data.videos];
      tempPaths.forEach((tempPath, index) => {
        const videoIndex = videos.indexOf(tempPath);
        if (videoIndex > -1 && cloudUrls[index]) {
          videos[videoIndex] = cloudUrls[index];
        }
      });

      this.setData({
        videos,
        uploading: false
      });
    } catch (error) {
      console.error('[上传视频] 上传失败:', error);
      this.setData({ uploading: false });

      wx.showToast({
        title: '视频上传失败',
        icon: 'none'
      });
    }
  },

  /**
   * 预览照片
   */
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    });
  },

  /**
   * 删除照片
   */
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const photos = [...this.data.photos];
          photos.splice(index, 1);
          this.setData({ photos });
        }
      }
    });
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
        }
      }
    });
  },

  /**
   * 提交资料
   */
  async handleSubmit() {
    // 1. 检查是否有资料
    if (this.data.photos.length === 0 && this.data.videos.length === 0) {
      wx.showToast({
        title: '请至少上传一张照片或一个视频',
        icon: 'none'
      });
      return;
    }

    // 2. 检查是否还有未上传完成的文件
    if (this.data.uploading) {
      wx.showToast({
        title: '请等待文件上传完成',
        icon: 'none'
      });
      return;
    }

    // 3. 二次确认
    const confirmResult = await this.showConfirmDialog();
    if (!confirmResult) {
      return;
    }

    // 4. 提交到云函数
    this.setData({ submitting: true });

    try {
      // 分别上传照片和视频记录
      if (this.data.photos.length > 0) {
        await uploadInterviewPhotos(this.data.candidateId, this.data.photos);
      }

      if (this.data.videos.length > 0) {
        await uploadInterviewVideos(this.data.candidateId, this.data.videos);
      }

      console.log('[上传资料] 提交成功');

      wx.showToast({
        title: '提交成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    } catch (error) {
      console.error('[上传资料] 提交失败:', error);
      this.setData({ submitting: false });
      // 错误提示已在 API 函数中处理
    }
  },

  /**
   * 显示确认对话框
   */
  showConfirmDialog() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '确认提交',
        content: `确定提交${this.data.photos.length}张照片和${this.data.videos.length}个视频吗？`,
        confirmText: '确定提交',
        cancelText: '再看看',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }
});
