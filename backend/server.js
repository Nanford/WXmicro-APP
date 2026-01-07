// backend/server.js - 后端代理服务器
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS 配置（允许微信小程序访问）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Kimi AI 配置
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const KIMI_API_KEY = process.env.KIMI_API_KEY; // 从环境变量读取

// 系统提示词
const SYSTEM_PROMPT = `你是一位专业、温暖、富有同理心的心理咨询师。你的职责是：

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

// 用户会话管理（简单的内存存储，生产环境应使用 Redis）
const sessions = new Map();

// 获取或创建会话
function getSession(userId) {
    if (!sessions.has(userId)) {
        sessions.set(userId, [
            { role: 'system', content: SYSTEM_PROMPT }
        ]);
    }
    return sessions.get(userId);
}

// 清理旧会话（保持最近20条消息）
function cleanupSession(messages) {
    if (messages.length > 21) {
        return [
            messages[0], // 保留系统提示
            ...messages.slice(-20) // 保留最近20条
        ];
    }
    return messages;
}

// 聊天接口
app.post('/api/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;

        // 验证参数
        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        // 获取用户会话历史
        const messages = getSession(userId);

        // 添加用户消息
        messages.push({
            role: 'user',
            content: message
        });

        // 调用 Kimi AI API
        const response = await axios.post(
            KIMI_API_URL,
            {
                model: 'moonshot-v1-8k',
                messages: messages,
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${KIMI_API_KEY}`
                },
                timeout: 30000
            }
        );

        // 获取 AI 回复
        const aiReply = response.data.choices[0].message.content;

        // 添加 AI 回复到历史
        messages.push({
            role: 'assistant',
            content: aiReply
        });

        // 清理旧消息
        const cleanedMessages = cleanupSession(messages);
        sessions.set(userId, cleanedMessages);

        // 返回结果
        res.json({
            success: true,
            data: {
                reply: aiReply
            }
        });

    } catch (error) {
        console.error('Kimi API Error:', error.message);

        // 处理不同类型的错误
        let errorMessage = '抱歉，我暂时无法回应。';
        let statusCode = 500;

        if (error.code === 'ECONNABORTED') {
            errorMessage = '网络连接超时，请稍后再试。';
            statusCode = 504;
        } else if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data?.error?.message || errorMessage;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// 清除会话接口
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

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📍 聊天接口: http://localhost:${PORT}/api/chat`);
    console.log(`❤️  健康检查: http://localhost:${PORT}/api/health`);
});
