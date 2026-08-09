import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, FileText, User, Calendar, Database, Users, Plus, Save, X } from 'lucide-react';

export default function PaymentLogs({ invoices, customers, onRecordPayment }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    amount: ''
  });

  const paymentHistory = useMemo(() => {
    const logs = [];
    
    invoices.forEach(inv => {
      if (!inv.notes) return;
      
      const regex = /Auto-allocated (?:partial )?₹([\d,]+) from bulk payment on ([\d/]+)\./g;
      let match;
      
      while ((match = regex.exec(inv.notes)) !== null) {
        const amountStr = match[1];
        const dateStr = match[2];
        const amount = Number(amountStr.replace(/,/g, ''));
        
        // Find the customer name based on the invoice's customer data
        const customerName = inv.customer?.name || (inv.customer?.extendedData?.customerName) || 'Unknown Customer';
        
        logs.push({
          id: `${inv.id}-${logs.length}`,
          invoiceNo: inv.invoiceNo,
          customerName: customerName,
          amount: amount,
          dateStr: dateStr,
          timestamp: parseDate(dateStr)
        });
      }
    });
    
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [invoices]);

  function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    if (day && month && year) {
      return new Date(`${year}-${month}-${day}`).getTime();
    }
    return 0;
  }

  const filteredLogs = paymentHistory.filter(log => 
    log.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCollected = filteredLogs.reduce((sum, log) => sum + log.amount, 0);

  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="card-header">
          <div className="card-title">
            <Database className="text-indigo-400" size={22} />
            Payment Tracking Logs
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => {
              setFormData({ customerName: customers[0]?.name || '', amount: '' });
              setIsModalOpen(true);
            }}>
              <Plus size={16} /> Record Payment
            </button>
          </div>
        </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="stat-title" style={{ color: '#166534' }}>Total Tracked Revenue</div>
          <h3 style={{ color: '#15803d' }}>₹{totalCollected.toLocaleString('en-IN')}</h3>
        </div>
        
        <div className="stat-card">
          <div className="stat-title">Total Transactions Recorded</div>
          <h3>{filteredLogs.length}</h3>
        </div>
      </div>

      <div className="items-table-wrapper" style={{ marginTop: '1.5rem' }}>
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <IndianRupee size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3>No payments found</h3>
            <p>Try a different search term or check back later.</p>
          </div>
        ) : (
          <table className="items-table list-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Invoice No</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                      <Calendar size={14} />
                      {log.dateStr}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                      <Users size={14} color="#6366f1" />
                      {log.customerName}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={14} color="#94a3b8" />
                      <span className="badge badge-secondary">{log.invoiceNo}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                    +₹{log.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="card-title">Record Client Payment</div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Client <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="form-input"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                >
                  <option value="">Select a client...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (₹) <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="number" 
                  className="form-input"
                  placeholder="e.g. 50000"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  min="1"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                const amt = Number(formData.amount);
                if (!formData.customerName || isNaN(amt) || amt <= 0) {
                  alert("Please select a valid client and enter an amount greater than zero!");
                  return;
                }
                try {
                  await onRecordPayment(formData.customerName, amt);
                  setIsModalOpen(false);
                } catch (err) {
                  alert("Failed to record payment: " + err.message);
                }
              }}>
                <Save size={16} /> Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
