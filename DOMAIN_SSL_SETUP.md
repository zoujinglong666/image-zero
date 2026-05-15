# 🌐 域名解析和HTTPS证书配置指南

## 第一步：域名解析配置

### 1. 登录域名服务商控制台
- 腾讯云域名管理：https://console.cloud.tencent.com/domain
- 阿里云域名管理：https://dc.console.aliyun.com/
- 其他服务商类似

### 2. 添加DNS解析记录
```
记录类型：A记录
主机记录：@ (表示根域名) 或 www
记录值：您的服务器IP地址
TTL：600 (10分钟)
```

**示例配置：**
```
主机记录 | 记录类型 | 记录值          | TTL
@        | A        | 123.123.123.123 | 600
www      | A        | 123.123.123.123 | 600
```

### 3. 验证解析生效
```bash
# 使用命令行检查
ping yourdomain.com
nslookup yourdomain.com
dig yourdomain.com
```

## 第二步：HTTPS证书配置

### 方案一：使用Let's Encrypt免费证书（推荐）

#### 1. 安装Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install epel-release
sudo yum install certbot python3-certbot-nginx
```

#### 2. 获取证书
```bash
# 自动配置Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 手动获取证书（不自动配置）
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

#### 3. 自动续期
```bash
# 测试自动续期
sudo certbot renew --dry-run

# 设置定时任务
sudo crontab -e
# 添加：0 2 * * * /usr/bin/certbot renew --quiet
```

### 方案二：使用腾讯云SSL证书

#### 1. 申请证书
- 登录腾讯云SSL控制台：https://console.cloud.tencent.com/ssl
- 点击"申请免费证书"
- 填写域名信息
- 选择DNS验证（推荐）

#### 2. DNS验证
- 按提示添加TXT记录到域名解析
- 等待验证通过（通常几分钟）

#### 3. 下载证书
- 验证通过后下载证书文件
- 通常包含：`.crt` 和 `.key` 文件

#### 4. 配置Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/your_domain.crt;
    ssl_certificate_key /path/to/your_domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    
    # 其他配置...
}
```

## 第三步：Nginx完整配置

### 1. 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/turing-paint
```

### 2. 完整配置内容
```nginx
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS主配置
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # 前端静态文件
    location / {
        root /var/www/turing-paint/dist/build/h5;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # 上传文件处理
    client_max_body_size 20M;
}
```

### 3. 启用配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/turing-paint /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

## 第四步：验证配置

### 1. 检查HTTPS
```bash
# 检查证书
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# 检查SSL评分
curl -s https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

### 2. 测试网站
- 访问 `https://yourdomain.com`
- 检查浏览器地址栏锁标志
- 测试所有功能是否正常

### 3. 自动续期验证
```bash
# 手动测试续期
sudo certbot renew --dry-run

# 查看续期日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 🛡️ 安全建议

### 1. 强制HTTPS
```nginx
# 在server块中添加
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. 安全头配置
```nginx
# 防止点击劫持
add_header X-Frame-Options "SAMEORIGIN" always;

# 防止MIME类型嗅探
add_header X-Content-Type-Options "nosniff" always;

# XSS保护
add_header X-XSS-Protection "1; mode=block" always;
```

### 3. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 🚨 常见问题解决

### 1. 证书申请失败
```bash
# 检查域名解析
dig yourdomain.com

# 检查防火墙
sudo ufw status

# 临时停止服务占用80端口
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yourdomain.com
sudo systemctl start nginx
```

### 2. Nginx配置错误
```bash
# 检查配置语法
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. 证书续期失败
```bash
# 手动续期
sudo certbot renew --force-renewal

# 检查续期日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 📋 检查清单

- [ ] 域名解析已生效
- [ ] HTTPS证书已安装
- [ ] Nginx配置正确
- [ ] 网站可通过HTTPS访问
- [ ] 自动续期已配置
- [ ] 安全头已添加
- [ ] 防火墙已配置