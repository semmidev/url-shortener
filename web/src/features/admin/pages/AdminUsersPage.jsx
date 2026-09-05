import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { DataTable } from '@/components/data-table';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users, Shield, Ban, CheckCircle2,
  AlertTriangle, LogOut, EllipsisVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { getAdminUsers, suspendUser, updateUserRole, revokeUserSessions } from '../api';
import PermissionGuard from '@/components/PermissionGuard';
import { useI18n } from '@/context/I18nContext';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useI18n();

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'suspend' | 'role' | 'revoke'
  const [newRole, setNewRole] = useState('user');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminUsers({ page, limit: 10, search });
      setUsers(data?.users || []);
      setMeta(data?.meta || {});
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleToggleSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await suspendUser(selectedUser.id, !selectedUser.is_suspended);
      toast.success(t('adminPages.users.statusUpdatedSuccess'));
      fetchUsers();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user suspension status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await updateUserRole(selectedUser.id, newRole);
      toast.success(t('adminPages.users.roleUpdatedSuccess'));
      fetchUsers();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await revokeUserSessions(selectedUser.id);
      toast.success(`Sessions revoked for ${selectedUser.email}`);
      closeModal();
    } catch (err) {
      toast.error('Failed to revoke sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
  };

  const handleBulkSuspend = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((u) => suspendUser(u.id, true)));
      toast.success(`Suspended ${selectedRows.length} users`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to suspend selected users');
    }
  };

  const handleBulkUnsuspend = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((u) => suspendUser(u.id, false)));
      toast.success(`Unsuspended ${selectedRows.length} users`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to unsuspend selected users');
    }
  };

  const handleBulkRevokeSessions = async (selectedRows) => {
    try {
      await Promise.all(selectedRows.map((u) => revokeUserSessions(u.id)));
      toast.success(`Revoked active sessions for ${selectedRows.length} users`);
    } catch (err) {
      toast.error('Failed to revoke sessions for selected users');
    }
  };

  // Filter users client side if role or status filter selected
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && u.is_suspended) return false;
    if (statusFilter === 'suspended' && !u.is_suspended) return false;
    return true;
  });

  const columns = [
    {
      accessorKey: 'full_name',
      header: 'User Info',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div>
            <div className="font-semibold text-foreground">{u.full_name || 'N/A'}</div>
            <div className="text-xs text-muted-foreground">{u.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'System Role',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            u.role === 'superadmin'
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              : u.role === 'admin'
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
          }`}>
            <Shield className="w-3 h-3" />
            {u.role}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_suspended',
      header: 'Account Status',
      cell: ({ row }) => {
        const u = row.original;
        return u.is_suspended ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
            <Ban className="w-3 h-3" />
            Suspended
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined Date',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <EllipsisVertical className="w-4 h-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">User Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <PermissionGuard permission="users.roles.update">
                  <DropdownMenuItem
                    onClick={() => { setSelectedUser(u); setNewRole(u.role); setModalType('role'); }}
                    className="cursor-pointer text-xs"
                  >
                    <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                    Change Role
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard permission="users.sessions.revoke">
                  <DropdownMenuItem
                    onClick={() => { setSelectedUser(u); setModalType('revoke'); }}
                    className="cursor-pointer text-xs"
                  >
                    <LogOut className="w-4 h-4 mr-2 text-amber-500" />
                    Revoke Sessions
                  </DropdownMenuItem>
                </PermissionGuard>
                <PermissionGuard permission="users.suspend">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setSelectedUser(u); setModalType('suspend'); }}
                    className={`cursor-pointer text-xs ${
                      u.is_suspended
                        ? 'text-emerald-600'
                        : 'text-destructive focus:text-destructive'
                    }`}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {u.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
                  </DropdownMenuItem>
                </PermissionGuard>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <DynamicPageHeader
        title={t('adminPages.users.title')}
        subtitle={t('adminPages.users.subtitle')}
        fallbackIcon={Users}
      />

      {/* Unified DataTable */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        enableSelection={true}
        page={page}
        pageSize={10}
        totalCount={meta?.total || users.length}
        onPageChange={setPage}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('adminPages.users.searchPlaceholder')}
        filters={[
          {
            id: 'role',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { label: 'All Roles', value: 'all' },
              { label: 'User', value: 'user' },
              { label: 'Admin', value: 'admin' },
              { label: 'Super Admin', value: 'superadmin' },
            ],
          },
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Suspended', value: 'suspended' },
            ],
          },
        ]}
        onRefresh={fetchUsers}
        bulkActions={[
          {
            label: 'Suspend Selected',
            icon: Ban,
            variant: 'destructive',
            onClick: handleBulkSuspend,
          },
          {
            label: 'Unsuspend Selected',
            icon: CheckCircle2,
            variant: 'outline',
            onClick: handleBulkUnsuspend,
          },
          {
            label: 'Revoke Sessions',
            icon: LogOut,
            variant: 'outline',
            onClick: handleBulkRevokeSessions,
          },
        ]}
      />

      {/* Action Confirmation Modals */}
      <AnimatePresence>
        {modalType && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              {modalType === 'suspend' && (
                <>
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-bold">
                      {selectedUser.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to {selectedUser.is_suspended ? 'unsuspend' : 'freeze access for'}{' '}
                    <span className="font-semibold text-foreground">{selectedUser.email}</span>?
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                    <button
                      onClick={handleToggleSuspend}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm Action
                    </button>
                  </div>
                </>
              )}

              {modalType === 'role' && (
                <>
                  <h3 className="text-lg font-bold text-foreground">Change User Role</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a new role for <span className="font-semibold text-foreground">{selectedUser.email}</span>:
                  </p>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-sm"
                  >
                    <option value="user">Regular User</option>
                    <option value="admin">Administrator</option>
                    <option value="superadmin">Super Administrator</option>
                  </select>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                    <button
                      onClick={handleUpdateRole}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      Save Role
                    </button>
                  </div>
                </>
              )}

              {modalType === 'revoke' && (
                <>
                  <div className="flex items-center gap-3 text-amber-600">
                    <LogOut className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Revoke All Active Sessions</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will forcefully log out <span className="font-semibold text-foreground">{selectedUser.email}</span> from all active web & mobile devices.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-border">Cancel</button>
                    <button
                      onClick={handleRevokeSessions}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      Revoke Sessions
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
