import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  SettingsIcon,
  KeyIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  Trash2Icon,
  Building2Icon,
  SaveIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  Loader2Icon,
  BadgeCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTenant } from '@/context/TenantContext';
import { useI18n } from '@/context/I18nContext';
import { updateTenant, regenerateJoinCode, deleteTenant } from '../api';
import PermissionGuard from '@/components/PermissionGuard';

function FieldError({ error }) {
  if (!error) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertTriangleIcon className="size-3 shrink-0" />
      {error}
    </span>
  );
}

export default function WorkspaceSettingsPage() {
  const { activeTenant, selectTenant, fetchTenants } = useTenant();
  const { t } = useI18n();

  const [form, setForm] = useState({ name: '', slug: '' });
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  // Modals
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  useEffect(() => {
    if (activeTenant) {
      setForm({
        name: activeTenant.name || '',
        slug: activeTenant.slug || '',
      });
    }
  }, [activeTenant]);

  const handleCopyJoinCode = () => {
    if (!activeTenant?.join_code) return;
    navigator.clipboard.writeText(activeTenant.join_code);
    setCopiedCode(true);
    toast.success(t('common.copied'));
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!activeTenant?.id) return;
    if (!form.name.trim()) {
      setErrors({ name: t('common.error') });
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const updated = await updateTenant(activeTenant.id, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
      });
      toast.success(t('workspace.settingsSaved'));
      await fetchTenants();
      selectTenant(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!activeTenant?.id) return;
    setIsRegenerating(true);
    try {
      const updated = await regenerateJoinCode(activeTenant.id);
      toast.success(t('workspace.regenSuccess'));
      setShowRegenModal(false);
      await fetchTenants();
      selectTenant(updated);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeTenant?.id) return;
    if (confirmDeleteInput.trim() !== activeTenant.name.trim()) {
      toast.error(t('common.error'));
      return;
    }
    setIsDeleting(true);
    try {
      await deleteTenant(activeTenant.id);
      toast.success(t('common.success'));
      setShowDeleteModal(false);
      localStorage.removeItem('active_tenant_id');
      await fetchTenants();
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = activeTenant?.role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      <DynamicPageHeader
        title={t('workspace.settingsTitle')}
        subtitle={t('workspace.settingsSubtitle', { name: activeTenant?.name || 'Active' })}
        fallbackIcon={SettingsIcon}
      />

      {/* Hero / Identity Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl uppercase shrink-0 shadow-xs border border-primary/20">
                {activeTenant?.name ? activeTenant.name.charAt(0) : 'W'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground truncate">{activeTenant?.name || 'Workspace'}</h2>
                  <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5">
                    {activeTenant?.slug || 'workspace'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{t('workspace.joinCode')}: <strong className="font-mono text-foreground">{activeTenant?.join_code}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="px-3 py-1.5 gap-1.5 uppercase tracking-wider text-xs font-bold">
                <BadgeCheckIcon className="size-4 text-emerald-500" />
                {t('workspace.roleLabel')}: {activeTenant?.role || 'Member'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings Form */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2Icon className="size-5 text-muted-foreground shrink-0" />
            <div>
              <CardTitle className="text-base font-semibold">{t('workspace.generalInfo')}</CardTitle>
              <CardDescription className="text-xs">
                {t('workspace.generalInfoDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-xs font-medium text-foreground">{t('workspace.workspaceName')}</Label>
                <Input
                  id="ws-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Workspace Name"
                  className="bg-background/80 text-sm"
                />
                <FieldError error={errors.name} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-slug" className="text-xs font-medium text-foreground">{t('workspace.urlSlug')}</Label>
                <Input
                  id="ws-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="workspace-slug"
                  className="bg-background/80 font-mono text-xs"
                />
                <FieldError error={errors.slug} />
              </div>
            </div>

            <PermissionGuard permission="tenants.update">
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving} className="gap-2 cursor-pointer shadow-xs">
                  {isSaving ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <SaveIcon className="size-4" />
                      {t('common.save')}
                    </>
                  )}
                </Button>
              </div>
            </PermissionGuard>
          </form>
        </CardContent>
      </Card>

      {/* Join Code Management */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyIcon className="size-5 text-muted-foreground shrink-0" />
            <div>
              <CardTitle className="text-base font-semibold">{t('workspace.joinCodeTitle')}</CardTitle>
              <CardDescription className="text-xs">
                {t('workspace.joinCodeDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/30 shadow-xs">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-muted-foreground block font-medium">{t('workspace.activeJoinCode')}</span>
              <span className="font-mono text-3xl font-black tracking-widest text-primary select-all">
                {activeTenant?.join_code || '------'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyJoinCode} className="gap-1.5 cursor-pointer h-9">
                {copiedCode ? <CheckIcon className="size-4 text-emerald-500" /> : <CopyIcon className="size-4" />}
                {copiedCode ? t('common.copied') : t('workspace.copyCode')}
              </Button>
              <PermissionGuard permission="tenants.update">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenModal(true)}
                  className="gap-1.5 cursor-pointer h-9"
                >
                  <RefreshCwIcon className="size-3.5" />
                  {t('workspace.regenCode')}
                </Button>
              </PermissionGuard>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border/60 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <span className="shrink-0 text-base">💡</span>
            <span>
              {t('workspace.joinTip')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone for Owners */}
      {isOwner && (
        <Card className="border-destructive/20 bg-destructive/5 shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-destructive shrink-0" />
              <div>
                <CardTitle className="text-base font-semibold text-destructive">{t('workspace.dangerZone')}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t('workspace.deleteWorkspaceDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-card">
              <div>
                <h4 className="text-sm font-bold text-foreground">{t('workspace.deleteWorkspace')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('workspace.deleteWorkspaceDesc')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmDeleteInput('');
                  setShowDeleteModal(true);
                }}
                className="gap-2 cursor-pointer shrink-0 h-9 font-semibold"
              >
                <Trash2Icon className="size-4" />
                {t('workspace.deleteWorkspaceBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regenerate Join Code Modal */}
      <AnimatePresence>
        {showRegenModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <RefreshCwIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('workspace.regenModalTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('workspace.regenModalDesc')}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('workspace.regenModalText', { code: activeTenant?.join_code })}
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowRegenModal(false)} className="cursor-pointer">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleRegenerateCode} disabled={isRegenerating} className="cursor-pointer">
                  {isRegenerating ? t('common.loading') : t('workspace.yesRegen')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Workspace Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-destructive">
                <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <AlertTriangleIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{t('workspace.deleteModalTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('workspace.deleteModalSubtitle')}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('workspace.deleteModalText', { name: activeTenant?.name })}
              </p>

              <Input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={activeTenant?.name}
                className="bg-background font-medium text-sm"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="cursor-pointer">
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmDeleteInput.trim() !== activeTenant?.name?.trim() || isDeleting}
                  onClick={handleDeleteWorkspace}
                  className="cursor-pointer"
                >
                  {isDeleting ? t('workspace.deleting') : t('workspace.deleteWorkspaceBtn')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
