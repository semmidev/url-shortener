import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("urls.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("urls.subtitle")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          <PlusIcon className="size-4 shrink-0" />
          <span>{t("dashboard.createUrlBtn")}</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("urls.searchPlaceholder")}
                aria-label={t("urls.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder={t("urls.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("urls.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUrls} title="Refresh Links" aria-label="Refresh Links" className="cursor-pointer">
              <RefreshCwIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links List / Data Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>{t("nav.links")}</CardTitle>
            <CardDescription>Total {total} {t("nav.shortUrls")}.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Items per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : urls.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("dashboard.noRecentUrls")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12 font-semibold">#</th>
                    <th className="py-3 px-3">{renderSortHeader(t("urls.title"), 'title')}</th>
                    <th className="py-3 px-3 font-semibold">{t("dashboard.originalUrl")}</th>
                    <th className="py-3 px-3">{renderSortHeader(t("dashboard.created"), 'created_at')}</th>
                    <th className="py-3 px-3">{renderSortHeader(t("dashboard.clicks"), 'click_count')}</th>
                    <th className="py-3 px-3 font-semibold">{t("admin.statusHeader")}</th>
                    <th className="py-3 px-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {urls.map((item, index) => {
                    const rowNumber = (page - 1) * limit + index + 1;
                    return (
                      <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground font-semibold">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3">
                          <Link
                            to={`/dashboard/urls/${item.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors text-left cursor-pointer"
                          >
                            {item.title || item.short_code}
                          </Link>
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
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-muted-foreground text-xs">
                          {item.original_url}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="font-bold font-mono">
                            {item.click_count || 0}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            className={`text-[11px] font-semibold border ${
                              item.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleActive(item)}
                              disabled={togglingId === item.id}
                              title={item.is_active ? 'Deactivate Link (Turn Off)' : 'Activate Link (Turn On)'}
                              aria-label={item.is_active ? 'Deactivate link' : 'Activate link'}
                              className={`cursor-pointer transition-colors ${
                                item.is_active
                                  ? 'text-emerald-500 hover:text-rose-500 hover:bg-rose-500/10'
                                  : 'text-rose-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                              }`}
                            >
                              <PowerIcon className={`size-4 shrink-0 ${togglingId === item.id ? 'animate-spin' : ''}`} />
                            </Button>
                            {item.is_active && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => navigate(`/dashboard/urls/${item.id}`)}
                                  title="View Full Details & Click Events"
                                  aria-label="View link details"
                                  className="cursor-pointer"
                                >
                                  <BarChart2Icon className="size-4 shrink-0" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleCopy(item.short_url, item.id)}
                                  title="Copy Short URL"
                                  aria-label="Copy short URL"
                                  className="cursor-pointer"
                                >
                                  {copiedId === item.id ? <CheckIcon className="size-4 text-emerald-500 shrink-0" /> : <CopyIcon className="size-4 shrink-0" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setQrModal({ isOpen: true, url: item.short_url, code: item.short_code })}
                                  title="View QR Code"
                                  aria-label="View QR code"
                                  className="cursor-pointer"
                                >
                                  <QrCodeIcon className="size-4 shrink-0" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handlePreview(item.short_code)}
                                  title="Inspect Link Safety"
                                  aria-label="Inspect link safety"
                                  className="cursor-pointer"
                                >
                                  <EyeIcon className="size-4 shrink-0" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => confirmDelete(item.id)}
                              title="Delete Short Link"
                              aria-label="Delete short link"
                            >
                              <Trash2Icon className="size-4 shrink-0" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer Controls */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
              <div>
                Showing <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-semibold text-foreground">{total}</span> short URLs
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-8 gap-1 cursor-pointer"
                >
                  <ChevronLeftIcon className="size-3.5" />
                  <span>Prev</span>
                </Button>
                <span className="px-2 font-mono text-xs">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
