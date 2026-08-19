import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart as PieChartIcon, Globe, Smartphone, MousePointerClick, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import client from '../lib/client';
import { formatNumber } from '../lib/utils';
import { toast } from 'sonner';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardAnalytics = async () => {
    setLoading(true);
    try {
      const res = await client.get('/analytics/dashboard');
      setData(res.data);
    } catch {
      toast.error('Failed to load aggregate analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardAnalytics();
  }, []);

  const deviceChartData = (data?.devices || []).map((d) => ({
    name: d.device_type || 'Unknown',
    value: Number(d.click_count) || 0,
  }));

  const referrerChartData = (data?.top_referrers || []).map((r) => ({
    name: r.referrer || 'Direct / Internal',
    clicks: Number(r.click_count) || 0,
  }));

  const countryChartData = (data?.countries || []).map((c) => ({
    name: c.country || 'Unknown',
    clicks: Number(c.click_count) || 0,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Analytics Overview</h1>
          <p className="text-sm text-slate-400">Aggregate audience insights across all your active short URLs.</p>
        </div>
        <button
          onClick={fetchDashboardAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Managed Short Links</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(data?.total_urls || 0)}</h3>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Combined Clicks</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{formatNumber(data?.total_clicks || 0)}</h3>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Globe className="w-5 h-5 text-indigo-400" />
            Top Traffic Referrers
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">Loading referrers...</div>
          ) : referrerChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No referrer data recorded yet.</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referrerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="clicks" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Device Breakdown Pie Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Smartphone className="w-5 h-5 text-purple-400" />
            Device / Browser Types
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">Loading devices...</div>
          ) : deviceChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">No device data recorded yet.</div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Country Breakdown Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          Country / Geographic Distribution
        </h3>
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs">Loading countries...</div>
        ) : countryChartData.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">No geographic data recorded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {countryChartData.map((c, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-200">{c.name}</span>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {formatNumber(c.clicks)} clicks
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
