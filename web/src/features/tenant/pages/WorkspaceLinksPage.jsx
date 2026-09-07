import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  GlobeIcon,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  QrCodeIcon,
  Trash2Icon,
  RefreshCwIcon,
  BarChart2Icon,
  PowerIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  Link2Icon,
  CheckCircle2Icon,
  MousePointerClickIcon,
  PlusIcon,
} from 'lucide-react';
import QRCodeModal from '@/features/urls/components/QRCodeModal';
import DeleteConfirmModal from '@/features/urls/components/DeleteConfirmModal';
import CreateURLModal from '@/features/urls/components/CreateURLModal';
import PermissionGuard from '@/components/PermissionGuard';

import { getShortUrls, updateShortUrl, deleteShortUrl } from '@/features/urls/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useI18n } from '@/context/I18nContext';
import { useTenant } from '@/context/TenantContext';

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
  const { t } = useI18n();
  const { activeTenant } = useTenant();
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
        scopeAll: true, // Fetch ALL links in workspace
      });
      const items = data?.items || [];
      setUrls(items);
      setTotal(data?.meta?.total || items.length);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat tautan workspace');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, activeFilter, sortBy, sortDirection, activeTenant?.id]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCopy = (shortUrl, id) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    toast.success('Tautan berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (urlItem) => {
    setTogglingId(urlItem.id);
    try {
      await updateShortUrl(urlItem.id, { is_active: !urlItem.is_active });
      toast.success(urlItem.is_active ? 'Tautan dinonaktifkan' : 'Tautan diaktifkan');
      fetchUrls();
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah status tautan');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteShortUrl(deleteModal.id);
      toast.success('Tautan berhasil dihapus');
      setDeleteModal({ isOpen: false, id: null, loading: false });
      fetchUrls();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus tautan');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
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
          title="Tautan Singkat"
          onSort={(dir) => {
            setSortBy('short_code');
            setSortDirection(dir);
          }}
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
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleCopy(fullShortUrl, item.id)}
              title="Salin Tautan"
            >
              {isCopied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
            </Button>
          </div>
        );
      },
    },
    {
      id: 'title_url',
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Judul & URL Asli"
          onSort={(dir) => {
            setSortBy('title');
            setSortDirection(dir);
          }}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col max-w-[320px]">
            <span className="font-medium text-foreground text-sm truncate" title={item.title}>
              {item.title || 'Tanpa Judul'}
            </span>
            <a
              href={item.original_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-primary truncate flex items-center gap-1 mt-0.5"
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
      header: 'Status',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge
            variant={item.is_active ? 'default' : 'secondary'}
            className={item.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground'}
          >
            {item.is_active ? 'Aktif' : 'Non-Aktif'}
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
          title="Total Klik"
          onSort={(dir) => {
            setSortBy('click_count');
            setSortDirection(dir);
          }}
        />
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
            <BarChart2Icon className="size-4 text-muted-foreground shrink-0" />
            <span>{(item.click_count || 0).toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Tanggal Dibuat"
          onSort={(dir) => {
            setSortBy('created_at');
            setSortDirection(dir);
          }}
        />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const item = row.original;
        const fullShortUrl = `${window.location.origin}/${item.short_code}`;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <EllipsisVerticalIcon className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Aksi Link</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCopy(fullShortUrl, item.id)}>
                <CopyIcon className="size-4 mr-2" />
                Salin Tautan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQrModal({ isOpen: true, url: fullShortUrl, code: item.short_code })}
              >
                <QrCodeIcon className="size-4 mr-2" />
                Lihat QR Code
              </DropdownMenuItem>
              <PermissionGuard permission="analytics.read">
                <DropdownMenuItem onClick={() => navigate(`/dashboard/urls/${item.id}`)}>
                  <BarChart2Icon className="size-4 mr-2" />
                  Analitik Detail
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="urls.update">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleToggleActive(item)}
                  disabled={togglingId === item.id}
                >
                  <PowerIcon className="size-4 mr-2 text-amber-500" />
                  {item.is_active ? 'Nonaktifkan Tautan' : 'Aktifkan Tautan'}
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="urls.delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteModal({ isOpen: true, id: item.id, loading: false })}
                >
                  <Trash2Icon className="size-4 mr-2" />
                  Hapus Tautan
                </DropdownMenuItem>
              </PermissionGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <DynamicPageHeader
        title={`Kontrol Link ${activeTenant?.name || 'Workspace'}`}
        description="Kelola dan pantau seluruh tautan pendek yang dibuat oleh semua anggota di workspace ini"
        breadcrumbItems={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Manajemen Workspace', path: '/dashboard/workspace/members' },
          { label: 'Kontrol Link Workspace' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchUrls} disabled={loading}>
              <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <PermissionGuard permission="urls.create">
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="size-4 mr-2" />
                Buat Link Workspace
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Link Workspace</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{total}</h3>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <GlobeIcon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Link Aktif</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2Icon className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Performa Klik</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalClicks.toLocaleString()}</h3>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MousePointerClickIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Link Workspace</CardTitle>
              <CardDescription>
                Semua tautan yang dibuat di tenant {activeTenant?.name || ''}
              </CardDescription>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tautan, kode, URL..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <Select
                value={activeFilter}
                onValueChange={(val) => {
                  setActiveFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DataTable
            data={urls}
            columns={columns}
            loading={loading}
            pageCount={Math.ceil(total / limit) || 1}
            pageIndex={page - 1}
            pageSize={limit}
            onPageChange={(newPageIndex) => setPage(newPageIndex + 1)}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

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
