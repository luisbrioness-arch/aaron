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
}

const NAV_ITEMS: NavItem[] = [
  { to: '/pos', label: 'Punto de venta', icon: ShoppingCart, roles: ['cashier', 'admin'] },
  { to: '/bodega', label: 'Bodega', icon: Boxes, roles: ['cashier', 'warehouse_staff', 'admin'] },
  { to: '/recepcion', label: 'Recibir compra', icon: PackagePlus, roles: ['warehouse_staff', 'admin'] },
  { to: '/alertas', label: 'Alertas', icon: AlertTriangle, roles: ['warehouse_staff', 'admin'] },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/informes', label: 'Informes', icon: BarChart3, roles: ['admin'] },
  { to: '/promociones', label: 'Promociones', icon: Tag, roles: ['admin'] },
  { to: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['admin'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['admin'] },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
          <div className="flex items-center gap-2 px-5 py-5">
            <span className="font-display text-lg font-bold">🛒 Aaron Provisiones</span>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <div className="mb-2 px-2 text-xs text-muted-foreground">
              {user?.full_name} · {roleLabel(user?.role)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-secondary"
              >
                {theme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                {theme === 'light' ? 'Oscuro' : 'Claro'}
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <LogOut className="size-3.5" />
                Salir
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function roleLabel(role?: UserRole) {
  if (role === 'admin') return 'Administrador';
  if (role === 'cashier') return 'Cajero';
  if (role === 'warehouse_staff') return 'Bodega';
  return '';
}
