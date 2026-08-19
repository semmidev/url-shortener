import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '@/lib/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Link2Icon,
  MousePointerClickIcon,
  ActivityIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from 'lucide-react';
import QRCodeModal from '@/features/urls/components/QRCodeModal';

export default function Overview() {
  const [stats, setStats] = useState({ totalUrls: 0, totalClicks: 0, activeUrls: 0 });
  const [recentUrls, setRecentUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick shorten widget
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [shortening, setShortening] = useState(false);
  const [createdUrl, setCreatedUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // QR Modal
  const [qrModal, setQrModal] = useState({ isOpen: false, url: '', code: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/urls?page=1&limit=5&sort_by=created_at&sort_direction=desc');
      const items = res.data?.items || [];
      const total = res.data?.meta?.total || items.length;

      let clicks = 0;
      let active = 0;
      items.forEach((u) => {
        clicks += u.click_count || 0;
        if (u.is_active) active++;
      });

      setRecentUrls(items);
      setStats({
        totalUrls: total,
        totalClicks: clicks,
        activeUrls: active,
      });
    } catch {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickShorten = async (e) => {
    e.preventDefault();
    if (!originalUrl) return;
    setShortening(true);

    try {
      const body = { original_url: originalUrl };
      if (customCode.trim()) body.custom_code = customCode.trim();

      const res = await client.post('/urls', body);
      setCreatedUrl(res.data);
      toast.success('Short URL created successfully!');
      setOriginalUrl('');
      setCustomCode('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create short URL');
    } finally {
      setShortening(false);
    }
  };

  const handleCopy = (urlStr) => {
    navigator.clipboard.writeText(urlStr);
    setCopied(true);
    toast.success('Short URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Create short links, track click analytics, and monitor performance.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Short URLs</CardTitle>
            <Link2Icon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalUrls}</div>
            <p className="text-xs text-muted-foreground mt-1">Links created across your account</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
            <MousePointerClickIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalClicks}</div>
            <p className="text-xs text-muted-foreground mt-1">Total click redirections recorded</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Links</CardTitle>
            <ActivityIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeUrls}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active & redirecting</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Shorten Widget */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-5 text-primary" />
            Quick Shorten Link
          </CardTitle>
          <CardDescription>Paste your destination URL below to generate a short link instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickShorten} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                placeholder="https://example.com/very-long-destination-url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
                className="flex-1 bg-background"
              />
              <Input
                type="text"
                placeholder="Custom code (optional)"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="sm:w-56 bg-background"
              />
              <Button type="submit" disabled={shortening} className="cursor-pointer">
                {shortening ? 'Shortening...' : 'Shorten URL'}
              </Button>
            </div>
          </form>

          {/* Created URL Result Banner */}
          {createdUrl && (
            <div className="mt-4 p-4 rounded-lg bg-background border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="secondary" className="bg-primary/10 text-primary font-mono shrink-0">
                  {createdUrl.short_code}
                </Badge>
                <a
                  href={createdUrl.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline text-sm truncate"
                >
                  {createdUrl.short_url}
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleCopy(createdUrl.short_url)}>
                  {copied ? <CheckIcon className="size-4 text-emerald-500 mr-1" /> : <CopyIcon className="size-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQrModal({ isOpen: true, url: createdUrl.short_url, code: createdUrl.short_code })}
                >
                  <QrCodeIcon className="size-4 mr-1" />
                  QR Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent URLs Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Short URLs</CardTitle>
            <CardDescription>Your latest created short codes and performance.</CardDescription>
          </div>
          <Button asChild size="sm" className="cursor-pointer font-semibold gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all duration-200 shadow-2xs group">
            <Link to="/dashboard/urls" className="inline-flex items-center">
              <span>View All Links</span>
              <ArrowRightIcon className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading recent links...</div>
          ) : recentUrls.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No short URLs created yet. Use the widget above to create your first link!</div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentUrls.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.title || item.short_code}</span>
                      <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {item.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <a href={item.short_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">
                        {item.short_url}
                      </a>
                      <span>•</span>
                      <span className="truncate max-w-xs">{item.original_url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold">{item.click_count || 0}</div>
                      <div className="text-[10px] text-muted-foreground">clicks</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleCopy(item.short_url)}>
                      <CopyIcon className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setQrModal({ isOpen: true, url: item.short_url, code: item.short_code })}>
                      <QrCodeIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {qrModal.isOpen && (
        <QRCodeModal
          isOpen={qrModal.isOpen}
          onClose={() => setQrModal({ isOpen: false, url: '', code: '' })}
          shortURL={qrModal.url}
          shortCode={qrModal.code}
        />
      )}
    </div>
  );
}
