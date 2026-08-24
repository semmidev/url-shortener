import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/features/auth/store';
import { useI18n } from '@/context/I18nContext';
import DynamicPageHeader from '@/components/DynamicPageHeader';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  UserIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  LinkIcon,
  Loader2Icon,
  BadgeCheckIcon,
} from 'lucide-react';

const GoogleLogo = ({ className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

function FieldError({ error }) {
  if (!error) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircleIcon className="size-3 shrink-0" />
      {error}
    </span>
  );
}

export default function Account() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const unlinkGoogle = useAuthStore((s) => s.unlinkGoogle);
  const getGoogleLinkURL = useAuthStore((s) => s.getGoogleLinkURL);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    fullName: user?.full_name || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Google unlink loading state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);

  if (!user) return null;

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.fullName.trim()) {
      setProfileErrors({ fullName: 'Nama lengkap tidak boleh kosong' });
      return;
    }
    setProfileErrors({});
    setProfileLoading(true);

    const res = await updateProfile(profileForm.fullName.trim());
    setProfileLoading(false);

    if (res.success) {
      toast.success('Profil berhasil diperbarui!');
    } else {
      toast.error(res.message || 'Gagal memperbarui profil');
      if (res.errors) setProfileErrors(res.errors);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!passwordForm.newPassword) {
      errs.newPassword = 'Password baru tidak boleh kosong';
    } else if (passwordForm.newPassword.length < 6) {
      errs.newPassword = 'Password baru minimal 6 karakter';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errs.confirmPassword = 'Konfirmasi password tidak cocok';
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordErrors({});
    setPasswordLoading(true);

    const res = await changePassword(passwordForm.newPassword);
    setPasswordLoading(false);

    if (res.success) {
      toast.success('Password berhasil diubah!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } else {
      toast.error(res.message || 'Gagal mengubah password');
      if (res.errors) setPasswordErrors(res.errors);
    }
  };

  const hasPassword = Boolean(user?.has_password || user?.password_hash);

  const handleUnlinkGoogle = () => {
    if (!hasPassword) {
      toast.error('Anda harus membuat password terlebih dahulu sebelum memutuskan koneksi Google agar tetap bisa login!');
      const passwordInput = document.getElementById('password-new');
      if (passwordInput) {
        passwordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        passwordInput.focus();
      }
      return;
    }
    setIsUnlinkModalOpen(true);
  };

  const confirmUnlinkGoogle = async () => {
    setIsUnlinkModalOpen(false);
    setGoogleLoading(true);

    const res = await unlinkGoogle();
    setGoogleLoading(false);

    if (res.success) {
      toast.success('Koneksi akun Google berhasil diputuskan.');
    } else {
      toast.error(res.message || 'Gagal memutuskan koneksi akun Google.');
    }
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    const res = await getGoogleLinkURL();
    setGoogleLoading(false);

    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      toast.error(res.message || 'Gagal mendapatkan URL autentikasi Google.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <DynamicPageHeader
        title={t("account.title")}
        subtitle={t("account.subtitle")}
        fallbackIcon={UserIcon}
      />

      {/* Identity Card */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl uppercase shrink-0">
                {user.full_name ? user.full_name.charAt(0) : user.email.charAt(0)}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{user.full_name || 'User'}</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="px-3 py-1 gap-1 uppercase tracking-wide text-xs">
                {user.role === 'admin' ? <ShieldCheckIcon className="size-3.5" /> : <BadgeCheckIcon className="size-3.5" />}
                {user.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="size-5 text-blue-500 shrink-0" />
            <div>
              <CardTitle className="text-base font-semibold">{t("account.personalDetails")}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-fullname" className="text-xs font-medium">{t("account.fullName")}</Label>
              <Input
                id="profile-fullname"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ fullName: e.target.value })}
                className="bg-background/80"
              />
              <FieldError error={profileErrors.fullName || profileErrors.full_name} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("account.emailAddress")}</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-border/80 bg-muted/40 text-sm text-muted-foreground">
                <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                <span className="truncate font-mono text-xs">{user.email}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={profileLoading} className="cursor-pointer">
                {profileLoading ? t("common.saving") : t("account.updateProfileBtn")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Security */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-amber-500 shrink-0" />
            <div>
              <CardTitle className="text-base font-semibold">Keamanan Akun (Ganti Password)</CardTitle>
              <CardDescription className="text-xs">Perbarui password secara berkala untuk menjaga keamanan akun Anda.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasPassword && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>
                Akun Anda belum memiliki password. Buat password di bawah ini agar Anda tetap bisa login menggunakan email & password jika koneksi Google dilepas.
              </span>
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password-new" className="text-xs font-medium">Password Baru</Label>
                <Input
                  id="password-new"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="bg-background/80"
                  autoComplete="new-password"
                />
                <FieldError error={passwordErrors.newPassword || passwordErrors.new_password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password-confirm" className="text-xs font-medium">Konfirmasi Password Baru</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Ulangi password baru"
                  className="bg-background/80"
                  autoComplete="new-password"
                />
                <FieldError error={passwordErrors.confirmPassword} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={passwordLoading} className="cursor-pointer">
                {passwordLoading ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                    Menyimpan…
                  </>
                ) : (
                  'Ubah Password'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Google OAuth Connection */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="size-5 text-emerald-500 shrink-0" />
            <div>
              <CardTitle className="text-base font-semibold">Koneksi Akun Google</CardTitle>
              <CardDescription className="text-xs">Hubungkan akun Google Anda untuk metode login satu kali klik yang cepat.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-background/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background shadow-xs">
                <GoogleLogo className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Google OAuth</p>
                {user.google_id ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                    <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
                    Akun Google Terhubung ({user.email})
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Belum terhubung dengan akun Google</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {user.google_id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={googleLoading}
                  onClick={handleUnlinkGoogle}
                  className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer h-9"
                >
                  {googleLoading ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : null}
                  Putuskan Koneksi Google
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={googleLoading}
                  onClick={handleConnectGoogle}
                  className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer h-9 gap-2 font-medium"
                >
                  {googleLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : <GoogleLogo className="size-4" />}
                  Hubungkan Akun Google
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-background/50 border border-border/40 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <span className="shrink-0 text-base">💡</span>
            <span>
              Menghubungkan akun Google memungkinkan Anda untuk masuk ke aplikasi secara instan tanpa harus mengetik alamat email dan password.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unlink Google Confirmation Modal */}
      <AnimatePresence>
        {isUnlinkModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Putuskan Akun Google</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Apakah Anda yakin ingin memutuskan koneksi akun Google Anda?
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlinkModalOpen(false)}
                  className="w-full py-2 px-4 rounded-lg border border-border text-foreground hover:bg-accent cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmUnlinkGoogle}
                  className="w-full py-2 px-4 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer"
                >
                  Ya, Putuskan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
