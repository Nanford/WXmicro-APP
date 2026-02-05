// utils/kimi-ai.js - Kimi AI Integration (Backend Proxy Version)
const { BASE_URL } = require('./config');

// 后端服务器配置已移至 config.js，部署时只需更改 config.js 中的域名
const BACKEND_URL = BASE_URL;

/**
 * 获取用户唯一ID
 * 在真实环境中，应该使用微信的 openid 或用户登录后的唯一标识
 */
function getUserId() {
    // 尝试从缓存获取
    let userId = wx.getStorageSync('userId');

    if (!userId) {
        // 生成临时ID（开发用）
        // 生产环境应使用 wx.login() 获取 openid
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        wx.setStorageSync('userId', userId);
    }

    return userId;
}

/**
 * Send message to Kimi AI via backend proxy
 * @param {string} userMessage - User's message
 * @returns {Promise<string>} - AI response
 */
async function sendMessage(userMessage) {
    return new Promise((resolve, reject) => {
        const userId = getUserId();

        wx.request({
            url: `${BACKEND_URL}/api/chat`,
            method: 'POST',
            header: {
                'Content-Type': 'application/json'
                // 如果后端配置了认证，在这里添加：
                // 'X-Auth-Token': 'your-secret-token'
            },
            data: {
                userId: userId,
                message: userMessage
            },
            timeout: 30000, // 30 seconds timeout
            success(res) {
                console.log('[Backend] Response received:', res);

                if (res.statusCode === 200 && res.data && res.data.success) {
                    const aiResponse = res.data.data.reply;
                    resolve(aiResponse);
                } else {
                    console.error('[Backend] Invalid response:', res);
                    reject(new Error(res.data?.error || 'AI响应格式错误'));
                }
            },
            fail(err) {
                console.error('[Backend] Request failed:', err);

                // Provide user-friendly error messages
                let errorMessage = '抱歉，我暂时无法回应。';

                if (err.errMsg && err.errMsg.includes('timeout')) {
                    errorMessage = '网络连接超时，请稍后再试。';
                } else if (err.errMsg && err.errMsg.includes('fail')) {
                    errorMessage = '网络连接失败，请检查网络设置。';
                }

                reject(new Error(errorMessage));
            }
        });
    });
}

/**
 * Initialize conversation (handled by backend)
 */
function initConversation() {
    // 后端会自动管理会话历史
    console.log('[Backend] Conversation initialized for user:', getUserId());
}

/**
 * Clear conversation history
 */
async function clearHistory() {
    return new Promise((resolve, reject) => {
        const userId = getUserId();

        wx.request({
            url: `${BACKEND_URL}/api/chat/clear`,
            method: 'POST',
            header: {
                'Content-Type': 'application/json'
            },
            data: {
                userId: userId
            },
            success(res) {
                if (res.statusCode === 200 && res.data && res.data.success) {
                    console.log('[Backend] Conversation cleared');
                    resolve();
                } else {
                    reject(new Error('清除会话失败'));
                }
            },
            fail(err) {
                console.error('[Backend] Clear history failed:', err);
                reject(err);
            }
        });
    });
}

/**
 * Get conversation history
 * 注意：后端代理模式下，历史记录存储在后端
 * 此函数返回空数组，仅为保持接口一致性
 */
function getHistory() {
    console.warn('[Backend] History is managed on backend, returning empty array');
    return [];
}

/**
 * Get welcome message
 */
function getWelcomeMessage() {
    return '你好！我是你的心理陪伴老师，彩虹老师，很高兴能在这里与你相遇。\n\n在这个安全、温暖的空间里，你可以自由地分享你的感受、困扰或任何想说的话。无论是开心的事情，还是让你困惑、焦虑的问题，我都会认真倾听。\n\n今天，有什么想和我聊聊的吗？😊';
}

/**
 * Check backend health
 */
async function checkHealth() {
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${BACKEND_URL}/api/health`,
            method: 'GET',
            success(res) {
                if (res.statusCode === 200 && res.data.status === 'ok') {
                    console.log('[Backend] Health check passed');
                    resolve(true);
                } else {
                    reject(new Error('Backend service unhealthy'));
                }
            },
            fail(err) {
                console.error('[Backend] Health check failed:', err);
                reject(err);
            }
        });
    });
}

module.exports = {
    sendMessage,
    getHistory,
    clearHistory,
    initConversation,
    getWelcomeMessage,
    checkHealth,
    getUserId
};
