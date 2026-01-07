# 后端服务器部署指南

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
copy .env.example .env
```

然后编辑 `.env` 文件，填入您的 Kimi API Key。

### 3. 启动服务器

**开发模式**（自动重启）：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

服务器默认运行在 `http://localhost:3000`

## API 接口

### 1. 聊天接口

**URL**: `POST /api/chat`

**请求体**:
```json
{
  "userId": "user-unique-id",
  "message": "用户发送的消息"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "reply": "AI的回复内容"
  }
}
```

### 2. 清除会话

**URL**: `POST /api/chat/clear`

**请求体**:
```json
{
  "userId": "user-unique-id"
}
```

### 3. 健康检查

**URL**: `GET /api/health`

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T11:00:00.000Z"
}
```

## 部署到生产环境

### 选项 1: 腾讯云云函数（推荐）

1. 登录[腾讯云云函数控制台](https://console.cloud.tencent.com/scf)
2. 创建新函数，选择 Node.js 运行环境
3. 上传代码或使用在线编辑器
4. 配置环境变量 `KIMI_API_KEY`
5. 绑定 API 网关，获取访问 URL
6. 在微信小程序后台配置服务器域名

### 选项 2: 传统服务器

**系统要求**：
- Node.js 14+ 
- PM2（进程管理）

**部署步骤**：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name ai-rainbow-backend

# 设置开机自启
pm2 startup
pm2 save
```

**配置 Nginx 反向代理**：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 选项 3: 阿里云/AWS

类似腾讯云云函数的部署流程。

## 安全性配置

### 1. 添加请求限流

安装依赖：
```bash
npm install express-rate-limit
```

在 `server.js` 中添加：
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 30 // 限制30次请求
});

app.use('/api/', limiter);
```

### 2. 添加用户认证

验证请求来自您的小程序：

```javascript
const SECRET_KEY = process.env.SECRET_KEY;

app.use('/api/', (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (token !== SECRET_KEY) {
        return res.status(401).json({ error: '未授权' });
    }
    next();
});
```

### 3. HTTPS 配置

生产环境必须使用 HTTPS（微信小程序要求）。

## 监控与日志

### 使用 PM2 查看日志

```bash
# 查看日志
pm2 logs ai-rainbow-backend

# 查看状态
pm2 status
```

### 添加日志记录

安装 Winston：
```bash
npm install winston
```

## 成本优化

1. **使用云函数**：按请求计费，成本低
2. **缓存常见回复**：减少 API 调用
3. **设置超时**：避免长时间等待
4. **监控使用量**：及时发现异常

## 故障排查

### 问题：连接超时

**解决方案**：
- 检查网络连接
- 增加超时时间
- 确认 Kimi API 状态

### 问题：API Key 无效

**解决方案**：
- 检查 `.env` 文件配置
- 确认 Key 未过期
- 重启服务器

---

**注意**：请确保 `.env` 文件不要上传到 Git！
