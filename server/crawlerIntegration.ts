/**
 * 爬虫集成模块 - 整合智能爬虫和传统爬虫
 */

import crypto from 'crypto';
import { smartCrawl, type MultiArticleResult } from './smartCrawler';
import { invokeLLM } from './_core/llm';
import * as db from './db';

/**
 * 智能抓取信息源并保存到数据库
 */
export async function crawlSourceSmart(sourceId: number): Promise<{
  success: boolean;
  articlesAdded: number;
  error?: string;
}> {
  try {
    const source = await db.getSourceById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    console.log(`[CrawlerIntegration] Starting smart crawl for source: ${source.name}`);

    // 使用智能爬虫抓取
    const result: MultiArticleResult = await smartCrawl(source.url);

    console.log(`[CrawlerIntegration] Crawl result: ${result.articles.length} articles found`);

    let articlesAdded = 0;

    // 处理每篇文章
    for (const article of result.articles) {
      // 计算内容哈希用于去重
      const contentHash = crypto
        .createHash('sha256')
        .update(article.content)
        .digest('hex');

      // 检查是否已存在
      const exists = await db.checkArticleExists(contentHash);
      if (exists) {
        console.log(`[CrawlerIntegration] Article already exists: ${article.title}`);
        continue;
      }

      // 保存文章
      const articleResult = await db.createArticle({
        sourceId: source.id,
        userId: source.userId,
        pageType: result.pageType,
        title: article.title,
        author: article.author || null,
        originalUrl: article.url,
        contentText: article.content,
        contentHash,
        publishedAt: article.publishedAt || null,
        status: 'unread',
        isFavorite: false,
      });

      articlesAdded++;
      // 使用时间戳作为临时ID，实际ID由数据库自动生成
      const articleId = Date.now();
      console.log(`[CrawlerIntegration] Article saved: ${article.title}`);

      // 如果启用了AI分析，进行分析
      const settings = await db.getSettingsByUserId(source.userId);
      if (settings?.aiEnabled) {
        try {
          const analysis = await analyzeContentWithAI(article.title, article.content);
          await db.createAiAnalysis({
            articleId,
            summary: analysis.summary,
            keyPoints: JSON.stringify(analysis.keyPoints),
            tags: JSON.stringify(analysis.tags),
            topic: analysis.topic,
          });
          console.log(`[CrawlerIntegration] AI analysis completed for: ${article.title}`);
        } catch (aiError) {
          console.error(`[CrawlerIntegration] AI analysis failed:`, aiError);
        }
      }
    }

    // 更新信息源的最后抓取时间
    await db.updateSource(sourceId, {
      lastCrawledAt: new Date(),
    });

    // 记录抓取日志
    await db.createCrawlLog({
      sourceId,
      status: 'success',
      articlesFound: result.articles.length,
      articlesAdded,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    console.log(`[CrawlerIntegration] Crawl completed: ${articlesAdded} articles added`);

    return {
      success: true,
      articlesAdded,
    };
  } catch (error: any) {
    console.error(`[CrawlerIntegration] Crawl failed:`, error);

    // 记录失败日志
    try {
      await db.createCrawlLog({
        sourceId,
        status: 'failed',
        articlesFound: 0,
        articlesAdded: 0,
        errorMessage: error.message,
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch (logError) {
      console.error(`[CrawlerIntegration] Failed to log error:`, logError);
    }

    return {
      success: false,
      articlesAdded: 0,
      error: error.message,
    };
  }
}

/**
 * AI内容分析
 */
async function analyzeContentWithAI(title: string, content: string): Promise<{
  summary: string;
  keyPoints: string[];
  tags: string[];
  topic: string;
}> {
  const prompt = `请分析以下文章并提供结构化的分析结果。

文章标题：${title}

文章内容：
${content.substring(0, 3000)}

请以JSON格式返回以下信息：
1. summary: 100-200字的简要摘要
2. keyPoints: 3-5个核心要点（数组）
3. tags: 3-5个关键词标签（数组）
4. topic: 主题分类（从以下选项中选择一个：科技、商业、文化、教育、健康、娱乐、其他）

请确保返回有效的JSON格式。`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: '你是一个专业的内容分析助手，擅长提取文章的核心信息。' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'article_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            topic: { type: 'string' },
          },
          required: ['summary', 'keyPoints', 'tags', 'topic'],
          additionalProperties: false,
        },
      },
    },
  });

  const messageContent = response.choices[0]?.message?.content;
  const result = JSON.parse(typeof messageContent === 'string' ? messageContent : '{}');
  return result;
}
