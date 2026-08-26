import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Search, Ban, CheckCircle2, Trash2, ExternalLink, QrCode, RefreshCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getGlobalLinks, banGlobalLink, forceDeleteLink } from '../api';
import PermissionGuard from '@/components/PermissionGuard';
import { useI18n } from '@/context/I18nContext';

export default function AdminLinksPage() {
  const [links, setLinks] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title={t('adminPages.links.title')}
        subtitle={t('adminPages.links.subtitle')}
        fallbackIcon={Globe}
      />

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('adminPages.links.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={fetchLinks}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Links Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">{t('adminPages.links.colTitleCode')}</th>
                <th className="px-6 py-4">{t('adminPages.links.colOriginalUrl')}</th>
                <th className="px-6 py-4">{t('adminPages.links.colOwner')}</th>
                <th className="px-6 py-4">{t('adminPages.links.colClicks')}</th>
                <th className="px-6 py-4">{t('adminPages.links.colStatus')}</th>
                <th className="px-6 py-4 text-right">{t('adminPages.links.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">Loading global links…</td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">No short URLs found.</td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="text-primary font-mono">/{link.short_code}</span>
                          {link.title && <span className="text-xs text-muted-foreground">({link.title})</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Created {new Date(link.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      <a
                        href={link.original_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{link.original_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-foreground">
                      {link.user_email || 'System / Anonymous'}
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {link.click_count?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4">
                      {link.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                          <Ban className="w-3 h-3" />
                          Banned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGuard permission="links.ban">
                          <button
                            onClick={() => { setSelectedLink(link); setActionType('ban'); }}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              link.is_active
                                ? 'border-amber-500/30 text-amber-600 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                            }`}
                          >
                            {link.is_active ? 'Ban Link' : 'Unban'}
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="links.ban">
                          <button
                            onClick={() => { setSelectedLink(link); setActionType('delete'); }}
                            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg border border-border"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
