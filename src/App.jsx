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
import ShipmentLogs from './components/ShipmentLogs';
import { api } from './utils/api';
import { parseIVKExcel } from './utils/excelImporter';

import { 
  defaultCompany, 
  defaultCustomers, 
  defaultProducts, 
  initialInvoices 
} from './data/initialData';

export default function App() {
  // Authentication Lock state (backed by session token)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
  const [shipments, setShipments] = useState([]);
  
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

  // Check for existing JWT session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await api.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsUnlocked(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkSession();
  }, []);

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

  useEffect(() => {
    const ledger = invoices.find(inv => inv.invoiceNo === 'SHIPMENTS_LEDGER');
    if (ledger && Array.isArray(ledger.items)) {
      setShipments(ledger.items);
    } else {
      setShipments([]);
    }
  }, [invoices]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleUnlock = (user) => {
    setCurrentUser(user);
    setIsUnlocked(true);
  };

  const handleLock = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
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
      
      const total = inv.useCustomTotalAmount && Number(inv.customTotalAmount) >= 0 
        ? Number(inv.customTotalAmount) 
        : (Number(inv.totalAmount) || 0);

      const netInvoiceAmount = Math.max(0, total - Number(inv.oldBalance || 0));
      const currentPaid = inv.status === 'Paid' ? total : Number(inv.paidAmount || 0);
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

    const targetCustomer = customers.find(c => String(c.name).trim().toLowerCase() === norm);

    try {
      if (updatedInvoices.length > 0) {
        await Promise.all(updatedInvoices.map(inv => api.saveInvoice(inv)));
        setInvoices(prev => prev.map(inv => {
          const updated = updatedInvoices.find(u => u.id === inv.id);
          return updated ? updated : inv;
        }));
      }

      if (remainingPayment > 0 && targetCustomer) {
        const updatedCust = {
          ...targetCustomer,
          oldBalance: Number(targetCustomer.oldBalance || 0) - remainingPayment
        };
        await api.updateCustomer(updatedCust.id, updatedCust);
        setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));
        
        alert(`Successfully recorded payment! ₹${(amount - remainingPayment).toLocaleString('en-IN')} applied to invoices, and ₹${remainingPayment.toLocaleString('en-IN')} added as client advance credit balance.`);
      } else if (updatedInvoices.length > 0) {
        alert(`Successfully applied ₹${amount.toLocaleString('en-IN')} across ${updatedInvoices.length} invoices!`);
      } else {
        alert("No pending invoices found for this customer to allocate the payment to.");
      }
    } catch (err) {
      alert("Error recording payment: " + err.message);
    }
  };

  const handleImportExcelData = async (excelData) => {
    try {
      // 1. If Afroasia Exports customer needs to be created, create it
      let targetCust = customers.find(c => c.name.trim().toLowerCase() === 'afroasia exports');
      if (!targetCust && excelData.afroasiaCustomer) {
        targetCust = {
          ...excelData.afroasiaCustomer,
          id: `cust-afroasia-${Date.now()}`
        };
        await api.addCustomer(targetCust);
        setCustomers(prev => [...prev, targetCust]);
      }
      
      // Update client reference to correct database resolved objects in invoices
      const mappedInvoices = excelData.invoices.map(inv => {
        let resolvedCust = customers.find(c => c.name.trim().toLowerCase() === inv.customer.name.trim().toLowerCase());
        if (!resolvedCust && inv.customer.id === 'cust-afroasia') {
          resolvedCust = targetCust;
        }
        return {
          ...inv,
          customer: resolvedCust || targetCust
        };
      });

      // 2. Map shipments & update company profile
      const updatedShipments = excelData.shipments.map(s => {
        let resolvedCust = customers.find(c => c.id === s.customerId);
        if (!resolvedCust && s.customerId === 'cust-afroasia') {
          resolvedCust = targetCust;
        }
        return {
          ...s,
          customerId: resolvedCust?.id || targetCust?.id
        };
      });

      const updatedCompany = {
        ...company,
        extendedData: {
          ...(company.extendedData || {}),
          shipments: [...updatedShipments, ...(company.extendedData?.shipments || [])]
        }
      };
      await api.updateCompany(updatedCompany);
      setCompany(updatedCompany);

      // 3. Process Invoices and Payments in-memory grouped by customer
      let pendingInvoicesList = [...mappedInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process payments in-memory
      for (const pay of excelData.payments) {
        let remaining = pay.amount;
        
        const customerInvoices = pendingInvoicesList.filter(inv => 
          inv.customer.name.trim().toLowerCase() === pay.customerName.trim().toLowerCase()
        );

        for (const inv of customerInvoices) {
          if (remaining <= 0) break;
          
          const total = inv.useCustomTotalAmount && Number(inv.customTotalAmount) >= 0 
            ? Number(inv.customTotalAmount) 
            : (Number(inv.totalAmount) || 0);

          const netInvoiceAmount = Math.max(0, total - Number(inv.oldBalance || 0));
          const currentPaid = Number(inv.paidAmount || 0);
          const remainingDebt = Math.max(0, netInvoiceAmount - currentPaid);
          
          if (remainingDebt <= 0) continue;

          if (remaining >= remainingDebt) {
            inv.paidAmount = currentPaid + remainingDebt;
            inv.status = 'Paid';
            inv.notes = `Auto-allocated ₹${remainingDebt.toLocaleString('en-IN')} from bulk payment on ${pay.dateStr}. ` + (inv.notes || '');
            remaining -= remainingDebt;
          } else {
            inv.paidAmount = currentPaid + remaining;
            inv.status = 'Partially Paid';
            inv.notes = `Auto-allocated partial ₹${remaining.toLocaleString('en-IN')} from bulk payment on ${pay.dateStr}. ` + (inv.notes || '');
            remaining = 0;
          }
        }
      }

      // Bulk write all invoices
      for (const inv of pendingInvoicesList) {
        await api.saveInvoice(inv);
      }

      // Add to state
      setInvoices(prev => [...pendingInvoicesList, ...prev]);

      alert(`Successfully imported:
- ${updatedShipments.length} Shipment logs
- ${pendingInvoicesList.length} Invoices
- ${excelData.payments.length} Payments allocated!`);
      
    } catch (err) {
      alert("Failed to import Excel data: " + err.message);
    }
  };

  const handleUpdateShipments = async (newShipments) => {
    let ledger = invoices.find(inv => inv.invoiceNo === 'SHIPMENTS_LEDGER');
    if (!ledger) {
      ledger = {
        id: 'inv-shipments-ledger',
        invoiceNo: 'SHIPMENTS_LEDGER',
        status: 'Draft',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        customer: { name: 'System Ledger' },
        items: []
      };
    }
    const updatedLedger = {
      ...ledger,
      items: newShipments
    };
    try {
      await api.saveInvoice(updatedLedger);
      setInvoices(prev => {
        const exists = prev.some(inv => inv.invoiceNo === 'SHIPMENTS_LEDGER');
        if (exists) {
          return prev.map(inv => inv.invoiceNo === 'SHIPMENTS_LEDGER' ? updatedLedger : inv);
        }
        return [updatedLedger, ...prev];
      });
      setShipments(newShipments);
    } catch (err) {
      alert("Failed to save shipments: " + err.message);
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
    return <AuthLockScreen onUnlock={handleUnlock} companyName={company?.name || 'Your Business'} />;
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
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Loading Business OS Database...</span>
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
        currentUser={currentUser}
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
            shipments={shipments}
            setActiveTab={setActiveTab}
            onNewInvoice={handleNewInvoice}
            onEditInvoice={handleEditInvoice}
            onImportExcelData={handleImportExcelData}
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
            shipments={shipments}
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
            onRecordPayment={handleRecordPayment}
          />
        )}
        
        {activeTab === 'shipments' && (
          <ShipmentLogs 
            shipments={shipments}
            customers={customers}
            onUpdateShipments={handleUpdateShipments}
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
