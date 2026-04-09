# 后端服务器部署指南

N-Reader 需要后端服务器来处理 NGA API 请求。本文档说明如何部署后端服务器。

## 🚀 快速使用（已有服务器）

如果你已经有后端服务器，可以直接在 APK 中配置使用。

### 示例服务器地址
```
https://ais-pre-c46pdi4rivswi423p2fguj-104340991429.asia-northeast1.run.app/api/nga
```

### 在 APK 中配置
1. 打开 N-Reader APK
2. 进入「我的」页面
3. 在「后端服务器配置」中输入服务器地址
4. 点击「保存服务器地址」

---

## 快速开始

### 方式一：使用 Docker（推荐）

```bash
# 克隆项目
git clone https://github.com/liven666/N-Reader.git
cd N-Reader

# 安装依赖
npm install

# 构建前端
npm run build

# 启动服务器（生产模式）
NODE_ENV=production npm start
```

服务器将在 `http://localhost:3000` 启动。

### 方式二：使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 克隆项目
git clone https://github.com/liven666/N-Reader.git
cd N-Reader

# 安装依赖
npm install

# 构建前端
npm run build

# 启动服务
pm2 start server.ts --name n-reader-server

# 查看状态
pm2 status

# 查看日志
pm2 logs n-reader-server
```

## 配置 CORS（重要！）

为了让 APK 能够访问后端服务器，需要配置 CORS。修改 `server.ts`：

```typescript
// 在 app.use(express.json()) 之后添加
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

## 部署到云服务器

### 使用 Vercel（免费）

1. Fork 本项目
2. 在 Vercel 中导入项目
3. 配置环境变量（如需要）
4. 部署

### 使用 Railway（免费额度）

1. Fork 本项目
2. 在 Railway 中导入项目
3. 部署

### 使用阿里云/腾讯云

1. 购买云服务器
2. 安装 Node.js
3. 按照上面的方式部署
4. 配置 Nginx 反向代理

## Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 在 APK 中配置

1. 打开 APK 应用
2. 进入「我的」页面
3. 在「后端服务器配置」中输入你的服务器地址：
   - 例如：`https://your-server.com/api/nga`
4. 点击「保存服务器地址」

## 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + 后端）
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动，支持热重载。

## 常见问题

### Q: APK 提示「无法连接到后端服务器」

A: 请检查：
1. 服务器地址是否正确（需要包含 `/api/nga` 路径）
2. 服务器是否正在运行
3. CORS 是否正确配置
4. 网络连接是否正常

### Q: 如何启用 HTTPS？

A: 使用 Let's Encrypt + Nginx，或者使用支持 HTTPS 的云平台。

### Q: 服务器端口可以修改吗？

A: 可以，修改 `server.ts` 中的 `PORT` 常量。
