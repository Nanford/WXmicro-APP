// pages/login/login.js
const { post } = require('../../utils/request');
const app = getApp();

Page({
    data: {
        agreed: false
    },

    onLoad() {
        // Check if already logged in
        if (app.globalData.isLoggedIn) {
            wx.switchTab({
                url: '/pages/index/index',
            })
        }
    },

    toggleAgreement() {
        this.setData({
            agreed: !this.data.agreed
        });
    },

    getPhoneNumber(e) {
        if (!this.data.agreed) {
            wx.showToast({
                title: '请先阅读并同意协议',
                icon: 'none'
            });
            return;
        }

        if (e.detail.errMsg === 'getPhoneNumber:ok') {
            const { code, encryptedData, iv } = e.detail;
            this.handleLogin(code, encryptedData, iv);
        } else {
            wx.showToast({
                title: '需要授权手机号才能登录',
                icon: 'none'
            });
        }
    },

    async handleLogin(code, encryptedData, iv) {
        wx.showLoading({ title: '登录中...' });

        try {
            // Login to developer server
            const res = await post('/auth/login', {
                code,
                encryptedData,
                iv
            });

            if (res.code === 200) {
                const { token, userInfo } = res.data;

                // Save token and userInfo
                wx.setStorageSync('token', token);
                wx.setStorageSync('userInfo', userInfo);

                // Update global data
                app.globalData.isLoggedIn = true;
                app.globalData.token = token;
                app.globalData.userInfo = userInfo;

                wx.hideLoading();
                wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                });

                // Navigate to home
                setTimeout(() => {
                    wx.switchTab({
                        url: '/pages/index/index',
                    });
                }, 1500);
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            wx.hideLoading();
            wx.showToast({
                title: '登录失败: ' + (err.message || '网络错误'),
                icon: 'none'
            });
        }
    },

    handleGuestLogin() {
        if (!this.data.agreed) {
            wx.showToast({
                title: '请先阅读并同意协议',
                icon: 'none'
            });
            return;
        }

        wx.setStorageSync('isGuest', true);
        wx.switchTab({
            url: '/pages/index/index',
        });
    },

    viewAgreement(e) {
        const type = e.currentTarget.dataset.type;
        wx.showToast({
            title: `查看${type === 'user' ? '用户协议' : '隐私政策'}`,
            icon: 'none'
        });
    }
})
