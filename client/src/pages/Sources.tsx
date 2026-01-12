import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Sources() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'website' as 'wechat' | 'zhihu' | 'website' | 'rss',
    url: '',
    description: '',
    crawlInterval: 3600,
  });

  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.sources.list.useQuery();
  
  const createMutation = trpc.sources.create.useMutation({
    onSuccess: () => {
      toast.success('信息源添加成功');
      setIsCreateOpen(false);
      setFormData({ name: '', type: 'website', url: '', description: '', crawlInterval: 3600 });
      utils.sources.list.invalidate();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const deleteMutation = trpc.sources.delete.useMutation({
    onSuccess: () => {
      toast.success('信息源已删除');
      utils.sources.list.invalidate();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const crawlMutation = trpc.sources.crawl.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`抓取成功，新增 ${data.articlesAdded} 篇文章`);
      } else {
        toast.error(`抓取失败: ${data.error}`);
      }
      utils.sources.list.invalidate();
      utils.articles.list.invalidate();
    },
    onError: (error) => {
      toast.error(`抓取失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('确定要删除这个信息源吗？')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCrawl = (id: number) => {
    crawlMutation.mutate({ id });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wechat: '微信公众号',
      zhihu: '知乎',
      website: '网页',
      rss: 'RSS',
    };
    return labels[type] || type;
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
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">信息源管理</h1>
              <p className="text-muted-foreground mt-1">管理你的内容来源</p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加信息源
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>添加信息源</DialogTitle>
                  <DialogDescription>
                    添加一个新的内容来源，系统将自动抓取最新内容
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">名称</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：阮一峰的网络日志"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">类型</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">网页</SelectItem>
                        <SelectItem value="rss">RSS</SelectItem>
                        <SelectItem value="wechat">微信公众号</SelectItem>
                        <SelectItem value="zhihu">知乎</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">链接</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">描述（可选）</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="简单描述这个信息源"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">抓取间隔（秒）</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={formData.crawlInterval}
                      onChange={(e) => setFormData({ ...formData, crawlInterval: parseInt(e.target.value) })}
                      min={300}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      最小 300 秒（5 分钟）
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    添加
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sources List */}
        {sources && sources.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="line-clamp-1">{source.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {getTypeLabel(source.type)} · 
                        {source.lastCrawledAt 
                          ? ` 最后抓取: ${new Date(source.lastCrawledAt).toLocaleString('zh-CN')}`
                          : ' 尚未抓取'
                        }
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCrawl(source.id)}
                        disabled={crawlMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 ${crawlMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(source.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">链接:</span>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary truncate"
                      >
                        {source.url}
                      </a>
                    </div>
                    {source.description && (
                      <p className="text-muted-foreground line-clamp-2">
                        {source.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span>抓取间隔: {Math.floor((source.crawlInterval || 3600) / 60)} 分钟</span>
                      <span className={source.isActive ? 'text-green-600' : 'text-gray-400'}>
                        {source.isActive ? '已启用' : '已禁用'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Settings className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">还没有信息源</h3>
              <p className="text-muted-foreground text-center mb-6">
                添加你的第一个信息源，开始聚合内容
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                添加信息源
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
