import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Users, 
  Package, 
  PlusCircle, 
  FileText, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  Building2, 
  DollarSign, 
  Truck, 
  AlertCircle,
  Download,
  Edit3,
  MoreVertical,
  Copy,
  Trash2,
  Database,
  Upload,
  X
} from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import InvoicePaper from './InvoicePaper';
import { parseIVKExcel } from '../utils/excelImporter';

export default function Dashboard({ 
  invoices = [], 
  customers = [], 
  products = [], 
  company = {}, 
  shipments = [],
  setActiveTab, 
  onNewInvoice, 
  onEditInvoice,
  onImportExcelData
}) {
  const [activePreviewInvoice, setActivePreviewInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState(null);

  // Safe list filters
  const safeInvoices = (Array.isArray(invoices) ? invoices.filter(Boolean) : [])
    .filter(inv => inv?.invoiceNo !== 'SHIPMENTS_LEDGER');
  const safeCustomers = Array.isArray(customers) ? customers.filter(Boolean) : [];
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  const safeCompany = company || {};

  // Financial Calculations
  const getInvoiceTotal = (inv) => {
    return inv?.useCustomTotalAmount && Number(inv?.customTotalAmount) >= 0 
      ? Number(inv.customTotalAmount) 
      : (Number(inv?.totalAmount) || 0);
  };

  const globalFinancials = safeInvoices
    .filter(inv => inv.status !== 'Draft')
    .reduce((acc, inv) => {
      const total = getInvoiceTotal(inv);
      const netBilled = Math.max(0, total - Number(inv.oldBalance || 0));
      const paid = inv.status === 'Paid' ? total : Number(inv.paidAmount || 0);
      
      return {
        invoiced: acc.invoiced + netBilled,
        collected: acc.collected + paid
      };
    }, { invoiced: 0, collected: 0 });

  const totalCustomerOldBalances = safeCustomers.reduce((sum, c) => sum + (Number(c.oldBalance) || 0), 0);

  const totalInvoiced = globalFinancials.invoiced;
  const totalCollected = globalFinancials.collected;
  const totalPending = totalInvoiced + totalCustomerOldBalances - totalCollected;

  const paidCount = safeInvoices.filter(inv => inv?.status === 'Paid').length;
  const partialCount = safeInvoices.filter(inv => inv?.status === 'Partially Paid').length;
  const pendingCount = safeInvoices.filter(inv => inv?.status === 'Pending').length;
  const draftCount = safeInvoices.filter(inv => inv?.status === 'Draft').length;

  // Recent 5 Invoices
  const recentInvoices = [...safeInvoices].slice(0, 5);

  // Clients with top outstanding balances
  const topReceivables = safeCustomers
    .map(c => {
      const custName = (c && c.name) ? String(c.name).trim().toLowerCase() : '';
      if (!custName) return { ...c, totalOutstanding: 0 };

      const pastUnpaid = safeInvoices
        .filter(inv => {
          const invCustName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
          return invCustName === custName && inv.status !== 'Draft';
        })
        .reduce((sum, inv) => {
          const total = getInvoiceTotal(inv);
          const netBilled = Math.max(0, total - Number(inv.oldBalance || 0));
          const paid = inv.status === 'Paid' ? total : Number(inv.paidAmount || 0);
          return sum + (netBilled - paid);
        }, 0);

      // Customer oldBalance + un-paid invoices
      return {
        ...c,
        totalOutstanding: (Number(c?.oldBalance) || 0) + pastUnpaid
      };
    })
    .filter(c => c.totalOutstanding > 0)
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  const handleDownloadPDF = async (inv) => {
    if (!inv) return;
    setActivePreviewInvoice(inv);
    setDownloadingId(inv.id);

    setTimeout(async () => {
      await generateInvoicePDF('dash-hidden-preview-paper', `Invoice_${inv.invoiceNo || 'Draft'}.pdf`);
      setDownloadingId(null);
      setActivePreviewInvoice(null);
    }, 300);
  };

  return (
    <div className="page-wrapper">
      {/* Hidden container for PDF rendering */}
      {activePreviewInvoice && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <InvoicePaper invoice={activePreviewInvoice} company={safeCompany} id="dash-hidden-preview-paper" />
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="welcome-banner-card" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div className="welcome-title-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Sparkles className="text-indigo-400 welcome-icon" size={22} />
            <h2 className="welcome-heading" style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
              Welcome back,{" "}<span className="welcome-username">{safeCompany.contactPerson || 'Vijay Kumar'}</span>!
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Here is your live business overview for <strong>{safeCompany.name || 'Your Business'}</strong>
          </p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={() => {
            setExcelFile(null);
            setImportSummary(null);
            setIsImportModalOpen(true);
          }}>
            <Database size={16} /> Import Excel Data
          </button>
        </div>
      </div>

      {/* Key Metric Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <TrendingUp size={26} />
          </div>
          <div className="stat-info">
            <h3>₹{totalInvoiced.toLocaleString('en-IN')}</h3>
            <p>Total Revenue Invoiced</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: '#f59e0b' }}>₹{totalPending.toLocaleString('en-IN')}</h3>
            <p>Unpaid Receivables ({pendingCount} Pending)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle size={26} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: '#10b981' }}>₹{totalCollected.toLocaleString('en-IN')}</h3>
            <p>Collections Received ({paidCount} Paid)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Users size={26} />
          </div>
          <div className="stat-info">
            <h3>{safeCustomers.length}</h3>
            <p>Registered Clients</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Package size={26} />
          </div>
          <div className="stat-info">
            <h3>{safeProducts.length}</h3>
            <p>Garment Products</p>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="form-card">
        <div className="card-header">
          <div className="card-title">
            <Zap className="text-indigo-400" size={20} />
            Quick ERP Actions
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '1rem', justifyContent: 'flex-start', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
            onClick={() => { onNewInvoice(); setActiveTab('billing'); }}
          >
            <PlusCircle size={20} className="text-indigo-400" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700' }}>Create Invoice</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generate new bill & PDF</div>
            </div>
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '1rem', justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText size={20} className="text-indigo-400" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700' }}>Invoices History</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{safeInvoices.length} saved bills</div>
            </div>
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '1rem', justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={20} className="text-indigo-400" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700' }}>Manage Clients</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Directory & Balances</div>
            </div>
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ padding: '1rem', justifyContent: 'flex-start' }}
            onClick={() => setActiveTab('products')}
          >
            <Package size={20} className="text-indigo-400" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '700' }}>Garment Catalog</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Styles & HSN Rates</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Dashboard 2-Column Section */}
      <div className="dashboard-layout-grid">
        {/* Left: Recent Invoices Table */}
        <div className="form-card recent-invoices-card">
          <div className="card-header">
            <div className="card-title">
              <FileText className="text-indigo-400" size={20} />
              Recent Invoices
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={() => setActiveTab('invoices')}
            >
              View All ({safeInvoices.length}) <ArrowRight size={14} />
            </button>
          </div>

          <div className="items-table-wrapper">
            <table className="items-table list-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th data-mobile-hide="client">Client / Customer</th>
                  <th data-mobile-hide="date">Date</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv?.id || Math.random()}>
                    <td data-label="Invoice">
                      <strong style={{ color: 'var(--accent-primary)' }}>{inv?.invoiceNo || 'Draft'}</strong>
                    </td>
                    <td data-label="Client / Customer" data-mobile-hide="client">
                      <strong>{inv?.customer?.name || 'Customer'}</strong>
                    </td>
                    <td data-label="Date" data-mobile-hide="date" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv?.date || '-'}</td>
                    <td data-label="Total Amount" style={{ textAlign: 'right' }}>
                      <strong>₹{Number(inv?.totalAmount || 0).toLocaleString('en-IN')}</strong>
                    </td>
                    <td data-label="Status" style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.725rem',
                          borderRadius: '12px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          background: 
                            inv?.status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' :
                            inv?.status === 'Partially Paid' ? 'rgba(245, 158, 11, 0.15)' :
                            inv?.status === 'Draft' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: 
                            inv?.status === 'Paid' ? '#10b981' :
                            inv?.status === 'Partially Paid' ? '#f59e0b' :
                            inv?.status === 'Draft' ? '#94a3b8' : '#ef4444'
                        }}
                      >
                        {inv?.status || 'Pending'}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right', overflow: 'visible' }}>
                      {/* Desktop view actions (horizontal button row) */}
                      <div className="desktop-actions" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-primary btn-icon" 
                          onClick={() => handleDownloadPDF(inv)}
                          disabled={downloadingId === inv?.id}
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => onEditInvoice(inv)}
                          title="Edit Bill"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      {/* Mobile view actions (3-dots dropdown menu) */}
                      <div className="mobile-actions" style={{ position: 'relative' }}>
                        <button 
                          className={`btn btn-secondary btn-icon ${activeDropdownId === inv?.id ? 'active' : ''}`}
                          onClick={() => setActiveDropdownId(activeDropdownId === inv?.id ? null : inv?.id)}
                          title="Actions Menu"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeDropdownId === inv?.id && (
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
                                disabled={downloadingId === inv?.id}
                              >
                                <Download size={14} /> Download PDF
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Client Receivables Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-card">
            <div className="card-header">
              <div className="card-title">
                <AlertCircle className="text-amber-400" size={20} />
                Outstanding Receivables
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setActiveTab('customers')}
              >
                Clients <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topReceivables.length > 0 ? (
                topReceivables.map((c) => (
                  <div 
                    key={c?.id || Math.random()}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{c?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c?.city || 'Bengaluru'}, {c?.state || 'Karnataka'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#f59e0b', fontSize: '1rem' }}>
                        ₹{Number(c?.totalOutstanding || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due Balance</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                  No outstanding receivables!
                </div>
              )}
            </div>
          </div>

          {/* Shipment Dispatch Activity Feed */}
          <div className="form-card">
            <div className="card-header">
              <div className="card-title">
                <Truck className="text-indigo-400" size={20} />
                Recent Garment Shipments
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem' }}>
              {shipments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No shipments logged yet.
                </div>
              ) : (
                [...shipments]
                  .sort((a, b) => new Date(b.dispatchDate).getTime() - new Date(a.dispatchDate).getTime())
                  .slice(0, 4)
                  .map((ship, idx, arr) => {
                    const cust = safeCustomers.find(c => c.id === ship.customerId);
                    return (
                      <div key={ship.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: idx < arr.length - 1 ? '0.5rem' : '0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <span><strong>{cust?.name || 'Client'}: {ship.brand}</strong></span>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{ship.numberOfPieces.toLocaleString('en-IN')} Pcs</span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div className="card-title">
                <Upload className="text-indigo-400" size={22} />
                Import Excel Business Data
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsImportModalOpen(false)} disabled={importing}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!importSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem 1.5rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                  <Database size={40} color="#6366f1" style={{ marginBottom: '1rem' }} />
                  <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Upload "Business+Form.xlsx" sheet</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Maps all sub-brands/customers directly to parent customer "Afroasia Exports"</p>
                  <input 
                    type="file" 
                    id="excel-file-uploader" 
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setImporting(true);
                      try {
                        const parsed = await parseIVKExcel(file, safeCustomers);
                        setExcelFile(file);
                        setImportSummary(parsed);
                      } catch (err) {
                        alert("Error parsing Excel: " + err.message);
                      } finally {
                        setImporting(false);
                      }
                    }}
                  />
                  <label htmlFor="excel-file-uploader" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    Select Excel File
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <strong>Selected File:</strong> {excelFile?.name}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Customer mapping:</span>
                      <strong>{importSummary.afroasiaCustomer ? 'New "Afroasia Exports" + Existing Clients' : 'Map to existing Clients'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Invoices found:</span>
                      <strong>{importSummary.invoices.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Payments found:</span>
                      <strong>{importSummary.payments.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Shipments found:</span>
                      <strong>{importSummary.shipments.length}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => setImportSummary(null)} disabled={importing}>
                      Back
                    </button>
                    <button className="btn btn-primary" disabled={importing} onClick={async () => {
                      setImporting(true);
                      try {
                        await onImportExcelData(importSummary);
                        setIsImportModalOpen(false);
                      } catch (err) {
                        alert("Import failed: " + err.message);
                      } finally {
                        setImporting(false);
                      }
                    }}>
                      {importing ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
