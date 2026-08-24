import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import {
  Users, Link, MousePointerClick, ShieldAlert,
  Activity, CheckCircle2, RefreshCw, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getAdminStats, getAuditLogs } from '../api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [statsData, auditData] = await Promise.all([
        getAdminStats(),
        getAuditLogs({ limit: 10 })
      ]);
      setStats(statsData);
      setRecentAudits(auditData?.logs || []);
    } catch (err) {
      toast.error('Failed to load system metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <DynamicPageHeader
        title="Executive Admin Dashboard"
        subtitle="Real-time system health, high-level metrics, and global oversight summary."
        fallbackIcon={ShieldAlert}
        titleClassName="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3"
        iconSize="w-8 h-8"
      >
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-card border border-border hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </DynamicPageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Total Users</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground">
              {stats?.total_users?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Active registered accounts
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Total Global Links</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Link className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground">
              {stats?.total_urls?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {stats?.total_active_urls?.toLocaleString() || 0} active links online
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Cumulative Clicks</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground">
              {stats?.total_clicks?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Total system traffic clicks
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">System Status</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              100% Operational
            </div>
            <p className="text-xs text-muted-foreground mt-1">Go Engine & Database Healthy</p>
          </div>
        </motion.div>
      </div>

      {/* Security Audit Feed Section */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Security Audit Trail Logs
          </h2>
          <span className="text-xs text-muted-foreground">Showing latest security events</span>
        </div>

        <div className="space-y-3">
          {recentAudits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent audit activity recorded.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentAudits.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-background border border-border/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary px-2 py-0.5 rounded bg-primary/10">{log.action}</span>
                    <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground truncate pt-1">
                    Actor: <span className="font-medium text-foreground">{log.actor_email}</span> | Resource: <span className="font-mono text-foreground">{log.resource}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
