import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle, 
  Clock, 
  FileText,
  Bookmark,
  TrendingUp,
  PieChart,
  MoreVertical
} from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import InvoicePaper from './InvoicePaper';

export default function InvoiceList({ 
  invoices, 
  company, 
  onEditInvoice, 
  onDeleteInvoice, 
  onToggleStatus, 
  onDuplicateInvoice 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activePreviewInvoice, setActivePreviewInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      return dateStr;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatMobileDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      const parts = dateStr.split('-');
      return `${parts[0]}/${parts[1]}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.referenceDC && inv.referenceDC.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  
  // Calculate total pending receivables including remaining balances of Partially Paid bills
  const totalPending = invoices.reduce((sum, inv) => {
    if (inv.status === 'Pending') {
      return sum + (inv.totalAmount || 0);
    } else if (inv.status === 'Partially Paid') {
      const paid = Number(inv.paidAmount || 0);
      return sum + Math.max(0, (inv.totalAmount || 0) - paid);
    }
    return sum;
  }, 0);

  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
  const partialCount = invoices.filter(inv => inv.status === 'Partially Paid').length;
  const draftCount = invoices.filter(inv => inv.status === 'Draft').length;

  const handleDownloadPDF = async (inv) => {
    setActivePreviewInvoice(inv);
    setDownloadingId(inv.id);

    setTimeout(async () => {
      await generateInvoicePDF('hidden-preview-paper', `Invoice_${inv.invoiceNo}.pdf`);
      setDownloadingId(null);
      setActivePreviewInvoice(null);
    }, 300);
  };

  return (
    <div className="page-wrapper">
      {/* Hidden container for PDF rendering */}
      {activePreviewInvoice && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <InvoicePaper invoice={activePreviewInvoice} company={company} id="hidden-preview-paper" />
        </div>
      )}

      {/* Analytics Stat Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3>₹{totalInvoiced.toLocaleString('en-IN')}</h3>
            <p>Total Revenue Invoiced</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>₹{totalPending.toLocaleString('en-IN')}</h3>
            <p>Total Unpaid Receivables</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{paidCount} Paid / {partialCount} Partial</h3>
            <p>Status: {draftCount} Drafts</p>
          </div>
        </div>
      </div>

      {/* Invoice List Card */}
      <div className="form-card">
        <div className="card-header">
          <div className="card-title">
            <FileText className="text-indigo-400" size={22} />
            Saved Invoices & Drafts History
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', width: '240px' }}
                placeholder="Search Invoice or Client..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select 
              className="form-select"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="items-table-wrapper">
          <table className="items-table list-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th data-mobile-hide="client">Client / Customer</th>
                <th data-mobile-hide="dc">Ref DC No.</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Invoice">
                      <strong style={{ color: 'var(--accent-primary)' }}>{inv.invoiceNo}</strong>
                    </td>
                    <td data-label="Date">
                      <span className="desktop-only-inline">{formatFullDate(inv.date)}</span>
                      <span className="mobile-only-inline">{formatMobileDate(inv.date)}</span>
                    </td>
                    <td data-label="Client / Customer" data-mobile-hide="client">
                      <div>
                        <strong>{inv.customer?.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {inv.customer?.gstin ? `GST: ${inv.customer.gstin}` : 'No GST'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Ref DC No." data-mobile-hide="dc">{inv.referenceDC || '-'}</td>
                    <td data-label="Total Amount" style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1rem' }}>₹{Number(inv.totalAmount).toLocaleString('en-IN')}</strong>
                    </td>
                    <td data-label="Status" style={{ textAlign: 'center' }}>
                      {inv.status === 'Draft' ? (
                        <span 
                          style={{ 
                            padding: '0.25rem 0.65rem', 
                            fontSize: '0.75rem', 
                            borderRadius: '12px', 
                            background: 'rgba(245, 158, 11, 0.2)', 
                            color: '#f59e0b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 'bold'
                          }}
                        >
                          <Bookmark size={12} /> Draft
                        </span>
                      ) : inv.status === 'Partially Paid' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <button 
                            onClick={() => onToggleStatus(inv.id)}
                            className="btn"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 'bold' }}
                          >
                            <PieChart size={12} /> Partial (Paid ₹{Number(inv.paidAmount || 0).toLocaleString('en-IN')})
                          </button>
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600' }}>
                            Bal: ₹{Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => onToggleStatus(inv.id)}
                          className={`btn ${inv.status === 'Paid' ? 'btn-success' : 'btn-secondary'}`}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '12px' }}
                        >
                          {inv.status === 'Paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {inv.status}
                        </button>
                      )}
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right', overflow: 'visible' }}>
                      {/* Desktop view actions (horizontal button row) */}
                      <div className="desktop-actions" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-primary btn-icon" 
                          onClick={() => handleDownloadPDF(inv)}
                          title="Download PDF"
                          disabled={downloadingId === inv.id}
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => onEditInvoice(inv)}
                          title="Edit Invoice / Draft"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => onDuplicateInvoice(inv)}
                          title="Duplicate Invoice"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          onClick={() => onDeleteInvoice(inv.id)}
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Mobile view actions (3-dots dropdown menu) */}
                      <div className="mobile-actions" style={{ position: 'relative' }}>
                        <button 
                          className={`btn btn-secondary btn-icon ${activeDropdownId === inv.id ? 'active' : ''}`}
                          onClick={() => setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id)}
                          title="Actions Menu"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeDropdownId === inv.id && (
                          <>
                            <div 
                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                              onClick={() => setActiveDropdownId(null)}
                            />
                            <div className="actions-dropdown-menu" style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              zIndex: 100,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: 'var(--shadow-md)',
                              minWidth: '150px',
                              padding: '0.25rem 0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              <button 
                                className="settings-dropdown-item" 
                                onClick={() => { onEditInvoice(inv); setActiveDropdownId(null); }}
                              >
                                <Edit3 size={14} /> Edit Invoice
                              </button>
                              <button 
                                className="settings-dropdown-item" 
                                onClick={() => { handleDownloadPDF(inv); setActiveDropdownId(null); }}
                                disabled={downloadingId === inv.id}
                              >
                                <Download size={14} /> Download PDF
                              </button>
                              <button 
                                className="settings-dropdown-item" 
                                onClick={() => { onDuplicateInvoice(inv); setActiveDropdownId(null); }}
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <div className="settings-dropdown-divider" />
                              <button 
                                className="settings-dropdown-item text-red-500" 
                                onClick={() => { onDeleteInvoice(inv.id); setActiveDropdownId(null); }}
                                style={{ color: '#ef4444' }}
                              >
                                <Trash2 size={14} style={{ color: '#ef4444' }} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No invoices match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
