// backend/server.js - AI彩虹老师 完整后端API服务
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dataManager = require('./data-manager');
require('dotenv').config();

const app = express();
app.use(express.json());

// ============================================
// 配置
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'ai-rainbow-secret-key-2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'ai-rainbow-admin-secret-2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_API_KEY = process.env.KIMI_API_KEY;

// ============================================
// CORS 配置
// ============================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ============================================
// 数据存储（使用文件持久化）
// ============================================
// 会话和临时数据仍使用内存
const sessions = new Map();
const emotionRecords = new Map();
const purchaseRecords = new Map();

// 从文件加载持久化数据
let assessments = dataManager.loadData('assessments');
let recommendations = dataManager.loadData('recommendations');
let contents = dataManager.loadData('contents');

// 心理咨询师系统提示词
const SYSTEM_PROMPT = `你是一位专业、温暖、富有同理心的心理疗愈咨询师。你的职责是：

1. **倾听与理解**：认真倾听用户的情绪和困扰，不做评判，给予充分的理解和接纳。

2. **情绪支持**：帮助用户识别、表达和理解自己的情绪，提供情感上的支持和安慰。

3. **温和引导**：用温和、非指导性的方式引导用户探索自己的感受和想法，帮助他们获得新的视角。

4. **专业建议**：在适当的时候，提供基于心理学理论的专业建议和应对策略。

5. **积极赋能**：帮助用户发现自身的力量和资源，培养积极的心态和应对能力。

请记住：
- 使用温暖、友善的语气
- 避免使用过于专业的术语
- 尊重用户的感受，不轻易下结论
- 如果用户的问题超出你的能力范围（如严重心理疾病），建议寻求专业心理医生的帮助
- 每次回复保持适当长度，既要充分回应，又不要让用户感到压力

你是用户值得信赖的心理伙伴，请用心陪伴他们成长。`;

// ============================================
// JWT 认证中间件
// ============================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            code: 401,
            message: '未授权，请先登录'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                code: 403,
                message: 'Token无效或已过期'
            });
        }
        req.user = user;
        next();
    });
};

// 可选认证中间件（不强制要求token）
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};

// 管理员认证中间件
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json(error(401, '未授权，需要管理员登录'));
    }

    jwt.verify(token, ADMIN_JWT_SECRET, (err, admin) => {
        if (err) {
            return res.status(403).json(error(403, 'Token无效或已过期'));
        }
        req.admin = admin;
        next();
    });
};

// ============================================
// 图片上传配置
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(dataManager.DATA_DIR, 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只支持图片格式: JPEG, PNG, GIF, WEBP'));
        }
    }
});

// 静态文件服务
app.use('/uploads', express.static(path.join(dataManager.DATA_DIR, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ============================================
// 统一响应格式
// ============================================
const success = (data, message = 'success') => ({
    code: 200,
    message,
    data
});

const error = (code, message) => ({
    code,
    message
});

// ============================================
// 用户认证模块 /api/auth
// ============================================

// POST /api/auth/login - 微信登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { code, encryptedData, iv } = req.body;

        if (!code) {
            return res.status(400).json(error(400, '缺少登录凭证'));
        }

        // 开发模式：生成模拟用户（生产环境需要调用微信API验证）
        // 真实环境应：1. 用code换取session_key 2. 解密encryptedData获取手机号
        const userId = 'user_' + Date.now();
        const userInfo = {
            id: userId,
            nickName: '微信用户' + Math.floor(Math.random() * 90000 + 10000),
            avatarUrl: '',
            isMember: false,
            memberExpiry: null,
            phone: '138****8888',
            createdAt: new Date().toISOString()
        };

        // 存储用户信息
        users.set(userId, userInfo);

        // 生成JWT Token
        const token = jwt.sign(
            { userId, nickName: userInfo.nickName },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json(success({
            token,
            userInfo: {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl,
                isMember: userInfo.isMember,
                memberExpiry: userInfo.memberExpiry
            }
        }));

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json(error(500, '登录失败，请稍后重试'));
    }
});

// ============================================
// 首页模块 /api/home
// ============================================

// GET /api/home/recommend - 获取首页推荐内容
app.get('/api/home/recommend', optionalAuth, (req, res) => {
    // 只返回上架的推荐内容
    const onlineList = recommendations.filter(r => r.status !== 'offline');
    res.json(success({ list: onlineList }));
});

// ============================================
// 测评模块 /api/assessment
// ============================================

// GET /api/assessment/list - 获取测评列表（分页）
app.get('/api/assessment/list', optionalAuth, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const category = req.query.category || '全部';

    // 只返回上架的测评
    let filteredList = assessments.filter(a => a.status !== 'offline');
    if (category !== '全部') {
        filteredList = filteredList.filter(a => a.category === category);
    }

    const total = filteredList.length;
    const start = (page - 1) * size;
    const end = start + size;
    const list = filteredList.slice(start, end);

    res.json(success({
        list,
        total,
        page,
        size
    }));
});

