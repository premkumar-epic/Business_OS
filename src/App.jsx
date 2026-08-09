import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import CustomerManager from './components/CustomerManager';
import ProductCatalog from './components/ProductCatalog';
import CompanyProfileModal from './components/CompanyProfileModal';
import AuthLockScreen from './components/AuthLockScreen';
import PaymentLogs from './components/PaymentLogs';
import { api } from './utils/api';

import { 
  defaultCompany, 
  defaultCustomers, 
  defaultProducts, 
  initialInvoices 
} from './data/initialData';

export default function App() {
  // Authentication Lock state (backed by session token)
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('ivk_session_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  // Theme state
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ivk_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Main ERP Data states
  const [company, setCompany] = useState(defaultCompany);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Currently editing invoice for form
  const [editingInvoice, setEditingInvoice] = useState(null);

  // Sync theme attribute to <html> tag
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ivk_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Load all data from SQLite database on unlock
  useEffect(() => {
    if (!isUnlocked) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [comp, custs, prods, invs] = await Promise.all([
          api.getCompany(),
          api.getCustomers(),
          api.getProducts(),
          api.getInvoices()
        ]);
        
        // If company is empty, set defaultCompany
        setCompany(comp && comp.name ? comp : defaultCompany);
        setCustomers(custs || []);
        setProducts(prods || []);
        setInvoices(invs || []);
      } catch (err) {
        console.error("Failed to load DB data:", err);
        setError("Could not establish connection to the centralized database. Running in offline/readonly fallback.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isUnlocked]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem('ivk_session_unlocked');
    } catch (e) {
      console.error(e);
    }
    setIsUnlocked(false);
  };

  // Invoice Actions
  const handleSaveInvoice = async (newInvoice) => {
    try {
      await api.saveInvoice(newInvoice);
      setInvoices(prev => {
        const prevList = Array.isArray(prev) ? prev : [];
        const existsIndex = prevList.findIndex(inv => inv?.id === newInvoice.id);
        if (existsIndex >= 0) {
          const updated = [...prevList];
          updated[existsIndex] = newInvoice;
          return updated;
        }
        return [newInvoice, ...prevList];
      });
    } catch (err) {
      alert("Failed to save invoice to the database. " + err.message);
    }
  };

  const handleEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setActiveTab('billing');
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice from the database?')) {
      try {
        await api.deleteInvoice(id);
        setInvoices(prev => (Array.isArray(prev) ? prev : []).filter(inv => inv?.id !== id));
      } catch (err) {
        alert("Failed to delete invoice. " + err.message);
      }
    }
  };

  const handleToggleInvoiceStatus = async (id) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    const updatedInvoice = {
      ...inv,
      status: inv.status === 'Paid' ? 'Pending' : 'Paid'
    };

    try {
      await api.saveInvoice(updatedInvoice);
      setInvoices(prev => prev.map(i => i.id === id ? updatedInvoice : i));
    } catch (err) {
      alert("Failed to update invoice status. " + err.message);
    }
  };

  const handleDuplicateInvoice = async (inv) => {
    if (!inv) return;
    const duplicated = {
      ...inv,
      id: `inv-${Date.now()}`,
      invoiceNo: `${inv.invoiceNo || 'IVK'}-COPY`,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    try {
      await api.saveInvoice(duplicated);
      setInvoices(prev => [duplicated, ...prev]);
    } catch (err) {
      alert("Failed to duplicate invoice: " + err.message);
    }
  };

  const handleNewInvoice = () => {
    const custs = Array.isArray(customers) ? customers : defaultCustomers;
    const prods = Array.isArray(products) ? products : defaultProducts;
    const invs = Array.isArray(invoices) ? invoices : initialInvoices;

    setEditingInvoice({
      id: `inv-${Date.now()}`,
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
      referenceDC: '',
      customer: { name: '', address: '', gstin: '', phone: '' },
      items: [
        { id: 1, description: '', quantity: '', rate: '', amount: 0 }
      ],
      subtotal: 0,
      gstRate: 0,
      gstAmount: 0,
      oldBalance: 0,
      totalAmount: 0,
      status: 'Pending',
      notes: 'Thank you for your business!'
    });
    setActiveTab('billing');
  };

  // Customer CRM Actions
  const handleRecordPayment = async (customerName, amount) => {
    if (!customerName || amount <= 0) return;
    
    // Find all invoices for this customer, sort by date (oldest first)
    const norm = String(customerName).trim().toLowerCase();
    const custInvoices = invoices
      .filter(inv => {
        const invName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
        return invName === norm && inv.status !== 'Draft' && inv.status !== 'Paid';
      })
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    let remainingPayment = amount;
    const updatedInvoices = [];

    for (const inv of custInvoices) {
      if (remainingPayment <= 0) break;
      
      const netInvoiceAmount = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.oldBalance || 0));
      const currentPaid = Number(inv.paidAmount || 0);
      const invoiceRemainingDebt = Math.max(0, netInvoiceAmount - currentPaid);
      
      if (invoiceRemainingDebt <= 0) continue;

      const updatedInv = { ...inv };
      
      if (remainingPayment >= invoiceRemainingDebt) {
        // Full payoff for this invoice
        updatedInv.paidAmount = currentPaid + invoiceRemainingDebt;
        updatedInv.status = 'Paid';
        updatedInv.notes = `Auto-allocated ₹${invoiceRemainingDebt.toLocaleString('en-IN')} from bulk payment on ${new Date().toLocaleDateString('en-GB')}. ` + (updatedInv.notes || '');
        remainingPayment -= invoiceRemainingDebt;
      } else {
        // Partial payoff
        updatedInv.paidAmount = currentPaid + remainingPayment;
        updatedInv.status = 'Partially Paid';
        updatedInv.notes = `Auto-allocated partial ₹${remainingPayment.toLocaleString('en-IN')} from bulk payment on ${new Date().toLocaleDateString('en-GB')}. ` + (updatedInv.notes || '');
        remainingPayment = 0;
      }
      
      updatedInvoices.push(updatedInv);
    }

    if (updatedInvoices.length > 0) {
      try {
        await Promise.all(updatedInvoices.map(inv => api.saveInvoice(inv)));
        
        // Update local state for all modified invoices
        setInvoices(prev => prev.map(inv => {
          const updated = updatedInvoices.find(u => u.id === inv.id);
          return updated ? updated : inv;
        }));
        
        alert(`Successfully applied ₹${amount.toLocaleString('en-IN')} across ${updatedInvoices.length} invoices!`);
      } catch (err) {
        alert("Failed to save auto-allocated payments: " + err.message);
      }
    } else {
      alert("No pending invoices found for this customer to allocate the payment to.");
    }
  };

  const handleAddCustomer = async (cust) => {
    try {
      await api.addCustomer(cust);
      setCustomers(prev => [...prev, cust]);
    } catch (err) {
      alert("Failed to add customer: " + err.message);
    }
  };

  const handleUpdateCustomer = async (updatedCust) => {
    try {
      const oldCust = customers.find(c => c.id === updatedCust.id);
      const oldName = oldCust ? oldCust.name : '';

      await api.updateCustomer(updatedCust.id, updatedCust);
      setCustomers(prev => prev.map(c => c?.id === updatedCust.id ? updatedCust : c));

      // Cascade name update to invoices if the name changed
      if (oldName && oldName !== updatedCust.name) {
        const normOld = String(oldName).trim().toLowerCase();
        const updatedInvoices = invoices.filter(inv => {
          const invName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
          return invName === normOld;
        }).map(inv => ({
          ...inv,
          customer: {
            ...inv.customer,
            name: updatedCust.name
          }
        }));

        if (updatedInvoices.length > 0) {
          await Promise.all(updatedInvoices.map(inv => api.saveInvoice(inv)));
          setInvoices(prev => prev.map(inv => {
            const updated = updatedInvoices.find(u => u.id === inv.id);
            return updated ? updated : inv;
          }));
        }
      }
    } catch (err) {
      alert("Failed to update customer: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Delete this client from database?')) {
      try {
        await api.deleteCustomer(id);
        setCustomers(prev => prev.filter(c => c?.id !== id));
      } catch (err) {
        alert("Failed to delete customer: " + err.message);
      }
    }
  };

  // Product Catalog Actions
  const handleAddProduct = async (prod) => {
    try {
      await api.addProduct(prod);
      setProducts(prev => [...prev, prod]);
    } catch (err) {
      alert("Failed to add product: " + err.message);
    }
  };

  const handleUpdateProduct = async (updatedProd) => {
    try {
      await api.updateProduct(updatedProd.id, updatedProd);
      setProducts(prev => prev.map(p => p?.id === updatedProd.id ? updatedProd : p));
    } catch (err) {
      alert("Failed to update product: " + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Delete this garment product from database?')) {
      try {
        await api.deleteProduct(id);
        setProducts(prev => prev.filter(p => p?.id !== id));
      } catch (err) {
        alert("Failed to delete product: " + err.message);
      }
    }
  };

  const handleUpdateCompany = async (newCompany) => {
    try {
      await api.updateCompany(newCompany);
      setCompany(newCompany);
    } catch (err) {
      alert("Failed to save company profile: " + err.message);
    }
  };

  if (!isUnlocked) {
    return <AuthLockScreen onUnlock={handleUnlock} companyName={company?.name || 'IVK Garments'} />;
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid rgba(99, 102, 241, 0.15)',
          borderTop: '5px solid var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Loading IVK Garments Database...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        company={company}
        onNewInvoice={handleNewInvoice}
        onLock={handleLock}
      />

      {error && (
        <div style={{
          margin: '1.5rem',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            invoices={invoices}
            customers={customers}
            products={products}
            company={company}
            setActiveTab={setActiveTab}
            onNewInvoice={handleNewInvoice}
            onEditInvoice={handleEditInvoice}
          />
        )}

        {activeTab === 'billing' && (
          <InvoiceForm 
            customers={customers}
            products={products}
            company={company}
            invoices={invoices}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            initialInvoice={editingInvoice}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceList 
            invoices={invoices}
            company={company}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onToggleStatus={handleToggleInvoiceStatus}
            onDuplicateInvoice={handleDuplicateInvoice}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManager 
            customers={customers}
            invoices={invoices}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRecordPayment={handleRecordPayment}
          />
        )}

        {activeTab === 'products' && (
          <ProductCatalog 
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
        
        {activeTab === 'payments' && (
          <PaymentLogs 
            invoices={invoices}
            customers={customers}
          />
        )}

        {activeTab === 'company' && (
          <CompanyProfileModal 
            company={company}
            onUpdateCompany={handleUpdateCompany}
          />
        )}
      </main>
    </div>
  );
}
