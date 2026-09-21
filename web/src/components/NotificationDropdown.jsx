import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Sparkles, ShieldCheck, BarChart3, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/context/I18nContext';

const DUMMY_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Pembaruan Fitur S3 Storage',
    description: 'Fitur upload foto profil via S3 Presigned URL & Google Avatar Sync aktif.',
    time: '5 mnt lalu',
    unread: true,
    icon: Sparkles,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: '2',
    title: 'Domain Kustom Diverifikasi',
    description: 'Domain short.link milik Anda telah diverifikasi dan aktif.',
    time: '1 jam lalu',
    unread: true,
    icon: ShieldCheck,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: '3',
    title: 'Laporan Analytics Mingguan',
    description: 'Statistik klik tautan minggu ini meningkat 24%.',
    time: '3 jam lalu',
    unread: true,
    icon: BarChart3,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: '4',
    title: 'Keamanan Akun',
    description: 'Sesi autentikasi JWT berhasil diperbarui dengan aman.',
    time: '1 hari lalu',
    unread: false,
    icon: Info,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
];

export function NotificationDropdown({ className = '' }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

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

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        id="notification-bell-btn"
        variant="ghost"
        size="icon"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Daftar Notifikasi"
          className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-20 slide-in-from-top-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Notifikasi</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-semibold">
                  {unreadCount} baru
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
                Tandai dibaca
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRead(item.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                      item.unread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl border shrink-0 mt-0.5 ${item.color}`}
                    >
                      <IconComponent className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            item.unread ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    {item.unread && (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border/60 bg-muted/20 text-center">
            <span className="text-[11px] text-muted-foreground font-medium">
              Sistem Notifikasi Modul UI Demo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
