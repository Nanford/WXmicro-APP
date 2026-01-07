// pages/assessment/assessment.js
const { get } = require('../../utils/request');

Page({
    data: {
        filters: ['全部', '情绪管理', '人际关系', '亲子教育'],
        activeFilter: 0,
        list: []
    },

    onLoad() {
        this.getList();
    },

    switchFilter(e) {
        const index = e.currentTarget.dataset.index;
        this.setData({ activeFilter: index });
        // Reload list based on filter
        this.getList();
    },

    async getList() {
        wx.showLoading({ title: '加载中' });
        try {
            const res = await get('/assessment/list');
            wx.hideLoading();
            if (res.code === 200) {
                this.setData({
                    list: res.data.list
                });
            }
        } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
    },

    goToDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/detail/detail?id=${id}&type=assessment`,
        });
    }
})
