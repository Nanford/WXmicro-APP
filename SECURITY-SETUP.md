# AI Rainbow 小程序 - 安全配置指南

## ⚠️ 重要安全更新

为了保护您的 Kimi API Key 不被泄露，我们已经实施了**后端代理架构**。

## 架构变更

### 之前（不安全）❌
```
[小程序] → 直接调用 → [Kimi AI API]
           ↑
      包含API Key（会泄露！）
```

### 现在（安全）✅
```
[小程序] → [您的后端服务器] → [Kimi AI API]
              ↑
         包含API Key（安全）
```

## 文件结构

```
AI-microapp/
├── utils/
│   └── kimi-ai.js          # 已更新：调用后端代理
├── backend/                # 新增：后端服务器
│   ├── server.js          # Express服务器
│   ├── package.json       # 依赖配置
│   ├── .env.example       # 环境变量模板
│   ├── .gitignore         # Git忽略配置
│   └── README.md          # 部署文档
└── ...
```

## 使用步骤

### 第一步：设置后端服务器

#### 开发环境（本地测试）

1. **进入后端目录**
   ```bash
   cd backend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   创建 `.env` 文件（复制 `.env.example`）：
   ```bash
   # Windows
   copy .env.example .env
   
   # Mac/Linux
   cp .env.example .env
   ```
   
   然后在 `.env` 中设置您的 API Key

4. **启动服务器**
   ```bash
   npm run dev
   ```
   
   服务器将运行在 `http://localhost:3000`

#### 生产环境（正式发布）

**必须部署到云服务器！** 推荐选项：

1. **腾讯云云函数**（推荐，与微信小程序整合好）
   - 成本低
   - 自动扩展
   - 详见 `backend/README.md`

2. **阿里云函数计算**
3. **传统服务器**（需要域名和SSL证书）

### 第二步：配置小程序

1. **更新后端URL**
   
   编辑 `utils/kimi-ai.js`：
   ```javascript
   // 开发环境
   const BACKEND_URL = 'http://localhost:3000';
   
   // 生产环境（部署后替换）
   // const BACKEND_URL = 'https://your-domain.com';
   ```

2. **配置服务器域名**（生产环境）
   
   在微信小程序后台添加：
   - request合法域名：`https://your-domain.com`

### 第三步：测试

1. **启动后端服务器**
2. **打开微信开发者工具**
3. **在小程序中测试聊天功能**
4. **查看后端日志确认请求正常**

## 安全优势

✅ **API Key 保护**：Key 只存在后端，前端代码不包含  
✅ **防止滥用**：可以在后端限制请求频率  
✅ **灵活更换**：更换 Key 不需要更新小程序  
✅ **成本控制**：可以监控和限制使用量  
✅ **用户认证**：可以添加额外的安全验证  

## 开发vs生产对比

| 项目 | 开发环境 | 生产环境 |
|------|----------|----------|
| 后端URL | `http://localhost:3000` | `https://your-domain.com` |
| HTTPS | 不需要 | **必须** |
| 域名配置 | 不需要 | **必须** |
| API Key位置 | `.env`文件 | 服务器环境变量 |

## 故障排查

### 问题：小程序无法连接后端

**检查清单**：
- ✓ 后端服务器是否运行？
- ✓ URL 配置是否正确？
- ✓ 开发环境需要开启"不校验合法域名"
- ✓ 生产环境需要配置合法域名

### 问题：后端返回错误

**检查清单**：
- ✓ `.env` 文件是否存在？
- ✓ API Key 是否正确？
- ✓ 网络连接是否正常？
- ✓ 查看后端日志输出

## 注意事项

> [!CAUTION]
> **绝对不要**将 `.env` 文件上传到 Git！  
> `.gitignore` 已配置忽略此文件。

> [!IMPORTANT]
> **生产发布前**必须部署后端服务器，否则小程序无法工作！

> [!TIP]
> 使用云函数部署最简单，成本也最低。

## 下一步

1. ✅ 完成开发环境测试
2. ⏭️ 选择云服务提供商
3. ⏭️ 部署后端服务
4. ⏭️ 配置域名和SSL
5. ⏭️ 在小程序后台配置域名
6. ⏭️ 更新小程序代码的后端URL
7. ⏭️ 发布小程序

## 获取帮助

- 后端部署：查看 `backend/README.md`
- Kimi AI 使用：查看 `README-KIMI.md`
- 微信小程序：查看[官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

---

**更新日期**: 2026-01-07  
**安全等级**: ✅ 生产级别
