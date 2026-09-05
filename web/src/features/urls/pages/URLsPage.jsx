import React, { useState, useEffect, startTransition, addTransitionType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SafeViewTransition from '@/components/SafeViewTransition';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Link2Icon,
  PlusIcon,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  EyeIcon,
  Trash2Icon,
  RefreshCwIcon,
  BarChart2Icon,
  PowerIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
} from 'lucide-react';
import CreateURLModal from '@/features/urls/components/CreateURLModal';
import QRCodeModal from '@/features/urls/components/QRCodeModal';
import PreviewModal from '@/features/urls/components/PreviewModal';
import DeleteConfirmModal from '@/features/urls/components/DeleteConfirmModal';

import { getShortUrls, updateShortUrl, deleteShortUrl, previewShortUrl } from '@/features/urls/api';
import { useDebounce } from '@/hooks/use-debounce';
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

export default function URLs() {
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
  const [totalPages, setTotalPages] = useState(1);

  // Sorting state
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrModal, setQrModal] = useState({ isOpen: false, url: '', code: '' });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false });
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchUrls = async () => {
    setLoading(true);
    try {
      const data = await getShortUrls({
        page,
        limit,
        search: debouncedSearch,
        active: activeFilter,
        sortBy,
        sortDirection,
      });
      const items = data?.items || [];
      setUrls(items);

      if (data?.meta) {
        setTotal(data.meta.total || 0);
        setTotalPages(data.meta.total_pages || Math.ceil((data.meta.total || 0) / limit) || 1);
      } else {
        setTotal(items.length);
        setTotalPages(1);
      }
    } catch {
      toast.error('Failed to load short URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, activeFilter, sortBy, sortDirection]);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'click_count' || field === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleCopy = (urlStr, id) => {
    navigator.clipboard.writeText(urlStr);
    setCopiedId(id);
    toast.success('Short URL copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (item) => {
    setTogglingId(item.id);
    try {
      await updateShortUrl(item.id, { is_active: !item.is_active });
      toast.success(`Short link ${item.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update link status');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = (id) => {
    setDeleteModal({ isOpen: true, id, loading: false });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteShortUrl(deleteModal.id);
      toast.success('Short URL deleted successfully!');
      setDeleteModal({ isOpen: false, id: null, loading: false });
      fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete URL');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePreview = async (code) => {
    try {
      const data = await previewShortUrl(code);
      setPreviewModal({ isOpen: true, data });
    } catch {
      toast.error('Failed to load preview details');
    }
  };

  const renderSortHeader = (label, field) => {
    const isCurrent = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer font-semibold text-xs uppercase tracking-wider select-none group"
      >
        <span>{label}</span>
        {isCurrent ? (
          sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-3.5 text-primary shrink-0 transition-transform" />
          ) : (
            <ArrowDownIcon className="size-3.5 text-primary shrink-0 transition-transform" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        )}
      </button>
    );
  };

  const handleBulkDeactivate = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((r) => updateShortUrl(r.id, { is_active: false })));
      toast.success(`Deactivated ${selectedRows.length} short URLs`);
      fetchUrls();
    } catch (err) {
      toast.error('Failed to deactivate selected URLs');
    }
  };

  const handleBulkActivate = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((r) => updateShortUrl(r.id, { is_active: true })));
      toast.success(`Activated ${selectedRows.length} short URLs`);
      fetchUrls();
    } catch (err) {
      toast.error('Failed to activate selected URLs');
    }
  };

  const handleBulkDelete = async (selectedRows) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} selected URLs?`)) return;
    try {
      await Promise.all(selectedRows.map((r) => deleteShortUrl(r.id)));
      toast.success(`Deleted ${selectedRows.length} short URLs`);
      fetchUrls();
    } catch (err) {
      toast.error('Failed to delete selected URLs');
    }
  };

  const columns = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Title & Short URL"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <SafeViewTransition name={`url-card-${item.id}`} share="morph" default="none">
              <SafeViewTransition name={`url-title-${item.id}`} share="text-morph" default="none">
                <Link
                  to={`/dashboard/urls/${item.id}`}
                  onClick={() => {
                    if (typeof addTransitionType === 'function') {
                      startTransition(() => {
                        addTransitionType('nav-forward');
                      });
                    }
                  }}
                  className="font-semibold text-foreground hover:text-primary transition-colors text-left cursor-pointer"
                >
                  {item.title || item.short_code}
                </Link>
              </SafeViewTransition>
            </SafeViewTransition>
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
          </div>
        );
      },
    },
    {
      accessorKey: 'original_url',
      header: "Original URL",
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-muted-foreground font-mono text-xs" title={row.original.original_url}>
          {row.original.original_url}
        </div>
      ),
    },
    {
      accessorKey: 'click_count',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Total Clicks"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold font-mono tabular-nums">
          {row.original.click_count || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_active',
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <Badge
            className={`text-[11px] font-semibold border ${
              active
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Created Date"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs whitespace-nowrap">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <EllipsisVerticalIcon className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Link Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {item.is_active && (
                  <>
                    <DropdownMenuItem
                      onClick={() => navigate(`/dashboard/urls/${item.id}`)}
                      className="cursor-pointer text-xs"
                    >
                      <BarChart2Icon className="size-4 mr-2 text-muted-foreground" />
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCopy(item.short_url, item.id)}
                      className="cursor-pointer text-xs"
                    >
                      {copiedId === item.id ? (
                        <CheckIcon className="size-4 mr-2 text-emerald-500" />
                      ) : (
                        <CopyIcon className="size-4 mr-2 text-muted-foreground" />
                      )}
                      Copy Short URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setQrModal({ isOpen: true, url: item.short_url, code: item.short_code })}
                      className="cursor-pointer text-xs"
                    >
                      <QrCodeIcon className="size-4 mr-2 text-muted-foreground" />
                      View QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePreview(item.short_code)}
                      className="cursor-pointer text-xs"
                    >
                      <EyeIcon className="size-4 mr-2 text-muted-foreground" />
                      Safety Preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => handleToggleActive(item)}
                  disabled={togglingId === item.id}
                  className="cursor-pointer text-xs"
                >
                  <PowerIcon className="size-4 mr-2 text-muted-foreground" />
                  {item.is_active ? 'Deactivate Link' : 'Activate Link'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => confirmDelete(item.id)}
                  className="cursor-pointer text-xs text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="size-4 mr-2" />
                  Delete Link
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
      {/* Top Header */}
      <DynamicPageHeader
        title={t("urls.title")}
        subtitle={t("urls.subtitle")}
        fallbackIcon={Link2Icon}
      >
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          <PlusIcon className="size-4 shrink-0" />
          <span>{t("dashboard.createUrlBtn")}</span>
        </Button>
      </DynamicPageHeader>

      {/* Unified DataTable */}
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
        onSearchChange={setSearch}
        searchPlaceholder={t("urls.searchPlaceholder")}
        filters={[
          {
            id: 'status',
            label: t("admin.statusHeader") || 'Status',
            value: activeFilter,
            onChange: setActiveFilter,
            options: [
              { label: t("urls.allStatuses"), value: 'all' },
              { label: t("common.active"), value: 'active' },
              { label: t("common.inactive"), value: 'inactive' },
            ],
          },
        ]}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        onRefresh={fetchUrls}
        bulkActions={[
          {
            label: 'Deactivate Selected',
            icon: PowerIcon,
            variant: 'outline',
            onClick: handleBulkDeactivate,
          },
          {
            label: 'Activate Selected',
            icon: PowerIcon,
            variant: 'outline',
            onClick: handleBulkActivate,
          },
          {
            label: 'Delete Selected',
            icon: Trash2Icon,
            variant: 'destructive',
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* Modals */}
      <CreateURLModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchUrls}
      />

      {qrModal.isOpen && (
        <QRCodeModal
          isOpen={qrModal.isOpen}
          onClose={() => setQrModal({ isOpen: false, url: '', code: '' })}
          shortURL={qrModal.url}
          shortCode={qrModal.code}
        />
      )}

      {previewModal.isOpen && (
        <PreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal({ isOpen: false, data: null })}
          data={previewModal.data}
        />
      )}

      {deleteModal.isOpen && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, id: null, loading: false })}
          onConfirm={executeDelete}
          loading={deleteModal.loading}
        />
      )}
    </div>
  );
}
