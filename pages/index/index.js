// pages/index/index.js
const { get } = require('../../utils/request');

Page({
    data: {
        greeting: '早上好',
        recommendations: []
    },

    onLoad() {
        this.setGreeting();
        this.getRecommendations();
    },

    onPullDownRefresh() {
        this.getRecommendations().then(() => {
            wx.stopPullDownRefresh();
        });
    },

    setGreeting() {
        const hour = new Date().getHours();
        let greeting = '';
        if (hour >= 6 && hour < 12) {
            greeting = '早上好';
        } else if (hour >= 12 && hour < 18) {
            greeting = '下午好';
        } else {
            greeting = '晚上好';
        }
        this.setData({ greeting });
    },

    async getRecommendations() {
        try {
            const res = await get('/home/recommend');
            if (res.code === 200) {
                this.setData({
                    recommendations: res.data.list
                });
            }
        } catch (err) {
            console.error(err);
            wx.showToast({
                title: '加载推荐失败',
                icon: 'none'
            });
        }
    },

    handleChat() {
        wx.navigateTo({
            url: '/pages/chat/chat',
        });
    },

    handleCardClick(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/detail/detail?id=${id}`,
        });
    }
})
