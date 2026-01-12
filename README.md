# 个人信息聚合平台

一个功能完整的个人内容聚合与阅读管理平台，帮助你集中管理来自微信公众号、知乎、RSS 和任意网页的内容，并通过 AI 技术提升阅读效率。

## ✨ 核心功能

### 📚 多源聚合
- 支持微信公众号文章链接
- 支持知乎（用户/问题/专栏/回答）
- 支持 RSS/Atom Feed
- 支持任意网页 URL

### 🤖 AI 智能分析
- 自动生成文章摘要
- 提取关键要点
- 生成关键词标签
- 智能主题分类（科技、商业、文化、教育、健康、娱乐等）

### 📖 高效阅读体验
- 干净的阅读模式
- 已读/未读状态管理
- 收藏功能
- 自定义标签
- 全文搜索
- 导出为 Markdown/TXT

### ⚙️ 灵活配置
- 自定义抓取间隔
- AI 功能开关
- 通知设置
- 多用户支持

## 🎨 设计风格

采用极简的斯堪的纳维亚美学风格：
- 浅冷灰色背景
- 充足的留白空间
- 粗体黑色无衬线字体
- 柔和的粉蓝色和腮红粉色几何图形点缀

## 🛠️ 技术栈

### 前端
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui (Radix UI)
- Wouter (路由)
- tRPC + React Query (状态管理)

### 后端
- Node.js 22 + Express 4
- tRPC 11 (类型安全 RPC)
- Drizzle ORM
- MySQL/TiDB

### AI 服务
- Manus 内置 LLM API

## 📦 快速开始

### 安装依赖

```bash
pnpm install
```

### 数据库迁移

```bash
pnpm db:push
```

### 开发模式

```bash
pnpm dev
```

访问 `http://localhost:3000`

### 生产构建

```bash
pnpm build
pnpm start
```

### 运行测试

```bash
pnpm test
```

## 📖 文档

- [用户使用指南](./USER_GUIDE.md) - 详细的功能使用说明
- [系统架构文档](./ARCHITECTURE.md) - 技术架构和设计细节
- [待办清单](./todo.md) - 项目开发进度

## 🗂️ 项目结构

```
personal-aggregator/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # UI 组件
│   │   ├── lib/           # 工具函数
│   │   └── App.tsx        # 路由配置
│   └── public/            # 静态资源
├── server/                # 后端代码
│   ├── routers.ts         # tRPC 路由
│   ├── db.ts              # 数据库查询
│   ├── crawler.ts         # 内容抓取模块
│   └── *.test.ts          # 单元测试
├── drizzle/               # 数据库模型
│   └── schema.ts          # 表结构定义
└── shared/                # 共享代码
```

## 🔑 核心特性详解

### 内容抓取

系统支持以下抓取方式：
- **RSS Feed**: 自动解析 RSS/Atom 格式
- **HTML 解析**: 通用网页内容提取
- **微信公众号**: 解析公开文章页面
- **知乎**: 解析公开内容页面

**去重机制**: 使用 SHA256 哈希对内容进行去重，避免重复收录。

### AI 分析

使用 LLM 对抓取的内容进行智能分析：
1. 生成 100-200 字的简要摘要
2. 提取 3-5 个核心要点
3. 生成 3-5 个关键词标签
4. 自动归类到预定义主题

### 通知系统

当抓取成功或失败时，系统会自动向项目所有者发送通知，包含：
- 抓取状态
- 新增文章数量
- 错误信息（如果失败）

## 🔒 合规性说明

系统严格遵守以下原则：
- ✅ 仅抓取公开可访问的内容
- ✅ 不绕过登录或反爬虫机制
- ✅ 尊重 robots.txt 和版权
- ✅ 用户主动提供内容链接

## 🧪 测试

项目包含完整的单元测试，覆盖核心功能：
- 信息源管理 API
- 文章管理 API
- 标签管理 API
- 系统设置 API

运行测试：
```bash
pnpm test
```

## 📊 数据库设计

核心表结构：
- `users`: 用户信息
- `sources`: 信息源配置
- `articles`: 文章内容
- `ai_analysis`: AI 分析结果
- `tags`: 用户标签
- `article_tags`: 文章标签关联
- `crawl_logs`: 抓取日志
- `settings`: 系统配置

详细设计请参考 [系统架构文档](./ARCHITECTURE.md)。

## 🚀 部署

### Manus 平台部署

1. 创建 Checkpoint
2. 点击 Publish 按钮
3. 系统自动部署并生成访问链接

### 自定义域名

在 Manus 管理界面的 Settings → Domains 中配置自定义域名。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**开发团队**: Manus AI  
**最后更新**: 2026-01-12
