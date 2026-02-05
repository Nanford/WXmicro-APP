// pages/detail/detail.js
const { get } = require('../../utils/request');
const { BASE_URL } = require('../../utils/config');

Page({
    data: {
        id: '',
        type: 'course', // course, assessment, content
        info: null,
        btnText: '立即参加',
        loading: true
    },

    onLoad(options) {
        const { id, type } = options;
        this.setData({
            id: id || '1',
            type: type || 'course'
        });
        this.getDetail();
    },

    // 处理图片URL，将相对路径转为完整URL
    processImageUrl(url) {
        if (url && url.startsWith('/')) {
            return BASE_URL + url;
        }
        return url;
    },

    async getDetail() {
        wx.showLoading({ title: '加载中' });

        try {
            let apiPath = '';
            let btnText = '立即参加';

            // 根据类型确定API路径和按钮文本
            if (this.data.type === 'assessment') {
                apiPath = `/assessment/${this.data.id}`;
                btnText = '立即测评';
            } else {
                apiPath = `/content/${this.data.id}`;
                if (this.data.type === 'resource') {
                    btnText = '立即领取';
                }
            }

            const res = await get(apiPath);
            wx.hideLoading();

            if (res.code === 200) {
                const info = res.data;
                // 处理封面图URL
                if (info.image) {
                    info.cover = this.processImageUrl(info.image);
                } else if (info.cover) {
                    info.cover = this.processImageUrl(info.cover);
                }

                this.setData({
                    info,
                    btnText,
                    loading: false
                });
            } else {
                this.showError('加载失败');
            }
        } catch (err) {
            wx.hideLoading();
            console.error('获取详情失败:', err);
            this.showError('加载失败');
        }
    },

    showError(msg) {
        this.setData({ loading: false });
        wx.showToast({ title: msg, icon: 'none' });
    },

    handleBack() {
        wx.navigateBack();
    },

    handleAction() {
        if (!this.data.info) return;

        const price = this.data.info.price || 0;

        if (price <= 0) {
            // 免费内容直接进入
            wx.showToast({
                title: '已领取成功',
                icon: 'success'
            });
            return;
        }

        wx.showModal({
            title: '支付提示',
            content: '是否确认支付 ¥' + price + '？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '支付中...' });
                    setTimeout(() => {
                        wx.hideLoading();
                        wx.showToast({
                            title: '支付成功',
                            icon: 'success'
                        });
                    }, 1000);
                }
            }
        });
    }
})

