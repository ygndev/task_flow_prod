import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleGuard } from './components/RoleGuard';
import Login from './pages/Login';
import Register from './pages/Register';
import Member from './pages/Member';
import AdminTasks from './pages/AdminTasks';
import AdminReports from './pages/AdminReports';
import MemberTasks from './pages/MemberTasks';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    // Redirect based on role
    if (role === 'ADMIN') {
      return <Navigate to="/admin/tasks" replace />;
    } else {
      return <Navigate to="/member/tasks" replace />;
    }
  }

  return <>{children}</>;
}

function Home() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    if (role === 'ADMIN') {
      return <Navigate to="/admin/tasks" replace />;
    } else {
      return <Navigate to="/member/tasks" replace />;
    }
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/member"
        element={
          <ProtectedRoute>
            <Member />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tasks"
        element={
          <RoleGuard requiredRole="ADMIN">
            <AdminTasks />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RoleGuard requiredRole="ADMIN">
            <AdminReports />
          </RoleGuard>
        }
      />
      <Route
        path="/member/tasks"
        element={
          <RoleGuard>
            <MemberTasks />
          </RoleGuard>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
