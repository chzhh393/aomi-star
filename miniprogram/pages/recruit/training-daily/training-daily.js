const TRAINING_BASE = {
  name: '奥米光年传媒训练基地',
  latitude: 30.69046,
  longitude: 104.10404,
  radiusMeters: 300
};

function toRadians(value) {
  return value * Math.PI / 180;
}

function calculateDistanceMeters(from, to) {
  const earthRadius = 6378137;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

Page({
  data: {
    candidate: null,
    loading: true,
    submitting: false,
    locating: false,
    locationAuthorized: true,
    locationStatusText: '需在训练基地 300 米范围内提交',
    canSubmitByLocation: false,
    currentDistanceText: '',
    recordTypeOptions: [
      { value: 'entry_note', label: '入场训练记录' },
      { value: 'exit_note', label: '离场复盘记录' }
    ],
    recordTypeIndex: 0,
    form: {
      recordDate: '',
      recordType: 'entry_note',
      title: '舞蹈室入场训练记录',
      summary: '',
      photos: [],
      locationSnapshot: null
    }
  },

  onLoad() {
    this.loadCandidate();
  },

  onShow() {
    if (!this.data.loading) {
      this.refreshCurrentLocation();
    }
  },

  async loadCandidate() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: { action: 'getByOpenId' }
      });

      const candidate = res.result?.candidate;
      if (!res.result?.success || !candidate) {
        throw new Error(res.result?.error || '未找到候选人');
      }

      this.setData({
        candidate,
        loading: false,
        'form.recordDate': new Date().toISOString().slice(0, 10)
      });
      await this.refreshCurrentLocation();
    } catch (error) {
      console.error('[training-daily] 加载失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  bindDateChange(e) {
    this.setData({
      'form.recordDate': e.detail.value
    });
  },

  bindTypeChange(e) {
    const index = Number(e.detail.value || 0);
    const option = this.data.recordTypeOptions[index] || this.data.recordTypeOptions[0];
    this.setData({
      recordTypeIndex: index,
      'form.recordType': option.value,
      'form.title': option.label === '离场复盘记录' ? '舞蹈室离场复盘记录' : '舞蹈室入场训练记录'
    });
  },

  bindSummaryInput(e) {
    this.setData({
      'form.summary': e.detail.value
    });
  },

  async refreshCurrentLocation() {
    this.setData({
      locating: true,
      locationStatusText: '定位中...',
      currentDistanceText: ''
    });

    try {
      const res = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });

      const currentPoint = {
        latitude: Number(res.latitude),
        longitude: Number(res.longitude)
      };
      const distance = calculateDistanceMeters(currentPoint, TRAINING_BASE);
      const withinRange = distance <= TRAINING_BASE.radiusMeters;

      this.setData({
        locating: false,
        locationAuthorized: true,
        canSubmitByLocation: withinRange,
        currentDistanceText: `当前距训练基地约 ${Math.round(distance)} 米`,
        locationStatusText: withinRange
          ? '定位校验通过，可提交训练记录'
          : `超出允许范围，仅限距训练基地 ${TRAINING_BASE.radiusMeters} 米内提交`,
        'form.locationSnapshot': {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          distanceMeters: Math.round(distance),
          checkedAt: new Date().toISOString(),
          baseName: TRAINING_BASE.name
        }
      });
      return withinRange;
    } catch (error) {
      console.error('[training-daily] 获取定位失败:', error);
      this.setData({
        locating: false,
        locationAuthorized: false,
        canSubmitByLocation: false,
        currentDistanceText: '',
        locationStatusText: '未获取到定位，开启定位权限后才能提交训练记录',
        'form.locationSnapshot': null
      });
      return false;
    }
  },

  async choosePhotos() {
    const remainCount = 6 - this.data.form.photos.length;
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传6张图片',
        icon: 'none'
      });
      return;
    }

    const res = await new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      });
    }).catch(() => null);

    const files = res?.tempFiles || [];
    if (files.length === 0) {
      return;
    }

    wx.showLoading({ title: '上传中...', mask: true });
    try {
      const uploaded = [];
      for (const file of files) {
        const ext = file.tempFilePath.split('.').pop() || 'jpg';
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `training-daily/${this.data.candidate._id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`,
          filePath: file.tempFilePath
        });
        uploaded.push(uploadRes.fileID);
      }

      this.setData({
        'form.photos': [...this.data.form.photos, ...uploaded]
      });
    } catch (error) {
      console.error('[training-daily] 图片上传失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({
      current: url,
      urls: this.data.form.photos
    });
  },

  deletePhoto(e) {
    const index = Number(e.currentTarget.dataset.index);
    const photos = [...this.data.form.photos];
    photos.splice(index, 1);
    this.setData({
      'form.photos': photos
    });
  },

  async submitRecord() {
    const withinRange = await this.refreshCurrentLocation();
    if (!withinRange) {
      wx.showToast({
        title: this.data.locationAuthorized ? '请在训练基地 300 米范围内提交' : '请先开启定位权限',
        icon: 'none'
      });
      return;
    }

    if (!this.data.form.summary.trim()) {
      wx.showToast({
        title: this.data.form.recordType === 'exit_note' ? '请填写离场复盘心得' : '请填写入场训练说明',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'candidate',
        data: {
          action: 'submitTrainingDailyRecord',
          data: this.data.form
        }
      });

      if (!res.result?.success) {
        throw new Error(res.result?.error || '提交失败');
      }

      wx.showToast({
        title: '记录已提交',
        icon: 'success'
      });

      this.setData({
        'form.summary': '',
        'form.photos': []
      });
      await this.loadCandidate();
    } catch (error) {
      console.error('[training-daily] 提交失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
