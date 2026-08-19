import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '@/lib/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  ExternalLinkIcon,
  MousePointerClickIcon,
  UsersIcon,
  GlobeIcon,
  SmartphoneIcon,
  CalendarIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import QRCodeModal from '@/features/urls/components/QRCodeModal';

export default function URLDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [urlData, setUrlData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [urlRes, analyticsRes] = await Promise.all([
          client.get(`/urls/${id}`),
          client.get(`/urls/${id}/analytics`).catch(() => null),
        ]);

        const item = urlRes.data?.data || urlRes.data;
        setUrlData(item);

        if (analyticsRes) {
          const stats = analyticsRes.data?.data || analyticsRes.data;
          setAnalytics(stats);
        }
      } catch {
        toast.error('Failed to load link details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id]);

  const handleCopy = () => {
    if (!urlData?.short_url) return;
    navigator.clipboard.writeText(urlData.short_url);
    setCopied(true);
    toast.success('Short URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading link details & click event logs...
      </div>
    );
  }

  if (!urlData) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/urls')}>
          <ArrowLeftIcon className="mr-1.5 size-4" /> Back to Links
        </Button>
        <p className="text-muted-foreground">Link not found or has been removed.</p>
      </div>
    );
  }

  const isHttps = urlData.original_url?.startsWith('https://');

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/urls')} className="cursor-pointer">
          <ArrowLeftIcon className="size-4 shrink-0" />
          <span>Back to Links</span>
        </Button>
      </div>

      {/* Main Link Overview Header Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{urlData.title || urlData.short_code}</CardTitle>
              <Badge
                className={`text-[11px] font-semibold border ${
                  urlData.is_active
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                }`}
              >
                {urlData.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <CardDescription className="font-mono text-primary font-medium text-sm">
              {urlData.short_url}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} className="cursor-pointer">
              {copied ? <CheckIcon className="size-4 text-emerald-500 shrink-0" /> : <CopyIcon className="size-4 shrink-0" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsQrOpen(true)} className="cursor-pointer">
              <QrCodeIcon className="size-4 shrink-0" />
              <span>QR Code</span>
            </Button>
            <Button size="sm" asChild className="cursor-pointer">
              <a href={urlData.original_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
                <span>Visit Destination</span>
                <ExternalLinkIcon className="size-4 shrink-0" />
              </a>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Original Destination</div>
            <div className="text-sm font-medium break-all mt-1">{urlData.original_url}</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground">Short Code</div>
            <div className="text-sm font-bold font-mono text-primary mt-1">/{urlData.short_code}</div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="size-3" /> Created Date
            </div>
            <div className="text-sm font-medium mt-1">
              {urlData.created_at ? new Date(urlData.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {isHttps ? <ShieldCheckIcon className="size-3 text-emerald-500" /> : <AlertTriangleIcon className="size-3 text-amber-500" />} Security Protocol
            </div>
            <div className="text-sm font-semibold mt-1">
              {isHttps ? 'HTTPS Encrypted' : 'HTTP Standard'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks Recorded</CardTitle>
            <MousePointerClickIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.total_clicks ?? urlData.click_count ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total redirections logged for this link</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Visitors</CardTitle>
            <UsersIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics?.unique_visitors ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Distinct IP addresses recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Click Event Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Click Events Log</CardTitle>
          <CardDescription>Detailed click telemetry and visitor information for this link.</CardDescription>
        </CardHeader>
        <CardContent>
          {!analytics?.recent_clicks || analytics.recent_clicks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No click events recorded yet. Share your short link to start collecting analytics!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">Clicked At</th>
                    <th className="py-3 px-2">IP Address</th>
                    <th className="py-3 px-2">Device / Browser</th>
                    <th className="py-3 px-2">Referrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {analytics.recent_clicks.map((click) => (
                    <tr key={click.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-medium">
                        {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                        {click.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-3 px-2 max-w-xs truncate text-xs text-muted-foreground">
                        {click.device_type ? `${click.device_type} • ` : ''}{click.user_agent || 'Direct'}
                      </td>
                      <td className="py-3 px-2 text-xs">
                        <Badge variant="outline">{click.referrer || 'Direct / None'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {isQrOpen && (
        <QRCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          shortURL={urlData.short_url}
          shortCode={urlData.short_code}
        />
      )}
    </div>
  );
}
