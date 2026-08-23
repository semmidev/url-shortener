import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Search, Shield, Ban, CheckCircle2, UserCheck,
  Trash2, Key, RefreshCcw, AlertTriangle, LogOut, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { getAdminUsers, suspendUser, updateUserRole, revokeUserSessions } from '../api';
import PermissionGuard from '@/components/PermissionGuard';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'suspend' | 'role' | 'revoke'
  const [newRole, setNewRole] = useState('user');
  const [actionLoading, setActionLoading] = useState(false);

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
      toast.success(`User ${selectedUser.is_suspended ? 'unsuspended' : 'suspended'} successfully`);
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
      toast.success(`User role updated to ${newRole}`);
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
      toast.success(`All active sessions for ${selectedUser.email} revoked`);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            User & Account Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search, suspend, manage roles, and revoke active sessions for system users.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-foreground">{u.full_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4">
                      {u.is_suspended ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                          <Ban className="w-3 h-3" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGuard permission="users.roles.update">
                          <button
                            onClick={() => { setSelectedUser(u); setNewRole(u.role); setModalType('role'); }}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground transition-colors"
                          >
                            Role
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="users.sessions.revoke">
                          <button
                            onClick={() => { setSelectedUser(u); setModalType('revoke'); }}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
                          >
                            Revoke Sessions
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="users.suspend">
                          <button
                            onClick={() => { setSelectedUser(u); setModalType('suspend'); }}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              u.is_suspended
                                ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
                                : 'border-red-500/30 text-red-600 hover:bg-red-500/10'
                            }`}
                          >
                            {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
