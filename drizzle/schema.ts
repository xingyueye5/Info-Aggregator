import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, unique } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 支持Manus OAuth认证
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 信息源表 - 存储用户添加的内容来源
 */
export const sources = mysqlTable("sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // 用户自定义的来源名称
  type: mysqlEnum("type", ["wechat", "zhihu", "website", "rss"]).notNull(),
  url: text("url").notNull(), // 来源链接
  description: text("description"), // 来源描述
  isActive: boolean("isActive").default(true).notNull(), // 是否启用
  lastCrawledAt: timestamp("lastCrawledAt"), // 上次抓取时间
  crawlInterval: int("crawlInterval").default(3600), // 抓取间隔（秒），默认1小时
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type Source = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;

/**
 * 文章表 - 存储抓取的内容
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  userId: int("userId").notNull(), // 冗余字段，便于查询
  parentArticleId: int("parentArticleId"), // 父文章ID，用于多篇内容关联
  pageType: mysqlEnum("pageType", ["article", "list", "unknown"]).default("article"), // 页面类型
  title: varchar("title", { length: 500 }).notNull(),
  author: varchar("author", { length: 255 }),
  originalUrl: text("originalUrl").notNull(),
  contentText: text("contentText").notNull(), // 正文纯文本
  contentHash: varchar("contentHash", { length: 64 }).notNull(), // 用于去重的内容哈希
  publishedAt: timestamp("publishedAt"), // 原文发布时间
  crawledAt: timestamp("crawledAt").defaultNow().notNull(), // 抓取时间
  status: mysqlEnum("status", ["unread", "read", "archived"]).default("unread").notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(), // 是否收藏
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sourceIdIdx: index("sourceId_idx").on(table.sourceId),
  userIdIdx: index("userId_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
  crawledAtIdx: index("crawledAt_idx").on(table.crawledAt),
  contentHashIdx: index("contentHash_idx").on(table.contentHash),
  favoriteIdx: index("favorite_idx").on(table.isFavorite),
}));

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * AI分析结果表 - 存储AI处理后的内容
 */
export const aiAnalysis = mysqlTable("ai_analysis", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull().unique(),
  summary: text("summary"), // AI生成的摘要
  keyPoints: text("keyPoints"), // JSON格式的关键要点
  tags: text("tags"), // JSON格式的关键词标签
  topic: varchar("topic", { length: 100 }), // AI分类的主题
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  articleIdIdx: index("articleId_idx").on(table.articleId),
  topicIdx: index("topic_idx").on(table.topic),
}));

export type AiAnalysis = typeof aiAnalysis.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalysis.$inferInsert;

/**
 * 标签表 - 用户自定义标签
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 20 }), // 标签颜色
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  uniqueUserTag: unique("unique_user_tag").on(table.userId, table.name),
}));

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * 文章标签关联表
 */
export const articleTags = mysqlTable("article_tags", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  articleIdIdx: index("articleId_idx").on(table.articleId),
  tagIdIdx: index("tagId_idx").on(table.tagId),
  uniqueArticleTag: unique("unique_article_tag").on(table.articleId, table.tagId),
}));

export type ArticleTag = typeof articleTags.$inferSelect;
export type InsertArticleTag = typeof articleTags.$inferInsert;

/**
 * 抓取日志表 - 记录抓取历史和错误
 */
export const crawlLogs = mysqlTable("crawl_logs", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
  articlesFound: int("articlesFound").default(0).notNull(), // 发现的文章数
  articlesAdded: int("articlesAdded").default(0).notNull(), // 新增的文章数
  errorMessage: text("errorMessage"), // 错误信息
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sourceIdIdx: index("sourceId_idx").on(table.sourceId),
  statusIdx: index("status_idx").on(table.status),
  startedAtIdx: index("startedAt_idx").on(table.startedAt),
}));

export type CrawlLog = typeof crawlLogs.$inferSelect;
export type InsertCrawlLog = typeof crawlLogs.$inferInsert;

/**
 * 系统配置表 - 存储全局设置
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // 每个用户一套配置
  aiEnabled: boolean("aiEnabled").default(true).notNull(), // AI功能总开关
  aiSummaryEnabled: boolean("aiSummaryEnabled").default(true).notNull(),
  aiKeywordsEnabled: boolean("aiKeywordsEnabled").default(true).notNull(),
  aiTopicEnabled: boolean("aiTopicEnabled").default(true).notNull(),
  defaultCrawlInterval: int("defaultCrawlInterval").default(3600).notNull(), // 默认抓取间隔（秒）
  notificationEnabled: boolean("notificationEnabled").default(true).notNull(), // 通知开关
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
