/**
 * 外部AI API集成模块 - 支持Gemini等外部LLM
 */

import axios from 'axios';

export interface ExternalAIConfig {
  apiUrl: string;
  apiKey: string;
  model?: string;
}

export interface ExternalAISummaryResult {
  summary: string;
  translatedSummary?: string; // 如果需要翻译
}

/**
 * 使用外部Gemini API生成高级总结
 */
export async function generateExternalSummary(
  content: string,
  config: ExternalAIConfig,
  translateToChinese: boolean = true
): Promise<ExternalAISummaryResult> {
  try {
    const model = config.model || 'gemini-2.0-flash-exp';
    
    // 构建提示词
    const systemPrompt = translateToChinese 
      ? '你是一个专业的内容总结助手。请用中文生成简洁、准确的摘要。'
      : 'You are a professional content summarization assistant. Generate concise and accurate summaries.';
    
    const userPrompt = translateToChinese
      ? `请为以下内容生成一个简洁的中文摘要（100-200字）：\n\n${content.substring(0, 5000)}`
      : `Please generate a concise summary (100-200 words) for the following content:\n\n${content.substring(0, 5000)}`;
    
    // 调用外部API
    const response = await axios.post(
      `${config.apiUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        timeout: 30000,
      }
    );
    
    const summary = response.data.choices?.[0]?.message?.content || '';
    
    if (!summary) {
      throw new Error('Empty response from external AI');
    }
    
    return {
      summary,
      translatedSummary: translateToChinese ? summary : undefined,
    };
  } catch (error: any) {
    console.error('[ExternalAI] Failed to generate summary:', error.message);
    throw new Error(`External AI summary failed: ${error.message}`);
  }
}

/**
 * 批量生成多篇文章的外部AI总结
 */
export async function generateBatchSummaries(
  articles: Array<{ id: number; title: string; content: string }>,
  config: ExternalAIConfig,
  translateToChinese: boolean = true
): Promise<Array<{ articleId: number; summary: string; error?: string }>> {
  const results: Array<{ articleId: number; summary: string; error?: string }> = [];
  
  for (const article of articles) {
    try {
      const result = await generateExternalSummary(article.content, config, translateToChinese);
      results.push({
        articleId: article.id,
        summary: result.summary,
      });
      
      // 避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      results.push({
        articleId: article.id,
        summary: '',
        error: error.message,
      });
    }
  }
  
  return results;
}
