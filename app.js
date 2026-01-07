// app.js
App({
  onLaunch() {
    // Check if user is logged in
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (token && userInfo) {
      this.globalData.isLoggedIn = true;
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
  },

  globalData: {
    isLoggedIn: false,
    token: null,
    userInfo: null
  }
})
