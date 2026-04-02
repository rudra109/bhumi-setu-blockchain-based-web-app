import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import CitizenDashboard from './pages/CitizenDashboard';
import RegistrarDashboard from './pages/RegistrarDashboard';
import PropertyView from './pages/PropertyView';
import TransferPage from './pages/TransferPage';
import BhoomikaChat from './components/BhoomikaChat';

// Simple protected route wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppContent() {
  const { user } = useAuth();
  
  return (
    <div className="page-wrapper">
      {user && <Header />}
      <main className="main-content container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {user?.role === 'REGISTRAR' ? <RegistrarDashboard /> : <CitizenDashboard />}
            </ProtectedRoute>
          } />
          
          <Route path="/property/:id" element={
            <ProtectedRoute>
              <PropertyView />
            </ProtectedRoute>
          } />

          <Route path="/transfer/:id" element={
            <ProtectedRoute allowedRole="CITIZEN">
              <TransferPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BhoomikaChat />
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
