# Phase 3 - Railway API 详细文档

**更新时间**: 2026年2月25日  
**API 版本**: v3.0

---

## 📌 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://localhost:3000/api` (开发) |
| 生产 URL | `https://api.yourdomain.com/api` |
| 认证方式 | Bearer Token (JWT) |
| 响应格式 | JSON |
| 超时时间 | 30秒 |

---

## 🔐 认证

所有 Railway API 端点都需要 JWT 认证。

### 获取 Token

首先通过认证端点获取 token：

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# 返回包含 token
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 使用 Token

在所有请求的 Header 中添加：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🌐 API 端点

### 1️⃣ POST /railway/instances

**创建新的 Railway 实例**

创建并自动部署一个新的实例到 Railway。

#### 请求

```http
POST /api/railway/instances HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "instanceName": "my-chatbot",
  "channelCredentials": {
    "feishu": {
      "appId": "cli_a1b2c3d4e5f6",
      "secret": "secret_xyz123"
    },
    "dingtalk": {
      "appKey": "ding123",
      "appSecret": "secret456"
    }
  },
  "customVariables": [
    {
      "name": "CUSTOM_DOMAIN",
      "value": "https://my-domain.com"
    },
    {
      "name": "API_KEY",
      "value": "key_123",
      "isSecret": true
    }
  ]
}
```

#### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| instanceName | string | 否 | 实例名称，默认为 'moltbot' |
| channelCredentials | object | 否 | 通道凭证，支持多个通道 |
| customVariables | array | 否 | 自定义环境变量 |

#### 响应

```json
{
  "success": true,
  "message": "Instance created successfully",
  "data": {
    "projectId": "proj_a1b2c3d4e5f6g7h8",
    "projectName": "moltbot-basic-1708878234",
    "serviceId": "svc_i9j0k1l2m3n4o5p6",
    "serviceName": "moltbot-basic-1708878234-service",
    "environmentId": "env_q7r8s9t0u1v2w3x4",
    "deploymentId": "deploy_y5z6a7b8c9d0e1f2",
    "message": "Instance cloned successfully. Deployment in progress."
  }
}
```

#### 错误响应

**402 Payment Required** - 无有效订阅

```json
{
  "success": false,
  "message": "No active subscription found"
}
```

**403 Forbidden** - 实例数量超限

```json
{
  "success": false,
  "message": "Instance limit reached for BASIC plan (max: 1)"
}
```

**400 Bad Request** - 凭证无效

```json
{
  "success": false,
  "message": "Invalid credentials for feishu: Missing required field: secret"
}
```

#### curl 示例

```bash
curl -X POST http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-chatbot",
    "channelCredentials": {
      "feishu": {
        "appId": "cli_xxx",
        "secret": "secret_yyy"
      }
    }
  }'
```

#### 通道凭证要求

| 通道 | 必需字段 | 示例 |
|------|---------|------|
| feishu | appId, secret | `{ "appId": "cli_xxx", "secret": "xxx" }` |
| dingtalk | appKey, appSecret | `{ "appKey": "key", "appSecret": "secret" }` |
| wecom | corpId, secret | `{ "corpId": "ww123", "secret": "xxx" }` |
| telegram | token, botId | `{ "token": "123:ABC", "botId": "456" }` |

---

### 2️⃣ GET /railway/instances

**获取所有实例列表**

获取当前用户创建的所有实例。

#### 请求

```http
GET /api/railway/instances HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "id": "instance_001a2b3c4d5e6f7g",
      "projectId": "proj_001",
      "projectName": "moltbot-basic-1708878234",
      "serviceName": "moltbot-service",
      "status": "RUNNING",
      "deploymentStatus": "RUNNING",
      "publicUrl": "https://moltbot-001.railway.app",
      "createdAt": "2026-02-25T10:30:34.000Z",
      "deploymentCompletedAt": "2026-02-25T10:35:20.000Z"
    },
    {
      "id": "instance_002a2b3c4d5e6f7h",
      "projectId": "proj_002",
      "projectName": "moltbot-pro-1708878500",
      "serviceName": "moltbot-service",
      "status": "DEPLOYING",
      "deploymentStatus": "BUILDING",
      "publicUrl": null,
      "createdAt": "2026-02-25T11:00:00.000Z",
      "deploymentCompletedAt": null
    }
  ],
  "count": 2
}
```

