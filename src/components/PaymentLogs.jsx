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
    <div className="fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem', borderBottom: 'none' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '0.75rem', color: '#16a34a' }}>
              <IndianRupee size={24} />
            </div>
            Payment Logs
          </h2>
          <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.95rem' }}>Centralized tracker for all auto-allocated client payments</p>
        </div>
        <div className="search-box" style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', borderRadius: '1rem', padding: '0.25rem 0.5rem' }}>
          <Search size={18} color="#94a3b8" style={{ marginLeft: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Search by client or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '1.25rem', padding: '1.5rem', color: 'white', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10%', top: '-20%', opacity: 0.1 }}>
            <IndianRupee size={120} />
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', opacity: 0.9, marginBottom: '0.5rem' }}>Total Tracked Revenue</div>
          <h3 style={{ fontSize: '2.25rem', fontWeight: '700', letterSpacing: '-0.025em', margin: 0 }}>₹{totalCollected.toLocaleString('en-IN')}</h3>
        </div>
        
        <div style={{ background: '#ffffff', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#64748b', marginBottom: '0.5rem' }}>Total Transactions Recorded</div>
          <h3 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>{filteredLogs.length}</h3>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Recent Transactions</h3>

      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '1.25rem', border: '2px dashed #e2e8f0' }}>
          <div style={{ background: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Search size={28} color="#94a3b8" />
          </div>
          <h3 style={{ color: '#475569', fontSize: '1.1rem' }}>No payment logs found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto 0' }}>When you use the 'Record Bulk Payment' button on the Clients page, logs will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredLogs.map((log) => (
            <div 
              key={log.id} 
              style={{ 
                background: '#ffffff', 
                borderRadius: '1rem', 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '0.75rem', color: '#16a34a' }}>
                  <IndianRupee size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                    {log.customerName}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={12} /> {log.dateStr}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={12} /> Allocated to <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '500' }}>{log.invoiceNo}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                  +₹{log.amount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.2rem' }}>
                  Successful
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
