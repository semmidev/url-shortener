import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu as MenuIcon, Plus, Edit2, Trash2, Shield, FolderPlus,
  LayoutDashboard, Link2, BarChart3, ShieldCheck, ShieldAlert,
  Users, UserCog, KeyRound, Globe, FileText, Sliders, Settings,
  User, Zap, Layers, ChevronRight, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminMenus, createAdminMenu, updateAdminMenu, deleteAdminMenu,
  getAdminPermissions, reorderAdminMenus
} from '../api';
import PermissionGuard from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';
import { resolveIcon } from '@/lib/iconResolver';
import { useI18n } from '@/context/I18nContext';

const ROUTE_OPTIONS = [
  { label: 'None / Disabled (Section Group)', value: '' },
  { label: '/dashboard — Overview', value: '/dashboard' },
  { label: '/dashboard/urls — Short URLs', value: '/dashboard/urls' },
  { label: '/dashboard/analytics — Analytics', value: '/dashboard/analytics' },
  { label: '/dashboard/admin — Admin Overview', value: '/dashboard/admin' },
  { label: '/dashboard/admin/users — Users Management', value: '/dashboard/admin/users' },
  { label: '/dashboard/admin/roles — Roles & RBAC', value: '/dashboard/admin/roles' },
  { label: '/dashboard/admin/menus — Menu Builder', value: '/dashboard/admin/menus' },
  { label: '/dashboard/admin/links — Global Link Control', value: '/dashboard/admin/links' },
  { label: '/dashboard/admin/audit-logs — Audit Logs', value: '/dashboard/admin/audit-logs' },
  { label: '/dashboard/admin/system — System Config', value: '/dashboard/admin/system' },
  { label: '/dashboard/account — Account Profile', value: '/dashboard/account' },
];

const ICON_OPTIONS = [
  'Home', 'LayoutDashboard', 'Link', 'Link2', 'BarChart3', 'BarChart',
  'ShieldCheck', 'ShieldAlert', 'Shield', 'Lock', 'KeyRound',
  'Users', 'User', 'UserCog', 'Menu', 'Globe', 'FileText',
  'Sliders', 'Settings', 'Database', 'Activity', 'Zap',
  'Star', 'Bookmark', 'Bell', 'Code', 'Search', 'List', 'Filter'
];

