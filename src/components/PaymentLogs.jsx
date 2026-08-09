import React, { useMemo, useState } from 'react';
import { Search, IndianRupee, FileText, User, Calendar } from 'lucide-react';

export default function PaymentLogs({ invoices, customers }) {
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Payment History Logs</h2>
          <p style={{ color: '#64748b' }}>Centralized view of all auto-allocated bulk payments</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box">
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search by client or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div className="stat-title" style={{ color: '#166534' }}>Total Tracked in Logs</div>
          <h3 style={{ color: '#15803d' }}>₹{totalCollected.toLocaleString('en-IN')}</h3>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Transactions</div>
          <h3>{filteredLogs.length}</h3>
        </div>
      </div>

      <div className="card">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <IndianRupee size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h3>No payment logs found</h3>
            <p>When you use the 'Record Bulk Payment' button on the Clients page, logs will appear here.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client Name</th>
                  <th>Invoice Link</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                        <Calendar size={14} />
                        {log.dateStr}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                        <User size={14} color="#64748b" />
                        {log.customerName}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={14} color="#3b82f6" />
                        <span className="badge badge-primary">{log.invoiceNo}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>
                      ₹{log.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
