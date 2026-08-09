import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, MapPin, Phone, Building, Save, X, Banknote } from 'lucide-react';

export default function CustomerManager({ customers, invoices = [], onAddCustomer, onUpdateCustomer, onDeleteCustomer, onRecordPayment }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [paymentModalData, setPaymentModalData] = useState(null);

  const calculateTotalOutstanding = (cust) => {
    if (!cust) return 0;
    let totalNetBilled = 0;
    let totalPaid = 0;
    const norm = String(cust.name).trim().toLowerCase();
    
    invoices.forEach(inv => {
      const invName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
      if (invName === norm && inv.status !== 'Draft') {
        // True net amount of this invoice (excluding carried balance)
        const netInvoiceAmount = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.oldBalance || 0));
        totalNetBilled += netInvoiceAmount;

        if (inv.status === 'Paid') {
          totalPaid += Number(inv.totalAmount || 0);
        } else if (inv.status === 'Partially Paid') {
          totalPaid += Number(inv.paidAmount || 0);
        }
      }
    });

    const baseOld = Number(cust.oldBalance || 0);
    return baseOld + totalNetBilled - totalPaid;
  };
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    oldBalance: 0
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      gstin: '',
      oldBalance: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({ ...cust });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      onUpdateCustomer({ ...formData, id: editingCustomer.id });
    } else {
      onAddCustomer({ ...formData, id: `cust-${Date.now()}` });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="page-wrapper">
      <div className="form-card">
      <div className="card-header">
        <div className="card-title">
          <Users className="text-indigo-400" size={22} />
          Clients & Customers Management
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add New Client
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {customers.map((c) => (
          <div 
            key={c.id} 
            style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{c.name}</h3>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderRadius: '4px' }}>
                  {c.state || 'Karnataka'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <MapPin size={14} style={{ marginTop: '3px', shrink: 0 }} /> 
                  <div>
                    {c.address}
                    {(c.city || c.state || c.pincode) && (
                      <>
                        {c.address ? ', ' : ''}
                        {[c.city, c.state].filter(Boolean).join(', ')}
                        {c.pincode ? ` - ${c.pincode}` : ''}
                      </>
                    )}
                  </div>
                </div>
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} /> {c.phone}
                  </div>
                )}
                {c.gstin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={14} /> <strong>GSTIN:</strong> {c.gstin}
                  </div>
                )}
                {(() => {
                  const totalOutstanding = calculateTotalOutstanding(c);
                  if (totalOutstanding > 0) {
                    return (
                      <div style={{ marginTop: '0.5rem', color: 'var(--accent-warning)', fontWeight: '600' }}>
                        Current Outstanding Balance: ₹{totalOutstanding.toLocaleString('en-IN')}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button 
                className="btn btn-secondary btn-icon" 
                style={{ color: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}
                onClick={() => setPaymentModalData({ customer: c, amount: '' })} 
                title="Record Payment"
              >
                <Banknote size={14} />
              </button>
              <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(c)} title="Edit">
                <Edit2 size={14} />
              </button>
              <button className="btn btn-danger btn-icon" onClick={() => onDeleteCustomer(c.id)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title">
                {editingCustomer ? 'Edit Client Details' : 'Add New Client'}
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client / Firm Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.gstin} 
                    onChange={e => setFormData({ ...formData, gstin: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address Line</label>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.city} 
                    onChange={e => setFormData({ ...formData, city: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.state} 
                    onChange={e => setFormData({ ...formData, state: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.pincode} 
                    onChange={e => setFormData({ ...formData, pincode: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Opening Balance (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.oldBalance} 
                    onChange={e => setFormData({ ...formData, oldBalance: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="card-header">
              <div className="card-title">
                Record Payment
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setPaymentModalData(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>
              Automatically allocate this payment to <strong>{paymentModalData.customer.name}</strong>'s oldest unpaid bills.
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              onRecordPayment(paymentModalData.customer.name, Number(paymentModalData.amount));
              setPaymentModalData(null);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Amount (₹) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
                  required
                  min="1"
                  autoFocus
                  value={paymentModalData.amount} 
                  onChange={e => setPaymentModalData({ ...paymentModalData, amount: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentModalData(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}>
                  <Banknote size={16} /> Apply Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
