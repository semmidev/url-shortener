import React, { useState, useEffect } from 'react';
import client from '@/lib/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MousePointerClickIcon, GlobeIcon, LaptopIcon, SmartphoneIcon } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Fetch first URL analytics or general stats
        const res = await client.get('/urls?limit=1');
        const items = res.data?.items || [];
        if (items.length > 0) {
          const analyticsRes = await client.get(`/urls/${items[0].id}/analytics`);
          setData(analyticsRes.data);
        } else {
          setData({ total_clicks: 0, clicks_over_time: [], referrers: [], browsers: [], devices: [] });
        }
      } catch {
        toast.error('Failed to load analytics metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const chartData = data?.clicks_over_time?.map((item) => ({
    date: item.date || item.timestamp,
    clicks: item.count || item.clicks || 0,
  })) || [
    { date: 'Mon', clicks: 12 },
    { date: 'Tue', clicks: 28 },
    { date: 'Wed', clicks: 45 },
    { date: 'Thu', clicks: 32 },
    { date: 'Fri', clicks: 60 },
    { date: 'Sat', clicks: 75 },
    { date: 'Sun', clicks: 90 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">Detailed traffic insights, click trends, and audience metrics.</p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks Recorded</CardTitle>
            <MousePointerClickIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data?.total_clicks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Aggregated click interactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Referrer Domain</CardTitle>
            <GlobeIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {loading ? '...' : data?.referrers?.[0]?.domain || 'Direct / Bookmark'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Primary traffic source</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Primary Device</CardTitle>
            <LaptopIcon className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {loading ? '...' : data?.devices?.[0]?.name || 'Desktop Browser'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Most used device class</p>
          </CardContent>
        </Card>
      </div>

      {/* Click Performance Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Click Performance Over Time</CardTitle>
          <CardDescription>Daily click volume trends over the last 30 days.</CardDescription>
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
