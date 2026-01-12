# 个人信息聚合平台 - 系统架构文档

## 目录

1. [系统概述](#系统概述)
2. [技术栈](#技术栈)
3. [架构设计](#架构设计)
4. [数据库设计](#数据库设计)
5. [核心模块](#核心模块)
6. [API 设计](#api-设计)
7. [部署说明](#部署说明)
8. [扩展性考虑](#扩展性考虑)

---

## 系统概述

个人信息聚合平台是一个全栈 Web 应用，旨在帮助用户集中管理和阅读来自不同渠道的内容。系统支持从微信公众号、知乎、RSS 和任意网页抓取内容，并通过 AI 技术提供智能摘要、关键词提取和主题分类功能。

### 核心特性

- **多源聚合**：支持多种内容来源类型
- **智能抓取**：自动定时抓取最新内容，内置去重机制
- **AI 辅助**：自动生成摘要、提取关键词、主题分类
- **个性化管理**：收藏、标签、搜索、导出等功能
- **通知系统**：抓取成功/失败自动通知

---

## 技术栈

### 前端

- **框架**：React 19
- **路由**：Wouter
- **样式**：Tailwind CSS 4 (斯堪的纳维亚美学风格)
- **UI 组件**：shadcn/ui (基于 Radix UI)
- **状态管理**：tRPC + React Query
- **构建工具**：Vite

### 后端

- **运行时**：Node.js 22
- **框架**：Express 4
- **API 层**：tRPC 11 (类型安全的 RPC)
- **数据传输**：Superjson (支持 Date 等复杂类型)
- **认证**：Manus OAuth

### 数据库

- **数据库**：MySQL/TiDB
- **ORM**：Drizzle ORM
- **迁移工具**：Drizzle Kit

### AI 服务

- **LLM 集成**：通过 Manus 内置 API
- **功能**：摘要生成、关键词提取、主题分类

### 其他

- **HTTP 客户端**：Axios
- **测试框架**：Vitest
- **包管理器**：pnpm

---

## 架构设计

### 整体架构

系统采用前后端分离的架构，通过 tRPC 实现类型安全的通信。

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ 首页     │  │ 信息源   │  │ 文章列表 │  │ 设置    │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                         │                                │
│                    tRPC Client                           │
└─────────────────────────┼───────────────────────────────┘
                          │
                    tRPC Protocol
                          │
┌─────────────────────────┼───────────────────────────────┐
│                    tRPC Server                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Auth     │  │ Sources  │  │ Articles │  │ Settings│ │
│  │ Router   │  │ Router   │  │ Router   │  │ Router  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│         │              │              │            │     │
│         └──────────────┼──────────────┼────────────┘     │
│                        │              │                  │
│              ┌─────────┴──────┐  ┌───┴────────┐         │
│              │   Crawler      │  │  AI Module │         │
│              │   Module       │  │            │         │
│              └────────┬───────┘  └─────┬──────┘         │
│                       │                │                 │
└───────────────────────┼────────────────┼─────────────────┘
                        │                │
                  ┌─────┴────────┐  ┌───┴────────┐
                  │   Database   │  │  LLM API   │
                  │  (MySQL)     │  │  (Manus)   │
                  └──────────────┘  └────────────┘
```

### 数据流

1. **用户请求** → 前端组件
2. **tRPC 调用** → 后端 Router
3. **业务逻辑** → 数据库查询 / 外部服务调用
4. **响应返回** → 前端更新 UI

### 抓取流程

```
定时触发 / 手动触发
        ↓
   获取信息源配置
        ↓
   选择解析器 (RSS / HTML / 微信 / 知乎)
        ↓
   抓取内容
        ↓
   内容去重 (SHA256 哈希)
        ↓
   存储到数据库
        ↓
   AI 分析 (如果启用)
        ↓
   记录抓取日志
        ↓
   发送通知 (如果启用)
```

---

## 数据库设计

### ER 图

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  users   │──────<│ sources  │──────<│ articles │
└──────────┘       └──────────┘       └──────────┘
     │                                       │
     │                                       │
     ├──────────────────┐                   │
     │                  │                   │
     ▼                  ▼                   ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│ settings │       │   tags   │───────│ ai_analysis│
└──────────┘       └──────────┘       └──────────┘
                        │
                        │
                        ▼
                   ┌──────────┐
                   │article_  │
                   │  tags    │
                   └──────────┘
```

### 核心表结构

#### users (用户表)
- `id`: 主键
- `openId`: Manus OAuth 标识
- `name`, `email`, `loginMethod`: 用户信息
- `role`: 用户角色 (user/admin)
- `createdAt`, `updatedAt`, `lastSignedIn`: 时间戳

#### sources (信息源表)
- `id`: 主键
- `userId`: 外键 → users
- `name`: 信息源名称
- `type`: 类型 (wechat/zhihu/website/rss)
- `url`: 来源链接
- `description`: 描述
- `isActive`: 是否启用
- `lastCrawledAt`: 最后抓取时间
- `crawlInterval`: 抓取间隔（秒）

#### articles (文章表)
- `id`: 主键
- `sourceId`: 外键 → sources
- `userId`: 外键 → users
- `title`: 标题
- `author`: 作者
- `originalUrl`: 原文链接
- `contentText`: 正文文本
- `contentHash`: 内容哈希 (用于去重)
- `publishedAt`: 发布时间
- `crawledAt`: 抓取时间
- `status`: 状态 (unread/read/archived)
- `isFavorite`: 是否收藏

#### ai_analysis (AI 分析结果表)
- `id`: 主键
- `articleId`: 外键 → articles (唯一)
- `summary`: 摘要
- `keyPoints`: 关键要点 (JSON)
- `tags`: 关键词标签 (JSON)
- `topic`: 主题分类

#### tags (标签表)
- `id`: 主键
- `userId`: 外键 → users
- `name`: 标签名称
- `color`: 标签颜色

#### article_tags (文章标签关联表)
- `id`: 主键
- `articleId`: 外键 → articles
- `tagId`: 外键 → tags

#### crawl_logs (抓取日志表)
- `id`: 主键
- `sourceId`: 外键 → sources
- `status`: 状态 (success/failed/partial)
- `articlesFound`: 发现的文章数
- `articlesAdded`: 新增的文章数
- `errorMessage`: 错误信息
- `startedAt`, `completedAt`: 时间戳

#### settings (系统配置表)
- `id`: 主键
- `userId`: 外键 → users (唯一)
- `aiEnabled`: AI 功能总开关
- `aiSummaryEnabled`: 摘要生成开关
- `aiKeywordsEnabled`: 关键词提取开关
- `aiTopicEnabled`: 主题分类开关
- `defaultCrawlInterval`: 默认抓取间隔
- `notificationEnabled`: 通知开关

---

## 核心模块

### 1. 内容抓取模块 (`server/crawler.ts`)

**功能**：
- 支持多种内容来源的解析
- 内容去重机制 (SHA256 哈希)
- 错误处理和日志记录

**解析器**：
- `parseGenericHTML`: 通用 HTML 解析器
- `parseRSSFeed`: RSS/Atom Feed 解析器
- `parseWechatArticle`: 微信公众号文章解析器
- `parseZhihuContent`: 知乎内容解析器

**核心函数**：
- `crawlSource(sourceId)`: 抓取单个信息源
- `crawlAllActiveSources()`: 批量抓取所有活跃信息源

### 2. AI 处理模块 (`server/crawler.ts`)

**功能**：
- 调用 LLM API 进行内容分析
- 生成结构化的分析结果

**核心函数**：
- `analyzeContentWithAI(title, content)`: AI 内容分析
  - 输入：文章标题和正文
  - 输出：摘要、关键要点、关键词标签、主题分类

### 3. 数据库查询模块 (`server/db.ts`)

**功能**：
- 封装所有数据库操作
- 提供类型安全的查询接口

**核心函数**：
- 用户相关：`upsertUser`, `getUserByOpenId`
- 信息源相关：`createSource`, `getSourcesByUserId`, `updateSource`, `deleteSource`
- 文章相关：`createArticle`, `getArticlesByUserId`, `updateArticle`, `checkArticleExists`
- AI 分析：`createAiAnalysis`, `getAiAnalysisByArticleId`
- 标签相关：`createTag`, `getTagsByUserId`, `addArticleTag`, `removeArticleTag`
- 日志相关：`createCrawlLog`, `getCrawlLogsBySourceId`
- 设置相关：`getSettingsByUserId`, `createOrUpdateSettings`

### 4. tRPC 路由模块 (`server/routers.ts`)

**功能**：
- 定义所有 API 端点
- 输入验证 (Zod)
- 权限控制 (protectedProcedure)

**路由分组**：
- `auth`: 认证相关 (me, logout)
- `sources`: 信息源管理 (list, create, update, delete, crawl, crawlAll)
- `articles`: 文章管理 (list, today, stats, get, updateStatus, toggleFavorite, export)
- `tags`: 标签管理 (list, create, delete, addToArticle, removeFromArticle, getArticles)
- `logs`: 抓取日志 (bySource, recent)
- `settings`: 系统设置 (get, update)

---

## API 设计

### 认证

所有需要认证的 API 使用 `protectedProcedure`，自动从 session cookie 中提取用户信息。

### 输入验证

使用 Zod 进行输入验证，示例：

```typescript
create: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['wechat', 'zhihu', 'website', 'rss']),
    url: z.string().url(),
    description: z.string().optional(),
    crawlInterval: z.number().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 业务逻辑
  })
```

### 错误处理

- 使用 `TRPCError` 抛出标准化错误
- 前端通过 `onError` 回调处理错误
- 显示用户友好的错误提示

### 类型安全

- 前后端共享类型定义
- tRPC 自动推导类型
- 编译时类型检查

---

## 部署说明

### 环境变量

系统自动注入以下环境变量（无需手动配置）：
- `DATABASE_URL`: 数据库连接字符串
- `JWT_SECRET`: Session 签名密钥
- `VITE_APP_ID`: Manus OAuth 应用 ID
- `OAUTH_SERVER_URL`: OAuth 服务器地址
- `BUILT_IN_FORGE_API_URL`: Manus 内置 API 地址
- `BUILT_IN_FORGE_API_KEY`: Manus API 密钥
- `OWNER_OPEN_ID`, `OWNER_NAME`: 项目所有者信息

### 部署步骤

1. **安装依赖**：
   ```bash
   pnpm install
   ```

2. **数据库迁移**：
   ```bash
   pnpm db:push
   ```

3. **构建项目**：
   ```bash
   pnpm build
   ```

4. **启动服务**：
   ```bash
   pnpm start
   ```

### 开发模式

```bash
pnpm dev
```

- 前端：Vite 开发服务器 (热更新)
- 后端：tsx watch (自动重启)

---

## 扩展性考虑

### 1. 添加新的内容来源类型

1. 在 `drizzle/schema.ts` 中扩展 `type` 枚举
2. 在 `server/crawler.ts` 中实现新的解析器函数
3. 在 `crawlSource` 函数中添加新的类型判断分支

### 2. 定时任务调度

目前系统支持手动触发和配置抓取间隔，但未实现自动定时调度。

**扩展方案**：
- 使用 `node-cron` 或 `bull` 实现定时任务
- 根据 `crawlInterval` 动态调度任务
- 考虑使用 Redis 作为任务队列

### 3. 性能优化

**当前限制**：
- 单次抓取串行执行
- AI 分析同步调用

**优化方案**：
- 使用任务队列实现异步抓取
- 批量处理 AI 分析请求
- 添加缓存层 (Redis)
- 数据库查询优化 (索引、分页)

### 4. 多用户支持

系统已支持多用户，每个用户的数据完全隔离。

**扩展方向**：
- 用户配额管理
- 管理员后台
- 用户间内容分享

### 5. 高级搜索

**当前功能**：
- 简单的标题和正文关键词搜索

**扩展方案**：
- 全文搜索引擎 (Elasticsearch)
- 高级过滤器 (日期范围、来源、主题)
- 搜索历史和推荐

---

## 安全性

### 认证与授权

- 使用 Manus OAuth 进行身份认证
- Session cookie 使用 JWT 签名
- 所有 API 端点进行权限检查

### 数据隔离

- 每个用户只能访问自己的数据
- 数据库查询强制添加 `userId` 过滤条件

### 内容抓取合规性

- 仅抓取公开可访问的内容
- 不绕过登录或反爬虫机制
- 尊重 robots.txt 和版权

---

## 维护与监控

### 日志

- 抓取日志存储在 `crawl_logs` 表
- 系统错误输出到控制台

### 通知

- 抓取成功/失败自动通知项目所有者
- 使用 Manus 内置通知 API

### 测试

- 单元测试：Vitest
- 测试覆盖：核心 API 路由和业务逻辑

---

**文档版本**: 1.0  
**最后更新**: 2026-01-12