// GET /api/assessment/:id - 获取测评详情
app.get('/api/assessment/:id', optionalAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const assessment = assessments.find(a => a.id === id);

    if (!assessment) {
        return res.status(404).json(error(404, '测评不存在'));
    }

    // 添加详细内容
    const detail = {
        ...assessment,
        content: `<div style="color: #666; padding: 10px;">
            <h3>测评介绍</h3>
            <p>${assessment.desc}</p>
            <br/>
            <h3>测评内容</h3>
            <p>本测评共包含25道题目，预计用时10-15分钟。完成后将获得详细的分析报告和个性化建议。</p>
            <br/>
            <h3>适合人群</h3>
            <p>希望深入了解自己、追求个人成长的你。</p>
        </div>`,
        questions: 25,
        duration: '10-15分钟'
    };

    res.json(success(detail));
});

// POST /api/assessment/purchase - 购买测评
app.post('/api/assessment/purchase', authenticateToken, (req, res) => {
    const { assessment_id } = req.body;
    const userId = req.user.userId;

    if (!assessment_id) {
        return res.status(400).json(error(400, '缺少测评ID'));
    }

    const assessment = assessments.find(a => a.id === parseInt(assessment_id));
    if (!assessment) {
        return res.status(404).json(error(404, '测评不存在'));
    }

    // 模拟创建订单（生产环境需对接微信支付）
    const orderId = 'order_' + Date.now();
    const purchase = {
        orderId,
        userId,
        assessmentId: assessment_id,
        amount: assessment.price,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    // 存储购买记录
    if (!purchaseRecords.has(userId)) {
        purchaseRecords.set(userId, []);
    }
    purchaseRecords.get(userId).push(purchase);

    res.json(success({
        orderId,
        amount: assessment.price,
        paymentInfo: {
            // 模拟支付参数（生产环境由微信支付返回）
            timeStamp: Date.now().toString(),
            nonceStr: 'mock_nonce_' + Date.now(),
            package: 'prepay_id=mock_prepay_id',
            signType: 'MD5',
            paySign: 'mock_pay_sign'
        }
    }));
});

// ============================================
// 日历模块 /api/calendar
// ============================================

// POST /api/calendar/emotion - 保存情绪记录
app.post('/api/calendar/emotion', authenticateToken, (req, res) => {
    const { date, emotion_data } = req.body;
    const userId = req.user.userId;

    if (!date || !emotion_data) {
        return res.status(400).json(error(400, '缺少必要参数'));
    }

    // 存储情绪记录
    if (!emotionRecords.has(userId)) {
        emotionRecords.set(userId, new Map());
    }

    const userRecords = emotionRecords.get(userId);
    userRecords.set(date, {
        date,
        ...emotion_data,
        updatedAt: new Date().toISOString()
    });

    res.json(success(null, '情绪记录保存成功'));
});

// GET /api/calendar/emotion - 获取情绪记录
app.get('/api/calendar/emotion', authenticateToken, (req, res) => {
    const { start_date, end_date } = req.query;
    const userId = req.user.userId;

    const userRecords = emotionRecords.get(userId) || new Map();
    const records = [];

    userRecords.forEach((record, date) => {
        if ((!start_date || date >= start_date) && (!end_date || date <= end_date)) {
            records.push(record);
        }
    });

    // 按日期排序
    records.sort((a, b) => a.date.localeCompare(b.date));

    res.json(success({ records }));
});

// ============================================
// 用户模块 /api/user
// ============================================

// GET /api/user/profile - 获取用户信息
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const userInfo = users.get(userId);

    if (!userInfo) {
        return res.status(404).json(error(404, '用户不存在'));
    }

    res.json(success({
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        isMember: userInfo.isMember,
        memberExpiry: userInfo.memberExpiry,
        phone: userInfo.phone
    }));
});

