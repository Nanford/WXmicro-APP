# AI彩虹老师 后端部署教程

## 服务器信息

- **系统**: CentOS 7.9
- **域名**: hcmai.szhlsn.cn
- **端口**: 8901

---

## 一、环境准备

### 1.1 更新系统

```bash
sudo yum update -y
sudo yum install -y git gcc-c++ make
```

### 1.2 安装 Node.js 18

```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

### 1.3 安装 PM2

```bash
sudo npm install -g pm2
```

---

## 二、部署项目

### 2.1 克隆代码

```bash
cd /var/www
sudo git clone https://github.com/Nanford/WXmicro-APP.git
sudo chown -R $USER:$USER /var/www/WXmicro-APP
cd WXmicro-APP/backend
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置环境变量

```bash
cp .env.example .env
vi .env
```

填入以下内容：

```env
KIMI_API_KEY=你的Kimi_API_Key
PORT=8901
```

> 按 `i` 编辑，按 `Esc` 后输入 `:wq` 保存退出

---

## 三、启动服务

```bash
# 启动
pm2 start server.js --name "ai-rainbow"

# 开机自启
pm2 startup systemd
pm2 save

# 查看状态
pm2 status
pm2 logs
```

---

## 四、配置 Nginx

### 4.1 安装 Nginx

```bash
sudo yum install -y epel-release
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.2 创建配置

```bash
sudo vi /etc/nginx/conf.d/ai-rainbow.conf
```

粘贴以下内容：

```nginx
server {
    listen 80;
    server_name hcmai.szhlsn.cn;

    location / {
        proxy_pass http://localhost:8901;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.3 重启 Nginx

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 五、配置防火墙

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 六、配置 SSL 证书

```bash
sudo yum install -y certbot python2-certbot-nginx
sudo certbot --nginx -d hcmai.szhlsn.cn
```

按提示操作，证书会自动配置。

---

## 七、验证部署

```bash
curl https://hcmai.szhlsn.cn/api/health
```

成功返回：
```json
{"status":"ok","message":"AI Rainbow Backend is running"}
```

---

## 八、微信小程序配置

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 **开发管理** → **开发设置** → **服务器域名**
3. 添加 request 合法域名：`https://hcmai.szhlsn.cn`

---

## 常用命令

| 操作 | 命令 |
|------|------|
| 查看服务状态 | `pm2 status` |
| 查看日志 | `pm2 logs` |
| 重启服务 | `pm2 restart ai-rainbow` |
| 更新代码 | `cd /var/www/WXmicro-APP && git pull && cd backend && npm install && pm2 restart ai-rainbow` |
