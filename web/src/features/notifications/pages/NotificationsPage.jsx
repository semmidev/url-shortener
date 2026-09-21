import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BellIcon,
  CheckCheckIcon,
  Trash2Icon,
  SparklesIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  UsersIcon,
  InfoIcon,
  SearchIcon,
  Loader2Icon,
  ArrowUpRightIcon,
  InboxIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useI18n } from '@/context/I18nContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearReadNotifications,
} from '@/features/notifications/api';

function getCategoryConfig(type) {
  switch (type) {
    case 'workspace':
    case 'workspace_invite':
    case 'workspace_leave':
      return {
        label: 'Workspace',
        icon: UsersIcon,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        link: '/dashboard/workspace/members',
      };
    case 'security':
      return {
        label: 'Keamanan',
        icon: ShieldCheckIcon,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        link: '/dashboard/account',
      };
    case 'analytics':
      return {
        label: 'Analytics',
        icon: BarChart3Icon,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        link: '/dashboard/analytics',
      };
    default:
      return {
        label: 'Sistem',
        icon: InfoIcon,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        link: '/dashboard',
      };
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}h lalu`;
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterTab, setFilterTab] = useState('all'); // all, unread, workspace, system, security
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTargetRef = useRef(null);

  const fetchPageData = useCallback(async (targetPage, isReset = false) => {
    if (isReset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await getNotifications({
        page: targetPage,
        limit: 15,
        unread_only: filterTab === 'unread',
        type: filterTab !== 'all' && filterTab !== 'unread' ? filterTab : undefined,
        search: searchQuery.trim() || undefined,
      });

      const newItems = data.items || [];
      if (isReset) {
        setItems(newItems);
      } else {
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          return [...prev, ...newItems.filter((i) => !existingIds.has(i.id))];
        });
      }

      setUnreadCount(data.unread_count || 0);
      setTotalCount(data.total || 0);
      setHasMore(newItems.length >= 15 && targetPage * 15 < data.total);
    } catch (err) {
      toast.error('Gagal memuat notifikasi');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filterTab, searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchPageData(1, true);
  }, [fetchPageData]);

  const loadMoreItems = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPageData(nextPage, false);
  };

  // Infinite scroll observer
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMoreItems]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      toast.success(t('notifications.markAllRead'));
    } catch {
      toast.error('Gagal menandai semua notifikasi');
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      setItems((prev) => prev.filter((item) => !item.is_read));
      toast.info(t('notifications.clearRead'));
    } catch {
      toast.error('Gagal menghapus notifikasi terbaca');
    }
  };

  const handleToggleSingleRead = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_read: true } : i))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        toast.error('Gagal memperbarui notifikasi');
      }
    }
  };

  const handleDeleteSingle = async (id) => {
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(t('notifications.deleteNotification'));
    } catch {
      toast.error('Gagal menghapus notifikasi');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      <DynamicPageHeader
        title={t('notifications.pageTitle')}
        subtitle={t('notifications.pageSubtitle')}
        fallbackIcon={BellIcon}
      />

      {/* Control Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto">
          {[
            { id: 'all', label: t('notifications.all'), count: totalCount },
            { id: 'unread', label: t('notifications.unread'), count: unreadCount },
            { id: 'workspace', label: 'Workspace' },
            { id: 'system', label: t('notifications.system') },
            { id: 'security', label: t('notifications.security') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-card text-foreground shadow-xs border border-border/80 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Badge
                  variant={filterTab === tab.id ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-4 min-w-4"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Search & Global Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('notifications.searchPlaceholder')}
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
              title={t('notifications.markAllRead')}
            >
              <CheckCheckIcon className="size-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
            title={t('notifications.clearRead')}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((sk) => (
              <div
                key={sk}
                className="p-4 rounded-xl border border-border/40 bg-card/50 animate-pulse flex items-start gap-4"
              >
                <div className="size-9 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-muted rounded-xs" />
                  <div className="h-3 w-2/3 bg-muted/60 rounded-xs" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <InboxIcon className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t('notifications.empty')}</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {t('notifications.emptyDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((item) => {
            const config = getCategoryConfig(item.type);
            const IconComp = config.icon;
            const isUnread = !item.is_read;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`group relative p-4 rounded-xl border transition-all duration-200 bg-card hover:border-border/90 ${
                  isUnread
                    ? 'border-border/80 bg-primary/[0.03] dark:bg-primary/[0.06]'
                    : 'border-border/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon Badge */}
                  <div className={`p-2.5 rounded-xl border shrink-0 ${config.color}`}>
                    <IconComp className="size-4" />
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread && (
                          <span className="size-2 rounded-full bg-primary shrink-0" title={t('notifications.unread')} />
                        )}
                        <span className={`text-xs font-semibold truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>

                    {/* Action Links */}
                    <div className="flex items-center gap-3 pt-2">
                      {config.link && (
                        <Link
                          to={config.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {t('notifications.openPage')}
                          <ArrowUpRightIcon className="size-3" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSingleRead(item)}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        {isUnread ? t('notifications.markAsRead') : t('notifications.markAsUnread')}
                      </button>
                    </div>
                  </div>

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 cursor-pointer"
                    title={t('notifications.deleteNotification')}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Infinite Scroll Trigger & Skeleton Loading */}
      <div ref={observerTargetRef} className="pt-4 text-center">
        {isLoadingMore ? (
          <div className="space-y-3">
            {[1, 2].map((sk) => (
              <div
                key={sk}
                className="p-4 rounded-xl border border-border/40 bg-card/50 animate-pulse flex items-start gap-4"
              >
                <div className="size-9 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-muted rounded-xs" />
                  <div className="h-3 w-2/3 bg-muted/60 rounded-xs" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2Icon className="size-4 animate-spin text-primary" />
              <span>{t('common.loading')}</span>
            </div>
          </div>
        ) : hasMore ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMoreItems}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
          >
            <RefreshCwIcon className="size-3.5" />
            {t('notifications.loadMore')}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            {t('notifications.allLoaded')}
          </p>
        )}
      </div>
    </div>
  );
}
