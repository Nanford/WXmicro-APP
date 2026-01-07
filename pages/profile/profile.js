// pages/profile/profile.js
const app = getApp();

Page({
    data: {
        userInfo: null,
        isLoggedIn: false
    },

    onShow() {
        this.checkLoginStatus();
    },

    checkLoginStatus() {
        const app = getApp();
        if (!app || !app.globalData) return;

        const isLoggedIn = app.globalData.isLoggedIn;
        const userInfo = app.globalData.userInfo;
        this.setData({
            isLoggedIn,
            userInfo: userInfo || { nickName: '未登录用户', avatarUrl: '/assets/default-avatar.png' }
        });
    },

    handleLogin() {
        if (!this.data.isLoggedIn) {
            wx.navigateTo({
                url: '/pages/login/login',
            });
        }
    },

    handleMenuClick(e) {
        const action = e.currentTarget.dataset.action;
        switch (action) {
            case 'growth':
                // Navigate to chat for psychological counseling
                wx.navigateTo({
                    url: '/pages/chat/chat?from=profile'
                });
                break;
            case 'calendar':
                // Navigate to calendar page
                wx.switchTab({
                    url: '/pages/calendar/calendar'
                });
                break;
            case 'analysis':
                // Navigate to assessment page
                wx.switchTab({
                    url: '/pages/assessment/assessment'
                });
                break;
            case 'contact':
                this.showContact();
                break;
            case 'editNickname':
                this.showEditNickname();
                break;
            case 'logout':
                this.handleLogout();
                break;
            default:
                wx.showToast({
                    title: '功能开发中',
                    icon: 'none'
                });
        }
    },

    showEditNickname() {
        wx.showModal({
            title: '修改昵称',
            editable: true,
            placeholderText: '请输入新昵称',
            success: (res) => {
                if (res.confirm && res.content) {
                    const newNickname = res.content.trim();
                    if (newNickname) {
                        // Update global and local state
                        const userInfo = { ...this.data.userInfo, nickName: newNickname };
                        app.globalData.userInfo = userInfo;
                        wx.setStorageSync('userInfo', userInfo);
                        this.setData({ userInfo });
                        wx.showToast({ title: '修改成功', icon: 'success' });
                    }
                }
            }
        });
    },

    showContact() {
        wx.showModal({
            title: '联系客服',
            content: '请添加企业微信客服',
            showCancel: false
        });
    },

    handleLogout() {
        wx.showModal({
            title: '提示',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.clearStorageSync();
                    app.globalData.isLoggedIn = false;
                    app.globalData.userInfo = null;
                    app.globalData.token = null;
                    this.checkLoginStatus();
                    wx.reLaunch({
                        url: '/pages/login/login',
                    });
                }
            }
        });
    }
})
