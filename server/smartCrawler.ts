/**
 * 智能爬虫模块 - 支持页面类型识别和多层级内容抓取
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { invokeLLM } from './_core/llm';

// 页面类型
export type PageType = 'article' | 'list' | 'unknown';

// 页面分析结果
export interface PageAnalysis {
  type: PageType;
  confidence: number; // 0-1
  reason: string;
  childLinks?: string[]; // 如果是列表页，包含子链接
}

// 文章内容
export interface ArticleContent {
  title: string;
  author?: string;
  content: string;
  url: string;
  publishedAt?: Date;
}

// 多篇内容结果
export interface MultiArticleResult {
  sourceUrl: string;
  pageType: PageType;
  articles: ArticleContent[];
  totalFound: number;
  processed: number;
}

/**
 * 智能判断页面类型
 */
export async function analyzePageType(url: string, html: string): Promise<PageAnalysis> {
  const $ = cheerio.load(html);
  
  // 移除脚本和样式
  $('script, style, nav, header, footer').remove();
  
  // 统计特征
  const features = {
    // 链接密度
    linkCount: $('a[href]').length,
    uniqueLinks: new Set($('a[href]').map((_: number, el: AnyNode) => $(el).attr('href')).get()).size,
    
    // 内容特征
    paragraphCount: $('p').length,
    headingCount: $('h1, h2, h3').length,
    listItemCount: $('li').length,
    articleTags: $('article').length,
    
    // 文本密度
    textLength: $('body').text().replace(/\s+/g, ' ').trim().length,
    
    // 列表特征
    hasSearchResults: /search|results?|query/i.test(html),
    hasPagination: /page|next|prev|previous|\d+\s*of\s*\d+/i.test(html),
    hasCardLayout: $('.card, .item, .entry, .post, .article-item').length > 3,
    
    // 文章特征
    hasMainContent: $('main, article, .content, .post-content, #content').length > 0,
    hasAuthor: $('[class*="author"], [class*="byline"]').length > 0,
    hasPublishDate: $('[class*="date"], [class*="time"], time').length > 0,
  };
  
  // 启发式规则判断
  let type: PageType = 'unknown';
  let confidence = 0;
  let reason = '';
  
  // 规则1: 明显的列表页特征
  if (features.hasSearchResults || features.hasPagination || features.hasCardLayout) {
    type = 'list';
    confidence = 0.8;
    reason = '检测到搜索结果、分页或卡片布局';
  }
  // 规则2: 链接密度高，文本密度低
  else if (features.linkCount > 20 && features.textLength / features.linkCount < 50) {
    type = 'list';
    confidence = 0.7;
    reason = '链接密度高，文本密度低';
  }
  // 规则3: 大量列表项
  else if (features.listItemCount > 10 && features.paragraphCount < 5) {
    type = 'list';
    confidence = 0.75;
    reason = '包含大量列表项';
  }
  // 规则4: 明显的文章页特征
  else if (features.articleTags > 0 || (features.hasMainContent && features.paragraphCount > 5)) {
    type = 'article';
    confidence = 0.85;
    reason = '检测到文章标签或主要内容区域';
  }
  // 规则5: 文本密度高
  else if (features.textLength > 1000 && features.paragraphCount > 5) {
    type = 'article';
    confidence = 0.8;
    reason = '文本内容丰富';
  }
  // 规则6: 有作者和发布日期
  else if (features.hasAuthor && features.hasPublishDate && features.paragraphCount > 3) {
    type = 'article';
    confidence = 0.9;
    reason = '包含作者和发布日期信息';
  }
  
  // 如果是列表页，提取子链接
  let childLinks: string[] = [];
  if (type === 'list') {
    childLinks = extractChildLinks(url, $);
  }
  
  return {
    type,
    confidence,
    reason,
    childLinks: childLinks.length > 0 ? childLinks : undefined,
  };
}

/**
 * 从列表页提取有价值的子链接
 */
