import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  ShoppingCart,
  Boxes,
  PackagePlus,
  AlertTriangle,
  LayoutDashboard,
  BarChart3,
  Tag,
  Truck,
  Users,
  Moon,
  Sun,
  LogOut,
  Store,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  group: 'operaciones' | 'gestion';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/pos', label: 'Punto de Venta', icon: ShoppingCart, roles: ['cashier', 'admin'], group: 'operaciones' },
  { to: '/bodega', label: 'Bodega y Stock', icon: Boxes, roles: ['cashier', 'warehouse_staff', 'admin'], group: 'operaciones' },
  { to: '/recepcion', label: 'Recepción Compras', icon: PackagePlus, roles: ['warehouse_staff', 'admin'], group: 'operaciones' },
  { to: '/alertas', label: 'Alertas y Vencimientos', icon: AlertTriangle, roles: ['warehouse_staff', 'admin'], group: 'operaciones' },
  { to: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard, roles: ['admin'], group: 'gestion' },
  { to: '/informes', label: 'Informes y Ventas', icon: BarChart3, roles: ['admin'], group: 'gestion' },
  { to: '/promociones', label: 'Promociones (2x1, Packs)', icon: Tag, roles: ['admin'], group: 'gestion' },
  { to: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['admin'], group: 'gestion' },
  { to: '/usuarios', label: 'Usuarios y Turnos', icon: Users, roles: ['admin'], group: 'gestion' },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allowedItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const opItems = allowedItems.filter((i) => i.group === 'operaciones');
  const mgmtItems = allowedItems.filter((i) => i.group === 'gestion');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
      isActive
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-2xs'
        : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
    );

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
      {/* Topbar para móvil */}
      <header className="flex h-16 items-center justify-between border-b border-border/80 bg-card px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Store className="size-5" />
          </div>
          <div>
            <span className="font-display font-bold text-foreground">Aaron</span>
            <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">POS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
            title="Cambiar tema"
          >
            {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card p-4 md:hidden animate-in slide-in-from-top-2">
          <nav className="space-y-1">
            {allowedItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t border-border/80 pt-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
            >
              <LogOut className="size-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Escritorio */}
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card md:flex md:flex-col md:h-screen md:sticky md:top-0">
        {/* Header con Marca */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-500/20">
            <Store className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base font-bold tracking-tight text-foreground">Aaron</span>
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                POS
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Provisiones & Abarrotes</p>
          </div>
        </div>

        {/* Lista de Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {opItems.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Operaciones
              </div>
              <div className="space-y-1">
                {opItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={navLinkClass}>
                    <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {mgmtItems.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Administración
              </div>
              <div className="space-y-1">
                {mgmtItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={navLinkClass}>
                    <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer de Usuario y Configuración */}
        <div className="border-t border-border/80 p-3 bg-secondary/30">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-card border border-border/60 shadow-2xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-foreground">{user?.full_name || user?.username}</div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>{roleLabel(user?.role)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={toggleTheme}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card py-2 text-xs font-medium text-foreground transition-all hover:bg-secondary shadow-2xs active:scale-[0.98]"
              title="Cambiar tema visual"
            >
              {theme === 'light' ? <Moon className="size-3.5 text-slate-600" /> : <Sun className="size-3.5 text-amber-400" />}
              <span>{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-card py-2 text-xs font-medium text-destructive transition-all hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-2xs active:scale-[0.98]"
              title="Cerrar sesión"
            >
              <LogOut className="size-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="min-w-0 flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

function roleLabel(role?: UserRole) {
  if (role === 'admin') return 'Administrador';
  if (role === 'cashier') return 'Cajero';
  if (role === 'warehouse_staff') return 'Bodeguero';
  return '';
}
