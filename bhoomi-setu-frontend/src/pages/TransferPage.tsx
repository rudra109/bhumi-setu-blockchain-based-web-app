import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchParcelById, requestTransfer } from '../api';
import type { Parcel } from '../api';
import { Shield, ChevronLeft } from 'lucide-react';

const TransferPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerAadhar, setNewOwnerAadhar] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchParcelById(id).then(data => {
        setParcel(data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || newOwnerName.trim() === '' || newOwnerAadhar.length !== 12) {
      alert("Please enter valid name and 12-digit Aadhaar");
      return;
    }

    try {
      setSubmitting(true);
      await requestTransfer(id, newOwnerName, newOwnerAadhar);
      alert("Transfer request submitted to Registrar!");
      navigate(`/property/${id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Error submitting transfer request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="loader"></div></div>;
  if (!parcel) return <div>Property not found</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Link to={`/property/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ChevronLeft size={16} /> Back to Property
      </Link>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Shield color="var(--primary)" size={48} style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Initiate Property Transfer</h1>
          <p style={{ color: 'var(--text-muted)' }}>Transfer ownership of parcel {parcel.parcelId}</p>
        </div>

        <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
          <div>
            <span className="label" style={{ marginBottom: 0 }}>Current Owner</span>
            <strong style={{ fontSize: '1.125rem' }}>{parcel.ownerName}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="label" style={{ marginBottom: 0 }}>Location</span>
            <strong style={{ fontSize: '1.125rem' }}>{parcel.location}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="label">New Owner Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Full Legal Name"
              value={newOwnerName}
              onChange={e => setNewOwnerName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">New Owner Aadhaar Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="12-digit Aadhaar ID"
              value={newOwnerAadhar}
              onChange={e => setNewOwnerAadhar(e.target.value.replace(/\D/g, '').substring(0,12))}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => navigate(`/property/${id}`)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={submitting}>
              {submitting ? <span className="loader" style={{ width: 16, height: 16, borderColor: 'white', borderTopColor: 'transparent' }}></span> : 'Submit Request to Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferPage;
