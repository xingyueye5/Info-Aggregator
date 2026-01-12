import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function Favorites() {
  const { data: articles, isLoading } = trpc.articles.list.useQuery({
    isFavorite: true,
    limit: 100,
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
        <div>
          <h1 className="text-3xl font-bold">我的收藏</h1>
          <p className="text-muted-foreground mt-1">你收藏的精彩文章</p>
        </div>

        {articles && articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Heart className="w-5 h-5 text-accent fill-accent flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="text-lg font-medium line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.contentText.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{getSourceName(article.sourceId)}</span>
                          {article.author && <span>· {article.author}</span>}
                          <span>· {new Date(article.crawledAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">还没有收藏</h3>
              <p className="text-muted-foreground text-center">
                在文章详情页点击收藏按钮添加到这里
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
