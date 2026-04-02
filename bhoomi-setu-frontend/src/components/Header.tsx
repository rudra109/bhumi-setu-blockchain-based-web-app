// Header.tsx
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Map, Shield } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/dashboard" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map color="var(--primary)" size={28} />
          <span style={{ color: 'var(--primary)' }}>BhoomiSetu</span>
        </Link>
        
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user.role} {user.aadhar && `• ${user.aadhar.slice(-4)}`}
                {user.role === 'REGISTRAR' && <Shield size={12} style={{marginLeft: 4, display: 'inline'}}/>}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
