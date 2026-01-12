import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createSource,
  getSourcesByUserId,
  getSourceById,
  updateSource,
  deleteSource,
  getArticlesByUserId,
  getArticleById,
  updateArticle,
  getTodayArticles,
  getArticleStats,
  getAiAnalysisByArticleId,
  createTag,
  getTagsByUserId,
  deleteTag,
  addArticleTag,
  removeArticleTag,
  getArticleTagsByArticleId,
  getArticlesByTagId,
  getCrawlLogsBySourceId,
  getRecentCrawlLogs,
  getSettingsByUserId,
  createOrUpdateSettings,
} from "./db";
import { crawlSource, crawlAllActiveSources } from "./crawler";
import { crawlSourceSmart } from "./crawlerIntegration";
import { generateExternalSummary } from "./externalAI";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 信息源管理
  sources: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getSourcesByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        type: z.enum(['wechat', 'zhihu', 'website', 'rss']),
        url: z.string().url(),
        description: z.string().optional(),
        crawlInterval: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createSource({
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          url: input.url,
          description: input.description || null,
          crawlInterval: input.crawlInterval || 3600,
          isActive: true,
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        crawlInterval: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const source = await getSourceById(input.id);
        if (!source || source.userId !== ctx.user.id) {
          throw new Error('Source not found or unauthorized');
        }
        
        const { id, ...updateData } = input;
        await updateSource(id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const source = await getSourceById(input.id);
        if (!source || source.userId !== ctx.user.id) {
          throw new Error('Source not found or unauthorized');
        }
        
        await deleteSource(input.id);
        return { success: true };
      }),
    
    crawl: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const source = await getSourceById(input.id);
        if (!source || source.userId !== ctx.user.id) {
          throw new Error('Source not found or unauthorized');
        }
        
        // 使用智能爬虫
        const result = await crawlSourceSmart(input.id);
        
        // 发送通知
        const settings = await getSettingsByUserId(ctx.user.id);
        if (settings?.notificationEnabled) {
          if (result.success && result.articlesAdded > 0) {
            await notifyOwner({
              title: '内容抓取成功',
              content: `来源"${source.name}"成功抓取 ${result.articlesAdded} 篇新文章`,
            });
          } else if (!result.success) {
            await notifyOwner({
              title: '内容抓取失败',
              content: `来源"${source.name}"抓取失败: ${result.error}`,
            });
          }
        }
        
        return result;
      }),
    
    crawlAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        const result = await crawlAllActiveSources();
        
        // 发送通知
        const settings = await getSettingsByUserId(ctx.user.id);
        if (settings?.notificationEnabled && result.totalArticlesAdded > 0) {
          await notifyOwner({
            title: '批量抓取完成',
            content: `成功: ${result.successCount}, 失败: ${result.failedCount}, 新增文章: ${result.totalArticlesAdded}`,
          });
        }
        
        return result;
      }),
  }),

  // 文章管理
  articles: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['unread', 'read', 'archived']).optional(),
        sourceId: z.number().optional(),
        isFavorite: z.boolean().optional(),
        searchQuery: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await getArticlesByUserId(ctx.user.id, input);
      }),
    
    today: protectedProcedure.query(async ({ ctx }) => {
      return await getTodayArticles(ctx.user.id);
    }),
    
    stats: protectedProcedure.query(async ({ ctx }) => {
      return await getArticleStats(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        // 获取AI分析结果
        const aiAnalysis = await getAiAnalysisByArticleId(input.id);
        
        // 获取标签
        const tags = await getArticleTagsByArticleId(input.id);
        
        return {
          ...article,
          aiAnalysis: aiAnalysis ? {
            summary: aiAnalysis.summary,
            keyPoints: aiAnalysis.keyPoints ? JSON.parse(aiAnalysis.keyPoints) : [],
            tags: aiAnalysis.tags ? JSON.parse(aiAnalysis.tags) : [],
            topic: aiAnalysis.topic,
          } : null,
          tags,
        };
      }),
    
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['unread', 'read', 'archived']),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        await updateArticle(input.id, { status: input.status });
        return { success: true };
      }),
    
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        await updateArticle(input.id, { isFavorite: !article.isFavorite });
        return { success: true, isFavorite: !article.isFavorite };
      }),
    
    generateExternalSummary: protectedProcedure
      .input(z.object({
        id: z.number(),
        apiUrl: z.string().url(),
        apiKey: z.string(),
        model: z.string().optional(),
        translateToChinese: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        const result = await generateExternalSummary(
          article.contentText,
          {
            apiUrl: input.apiUrl,
            apiKey: input.apiKey,
            model: input.model,
          },
          input.translateToChinese
        );
        
        return result;
      }),
    
    export: protectedProcedure
      .input(z.object({
        id: z.number(),
        format: z.enum(['markdown', 'txt']),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        const aiAnalysis = await getAiAnalysisByArticleId(input.id);
        
        let content = '';
        
        if (input.format === 'markdown') {
          content = `# ${article.title}\n\n`;
          content += `**作者:** ${article.author || '未知'}\n\n`;
          content += `**来源:** ${article.originalUrl}\n\n`;
          content += `**发布时间:** ${article.publishedAt ? article.publishedAt.toLocaleString() : '未知'}\n\n`;
          
          if (aiAnalysis?.summary) {
            content += `## 摘要\n\n${aiAnalysis.summary}\n\n`;
          }
          
          content += `## 正文\n\n${article.contentText}\n`;
        } else {
          content = `${article.title}\n\n`;
          content += `作者: ${article.author || '未知'}\n`;
          content += `来源: ${article.originalUrl}\n`;
          content += `发布时间: ${article.publishedAt ? article.publishedAt.toLocaleString() : '未知'}\n\n`;
          
          if (aiAnalysis?.summary) {
            content += `摘要:\n${aiAnalysis.summary}\n\n`;
          }
          
          content += `正文:\n${article.contentText}\n`;
        }
        
        return { content };
      }),
  }),

  // 标签管理
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getTagsByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createTag({
          userId: ctx.user.id,
          name: input.name,
          color: input.color || null,
        });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTag(input.id);
        return { success: true };
      }),
    
    addToArticle: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        tagId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.articleId);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        await addArticleTag({
          articleId: input.articleId,
          tagId: input.tagId,
        });
        return { success: true };
      }),
    
    removeFromArticle: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        tagId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.articleId);
        if (!article || article.userId !== ctx.user.id) {
          throw new Error('Article not found or unauthorized');
        }
        
        await removeArticleTag(input.articleId, input.tagId);
        return { success: true };
      }),
    
    getArticles: protectedProcedure
      .input(z.object({
        tagId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getArticlesByTagId(input.tagId, input.limit);
      }),
  }),

  // 抓取日志
  logs: router({
    bySource: protectedProcedure
      .input(z.object({
        sourceId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const source = await getSourceById(input.sourceId);
        if (!source || source.userId !== ctx.user.id) {
          throw new Error('Source not found or unauthorized');
        }
        
        return await getCrawlLogsBySourceId(input.sourceId, input.limit);
      }),
    
    recent: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        return await getRecentCrawlLogs(input.limit);
      }),
  }),

  // 系统设置
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      let settings = await getSettingsByUserId(ctx.user.id);
      
      // 如果不存在，创建默认设置
      if (!settings) {
        await createOrUpdateSettings(ctx.user.id, {});
        settings = await getSettingsByUserId(ctx.user.id);
      }
      
      return settings;
    }),
    
    update: protectedProcedure
      .input(z.object({
        aiEnabled: z.boolean().optional(),
        aiSummaryEnabled: z.boolean().optional(),
        aiKeywordsEnabled: z.boolean().optional(),
        aiTopicEnabled: z.boolean().optional(),
        defaultCrawlInterval: z.number().optional(),
        notificationEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createOrUpdateSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
