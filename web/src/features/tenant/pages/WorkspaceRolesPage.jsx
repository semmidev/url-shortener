import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  KeyRound, Plus, ShieldCheck, Trash2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import {
  getTenantRoles,
  createTenantRole,
  updateTenantRolePermissions,
  deleteTenantRole
} from '../api';
import PermissionGuard from '@/components/PermissionGuard';

const AVAILABLE_PERMISSIONS = [
  { code: 'urls.read', label: 'Melihat Link (URLs)', module: 'urls' },
  { code: 'urls.create', label: 'Membuat Link Singkat', module: 'urls' },
  { code: 'urls.update', label: 'Mengedit Detail Link', module: 'urls' },
  { code: 'urls.delete', label: 'Menghapus Link', module: 'urls' },
  { code: 'analytics.read', label: 'Melihat Analitik Traffic', module: 'analytics' },
  { code: 'tenants.members.manage', label: 'Mengelola Anggota Workspace', module: 'workspace' },
  { code: 'roles.read', label: 'Melihat Peran & Izin', module: 'roles' },
  { code: 'roles.create', label: 'Membuat Peran Custom', module: 'roles' },
  { code: 'roles.permissions.update', label: 'Mengubah Matriks Izin Peran', module: 'roles' },
];

export default function WorkspaceRolesPage() {
  const { activeTenant } = useTenant();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', display_name: '', description: '', permissions: [] });
  const [selectedRole, setSelectedRole] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRoles = async () => {
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      const data = await getTenantRoles(activeTenant.id);
      setRoles(data || []);
    } catch (err) {
      toast.error('Gagal memuat daftar peran workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [activeTenant?.id]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.display_name.trim()) return;
    setActionLoading(true);
    try {
      await createTenantRole(activeTenant.id, {
        name: createForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
        display_name: createForm.display_name.trim(),
        description: createForm.description.trim(),
        permissions: createForm.permissions,
      });
      toast.success(`Peran "${createForm.display_name}" berhasil dibuat!`);
      setCreateForm({ name: '', display_name: '', description: '', permissions: [] });
      setIsCreateModalOpen(false);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat peran custom');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      await updateTenantRolePermissions(activeTenant.id, selectedRole.id, editPermissions);
      toast.success(`Izin untuk peran "${selectedRole.display_name || selectedRole.name}" berhasil diperbarui`);
      setIsEditModalOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui izin peran');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus peran "${role.display_name || role.name}"?`)) return;
    try {
      await deleteTenantRole(activeTenant.id, role.id);
      toast.success('Peran berhasil dihapus');
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus peran');
    }
  };

  const togglePermissionInCreate = (code) => {
    setCreateForm((prev) => {
      const exists = prev.permissions.includes(code);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((p) => p !== code) : [...prev.permissions, code],
      };
    });
  };

  const togglePermissionInEdit = (code) => {
    setEditPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  return (
    <div className="space-y-6">
      <DynamicPageHeader
        title="Peran & Matriks Akses"
        subtitle={`Kelola daftar peran dan izin fitur untuk anggota di workspace "${activeTenant?.name || 'Aktif'}"`}
        fallbackIcon={KeyRound}
        actions={
          <PermissionGuard permission="roles.create">
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 cursor-pointer shadow-xs">
              <Plus className="size-4" />
              Buat Peran Custom
            </Button>
          </PermissionGuard>
        }
      />

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const isSystem = role.is_system;
          const isOwner = role.name === 'owner';
          const perms = role.permissions || [];

          return (
            <Card key={role.id} className="border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={isOwner ? 'default' : isSystem ? 'secondary' : 'outline'}
                    className="px-2.5 py-0.5 capitalize text-xs font-semibold"
                  >
                    {isOwner && <ShieldAlert className="size-3 mr-1 text-amber-500" />}
                    {isSystem ? 'Peran Bawaan' : 'Peran Custom'}
                  </Badge>
                  {!isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(role)}
                      className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-lg font-bold pt-1">{role.display_name || role.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">
                  {role.description || `Peran ${role.name} dalam workspace.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {perms.length > 0 ? `${perms.length} Izin Aktif` : 'Semua Izin Aktif'}
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {perms.length > 0 ? (
                      perms.map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px] px-2 py-0">
                          {p}
                        </Badge>
                      ))
                    ) : isOwner ? (
                      <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Semua Fitur & Administrasi
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Belum ada izin</span>
                    )}
                  </div>
                </div>

                <PermissionGuard permission="roles.permissions.update">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setEditPermissions(role.permissions || []);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full mt-2 gap-1.5 cursor-pointer text-xs"
                  >
                    <ShieldCheck className="size-3.5" />
                    Edit Matriks Izin
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Custom Role Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Buat Peran Custom</h3>
                  <p className="text-xs text-muted-foreground">Tentukan nama dan kumpulan izin untuk peran baru</p>
                </div>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nama Tampilan (Display Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Editor Link"
                    value={createForm.display_name}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        display_name: e.target.value,
                        name: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Deskripsi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Anggota yang hanya bisa membuat dan mengedit link"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-foreground block">Matriks Izin Akses</label>
                  <div className="space-y-1.5 bg-muted/30 border border-border/50 rounded-xl p-3 max-h-48 overflow-y-auto">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isChecked = createForm.permissions.includes(perm.code);
                      return (
                        <label
                          key={perm.code}
                          className="flex items-center gap-2.5 p-1.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermissionInCreate(perm.code)}
                            className="size-4 rounded border-border text-primary focus:ring-primary/30"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-foreground">{perm.label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{perm.code}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading ? 'Membuat...' : 'Buat Peran'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedRole && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-foreground">Edit Matriks Izin</h3>
              <p className="text-xs text-muted-foreground">
                Perbarui izin akses untuk peran <span className="font-semibold text-foreground">{selectedRole.display_name || selectedRole.name}</span>
              </p>

              <div className="space-y-1.5 bg-muted/30 border border-border/50 rounded-xl p-3 max-h-64 overflow-y-auto pt-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = editPermissions.includes(perm.code);
                  return (
                    <label
                      key={perm.code}
                      className="flex items-center gap-2.5 p-1.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermissionInEdit(perm.code)}
                        className="size-4 rounded border-border text-primary focus:ring-primary/30"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-foreground">{perm.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{perm.code}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSavePermissions} disabled={actionLoading}>
                  {actionLoading ? 'Menyimpan...' : 'Simpan Izin'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