// POST /api/user/update_nickname - 更新昵称
app.post('/api/user/update_nickname', authenticateToken, (req, res) => {
    const { nickname } = req.body;
    const userId = req.user.userId;

    if (!nickname || nickname.trim().length === 0) {
        return res.status(400).json(error(400, '昵称不能为空'));
    }

    if (nickname.length > 20) {
        return res.status(400).json(error(400, '昵称不能超过20个字符'));
    }

    const userInfo = users.get(userId);
    if (!userInfo) {
        return res.status(404).json(error(404, '用户不存在'));
    }

    userInfo.nickName = nickname.trim();
    users.set(userId, userInfo);

    res.json(success({ nickName: userInfo.nickName }, '昵称修改成功'));
});

// ============================================
// 内容详情模块 /api/content
// ============================================

// GET /api/content/:id - 获取内容详情
app.get('/api/content/:id', optionalAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const content = contents[id];

    if (!content || content.status === 'offline') {
        return res.status(404).json(error(404, '内容不存在'));
    }

    res.json(success(content));
});

// ============================================
// AI聊天模块 /api/chat（保留原有功能）
// ============================================

// 获取或创建会话
function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, [
            { role: 'system', content: aiConfig.systemPrompt || SYSTEM_PROMPT }
        ]);
    }
    return sessions.get(userId);
}

// 清理旧会话（保持最近20条消息）
function cleanupSession(messages) {
    if (messages.length > 21) {
        return [
            messages[0],
            ...messages.slice(-20)
        ];
    }
    return messages;
}

