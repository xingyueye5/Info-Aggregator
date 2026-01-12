import axios from 'axios';
import * as crypto from 'crypto';
import { invokeLLM } from './_core/llm';
import { 
  createArticle, 
  checkArticleExists, 
  createAiAnalysis, 
  getSettingsByUserId,
  createCrawlLog,
  getSourceById,
  updateSource,
} from './db';
import { InsertArticle, InsertAiAnalysis, InsertCrawlLog } from '../drizzle/schema';

/**
 * 生成内容哈希用于去重
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * 通用HTML解析器 - 提取文章内容
 */
async function parseGenericHTML(url: string): Promise<{
  title: string;
  author?: string;
  content: string;
  publishedAt?: Date;
}> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const html = response.data;
    
    // 简单的HTML标签清理
    let title = '';
    let content = '';
    
    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // 提取正文（移除script、style等标签）
    content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 限制内容长度
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '...';
    }
    
    return {
      title: title || 'Untitled',
      content,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse HTML: ${error.message}`);
  }
}

/**
 * RSS Feed解析器
 */
async function parseRSSFeed(url: string): Promise<Array<{
  title: string;
  author?: string;
  content: string;
  link: string;
  publishedAt?: Date;
}>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const xml = response.data;
    const items: Array<any> = [];
    
    // 简单的RSS/Atom解析
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    
    let match;
    
    // 尝试RSS格式
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = itemContent.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const contentMatch = itemContent.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
      const authorMatch = itemContent.match(/<(?:dc:)?creator[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:dc:)?creator>/i);
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      
      const content = contentMatch ? contentMatch[1] : (descMatch ? descMatch[1] : '');
      const cleanContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      items.push({
        title: titleMatch ? titleMatch[1].trim() : 'Untitled',
        link: linkMatch ? linkMatch[1].trim() : url,
        content: cleanContent,
        author: authorMatch ? authorMatch[1].trim() : undefined,
        publishedAt: pubDateMatch ? new Date(pubDateMatch[1]) : undefined,
      });
    }
    
    // 尝试Atom格式
    if (items.length === 0) {
      while ((match = entryRegex.exec(xml)) !== null) {
        const entryContent = match[1];
        
        const titleMatch = entryContent.match(/<title[^>]*>(.*?)<\/title>/i);
        const linkMatch = entryContent.match(/<link[^>]*href=["']([^"']+)["']/i);
        const contentMatch = entryContent.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
        const summaryMatch = entryContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
        const authorMatch = entryContent.match(/<author[^>]*>[\s\S]*?<name>(.*?)<\/name>/i);
        const publishedMatch = entryContent.match(/<published[^>]*>(.*?)<\/published>/i);
        
        const content = contentMatch ? contentMatch[1] : (summaryMatch ? summaryMatch[1] : '');
        const cleanContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        
        items.push({
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          link: linkMatch ? linkMatch[1].trim() : url,
          content: cleanContent,
          author: authorMatch ? authorMatch[1].trim() : undefined,
          publishedAt: publishedMatch ? new Date(publishedMatch[1]) : undefined,
        });
      }
    }
    
    return items;
  } catch (error: any) {
    throw new Error(`Failed to parse RSS feed: ${error.message}`);
  }
}

/**
 * 微信公众号文章解析器
 */
async function parseWechatArticle(url: string): Promise<{
  title: string;
  author?: string;
  content: string;
  publishedAt?: Date;
}> {
  // 微信公众号文章使用通用HTML解析
  const result = await parseGenericHTML(url);
  
  // 尝试从HTML中提取更多信息
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });
    
    const html = response.data;
    
    // 提取作者
    const authorMatch = html.match(/var\s+nickname\s*=\s*["']([^"']+)["']/i);
    if (authorMatch) {
      result.author = authorMatch[1].trim();
    }
    
    // 提取发布时间
    const timeMatch = html.match(/var\s+publish_time\s*=\s*["']([^"']+)["']/i);
    if (timeMatch) {
      result.publishedAt = new Date(timeMatch[1]);
    }
  } catch (error) {
    // 忽略额外信息提取失败
  }
  
  return result;
}

/**
 * 知乎内容解析器
 */
async function parseZhihuContent(url: string): Promise<{
  title: string;
  author?: string;
  content: string;
  publishedAt?: Date;
}> {
  // 知乎内容使用通用HTML解析
  return await parseGenericHTML(url);
}

/**
 * AI内容分析 - 生成摘要、关键词和主题分类
 */
async function analyzeContentWithAI(title: string, contentText: string): Promise<{
  summary: string;
  keyPoints: string[];
  tags: string[];
  topic: string;
}> {
  try {
    const prompt = `请分析以下文章内容，提供：
1. 简要摘要（100-200字）
2. 3-5个关键要点
3. 3-5个关键词标签
4. 主题分类（从以下选择：科技、商业、文化、教育、健康、娱乐、其他）

文章标题：${title}

文章内容：
${contentText.substring(0, 3000)}

请以JSON格式返回结果。`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: '你是一个专业的内容分析助手，擅长提取文章的核心信息。' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'content_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '文章摘要' },
              keyPoints: { 
                type: 'array', 
                items: { type: 'string' },
                description: '关键要点列表'
              },
              tags: { 
                type: 'array', 
                items: { type: 'string' },
                description: '关键词标签列表'
              },
              topic: { type: 'string', description: '主题分类' },
            },
            required: ['summary', 'keyPoints', 'tags', 'topic'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    return result;
  } catch (error: any) {
    console.error('AI analysis failed:', error);
    // 返回默认值
    return {
      summary: contentText.substring(0, 200) + '...',
      keyPoints: [],
      tags: [],
      topic: '其他',
    };
  }
}

/**
 * 抓取单个来源的内容
 */
export async function crawlSource(sourceId: number): Promise<{
  success: boolean;
  articlesFound: number;
  articlesAdded: number;
  error?: string;
}> {
  const startedAt = new Date();
  let articlesFound = 0;
  let articlesAdded = 0;
  let errorMessage: string | undefined;
  let status: 'success' | 'failed' | 'partial' = 'success';

  try {
    const source = await getSourceById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    // 获取用户设置
    const settings = await getSettingsByUserId(source.userId);
    const aiEnabled = settings?.aiEnabled ?? true;

    let articles: Array<{
      title: string;
      author?: string;
      content: string;
      link: string;
      publishedAt?: Date;
    }> = [];

    // 根据来源类型选择解析器
    if (source.type === 'rss') {
      articles = await parseRSSFeed(source.url);
    } else if (source.type === 'wechat') {
      const result = await parseWechatArticle(source.url);
      articles = [{
        title: result.title,
        author: result.author,
        content: result.content,
        link: source.url,
        publishedAt: result.publishedAt,
      }];
    } else if (source.type === 'zhihu') {
      const result = await parseZhihuContent(source.url);
      articles = [{
        title: result.title,
        author: result.author,
        content: result.content,
        link: source.url,
        publishedAt: result.publishedAt,
      }];
    } else {
      const result = await parseGenericHTML(source.url);
      articles = [{
        title: result.title,
        author: result.author,
        content: result.content,
        link: source.url,
        publishedAt: result.publishedAt,
      }];
    }

    articlesFound = articles.length;

    // 保存文章
    for (const article of articles) {
      const contentHash = generateContentHash(article.content);
      
      // 检查是否已存在
      const exists = await checkArticleExists(contentHash);
      if (exists) {
        continue;
      }

      // 创建文章记录
      const articleData: InsertArticle = {
        sourceId: source.id,
        userId: source.userId,
        title: article.title,
        author: article.author || null,
        originalUrl: article.link,
        contentText: article.content,
        contentHash,
        publishedAt: article.publishedAt || null,
        status: 'unread',
        isFavorite: false,
      };

      const result = await createArticle(articleData);
      const insertId = Number(result[0].insertId);
      articlesAdded++;

      // 如果启用AI分析
      if (aiEnabled && insertId) {
        try {
          const analysis = await analyzeContentWithAI(article.title, article.content);
          
          const aiData: InsertAiAnalysis = {
            articleId: insertId,
            summary: analysis.summary,
            keyPoints: JSON.stringify(analysis.keyPoints),
            tags: JSON.stringify(analysis.tags),
            topic: analysis.topic,
          };
          
          await createAiAnalysis(aiData);
        } catch (aiError) {
          console.error('AI analysis failed for article:', insertId, aiError);
          // 继续处理，不中断流程
        }
      }
    }

    // 更新来源的最后抓取时间
    await updateSource(sourceId, { lastCrawledAt: new Date() });

    if (articlesAdded === 0 && articlesFound > 0) {
      status = 'partial';
      errorMessage = 'All articles already exist';
    }

  } catch (error: any) {
    status = 'failed';
    errorMessage = error.message;
    console.error('Crawl failed:', error);
  } finally {
    // 记录抓取日志
    const logData: InsertCrawlLog = {
      sourceId,
      status,
      articlesFound,
      articlesAdded,
      errorMessage: errorMessage || null,
      startedAt,
      completedAt: new Date(),
    };
    
    await createCrawlLog(logData);
  }

  return {
    success: status === 'success',
    articlesFound,
    articlesAdded,
    error: errorMessage,
  };
}

/**
 * 批量抓取所有活跃来源
 */
export async function crawlAllActiveSources(): Promise<{
  totalSources: number;
  successCount: number;
  failedCount: number;
  totalArticlesAdded: number;
}> {
  const { getActiveSourcesForCrawl } = await import('./db');
  const sources = await getActiveSourcesForCrawl();
  
  let successCount = 0;
  let failedCount = 0;
  let totalArticlesAdded = 0;

  for (const source of sources) {
    const result = await crawlSource(source.id);
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
    totalArticlesAdded += result.articlesAdded;
  }

  return {
    totalSources: sources.length,
    successCount,
    failedCount,
    totalArticlesAdded,
  };
}
