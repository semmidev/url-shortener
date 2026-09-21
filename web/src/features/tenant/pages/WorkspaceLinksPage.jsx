import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GlobeIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  Trash2Icon,
  BarChart2Icon,
  PowerIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  MousePointerClickIcon,
  PlusIcon,
  EyeIcon,
} from 'lucide-react';
import QRCodeModal from '@/features/urls/components/QRCodeModal';
import DeleteConfirmModal from '@/features/urls/components/DeleteConfirmModal';
import CreateURLModal from '@/features/urls/components/CreateURLModal';
import PermissionGuard from '@/components/PermissionGuard';

import { getShortUrls, updateShortUrl, deleteShortUrl } from '@/features/urls/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useTenant } from '@/context/TenantContext';
import { usePermission } from '@/hooks/usePermission';
import { useI18n } from '@/context/I18nContext';

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

export default function WorkspaceLinksPage() {
  const { activeTenant } = useTenant();
  const { hasPermission } = usePermission();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [activeFilter, setActiveFilter] = useState('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Sorting state
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrModal, setQrModal] = useState({ isOpen: false, url: '', code: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false });
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchUrls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShortUrls({
        page,
        limit,
        search: debouncedSearch,
        active: activeFilter,
        sortBy,
        sortDirection,
        scopeAll: true,
      });
      const items = data?.items || [];
      setUrls(items);
      setTotal(data?.meta?.total || items.length);
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, activeFilter, sortBy, sortDirection, activeTenant?.id, t]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCopy = (shortUrl, id) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    toast.success(t('workspace.linkCopied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleToggleActive = async (urlItem) => {
    setTogglingId(urlItem.id);
    try {
      await updateShortUrl(urlItem.id, { is_active: !urlItem.is_active });
      toast.success(urlItem.is_active ? t('workspace.linkDeactivated') : t('workspace.linkActivated'));
      fetchUrls();
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteShortUrl(deleteModal.id);
      toast.success(t('common.success'));
      setDeleteModal({ isOpen: false, id: null, loading: false });
      fetchUrls();
    } catch (err) {
      toast.error(err.message || t('common.error'));
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleBulkDeactivate = async (selectedRows) => {
    if (!selectedRows?.length) return;
    try {
      await Promise.all(selectedRows.map((r) => updateShortUrl(r.id, { is_active: false })));
      toast.success(t('workspace.deactivateSelected'));
      fetchUrls();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleBulkActivate = async (selectedRows) => {
    if (!selectedRows?.length) return;
    try {
      await Promise.all(selectedRows.map((r) => updateShortUrl(r.id, { is_active: true })));
      toast.success(t('workspace.activateSelected'));
      fetchUrls();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleBulkDelete = async (selectedRows) => {
    if (!selectedRows?.length) return;
    if (!window.confirm(t('workspace.deleteSelected'))) return;
    try {
      await Promise.all(selectedRows.map((r) => deleteShortUrl(r.id)));
      toast.success(t('common.success'));
      fetchUrls();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const activeCount = urls.filter((u) => u.is_active).length;
  const totalClicks = urls.reduce((acc, u) => acc + (u.click_count || 0), 0);

  const columns = [
    {
      id: 'short_code',
      accessorKey: 'short_code',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.shortLinkCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        const fullShortUrl = `${window.location.origin}/${item.short_code}`;
        const isCopied = copiedId === item.id;

        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <div className="font-mono text-sm font-semibold text-primary truncate">
              /{item.short_code}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => handleCopy(fullShortUrl, item.id)}
              title={t('workspace.copyLink')}
            >
              {isCopied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
            </Button>
          </div>
        );
      },
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.titleOriginalUrlCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col max-w-[320px]">
            <span className="font-semibold text-foreground text-sm truncate" title={item.title}>
              {item.title || '-'}
            </span>
            <a
              href={item.original_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-primary truncate flex items-center gap-1 mt-0.5 font-mono"
              title={item.original_url}
            >
              <span className="truncate">{item.original_url}</span>
              <ExternalLinkIcon className="size-3 shrink-0" />
            </a>
          </div>
        );
      },
    },
    {
      id: 'is_active',
      accessorKey: 'is_active',
      header: t('admin.statusHeader'),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge
            className={`text-[11px] font-semibold border ${
              item.is_active
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
            }`}
          >
            {item.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        );
      },
    },
    {
      id: 'click_count',
      accessorKey: 'click_count',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.clicksCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge variant="outline" className="font-bold font-mono text-xs tabular-nums">
            {(item.click_count || 0).toLocaleString()}
          </Badge>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.createdCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('common.actions')}</div>,
      cell: ({ row }) => {
        const item = row.original;
        const fullShortUrl = `${window.location.origin}/${item.short_code}`;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground cursor-pointer">
                  <EllipsisVerticalIcon className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">{t('common.actions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCopy(fullShortUrl, item.id)} className="cursor-pointer text-xs">
                  <CopyIcon className="size-4 mr-2 text-muted-foreground" />
                  {t('workspace.copyLink')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setQrModal({ isOpen: true, url: fullShortUrl, code: item.short_code })}
                  className="cursor-pointer text-xs"
                >
                  <QrCodeIcon className="size-4 mr-2 text-muted-foreground" />
                  {t('workspace.viewQr')}
                </DropdownMenuItem>
                <PermissionGuard permission="analytics.read">
                  <DropdownMenuItem onClick={() => navigate(`/dashboard/urls/${item.id}`)} className="cursor-pointer text-xs">
                    <BarChart2Icon className="size-4 mr-2 text-muted-foreground" />
                    {t('workspace.detailedAnalytics')}
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard permission="urls.update">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleToggleActive(item)}
                    disabled={togglingId === item.id}
                    className="cursor-pointer text-xs"
                  >
                    <PowerIcon className="size-4 mr-2 text-muted-foreground" />
                    {item.is_active ? t('workspace.deactivateLink') : t('workspace.activateLink')}
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard permission="urls.delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                    onClick={() => setDeleteModal({ isOpen: true, id: item.id, loading: false })}
                  >
                    <Trash2Icon className="size-4 mr-2" />
                    {t('workspace.deleteLink')}
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const bulkActions = [
    ...(hasPermission('urls.update')
      ? [
          {
            label: t('workspace.deactivateSelected'),
            icon: PowerIcon,
            variant: 'outline',
            onClick: handleBulkDeactivate,
          },
          {
            label: t('workspace.activateSelected'),
            icon: PowerIcon,
            variant: 'outline',
            onClick: handleBulkActivate,
          },
        ]
      : []),
    ...(hasPermission('urls.delete')
      ? [
          {
            label: t('workspace.deleteSelected'),
            icon: Trash2Icon,
            variant: 'destructive',
            onClick: handleBulkDelete,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <DynamicPageHeader
        title={t('workspace.linksTitle')}
        subtitle={t('workspace.linksSubtitle', { name: activeTenant?.name || 'Workspace' })}
        fallbackIcon={GlobeIcon}
      >
        <PermissionGuard permission="urls.create">
          <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
            <PlusIcon className="size-4 shrink-0 mr-1.5" />
            <span>{t('workspace.createWorkspaceLink')}</span>
          </Button>
        </PermissionGuard>
      </DynamicPageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('workspace.totalWorkspaceLinks')}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{total}</h3>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <GlobeIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('workspace.activeLinks')}</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2Icon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('workspace.totalClickPerformance')}</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalClicks.toLocaleString()}</h3>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MousePointerClickIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standardized DataTable */}
      <DataTable
        columns={columns}
        data={urls}
        isLoading={loading}
        enableSelection={true}
        page={page}
        pageSize={limit}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize);
          setPage(1);
        }}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('workspace.searchLinksPlaceholder')}
        filters={[
          {
            id: 'status',
            label: t('admin.statusHeader'),
            value: activeFilter,
            onChange: (val) => {
              setActiveFilter(val);
              setPage(1);
            },
            options: [
              { label: t('urls.allStatuses'), value: 'all' },
              { label: t('common.active'), value: 'active' },
              { label: t('common.inactive'), value: 'inactive' },
            ],
          },
        ]}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        onRefresh={fetchUrls}
        bulkActions={bulkActions}
      />

      {/* Modals */}
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, url: '', code: '' })}
        shortURL={qrModal.url}
        shortCode={qrModal.code}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDeleteConfirm}
        loading={deleteModal.loading}
      />

      <CreateURLModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsCreateOpen(false);
          fetchUrls();
        }}
      />
    </div>
  );
}
