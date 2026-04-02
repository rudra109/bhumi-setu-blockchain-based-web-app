import { useEffect, useState } from 'react';
import { fetchParcels, approveTransfer } from '../api';
import type { Parcel } from '../api';
import { ShieldCheck, Info, CheckCircle } from 'lucide-react';

const RegistrarDashboard = () => {
  const [pendingParcels, setPendingParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchParcels();
      // Filter parcels with PENDING status
      setPendingParcels(data.filter(p => p.status === 'PENDING'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (parcelId: string, historyRec: any) => {
    if (!historyRec || !historyRec.requestId) return alert("No valid request ID found.");
    try {
      setSubmitting(parcelId);
      await approveTransfer(parcelId, historyRec.requestId);
      alert("Transfer approved and anchored to Polygon successfully!");
      loadPendingRequests();
    } catch (err) {
      console.error(err);
      alert("Failed to approve transfer.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-active)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="var(--primary)" size={32} /> Registrar Approvals
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and approve pending property transfers</p>
        </div>
        <button className="btn-secondary" onClick={loadPendingRequests}>
          Refresh List
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loader"></div>
        </div>
      ) : pendingParcels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>All Caught Up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>There are no pending property transfer requests at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingParcels.map(parcel => {
            const lastTransfer = parcel.transferHistory?.[parcel.transferHistory.length - 1];
            
            return (
              <div key={parcel.parcelId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Transfer Request for {parcel.parcelId}
                    <span className="badge badge-pending">PENDING APPROVAL</span>
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
                    <div>
                      <span className="label" style={{ marginBottom: 0 }}>Current Owner</span>
                      <strong style={{ color: 'var(--text-active)' }}>{lastTransfer?.fromOwner || 'Unknown'}</strong>
                    </div>
                    <div>
                      <span className="label" style={{ marginBottom: 0 }}>New Owner</span>
                      <strong style={{ color: 'var(--primary)' }}>{lastTransfer?.toOwner || parcel.ownerName}</strong>
                    </div>
                    <div>
                      <span className="label" style={{ marginBottom: 0 }}>Request Time</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(lastTransfer?.dateRequested || parcel.lastUpdated).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-secondary">
                    <Info size={16} /> Details
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleApprove(parcel.parcelId, lastTransfer)}
                    disabled={submitting === parcel.parcelId}
                  >
                    {submitting === parcel.parcelId ? <span className="loader" style={{ width: 16, height: 16, borderColor: 'white', borderTopColor: 'transparent' }}></span> : <><CheckCircle size={16} /> Approve & Anchor</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegistrarDashboard;
