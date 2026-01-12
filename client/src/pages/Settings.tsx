import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const [formData, setFormData] = useState({
    aiEnabled: true,
    aiSummaryEnabled: true,
    aiKeywordsEnabled: true,
    aiTopicEnabled: true,
    defaultCrawlInterval: 3600,
    notificationEnabled: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        aiEnabled: settings.aiEnabled,
        aiSummaryEnabled: settings.aiSummaryEnabled,
        aiKeywordsEnabled: settings.aiKeywordsEnabled,
        aiTopicEnabled: settings.aiTopicEnabled,
        defaultCrawlInterval: settings.defaultCrawlInterval,
        notificationEnabled: settings.notificationEnabled,
      });
    }
  }, [settings]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success('设置已保存');
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">系统设置</h1>
            <p className="text-muted-foreground mt-1">配置你的个性化选项</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle>AI 功能设置</CardTitle>
              <CardDescription>
                控制 AI 自动分析功能的开关
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="aiEnabled">启用 AI 功能</Label>
                  <p className="text-sm text-muted-foreground">
                    总开关，关闭后所有 AI 功能将停用
                  </p>
                </div>
                <Switch
                  id="aiEnabled"
                  checked={formData.aiEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="aiSummaryEnabled">自动生成摘要</Label>
                  <p className="text-sm text-muted-foreground">
                    为每篇文章生成简要摘要
                  </p>
                </div>
                <Switch
                  id="aiSummaryEnabled"
                  checked={formData.aiSummaryEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiSummaryEnabled: checked })}
                  disabled={!formData.aiEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="aiKeywordsEnabled">自动提取关键词</Label>
                  <p className="text-sm text-muted-foreground">
                    提取文章的关键词标签
                  </p>
                </div>
                <Switch
                  id="aiKeywordsEnabled"
                  checked={formData.aiKeywordsEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiKeywordsEnabled: checked })}
                  disabled={!formData.aiEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="aiTopicEnabled">自动主题分类</Label>
                  <p className="text-sm text-muted-foreground">
                    将文章自动归类到主题
                  </p>
                </div>
                <Switch
                  id="aiTopicEnabled"
                  checked={formData.aiTopicEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, aiTopicEnabled: checked })}
                  disabled={!formData.aiEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Crawl Settings */}
          <Card>
            <CardHeader>
              <CardTitle>抓取设置</CardTitle>
              <CardDescription>
                配置内容抓取的默认行为
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crawlInterval">默认抓取间隔（秒）</Label>
                <Input
                  id="crawlInterval"
                  type="number"
                  value={formData.defaultCrawlInterval}
                  onChange={(e) => setFormData({ ...formData, defaultCrawlInterval: parseInt(e.target.value) })}
                  min={300}
                />
                <p className="text-xs text-muted-foreground">
                  新添加的信息源将使用此默认值，最小 300 秒（5 分钟）
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>
                控制系统通知的发送
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notificationEnabled">启用通知</Label>
                  <p className="text-sm text-muted-foreground">
                    当抓取成功或失败时发送通知
                  </p>
                </div>
                <Switch
                  id="notificationEnabled"
                  checked={formData.notificationEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, notificationEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
