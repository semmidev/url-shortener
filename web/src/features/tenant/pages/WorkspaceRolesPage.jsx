import React, { useEffect, useState, useMemo } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  KeyRound, Plus, ShieldCheck, Trash2, CheckCircle2, ShieldAlert,
  Search, X, Check, Link2, BarChart3, Users, Filter, CheckSquare, Square, RefreshCw
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
  { code: 'urls.read', label: 'Melihat Link (URLs)', description: 'Melihat daftar dan rincian link singkat yang ada', module: 'urls' },
  { code: 'urls.create', label: 'Membuat Link Singkat', description: 'Membuat link singkat baru untuk workspace', module: 'urls' },
  { code: 'urls.update', label: 'Mengedit Detail Link', description: 'Memperbarui informasi, target URL, atau slug link', module: 'urls' },
  { code: 'urls.delete', label: 'Menghapus Link', description: 'Menghapus link dari workspace', module: 'urls' },
  { code: 'analytics.read', label: 'Melihat Analitik Traffic', description: 'Mengakses statistik klik, geo-location, dan referer link', module: 'analytics' },
  { code: 'tenants.members.manage', label: 'Mengelola Anggota Workspace', description: 'Mengundang, mengedit peran, atau mengeluarkan anggota', module: 'workspace' },
  { code: 'roles.read', label: 'Melihat Peran & Izin', description: 'Melihat daftar peran dan hak akses dalam workspace', module: 'roles' },
  { code: 'roles.create', label: 'Membuat Peran Custom', description: 'Membuat peran custom baru dengan kombinasi izin spesifik', module: 'roles' },
  { code: 'roles.permissions.update', label: 'Mengubah Matriks Izin Peran', description: 'Mengedit daftar izin pada peran yang ada', module: 'roles' },
];

const MODULE_METADATA = {
  urls: {
    title: 'Manajemen Link',
    icon: Link2,
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    description: 'Kontrol akses pembuatan dan pengelolaan link singkat'
  },
  analytics: {
    title: 'Analitik & Traffic',
    icon: BarChart3,
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    description: 'Kontrol akses melihat data performa dan pengunjung link'
  },
  workspace: {
    title: 'Anggota & Workspace',
    icon: Users,
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    description: 'Kontrol akses penggalangan anggota tim dan struktur workspace'
  },
  roles: {
    title: 'Peran & Hak Akses (RBAC)',
    icon: ShieldCheck,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    description: 'Kontrol akses konfigurasi matriks keamanan dan izin sistem'
  },
};

