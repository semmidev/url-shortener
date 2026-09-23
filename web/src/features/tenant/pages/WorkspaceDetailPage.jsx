import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, ArrowLeft, Key, Copy, Check, Users, ShieldCheck,
  Calendar, CheckCircle2, Pencil, LogOut, Trash2, Globe, KeyRound, Loader2, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { useAuthStore } from '@/features/auth/store';
import { usePermission } from '@/hooks/usePermission';
import { getTenant, getTenantMembers, getTenantRoles, updateTenant, deleteTenant, leaveTenant, regenerateJoinCode } from '../api';

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { hasPermission } = usePermission();
  const { activeTenant, selectTenant, refreshTenants } = useTenant();

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWorkspaceDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [wsData, membersData, rolesData] = await Promise.all([
        getTenant(id).catch(() => null),
        getTenantMembers(id).catch(() => []),
        getTenantRoles(id).catch(() => []),
      ]);

      if (wsData) {
        setWorkspace(wsData);
        setEditName(wsData.name || '');
      }
      setMembers(membersData || []);
      setRoles(rolesData || []);
    } catch {
      toast.error("Gagal memuat detail workspace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceDetail();
  }, [id]);

  const handleCopyCode = () => {
    if (!workspace?.join_code) return;
    navigator.clipboard.writeText(workspace.join_code);
    setCopiedCode(true);
    toast.success("Kode join tersalin ke clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!workspace?.id) return;
    setActionLoading(true);
    try {
      const updated = await regenerateJoinCode(workspace.id);
      setWorkspace(updated);
      toast.success("Kode join baru berhasil dibuat");
      refreshTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat kode join baru");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEditName = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !workspace?.id) return;
    setActionLoading(true);
    try {
      const updated = await updateTenant(workspace.id, { name: editName.trim() });
      setWorkspace((prev) => ({ ...prev, name: updated.name || editName.trim() }));
      toast.success("Nama workspace berhasil diperbarui");
      setIsEditModalOpen(false);
      refreshTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui nama workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (!workspace?.id || !user?.id) return;
    setActionLoading(true);
    const wasActive = activeTenant?.id === workspace.id;
    const leavingId = workspace.id;
    try {
      await leaveTenant(leavingId, user.id);
      toast.success(`Anda telah keluar dari workspace "${workspace.name}"`);
      const updatedList = await refreshTenants();
      if (wasActive && updatedList && updatedList.length > 0) {
        const nextTenant = updatedList.find((t) => t.id !== leavingId) || updatedList[0];
        if (nextTenant) selectTenant(nextTenant);
      }
      navigate('/dashboard/account/workspaces');
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal keluar dari workspace");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!workspace?.id) return;
    setActionLoading(true);
    const wasActive = activeTenant?.id === workspace.id;
    const deletingId = workspace.id;
    try {
      await deleteTenant(deletingId);
      toast.success(`Workspace "${workspace.name}" berhasil dihapus`);
      const updatedList = await refreshTenants();
      if (wasActive && updatedList && updatedList.length > 0) {
        const nextTenant = updatedList.find((t) => t.id !== deletingId) || updatedList[0];
        if (nextTenant) selectTenant(nextTenant);
      }
      navigate('/dashboard/account/workspaces');
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus workspace");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Memuat detail workspace...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/account/workspaces')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Workspace Saya
        </Button>
        <Card className="p-8 text-center">
          <CardTitle className="text-lg">Workspace Tidak Ditemukan</CardTitle>
          <CardDescription className="mt-1 text-sm">
            Workspace ini tidak ada atau Anda tidak memiliki akses ke dalamnya.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const isActive = activeTenant?.id === workspace.id;
  const isOwner = workspace.role === 'owner';
  const isAdmin = workspace.role === 'admin';
  const canEdit = isOwner || hasPermission('tenants.update');

  return (
    <div className="space-y-6">
      <DynamicPageHeader
        title={workspace.name}
        subtitle={`Detail informasi & pengelolaan workspace (slug: ${workspace.slug})`}
        fallbackIcon={Building2}
        breadcrumb={[
          { label: 'Dasbor', href: '/dashboard' },
          { label: 'Workspace Saya', href: '/dashboard/account/workspaces' },
          { label: workspace.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/account/workspaces')}
              className="cursor-pointer gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>

            {!isActive && (
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer gap-1.5"
                onClick={() => {
                  selectTenant(workspace);
                  toast.success(`Berhasil beralih ke workspace "${workspace.name}"`);
                }}
              >
                <CheckCircle2 className="w-4 h-4" /> Beralih Ke Sini
              </Button>
            )}

            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="cursor-pointer gap-1.5">
                <Pencil className="w-4 h-4" /> Edit Nama
              </Button>
            )}

            {!isOwner && (
              <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(true)} className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer gap-1.5">
                <LogOut className="w-4 h-4" /> Keluar Workspace
              </Button>
            )}

            {isOwner && !workspace.is_default && (
              <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="cursor-pointer gap-1.5">
                <Trash2 className="w-4 h-4" /> Hapus Workspace
              </Button>
            )}
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Identity & Role */}
        <Card border="border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Peran & Akses</CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Badge variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'} className="text-xs uppercase px-2.5 py-0.5 font-bold">
                  {workspace.role || 'member'}
                </Badge>
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-muted-foreground">
            {isOwner ? "Pemilik penuh workspace" : isAdmin ? "Administrator workspace" : "Anggota workspace"}
          </CardContent>
        </Card>

        {/* Card 2: Join Code */}
        <Card border="border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Kode Join</CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-xl font-mono font-bold tracking-wider text-foreground">
                {workspace.join_code || '-'}
              </CardTitle>
              <div className="flex items-center gap-1">
                {workspace.join_code && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleCopyCode} title="Salin Kode Join">
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                )}
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleRegenerateCode} title="Buat Ulang Kode Join">
                    <Key className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-muted-foreground">
            Gunakan kode ini untuk mengundang anggota lain bergabung.
          </CardContent>
        </Card>

        {/* Card 3: Total Members & Created Date */}
        <Card border="border">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Anggota</CardDescription>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-2xl font-extrabold text-foreground">
                {members.length} <span className="text-sm font-normal text-muted-foreground">Orang</span>
              </CardTitle>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Dibuat pada {new Date(workspace.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="info" className="cursor-pointer gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Informasi Workspace
          </TabsTrigger>
          <TabsTrigger value="members" className="cursor-pointer gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Daftar Anggota ({members.length})
          </TabsTrigger>
          <TabsTrigger value="navigation" className="cursor-pointer gap-1.5 text-xs">
            <Globe className="w-3.5 h-3.5" /> Pintasan Navigasi
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Info */}
        <TabsContent value="info">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold">Atribut & Spesifikasi Workspace</CardTitle>
              <CardDescription className="text-xs">
                Detail teknis identitas dan konfigurasi workspace Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase">ID Workspace</span>
                  <div className="font-mono text-foreground select-all break-all">{workspace.id}</div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase">Nama Tampilan</span>
                  <div className="font-semibold text-foreground">{workspace.name}</div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase">Slug Identifier</span>
                  <div className="font-mono text-foreground">slug: {workspace.slug}</div>
                </div>
                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase">Kode Undangan (Join Code)</span>
                  <div className="font-mono font-bold text-foreground">{workspace.join_code || 'Tidak ada'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Members List */}
        <TabsContent value="members">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Anggota Tim Workspace</CardTitle>
                <CardDescription className="text-xs">
                  Daftar pengguna yang memiliki akses ke workspace ini.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/workspace/members">
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Kelola Anggota
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {members.map((m) => (
                  <div key={m.user_id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                        {(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">{m.full_name || m.email}</span>
                        <span className="text-[11px] text-muted-foreground">{m.email}</span>
                      </div>
                    </div>
                    <Badge variant={m.role === 'owner' ? 'default' : m.role === 'admin' ? 'secondary' : 'outline'} className="text-[10px] font-bold uppercase">
                      {m.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Quick Navigation */}
        <TabsContent value="navigation">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/workspace/links')}>
              <CardHeader className="p-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                  <Globe className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold">Tautan Tim</CardTitle>
                <CardDescription className="text-xs">Kelola semua link singkat yang dimiliki workspace ini.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/workspace/members')}>
              <CardHeader className="p-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold">Anggota & Peran</CardTitle>
                <CardDescription className="text-xs">Undang anggota baru dan atur hak akses tim.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/workspace/roles')}>
              <CardHeader className="p-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2">
                  <KeyRound className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold">Matriks RBAC</CardTitle>
                <CardDescription className="text-xs">Atur konfigurasi peran kustom dan matriks hak akses.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Name Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Nama Workspace</DialogTitle>
            <DialogDescription>Masukkan nama tampilan baru untuk workspace ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEditName} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Workspace</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nama workspace baru..."
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={actionLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={actionLoading || !editName.trim()}>
                {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Workspace Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keluar dari Workspace?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari <strong>"{workspace.name}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)} disabled={actionLoading}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmLeave} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Workspace Permanen?</DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini tidak dapat dibatalkan. Semua data workspace <strong>"{workspace.name}"</strong> akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
