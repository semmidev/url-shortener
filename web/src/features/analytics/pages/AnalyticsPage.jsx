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

  const chartData =
    data?.clicks_over_time?.map((item) => ({
      date: item.date,
      clicks: Number(item.click_count || 0),
    })) || [];

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
            <div className="text-2xl font-bold">{loading ? '...' : data?.total_clicks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("analytics.topReferrers")}</CardTitle>
            <GlobeIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {loading ? '...' : data?.top_referrers?.[0]?.referrer || t("analytics.directTraffic")}
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
              {loading ? '...' : data?.devices?.[0]?.device_type || 'Desktop Browser'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Click Performance Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" stroke="currentColor" className="text-xs text-muted-foreground" />
                <YAxis stroke="currentColor" className="text-xs text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#clickGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