// POST /api/chat - 发送消息
app.post('/api/chat', async (req, res) => {
    try {
        // 检查AI服务是否启用
        if (!aiConfig.enabled) {
            return res.status(503).json({
                success: false,
                error: 'AI服务暂时不可用'
            });
        }

        const { userId, message } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        const messages = getSession(userId);
        messages.push({ role: 'user', content: message });

        const response = await axios.post(
            KIMI_API_URL,
            {
                model: aiConfig.model || 'kimi-k2-0905-Preview',
                messages: messages,
                temperature: aiConfig.temperature || 0.7,
                max_tokens: aiConfig.maxTokens || 800
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KIMI_API_KEY}`
                },
                timeout: 30000
            }
        );

        const aiReply = response.data.choices[0].message.content;
        messages.push({ role: 'assistant', content: aiReply });

        const cleanedMessages = cleanupSession(messages);
        sessions.set(userId, cleanedMessages);

        res.json({
            success: true,
            data: { reply: aiReply }
        });

    } catch (err) {
        console.error('Kimi API Error:', err.message);

        let errorMessage = '抱歉，我暂时无法回应。';
        let statusCode = 500;

        if (err.code === 'ECONNABORTED') {
            errorMessage = '网络连接超时，请稍后再试。';
            statusCode = 504;
        } else if (err.response) {
            statusCode = err.response.status;
            errorMessage = err.response.data?.error?.message || errorMessage;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// POST /api/chat/clear - 清除会话
app.post('/api/chat/clear', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: '缺少用户ID'
        });
    }

    sessions.delete(userId);

    res.json({
        success: true,
        message: '会话已清除'
    });
});

// GET /api/chat/history - 获取对话历史
app.get('/api/chat/history', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const messages = sessions.get(userId) || [];

    // 过滤掉系统消息
    const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            type: m.role === 'user' ? 'user' : 'ai',
            content: m.content
        }));

    res.json(success({ messages: history }));
});

// ============================================
// 管理后台API模块 /api/admin
// ============================================

// 加载AI配置
let aiConfig = dataManager.loadData('ai-config') || {
    systemPrompt: SYSTEM_PROMPT,
    model: 'kimi-k2-0905-Preview',
    temperature: 0.7,
    maxTokens: 800,
    enabled: true
};

// 用户数据
let users = dataManager.loadData('users') || {};

// POST /api/admin/login - 管理员登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json(error(400, '请输入用户名和密码'));
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json(error(401, '用户名或密码错误'));
    }

    const token = jwt.sign(
        { username, role: 'admin' },
        ADMIN_JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json(success({
        token,
        username,
        expiresIn: '24h'
    }, '登录成功'));
});

// GET /api/admin/stats - 仪表盘统计
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const onlineAssessments = assessments.filter(a => a.status !== 'offline').length;
    const onlineRecommendations = recommendations.filter(r => r.status !== 'offline').length;
    const onlineContents = Object.values(contents).filter(c => c.status !== 'offline').length;

    res.json(success({
        assessments: {
            total: assessments.length,
            online: onlineAssessments,
            offline: assessments.length - onlineAssessments
        },
        recommendations: {
            total: recommendations.length,
            online: onlineRecommendations,
            offline: recommendations.length - onlineRecommendations
        },
        contents: {
            total: Object.keys(contents).length,
            online: onlineContents,
            offline: Object.keys(contents).length - onlineContents
        },
        aiConfig: {
            enabled: aiConfig.enabled,
            model: aiConfig.model
        }
    }));
});

// ============================================
// 测评管理API
// ============================================

// GET /api/admin/assessments - 获取测评列表
app.get('/api/admin/assessments', authenticateAdmin, (req, res) => {
    const status = req.query.status; // online, offline, all
    let list = assessments;

    if (status && status !== 'all') {
        list = assessments.filter(a => a.status === status);
    }

    res.json(success({ list, total: list.length }));
});

// POST /api/admin/assessments - 添加测评
app.post('/api/admin/assessments', authenticateAdmin, (req, res) => {
    const { title, desc, price, originalPrice, category, image } = req.body;

    if (!title || !desc) {
        return res.status(400).json(error(400, '标题和描述为必填项'));
    }

    const maxId = assessments.reduce((max, a) => Math.max(max, a.id), 0);
    const newAssessment = {
        id: maxId + 1,
        title,
        desc,
        price: parseFloat(price) || 0,
        originalPrice: parseFloat(originalPrice) || 0,
        count: 0,
        category: category || '其他',
        image: image || '',
        status: 'online',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    assessments.push(newAssessment);
    dataManager.saveData('assessments', assessments);

    res.json(success(newAssessment, '测评添加成功'));
});

// PUT /api/admin/assessments/:id - 更新测评
app.put('/api/admin/assessments/:id', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const index = assessments.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json(error(404, '测评不存在'));
    }

    const { title, desc, price, originalPrice, category, image, count } = req.body;

    assessments[index] = {
        ...assessments[index],
        title: title || assessments[index].title,
        desc: desc || assessments[index].desc,
        price: price !== undefined ? parseFloat(price) : assessments[index].price,
        originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : assessments[index].originalPrice,
        category: category || assessments[index].category,
        image: image !== undefined ? image : assessments[index].image,
        count: count !== undefined ? parseInt(count) : assessments[index].count,
        updatedAt: new Date().toISOString()
    };

    dataManager.saveData('assessments', assessments);
    res.json(success(assessments[index], '测评更新成功'));
});

// PUT /api/admin/assessments/:id/status - 上下架测评
app.put('/api/admin/assessments/:id/status', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['online', 'offline'].includes(status)) {
        return res.status(400).json(error(400, '状态值无效'));
    }

    const index = assessments.findIndex(a => a.id === id);
    if (index === -1) {
        return res.status(404).json(error(404, '测评不存在'));
    }

    assessments[index].status = status;
    assessments[index].updatedAt = new Date().toISOString();
    dataManager.saveData('assessments', assessments);

    res.json(success(assessments[index], status === 'online' ? '已上架' : '已下架'));
});

// DELETE /api/admin/assessments/:id - 删除测评
app.delete('/api/admin/assessments/:id', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const index = assessments.findIndex(a => a.id === id);

    if (index === -1) {
        return res.status(404).json(error(404, '测评不存在'));
    }

    const deleted = assessments.splice(index, 1)[0];
    dataManager.saveData('assessments', assessments);

    res.json(success(deleted, '测评删除成功'));
});

// ============================================
// 推荐内容管理API
// ============================================

// GET /api/admin/recommendations - 获取推荐列表
app.get('/api/admin/recommendations', authenticateAdmin, (req, res) => {
    const status = req.query.status;
    let list = recommendations;

    if (status && status !== 'all') {
        list = recommendations.filter(r => r.status === status);
    }

    res.json(success({ list, total: list.length }));
});

// POST /api/admin/recommendations - 添加推荐
app.post('/api/admin/recommendations', authenticateAdmin, (req, res) => {
    const { tag, title, desc, btnText, image, link } = req.body;

    if (!title || !desc) {
        return res.status(400).json(error(400, '标题和描述为必填项'));
    }

    const maxId = recommendations.reduce((max, r) => Math.max(max, r.id), 0);
    const newRecommendation = {
        id: maxId + 1,
        tag: tag || '',
        title,
        desc,
        btnText: btnText || '查看详情',
        image: image || '',
        link: link || '',
        status: 'online',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    recommendations.push(newRecommendation);
    dataManager.saveData('recommendations', recommendations);

    res.json(success(newRecommendation, '推荐内容添加成功'));
});

// PUT /api/admin/recommendations/:id - 更新推荐
app.put('/api/admin/recommendations/:id', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const index = recommendations.findIndex(r => r.id === id);

    if (index === -1) {
        return res.status(404).json(error(404, '推荐内容不存在'));
    }

    const { tag, title, desc, btnText, image, link } = req.body;

    recommendations[index] = {
        ...recommendations[index],
        tag: tag !== undefined ? tag : recommendations[index].tag,
        title: title || recommendations[index].title,
        desc: desc || recommendations[index].desc,
        btnText: btnText || recommendations[index].btnText,
        image: image !== undefined ? image : recommendations[index].image,
        link: link !== undefined ? link : recommendations[index].link,
        updatedAt: new Date().toISOString()
    };

    dataManager.saveData('recommendations', recommendations);
    res.json(success(recommendations[index], '推荐内容更新成功'));
});

// PUT /api/admin/recommendations/:id/status - 上下架推荐
app.put('/api/admin/recommendations/:id/status', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['online', 'offline'].includes(status)) {
        return res.status(400).json(error(400, '状态值无效'));
    }

    const index = recommendations.findIndex(r => r.id === id);
    if (index === -1) {
        return res.status(404).json(error(404, '推荐内容不存在'));
    }

    recommendations[index].status = status;
    recommendations[index].updatedAt = new Date().toISOString();
    dataManager.saveData('recommendations', recommendations);

    res.json(success(recommendations[index], status === 'online' ? '已上架' : '已下架'));
});

// DELETE /api/admin/recommendations/:id - 删除推荐
app.delete('/api/admin/recommendations/:id', authenticateAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const index = recommendations.findIndex(r => r.id === id);

    if (index === -1) {
        return res.status(404).json(error(404, '推荐内容不存在'));
    }

    const deleted = recommendations.splice(index, 1)[0];
    dataManager.saveData('recommendations', recommendations);

    res.json(success(deleted, '推荐内容删除成功'));
});

// ============================================
// 内容详情管理API
// ============================================

// GET /api/admin/contents - 获取内容列表
app.get('/api/admin/contents', authenticateAdmin, (req, res) => {
    const status = req.query.status;
    const type = req.query.type;

    let list = Object.values(contents);

    if (status && status !== 'all') {
        list = list.filter(c => c.status === status);
    }
    if (type && type !== 'all') {
        list = list.filter(c => c.type === type);
    }

    res.json(success({ list, total: list.length }));
});

// POST /api/admin/contents - 添加内容
app.post('/api/admin/contents', authenticateAdmin, (req, res) => {
    const { type, title, subTitle, price, originalPrice, cover, content } = req.body;

    if (!title || !type) {
        return res.status(400).json(error(400, '标题和类型为必填项'));
    }

    const maxId = Object.keys(contents).reduce((max, id) => Math.max(max, parseInt(id)), 0);
    const newId = maxId + 1;

    const newContent = {
        id: newId,
        type: type || 'guide',
        title,
        subTitle: subTitle || '',
        price: parseFloat(price) || 0,
        originalPrice: parseFloat(originalPrice) || 0,
        count: 0,
        cover: cover || '',
        content: content || '',
        status: 'online',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    contents[newId] = newContent;
    dataManager.saveData('contents', contents);

    res.json(success(newContent, '内容添加成功'));
});

// PUT /api/admin/contents/:id - 更新内容
app.put('/api/admin/contents/:id', authenticateAdmin, (req, res) => {
    const id = req.params.id;

    if (!contents[id]) {
        return res.status(404).json(error(404, '内容不存在'));
    }

    const { type, title, subTitle, price, originalPrice, cover, content, count } = req.body;

    contents[id] = {
        ...contents[id],
        type: type || contents[id].type,
        title: title || contents[id].title,
        subTitle: subTitle !== undefined ? subTitle : contents[id].subTitle,
        price: price !== undefined ? parseFloat(price) : contents[id].price,
        originalPrice: originalPrice !== undefined ? parseFloat(originalPrice) : contents[id].originalPrice,
        cover: cover !== undefined ? cover : contents[id].cover,
        content: content !== undefined ? content : contents[id].content,
        count: count !== undefined ? parseInt(count) : contents[id].count,
        updatedAt: new Date().toISOString()
    };

    dataManager.saveData('contents', contents);
    res.json(success(contents[id], '内容更新成功'));
});

// PUT /api/admin/contents/:id/status - 上下架内容
app.put('/api/admin/contents/:id/status', authenticateAdmin, (req, res) => {
    const id = req.params.id;
    const { status } = req.body;

    if (!['online', 'offline'].includes(status)) {
        return res.status(400).json(error(400, '状态值无效'));
    }

    if (!contents[id]) {
        return res.status(404).json(error(404, '内容不存在'));
    }

    contents[id].status = status;
    contents[id].updatedAt = new Date().toISOString();
    dataManager.saveData('contents', contents);

    res.json(success(contents[id], status === 'online' ? '已上架' : '已下架'));
});

// DELETE /api/admin/contents/:id - 删除内容
app.delete('/api/admin/contents/:id', authenticateAdmin, (req, res) => {
    const id = req.params.id;

    if (!contents[id]) {
        return res.status(404).json(error(404, '内容不存在'));
    }

    const deleted = contents[id];
    delete contents[id];
    dataManager.saveData('contents', contents);

    res.json(success(deleted, '内容删除成功'));
});

// ============================================
// AI配置管理API
// ============================================

// GET /api/admin/ai-config - 获取AI配置
app.get('/api/admin/ai-config', authenticateAdmin, (req, res) => {
    res.json(success(aiConfig));
});

// PUT /api/admin/ai-config - 更新AI配置
app.put('/api/admin/ai-config', authenticateAdmin, (req, res) => {
    const { systemPrompt, model, temperature, maxTokens, enabled } = req.body;

    aiConfig = {
        ...aiConfig,
        systemPrompt: systemPrompt !== undefined ? systemPrompt : aiConfig.systemPrompt,
        model: model || aiConfig.model,
        temperature: temperature !== undefined ? parseFloat(temperature) : aiConfig.temperature,
        maxTokens: maxTokens !== undefined ? parseInt(maxTokens) : aiConfig.maxTokens,
        enabled: enabled !== undefined ? enabled : aiConfig.enabled,
        updatedAt: new Date().toISOString()
    };

    dataManager.saveData('ai-config', aiConfig);
    res.json(success(aiConfig, 'AI配置更新成功'));
});

// ============================================
// 图片上传管理API
// ============================================

// POST /api/admin/upload - 上传图片
app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json(error(400, '请选择要上传的图片'));
    }

    const url = `/uploads/${req.file.filename}`;
    res.json(success({
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url
    }, '图片上传成功'));
});

// GET /api/admin/uploads - 获取上传图片列表
app.get('/api/admin/uploads', authenticateAdmin, (req, res) => {
    const uploadsDir = path.join(dataManager.DATA_DIR, 'uploads');

    try {
        const files = fs.readdirSync(uploadsDir);
        const images = files
            .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
            .map(f => {
                const stats = fs.statSync(path.join(uploadsDir, f));
                return {
                    filename: f,
                    url: `/uploads/${f}`,
                    size: stats.size,
                    createdAt: stats.birthtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(success({ list: images, total: images.length }));
    } catch (err) {
        res.json(success({ list: [], total: 0 }));
    }
});

// DELETE /api/admin/uploads/:filename - 删除图片
app.delete('/api/admin/uploads/:filename', authenticateAdmin, (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(dataManager.DATA_DIR, 'uploads', filename);

    if (!fs.existsSync(filepath)) {
        return res.status(404).json(error(404, '图片不存在'));
    }

    try {
        fs.unlinkSync(filepath);
        res.json(success(null, '图片删除成功'));
    } catch (err) {
        res.status(500).json(error(500, '删除失败'));
    }
});

// ============================================
// 数据导入导出API
// ============================================

// GET /api/admin/export - 导出所有数据
app.get('/api/admin/export', authenticateAdmin, (req, res) => {
    const exportData = {
        exportedAt: new Date().toISOString(),
        assessments,
        recommendations,
        contents,
        aiConfig
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ai-rainbow-export-${Date.now()}.json`);
    res.json(exportData);
});

// POST /api/admin/import - 导入数据
app.post('/api/admin/import', authenticateAdmin, (req, res) => {
    const { data, replace } = req.body;

    if (!data) {
        return res.status(400).json(error(400, '请提供要导入的数据'));
    }

    try {
        // 先备份当前数据
        dataManager.backupAllData();

        if (data.assessments && Array.isArray(data.assessments)) {
            if (replace) {
                assessments.length = 0;
            }
            data.assessments.forEach(a => {
                const existing = assessments.findIndex(e => e.id === a.id);
                if (existing >= 0) {
                    assessments[existing] = { ...assessments[existing], ...a };
                } else {
                    assessments.push(a);
                }
            });
            dataManager.saveData('assessments', assessments);
        }

        if (data.recommendations && Array.isArray(data.recommendations)) {
            if (replace) {
                recommendations.length = 0;
            }
            data.recommendations.forEach(r => {
                const existing = recommendations.findIndex(e => e.id === r.id);
                if (existing >= 0) {
                    recommendations[existing] = { ...recommendations[existing], ...r };
                } else {
                    recommendations.push(r);
                }
            });
            dataManager.saveData('recommendations', recommendations);
        }

        if (data.contents && typeof data.contents === 'object') {
            if (replace) {
                Object.keys(contents).forEach(k => delete contents[k]);
            }
            Object.assign(contents, data.contents);
            dataManager.saveData('contents', contents);
        }

        if (data.aiConfig && typeof data.aiConfig === 'object') {
            Object.assign(aiConfig, data.aiConfig);
            dataManager.saveData('ai-config', aiConfig);
        }

        res.json(success(null, '数据导入成功'));
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json(error(500, '导入失败: ' + err.message));
    }
});

// POST /api/admin/backup - 创建备份
app.post('/api/admin/backup', authenticateAdmin, (req, res) => {
    try {
        dataManager.backupAllData();
        res.json(success(null, '备份创建成功'));
    } catch (err) {
        res.status(500).json(error(500, '备份失败'));
    }
});

// GET /api/admin/backups - 获取备份列表
app.get('/api/admin/backups', authenticateAdmin, (req, res) => {
    const backups = dataManager.listBackups();
    res.json(success({ list: backups, total: backups.length }));
});

// POST /api/admin/restore/:filename - 从备份恢复
app.post('/api/admin/restore/:filename', authenticateAdmin, (req, res) => {
    const filename = req.params.filename;

    try {
        const result = dataManager.restoreFromBackup(filename);
        if (result) {
            // 重新加载数据
            assessments.length = 0;
            assessments.push(...dataManager.loadData('assessments'));

            recommendations.length = 0;
            recommendations.push(...dataManager.loadData('recommendations'));

            const newContents = dataManager.loadData('contents');
            Object.keys(contents).forEach(k => delete contents[k]);
            Object.assign(contents, newContents);

            res.json(success(null, '数据恢复成功'));
        } else {
            res.status(400).json(error(400, '恢复失败'));
        }
    } catch (err) {
        res.status(500).json(error(500, '恢复失败: ' + err.message));
    }
});

// ============================================
// 健康检查
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================
// 错误处理中间件
// ============================================
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json(error(500, '服务器内部错误'));
});