function PermissionMatrixSelector({ selectedPermissions, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModuleFilter, setActiveModuleFilter] = useState('all');

  const filteredPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.filter((perm) => {
      const matchesSearch =
        perm.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (perm.description && perm.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesModule = activeModuleFilter === 'all' || perm.module === activeModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [searchQuery, activeModuleFilter]);

  const groupedPermissions = useMemo(() => {
    const groups = {};
    filteredPermissions.forEach((perm) => {
      if (!groups[perm.module]) {
        groups[perm.module] = [];
      }
      groups[perm.module].push(perm);
    });
    return groups;
  }, [filteredPermissions]);

  const togglePermission = (code) => {
    if (selectedPermissions.includes(code)) {
      onChange(selectedPermissions.filter((p) => p !== code));
    } else {
      onChange([...selectedPermissions, code]);
    }
  };

  const handleSelectAll = () => {
    const allCodes = AVAILABLE_PERMISSIONS.map((p) => p.code);
    onChange(allCodes);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const handleToggleModule = (moduleKey) => {
    const modulePerms = AVAILABLE_PERMISSIONS.filter((p) => p.module === moduleKey).map((p) => p.code);
    const allSelected = modulePerms.every((code) => selectedPermissions.includes(code));

    if (allSelected) {
      onChange(selectedPermissions.filter((code) => !modulePerms.includes(code)));
    } else {
      const newSelected = new Set([...selectedPermissions, ...modulePerms]);
      onChange(Array.from(newSelected));
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Search & Global Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari izin berdasarkan nama atau kode (e.g. urls.create)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs gap-1.5 h-9 cursor-pointer"
          >
            <CheckSquare className="size-3.5 text-primary" />
            Pilih Semua
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            className="text-xs gap-1.5 h-9 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Square className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Module Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveModuleFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
            activeModuleFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
              : 'bg-background hover:bg-muted text-muted-foreground border-border'
          }`}
        >
          Semua Modul ({AVAILABLE_PERMISSIONS.length})
        </button>

        {Object.keys(MODULE_METADATA).map((modKey) => {
          const meta = MODULE_METADATA[modKey];
          const modPerms = AVAILABLE_PERMISSIONS.filter((p) => p.module === modKey);
          const selectedCount = modPerms.filter((p) => selectedPermissions.includes(p.code)).length;
          const isActive = activeModuleFilter === modKey;

          return (
            <button
              key={modKey}
              type="button"
              onClick={() => setActiveModuleFilter(modKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
              }`}
            >
              {meta.title}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {selectedCount}/{modPerms.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grouped Permission Lists */}
      <div className="space-y-4 h-[380px] sm:h-[420px] overflow-y-auto pr-1.5">
        {Object.keys(groupedPermissions).length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <Filter className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Tidak ada izin yang cocok</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Coba gunakan kata kunci pencarian atau filter yang berbeda.</p>
          </div>
        ) : (
          Object.keys(groupedPermissions).map((modKey) => {
            const meta = MODULE_METADATA[modKey] || { title: modKey, icon: KeyRound, badgeColor: 'bg-muted' };
            const ModuleIcon = meta.icon;
            const perms = groupedPermissions[modKey];
            const allModulePerms = AVAILABLE_PERMISSIONS.filter((p) => p.module === modKey);
            const moduleSelectedCount = allModulePerms.filter((p) => selectedPermissions.includes(p.code)).length;
            const isModuleAllSelected = moduleSelectedCount === allModulePerms.length && allModulePerms.length > 0;

            return (
              <div key={modKey} className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-2xs">
                {/* Module Group Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border ${meta.badgeColor}`}>
                      <ModuleIcon className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{meta.title}</h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {moduleSelectedCount}/{allModulePerms.length} terpilih
                        </Badge>
                      </div>
                      {meta.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{meta.description}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleModule(modKey)}
                    className="text-xs cursor-pointer hover:bg-muted text-primary hover:text-primary h-8 px-2.5 font-medium"
                  >
                    {isModuleAllSelected ? 'Batal Pilih Modul' : 'Pilih Modul Ini'}
                  </Button>
                </div>

                {/* Module Permissions Grid */}
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {perms.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.code);
                    return (
                      <div
                        key={perm.code}
                        onClick={() => togglePermission(perm.code)}
                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-primary/5 border-primary/40 shadow-2xs'
                            : 'bg-background hover:bg-muted/40 border-border/80 hover:border-border'
                        }`}
                      >
                        <div
                          className={`mt-0.5 size-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40 group-hover:border-primary/60'
                          }`}
                        >
                          {isChecked && <Check className="size-3 stroke-[3]" />}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {perm.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/80 mt-0.5 block truncate">
                            {perm.code}
                          </span>
                          {perm.description && (
                            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl max-w-3xl w-full h-[680px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col my-auto"
            >
              <div className="p-6 border-b border-border/70 bg-muted/20 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <KeyRound className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Buat Peran Custom</h3>
                    <p className="text-xs text-muted-foreground">Tentukan nama, deskripsi, dan matriks izin untuk peran baru</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <label className="text-xs font-semibold text-foreground block">Matriks Izin Akses</label>
                    <PermissionMatrixSelector
                      selectedPermissions={createForm.permissions}
                      onChange={(perms) => setCreateForm({ ...createForm, permissions: perms })}
                    />
                  </div>
                </div>

                <div className="p-4 px-6 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{createForm.permissions.length}</span> dari <span className="font-bold text-foreground">{AVAILABLE_PERMISSIONS.length}</span> izin dipilih
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={actionLoading} className="gap-2 cursor-pointer">
                      {actionLoading ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Membuat...
                        </>
                      ) : (
                        'Buat Peran'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedRole && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl max-w-3xl w-full h-[680px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col my-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border/70 bg-muted/20 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">Edit Matriks Izin</h3>
                      <Badge variant={selectedRole.is_system ? 'secondary' : 'outline'} className="capitalize text-xs font-semibold">
                        {selectedRole.display_name || selectedRole.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atur hak akses & kapabilitas fitur untuk peran <span className="font-semibold text-foreground">{selectedRole.display_name || selectedRole.name}</span> dalam workspace ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <PermissionMatrixSelector
                  selectedPermissions={editPermissions}
                  onChange={setEditPermissions}
                />
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{editPermissions.length}</span> dari <span className="font-bold text-foreground">{AVAILABLE_PERMISSIONS.length}</span> izin dipilih
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="cursor-pointer">
                    Batal
                  </Button>
                  <Button onClick={handleSavePermissions} disabled={actionLoading} className="gap-2 cursor-pointer">
                    {actionLoading ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Simpan Matriks Izin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
