// utils/request.js
const app = getApp();

const API_BASE_URL = 'https://your-domain.com/api'; // Replace with real API
const USE_MOCK = true; // Toggle mock data

const mockData = {
    '/auth/login': { token: 'mock-token-123', userInfo: { nickName: '微信用户79889', avatarUrl: '', isMember: true } },
    '/home/recommend': {
        list: [
            { id: 1, tag: '学习社群', title: 'NLP技巧跟练3天学习营', desc: 'AI跟练+真人助教', btnText: '去学习' },
            { id: 2, tag: '使用指南', title: 'AI李中莹使用指南', desc: '困扰答疑/技巧练习', btnText: '去查看' },
            { id: 3, tag: '资料包', title: 'NLP实用技巧15则', desc: '一看就会，一会就能用！', btnText: '去领取' }
        ]
    },
    '/assessment/list': {
        list: [
            { id: 1, title: '财富动力测评', desc: '是什么在阻止你赚更多钱?', price: 19.9, count: 3724, image: '' },
            { id: 2, title: '金钱惩罚测试', desc: '测一测你的"金钱惩罚"指数', price: 19.9, count: 3528, image: '' },
            { id: 3, title: '亲子沟通模式测评', desc: '是复利模式还是负利模式?', price: 19.9, count: 3507, image: '' },
            { id: 4, title: '情绪智力测评', desc: '理解情绪，是自我成熟的前提', price: 19.9, count: 3644, image: '' },
            { id: 5, title: '养育风格测评', desc: '科学养育，做更少但更对的事', price: 19.9, count: 3503, image: '' }
        ]
    },
    '/chat/send': { reply: '我在听呢，今天有什么想和我分享的吗？' }
};

const request = (url, method, data) => {
    return new Promise((resolve, reject) => {
        if (USE_MOCK) {
            console.log(`[MOCK] Request: ${url}`, data);
            const endpoint = url.replace(API_BASE_URL, '');

            // Simple mock router
            let response = mockData[endpoint];

            // Dynamic mock handling
            if (!response) {
                // Generic fallback
                response = { message: 'Mock response' };
            }

            setTimeout(() => {
                resolve({ code: 200, message: 'success', data: response });
            }, 500);
            return;
        }

        wx.request({
            url: API_BASE_URL + url,
            method: method,
            data: data,
            header: {
                'content-type': 'application/json',
                'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success(res) {
                if (res.statusCode === 200) {
                    resolve(res.data);
                } else {
                    reject(res);
                }
            },
            fail(err) {
                reject(err);
            }
        })
    });
}

const get = (url, data) => request(url, 'GET', data);
const post = (url, data) => request(url, 'POST', data);

module.exports = {
    get,
    post,
    API_BASE_URL
}