#### curl 示例

```bash
curl -X GET http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 3️⃣ GET /railway/instances/:instanceId

**获取实例详细信息**

获取特定实例的完整配置和状态。

#### 请求

```http
GET /api/railway/instances/instance_001a2b3c4d5e6f7g HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| instanceId | string | 实例 ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "id": "instance_001a2b3c4d5e6f7g",
    "projectId": "proj_001",
    "projectName": "moltbot-basic-1708878234",
    "serviceId": "svc_001",
    "serviceName": "moltbot-service",
    "environmentId": "env_001",
    "environmentName": "production",
    "deploymentId": "deploy_001",
    "deploymentStatus": "RUNNING",
    "deploymentUpdatedAt": "2026-02-25T10:35:20.000Z",
    "deploymentCompletedAt": "2026-02-25T10:35:20.000Z",
    "status": "RUNNING",
    "publicUrl": "https://moltbot-001.railway.app",
    "variables": {
      "NODE_ENV": "production",
      "LOG_LEVEL": "info",
      "OPENCLAW_USER_ID": "user_123",
      "OPENCLAW_PLAN": "BASIC",
      "FEISHU_SECRET": "***"
    },
    "createdAt": "2026-02-25T10:30:34.000Z",
    "updatedAt": "2026-02-25T10:35:20.000Z"
  }
}
```

#### curl 示例

```bash
curl -X GET http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4️⃣ GET /railway/instances/:instanceId/status

**获取实例实时状态**

获取实例的部署进度、监控数据和健康状态。

#### 请求

```http
GET /api/railway/instances/instance_001a2b3c4d5e6f7g/status HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "instanceId": "instance_001a2b3c4d5e6f7g",
    "status": "RUNNING",
    "deploymentStatus": "RUNNING",
    "monitoring": {
      "instanceId": "instance_001a2b3c4d5e6f7g",
      "projectId": "proj_001",
      "deploymentId": "deploy_001",
      "status": "RUNNING",
      "progress": 100,
      "logs": [
        "[2026-02-25T10:30:34.000Z] Deployment started",
        "[2026-02-25T10:30:45.000Z] Building docker image",
        "[2026-02-25T10:33:20.000Z] Deployment succeeded"
      ],
      "estimatedTimeRemaining": 0,
      "lastCheckedAt": "2026-02-25T11:30:20.000Z"
    },
    "health": {
      "instanceId": "instance_001a2b3c4d5e6f7g",
      "status": "HEALTHY",
      "uptime": 3600,
      "lastCheckedAt": "2026-02-25T11:30:20.000Z"
    },
    "createdAt": "2026-02-25T10:30:34.000Z",
    "deploymentCompletedAt": "2026-02-25T10:35:20.000Z"
  }
}
```

#### 状态说明

| 状态 | 进度 | 说明 |
|------|------|------|
| INITIALIZING | 10% | 初始化中 |
| BUILDING | 30% | 构建镜像 |
| DEPLOYING | 70% | 部署中 |
| RUNNING | 100% | 运行中 |
| FAILED | 0% | 部署失败 |
| CRASHED | 0% | 服务崩溃 |

#### curl 示例

```bash
curl -X GET http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g/status \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 5️⃣ GET /railway/instances/:instanceId/logs

**获取部署日志**

获取实例的部署过程日志。

#### 请求

```http
GET /api/railway/instances/instance_001a2b3c4d5e6f7g/logs?limit=50 HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | integer | 100 | 返回的日志条数，最多 1000 |

