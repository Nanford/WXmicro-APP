// utils/config.js - 统一配置管理
// ============================================
// API配置 - 部署时只需更改此处
// ============================================

/**
 * 环境配置
 * development: 本地开发环境
 * production: 生产环境
 */
const ENV = 'production'; // 更改为 'production' 切换到生产环境

/**
 * API基础URL配置
 * 部署时只需更改 PRODUCTION_BASE_URL 为你的域名
 */
const API_CONFIG = {
    // 开发环境 - 本地后端服务器
    development: {
        BASE_URL: 'http://localhost:3000',
        USE_MOCK: false // 设为 true 使用模拟数据
    },
    // 生产环境 - 部署后的域名
    production: {
        BASE_URL: 'https://hcmai.szhlsn.cn', // 生产环境域名
        USE_MOCK: false
    }
};

// ============================================
// 导出配置
// ============================================

// 当前环境配置
const currentConfig = API_CONFIG[ENV];

// API基础URL（不带 /api 后缀）
const BASE_URL = currentConfig.BASE_URL;

// API完整前缀
const API_BASE_URL = `${BASE_URL}/api`;

// 是否使用模拟数据
const USE_MOCK = currentConfig.USE_MOCK;

// 环境标识
const IS_DEV = ENV === 'development';
const IS_PROD = ENV === 'production';

module.exports = {
    ENV,
    BASE_URL,
    API_BASE_URL,
    USE_MOCK,
    IS_DEV,
    IS_PROD
};
