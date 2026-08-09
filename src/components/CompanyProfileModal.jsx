import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, Database, ShieldCheck, Copy, Code } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../utils/supabaseClient';

export default function CompanyProfileModal({ company, onUpdateCompany }) {
  const [formData, setFormData] = useState(() => {
    return {
      ...company,
      address: company.address || [company.addressLine1, company.addressLine2].filter(Boolean).join('\n')
    };
  });
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  useEffect(() => {
    setFormData({
      ...company,
      address: company.address || [company.addressLine1, company.addressLine2].filter(Boolean).join('\n')
    });
  }, [company]);

  // Supabase Credentials State
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('ivk_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('ivk_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Split the temporary address field into addressLine1 and addressLine2
    const addressLines = (formData.address || '').split('\n');
    const updatedCompany = {
      ...formData,
      addressLine1: addressLines[0] || '',
      addressLine2: addressLines.slice(1).join(', ') || ''
    };
    // Delete temporary key so database queries don't fail
    delete updatedCompany.address;

    onUpdateCompany(updatedCompany);

    // Save Supabase credentials to localStorage
    localStorage.setItem('ivk_supabase_url', supabaseUrl.trim());
    localStorage.setItem('ivk_supabase_key', supabaseKey.trim());

    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleBidirectionalSync = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert("Please enter Supabase Project URL and Anon Key first!");
      return;
    }
    
    if (!window.confirm("This will perform a bidirectional merge. It will upload any local-only records to Supabase and download any cloud-only records to your local SQLite database. Do you want to proceed?")) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Starting bidirectional sync...');

    try {
      // 1. Fetch Local Data
      setSyncStatus('Fetching local SQLite data...');
      const fetchLocal = async (path) => {
        const res = await fetch(`/api/${path}`);
        if (!res.ok) throw new Error(`Failed to fetch ${path} from local SQLite server`);
        return res.json();
      };
      
      const localCompany = await fetchLocal('company');
      const localCustomers = await fetchLocal('customers');
      const localProducts = await fetchLocal('products');
      const localInvoices = await fetchLocal('invoices');

      // 2. Fetch Cloud Data
      setSyncStatus('Connecting to Supabase...');
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

      setSyncStatus('Fetching Supabase cloud data...');
      
      const fetchCloud = async (table) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return data || [];
      };

      const cloudCompany = await fetchCloud('company');
      const cloudCustomers = await fetchCloud('customers');
      const cloudProducts = await fetchCloud('products');
      const cloudInvoices = await fetchCloud('invoices');

      // Helper to post to local API
      const postLocal = async (path, body) => {
        const res = await fetch(`/api/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Failed to save ${path} to local SQLite`);
        return res.json();
      };

      // 3. Sync Company Profile
      setSyncStatus('Merging company settings...');
      if (cloudCompany.length > 0) {
        const cloudComp = cloudCompany[0];
        if (!localCompany.name || localCompany.name === 'IVK Garments') {
          await postLocal('company', cloudComp);
        }
      }
      const finalComp = { ...(localCompany.id ? localCompany : cloudCompany[0] || {}), id: 'default' };
      if (finalComp.name) {
        const { error } = await supabase.from('company').upsert(finalComp);
        if (error) throw error;
      }

      // 4. Sync Customers
      setSyncStatus('Merging customers list...');
      for (const cust of localCustomers) {
        const { error } = await supabase.from('customers').upsert({
          id: cust.id,
          name: cust.name,
          phone: cust.phone || '',
          email: cust.email || '',
          gstin: cust.gstin || '',
          address: cust.address || '',
          contactPerson: cust.contactPerson || '',
          city: cust.city || '',
          state: cust.state || '',
          pincode: cust.pincode || '',
          oldBalance: cust.oldBalance || 0
        });
        if (error) throw error;
      }
      for (const cust of cloudCustomers) {
        await postLocal('customers', cust);
      }

      // 5. Sync Products
      setSyncStatus('Merging products catalog...');
      for (const prod of localProducts) {
        const { error } = await supabase.from('products').upsert({
          id: prod.id,
          name: prod.name,
          hsn: prod.hsn || '',
          rate: prod.rate || 0,
          unit: prod.unit || 'Pcs',
          category: prod.category || ''
        });
        if (error) throw error;
      }
      for (const prod of cloudProducts) {
        await postLocal('products', prod);
      }

      // 6. Sync Invoices
      setSyncStatus('Merging invoices...');
      for (const inv of localInvoices) {
        const { error } = await supabase.from('invoices').upsert({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          date: inv.date,
          dueDate: inv.dueDate,
          referenceDC: inv.referenceDC || '',
          ewayBillNo: inv.ewayBillNo || '',
          vehicleNo: inv.vehicleNo || '',
          lrNo: inv.lrNo || '',
          poNo: inv.poNo || '',
          agentName: inv.agentName || '',
          showBankDetails: inv.showBankDetails !== false,
          showSignature: inv.showSignature !== false,
          notes: inv.notes || '',
          gstNote: inv.gstNote || '',
          customer: inv.customer || {},
          items: inv.items || [],
          customFields: inv.customFields || [],
          subtotal: inv.subtotal || 0,
          gstRate: inv.gstRate || 0,
          gstAmount: inv.gstAmount || 0,
          useCustomGstAmount: inv.useCustomGstAmount === 1 || inv.useCustomGstAmount === true,
          customGstAmount: inv.customGstAmount || 0,
          oldBalance: inv.oldBalance || 0,
          useCustomTotalAmount: inv.useCustomTotalAmount === 1 || inv.useCustomTotalAmount === true,
          customTotalAmount: inv.customTotalAmount || 0,
          totalAmount: inv.totalAmount || 0,
          status: inv.status || 'Pending',
          paidAmount: inv.paidAmount || 0
        });
        if (error) throw error;
      }
      for (const inv of cloudInvoices) {
        await postLocal('invoices', inv);
      }

      setSyncStatus('✓ Bidirectional sync completed successfully!');
      setTimeout(() => {
        setSyncStatus('');
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      setSyncStatus(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleMigrateBrowserStorageToSupabase = async () => {
    const localInvoices = localStorage.getItem('ivk_invoices');
    const localCustomers = localStorage.getItem('ivk_customers');
    const localProducts = localStorage.getItem('ivk_products');
    const localCompany = localStorage.getItem('ivk_company');

    if (!localInvoices && !localCustomers && !localProducts && !localCompany) {
      alert("No historical data found in your browser's local storage to migrate!");
      return;
    }

    if (!window.confirm("We found saved invoices/settings in your browser's offline storage. Would you like to upload them and merge them into your Supabase cloud database?")) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Migrating browser data to Supabase...');

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

      // 1. Company
      if (localCompany) {
        const comp = JSON.parse(localCompany);
        const { error } = await supabase.from('company').upsert({ ...comp, id: 'default' });
        if (error) throw error;
      }

      // 2. Customers
      if (localCustomers) {
        const customers = JSON.parse(localCustomers);
        for (const cust of customers) {
          const { error } = await supabase.from('customers').upsert({
            id: cust.id,
            name: cust.name,
            phone: cust.phone || '',
            email: cust.email || '',
            gstin: cust.gstin || '',
            address: cust.address || '',
            contactPerson: cust.contactPerson || '',
            city: cust.city || '',
            state: cust.state || '',
            pincode: cust.pincode || '',
            oldBalance: cust.oldBalance || 0
          });
          if (error) throw error;
        }
      }

      // 3. Products
      if (localProducts) {
        const products = JSON.parse(localProducts);
        for (const prod of products) {
          const { error } = await supabase.from('products').upsert({
            id: prod.id,
            name: prod.name,
            hsn: prod.hsn || '',
            rate: prod.rate || 0,
            unit: prod.unit || 'Pcs',
            category: prod.category || ''
          });
          if (error) throw error;
        }
      }

      // 4. Invoices
      if (localInvoices) {
        const invoices = JSON.parse(localInvoices);
        for (const inv of invoices) {
          const { error } = await supabase.from('invoices').upsert({
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            date: inv.date,
            dueDate: inv.dueDate,
            referenceDC: inv.referenceDC || '',
            ewayBillNo: inv.ewayBillNo || '',
            vehicleNo: inv.vehicleNo || '',
            lrNo: inv.lrNo || '',
            poNo: inv.poNo || '',
            agentName: inv.agentName || '',
            showBankDetails: inv.showBankDetails !== false,
            showSignature: inv.showSignature !== false,
            notes: inv.notes || '',
            gstNote: inv.gstNote || '',
            customer: inv.customer || {},
            items: inv.items || [],
            customFields: inv.customFields || [],
            subtotal: inv.subtotal || 0,
            gstRate: inv.gstRate || 0,
            gstAmount: inv.gstAmount || 0,
            useCustomGstAmount: inv.useCustomGstAmount === 1 || inv.useCustomGstAmount === true,
            customGstAmount: inv.customGstAmount || 0,
            oldBalance: inv.oldBalance || 0,
            useCustomTotalAmount: inv.useCustomTotalAmount === 1 || inv.useCustomTotalAmount === true,
            customTotalAmount: inv.customTotalAmount || 0,
            totalAmount: inv.totalAmount || 0,
            status: inv.status || 'Pending',
            paidAmount: inv.paidAmount || 0
          });
          if (error) throw error;
        }
      }

      setSyncStatus('✓ Browser storage migrated successfully!');
      setTimeout(() => {
        setSyncStatus('');
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      setSyncStatus(`❌ Migration failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncLocalToCloud = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert("Please enter Supabase Project URL and Anon Key first!");
      return;
    }
    
    if (!window.confirm("This will upload all local SQLite data (Company, Customers, Products, Invoices) and merge/overwrite it into your Supabase database. Do you want to proceed?")) {
      return;
    }

    setSyncing(true);
    setSyncStatus('Starting database sync...');

    try {
      setSyncStatus('Fetching local SQLite data...');
      
      const fetchLocal = async (path) => {
        const res = await fetch(`/api/${path}`);
        if (!res.ok) throw new Error(`Failed to fetch ${path} from local SQLite server`);
        return res.json();
      };

      const companyData = await fetchLocal('company');
      const customersList = await fetchLocal('customers');
      const productsList = await fetchLocal('products');
      const invoicesList = await fetchLocal('invoices');

      setSyncStatus('Connecting to Supabase...');
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

      setSyncStatus('Syncing company profile...');
      const companyId = companyData.id || 'default';
      const { error: companyError } = await supabase
        .from('company')
        .upsert({ ...companyData, id: companyId });
      if (companyError) throw companyError;

      setSyncStatus(`Syncing ${customersList.length} customers...`);
      for (const cust of customersList) {
        const { error } = await supabase
          .from('customers')
          .upsert({
            id: cust.id,
            name: cust.name,
            phone: cust.phone || '',
            email: cust.email || '',
            gstin: cust.gstin || '',
            address: cust.address || '',
            contactPerson: cust.contactPerson || '',
            city: cust.city || '',
            state: cust.state || '',
            pincode: cust.pincode || '',
            oldBalance: cust.oldBalance || 0
          });
        if (error) throw error;
      }

      setSyncStatus(`Syncing ${productsList.length} products...`);
      for (const prod of productsList) {
        const { error } = await supabase
          .from('products')
          .upsert({
            id: prod.id,
            name: prod.name,
            hsn: prod.hsn,
            rate: prod.rate || 0,
            unit: prod.unit || 'Pcs',
            category: prod.category || ''
          });
        if (error) throw error;
      }

      setSyncStatus(`Syncing ${invoicesList.length} invoices...`);
      for (const inv of invoicesList) {
        const { error } = await supabase
          .from('invoices')
          .upsert({
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            date: inv.date,
            dueDate: inv.dueDate,
            referenceDC: inv.referenceDC || '',
            ewayBillNo: inv.ewayBillNo || '',
            vehicleNo: inv.vehicleNo || '',
            lrNo: inv.lrNo || '',
            poNo: inv.poNo || '',
            agentName: inv.agentName || '',
            showBankDetails: inv.showBankDetails !== false,
            showSignature: inv.showSignature !== false,
            notes: inv.notes || '',
            gstNote: inv.gstNote || '',
            customer: inv.customer || {},
            items: inv.items || [],
            customFields: inv.customFields || [],
            subtotal: inv.subtotal || 0,
            gstRate: inv.gstRate || 0,
            gstAmount: inv.gstAmount || 0,
            useCustomGstAmount: inv.useCustomGstAmount === 1 || inv.useCustomGstAmount === true,
            customGstAmount: inv.customGstAmount || 0,
            oldBalance: inv.oldBalance || 0,
            useCustomTotalAmount: inv.useCustomTotalAmount === 1 || inv.useCustomTotalAmount === true,
            customTotalAmount: inv.customTotalAmount || 0,
            totalAmount: inv.totalAmount || 0,
            status: inv.status || 'Pending',
            paidAmount: inv.paidAmount || 0
          });
        if (error) throw error;
      }

      setSyncStatus('✓ Data sync completed successfully!');
      setTimeout(() => setSyncStatus(''), 5000);
    } catch (err) {
      console.error(err);
      setSyncStatus(`❌ Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="card-header">
          <div className="card-title">
            <Building2 className="text-indigo-400" size={22} />
            IVK Garments Business & Bank Profile
          </div>
        </div>

        {showSavedMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={16} /> Business Profile & Database Settings Saved!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.name || ''} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.gstin || ''} 
                onChange={e => setFormData({ ...formData, gstin: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.phone || ''} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.email || ''} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Business Address</label>
            <textarea 
              rows={2} 
              className="form-textarea" 
              value={formData.address || ''} 
              onChange={e => setFormData({ ...formData, address: e.target.value })} 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.city || ''} 
                onChange={e => setFormData({ ...formData, city: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.state || ''} 
                onChange={e => setFormData({ ...formData, state: e.target.value })} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.pincode || ''} 
                onChange={e => setFormData({ ...formData, pincode: e.target.value })} 
              />
            </div>
          </div>

          {/* Bank Details Section */}
          <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: '700' }}>
              🏦 Banking Details for Invoice Footers
            </h4>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Account Holder Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. IVK Garments / Vijay Kumar"
                value={formData.accountHolder || ''} 
                onChange={e => setFormData({ ...formData, accountHolder: e.target.value })} 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.bankName || ''} 
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.accountNo || ''} 
                  onChange={e => setFormData({ ...formData, accountNo: e.target.value })} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">IFSC Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.ifsc || ''} 
                  onChange={e => setFormData({ ...formData, ifsc: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Branch</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.branch || ''} 
                  onChange={e => setFormData({ ...formData, branch: e.target.value })} 
                />
              </div>
            </div>
          </div>

          {/* Cloud Database (Supabase) Section */}
          <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', color: '#818cf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} /> ☁️ Cloud Database Settings (Supabase PostgreSQL)
              </h4>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setShowSqlSchema(!showSqlSchema)}
              >
                <Code size={14} /> {showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Connect your free Supabase PostgreSQL database to automatically backup and sync your invoices across all devices.
            </p>

            {showSqlSchema && (
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>SUPABASE SQL SETUP TABLES</span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }} onClick={handleCopySql}>
                    <Copy size={12} /> {copiedSql ? 'Copied!' : 'Copy SQL'}
                  </button>
                </div>
                <pre style={{ fontSize: '0.725rem', color: '#60a5fa', overflowX: 'auto', maxHeight: '180px' }}>
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supabase Project URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://xyz.supabase.co"
                  value={supabaseUrl} 
                  onChange={e => setSupabaseUrl(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supabase Anon Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="eyJhY... (Public Key)"
                  value={supabaseKey} 
                  onChange={e => setSupabaseKey(e.target.value)} 
                />
              </div>
            </div>
            
            {/* Database Sync Operations */}
            <div style={{ 
              marginTop: '1.25rem', 
              padding: '1.25rem', 
              background: 'rgba(16, 185, 129, 0.03)', 
              borderRadius: '12px', 
              border: '1px solid rgba(16, 185, 129, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#10b981', display: 'block', marginBottom: '0.25rem' }}>
                  Database Sync Operations
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Perform cloud syncing operations to merge or migrate your SQLite and Supabase databases.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ 
                    borderColor: '#10b981', 
                    color: '#10b981', 
                    background: 'rgba(16,185,129,0.05)', 
                    fontSize: '0.8rem',
                    flex: '1 1 200px',
                    padding: '0.75rem'
                  }}
                  onClick={handleBidirectionalSync}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : '🔄 Bidirectional Sync (Merge Both)'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ 
                    borderColor: '#f59e0b', 
                    color: '#f59e0b', 
                    background: 'rgba(245,158,11,0.05)', 
                    fontSize: '0.8rem',
                    flex: '1 1 200px',
                    padding: '0.75rem'
                  }}
                  onClick={handleMigrateBrowserStorageToSupabase}
                  disabled={syncing}
                >
                  {syncing ? 'Migrating...' : '📥 Migrate Browser Storage to Cloud'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ 
                    borderColor: 'var(--border-color)', 
                    fontSize: '0.8rem',
                    flex: '1 1 200px',
                    padding: '0.75rem'
                  }}
                  onClick={handleSyncLocalToCloud}
                  disabled={syncing}
                >
                  ⚡ One-Way Sync (Local ➔ Cloud)
                </button>
              </div>
            </div>
            
            {syncStatus && (
              <div style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.8rem', 
                color: syncStatus.startsWith('❌') ? '#ef4444' : syncStatus.startsWith('✓') ? '#10b981' : '#f59e0b',
                fontWeight: '600'
              }}>
                {syncStatus}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
              <Save size={18} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