export default function AdminMenusPage() {
  const [menus, setMenus] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { refetch: refetchSidebar } = usePermission();
  const { t, language } = useI18n();

  const [form, setForm] = useState({
    parent_id: '',
    title: '',
    title_id: '',
    title_en: '',
    path: '',
    icon: 'LayoutDashboard',
    order_index: 0,
    is_active: true,
    is_group: false,
    permission_code: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menusData, permsData] = await Promise.all([
        getAdminMenus(),
        getAdminPermissions()
      ]);
      setMenus(Array.isArray(menusData) ? menusData : []);
      setPermissions(Array.isArray(permsData) ? permsData : []);
    } catch (err) {
      toast.error('Failed to load navigation menus or permissions');
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const findNextOrderIndex = (menuTree, parentId) => {
    if (!parentId) {
      return menuTree.length;
    }
    const findParent = (items) => {
      for (const item of items) {
        if (item.id === parentId) {
          return item;
        }
        if (item.children && item.children.length > 0) {
          const found = findParent(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    const parent = findParent(menuTree);
    if (parent && parent.children) {
      return parent.children.length;
    }
    return 0;
  };

  const openCreateModal = ({ parentId = '', isGroup = false } = {}) => {
    setEditingItem(null);
    const nextOrder = findNextOrderIndex(menus, parentId);
    setForm({
      parent_id: parentId,
      title: '',
      title_id: '',
      title_en: '',
      path: isGroup ? '' : '/dashboard',
      icon: isGroup ? 'Home' : 'LayoutDashboard',
      order_index: nextOrder,
      is_active: true,
      is_group: isGroup,
      permission_code: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      parent_id: item.parent_id || '',
      title: item.title || '',
      title_id: item.title_id || item.title || '',
      title_en: item.title_en || item.title || '',
      path: item.path || '',
      icon: item.icon || 'LayoutDashboard',
      order_index: item.order_index || 0,
      is_active: item.is_active,
      is_group: !!item.is_group,
      permission_code: item.permission_code || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const titleVal = form.title || form.title_en || form.title_id;
    const payload = {
      ...form,
      title: titleVal,
      title_id: form.title_id || titleVal,
      title_en: form.title_en || titleVal,
      parent_id: form.parent_id || null,
      path: form.is_group ? '' : form.path,
      permission_code: form.permission_code || null,
      order_index: Number(form.order_index)
    };

    try {
      if (editingItem) {
        await updateAdminMenu(editingItem.id, payload);
        toast.success('Menu item updated');
      } else {
        await createAdminMenu(payload);
        toast.success(form.is_group ? 'Section Group created' : 'Menu item created');
      }
      setIsModalOpen(false);
      await fetchData();
      refetchSidebar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteAdminMenu(deletingItem.id);
      toast.success('Menu item deleted');
      setDeletingItem(null);
      await fetchData();
      refetchSidebar();
    } catch (err) {
      toast.error('Failed to delete menu item');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (siblings, index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const updatedSiblings = [...siblings];
    const temp = updatedSiblings[index];
    updatedSiblings[index] = updatedSiblings[targetIndex];
    updatedSiblings[targetIndex] = temp;

    const payload = updatedSiblings.map((item, idx) => ({
      id: item.id,
      parent_id: item.parent_id || null,
      order_index: idx,
    }));

    try {
      await reorderAdminMenus({ items: payload });
      toast.success(t('adminPages.menus.reorderSuccess'));
      await fetchData();
      refetchSidebar();
    } catch (err) {
      toast.error('Failed to update menu order');
    }
  };

  const getItemTitle = (item) => {
    if (!item) return '';
    return language === 'id' ? (item.title_id || item.title) : (item.title_en || item.title);
  };

  return (
    <div className="space-y-6">
      <DynamicPageHeader
        title={t('adminPages.menus.title')}
        subtitle={t('adminPages.menus.subtitle')}
        fallbackIcon={MenuIcon}
      >
        <div className="flex items-center gap-2">
          <PermissionGuard permission="menus.create">
            <button
              onClick={() => openCreateModal({ isGroup: true })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-accent text-foreground transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-primary" />
              {t('adminPages.menus.addSectionGroup')}
            </button>
            <button
              onClick={() => openCreateModal({ isGroup: false })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('adminPages.menus.addTopMenu')}
            </button>
          </PermissionGuard>
        </div>
      </DynamicPageHeader>

      <div className="rounded-2xl bg-card border border-border p-6 shadow-sm space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : menus.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No navigation menus found.</div>
        ) : (
          <div className="space-y-4">
            {menus.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.is_group
                    ? 'bg-primary/5 border-primary/20 space-y-3'
                    : 'bg-background border-border/70 space-y-3'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-card border border-border/60 text-primary">
                      {resolveIcon(item.icon, { className: 'w-4 h-4' }) || <Layers className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{getItemTitle(item)}</span>
                        {item.is_group && (
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-primary text-primary-foreground">
                            Section Group
                          </span>
                        )}
                        {item.permission_code && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Shield className="w-3 h-3" />
                            {item.permission_code}
                          </span>
                        )}
                      </div>
                      {!item.is_group && (
                        <span className="text-xs font-mono text-muted-foreground">{item.path}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <PermissionGuard permission="menus.update">
                      <div className="flex items-center gap-0.5 bg-card border border-border/60 rounded-lg p-0.5">
                        <button
                          onClick={() => handleMove(menus, index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground rounded hover:bg-accent cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(menus, index, 'down')}
                          disabled={index === menus.length - 1}
                          title="Move Down"
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground rounded hover:bg-accent cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.create">
                      <button
                        onClick={() => openCreateModal({ parentId: item.id, isGroup: false })}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-accent flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {item.is_group ? 'Add Menu' : 'Submenu'}
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.update">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.update">
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                  </div>
                </div>

                {item.children && item.children.length > 0 && (
                  <div className="pl-6 pt-2 space-y-2 border-l-2 border-primary/30">
                    {item.children.map((child, childIdx) => (
                      <div
                        key={child.id}
                        className="p-3 rounded-lg bg-card border border-border/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground">
                              {resolveIcon(child.icon, { className: 'w-3.5 h-3.5' }) || <ChevronRight className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{getItemTitle(child)}</span>
                                {child.permission_code && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
                                    <Shield className="w-2.5 h-2.5" />
                                    {child.permission_code}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground">{child.path}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PermissionGuard permission="menus.update">
                              <div className="flex items-center gap-0.5 bg-background border border-border/50 rounded p-0.5">
                                <button
                                  onClick={() => handleMove(item.children, childIdx, 'up')}
                                  disabled={childIdx === 0}
                                  title="Move Up"
                                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-accent cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMove(item.children, childIdx, 'down')}
                                  disabled={childIdx === item.children.length - 1}
                                  title="Move Down"
                                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-accent cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </PermissionGuard>
                            {!child.is_group && (
                              <PermissionGuard permission="menus.create">
                                <button
                                  onClick={() => openCreateModal({ parentId: child.id, isGroup: false })}
                                  className="px-2 py-0.5 text-[11px] rounded border border-border hover:bg-accent cursor-pointer"
                                >
                                  + Submenu
                                </button>
                              </PermissionGuard>
                            )}
                            <PermissionGuard permission="menus.update">
                              <button onClick={() => openEditModal(child)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </PermissionGuard>
                            <PermissionGuard permission="menus.update">
                              <button onClick={() => handleDeleteClick(child)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </PermissionGuard>
                          </div>
                        </div>

                        {child.children && child.children.length > 0 && (
                          <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-border/40">
                            {child.children.map((sub, subIdx) => (
                              <div key={sub.id} className="p-2 rounded bg-background border border-border/30 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                  {resolveIcon(sub.icon, { className: 'w-3 h-3 text-muted-foreground' })}
                                  <span className="font-medium text-foreground">{getItemTitle(sub)}</span>
                                  <span className="font-mono text-muted-foreground text-[10px]">{sub.path}</span>
                                  {sub.permission_code && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600">
                                      {sub.permission_code}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <PermissionGuard permission="menus.update">
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        onClick={() => handleMove(child.children, subIdx, 'up')}
                                        disabled={subIdx === 0}
                                        title="Move Up"
                                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMove(child.children, subIdx, 'down')}
                                        disabled={subIdx === child.children.length - 1}
                                        title="Move Down"
                                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </PermissionGuard>
                                  <PermissionGuard permission="menus.update">
                                    <button onClick={() => openEditModal(sub)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </PermissionGuard>
                                  <PermissionGuard permission="menus.update">
                                    <button onClick={() => handleDeleteClick(sub)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </PermissionGuard>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-foreground">
                {editingItem
                  ? t('adminPages.menus.editMenuTitle')
                  : t('adminPages.menus.createMenuTitle')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div className="flex items-center gap-4 p-2.5 rounded-xl bg-accent/40 border border-border">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_group}
                      onChange={(e) => setForm({
                        ...form,
                        is_group: e.target.checked,
                        path: e.target.checked ? '' : form.path || '/dashboard'
                      })}
                      className="rounded text-primary focus:ring-primary"
                    />
                    {t('adminPages.menus.isSectionGroupLabel')}
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {t('adminPages.menus.isSectionGroupDesc')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <span>🇮🇩</span> {t('adminPages.menus.titleIdLabel')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('adminPages.menus.titleIdPlaceholder')}
                      value={form.title_id}
                      onChange={(e) => setForm({
                        ...form,
                        title_id: e.target.value,
                        title: form.title || e.target.value
                      })}
                      className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <span>🇬🇧</span> {t('adminPages.menus.titleEnLabel')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('adminPages.menus.titleEnPlaceholder')}
                      value={form.title_en}
                      onChange={(e) => setForm({
                        ...form,
                        title_en: e.target.value,
                        title: form.title || e.target.value
                      })}
                      className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('adminPages.menus.defaultTitleLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. User Management"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {!form.is_group && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t('adminPages.menus.routePathLabel')}</label>
                    <select
                      value={form.path}
                      onChange={(e) => setForm({ ...form, path: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-foreground"
                    >
                      {ROUTE_OPTIONS.filter((r) => r.value !== '').map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t('adminPages.menus.iconLabel')}</label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-center min-w-10 text-primary">
                      {resolveIcon(form.icon, { className: 'w-5 h-5' }) || <Layers className="w-5 h-5" />}
                    </div>
                    <select
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-background border border-border text-foreground"
                    >
                      {ICON_OPTIONS.map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('adminPages.menus.permissionGuardLabel')}
                  </label>
                  <select
                    value={form.permission_code}
                    onChange={(e) => setForm({ ...form, permission_code: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-foreground"
                  >
                    <option value="">{t('adminPages.menus.noPermissionGuard')}</option>
                    {permissions.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} — {p.description || p.module}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t('adminPages.menus.permissionGuardHelp')}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    {t('adminPages.menus.saveMenuBtn')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-foreground">
                {t('adminPages.menus.deleteConfirmTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('adminPages.menus.deleteConfirmDesc')}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? t('common.saving') : t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
