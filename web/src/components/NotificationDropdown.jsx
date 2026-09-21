import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Sparkles, ShieldCheck, BarChart3, Info, ChevronRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/context/I18nContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/features/notifications/api';

function getNotificationIcon(type) {
  switch (type) {
    case 'workspace':
    case 'workspace_invite':
    case 'workspace_leave':
      return { icon: Users, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    case 'security':
      return { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    case 'analytics':
      return { icon: BarChart3, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    default:
      return { icon: Info, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
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

export function NotificationDropdown({ className = '' }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Ignore initial auth or network fetch errors quietly
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const data = await getNotifications({ page: 1, limit: 10 });
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Ignore quietly
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // Polling unread count every 15s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen, fetchList]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleToggleRead = async (item) => {
    if (!item.is_read) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        id="notification-bell-btn"
        variant="ghost"
        size="icon"
        aria-label={t("notifications.title")}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-card shadow-xs animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-20 slide-in-from-top-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{t("notifications.title")}</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-semibold">
                  {unreadCount} {t("notifications.new")}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((item) => {
                const { icon: IconComponent, color } = getNotificationIcon(item.type);
                const isUnread = !item.is_read;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRead(item)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl border shrink-0 mt-0.5 ${color}`}
                    >
                      <IconComponent className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isUnread ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border/60 bg-muted/20 text-center">
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline py-1 px-3 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
            >
              {t("notifications.viewAll")}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
