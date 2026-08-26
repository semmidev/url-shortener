import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Plus, Shield, Check, Save, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminRoles, getAdminPermissions, createAdminRole, updateRolePermissions } from '../api';
import PermissionGuard from '@/components/PermissionGuard';
import { useI18n } from '@/context/I18nContext';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useI18n();

  // New Role Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', display_name: '', description: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        getAdminRoles(),
        getAdminPermissions()
      ]);
      const rolesArr = Array.isArray(rolesData) ? rolesData : [];
      const permsArr = Array.isArray(permsData) ? permsData : [];
      setRoles(rolesArr);
      setPermissions(permsArr);

      if (rolesArr.length > 0 && !selectedRole) {
        setSelectedRole(rolesArr[0]);
        setSelectedPerms(new Set(rolesArr[0].permissions?.map(p => p.code) || []));
      }
    } catch (err) {
      toast.error('Failed to load RBAC configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setSelectedPerms(new Set(role.permissions?.map(p => p.code) || []));
  };

  const togglePermission = (code) => {
    if (selectedRole?.name === 'superadmin') {
      toast.info('Superadmin role holds absolute permissions and cannot be restricted');
      return;
    }
    const next = new Set(selectedPerms);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedPerms(next);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      await updateRolePermissions(selectedRole.id, Array.from(selectedPerms));
      toast.success(t('adminPages.roles.updateSuccess'));
      fetchData();
    } catch (err) {
      toast.error('Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await createAdminRole(newRoleForm);
      toast.success(t('adminPages.roles.createSuccess'));
      setIsCreateOpen(false);
      setNewRoleForm({ name: '', display_name: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    }
  };

  // Group permissions by module
  const groupedPerms = permissions.reduce((acc, p) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title={t('adminPages.roles.title')}
        subtitle={t('adminPages.roles.subtitle')}
        fallbackIcon={KeyRound}
      >
        <PermissionGuard permission="roles.create">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('adminPages.roles.createRoleBtn')}
          </button>
        </PermissionGuard>
      </DynamicPageHeader>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{t('adminPages.roles.rolesListTitle')}</h2>
          <div className="space-y-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRole(r)}
                className={`w-full p-4 rounded-xl text-left border transition-all ${
                  selectedRole?.id === r.id
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{r.display_name}</span>
                  {r.is_system && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">System</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description || r.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Grid Editor */}
        <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6 shadow-sm space-y-6">
          {selectedRole ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Permission Matrix for: <span className="text-primary">{selectedRole.display_name}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">{selectedRole.description}</p>
                </div>
                <PermissionGuard permission="roles.permissions.update">
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving || selectedRole.name === 'superadmin'}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Save className="w-4 h-4" />
                    Save Matrix
                  </button>
                </PermissionGuard>
              </div>

              {selectedRole.name === 'superadmin' && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  Superadmin role has full absolute access across all API endpoints automatically.
                </div>
              )}

              {/* Grouped Permissions Table */}
              <div className="space-y-6">
                {Object.entries(groupedPerms).map(([moduleName, perms]) => (
                  <div key={moduleName} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">
                      Module: {moduleName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((p) => {
                        const isChecked = selectedPerms.has(p.code);
                        return (
                          <label
                            key={p.id}
                            onClick={() => togglePermission(p.code)}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-colors ${
                              isChecked
                                ? 'bg-primary/5 border-primary/40 text-foreground'
                                : 'bg-background border-border/60 text-muted-foreground hover:border-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-foreground">{p.code}</div>
                              <div className="text-[11px] text-muted-foreground">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-muted-foreground">Select a role to edit permissions matrix.</div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <h3 className="text-lg font-bold text-foreground">Create Custom Role</h3>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role Identifier (snake_case)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., link_moderator"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    className="w-full mt-1 p-2.5 text-sm rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Link Moderator"
                    value={newRoleForm.display_name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, display_name: e.target.value })}
                    className="w-full mt-1 p-2.5 text-sm rounded-lg bg-background border border-border"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of role responsibilities..."
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                    className="w-full mt-1 p-2.5 text-sm rounded-lg bg-background border border-border"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium">Create Role</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
