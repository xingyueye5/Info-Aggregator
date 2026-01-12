import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, Clock, Heart, Loader2, Plus, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.articles.stats.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: todayArticles, isLoading: todayLoading } = trpc.articles.today.useQuery(undefined, {
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="container py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Geometric accent */}
            <div className="relative inline-block">
              <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight relative">
                个人信息聚合平台
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              将微信公众号、知乎、网页等内容集中管理，通过 AI 智能分析，
              打造属于你的个性化阅读中心
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>开始使用</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">了解更多</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="container py-24 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">核心功能</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>多源聚合</CardTitle>
                  <CardDescription className="leading-relaxed">
                    支持微信公众号、知乎、RSS 和任意网页，一站式管理所有信息来源
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle>AI 智能分析</CardTitle>
                  <CardDescription className="leading-relaxed">
                    自动生成摘要、提取关键词、主题分类，快速把握文章核心内容
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>高效阅读</CardTitle>
                  <CardDescription className="leading-relaxed">
                    收藏、标签、搜索、导出，打造个性化的阅读管理体验
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in view - Dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">欢迎回来</h1>
            <p className="text-muted-foreground mt-1">开始今天的阅读之旅</p>
          </div>
          <Button asChild>
            <Link href="/sources">
              <Plus className="w-4 h-4 mr-2" />
              添加信息源
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总文章数</CardDescription>
              <CardTitle className="text-3xl">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.total || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>未读文章</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.unread || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>已读文章</CardDescription>
              <CardTitle className="text-3xl">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.read || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>收藏文章</CardDescription>
              <CardTitle className="text-3xl text-accent">
                {statsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats?.favorite || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Today's Reading */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  今日阅读
                </CardTitle>
                <CardDescription className="mt-1">
                  今天抓取的最新内容
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/articles">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : todayArticles && todayArticles.length > 0 ? (
              <div className="space-y-4">
                {todayArticles.slice(0, 5).map((article) => (
                  <Link key={article.id} href={`/articles/${article.id}`}>
                    <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-2 mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {article.author} · {new Date(article.crawledAt).toLocaleString('zh-CN', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {article.isFavorite && (
                        <Heart className="w-4 h-4 text-accent fill-accent flex-shrink-0" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>今天还没有新内容</p>
                <p className="text-sm mt-2">添加信息源或手动抓取内容</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/sources">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">信息源管理</CardTitle>
                <CardDescription>
                  添加和管理你的内容来源
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/favorites">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">我的收藏</CardTitle>
                <CardDescription>
                  查看你收藏的精彩文章
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">系统设置</CardTitle>
                <CardDescription>
                  配置 AI 功能和抓取策略
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
