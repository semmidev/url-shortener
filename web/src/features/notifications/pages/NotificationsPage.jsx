import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BellIcon,
  CheckCheckIcon,
  Trash2Icon,
  SparklesIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  KeyRoundIcon,
  AlertTriangleIcon,
  FilterIcon,
  SearchIcon,
  Loader2Icon,
  ArrowUpRightIcon,
  CheckIcon,
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

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    category: 'system',
    categoryLabel: 'Sistem',
    title: 'Upload Foto Profil S3 Presigned URL Aktif',
    description: 'Modul upload foto profil via S3 RustFS & otomatisasi sync avatar Google berhasil dikonfigurasi.',
    time: '2 menit yang lalu',
    unread: true,
    icon: SparklesIcon,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    link: '/dashboard/account',
  },
  {
    id: 'n2',
    category: 'security',
    categoryLabel: 'Keamanan',
    title: 'Domain Kustom short.link Diverifikasi',
    description: 'Sertifikat SSL dan verifikasi DNS domain kustom short.link telah diselesaikan.',
    time: '45 menit yang lalu',
    unread: true,
    icon: ShieldCheckIcon,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    link: '/dashboard/workspace/settings',
  },
  {
    id: 'n3',
    category: 'analytics',
    categoryLabel: 'Analytics',
    title: 'Lonjakan Trafik Tautan Promo Kampanye',
    description: 'Tautan promo-september menerima 1,240 klik dalam 1 jam terakhir.',
    time: '2 jam yang lalu',
    unread: true,
    icon: BarChart3Icon,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    link: '/dashboard/analytics',
  },
  {
    id: 'n4',
    category: 'security',
    categoryLabel: 'Keamanan',
    title: 'Sesi Login Baru Terdeteksi',
    description: 'Login dari IP 182.253.110.4 (Jakarta, Indonesia) via Google OAuth.',
    time: '5 jam yang lalu',
    unread: false,
    icon: KeyRoundIcon,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    link: '/dashboard/account',
  },
  {
    id: 'n5',
    category: 'system',
    categoryLabel: 'Sistem',
    title: 'Batas Kuota Simpanan Tautan 80%',
    description: 'Workspace Anda telah menggunakan 800 dari 1,000 kuota tautan singkat.',
    time: '1 hari yang lalu',
    unread: false,
    icon: AlertTriangleIcon,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    link: '/dashboard/urls',
  },
  {
    id: 'n6',
    category: 'system',
    categoryLabel: 'Sistem',
    title: 'Pembaruan Kebijakan Keamanan CSP',
    description: 'Pengaturan Content Security Policy diperbarui untuk mendukung S3 storage lokal.',
    time: '2 hari yang lalu',
    unread: false,
    icon: ShieldCheckIcon,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    link: '/dashboard',
  },
];

const MORE_NOTIFICATIONS_BATCH_1 = [
  {
    id: 'n7',
    category: 'analytics',
    categoryLabel: 'Analytics',
    title: 'Laporan Performa Tautan Mingguan',
    description: 'Total klik meningkat 18% dibandingkan minggu lalu. Rincian geografis tersedia.',
    time: '3 hari yang lalu',
    unread: false,
    icon: BarChart3Icon,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    link: '/dashboard/analytics',
  },
  {
    id: 'n8',
    category: 'security',
    categoryLabel: 'Keamanan',
    title: 'Anggota Baru Bergabung ke Workspace',
    description: 'Budi Santoso (budi@example.com) telah menerima undangan sebagai Editor.',
    time: '4 hari yang lalu',
    unread: false,
    icon: ShieldCheckIcon,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    link: '/dashboard/workspace/members',
  },
  {
    id: 'n9',
    category: 'system',
    categoryLabel: 'Sistem',
    title: 'Pembersihan Otomatis Cache Redis',
    description: 'Proses pembersihan rutin cache tautan kedaluwarsa telah selesai dengan sukses.',
    time: '5 hari yang lalu',
    unread: false,
    icon: SparklesIcon,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    link: '/dashboard',
  },
];

export default function NotificationsPage() {
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS);
  const [filterTab, setFilterTab] = useState('all'); // all, unread, system, security, analytics
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTargetRef = useRef(null);

  const unreadCount = items.filter((n) => n.unread).length;

  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    setTimeout(() => {
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = MORE_NOTIFICATIONS_BATCH_1.filter((i) => !existingIds.has(i.id));
        if (newItems.length === 0) {
          setHasMore(false);
          return prev;
        }
        return [...prev, ...newItems];
      });
      setIsLoadingMore(false);
    }, 800);
  }, [isLoadingMore, hasMore]);

  // Infinite scroll observer setup
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreItems]);

  const handleMarkAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    toast.success('Semua notifikasi ditandai sebagai dibaca');
  };

  const handleClearRead = () => {
    setItems((prev) => prev.filter((item) => item.unread));
    toast.info('Notifikasi yang sudah dibaca telah dibersihkan');
  };

  const handleToggleSingleRead = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: !item.unread } : item))
    );
  };

  const handleDeleteSingle = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Notifikasi dihapus');
  };

  const filteredItems = items.filter((item) => {
    if (filterTab === 'unread' && !item.unread) return false;
    if (filterTab === 'system' && item.category !== 'system') return false;
    if (filterTab === 'security' && item.category !== 'security') return false;
    if (filterTab === 'analytics' && item.category !== 'analytics') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      <DynamicPageHeader
        title="Pusat Notifikasi"
        subtitle="Kelola seluruh pemberitahuan sistem, aktivitas keamanan, dan analitik platform"
        fallbackIcon={BellIcon}
      />

      {/* Control Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto">
          {[
            { id: 'all', label: 'Semua', count: items.length },
            { id: 'unread', label: 'Belum Dibaca', count: unreadCount },
            { id: 'system', label: 'Sistem' },
            { id: 'security', label: 'Keamanan' },
            { id: 'analytics', label: 'Analytics' },
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
              placeholder="Cari notifikasi..."
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
              title="Tandai Semua Dibaca"
            >
              <CheckCheckIcon className="size-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Tandai Dibaca</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
            title="Bersihkan Yang Dibaca"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <InboxIcon className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Tidak Ada Notifikasi</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tidak ada riwayat pemberitahuan yang sesuai dengan filter atau kata kunci pencarian Anda.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const IconComp = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`group relative p-4 rounded-xl border transition-all duration-200 bg-card hover:border-border/90 ${
                  item.unread
                    ? 'border-border/80 bg-primary/[0.03] dark:bg-primary/[0.06]'
                    : 'border-border/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon Badge */}
                  <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>
                    <IconComp className="size-4" />
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.unread && (
                          <span className="size-2 rounded-full bg-primary shrink-0" title="Belum dibaca" />
                        )}
                        <span className={`text-xs font-semibold truncate ${item.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                          {item.categoryLabel}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {item.time}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>

                    {/* Action Links */}
                    <div className="flex items-center gap-3 pt-2">
                      {item.link && (
                        <Link
                          to={item.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Buka Halaman
                          <ArrowUpRightIcon className="size-3" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSingleRead(item.id)}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        {item.unread ? 'Tandai Dibaca' : 'Tandai Belum Dibaca'}
                      </button>
                    </div>
                  </div>

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSingle(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 cursor-pointer"
                    title="Hapus Notifikasi"
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
              <span>Memuat notifikasi lebih lama...</span>
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
            Muat Notifikasi Lainnya
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            Semua notifikasi telah ditampilkan.
          </p>
        )}
      </div>
    </div>
  );
}
