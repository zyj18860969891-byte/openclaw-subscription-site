# Phase 3 - Railway 快速参考指南

**更新时间**: 2026年2月25日

---

## 🚀 快速启动

### 1. 配置环境变量

```bash
# 编辑 .env 文件
RAILWAY_API_TOKEN=your_token_here
RAILWAY_TEMPLATE_PROJECT_ID=your_project_id
RAILWAY_TEMPLATE_SERVICE_ID=your_service_id
APP_SECRET=your_secret_min_32_chars
```

### 2. 启动服务

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 3. 测试API

```bash
# 健康检查
curl http://localhost:3000/api/health

# 创建实例（需要JWT token）
curl -X POST http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-bot",
    "channelCredentials": {
      "feishu": {
        "appId": "cli_xxx",
        "secret": "xxx"
      }
    }
  }'
```

---

## 📚 API 快速调用

### 创建实例

```bash
curl -X POST http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance"
  }'

# 返回
{
  "success": true,
  "data": {
    "projectId": "proj_xxx",
    "deploymentId": "deploy_xxx"
  }
}
```

### 查询实例列表

```bash
curl -X GET http://localhost:3000/api/railway/instances \
  -H "Authorization: Bearer $TOKEN"

# 返回
{
  "success": true,
  "data": [...],
  "count": 3
}
```

### 查询实例状态

```bash
curl -X GET http://localhost:3000/api/railway/instances/instance_id/status \
  -H "Authorization: Bearer $TOKEN"

# 返回
{
  "success": true,
  "data": {
    "status": "RUNNING",
    "monitoring": {
      "progress": 100,
      "status": "RUNNING"
    },
    "health": {
      "status": "HEALTHY"
    }
  }
}
```

### 获取部署日志

```bash
curl -X GET "http://localhost:3000/api/railway/instances/instance_id/logs?limit=50" \
  -H "Authorization: Bearer $TOKEN"

# 返回
{
  "success": true,
  "data": {
    "logs": [
      "[2026-02-25T10:30:34.000Z] Deployment started",
      ...
    ]
  }
}
```

### 重新部署实例

```bash
curl -X POST http://localhost:3000/api/railway/instances/instance_id/redeploy \
  -H "Authorization: Bearer $TOKEN"

# 返回
{
  "success": true,
  "data": {
    "deploymentId": "deploy_new"
  }
}
```

### 更新实例配置

```bash
curl -X PUT http://localhost:3000/api/railway/instances/instance_id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channelCredentials": {
      "dingtalk": {
        "appKey": "xxx",
        "appSecret": "xxx"
      }
    }
  }'
```

### 删除实例

```bash
curl -X DELETE http://localhost:3000/api/railway/instances/instance_id \
  -H "Authorization: Bearer $TOKEN"
```

### 配置通道

```bash
curl -X POST http://localhost:3000/api/railway/instances/instance_id/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channelType": "telegram",
    "credentials": {
      "token": "xxx",
      "botId": "xxx"
    }
  }'
```

---

## 💻 代码示例

### JavaScript/TypeScript 客户端

```typescript
class RailwayClient {
  constructor(private token: string) {}

  async createInstance(name: string) {
    const response = await fetch('/api/railway/instances', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instanceName: name })
    });
    return response.json();
  }

  async listInstances() {
    const response = await fetch('/api/railway/instances', {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async getInstanceStatus(instanceId: string) {
    const response = await fetch(
      `/api/railway/instances/${instanceId}/status`,
      { headers: { 'Authorization': `Bearer ${this.token}` } }
    );
    return response.json();
  }

  async monitorInstance(instanceId: string) {
    let isRunning = false;
    
    while (!isRunning) {
      const status = await this.getInstanceStatus(instanceId);
      console.log(`Status: ${status.data.health.status}`);
      
      if (status.data.health.status === 'HEALTHY') {
        isRunning = true;
      } else {
        await new Promise(r => setTimeout(r, 10000)); // 等待10秒
      }
    }
  }
}

// 使用示例
const client = new RailwayClient(token);
const result = await client.createInstance('my-bot');
await client.monitorInstance(result.data.projectId);
```

### Python 客户端

```python
import requests
import time

class RailwayClient:
    def __init__(self, token):
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_instance(self, name):
        response = requests.post(
            'http://localhost:3000/api/railway/instances',
            headers=self.headers,
            json={'instanceName': name}
        )
        return response.json()
    
    def list_instances(self):
        response = requests.get(
            'http://localhost:3000/api/railway/instances',
            headers=self.headers
        )
        return response.json()
    
    def get_status(self, instance_id):
        response = requests.get(
            f'http://localhost:3000/api/railway/instances/{instance_id}/status',
            headers=self.headers
        )
        return response.json()
    
    def monitor_instance(self, instance_id):
        while True:
            status = self.get_status(instance_id)
            health = status['data']['health']['status']
            print(f'Health: {health}')
            
            if health == 'HEALTHY':
                break
            
            time.sleep(10)

# 使用示例
client = RailwayClient(token)
result = client.create_instance('my-bot')
client.monitor_instance(result['data']['projectId'])
```

