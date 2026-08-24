import React, { useEffect, useState } from 'react';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { Sliders, Save, RefreshCw, ToggleLeft, ToggleRight, Zap, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { getSystemConfigs, updateSystemConfig } from '../api';
import PermissionGuard from '@/components/PermissionGuard';

export default function AdminSystemPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for app_info and feature_flags
  const [appInfo, setAppInfo] = useState({ app_name: '', description: '', support_email: '' });
  const [featureFlags, setFeatureFlags] = useState({
    allow_public_registration: true,
    enable_custom_slug: true,
    enable_qr_code: true,
    maintenance_mode: false
  });

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await getSystemConfigs();
      const configArr = Array.isArray(data) ? data : [];

      configArr.forEach((c) => {
        if (c.key === 'app_info' && c.value) setAppInfo(c.value);
        if (c.key === 'feature_flags' && c.value) setFeatureFlags(c.value);
      });
    } catch (err) {
      toast.error('Failed to load system configs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSaveAppInfo = async () => {
    setIsSaving(true);
    try {
      await updateSystemConfig('app_info', appInfo, 'General application branding information');
      toast.success('Application branding updated');
    } catch (err) {
      toast.error('Failed to save application branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFeatureFlags = async (newFlags) => {
    setFeatureFlags(newFlags);
    try {
      await updateSystemConfig('feature_flags', newFlags, 'Global system feature toggles');
      toast.success('Feature flags updated');
    } catch (err) {
      toast.error('Failed to save feature flags');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <DynamicPageHeader
        title="System Configuration & Feature Flags"
        subtitle="Toggle global platform capabilities, feature flags, and application branding."
        fallbackIcon={Sliders}
      >
        <button
          onClick={fetchConfigs}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-background cursor-pointer"
          title="Refresh Configs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </DynamicPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Flags Toggle Module */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Global Feature Flags Toggles
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Instant Gating
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background border border-border/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Allow Public Registration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Enable new users to sign up freely</p>
              </div>
              <PermissionGuard
                permission="system.config.update"
                fallback={
                  <div className="opacity-50 pointer-events-none">
                    {featureFlags.allow_public_registration ? (
                      <ToggleRight className="w-8 h-8 text-primary" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                }
              >
                <button
                  onClick={() => handleSaveFeatureFlags({ ...featureFlags, allow_public_registration: !featureFlags.allow_public_registration })}
                  className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {featureFlags.allow_public_registration ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </PermissionGuard>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Custom URL Slugs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Allow users to specify custom short alias codes</p>
              </div>
              <PermissionGuard
                permission="system.config.update"
                fallback={
                  <div className="opacity-50 pointer-events-none">
                    {featureFlags.enable_custom_slug ? (
                      <ToggleRight className="w-8 h-8 text-primary" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                }
              >
                <button
                  onClick={() => handleSaveFeatureFlags({ ...featureFlags, enable_custom_slug: !featureFlags.enable_custom_slug })}
                  className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {featureFlags.enable_custom_slug ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </PermissionGuard>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">QR Code Generation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically generate downloadable QR codes for links</p>
              </div>
              <PermissionGuard
                permission="system.config.update"
                fallback={
                  <div className="opacity-50 pointer-events-none">
                    {featureFlags.enable_qr_code ? (
                      <ToggleRight className="w-8 h-8 text-primary" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                }
              >
                <button
                  onClick={() => handleSaveFeatureFlags({ ...featureFlags, enable_qr_code: !featureFlags.enable_qr_code })}
                  className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {featureFlags.enable_qr_code ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </PermissionGuard>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">System Maintenance Mode</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Block non-admin user requests temporarily</p>
              </div>
              <PermissionGuard
                permission="system.config.update"
                fallback={
                  <div className="opacity-50 pointer-events-none">
                    {featureFlags.maintenance_mode ? (
                      <ToggleRight className="w-8 h-8 text-red-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                }
              >
                <button
                  onClick={() => handleSaveFeatureFlags({ ...featureFlags, maintenance_mode: !featureFlags.maintenance_mode })}
                  className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {featureFlags.maintenance_mode ? (
                    <ToggleRight className="w-8 h-8 text-red-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </PermissionGuard>
            </div>
          </div>
        </div>

        {/* Branding Settings */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Globe className="w-5 h-5 text-primary" />
            Application Info & Branding
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Application Name</label>
              <input
                type="text"
                value={appInfo.app_name}
                onChange={(e) => setAppInfo({ ...appInfo, app_name: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input
                type="text"
                value={appInfo.description}
                onChange={(e) => setAppInfo({ ...appInfo, description: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Support Email</label>
              <input
                type="email"
                value={appInfo.support_email}
                onChange={(e) => setAppInfo({ ...appInfo, support_email: e.target.value })}
                className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border"
              />
            </div>
            <PermissionGuard permission="system.config.update">
              <button
                onClick={handleSaveAppInfo}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Branding
              </button>
            </PermissionGuard>
          </div>
        </div>
      </div>
    </div>
  );
}
