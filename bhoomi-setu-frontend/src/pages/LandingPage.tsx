import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, Phone, Building2 } from 'lucide-react';

const LandingPage = () => {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  // Example demo users
  const CITIZEN_DEMO = { phone: '9876543210', name: 'Alice Smith', role: 'CITIZEN' as const, aadhar: '111122223333' };
  const REGISTRAR_DEMO = { phone: '1234567890', name: 'Registrar Auth', role: 'REGISTRAR' as const, aadhar: '000000000000' };

  useEffect(() => {
    if (user) {
      if (user.role === 'REGISTRAR') navigate('/dashboard');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
      setShowOtp(true);
      // In real app, this would trigger an SMS
    } else {
      alert("Please enter a valid 10-digit number.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '1234') { // Demo static OTP
      // Match phone against demo users
      if (phone === REGISTRAR_DEMO.phone) {
        await login(REGISTRAR_DEMO.phone, REGISTRAR_DEMO.role, REGISTRAR_DEMO.name, REGISTRAR_DEMO.aadhar);
      } else {
        // Default to citizen
        await login(phone, 'CITIZEN', 'Demo Citizen', '555566667777');
      }
    } else {
      alert("Invalid OTP. For demo use 1234");
    }
  };

  const handleDemoLogin = async (role: 'CITIZEN' | 'REGISTRAR') => {
    if (role === 'CITIZEN') {
      await login(CITIZEN_DEMO.phone, CITIZEN_DEMO.role, CITIZEN_DEMO.name, CITIZEN_DEMO.aadhar);
    } else {
      await login(REGISTRAR_DEMO.phone, REGISTRAR_DEMO.role, REGISTRAR_DEMO.name, REGISTRAR_DEMO.aadhar);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-light), var(--background))',
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: 450, width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <Map color="var(--primary)" size={48} style={{ marginBottom: '1rem' }} />
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '2rem' }}>BhoomiSetu</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Decentralized Land Registry System</p>

        {!showOtp ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label className="label">Mobile Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 12px',
                  background: '#F1F5F9',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontWeight: 600
                }}>+91</span>
                <input 
                  type="tel"
                  className="input-field" 
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').substring(0,10))}
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label className="label">Enter OTP (Demo: 1234)</label>
              <input 
                type="text"
                className="input-field" 
                placeholder="4-digit PIN"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={4}
                required
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem', fontWeight: 600 }}
              />
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? <span className="loader" style={{ width: 16, height: 16 }}></span> : 'Verify & Login'}
            </button>

            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: '100%', marginTop: '1rem', border: 'none' }}
              onClick={() => setShowOtp(false)}
            >
              Change Phone Number
            </button>
          </form>
        )}

        <div style={{ margin: '2rem 0', position: 'relative' }}>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
          <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            DEMO ACCESS
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flex: 1, fontSize: '0.875rem' }}
            onClick={() => handleDemoLogin('CITIZEN')}
            disabled={isLoading}
          >
            <Phone size={16} /> Login as Citizen
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ flex: 1, fontSize: '0.875rem' }}
            onClick={() => handleDemoLogin('REGISTRAR')}
            disabled={isLoading}
          >
            <Building2 size={16} /> Login as Registrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
