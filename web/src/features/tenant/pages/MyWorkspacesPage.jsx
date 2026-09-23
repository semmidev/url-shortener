import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Plus, Key, EllipsisVertical, Eye,
  Pencil, LogOut, Trash2, Check, Copy, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { useAuthStore } from '@/features/auth/store';
import { usePermission } from '@/hooks/usePermission';
import { useI18n } from '@/context/I18nContext';
import { useDebounce } from '@/hooks/use-debounce';
import { updateTenant, deleteTenant, leaveTenant, getUserTenants } from '../api';

export default function MyWorkspacesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { hasPermission } = usePermission();
  const {
    activeTenant,
    selectTenant,
    refreshTenants,
    openCreateModal,
    openJoinModal
  } = useTenant();

  // Data & API states
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters & Pagination & Sorting
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [editWorkspace, setEditWorkspace] = useState(null);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [leaveWorkspaceState, setLeaveWorkspaceState] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [deleteWorkspaceState, setDeleteWorkspaceState] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await getUserTenants({
        page,
        limit,
        search: debouncedSearch,
        role: roleFilter,
        sortBy,
        sortDirection,
      });
      const items = data?.items || [];
      setWorkspaces(items);

      if (data?.meta) {
        setTotal(data.meta.total || 0);
      } else {
        setTotal(items.length);
      }
    } catch {
      toast.error('Gagal memuat daftar workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [page, limit, debouncedSearch, roleFilter, sortBy, sortDirection]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const handleCopyJoinCode = (code, id) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(t('common.copied'));
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

  // Action Handlers
  const handleOpenEdit = (ws) => {
    setEditWorkspace(ws);
    setEditName(ws.name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editWorkspace?.id) return;
    setActionLoading(true);
    try {
      await updateTenant(editWorkspace.id, { name: editName.trim() });
      toast.success("Nama workspace berhasil diperbarui");
      setIsEditModalOpen(false);
      fetchWorkspaces();
      refreshTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui nama workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenLeave = (ws) => {
    setLeaveWorkspaceState(ws);
    setIsLeaveModalOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (!leaveWorkspaceState?.id || !user?.id) return;
    setActionLoading(true);
    const wasActive = activeTenant?.id === leaveWorkspaceState.id;
    const leavingId = leaveWorkspaceState.id;
    try {
      await leaveTenant(leavingId, user.id);
      toast.success(`Anda telah keluar dari workspace "${leaveWorkspaceState.name}"`);
      setIsLeaveModalOpen(false);
      fetchWorkspaces();
      const updatedList = await refreshTenants();
      if (wasActive && updatedList && updatedList.length > 0) {
        const nextTenant = updatedList.find((t) => t.id !== leavingId) || updatedList[0];
        if (nextTenant) selectTenant(nextTenant);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal keluar dari workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDelete = (ws) => {
    setDeleteWorkspaceState(ws);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteWorkspaceState?.id) return;
    setActionLoading(true);
    const wasActive = activeTenant?.id === deleteWorkspaceState.id;
    const deletingId = deleteWorkspaceState.id;
    try {
      await deleteTenant(deletingId);
      toast.success(`Workspace "${deleteWorkspaceState.name}" berhasil dihapus`);
      setIsDeleteModalOpen(false);
      fetchWorkspaces();
      const updatedList = await refreshTenants();
      if (wasActive && updatedList && updatedList.length > 0) {
        const nextTenant = updatedList.find((t) => t.id !== deletingId) || updatedList[0];
        if (nextTenant) selectTenant(nextTenant);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus workspace");
    } finally {
      setActionLoading(false);
    }
  };

  // Table Columns
  const columns = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Nama Workspace"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const ws = row.original;
        const isActive = activeTenant?.id === ws.id;
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/account/workspaces/${ws.id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors text-left cursor-pointer truncate"
                >
                  {ws.name}
                </Link>
                {ws.is_default && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10 font-medium shrink-0">
                    Default
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-600 hover:bg-emerald-600 gap-1 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Aktif
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono truncate">
                slug: {ws.slug}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Peran Anda"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const role = row.original.role || 'member';
        const isOwner = role === 'owner';
        const isAdmin = role === 'admin';
        return (
          <Badge
            variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'}
            className="text-[10px] font-bold uppercase px-2 py-0.5"
          >
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'join_code',
      header: 'Kode Join',
      cell: ({ row }) => {
        const ws = row.original;
        const isOwnerOrAdmin = ws.role === 'owner' || ws.role === 'admin';
        if (!isOwnerOrAdmin || !ws.join_code) {
          return <span className="text-xs text-muted-foreground italic">-</span>;
        }
        const isCopied = copiedId === ws.id;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="bg-muted px-2 py-0.5 rounded border border-border font-semibold">
              {ws.join_code}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => handleCopyJoinCode(ws.join_code, ws.id)}
              title="Salin Kode Join"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Tanggal Dibuat"
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.created_at;
        if (!dateStr) return <span className="text-xs text-muted-foreground">-</span>;
        const date = new Date(dateStr);
        return (
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const ws = row.original;
        const isOwner = ws.role === 'owner';
        const canEdit = isOwner || hasPermission('tenants.update');
        const isActive = activeTenant?.id === ws.id;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-pointer">
                  <EllipsisVertical className="w-4 h-4" />
                  <span className="sr-only">Menu Aksi</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">
                  Aksi Workspace
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Lihat Detail Page */}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate(`/dashboard/account/workspaces/${ws.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4 text-primary" />
                  Lihat Detail
                </DropdownMenuItem>

                {/* Switch Workspace */}
                {!isActive && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      selectTenant(ws);
                      toast.success(`Berhasil beralih ke workspace "${ws.name}"`);
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    Beralih Ke Sini
                  </DropdownMenuItem>
                )}

                {/* Edit Workspace Name */}
                {canEdit && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleOpenEdit(ws)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Nama Workspace
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Leave Workspace (Member/Admin only) */}
                {!isOwner && (
                  <DropdownMenuItem
                    className="cursor-pointer text-amber-600 focus:text-amber-600 focus:bg-amber-500/10"
                    onClick={() => handleOpenLeave(ws)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar dari Workspace
                  </DropdownMenuItem>
                )}

                {/* Delete Workspace (Owner only, non-default) */}
                {isOwner && (
                  <DropdownMenuItem
                    className={ws.is_default ? "opacity-50 cursor-not-allowed text-muted-foreground" : "cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"}
                    disabled={ws.is_default}
                    onClick={() => {
                      if (!ws.is_default) handleOpenDelete(ws);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {ws.is_default ? "Workspace Default (Tidak dapat dihapus)" : "Hapus Workspace"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <DynamicPageHeader
        title="Workspace Saya"
        subtitle="Kelola daftar semua workspace yang Anda buat atau tempat Anda terdaftar sebagai anggota."
        fallbackIcon={Building2}
        breadcrumb={[
          { label: 'Dasbor', href: '/dashboard' },
          { label: 'Pengaturan Akun', href: '/dashboard/account' },
          { label: 'Workspace Saya' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openJoinModal()} className="cursor-pointer gap-1.5">
              <Key className="w-4 h-4 text-primary" />
              Gabung Workspace
            </Button>
            <Button size="sm" onClick={() => openCreateModal()} className="cursor-pointer gap-1.5">
              <Plus className="w-4 h-4" />
              Buat Workspace Baru
            </Button>
          </div>
        }
      />

      {/* Unified DataTable with Server-Side Pagination, Filtering, Search, and Sorting */}
      <DataTable
        columns={columns}
        data={workspaces}
        isLoading={loading}
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
        searchPlaceholder="Cari nama, slug, atau kode join..."
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        onRefresh={() => {
          fetchWorkspaces();
          refreshTenants();
        }}
      />

      {/* Edit Workspace Name Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Nama Workspace</DialogTitle>
            <DialogDescription>
              Perbarui nama tampilan untuk workspace ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Workspace</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Masukkan nama workspace baru..."
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={actionLoading || !editName.trim()}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Workspace Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>Keluar dari Workspace?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari workspace <strong>"{leaveWorkspaceState?.name}"</strong>? Anda akan kehilangan akses ke tautan dan sumber daya di dalam workspace ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirmLeave} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Keluar Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle>Hapus Workspace Permanen?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>. Menghapus workspace <strong>"{deleteWorkspaceState?.name}"</strong> akan menghapus secara permanen semua tautan singkat, analitik, dan hak akses anggota di dalamnya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
