import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, Heart, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Articles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: articles, isLoading } = trpc.articles.list.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    searchQuery: searchQuery || undefined,
    limit,
    offset: page * limit,
  });

  const { data: sources } = trpc.sources.list.useQuery();

  const getSourceName = (sourceId: number) => {
    const source = sources?.find(s => s.id === sourceId);
    return source?.name || '未知来源';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">文章列表</h1>
            <p className="text-muted-foreground mt-1">浏览和管理你的内容</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="unread">未读</SelectItem>
              <SelectItem value="read">已读</SelectItem>
              <SelectItem value="archived">已归档</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Articles List */}
        {articles && articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-medium line-clamp-2">
                            {article.title}
                          </h3>
                          {article.isFavorite && (
                            <Heart className="w-5 h-5 text-accent fill-accent flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.contentText.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{getSourceName(article.sourceId)}</span>
                          {article.author && <span>· {article.author}</span>}
                          <span>· {new Date(article.crawledAt).toLocaleDateString('zh-CN')}</span>
                          {article.status === 'unread' && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              未读
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page + 1} 页
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={!articles || articles.length < limit}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">没有找到文章</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery ? '尝试其他搜索关键词' : '添加信息源并抓取内容'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
