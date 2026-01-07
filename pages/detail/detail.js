// pages/detail/detail.js
const { get } = require('../../utils/request');

Page({
    data: {
        id: '',
        type: 'course', // course, assessment, etc.
        info: null,
        btnText: '立即参加'
    },

    onLoad(options) {
        const { id, type } = options;
        this.setData({
            id: id || '1',
            type: type || 'course'
        });
        this.getDetail();
    },

    async getDetail() {
        this.setData({
            info: {
                title: '示例内容标题',
                subTitle: '这是一个示例副标题',
                price: 99.9,
                originalPrice: 199.9,
                count: 2345,
                cover: '', // Placeholder
                content: '<div style="color: #666; padding: 10px;">这里是详情内容的富文本展示区。<br/><br/>可以包含图片、文字等。<br/><img src="https://via.placeholder.com/300x200" style="width:100%; height:auto; border-radius: 8px; margin: 10px 0;"></div>'
            }
        });

        // Determine button text
        let btnText = '立即参加';
        if (this.data.type === 'assessment') {
            btnText = '立即测评';
        } else if (this.data.type === 'resource') {
            btnText = '立即领取';
        }
        this.setData({ btnText });
    },

    handleBack() {
        wx.navigateBack();
    },

    handleAction() {
        wx.showModal({
            title: '支付提示',
            content: '是否确认支付 ¥' + this.data.info.price + '？',
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
