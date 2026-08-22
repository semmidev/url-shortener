import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '@/lib/client';
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
} from 'lucide-react';
import CreateURLModal from '@/features/urls/components/CreateURLModal';
import QRCodeModal from '@/features/urls/components/QRCodeModal';
import PreviewModal from '@/features/urls/components/PreviewModal';
import DeleteConfirmModal from '@/features/urls/components/DeleteConfirmModal';

import { useDebounce } from '@/hooks/use-debounce';
import { useI18n } from '@/context/I18nContext';

export default function URLs() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [qrModal, setQrModal] = useState({ isOpen: false, url: '', code: '' });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, loading: false });
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchUrls = async () => {
    setLoading(true);
    try {
      let endpoint = `/urls?sort_by=created_at&sort_direction=desc`;
      if (debouncedSearch.trim()) endpoint += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      if (activeFilter === 'active') endpoint += `&active=1`;
      else if (activeFilter === 'inactive') endpoint += `&active=0`;
      else if (activeFilter === 'all') endpoint += `&active=-1`;

      const res = await client.get(endpoint);
      const items = res.data?.items || [];
      setUrls(items);
    } catch {
      toast.error('Failed to load short URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeFilter]);

  const handleCopy = (urlStr, id) => {
    navigator.clipboard.writeText(urlStr);
    setCopiedId(id);
    toast.success('Short URL copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (item) => {
    setTogglingId(item.id);
    try {
      await client.put(`/urls/${item.id}`, {
        is_active: !item.is_active,
      });
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
      await client.delete(`/urls/${deleteModal.id}`);
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
      const res = await fetch(`/${code}/preview`);
      if (!res.ok) throw new Error('Preview failed');
      const data = await res.json();
      setPreviewModal({ isOpen: true, data });
    } catch {
      toast.error('Failed to load preview details');
    }
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
            <Button variant="outline" onClick={fetchUrls} title="Refresh Links" className="cursor-pointer">
              <RefreshCwIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links List / Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("nav.links")}</CardTitle>
          <CardDescription>Total {urls.length} {t("nav.shortUrls")}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : urls.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("dashboard.noRecentUrls")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="py-3 px-2">{t("urls.title")}</th>
                    <th className="py-3 px-2">{t("dashboard.originalUrl")}</th>
                    <th className="py-3 px-2">{t("dashboard.clicks")}</th>
                    <th className="py-3 px-2">{t("admin.statusHeader")}</th>
                    <th className="py-3 px-2 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {urls.map((item) => (
                    <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <button
                          onClick={() => navigate(`/dashboard/urls/${item.id}`)}
                          className="font-semibold text-foreground hover:text-primary transition-colors text-left cursor-pointer"
                        >
                          {item.title || item.short_code}
                        </button>
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
                      <td className="py-3 px-2 max-w-xs truncate text-muted-foreground text-xs">
                        {item.original_url}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="font-bold">
                          {item.click_count || 0}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
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
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleActive(item)}
                            disabled={togglingId === item.id}
                            title={item.is_active ? 'Deactivate Link (Turn Off)' : 'Activate Link (Turn On)'}
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
                                className="cursor-pointer"
                              >
                                <BarChart2Icon className="size-4 shrink-0" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCopy(item.short_url, item.id)}
                                title="Copy Short URL"
                                className="cursor-pointer"
                              >
                                {copiedId === item.id ? <CheckIcon className="size-4 text-emerald-500 shrink-0" /> : <CopyIcon className="size-4 shrink-0" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setQrModal({ isOpen: true, url: item.short_url, code: item.short_code })}
                                title="View QR Code"
                                className="cursor-pointer"
                              >
                                <QrCodeIcon className="size-4 shrink-0" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handlePreview(item.short_code)}
                                title="Inspect Link Safety"
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
                          >
                            <Trash2Icon className="size-4 shrink-0" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
