import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboardIcon,
  Link2Icon,
  MousePointerClickIcon,
  ActivityIcon,
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
} from 'lucide-react';
import QRCodeModal from '@/features/urls/components/QRCodeModal';
import { getOverviewMetrics, quickCreateShortUrl } from '@/features/dashboard/api';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Overview() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ totalUrls: 0, totalClicks: 0, activeUrls: 0 });
  const [recentUrls, setRecentUrls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sorting state for recent URLs table
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

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
      const res = await getOverviewMetrics();
      const items = res?.items || [];
      const total = res?.meta?.total || items.length;

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

  const handleCopy = (urlStr) => {
    navigator.clipboard.writeText(urlStr);
    setCopied(true);
    toast.success('Short URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickShorten = async (e) => {
    e.preventDefault();
    if (!originalUrl) return;
    setShortening(true);

    try {
      const data = await quickCreateShortUrl({ originalUrl, customCode });
      setCreatedUrl(data);
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label, field) => {
    const isCurrent = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        aria-label={`Sort by ${label}`}
        aria-sort={isCurrent ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-semibold text-xs uppercase tracking-wider select-none group"
      >
        <span>{label}</span>
        {isCurrent ? (
          sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-3.5 text-primary shrink-0 transition-transform" aria-hidden="true" />
          ) : (
            <ArrowDownIcon className="size-3.5 text-primary shrink-0 transition-transform" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" aria-hidden="true" />
        )}
      </button>
    );
  };

  const sortedRecentUrls = [...recentUrls].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'created_at') {
      valA = new Date(a.created_at || 0).getTime();
      valB = new Date(b.created_at || 0).getTime();
    } else if (sortBy === 'click_count') {
      valA = a.click_count || 0;
      valB = b.click_count || 0;
    } else if (sortBy === 'title') {
      valA = (a.title || a.short_code || '').toLowerCase();
      valB = (b.title || b.short_code || '').toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        fallbackIcon={LayoutDashboardIcon}
      />

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.statsTotalUrls")}</CardTitle>
            <Link2Icon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.totalUrls}</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.statsTotalClicks")}</CardTitle>
            <MousePointerClickIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.totalClicks}</div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.statsActiveUrls")}</CardTitle>
            <ActivityIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : stats.activeUrls}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Shorten Widget */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-5 text-primary" />
            {t("dashboard.quickShorten")}
          </CardTitle>
          <CardDescription>{t("dashboard.quickShortenDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickShorten} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="url"
                aria-label={t("dashboard.originalUrl")}
                placeholder={t("dashboard.originalUrlPlaceholder")}
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                required
                className="flex-1 bg-background"
              />
              <Input
                type="text"
                aria-label="Custom alias"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("dashboard.customCodePlaceholder")}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="sm:w-56 bg-background"
              />
              <Button type="submit" disabled={shortening} className="cursor-pointer">
                {shortening ? t("dashboard.shorteningBtn") : t("dashboard.shortenBtn")}
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
                  {copied ? t("common.copied") : t("common.copy")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQrModal({ isOpen: true, url: createdUrl.short_url, code: createdUrl.short_code })}
                >
                  <QrCodeIcon className="size-4 mr-1" />
                  {t("common.qrCode")}
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
            <CardTitle>{t("dashboard.recentUrlsTitle")}</CardTitle>
          </div>
          <Button asChild size="sm" className="cursor-pointer font-semibold gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-colors duration-200 shadow-2xs group">
            <Link to="/dashboard/urls" className="inline-flex items-center">
              <span>{t("common.view")} {t("nav.shortUrls")}</span>
              <ArrowRightIcon className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : recentUrls.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noRecentUrls")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12 font-semibold">#</th>
                    <th className="py-3 px-3">{renderSortHeader(t("urls.title"), 'title')}</th>
                    <th className="py-3 px-3 font-semibold">{t("dashboard.originalUrl")}</th>
                    <th className="py-3 px-3">{renderSortHeader(t("dashboard.created"), 'created_at')}</th>
                    <th className="py-3 px-3">{renderSortHeader(t("dashboard.clicks"), 'click_count')}</th>
                    <th className="py-3 px-3 font-semibold">{t("admin.statusHeader")}</th>
                    <th className="py-3 px-3 text-right font-semibold">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedRecentUrls.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground font-semibold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          to={`/dashboard/urls/${item.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          {item.title || item.short_code}
                        </Link>
                        <div>
                          <a
                            href={item.short_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {item.short_url}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-muted-foreground text-xs">
                        {item.original_url}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="font-bold font-mono">
                          {item.click_count || 0}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          className={`text-[11px] font-semibold border ${
                            item.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                          }`}
                        >
                          {item.is_active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleCopy(item.short_url)} title="Copy Short URL" aria-label="Copy short URL" className="cursor-pointer">
                            <CopyIcon className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setQrModal({ isOpen: true, url: item.short_url, code: item.short_code })} title="View QR Code" aria-label="View QR code" className="cursor-pointer">
                            <QrCodeIcon className="size-4" />
                          </Button>
                        </div>
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
