import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Plus, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/lib/client';

const TenantContext = createContext(null);

export function TenantProvider({ children, user }) {
  const [tenants, setTenants] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', slug: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTenants = useCallback(async () => {
    if (!user?.id) {
      setTenants([]);
      setActiveTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await client.get('/tenants?all=true');
      const items = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
      setTenants(items);

      if (items.length > 0) {
        const savedId = localStorage.getItem('active_tenant_id');
        const found = items.find((t) => t.id === savedId) || items[0];
        setActiveTenant(found);
        localStorage.setItem('active_tenant_id', found.id);
      } else {
        setActiveTenant(null);
        localStorage.removeItem('active_tenant_id');
      }
      return items;
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const selectTenant = useCallback((tenant) => {
    setActiveTenant(tenant);
    if (tenant?.id) {
      localStorage.setItem('active_tenant_id', tenant.id);
    } else {
      localStorage.removeItem('active_tenant_id');
    }
    window.location.reload();
  }, []);

  const handleJoinTenant = async (e) => {
    e?.preventDefault();
    if (!joinCodeInput.trim()) {
      toast.error('Kode gabung wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await client.post('/tenants/join', { join_code: joinCodeInput.trim() });
      const newTenant = res.data?.data || res.data;
      toast.success(`Berhasil bergabung dengan workspace "${newTenant.name}"!`);
      setJoinCodeInput('');
      setIsJoinModalOpen(false);
      await fetchTenants();
      selectTenant(newTenant);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kode gabung tidak valid atau telah expired');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e?.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Nama workspace wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      const res = await client.post('/tenants', { name: createForm.name.trim(), slug: createForm.slug.trim() });
      const newTenant = res.data?.data || res.data;
      toast.success(`Workspace "${newTenant.name}" berhasil dibuat!`);
      setCreateForm({ name: '', slug: '' });
      setIsCreateModalOpen(false);
      await fetchTenants();
      selectTenant(newTenant);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat workspace');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        selectTenant,
        fetchTenants,
        refreshTenants: fetchTenants,
        loading,
        openJoinModal: () => setIsJoinModalOpen(true),
        openCreateModal: () => setIsCreateModalOpen(true),
      }}
    >
      {children}

      {/* Join Tenant Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 relative"
            >
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Gabung Workspace</h3>
                  <p className="text-xs text-muted-foreground">Masukkan 6 karakter kode gabung dari admin workspace</p>
                </div>
              </div>

              <form onSubmit={handleJoinTenant} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Kode Gabung (Join Code)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Contoh: ACME01"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-center font-mono font-bold text-lg tracking-widest uppercase focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Bergabung...' : 'Gabung Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Tenant Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 relative"
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Buat Workspace Baru</h3>
                  <p className="text-xs text-muted-foreground">Buat tim atau ruang kerja baru untuk mengelola link</p>
                </div>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Nama Workspace</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tim Engineering 2026"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Slug URL (Opsional)</label>
                  <input
                    type="text"
                    placeholder="web-dev-2026"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Membuat...' : 'Buat Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within <TenantProvider>');
  }
  return ctx;
}
