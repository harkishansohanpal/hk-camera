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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Landing />} />
        <Route path="/pricing"  element={<Pricing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
