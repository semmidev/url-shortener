import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Search, RefreshCcw, Eye, Clock, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getAuditLogs } from '../api';
import { useI18n } from '@/context/I18nContext';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const { t } = useI18n();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs({ page, limit: 10, search });
      setLogs(data?.logs || []);
      setMeta(data?.meta || {});
    } catch (err) {
      toast.error('Failed to fetch security audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title={t('adminPages.auditLogs.title')}
        subtitle={t('adminPages.auditLogs.subtitle')}
        fallbackIcon={FileText}
      />

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('adminPages.auditLogs.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Resource</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">Loading audit log entries…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">No audit entries found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-accent/40 transition-colors text-xs">
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {log.actor_email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">
                      {log.resource} {log.resource_id && <span className="font-mono text-muted-foreground">({log.resource_id})</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-foreground text-base">Audit Entry Payload</h3>
                <button onClick={() => setSelectedLog(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
              </div>

              <div className="space-y-2 text-xs">
                <div><span className="font-semibold text-muted-foreground">Action:</span> <span className="font-mono font-bold text-primary">{selectedLog.action}</span></div>
                <div><span className="font-semibold text-muted-foreground">Actor:</span> {selectedLog.actor_email}</div>
                <div><span className="font-semibold text-muted-foreground">Resource:</span> {selectedLog.resource} ({selectedLog.resource_id})</div>
                <div><span className="font-semibold text-muted-foreground">User Agent:</span> {selectedLog.user_agent || 'N/A'}</div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Snapshot Payload (JSON Diff):</label>
                <pre className="p-4 rounded-xl bg-background border border-border/80 font-mono text-xs overflow-x-auto max-h-64 text-emerald-600 dark:text-emerald-400">
                  {selectedLog.payload ? JSON.stringify(selectedLog.payload, null, 2) : '// No additional payload payload recorded'}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
