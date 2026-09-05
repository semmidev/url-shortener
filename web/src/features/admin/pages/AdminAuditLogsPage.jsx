import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable } from '@/components/data-table';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Eye, EllipsisVertical } from 'lucide-react';
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

  const columns = [
    {
      accessorKey: 'created_at',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'actor_email',
      header: 'Actor Email',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground text-xs">
          {row.original.actor_email}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 text-xs">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: 'resource',
      header: 'Target Resource',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <span className="font-medium text-foreground text-xs">
            {log.resource} {log.resource_id && <span className="font-mono text-muted-foreground">({log.resource_id})</span>}
          </span>
        );
      },
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">
          {row.original.ip_address || '127.0.0.1'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <EllipsisVertical className="w-4 h-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Log Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer text-xs"
                >
                  <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                  Inspect Payload
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title={t('adminPages.auditLogs.title')}
        subtitle={t('adminPages.auditLogs.subtitle')}
        fallbackIcon={FileText}
      />

      {/* Unified DataTable */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        page={page}
        pageSize={10}
        totalCount={meta?.total || logs.length}
        onPageChange={setPage}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('adminPages.auditLogs.searchPlaceholder')}
        onRefresh={fetchLogs}
      />

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
                  {selectedLog.payload ? JSON.stringify(selectedLog.payload, null, 2) : '// No additional payload recorded'}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
