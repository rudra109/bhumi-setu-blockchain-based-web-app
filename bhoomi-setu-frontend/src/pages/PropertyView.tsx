import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchParcelById, fetchParcelAnchor } from '../api';
import type { Parcel } from '../api';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { ShieldCheck, UserCheck, ArrowRightLeft, FileText, Building2, History, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17);
  }, [center, map]);
  return null;
}

const PropertyView = () => {
  const { id } = useParams<{ id: string }>();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [anchor, setAnchor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchParcelById(id),
        fetchParcelAnchor(id).catch(() => null) // Ignore error if not anchored yet
      ]).then(([parcelData, anchorData]) => {
        setParcel(parcelData);
        setAnchor(anchorData);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loader"></div></div>;
  if (!parcel) return <div>Property not found</div>;

  // Static demo polygon roughly in Gandhinagar
  const center: [number, number] = [23.2156, 72.6369];
  const polygonBounds: [number, number][] = [
    [23.215, 72.636],
    [23.216, 72.636],
    [23.216, 72.637],
    [23.215, 72.637],
  ];

  return (
    <div>
      <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ChevronLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Main Area */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Parcel: {parcel.parcelId}</h1>
                <span className={`badge ${parcel.status === 'ACTIVE' ? 'badge-active' : 'badge-pending'}`}>{parcel.status}</span>
              </div>
              <span className="badge badge-private" style={{ fontSize: '0.875rem' }}>{parcel.ownershipType}</span>
            </div>

            <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem' }}>
              <Building2 size={16} /> {parcel.location}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <span className="label">Unique Parcel ID (ULPIN)</span>
                <strong style={{ fontSize: '1.125rem' }}>{parcel.ulpin}</strong>
              </div>
              <div>
                <span className="label">Total Area</span>
                <strong style={{ fontSize: '1.125rem' }}>{parcel.area}</strong>
              </div>
              <div>
                <span className="label">Market Value</span>
                <strong style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>₹{Number(parcel.marketValue).toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span className="label">Registered On</span>
                <strong style={{ fontSize: '1.125rem' }}>{new Date(parcel.registrationDate).toLocaleDateString()}</strong>
              </div>
            </div>
            
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck color="var(--success)" size={20} /> Current Owner Details
            </h3>
            
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-active)', margin: 0 }}>{parcel.ownerName}</h4>
                  <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
                    <ShieldCheck size={12} /> Aadhaar Verified: XXXX-XXXX-{parcel.ownerAadhar.slice(-4)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ height: '400px', padding: 0, overflow: 'hidden' }}>
            <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; ESRI'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <MapUpdater center={center} />
              <Polygon positions={polygonBounds} color="var(--primary)" weight={3} fillColor="var(--primary)" fillOpacity={0.4} />
            </MapContainer>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Quick Actions</h3>
            
            {user?.role === 'CITIZEN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {parcel.status === 'ACTIVE' ? (
                  <Link to={`/transfer/${parcel.parcelId}`} className="btn-primary" style={{ width: '100%' }}>
                    <ArrowRightLeft size={16} /> Transfer Property
                  </Link>
                ) : (
                  <button className="btn-secondary" disabled style={{ width: '100%', opacity: 0.6 }}>
                    <ArrowRightLeft size={16} /> Transfer Pending
                  </button>
                )}
                
                <button className="btn-secondary" style={{ width: '100%' }}>
                  <FileText size={16} /> Download Title Deed
                </button>
              </div>
            )}
            
            {user?.role === 'REGISTRAR' && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                As a registrar, you can review transfers in your dashboard.
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck color="var(--primary)" /> Polygon Amoy Status
            </h3>
            
            {anchor ? (
              <div>
                <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> 
                  Cryptographically verified and anchored on Polygon
                </div>
                <div className="label">DocHash Reference</div>
                <code style={{ background: '#F1F5F9', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', wordBreak: 'break-all', display: 'block', marginBottom: '0.75rem' }}>
                  {anchor.docHash || parcel.docHash}
                </code>
                <div className="label">Anchored At</div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-active)' }}>
                  {anchor.anchoredAt ? new Date(anchor.anchoredAt).toLocaleString() : new Date(parcel.lastUpdated).toLocaleString()}
                </p>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <History size={16} style={{ marginBottom: '8px' }}/>
                Not yet anchored on Polygon mainnet mapping. A transfer approval triggers the anchor.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertyView;