#### 响应

```json
{
  "success": true,
  "data": {
    "instanceId": "instance_001a2b3c4d5e6f7g",
    "logs": [
      "[2026-02-25T10:30:34.000Z] Deployment started",
      "[2026-02-25T10:30:45.000Z] Pulling base image",
      "[2026-02-25T10:31:20.000Z] Building docker image",
      "[2026-02-25T10:33:15.000Z] Image built: sha256:abc123...",
      "[2026-02-25T10:33:30.000Z] Pushing image to registry",
      "[2026-02-25T10:34:00.000Z] Image pushed successfully",
      "[2026-02-25T10:34:15.000Z] Starting container",
      "[2026-02-25T10:34:45.000Z] Health check passed",
      "[2026-02-25T10:35:00.000Z] Deployment succeeded",
      "[2026-02-25T10:35:20.000Z] Service is now RUNNING"
    ],
    "count": 10
  }
}
```

#### curl 示例

```bash
# 获取最后50条日志
curl -X GET "http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g/logs?limit=50" \
  -H "Authorization: Bearer eyJhbGc..."

# 获取最后200条日志
curl -X GET "http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g/logs?limit=200" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 6️⃣ PUT /railway/instances/:instanceId

**更新实例配置**

更新通道凭证或自定义变量，并自动重新部署。

#### 请求

```http
PUT /api/railway/instances/instance_001a2b3c4d5e6f7g HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "channelCredentials": {
    "feishu": {
      "appId": "cli_new123",
      "secret": "secret_new456"
    }
  },
  "customVariables": [
    {
      "name": "LOG_LEVEL",
      "value": "debug"
    }
  ]
}
```

#### 请求体参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| channelCredentials | object | 否 | 更新的通道凭证 |
| customVariables | array | 否 | 更新的自定义变量 |

#### 响应

```json
{
  "success": true,
  "message": "Instance updated successfully",
  "data": {
    "instanceId": "instance_001a2b3c4d5e6f7g",
    "deploymentId": "deploy_002",
    "status": "Redeploying"
  }
}
```

#### curl 示例

```bash
curl -X PUT http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "channelCredentials": {
      "feishu": {
        "appId": "cli_new",
        "secret": "secret_new"
      }
    }
  }'
```

---

### 7️⃣ DELETE /railway/instances/:instanceId

**删除实例**

删除实例及其所有关联资源。

#### 请求

```http
DELETE /api/railway/instances/instance_001a2b3c4d5e6f7g HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
```

#### 响应

```json
{
  "success": true,
  "message": "Instance deleted successfully"
}
```

#### curl 示例

```bash
curl -X DELETE http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 8️⃣ POST /railway/instances/:instanceId/redeploy

**重新部署实例**

触发实例的重新部署，保持当前配置。

#### 请求

```http
POST /api/railway/instances/instance_001a2b3c4d5e6f7g/redeploy HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json
```

#### 响应

```json
{
  "success": true,
  "message": "Redeployment triggered",
  "data": {
    "instanceId": "instance_001a2b3c4d5e6f7g",
    "deploymentId": "deploy_003"
  }
}
```

#### curl 示例

```bash
curl -X POST http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g/redeploy \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

---

### 9️⃣ POST /railway/instances/:instanceId/channels

**配置通道**

添加或更新特定通道的凭证。

#### 请求

```http
POST /api/railway/instances/instance_001a2b3c4d5e6f7g/channels HTTP/1.1
Host: localhost:3000
Authorization: Bearer {token}
Content-Type: application/json

