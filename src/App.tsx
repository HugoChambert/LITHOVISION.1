import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/auth/AuthForm';
import { Header } from './components/layout/Header';
import { AdminPage } from './pages/AdminPage';
import { VisualizePage } from './pages/VisualizePage';
import { ProjectsPage } from './pages/ProjectsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <span className="loading" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/visualize" /> : <AuthForm />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Header />
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/visualize"
        element={
          <ProtectedRoute>
            <Header />
            <VisualizePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Header />
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/visualize" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
