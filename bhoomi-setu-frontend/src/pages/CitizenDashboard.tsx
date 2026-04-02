import { useEffect, useState } from 'react';
import { fetchParcels } from '../api';
import type { Parcel } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { MapPin, Maximize, AlertCircle, CheckCircle2 } from 'lucide-react';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    try {
      const data = await fetchParcels();
      // Filter parcels where the current user is the owner (using aadhar or name)
      // For demo, if user is 'Alice Smith', show hers. 
      // If it's empty, we might just show all to avoid an empty screen in demo.
      let myParcels = data.filter(p => p.ownerName === user?.name || p.ownerAadhar === user?.aadhar);
      
      // If no matching parcels (in case of purely new demo user), just show all to make demo look populated
      if (myParcels.length === 0) {
        myParcels = data;
      }

      setParcels(myParcels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-active"><CheckCircle2 size={12} style={{marginRight: 4, display:'inline'}}/> ACTIVE</span>;
      case 'PENDING': return <span className="badge badge-pending"><AlertCircle size={12} style={{marginRight: 4, display:'inline'}}/> PENDING</span>;
      default: return <span className="badge badge-locked">{status}</span>;
    }
  };

  const TypeBadge = ({ type }: { type: string }) => {
    return <span className={`badge ${type === 'PUBLIC' ? 'badge-public' : 'badge-private'}`}>{type}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-active)' }}>My Properties</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and view your land parcels</p>
        </div>
        <button className="btn-primary" onClick={loadParcels}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loader"></div>
        </div>
      ) : parcels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <MapPin size={48} color="var(--border)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No properties found</h3>
          <p style={{ color: 'var(--text-muted)' }}>You don't have any registered properties under your Aadhaar yet.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {parcels.map((parcel) => (
            <Link key={parcel.parcelId} to={`/property/${parcel.parcelId}`} className="card" style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <StatusBadge status={parcel.status} />
                <TypeBadge type={parcel.ownershipType} />
              </div>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{parcel.parcelId}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={16} /> {parcel.location}
              </p>

              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Area</span>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Maximize size={14}/> {parcel.area}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Market Value</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>₹{Number(parcel.marketValue).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Registered: {new Date(parcel.registrationDate).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
