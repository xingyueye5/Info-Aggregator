import { eq, desc, and, or, like, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  sources, 
  articles, 
  aiAnalysis, 
  tags, 
  articleTags, 
  crawlLogs, 
  settings,
  InsertSource,
  InsertArticle,
  InsertAiAnalysis,
  InsertTag,
  InsertArticleTag,
  InsertCrawlLog,
  InsertSetting,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关 ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 信息源相关 ====================

export async function createSource(source: InsertSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sources).values(source);
  return result;
}

export async function getSourcesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sources).where(eq(sources.userId, userId)).orderBy(desc(sources.createdAt));
}

export async function getSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return result[0];
}

export async function updateSource(id: number, data: Partial<InsertSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(sources).set(data).where(eq(sources.id, id));
}

export async function deleteSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(sources).where(eq(sources.id, id));
}

export async function getActiveSourcesForCrawl() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(sources).where(eq(sources.isActive, true));
}

// ==================== 文章相关 ====================

export async function createArticle(article: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(articles).values(article);
  return result;
}

export async function getArticlesByUserId(
  userId: number, 
  options?: {
    status?: "unread" | "read" | "archived";
    sourceId?: number;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
    searchQuery?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(articles.userId, userId)];
  
  if (options?.status) {
    conditions.push(eq(articles.status, options.status));
  }
  if (options?.sourceId) {
    conditions.push(eq(articles.sourceId, options.sourceId));
  }
  if (options?.isFavorite !== undefined) {
    conditions.push(eq(articles.isFavorite, options.isFavorite));
  }
  if (options?.searchQuery) {
    conditions.push(
      or(
        like(articles.title, `%${options.searchQuery}%`),
        like(articles.contentText, `%${options.searchQuery}%`)
      )!
    );
  }
  
  let query = db.select().from(articles).where(and(...conditions)).orderBy(desc(articles.crawledAt));
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return await query;
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0];
}

export async function updateArticle(id: number, data: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(articles).where(eq(articles.id, id));
}

export async function checkArticleExists(contentHash: string) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: articles.id }).from(articles).where(eq(articles.contentHash, contentHash)).limit(1);
  return result.length > 0;
}

export async function getTodayArticles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await db.select().from(articles)
    .where(
      and(
        eq(articles.userId, userId),
        sql`${articles.crawledAt} >= ${today}`
      )
    )
    .orderBy(desc(articles.crawledAt));
}

export async function getArticleStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, unread: 0, read: 0, favorite: 0 };
  
  const result = await db.select({
    total: sql<number>`count(*)`,
    unread: sql<number>`sum(case when ${articles.status} = 'unread' then 1 else 0 end)`,
    read: sql<number>`sum(case when ${articles.status} = 'read' then 1 else 0 end)`,
    favorite: sql<number>`sum(case when ${articles.isFavorite} = 1 then 1 else 0 end)`,
  }).from(articles).where(eq(articles.userId, userId));
  
  return result[0] || { total: 0, unread: 0, read: 0, favorite: 0 };
}

// ==================== AI分析相关 ====================

export async function createAiAnalysis(analysis: InsertAiAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(aiAnalysis).values(analysis);
}

export async function getAiAnalysisByArticleId(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(aiAnalysis).where(eq(aiAnalysis.articleId, articleId)).limit(1);
  return result[0];
}

// ==================== 标签相关 ====================

export async function createTag(tag: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(tags).values(tag);
}

export async function getTagsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(desc(tags.createdAt));
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(tags).where(eq(tags.id, id));
}

export async function addArticleTag(articleTag: InsertArticleTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(articleTags).values(articleTag);
}

export async function removeArticleTag(articleId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(articleTags).where(
    and(
      eq(articleTags.articleId, articleId),
      eq(articleTags.tagId, tagId)
    )
  );
}

export async function getArticleTagsByArticleId(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    id: tags.id,
    name: tags.name,
    color: tags.color,
  }).from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId));
}

export async function getArticlesByTagId(tagId: number, limit?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select({
    id: articles.id,
    title: articles.title,
    author: articles.author,
    crawledAt: articles.crawledAt,
    status: articles.status,
  }).from(articleTags)
    .innerJoin(articles, eq(articleTags.articleId, articles.id))
    .where(eq(articleTags.tagId, tagId))
    .orderBy(desc(articles.crawledAt));
  
  if (limit) {
    query = query.limit(limit) as any;
  }
  
  return await query;
}

// ==================== 抓取日志相关 ====================

export async function createCrawlLog(log: InsertCrawlLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(crawlLogs).values(log);
}

export async function getCrawlLogsBySourceId(sourceId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(crawlLogs)
    .where(eq(crawlLogs.sourceId, sourceId))
    .orderBy(desc(crawlLogs.startedAt))
    .limit(limit);
}

export async function getRecentCrawlLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(crawlLogs)
    .orderBy(desc(crawlLogs.startedAt))
    .limit(limit);
}

// ==================== 系统配置相关 ====================

export async function getSettingsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
  return result[0];
}

export async function createOrUpdateSettings(userId: number, data: Partial<InsertSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSettingsByUserId(userId);
  
  if (existing) {
    return await db.update(settings).set(data).where(eq(settings.userId, userId));
  } else {
    return await db.insert(settings).values({ userId, ...data });
  }
}