// 404处理
app.use((req, res) => {
    res.status(404).json(error(404, '接口不存在'));
});

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AI彩虹老师后端服务运行在端口 ${PORT}`);
    console.log(`📍 API基础地址: http://localhost:${PORT}/api`);
    console.log('');
    console.log('📋 可用接口列表:');
    console.log('   POST /api/auth/login        - 用户登录');
    console.log('   GET  /api/home/recommend    - 首页推荐');
    console.log('   GET  /api/assessment/list   - 测评列表');
    console.log('   GET  /api/assessment/:id    - 测评详情');
    console.log('   POST /api/assessment/purchase - 购买测评');
    console.log('   POST /api/calendar/emotion  - 保存情绪');
    console.log('   GET  /api/calendar/emotion  - 获取情绪');
    console.log('   GET  /api/user/profile      - 用户信息');
    console.log('   POST /api/user/update_nickname - 更新昵称');
    console.log('   GET  /api/content/:id       - 内容详情');
    console.log('   POST /api/chat              - AI对话');
    console.log('   POST /api/chat/clear        - 清除对话');
    console.log('   GET  /api/chat/history      - 对话历史');
    console.log('   GET  /api/health            - 健康检查');
    console.log('');
    console.log(`❤️  健康检查: http://localhost:${PORT}/api/health`);
});