---

## 🧪 测试命令

```bash
# 运行所有Phase 3测试
npm test -- railway-service.test.ts

# 运行特定测试套件
npm test -- railway-service.test.ts -t "RailwayCloneService"

# 运行带覆盖率
npm test -- railway-service.test.ts --coverage

# 监控模式（自动重运行）
npm test -- railway-service.test.ts --watch
```

---

## 🔍 常见问题

### Q: 为什么部署很慢？

A: 部署通常需要 2-3 分钟，包括：
- 初始化：1 分钟
- 构建镜像：1-2 分钟
- 启动服务：30 秒

### Q: 如何监控部署进度？

A: 轮询 `/api/railway/instances/{id}/status` 端点，查看 `monitoring.progress`

### Q: 敏感信息如何保护？

A: 所有通道凭证使用 AES-256 加密存储，数据库中显示为 `***`

### Q: 如何处理部署失败？

A: 检查部署日志 `/api/railway/instances/{id}/logs`，修复问题后调用 `/redeploy`

### Q: 支持哪些通道？

A: 目前支持 Feishu、DingTalk、WeChat、Telegram

---

## 📁 文件结构

```
src/services/railway/
├── railway-client.ts              # API客户端
├── railway-clone-service.ts       # 克隆服务（核心）
├── environment-variable-service.ts # 环境变量管理
└── deployment-monitoring-service.ts # 监控服务

src/routes/
└── railway.ts                      # API路由 (9个端点)

tests/services/
└── railway-service.test.ts         # 测试用例 (20+个)

prisma/
└── schema.prisma                   # 数据库架构（更新）
```

---

## 🔑 关键概念

### 克隆服务（方案B）

通过克隆已配置好的模板项目来创建新实例。优点：
- ✅ 环境一致
- ✅ 快速部署
- ✅ 自动配置
- ✅ 可靠性高

### 环境变量管理

自动将凭证、系统信息和计划特性注入到实例环境中。包括：
- 基础系统变量（NODE_ENV, LOG_LEVEL）
- OpenClaw系统变量（PLAN, SUBSCRIPTION_ID）
- 通道凭证配置（加密存储）
- 计划特性限制（MAX_INSTANCES）

### 部署监控

实时追踪部署进度，包括：
- 状态转变（INITIALIZING → BUILDING → DEPLOYING → RUNNING）
- 进度百分比计算
- 剩余时间估计
- 日志记录和查询

---

## 🚨 故障排查

### 实例创建失败

```bash
# 检查Railway API token是否有效
echo $RAILWAY_API_TOKEN

# 检查模板项目是否存在
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -X POST https://api.railway.app/graphql \
  -d '{"query": "query { project(id: \"TEMPLATE_ID\") { name } }"}'

# 查看应用日志
npm run dev

# 查看错误细节
curl http://localhost:3000/api/railway/instances/instance_id/logs
```

### 环境变量未注入

```bash
# 检查数据库中的变量记录
SELECT variables FROM railway_instance WHERE id = 'instance_id';

# 检查通道凭证是否正确保存
SELECT * FROM channel_credential WHERE subscription_id = 'sub_id';

# 手动重新部署
curl -X POST http://localhost:3000/api/railway/instances/instance_id/redeploy \
  -H "Authorization: Bearer $TOKEN"
```

### 监控不启动

```bash
# 检查应用是否正常运行
curl http://localhost:3000/api/health

# 查看应用日志中的监控相关输出
npm run dev 2>&1 | grep "\[Monitoring\]"

# 手动启动监控
# （在应用代码中调用startMonitoring方法）
```

---

## 📞 获取帮助

| 问题类型 | 查看文档 |
|---------|---------|
| 架构设计 | PHASE_3_COMPLETE.md |
| API使用 | 本文件 |
| 部署配置 | .env.example |
| 数据库 | prisma/schema.prisma |
| 测试 | tests/services/railway-service.test.ts |

---

## ✅ 检查清单

启动前确保：
- [ ] 已配置 .env 文件
- [ ] Railway API Token 有效
- [ ] 模板项目已创建
- [ ] 数据库已迁移
- [ ] 所有依赖已安装
- [ ] Phase 1-2 已完成

---

**Phase 3 快速参考完成！** 🎉
