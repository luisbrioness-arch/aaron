import { Navigate, Route, Routes } from 'react-router';
import { Layout } from '@/components/Layout';
import { RequireRole } from '@/components/RequireRole';
import { useAuthStore } from '@/store/authStore';
import {
  LoginPage,
  POSPage,
  BodegaPage,
  RecepcionPage,
  AlertasPage,
  DashboardPage,
  ReportsPage,
  PromotionsPage,
  SuppliersPage,
  UsersPage,
} from '@/pages';

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user.role === 'warehouse_staff') return <Navigate to="/recepcion" replace />;
  return <Navigate to="/pos" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route
          path="/pos"
          element={
            <RequireRole allowed={['cashier', 'admin']}>
              <POSPage />
            </RequireRole>
          }
        />
        <Route
          path="/bodega"
          element={
            <RequireRole allowed={['cashier', 'warehouse_staff', 'admin']}>
              <BodegaPage />
            </RequireRole>
          }
        />
        <Route
          path="/recepcion"
          element={
            <RequireRole allowed={['warehouse_staff', 'admin']}>
              <RecepcionPage />
            </RequireRole>
          }
        />
        <Route
          path="/alertas"
          element={
            <RequireRole allowed={['warehouse_staff', 'admin']}>
              <AlertasPage />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireRole allowed={['admin']}>
              <DashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/informes"
          element={
            <RequireRole allowed={['admin']}>
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/promociones"
          element={
            <RequireRole allowed={['admin']}>
              <PromotionsPage />
            </RequireRole>
          }
        />
        <Route
          path="/proveedores"
          element={
            <RequireRole allowed={['admin']}>
              <SuppliersPage />
            </RequireRole>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RequireRole allowed={['admin']}>
              <UsersPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
