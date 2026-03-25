// backend/wechat-auth.js - 微信登录认证模块
// 支持开发模式（模拟）和生产模式（真实API）

const axios = require('axios');
const crypto = require('crypto');

// 微信API配置 - 通过 init() 注入动态获取函数
const WECHAT_API_BASE = 'https://api.weixin.qq.com';
let _getConfig = null;

/**
 * 初始化微信认证模块
 * @param {Function} getConfig - 返回 { wechatAppid, wechatAppSecret } 的函数
 */
function init(getConfig) {
    _getConfig = getConfig;
}

/**
 * 获取当前微信配置
 */
function getWechatConfig() {
    if (_getConfig) {
        return _getConfig();
    }
    // 兼容：如果未初始化，尝试从环境变量读取
    return {
        wechatAppid: process.env.WECHAT_APPID,
        wechatAppSecret: process.env.WECHAT_APP_SECRET
    };
}

/**
 * 检查是否配置了微信凭证
 */
function isConfigured() {
    const { wechatAppid, wechatAppSecret } = getWechatConfig();
    return !!(wechatAppid && wechatAppSecret &&
        wechatAppid !== 'your_appid_here' &&
        wechatAppSecret !== 'your_app_secret_here');
}

/**
 * 使用code换取session_key和openid
 * @param {string} code - 微信登录code
 * @returns {Promise<{openid: string, sessionKey: string, unionid?: string}>}
 */
async function code2Session(code) {
    if (!isConfigured()) {
        console.log('⚠️ 微信凭证未配置，使用开发模式');
        return {
            openid: 'dev_openid_' + Date.now(),
            sessionKey: 'dev_session_key_' + Date.now(),
            isDev: true
        };
    }

    const { wechatAppid, wechatAppSecret } = getWechatConfig();

    try {
        const url = `${WECHAT_API_BASE}/sns/jscode2session`;
        const response = await axios.get(url, {
            params: {
                appid: wechatAppid,
                secret: wechatAppSecret,
                js_code: code,
                grant_type: 'authorization_code'
            },
            timeout: 10000
        });

        const data = response.data;

        if (data.errcode) {
            throw new Error(`微信API错误: ${data.errcode} - ${data.errmsg}`);
        }

        console.log('✅ 微信登录成功，openid:', data.openid.substring(0, 10) + '...');

        return {
            openid: data.openid,
            sessionKey: data.session_key,
            unionid: data.unionid,
            isDev: false
        };
    } catch (err) {
        console.error('❌ code2Session失败:', err.message);
        throw err;
    }
}

/**
 * 解密微信加密数据（如手机号）
 * @param {string} sessionKey - session_key
 * @param {string} encryptedData - 加密数据
 * @param {string} iv - 初始向量
 * @returns {object} 解密后的数据
 */
function decryptData(sessionKey, encryptedData, iv) {
    if (!sessionKey || !encryptedData || !iv) {
        console.log('⚠️ 缺少解密参数，跳过解密');
        return null;
    }

    // 开发模式检测
    if (sessionKey.startsWith('dev_session_key_')) {
        console.log('⚠️ 开发模式，返回模拟手机号');
        return {
            phoneNumber: '13800138000',
            purePhoneNumber: '13800138000',
            countryCode: '86',
            isDev: true
        };
    }

    const { wechatAppid } = getWechatConfig();

    try {
        // 解码Base64
        const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
        const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
        const ivBuffer = Buffer.from(iv, 'base64');

        // AES-128-CBC 解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
        decrypted += decipher.final('utf8');

        const result = JSON.parse(decrypted);

        // 验证appid
        if (result.watermark && result.watermark.appid !== wechatAppid) {
            throw new Error('数据来源appid不匹配');
        }

        console.log('✅ 手机号解密成功');
        return result;
    } catch (err) {
        console.error('❌ 解密失败:', err.message);
        throw new Error('手机号解密失败: ' + err.message);
    }
}

/**
 * 格式化手机号用于显示（脱敏）
 * @param {string} phone - 完整手机号
 * @returns {string} 脱敏后的手机号
 */
function maskPhoneNumber(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

module.exports = {
    init,
    isConfigured,
    code2Session,
    decryptData,
    maskPhoneNumber
};
