# 🎵 声音干涉图案合成器

一个基于Canvas和Web Audio API的交互式声音干涉图案可视化应用，支持实时波计算和音效生成。

## ✨ 功能特性

- 🎨 **实时干涉图案计算** - 基于球面波物理模型的高精度渲染
- 🎵 **Web Audio音效生成** - 双声源拍频音效实时合成
- 👆 **交互式声源拖动** - 支持鼠标和触摸屏操作
- 💾 **配置持久化存储** - SQLite后端保存自定义参数
- 📱 **响应式设计** - 适配桌面和移动设备
- 🚀 **性能优化** - 按需重绘，后台自动暂停

## 🏗️ 工程化特性

### 后端 Express 架构
- ✅ **统一错误处理** - 全局错误中间件，规范API异常响应
- ✅ **统一响应格式** - 标准化的JSON响应结构
- ✅ **请求数据验证** - 输入参数合法性校验
- ✅ **异步错误捕获** - catchAsync包装器自动处理Promise异常
- ✅ **404处理** - 优雅的路由不存在处理
- ✅ **生产/开发环境区分** - 错误详情展示策略

### 代码质量规范
- ✅ **ESLint** - JavaScript代码质量检测
- ✅ **Prettier** - 代码格式化统一
- ✅ **Git忽略配置** - 标准的.gitignore规则

## 📦 安装与运行

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 生产模式运行
```bash
npm start
```

### 代码质量检查
```bash
# ESLint检查
npm run lint

# ESLint自动修复
npm run lint:fix

# Prettier格式化
npm run format

# Prettier格式检查
npm run format:check
```

## 🌐 API 文档

### 统一响应格式

所有API响应遵循以下格式：

**成功响应：**
```json
{
  "status": "success",
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

**错误响应：**
```json
{
  "status": "fail",
  "message": "错误描述信息"
}
```

### 健康检查
```http
GET /api/health
```

**响应示例：**
```json
{
  "status": "success",
  "message": "服务运行正常",
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 123.45,
    "database": "connected"
  }
}
```

### 配置管理 API

#### 获取所有配置
```http
GET /api/configs
```

**响应示例：**
```json
{
  "status": "success",
  "message": "获取配置列表成功",
  "data": {
    "count": 3,
    "configs": [
      {
        "id": 1,
        "name": "默认配置",
        "source1_x": 200,
        "source1_y": 250,
        "source1_frequency": 440,
        "source1_amplitude": 1.0,
        "source2_x": 400,
        "source2_y": 250,
        "source2_frequency": 445,
        "source2_amplitude": 1.0,
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

#### 获取单个配置
```http
GET /api/configs/:id
```

#### 创建配置
```http
POST /api/configs
Content-Type: application/json

{
  "name": "配置名称",
  "source1_x": 200,
  "source1_y": 250,
  "source1_frequency": 440,
  "source1_amplitude": 1.0,
  "source2_x": 400,
  "source2_y": 250,
  "source2_frequency": 445,
  "source2_amplitude": 1.0
}
```

**验证规则：**
- `name`: 非空字符串
- `*_frequency`: 20 - 20000 Hz
- `*_amplitude`: 0 - 10

#### 更新配置
```http
PUT /api/configs/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  ...
}
```

#### 删除配置
```http
DELETE /api/configs/:id
```

## 🏗️ 项目架构

```
sound-interference-synthesizer/
├── public/                 # 前端静态资源
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   ├── app.js             # 应用逻辑
│   └── wave-calculator.js # 波计算纯函数模块
├── test/                   # 测试目录
│   ├── interference.test.js
│   ├── api.test.js
│   └── test-runner.html
├── server.js              # Express服务器入口
├── sound_config.db        # SQLite数据库（自动创建）
├── package.json           # 项目配置
├── .eslintrc.js           # ESLint配置
├── .eslintignore          # ESLint忽略
├── .prettierrc            # Prettier配置
├── .prettierignore        # Prettier忽略
└── README.md              # 项目文档
```

### 后端架构设计

#### 错误处理流程
```
请求 → 路由处理 → catchAsync捕获异常 → errorHandler统一处理
     ↓
   验证中间件 → 不通过 → AppError → 统一错误响应
```

#### 核心中间件
- `AppError` - 自定义错误类，支持状态码和操作类型标记
- `catchAsync` - 异步错误捕获包装器
- `validateConfig` - 配置数据验证
- `notFoundHandler` - 404处理
- `errorHandler` - 全局错误处理

## 🎯 核心模块说明

### WaveCalculator（波计算模块）

独立的纯函数计算模块，无副作用，可在Node.js和浏览器中通用：

```javascript
// 计算两点间距离
WaveCalculator.calculateDistance(x1, y1, x2, y2)

// 计算干涉图像素数据
WaveCalculator.calculateInterferenceImage(width, height, source1, source2)

// 计算拍频波形
WaveCalculator.getBeatWave(time, freq1, freq2, amp1, amp2)
```

### 动画循环优化

- 使用 `requestAnimationFrame` 替代 `setInterval`
- 页面隐藏时自动暂停，节省CPU资源
- 按需重绘，仅在参数变化时重新计算

## 📝 开发规范

### 代码风格
- 2空格缩进
- 单引号字符串
- 语句末尾分号
- 无尾随逗号
- 最大行宽100字符

### Git 提交规范

建议使用以下格式：
```
feat: 新增功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

## 🔧 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3000 | 服务监听端口 |
| NODE_ENV | development | 运行环境 |

## 📱 移动端适配

- 支持触摸拖动声源
- 双指缩放页面（不影响画布）
- 响应式布局自适应
- 触摸事件与滚动行为正确隔离

## 🚀 性能优化

1. **Canvas渲染优化**
   - 按需重绘，仅在参数变化时计算
   - 使用ImageData直接操作像素

2. **页面可见性API**
   - 后台标签页自动暂停动画
   - 切回页面自动恢复

3. **波计算优化**
   - 纯函数设计，无额外副作用
   - 数学计算使用原生Math方法

## 🐛 错误处理

系统具备完整的错误处理机制：

- ✅ 同步异常捕获
- ✅ 异步Promise异常捕获
- ✅ 未处理异常（uncaughtException）
- ✅ 未处理Promise拒绝（unhandledRejection）
- ✅ 404路由处理
- ✅ 参数验证错误
- ✅ 数据库操作错误

## 📄 许可证

MIT License
