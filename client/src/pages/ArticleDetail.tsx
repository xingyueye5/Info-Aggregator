import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, ExternalLink, Heart, Loader2, Sparkles } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

export default function ArticleDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const articleId = parseInt(params.id || '0');

  const utils = trpc.useUtils();
  const { data: article, isLoading } = trpc.articles.get.useQuery({ id: articleId });

  const updateStatusMutation = trpc.articles.updateStatus.useMutation({
    onSuccess: () => {
      utils.articles.get.invalidate({ id: articleId });
      utils.articles.list.invalidate();
      utils.articles.stats.invalidate();
    },
  });

  const toggleFavoriteMutation = trpc.articles.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.articles.get.invalidate({ id: articleId });
      utils.articles.list.invalidate();
      toast.success(article?.isFavorite ? '已取消收藏' : '已添加到收藏');
    },
  });

  const exportMutation = trpc.articles.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${article?.title || 'article'}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    },
  });

  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt'>('markdown');

  const handleMarkAsRead = () => {
    updateStatusMutation.mutate({ id: articleId, status: 'read' });
  };

  const handleToggleFavorite = () => {
    toggleFavoriteMutation.mutate({ id: articleId });
  };

  const handleExport = (format: 'markdown' | 'txt') => {
    setExportFormat(format);
    exportMutation.mutate({ id: articleId, format });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">文章不存在</h2>
          <Button onClick={() => setLocation('/articles')}>返回列表</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation('/articles')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
        </div>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title and Meta */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {article.author && <span>{article.author}</span>}
              <span>·</span>
              <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : '未知日期'}</span>
              <span>·</span>
              <a 
                href={article.originalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary"
              >
                查看原文
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {article.status === 'unread' && (
              <Button onClick={handleMarkAsRead} disabled={updateStatusMutation.isPending}>
                标记为已读
              </Button>
            )}
            <Button
              variant={article.isFavorite ? 'default' : 'outline'}
              onClick={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
            >
              <Heart className={`w-4 h-4 mr-2 ${article.isFavorite ? 'fill-current' : ''}`} />
              {article.isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Button variant="outline" onClick={() => handleExport('markdown')}>
              <Download className="w-4 h-4 mr-2" />
              导出 Markdown
            </Button>
            <Button variant="outline" onClick={() => handleExport('txt')}>
              <Download className="w-4 h-4 mr-2" />
              导出 TXT
            </Button>
          </div>

          {/* AI Analysis */}
          {article.aiAnalysis && (
            <Card className="border-accent/20 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-accent" />
                  AI 分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {article.aiAnalysis.summary && (
                  <div>
                    <h3 className="font-medium mb-2">摘要</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {article.aiAnalysis.summary}
                    </p>
                  </div>
                )}
                {article.aiAnalysis.keyPoints && article.aiAnalysis.keyPoints.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">关键要点</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {article.aiAnalysis.keyPoints.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {article.aiAnalysis.tags && article.aiAnalysis.tags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">关键词</h3>
                    <div className="flex flex-wrap gap-2">
                      {article.aiAnalysis.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {article.aiAnalysis.topic && (
                  <div>
                    <h3 className="font-medium mb-2">主题分类</h3>
                    <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-sm">
                      {article.aiAnalysis.topic}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Article Body */}
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-wrap leading-loose text-foreground">
              {article.contentText}
            </div>
          </div>

          {/* User Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6">
              <h3 className="font-medium mb-3">标签</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 rounded-full border text-sm"
                    style={{ borderColor: tag.color || undefined }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
