import React, { useEffect, useState, useMemo } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, UserPlus, Key, ShieldCheck,
  UserX, EllipsisVertical, Copy, Check, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { usePermission } from '@/hooks/usePermission';
import { useI18n } from '@/context/I18nContext';
import {
  getTenantMembers,
  addTenantMember,
  updateTenantMemberRole,
  removeTenantMember,
  getTenantRoles
} from '../api';
import PermissionGuard from '@/components/PermissionGuard';

export default function WorkspaceMembersPage() {
  const { activeTenant } = useTenant();
  const { hasPermission } = usePermission();
  const { t } = useI18n();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Search & Filter & Sort state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', role: 'member' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalType, setModalType] = useState(null); // 'role' | 'remove'
  const [newRole, setNewRole] = useState('member');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembersAndRoles = async () => {
    if (!activeTenant?.id) return;
    setIsLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        getTenantMembers(activeTenant.id),
        getTenantRoles(activeTenant.id)
      ]);
      setMembers(membersData || []);
      setRoles(rolesData || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersAndRoles();
  }, [activeTenant?.id]);

  const handleCopyJoinCode = () => {
    if (!activeTenant?.join_code) return;
    navigator.clipboard.writeText(activeTenant.join_code);
    setCopiedCode(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopiedCode(false), 2000);
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

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addForm.email.trim()) return;
    setActionLoading(true);
    try {
      await addTenantMember(activeTenant.id, addForm.email.trim(), addForm.role);
      toast.success(t('workspace.memberAddedSuccess', { email: addForm.email }));
      setAddForm({ email: '', role: 'member' });
      setIsAddModalOpen(false);
      fetchMembersAndRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      await updateTenantMemberRole(activeTenant.id, selectedMember.user_id, newRole);
      toast.success(t('workspace.roleUpdatedSuccess'));
      setModalType(null);
      setSelectedMember(null);
      fetchMembersAndRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      await removeTenantMember(activeTenant.id, selectedMember.user_id);
      toast.success(t('workspace.memberRemovedSuccess'));
      setModalType(null);
      setSelectedMember(null);
      fetchMembersAndRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkRemove = async (selectedRows) => {
    if (!selectedRows?.length) return;
    const nonOwners = selectedRows.filter((m) => m.role !== 'owner');
    if (!nonOwners.length) {
      toast.error(t('common.error'));
      return;
    }
    if (!window.confirm(t('workspace.removeConfirmDesc', { name: `${nonOwners.length} ${t('workspace.memberCol')}` }))) return;
    try {
      await Promise.all(nonOwners.map((m) => removeTenantMember(activeTenant.id, m.user_id)));
      toast.success(t('workspace.bulkRemoveSuccess', { count: nonOwners.length }));
      fetchMembersAndRoles();
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Filter & Sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.role?.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((m) => m.role === roleFilter);
    }

    result.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [members, search, roleFilter, sortBy, sortDirection]);

  // Paginated members
  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredMembers.slice(start, start + limit);
  }, [filteredMembers, page, limit]);

  const columns = [
    {
      id: 'full_name',
      accessorKey: 'full_name',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.memberCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm uppercase shrink-0">
              {u.full_name ? u.full_name.charAt(0) : u.email.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-sm truncate">{u.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate font-mono">{u.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.roleCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => {
        const role = row.original.role;
        const isOwner = role === 'owner';
        const isAdmin = role === 'admin';

        return (
          <Badge
            variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'}
            className="px-2.5 py-0.5 capitalize text-xs font-semibold"
          >
            {isOwner && <ShieldAlert className="size-3 mr-1 text-amber-500" />}
            {isAdmin && <ShieldCheck className="size-3 mr-1 text-blue-500" />}
            {role}
          </Badge>
        );
      },
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t('workspace.joinedDateCol')}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSort}
        />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(row.original.created_at).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('common.actions')}</div>,
      cell: ({ row }) => {
        const u = row.original;
        if (u.role === 'owner') return null;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground cursor-pointer">
                  <EllipsisVertical className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">{t('workspace.manageMember')}</DropdownMenuLabel>
                <PermissionGuard permission="tenants.members.manage">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedMember(u);
                      setNewRole(u.role);
                      setModalType('role');
                    }}
                    className="cursor-pointer text-xs"
                  >
                    <ShieldCheck className="size-4 mr-2 text-muted-foreground" />
                    {t('workspace.changeRole')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedMember(u);
                      setModalType('remove');
                    }}
                    className="cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <UserX className="size-4 mr-2" />
                    {t('workspace.removeMember')}
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const bulkActions = [
    ...(hasPermission('tenants.members.manage')
      ? [
          {
            label: t('workspace.removeSelected'),
            icon: UserX,
            variant: 'destructive',
            onClick: handleBulkRemove,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <DynamicPageHeader
        title={t('workspace.membersTitle')}
        subtitle={t('workspace.membersSubtitle', { name: activeTenant?.name || 'Active' })}
        fallbackIcon={Users}
      >
        <PermissionGuard permission="tenants.members.manage">
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 cursor-pointer shadow-xs">
            <UserPlus className="size-4" />
            <span>{t('workspace.addMember')}</span>
          </Button>
        </PermissionGuard>
      </DynamicPageHeader>

      {/* Join Code Quick Card */}
      {activeTenant?.join_code && (
        <div className="bg-card border border-border/60 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Key className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">{t('workspace.joinCodeCardTitle')}</h4>
              <p className="text-xs text-muted-foreground">{t('workspace.joinCodeCardDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-widest px-3 py-1 bg-muted rounded-md text-foreground border border-border">
              {activeTenant.join_code}
            </span>
            <Button variant="outline" size="sm" onClick={handleCopyJoinCode} className="gap-1.5 cursor-pointer">
              {copiedCode ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copiedCode ? t('common.copied') : t('common.copy')}
            </Button>
          </div>
        </div>
      )}

      {/* Standardized Members DataTable */}
      <DataTable
        columns={columns}
        data={paginatedMembers}
        isLoading={isLoading}
        enableSelection={true}
        page={page}
        pageSize={limit}
        totalCount={filteredMembers.length}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setLimit(newSize);
          setPage(1);
        }}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder={t('workspace.searchMembersPlaceholder')}
        filters={[
          {
            id: 'role',
            label: t('workspace.roleLabel'),
            value: roleFilter,
            onChange: (val) => {
              setRoleFilter(val);
              setPage(1);
            },
            options: [
              { label: t('workspace.allRoles'), value: 'all' },
              { label: 'Admin', value: 'admin' },
              { label: 'Member', value: 'member' },
            ],
          },
        ]}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        onRefresh={fetchMembersAndRoles}
        bulkActions={bulkActions}
      />

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{t('workspace.addMemberModalTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('workspace.addMemberModalDesc')}</p>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t('workspace.userEmail')}</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@domain.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">{t('workspace.roleLabel')}</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.display_name || r.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="owner">Owner</option>
                        <option value="member">Member</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading ? t('workspace.adding') : t('workspace.addMember')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {modalType === 'role' && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <h3 className="text-lg font-bold text-foreground">{t('workspace.changeRoleTitle')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('workspace.changeRoleDesc', { name: selectedMember.full_name || selectedMember.email })}
              </p>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-foreground">{t('workspace.newRole')}</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.display_name || r.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="owner">Owner</option>
                      <option value="member">Member</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalType(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpdateRole} disabled={actionLoading}>
                  {actionLoading ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Member Confirmation Modal */}
      <AnimatePresence>
        {modalType === 'remove' && selectedMember && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-destructive">
                <UserX className="size-6" />
                <h3 className="text-lg font-bold text-foreground">{t('workspace.removeConfirmTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('workspace.removeConfirmDesc', { name: selectedMember.full_name || selectedMember.email })}
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalType(null)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleRemoveMember} disabled={actionLoading}>
                  {actionLoading ? t('workspace.removing') : t('workspace.confirmRemove')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
