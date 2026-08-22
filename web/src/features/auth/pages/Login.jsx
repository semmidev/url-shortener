import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock, User, Sparkles, Sun, Moon, ZapIcon, Link2, BarChart3, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store';
import { useI18n } from '@/context/I18nContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemePresetPicker } from '@/components/ThemePresetPicker';
import client from '@/lib/client';

function FloatingOrb({ className, size, delay }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
    />
  )
}

const perks = [
  { icon: Link2,       key: 'auth.loginPerk1' },
  { icon: BarChart3,   key: 'auth.loginPerk2' },
  { icon: ShieldCheck, key: 'auth.loginPerk3' },
]

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { login, isSubmitting } = useAuthStore();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    if (!values.email) { setErrors({ email: 'Email is required' }); return; }
    if (!values.password) { setErrors({ password: 'Password is required' }); return; }

    const res = await login(values.email, values.password);
    if (res.success) { navigate('/dashboard', { replace: true }); return; }

    if (res.errors) {
      const mappedErrors = {};
      Object.keys(res.errors).forEach((key) => {
        const mappedKey = key === 'full_name' ? 'fullName' : key;
        mappedErrors[mappedKey] = res.errors[key];
      });
      setErrors(mappedErrors);
    } else {
      setServerError(res.error || 'Login failed. Please check your credentials.');
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const res = await client.get('/auth/google/url');
      const url = res.data?.url || res.data?.data?.url;
      if (url) window.location.href = url;
      else { setServerError('Failed to get Google auth URL.'); setGoogleLoading(false); }
    } catch { setServerError('Failed to connect to Google. Please try again.'); setGoogleLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden font-sans text-foreground">
      <FloatingOrb className="top-0 -right-40 bg-primary/10" size={384} delay={0} />
      <FloatingOrb className="-bottom-20 -left-40 bg-primary/10" size={320} delay={1.5} />

      {/* Left Pane */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="hidden md:flex md:w-[45%] lg:w-[50%] bg-card/60 backdrop-blur-sm border-r border-border relative flex-col justify-between p-12"
      >
        <div className="flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <ZapIcon className="w-5 h-5" />
            </motion.div>
            <span className="text-base font-bold tracking-tight text-foreground">{t("nav.urlShortener")}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <ThemePresetPicker />
            <button
              type="button"
              aria-label={t("common.toggleDarkMode")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/70"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6 relative z-10 my-auto max-w-md"
        >
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> {t("auth.welcomeTitle")}
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
              {t("auth.welcomeSubtitle")}
            </h2>
          </div>

          <div className="space-y-3 pt-5 border-t border-border">
            {perks.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-sm text-foreground/80"
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <p.icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{t(p.key)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground font-medium">© {new Date().getFullYear()} URL Shortener.</p>
        </div>
      </motion.div>

      {/* Right Pane */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 md:p-16 bg-background/40 backdrop-blur-sm"
      >
        <div className="w-full max-w-[420px] space-y-6 sm:space-y-8">
          {/* Mobile top header bar */}
          <div className="md:hidden flex items-center justify-between w-full pb-4 border-b border-border/60">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <ZapIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">{t("nav.urlShortener")}</span>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemePresetPicker />
              <button
                type="button"
                aria-label={t("common.toggleDarkMode")}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/70"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex flex-col items-center md:items-start text-center md:text-left gap-1.5 mb-2"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("auth.welcomeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.welcomeSubtitle")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5"
          >
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-normal font-medium">{serverError}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                className="space-y-1.5"
              >
                <label htmlFor="email" className="text-xs font-bold text-muted-foreground block">
                  {t("auth.emailLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><User className="w-4 h-4" /></span>
                  <input
                    id="email" name="email" type="email" autoComplete="email" autoFocus
                    value={values.email} onChange={handleChange}
                    placeholder="name@example.com"
                    className={`w-full pl-10 rounded-xl border bg-muted/50 hover:bg-muted/80 focus:bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-hidden transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.email ? 'border-destructive' : 'border-border'}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="space-y-1.5"
              >
                <label htmlFor="password" className="text-xs font-bold text-muted-foreground block">
                  {t("auth.passwordLabel")} <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"><Lock className="w-4 h-4" /></span>
                  <input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={values.password} onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-11 rounded-xl border bg-muted/50 hover:bg-muted/80 focus:bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-hidden transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.password ? 'border-destructive' : 'border-border'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
              </motion.div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 cursor-pointer bg-primary text-primary-foreground text-sm font-semibold shadow-xs hover:bg-primary/95 transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background"
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("auth.signingIn")}</> : t("auth.signInBtn")}
              </motion.button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground font-medium">{t("auth.orContinueWith")}</span></div>
            </div>

            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 cursor-pointer border border-border bg-card text-foreground text-sm font-semibold hover:bg-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? '...' : t("auth.googleSignIn")}
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-center text-sm text-muted-foreground"
          >
            {t("auth.dontHaveAccount")}{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              {t("auth.signUpLink")}
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