function extractChildLinks(baseUrl: string, $: cheerio.CheerioAPI): string[] {
  const links: string[] = [];
  const seenUrls = new Set<string>();
  
  // 常见的文章链接选择器
  const selectors = [
    'article a[href]',
    '.post a[href]',
    '.entry a[href]',
    '.item a[href]',
    '.card a[href]',
    '.result a[href]',
    'h2 a[href]',
    'h3 a[href]',
    '.title a[href]',
    '[class*="article"] a[href]',
    '[class*="post"] a[href]',
  ];
  
  // 排除的URL模式
  const excludePatterns = [
    /\/(login|signin|signup|register|auth)/i,
    /\/(search|filter|sort|category|tag)/i,
    /\/(about|contact|privacy|terms|help|faq)/i,
    /\/(comment|reply|share)/i,
    /\.(jpg|jpeg|png|gif|pdf|zip|mp3|mp4)$/i,
    /#/,
    /javascript:/i,
    /mailto:/i,
  ];
  
  // 尝试各种选择器
  for (const selector of selectors) {
    $(selector).each((_: number, el: AnyNode) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      // 转换为绝对URL
      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(href, baseUrl).href;
      } catch {
        return;
      }
      
      // 检查是否应该排除
      if (excludePatterns.some(pattern => pattern.test(absoluteUrl))) {
        return;
      }
      
      // 检查是否与基础URL同域
      try {
        const baseHost = new URL(baseUrl).hostname;
        const linkHost = new URL(absoluteUrl).hostname;
        if (!linkHost.includes(baseHost) && !baseHost.includes(linkHost)) {
          return;
        }
      } catch {
        return;
      }
      
      // 去重
      if (!seenUrls.has(absoluteUrl)) {
        seenUrls.add(absoluteUrl);
        links.push(absoluteUrl);
      }
    });
    
    // 如果已经找到足够的链接，停止
    if (links.length >= 20) break;
  }
  
  // 限制数量并返回（最多5篇）
  return links.slice(0, 5);
}

/**
 * 提取单篇文章内容
 */
export async function extractArticleContent(url: string): Promise<ArticleContent | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    
    // 提取标题
    let title = $('h1').first().text().trim();
    if (!title) {
      title = $('title').text().trim();
    }
    
    // 提取作者
    let author = $('[class*="author"], [class*="byline"], [rel="author"]').first().text().trim();
    
    // 提取发布日期
    let publishedAt: Date | undefined;
    const dateText = $('time, [class*="date"], [class*="published"]').first().attr('datetime') || 
                     $('time, [class*="date"], [class*="published"]').first().text().trim();
    if (dateText) {
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }
    
    // 提取正文内容
    $('script, style, nav, header, footer, aside, .sidebar, .comment, .ad, .advertisement').remove();
    
    let content = '';
    const contentSelectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '#content',
      '.article-body',
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().replace(/\s+/g, ' ').trim();
        if (content.length > 200) break;
      }
    }
    
    // 如果没有找到主要内容区域，使用body
    if (!content || content.length < 200) {
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }
    
    // 验证内容质量
    if (!title || content.length < 100) {
      return null;
    }
    
    return {
      title,
      author: author || undefined,
      content,
      url,
      publishedAt,
    };
  } catch (error) {
    console.error(`Failed to extract article from ${url}:`, error);
    return null;
  }
}

/**
 * 智能爬取URL（支持单篇和多篇）
 */
export async function smartCrawl(url: string): Promise<MultiArticleResult> {
  try {
    // 第一步：获取页面HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });
    
    // 第二步：分析页面类型
    const analysis = await analyzePageType(url, response.data);
    
    console.log(`[SmartCrawler] Page type: ${analysis.type}, confidence: ${analysis.confidence}, reason: ${analysis.reason}`);
    
    const articles: ArticleContent[] = [];
    
    if (analysis.type === 'article') {
      // 直接提取当前页面内容
      const article = await extractArticleContent(url);
      if (article) {
        articles.push(article);
      }
    } else if (analysis.type === 'list' && analysis.childLinks && analysis.childLinks.length > 0) {
      // 提取子页面内容
      console.log(`[SmartCrawler] Found ${analysis.childLinks.length} child links, extracting...`);
      
      for (const childUrl of analysis.childLinks) {
        const article = await extractArticleContent(childUrl);
        if (article) {
          articles.push(article);
          console.log(`[SmartCrawler] Extracted: ${article.title}`);
        }
        
        // 避免过快请求
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      // 未知类型，尝试作为文章处理
      const article = await extractArticleContent(url);
      if (article) {
        articles.push(article);
      }
    }
    
    return {
      sourceUrl: url,
      pageType: analysis.type,
      articles,
      totalFound: analysis.childLinks?.length || 1,
      processed: articles.length,
    };
  } catch (error) {
    console.error(`[SmartCrawler] Failed to crawl ${url}:`, error);
    throw error;
  }
}
