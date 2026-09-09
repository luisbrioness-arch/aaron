import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Store, User, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Sun, Moon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import type { ApiResponse, AuthUser } from '@/types';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth.php?action=login', {
        username,
        password,
      });
      if (!data.success || !data.data) {
        setError(data.message || 'Credenciales inválidas');
        return;
      }
      setSession(data.data.token, data.data.user);
    } catch {
      setError('No se pudo conectar con el servidor de la tienda');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Botón flotante para alternar tema */}
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3.5 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-xs transition-all hover:bg-secondary active:scale-95"
          title="Alternar modo claro / oscuro"
        >
          {theme === 'light' ? (
            <>
              <Moon className="size-4 text-slate-600 dark:text-slate-400" />
              <span>Modo Oscuro</span>
            </>
          ) : (
            <>
              <Sun className="size-4 text-amber-400" />
              <span>Modo Claro</span>
            </>
          )}
        </button>
      </div>

      {/* Fondo decorativo con gradiente sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 size-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-xl shadow-slate-200/40 dark:shadow-none backdrop-blur-xs">
          {/* Header del Login */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/25">
              <Store className="size-7" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
              Aaron Provisiones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistema de Punto de Venta y Gestión de Bodega
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/80 p-3.5 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Usuario
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/70">
                  <User className="size-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="h-11 w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 text-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-3 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contraseña
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/70">
                  <Lock className="size-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 w-full rounded-xl border border-input bg-background/50 pl-9 pr-10 text-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-3 focus:ring-primary/20 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/70 hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-emerald-500/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          {/* Footer de seguridad */}
          <div className="mt-8 border-t border-border/60 pt-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Conexión segura y autenticación cifrada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
