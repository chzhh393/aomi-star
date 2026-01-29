// pages/recruit/apply/apply.js
import { getCurrentOpenId, requireLogin } from '../../../utils/auth.js';

Page({
  data: {
    scoutShareCode: '',   // 星探分享码

    // 当前步骤
    currentStep: 0,
    steps: ['基础信息', '才艺信息'],

    // 表单数据
    formData: {
      basicInfo: {
        name: '',
        artName: '',
        age: '',
        gender: '男',
        height: '',
        weight: '',
        phone: '',
        wechat: '',
        mbti: '',
        hobbies: [],
        selectedHobbies: {},
        hasOtherHobby: false,
        otherHobby: '',
        douyin: '',
        douyinFans: '',
        xiaohongshu: '',
        xiaohongshuFans: '',
        facePhoto: '',
        lifePhoto1: '',
        lifePhoto2: '',
        lifePhoto3: ''
      },
      talent: {
        talents: [],
        selectedTalents: {},
        hasOther: false,
        otherTalent: '',
        videos: [],
        level: 5,
        works: []
      },
      experience: {
        hasExperience: false,
        guild: '',
        accountName: ''
      }
    },

    // 选项
    genderOptions: ['男', '女'],
    mbtiOptions: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP', '不清楚'],
    hobbyOptions: ['游戏电竞', '健身撸铁', '户外运动', '音乐', '摄影', '美食', '二次元', '穿搭', '宠物'],
    talentCategories: [
      { name: '唱歌', options: ['流行唱法', '民族唱法', '美声唱法', '说唱'] },
      { name: '舞蹈', options: ['民族舞', '街舞', '现代舞', '古典舞', '拉丁舞'] },
      { name: '乐器', options: ['钢琴', '吉他', '古筝', '小提琴', '架子鼓', '二胡'] }
    ],
    expandedCategories: {},
    salaryOptions: ['3000-5000', '5000-8000', '8000-12000', '12000以上'],
    timeOptions: ['全职', '兼职'],
    platformOptions: ['抖音', '快手', '小红书', 'B站'],

    // 上传状态
    uploading: false,

    // 编辑模式
    isEditMode: false
  },

  onLoad(options) {
    // 获取星探推荐码
    const { ref, mode } = options;
    if (ref) {
      this.setData({ scoutShareCode: ref });
      console.log('[报名] 检测到星探推荐码:', ref);
    }

    // 确保用户已登录
    this.ensureLogin();

    // 编辑模式：从云端加载已有数据
    if (mode === 'edit') {
      this.setData({ isEditMode: true });
      this.loadExistingData();
      return;
    }

    // 新建模式：尝试恢复草稿
    const draft = wx.getStorageSync('applyDraft');
    if (draft) {
      // 确保 talent 数据结构完整
      if (!draft.talent) {
        draft.talent = this.data.formData.talent;
      } else {
        if (!draft.talent.talents) draft.talent.talents = [];
        if (!draft.talent.selectedTalents) draft.talent.selectedTalents = {};
        if (draft.talent.hasOther === undefined) draft.talent.hasOther = false;
        if (!draft.talent.otherTalent) draft.talent.otherTalent = '';
        if (!draft.talent.videos) draft.talent.videos = [];
      }
      this.setData({ formData: draft });
    }
  },

  // 编辑模式：加载已有报名数据
  async loadExistingData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      if (res.result && res.result.success && res.result.candidate) {
        const c = res.result.candidate;

        // 重建 selectedHobbies
        const selectedHobbies = {};
        if (c.basicInfo.hobbies) {
          c.basicInfo.hobbies.forEach(h => { selectedHobbies[h] = true; });
        }

        // 重建 selectedTalents
        const selectedTalents = {};
        if (c.talent && c.talent.talents) {
          c.talent.talents.forEach(t => { selectedTalents[t] = true; });
        }

        // 映射云端数据到表单结构
        const formData = {
          basicInfo: {
            name: c.basicInfo.name || '',
            artName: c.basicInfo.artName || '',
            age: c.basicInfo.age ? String(c.basicInfo.age) : '',
            gender: c.basicInfo.gender || '男',
            height: c.basicInfo.height ? String(c.basicInfo.height) : '',
            weight: c.basicInfo.weight ? String(c.basicInfo.weight) : '',
            phone: c.basicInfo.phone || '',
            wechat: c.basicInfo.wechat || '',
            mbti: c.basicInfo.mbti || '',
            hobbies: c.basicInfo.hobbies || [],
            selectedHobbies: selectedHobbies,
            hasOtherHobby: false,
            otherHobby: '',
            douyin: c.basicInfo.douyin || '',
            douyinFans: c.basicInfo.douyinFans || '',
            xiaohongshu: c.basicInfo.xiaohongshu || '',
            xiaohongshuFans: c.basicInfo.xiaohongshuFans || '',
            facePhoto: (c.images && c.images.facePhoto) || c.basicInfo.facePhoto || '',
            lifePhoto1: (c.images && c.images.lifePhoto1) || c.basicInfo.lifePhoto1 || '',
            lifePhoto2: (c.images && c.images.lifePhoto2) || c.basicInfo.lifePhoto2 || '',
            lifePhoto3: (c.images && c.images.lifePhoto3) || c.basicInfo.lifePhoto3 || ''
          },
          talent: {
            talents: (c.talent && c.talent.talents) || [],
            selectedTalents: selectedTalents,
            hasOther: !!(c.talent && c.talent.otherTalent),
            otherTalent: (c.talent && c.talent.otherTalent) || '',
            videos: (c.talent && c.talent.videos) || [],
            level: (c.talent && c.talent.level) || 5,
            works: []
          },
          experience: {
            hasExperience: (c.experience && c.experience.hasExperience) || false,
            guild: (c.experience && c.experience.guild) || '',
            accountName: (c.experience && c.experience.accountName) || ''
          }
        };

        this.setData({ formData });
        wx.hideLoading();
      } else {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        wx.navigateBack();
      }
    } catch (error) {
      console.error('[报名页] 加载已有数据失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 确保用户已登录
  async ensureLogin() {
    const openId = getCurrentOpenId();
    if (!openId) {
      // 未登录，触发登录
      await requireLogin({
        title: '需要登录',
        content: '请先登录后再填写报名表单',
        onSuccess: () => {
          console.log('[报名页] 登录成功');
        },
        onCancel: () => {
          // 用户取消，返回上一页
          wx.navigateBack();
        }
      });
    }
  },

  // 表单输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
    this.saveDraft();
  },

  // 选择照片
  onChoosePhoto(e) {
    const { type } = e.currentTarget.dataset;
    const fieldMap = {
      'face': 'basicInfo.facePhoto',
      'life1': 'basicInfo.lifePhoto1',
      'life2': 'basicInfo.lifePhoto2',
      'life3': 'basicInfo.lifePhoto3'
    };
    const field = fieldMap[type];

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          [`formData.${field}`]: tempFilePath
        });
        this.saveDraft();
      }
    });
  },

  // 预览照片
  onPreviewPhoto(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  // 删除照片
  onDeletePhoto(e) {
    const { type } = e.currentTarget.dataset;
    const fieldMap = {
      'face': 'basicInfo.facePhoto',
      'life1': 'basicInfo.lifePhoto1',
      'life2': 'basicInfo.lifePhoto2',
      'life3': 'basicInfo.lifePhoto3'
    };
    const field = fieldMap[type];
    this.setData({
      [`formData.${field}`]: ''
    });
    this.saveDraft();
  },

  // 兴趣爱好多选切换
  onHobbyToggle(e) {
    const { hobby } = e.currentTarget.dataset;
    const isSelected = this.data.formData.basicInfo.selectedHobbies[hobby];
    const hobbies = this.data.formData.basicInfo.hobbies ? this.data.formData.basicInfo.hobbies.slice() : [];

    if (isSelected) {
      var index = hobbies.indexOf(hobby);
      if (index > -1) hobbies.splice(index, 1);
    } else {
      hobbies.push(hobby);
    }

    this.setData({
      'formData.basicInfo.hobbies': hobbies,
      ['formData.basicInfo.selectedHobbies.' + hobby]: !isSelected
    });
    this.saveDraft();
  },

  // 其他兴趣爱好切换
  onOtherHobbyToggle() {
    const hasOtherHobby = !this.data.formData.basicInfo.hasOtherHobby;
    this.setData({
      'formData.basicInfo.hasOtherHobby': hasOtherHobby,
      'formData.basicInfo.otherHobby': hasOtherHobby ? this.data.formData.basicInfo.otherHobby : ''
    });
    this.saveDraft();
  },

  // 选择器变化
  onPickerChange(e) {
    const { field, options } = e.currentTarget.dataset;
    const index = e.detail.value;
    const value = this.data[options][index];
    this.setData({
      [`formData.${field}`]: value
    });
    this.saveDraft();
  },

  // 滑块变化
  onSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
    this.saveDraft();
  },

  // 直播经验切换
  onExperienceChange(e) {
    const { value } = e.currentTarget.dataset;
    const hasExperience = value === 'true';
    this.setData({
      'formData.experience.hasExperience': hasExperience,
      'formData.experience.guild': hasExperience ? this.data.formData.experience.guild : '',
      'formData.experience.accountName': hasExperience ? this.data.formData.experience.accountName : ''
    });
    this.saveDraft();
  },

  // 切换选项
  onToggle(e) {
    const { field } = e.currentTarget.dataset;
    const current = this.data.formData[field.split('.')[0]][field.split('.')[1]];
    this.setData({
      [`formData.${field}`]: !current
    });
    this.saveDraft();
  },

  // 才艺多选切换
  onTalentToggle(e) {
    const { talent } = e.currentTarget.dataset;
    const isSelected = this.data.formData.talent.selectedTalents[talent];
    const talents = this.data.formData.talent.talents ? this.data.formData.talent.talents.slice() : [];

    if (isSelected) {
      // 取消选择
      const index = talents.indexOf(talent);
      if (index > -1) talents.splice(index, 1);
    } else {
      // 选择
      talents.push(talent);
    }

    this.setData({
      'formData.talent.talents': talents,
      ['formData.talent.selectedTalents.' + talent]: !isSelected
    });
    this.saveDraft();
  },

  // 切换一级分类展开/收起
  onCategoryToggle(e) {
    const { category } = e.currentTarget.dataset;
    const key = 'expandedCategories.' + category;
    this.setData({
      [key]: !this.data.expandedCategories[category]
    });
  },

  // 其他才艺切换
  onOtherToggle() {
    const hasOther = !this.data.formData.talent.hasOther;
    this.setData({
      'formData.talent.hasOther': hasOther,
      'formData.talent.otherTalent': hasOther ? this.data.formData.talent.otherTalent : ''
    });
    this.saveDraft();
  },

  // 选择才艺视频
  onChooseVideo() {
    const videos = this.data.formData.talent.videos || [];
    if (videos.length >= 5) {
      wx.showToast({ title: '最多上传5个视频', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 5 - videos.length,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        var newVideos = videos.slice();
        for (var i = 0; i < res.tempFiles.length; i++) {
          newVideos.push({
            url: res.tempFiles[i].tempFilePath,
            thumb: res.tempFiles[i].thumbTempFilePath || res.tempFiles[i].tempFilePath
          });
        }
        this.setData({
          'formData.talent.videos': newVideos
        });
        this.saveDraft();
      }
    });
  },

  // 预览视频
  onPreviewVideo(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewMedia({
        sources: [{ url: url, type: 'video' }]
      });
    }
  },

  // 删除视频
  onDeleteVideo(e) {
    const { index } = e.currentTarget.dataset;
    var videos = this.data.formData.talent.videos.slice();
    videos.splice(index, 1);
    this.setData({
      'formData.talent.videos': videos
    });
    this.saveDraft();
  },

  // 保存草稿
  saveDraft() {
    wx.setStorageSync('applyDraft', this.data.formData);
  },

  // 下一步
  nextStep() {
    if (!this.validateCurrentStep()) return;

    if (this.data.currentStep < this.data.steps.length - 1) {
      this.setData({
        currentStep: this.data.currentStep + 1
      });
    }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  // 验证当前步骤
  validateCurrentStep() {
    const { currentStep, formData } = this.data;

    if (currentStep === 0) {
      // 验证基础信息
      if (!formData.basicInfo.name) {
        wx.showToast({ title: '请输入真实姓名', icon: 'none' });
        return false;
      }
      if (!formData.basicInfo.age || formData.basicInfo.age < 18) {
        wx.showToast({ title: '年龄必须满18岁', icon: 'none' });
        return false;
      }
      if (!formData.basicInfo.phone) {
        wx.showToast({ title: '请输入手机号', icon: 'none' });
        return false;
      }
      if (!formData.basicInfo.wechat) {
        wx.showToast({ title: '请输入微信号', icon: 'none' });
        return false;
      }
      if (!formData.basicInfo.facePhoto) {
        wx.showToast({ title: '请上传素颜正面照', icon: 'none' });
        return false;
      }
      var hasLifePhoto = formData.basicInfo.lifePhoto1 || formData.basicInfo.lifePhoto2 || formData.basicInfo.lifePhoto3;
      if (!hasLifePhoto) {
        wx.showToast({ title: '请至少上传一张生活照', icon: 'none' });
        return false;
      }
    }

    if (currentStep === 1) {
      // 验证才艺信息
      if (formData.experience.hasExperience) {
        if (!formData.experience.guild) {
          wx.showToast({ title: '请填写之前所在工会', icon: 'none' });
          return false;
        }
        if (!formData.experience.accountName) {
          wx.showToast({ title: '请填写直播账号名', icon: 'none' });
          return false;
        }
      }
    }

    return true;
  },

  // 上传图片到云存储
  async uploadImage(filePath, cloudPath) {
    if (!filePath || filePath.startsWith('cloud://')) {
      return filePath; // 已经是云存储路径，直接返回
    }

    try {
      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });
      console.log('[上传] 图片上传成功:', res.fileID);
      return res.fileID;
    } catch (error) {
      console.error('[上传] 图片上传失败:', error);
      throw error;
    }
  },

  // 上传视频到云存储
  async uploadVideo(filePath, cloudPath) {
    if (!filePath || filePath.startsWith('cloud://')) {
      return filePath;
    }

    try {
      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });
      console.log('[上传] 视频上传成功:', res.fileID);
      return res.fileID;
    } catch (error) {
      console.error('[上传] 视频上传失败:', error);
      throw error;
    }
  },

  // 提交报名
  async submitApply() {
    if (!this.validateCurrentStep()) return;

    // 检查是否已登录
    const openId = getCurrentOpenId();
    if (!openId) {
      await this.ensureLogin();
      return;
    }

    this.setData({ uploading: true });
    wx.showLoading({ title: '正在提交...' });

    try {
      const { formData, scoutShareCode } = this.data;
      const timestamp = Date.now();

      // 1. 上传图片到云存储
      wx.showLoading({ title: '上传图片中...' });

      const uploadedImages = {
        facePhoto: '',
        lifePhoto1: '',
        lifePhoto2: '',
        lifePhoto3: ''
      };

      if (formData.basicInfo.facePhoto) {
        uploadedImages.facePhoto = await this.uploadImage(
          formData.basicInfo.facePhoto,
          `candidates/${openId}/face_${timestamp}.jpg`
        );
      }
      if (formData.basicInfo.lifePhoto1) {
        uploadedImages.lifePhoto1 = await this.uploadImage(
          formData.basicInfo.lifePhoto1,
          `candidates/${openId}/life1_${timestamp}.jpg`
        );
      }
      if (formData.basicInfo.lifePhoto2) {
        uploadedImages.lifePhoto2 = await this.uploadImage(
          formData.basicInfo.lifePhoto2,
          `candidates/${openId}/life2_${timestamp}.jpg`
        );
      }
      if (formData.basicInfo.lifePhoto3) {
        uploadedImages.lifePhoto3 = await this.uploadImage(
          formData.basicInfo.lifePhoto3,
          `candidates/${openId}/life3_${timestamp}.jpg`
        );
      }

      // 2. 上传视频到云存储
      wx.showLoading({ title: '上传视频中...' });

      const uploadedVideos = [];
      if (formData.talent.videos && formData.talent.videos.length > 0) {
        for (let i = 0; i < formData.talent.videos.length; i++) {
          const video = formData.talent.videos[i];
          const cloudUrl = await this.uploadVideo(
            video.url,
            `candidates/${openId}/video_${i}_${timestamp}.mp4`
          );
          uploadedVideos.push({
            cloudUrl: cloudUrl,
            cloudThumb: video.thumb
          });
        }
      }

      // 3. 准备提交数据
      const submitData = {
        formData: {
          basicInfo: {
            ...formData.basicInfo,
            facePhoto: uploadedImages.facePhoto,
            lifePhoto1: uploadedImages.lifePhoto1,
            lifePhoto2: uploadedImages.lifePhoto2,
            lifePhoto3: uploadedImages.lifePhoto3
          },
          talent: {
            ...formData.talent,
            videos: uploadedVideos
          },
          experience: formData.experience
        },
        source: scoutShareCode ? '星探推荐' : '官网报名',
        scoutShareCode: scoutShareCode || null
      };

      // 4. 调用云函数提交/更新
      const isEdit = this.data.isEditMode;
      wx.showLoading({ title: isEdit ? '更新中...' : '提交中...' });

      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: isEdit ? 'update' : 'submit',
          data: submitData
        }
      });

      console.log('[报名] 云函数返回:', res.result);

      if (res.result && res.result.success) {
        // 保存候选人ID到本地
        wx.setStorageSync('myCandidateId', res.result.candidateId);

        // 清除草稿
        wx.removeStorageSync('applyDraft');
        wx.removeStorageSync('scene_params');

        wx.hideLoading();
        this.setData({ uploading: false });

        wx.showToast({
          title: isEdit ? '修改成功！' : '报名成功！',
          icon: 'success',
          duration: 2000
        });

        // 跳转到状态页
        setTimeout(() => {
          wx.reLaunch({
            url: `/pages/recruit/status/status?id=${res.result.candidateId}`
          });
        }, 2000);

      } else {
        throw new Error(res.result?.error || '提交失败');
      }

    } catch (error) {
      console.error('[报名] 提交失败:', error);
      wx.hideLoading();
      this.setData({ uploading: false });

      let errorMsg = '提交失败，请重试';
      if (error.message === '您已经报名过了') {
        errorMsg = '您已经报名过了';
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  }
});
