// pages/scout/grade-intro/grade-intro.js
Page({
  data: {
    currentGrade: 'rookie',
    signedCount: 0
  },

  onLoad(options) {
    const { grade, signedCount } = options;
    this.setData({
      currentGrade: grade || 'rookie',
      signedCount: parseInt(signedCount) || 0
    });
  }
});
