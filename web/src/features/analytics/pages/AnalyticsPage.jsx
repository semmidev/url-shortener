import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MousePointerClickIcon, GlobeIcon, LaptopIcon } from 'lucide-react';
import { getDashboardAnalytics } from '@/features/analytics/api';

export default function Analytics() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const stats = await getDashboardAnalytics();
        setData(stats);
      } catch {
        toast.error('Failed to load analytics metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Generate last 7 days baseline dates if clicks_over_time is empty or null
  const defaultLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      clicks: 0,
    };
  });

  const chartData =
    data?.clicks_over_time && data.clicks_over_time.length > 0
      ? data.clicks_over_time.map((item) => ({
          date: typeof item.date === 'string' ? item.date.split('T')[0] : String(item.date),
          clicks: Number(item.click_count || item.clicks || 0),
        }))
      : defaultLast7Days;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("analytics.totalClicks")}</CardTitle>
            <MousePointerClickIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : data?.total_clicks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("analytics.topReferrers")}</CardTitle>
            <GlobeIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {loading ? '…' : data?.top_referrers?.[0]?.referrer || t("analytics.directTraffic")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("analytics.deviceBreakdown")}</CardTitle>
            <LaptopIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold capitalize">
              {loading ? '…' : data?.devices?.[0]?.device_type || 'Desktop Browser'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Click Performance Area Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("analytics.overview")}</CardTitle>
          <span className="text-xs text-muted-foreground font-medium">Last 7 Days</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 w-full flex items-center justify-center text-muted-foreground text-sm">
              Loading analytics chart…
            </div>
          ) : (
            <div className="h-72 w-full pt-4 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card, #ffffff)',
                      borderColor: 'var(--border, #e5e7eb)',
                      color: 'var(--foreground, #000000)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#clickGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
