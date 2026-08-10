import React, { useState } from 'react';
import { 
  LayoutDashboard,
  FileText, 
  Users, 
  Package, 
  Building2, 
  PlusCircle, 
  Sun, 
  Moon, 
  Layers,
  Lock,
  CheckCircle2,
  Settings,
  Database,
  Menu,
  X,
  Truck
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  company = {}, 
  onNewInvoice,
  onLock
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);

  return (
    <header className="header no-print">
      <div className="brand-section">
        {/* Mobile Hamburger toggle button */}
        <button 
          className={`btn btn-secondary btn-icon mobile-nav-toggle`}
          onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
          title="Toggle Navigation Menu"
        >
          {isNavMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('dashboard'); setIsNavMenuOpen(false); }}>
          IVK
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 className="brand-title" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('dashboard'); setIsNavMenuOpen(false); }}>
              {company.name || 'Your Business'}
            </h1>
            <span className="brand-badge">Business OS</span>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              <CheckCircle2 size={12} /> Online
            </span>
          </div>
          <p className="brand-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            GSTIN: {company.gstin || '29DPSPK8374F1Z2'} | Singasandra, Bengaluru
          </p>
        </div>
      </div>

      <nav className={`nav-actions ${isNavMenuOpen ? 'mobile-open' : ''}`}>
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsNavMenuOpen(false); }}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => { setActiveTab('billing'); setIsNavMenuOpen(false); }}
          >
            <FileText size={15} />
            <span>Invoice Form</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => { setActiveTab('invoices'); setIsNavMenuOpen(false); }}
          >
            <Layers size={15} />
            <span>Invoices</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => { setActiveTab('customers'); setIsNavMenuOpen(false); }}
          >
            <Users size={15} />
            <span>Clients</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payments'); setIsNavMenuOpen(false); }}
          >
            <Database size={15} />
            <span>Payment Logs</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'shipments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shipments'); setIsNavMenuOpen(false); }}
          >
            <Truck size={15} />
            <span>Shipments</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => { setActiveTab('products'); setIsNavMenuOpen(false); }}
          >
            <Package size={15} />
            <span>Products</span>
          </button>

        </div>

        <div className="nav-extra-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <button 
            className="btn btn-primary btn-new-invoice"
            onClick={() => { onNewInvoice(); setActiveTab('billing'); setIsNavMenuOpen(false); }}
            title="Start New Invoice"
          >
            <PlusCircle size={16} />
            <span>New Invoice</span>
          </button>

          <div className="settings-dropdown-container">
            <button 
              className={`btn btn-secondary btn-icon settings-trigger-btn ${isSettingsOpen ? 'active' : ''}`}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Open Settings Menu"
            >
              <Settings size={18} />
            </button>

            {isSettingsOpen && (
              <>
                <div 
                  className="settings-dropdown-backdrop" 
                  onClick={() => setIsSettingsOpen(false)}
                />
                <div className="settings-dropdown-menu">
                  <div className="settings-dropdown-header">App Settings</div>

                  <button 
                    type="button"
                    className="settings-dropdown-item"
                    onClick={() => {
                      setActiveTab('company');
                      setIsSettingsOpen(false);
                    }}
                  >
                    <Building2 size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span>Company Profile</span>
                  </button>

                  <button 
                    type="button"
                    className="settings-dropdown-item"
                    onClick={() => {
                      setActiveTab('company');
                      setIsSettingsOpen(false);
                    }}
                  >
                    <Database size={16} style={{ color: '#10b981' }} />
                    <span>Database Settings</span>
                  </button>

                  <div className="settings-dropdown-divider" />
                  <div className="settings-dropdown-header" style={{ marginTop: '0.25rem' }}>Preferences</div>
                  
                  <button 
                    type="button"
                    className="settings-dropdown-item" 
                    onClick={() => {
                      toggleTheme();
                      setIsSettingsOpen(false);
                    }}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun size={16} style={{ color: 'var(--accent-warning)' }} />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>

                  {onLock && (
                    <button 
                      type="button"
                      className="settings-dropdown-item text-red-500" 
                      onClick={() => {
                        onLock();
                        setIsSettingsOpen(false);
                      }}
                    >
                      <Lock size={16} />
                      <span>Lock System</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
