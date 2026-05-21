import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import CameraView from './pages/CameraView';
import Viewer     from './pages/Viewer';
import Recordings from './pages/Recordings';
import Settings   from './pages/Settings';
import Alerts     from './pages/Alerts';
import Landing    from './pages/Landing';
import Pricing    from './pages/Pricing';
import Billing    from './pages/Billing';
import Privacy    from './pages/Privacy';
import Terms      from './pages/Terms';
import AdminRoute    from './components/AdminRoute';
import AdminLayout   from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogAnalyzer from './pages/admin/AdminLogAnalyzer';

import CookieBanner from './components/CookieBanner';

export default function App() {
  return (
    <AuthProvider>
      <CookieBanner />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Landing />} />
        <Route path="/pricing"  element={<Pricing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy"  element={<Privacy />} />
        <Route path="/terms"    element={<Terms />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"          element={<Dashboard />} />
            <Route path="/cameras/:cameraId"  element={<CameraView />} />
            <Route path="/viewer/:streamKey"  element={<Viewer />} />
            <Route path="/recordings"         element={<Recordings />} />
            <Route path="/alerts"             element={<Alerts />} />
            <Route path="/settings"           element={<Settings />} />
            <Route path="/billing"            element={<Billing />} />
          </Route>
        </Route>

        {/* Admin (requires ADMIN role) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"             element={<AdminDashboard />} />
            <Route path="/admin/logs"        element={<AdminDashboard />} />
            <Route path="/admin/analyze"     element={<AdminLogAnalyzer />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
