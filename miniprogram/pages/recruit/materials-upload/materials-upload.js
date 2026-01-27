import { getCandidateById, uploadInterviewMaterials } from '../../../mock/candidates.js';

Page({
  data: {
    candidateId: '',
    candidate: null,
    formData: {
      videoPath: '',
      photosPaths: [],
      notes: ''
    }
  },

  onLoad(options) {
    const candidateId = options.candidateId;
    this.setData({ candidateId });
    this.loadCandidate();
  },

  loadCandidate() {
    const candidate = getCandidateById(this.data.candidateId);
    this.setData({ candidate });
  },

  onMockUploadVideo() {
    const mockPath = `/mock/videos/interview_${this.data.candidateId}_${Date.now()}.mp4`;
    this.setData({ 'formData.videoPath': mockPath });
    wx.showToast({ title: 'Mock视频已选择', icon: 'success' });
  },

  onMockUploadPhotos() {
    const mockPaths = [
      `/mock/photos/photo_${this.data.candidateId}_1.jpg`,
      `/mock/photos/photo_${this.data.candidateId}_2.jpg`,
      `/mock/photos/photo_${this.data.candidateId}_3.jpg`
    ];
    this.setData({ 'formData.photosPaths': mockPaths });
    wx.showToast({ title: 'Mock照片已选择', icon: 'success' });
  },

  onNotesInput(e) {
    this.setData({ 'formData.notes': e.detail.value });
  },

  onSubmit() {
    const { videoPath, photosPaths } = this.data.formData;

    if (!videoPath) {
      wx.showToast({ title: '请选择视频', icon: 'none' });
      return;
    }

    const userId = wx.getStorageSync('user_info')?.id || 'PH001';
    const materialsData = {
      videoPath,
      photosPaths,
      notes: this.data.formData.notes,
      uploadedBy: userId
    };

    const success = uploadInterviewMaterials(this.data.candidateId, 'photographer', materialsData);

    if (success) {
      wx.showToast({ title: '上传成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } else {
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  }
});