{
  "channelType": "dingtalk",
  "credentials": {
    "appKey": "ding_app_key_123",
    "appSecret": "ding_app_secret_456"
  }
}
```

#### 请求体参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| channelType | string | 是 | 通道类型 |
| credentials | object | 是 | 通道凭证 |

#### 响应

```json
{
  "success": true,
  "message": "Channel dingtalk configured successfully"
}
```

#### 错误响应

**400 Bad Request** - 凭证无效

```json
{
  "success": false,
  "message": "Invalid credentials: Missing required field: appSecret"
}
```

#### curl 示例

```bash
curl -X POST http://localhost:3000/api/railway/instances/instance_001a2b3c4d5e6f7g/channels \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "channelType": "telegram",
    "credentials": {
      "token": "123456:ABC-DEF",
      "botId": "789"
    }
  }'
```

---

## 🔄 实际工作流

### 完整的实例创建工作流

```
1. 用户点击"创建实例"
   ▼
2. POST /api/railway/instances
   {
     "instanceName": "my-bot",
     "channelCredentials": { "feishu": {...} }
   }
   ▼
3. 返回: projectId, deploymentId
   ▼
4. 使用返回的 projectId 轮询状态
   GET /api/railway/instances/{projectId}/status
   ▼
5. 检查 monitoring.progress
   - 0-10% ▶ INITIALIZING
   - 10-30% ▶ BUILDING
   - 30-70% ▶ DEPLOYING
   - 70-100% ▶ RUNNING
   ▼
6. 当 progress 达到 100% 时
   ▼
7. 获取 publicUrl，提示用户已准备就绪
```

### JavaScript 监控实现

```javascript
async function monitorDeployment(projectId, token) {
  let isComplete = false;
  
  while (!isComplete) {
    const response = await fetch(
      `/api/railway/instances/${projectId}/status`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = await response.json();
    const progress = data.data.monitoring.progress;
    const health = data.data.health.status;
    
    console.log(`Progress: ${progress}%`);
    
    if (health === 'HEALTHY') {
      isComplete = true;
      console.log('✅ 实例已准备就绪!');
      console.log('URL:', data.data.publicUrl);
    } else {
      // 等待 10 秒后再检查
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}
```

---

## ❌ 错误处理

### 通用错误代码

| 状态码 | 说明 | 处理方式 |
|--------|------|---------|
| 200 | 成功 | 继续处理 |
| 201 | 已创建 | 实例创建成功 |
| 400 | 请求错误 | 检查参数格式 |
| 401 | 未认证 | 检查 Token 有效性 |
| 402 | 需要付款 | 提示用户订阅 |
| 403 | 禁止访问 | 检查权限和配额 |
| 404 | 不存在 | 检查 ID 是否正确 |
| 500 | 服务器错误 | 重试或联系支持 |

### 错误处理示例

```javascript
async function createInstance(name, token) {
  try {
    const response = await fetch('/api/railway/instances', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instanceName: name })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // 处理业务错误
      if (response.status === 402) {
        alert('请先订阅才能创建实例');
      } else if (response.status === 403) {
        alert(`实例数量已达上限: ${data.message}`);
      } else {
        alert(`错误: ${data.message}`);
      }
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('网络错误:', error);
    alert('网络连接失败，请重试');
    return null;
  }
}
```

---

## 🧪 测试

### 使用 Postman 测试

1. 导入集合
2. 设置环境变量: `{{token}}`, `{{instanceId}}`
3. 依次运行请求

### 使用 curl 测试

```bash
# 设置变量
TOKEN="your_jwt_token"
INSTANCE_ID="instance_id"

# 测试健康检查
curl http://localhost:3000/api/health

# 创建实例
curl -X POST http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "test"}'

# 获取实例列表
curl http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer $TOKEN"

# 获取实例状态
curl http://localhost:3000/api/railway/instances/$INSTANCE_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📈 API 限流

建议配置的限流规则：

| 操作 | 限制 | 时间窗口 |
|------|------|---------|
| 创建实例 | 5 | 15 分钟 |
| 获取实例列表 | 100 | 1 分钟 |
| 更新实例 | 10 | 1 分钟 |
| 删除实例 | 5 | 1 小时 |

---

**Phase 3 API 文档完成！** ✅
