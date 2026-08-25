import { Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

// El backend es quien de verdad exige el rol en cada endpoint
// (middleware.php::requireRole) — esto solo evita que la UI muestre
// pantallas que el usuario no debería ni ver. Nunca confiar solo en esto.
export function RequireRole({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
