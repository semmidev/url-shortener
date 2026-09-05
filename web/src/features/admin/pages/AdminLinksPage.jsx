import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
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
import { Globe, Search, Ban, CheckCircle2, Trash2, ExternalLink, QrCode, RefreshCcw, AlertTriangle, EllipsisVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getGlobalLinks, banGlobalLink, forceDeleteLink } from '../api';
import PermissionGuard from '@/components/PermissionGuard';
import { useI18n } from '@/context/I18nContext';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';

export default function AdminLinksPage() {
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useI18n();

  // Selected item for action
  const [selectedLink, setSelectedLink] = useState(null);
  const [actionType, setActionType] = useState(null); // 'ban' | 'delete' | 'qr'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const data = await getGlobalLinks({ page, limit: 10, search });
      setLinks(data?.links || []);
      setMeta(data?.meta || {});
    } catch (err) {
      toast.error('Failed to load global links oversight data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [page, search]);

  const handleToggleBan = async () => {
    if (!selectedLink) return;
    setActionLoading(true);
    try {
      await banGlobalLink(selectedLink.id, !selectedLink.is_active);
      toast.success(t('adminPages.links.banSuccess'));
      fetchLinks();
      closeModal();
    } catch (err) {
      toast.error('Failed to update URL status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceDelete = async () => {
    if (!selectedLink) return;
    setActionLoading(true);
    try {
      await forceDeleteLink(selectedLink.id);
      toast.success(`Short URL /${selectedLink.short_code} permanently removed`);
      fetchLinks();
      closeModal();
    } catch (err) {
      toast.error('Failed to remove link');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedLink(null);
    setActionType(null);
  };

  const handleBulkBan = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((l) => banGlobalLink(l.id, false)));
      toast.success(`Banned ${selectedRows.length} short URLs`);
      fetchLinks();
    } catch (err) {
      toast.error('Failed to ban selected links');
    }
  };

  const handleBulkUnban = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((l) => banGlobalLink(l.id, true)));
      toast.success(`Unbanned ${selectedRows.length} short URLs`);
      fetchLinks();
    } catch (err) {
      toast.error('Failed to unban selected links');
    }
  };

  const handleBulkDelete = async (selectedRows) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedRows.length} selected URLs?`)) return;
    try {
      await Promise.all(selectedRows.map((l) => forceDeleteLink(l.id)));
      toast.success(`Permanently deleted ${selectedRows.length} short URLs`);
      fetchLinks();
    } catch (err) {
      toast.error('Failed to delete selected links');
    }
  };

  const filteredLinks = links.filter((l) => {
    if (statusFilter === 'active' && !l.is_active) return false;
    if (statusFilter === 'banned' && l.is_active) return false;
    return true;
  });

  const columns = [
    {
      accessorKey: 'short_code',
      header: 'Title & Short Code',
      cell: ({ row }) => {
        const link = row.original;
        return (
          <div>
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span className="text-primary font-mono">/{link.short_code}</span>
              {link.title && <span className="text-xs text-muted-foreground">({link.title})</span>}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Created {new Date(link.created_at).toLocaleDateString()}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'original_url',
      header: 'Original Target URL',
      cell: ({ row }) => (
        <a
          href={row.original.original_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 max-w-xs truncate"
        >
          <span className="truncate">{row.original.original_url}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ),
    },
    {
      accessorKey: 'user_email',
      header: 'Owner Email',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">
          {row.original.user_email || 'System / Anonymous'}
        </span>
      ),
    },
    {
      accessorKey: 'click_count',
      header: 'Total Clicks',
      cell: ({ row }) => (
        <span className="font-bold text-foreground tabular-nums">
          {row.original.click_count?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.is_active;
        return active ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
            <Ban className="w-3 h-3" />
            Banned
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const link = row.original;
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Link Oversight</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <PermissionGuard permission="links.ban">
                  <DropdownMenuItem
                    onClick={() => { setSelectedLink(link); setActionType('ban'); }}
                    className="cursor-pointer text-xs"
                  >
                    <Ban className="w-4 h-4 mr-2 text-amber-500" />
                    {link.is_active ? 'Ban Short URL' : 'Unban Short URL'}
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard permission="links.ban">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setSelectedLink(link); setActionType('delete'); }}
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Force Delete
                  </DropdownMenuItem>
                </PermissionGuard>
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
        title={t('adminPages.links.title')}
        subtitle={t('adminPages.links.subtitle')}
        fallbackIcon={Globe}
      />

      {/* Unified DataTable */}
      <DataTable
        columns={columns}
        data={filteredLinks}
        isLoading={isLoading}
        enableSelection={true}
        page={page}
        pageSize={10}
        totalCount={meta?.total || links.length}
        onPageChange={setPage}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('adminPages.links.searchPlaceholder')}
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Links', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Banned', value: 'banned' },
            ],
          },
        ]}
        onRefresh={fetchLinks}
        bulkActions={[
          {
            label: 'Ban Selected',
            icon: Ban,
            variant: 'outline',
            onClick: handleBulkBan,
          },
          {
            label: 'Unban Selected',
            icon: CheckCircle2,
            variant: 'outline',
            onClick: handleBulkUnban,
          },
          {
            label: 'Delete Selected',
            icon: Trash2,
            variant: 'destructive',
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* Confirmation Modals */}
      <AnimatePresence>
        {actionType && selectedLink && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              {actionType === 'ban' && (
                <>
                  <div className="flex items-center gap-3 text-amber-600">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-bold">{selectedLink.is_active ? 'Ban Short URL' : 'Unban Short URL'}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to {selectedLink.is_active ? 'block redirection for' : 'restore access to'}{' '}
                    <span className="font-mono font-bold text-foreground">/{selectedLink.short_code}</span>?
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                    <button
                      onClick={handleToggleBan}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}

              {actionType === 'delete' && (
                <>
                  <div className="flex items-center gap-3 text-red-600">
                    <Trash2 className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Force Delete URL</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will permanently remove <span className="font-mono font-bold text-foreground">/{selectedLink.short_code}</span> from the platform.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                    <button
                      onClick={handleForceDelete}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
