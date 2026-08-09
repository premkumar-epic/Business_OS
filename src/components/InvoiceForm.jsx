import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  Save, 
  RefreshCw,
  FileCheck,
  UserCheck,
  PackageCheck,
  Sliders,
  Zap,
  FilePlus,
  X,
  ArrowUp,
  ArrowDown,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Eye,
  Calculator
} from 'lucide-react';
import InvoicePaper from './InvoicePaper';
import { generateInvoicePDF } from '../utils/pdfGenerator';

export default function InvoiceForm({ 
  customers, 
  products, 
  company, 
  invoices = [],
  onSaveInvoice,
  onDeleteInvoice,
  initialInvoice = null
}) {
  const [invoice, setInvoice] = useState(() => {
    if (initialInvoice) return initialInvoice;

    const savedDraft = localStorage.getItem('ivk_billing_auto_draft');
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error('Failed to parse saved draft:', e);
      }
    }

    return {
      documentTitle: 'INVOICE',
      invoiceNo: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
      referenceDC: '',
      ewayBillNo: '',
      vehicleNo: '',
      lrNo: '',
      poNo: '',
      agentName: '',
      showBankDetails: true,
      showSignature: true,
      customFields: [],
      customer: { name: '', address: '', gstin: '', phone: '' },
      items: [
        { id: 1, description: '', quantity: '', rate: '', amount: 0 }
      ],
      subtotal: 0,
      discountAmount: 0,
      shippingCharges: 0,
      packingCharges: 0,
      useCustomGstAmount: false,
      customGstAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      oldBalance: 0,
      useCustomTotalAmount: false,
      customTotalAmount: 0,
      totalAmount: 0,
      status: 'Pending',
      paidAmount: 0,
      notes: 'Thank you for your business!'
    };
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [saveStatusAlert, setSaveStatusAlert] = useState(null);
  const [smartBalanceNotice, setSmartBalanceNotice] = useState(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawTextImport, setRawTextImport] = useState('');
  const [formSubTab, setFormSubTab] = useState('edit'); // 'edit' or 'preview' on smaller screens

  const previewWrapperRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (previewWrapperRef.current) {
        const parentWidth = previewWrapperRef.current.parentElement.clientWidth;
        if (parentWidth < 794) {
          setPreviewScale(parentWidth / 794);
        } else {
          setPreviewScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [formSubTab]);

  // Calculate unpaid balance from past bills for a specific customer
  const calculateCustomerPastUnpaid = (custName, currentInvId) => {
    if (!custName || !invoices || invoices.length === 0) return 0;
    const norm = String(custName).trim().toLowerCase();

    let unpaidTotal = 0;
    invoices.forEach(inv => {
      const invName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
      if (inv.id !== currentInvId && invName === norm) {
        if (inv.status === 'Pending') {
          unpaidTotal += Number(inv.totalAmount || 0);
        } else if (inv.status === 'Partially Paid') {
          const paid = Number(inv.paidAmount || 0);
          const remaining = Math.max(0, Number(inv.totalAmount || 0) - paid);
          unpaidTotal += remaining;
        }
      }
    });

    return unpaidTotal;
  };

  useEffect(() => {
    if (initialInvoice) {
      setInvoice(prev => ({
        ...prev,
        ...initialInvoice,
        showBankDetails: initialInvoice.showBankDetails !== false,
        showSignature: initialInvoice.showSignature !== false,
        customFields: initialInvoice.customFields || []
      }));
    }
  }, [initialInvoice]);


  // Floating-point safe rounding helper
  const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  useEffect(() => {
    const subtotal = roundToTwo(invoice.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
    
    // Sum item-level GST
    const calculatedGst = roundToTwo(invoice.items.reduce((sum, item) => {
      const itemGstRate = Number(item.gstRate) || 0;
      const itemAmount = Number(item.amount) || 0;
      const itemGst = roundToTwo(itemAmount * (itemGstRate / 100));
      return sum + itemGst;
    }, 0));

    const discount = Number(invoice.discountAmount) || 0;
    const shipping = Number(invoice.shippingCharges) || 0;
    const packing = Number(invoice.packingCharges) || 0;
    
    const taxableAmount = Math.max(0, subtotal - discount + shipping + packing);
    
    const finalGst = invoice.useCustomGstAmount && Number(invoice.customGstAmount) >= 0
      ? Number(invoice.customGstAmount)
      : calculatedGst;

    const oldBalance = Number(invoice.oldBalance) || 0;
    const calculatedTotal = Math.round(taxableAmount + finalGst + oldBalance);

    const finalTotal = invoice.useCustomTotalAmount && Number(invoice.customTotalAmount) >= 0
      ? Number(invoice.customTotalAmount)
      : calculatedTotal;

    setInvoice(prev => ({
      ...prev,
      subtotal,
      gstAmount: finalGst,
      totalAmount: finalTotal
    }));
  }, [
    invoice.items, 
    invoice.discountAmount, 
    invoice.shippingCharges, 
    invoice.packingCharges, 
    invoice.useCustomGstAmount,
    invoice.customGstAmount,
    invoice.oldBalance,
    invoice.useCustomTotalAmount,
    invoice.customTotalAmount
  ]);

  const generateNextInvoiceNo = (clientName, invoicesList = []) => {
    if (!clientName || clientName.trim() === '') return '';

    const normName = clientName.trim().toLowerCase();
    let prefix = 'IVK';

    if (normName.includes('bachelor')) {
      prefix = 'BH';
    } else if (normName.includes('ex marketing') || normName.includes('ex-marketing')) {
      prefix = 'EX';
    } else if (normName.includes('apb designs') || normName.includes('apb-designs') || normName.includes('apb')) {
      prefix = 'APB';
    } else if (normName.includes('afroasia') || normName.includes('afro asia')) {
      prefix = 'AF';
    } else {
      prefix = 'IVK';
    }

    let maxNum = 0;
    const regex = new RegExp(`^${prefix}[-_]?(\\d+)`, 'i');

    invoicesList.forEach(inv => {
      if (inv && inv.invoiceNo) {
        const match = String(inv.invoiceNo).trim().match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(2, '0');
    return `${prefix}-${paddedNum}`;
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      const nextInvNo = generateNextInvoiceNo(cust.name, invoices);

      // Smart Auto-Adjust carried balance from past pending & partially paid bills
      const pastUnpaid = calculateCustomerCarriedBalance(cust.name, invoice.id);
      const totalCarriedBalance = (cust.oldBalance || 0) + pastUnpaid;

      if (pastUnpaid > 0) {
        setSmartBalanceNotice(`Smart Auto-Adjusted Old Balance: Included ₹${pastUnpaid.toLocaleString('en-IN')} remaining balance from past bills for ${cust.name}`);
        setTimeout(() => setSmartBalanceNotice(null), 5000);
      }

      setInvoice(prev => ({
        ...prev,
        invoiceNo: nextInvNo,
        customer: {
          name: cust.name,
          address: cust.address,
          city: cust.city,
          state: cust.state,
          gstin: cust.gstin,
          phone: cust.phone
        },
        oldBalance: totalCarriedBalance
      }));
    } else {
      // If client is cleared
      setInvoice(prev => ({
        ...prev,
        invoiceNo: '',
        customer: { name: '', address: '', city: '', state: '', gstin: '', phone: '' },
        oldBalance: 0
      }));
    }
  };

  const calculateCustomerCarriedBalance = (custName, currentInvId) => {
    return calculateCustomerPastUnpaid(custName, currentInvId);
  };

  const triggerSmartBalanceRecalculate = () => {
    if (!invoice.customer?.name) return;
    const cust = customers.find(c => c.name.toLowerCase() === invoice.customer.name.toLowerCase());
    const baseOld = cust ? (cust.oldBalance || 0) : 0;
    const pastUnpaid = calculateCustomerPastUnpaid(invoice.customer.name, invoice.id);
    const totalCarried = baseOld + pastUnpaid;

    setInvoice(prev => ({ ...prev, oldBalance: totalCarried }));
    setSmartBalanceNotice(`✓ Recalculated carried balance for ${invoice.customer.name}: ₹${totalCarried.toLocaleString('en-IN')}`);
    setTimeout(() => setSmartBalanceNotice(null), 4000);
  };

  const handleCustomCustomerField = (field, value) => {
    setInvoice(prev => {
      const nextCustomer = { ...prev.customer, [field]: value };
      let nextInvoiceNo = prev.invoiceNo;

      if (field === 'name') {
        const hasNoInvoiceNo = !prev.invoiceNo || prev.invoiceNo.trim() === '';
        const matchesPreviousPrefix = /^(BH|EX|APB|AF|IVK)-/i.test(prev.invoiceNo);

        if (hasNoInvoiceNo || matchesPreviousPrefix) {
          nextInvoiceNo = generateNextInvoiceNo(value, invoices);
        }
      }

      return {
        ...prev,
        customer: nextCustomer,
        invoiceNo: nextInvoiceNo
      };
    });
  };

  const handleItemChange = (index, key, value) => {
    const newItems = [...invoice.items];
    const targetItem = { ...newItems[index] };
    targetItem[key] = value;

    if (key === 'description') {
      const matchingProduct = products.find(p => p.name === value);
      if (matchingProduct) {
        const quantity = Number(targetItem.quantity || 1);
        const isService = matchingProduct.name.toLowerCase().includes('embroidery') || matchingProduct.category?.toLowerCase() === 'services';
        const gstRate = isService ? 18 : 5;
        const amount = roundToTwo(quantity * matchingProduct.rate);
        
        targetItem.rate = matchingProduct.rate;
        targetItem.gstRate = gstRate;
        targetItem.gstAmount = roundToTwo(amount * (gstRate / 100));
        targetItem.amount = amount;
      }
    } else if (key === 'quantity' || key === 'rate') {
      const q = Number(targetItem.quantity) || 0;
      const r = Number(targetItem.rate) || 0;
      const g = Number(targetItem.gstRate) || 0;
      targetItem.amount = roundToTwo(q * r);
      targetItem.gstAmount = roundToTwo(targetItem.amount * (g / 100));
    }

    newItems[index] = targetItem;
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const handleSelectProduct = (index, productId) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      const newItems = [...invoice.items];
      const quantity = Number(newItems[index].quantity || 1);
      const isService = prod.name.toLowerCase().includes('embroidery') || prod.category?.toLowerCase() === 'services';
      const gstRate = isService ? 18 : 5;
      const amount = roundToTwo(quantity * prod.rate);
      
      newItems[index] = {
        ...newItems[index],
        description: prod.name,
        rate: prod.rate,
        gstRate,
        gstAmount: roundToTwo(amount * (gstRate / 100)),
        amount
      };
      setInvoice(prev => ({ ...prev, items: newItems }));
    }
  };

  const addItemRow = () => {
    setInvoice(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), description: '', quantity: 100, rate: 100, gstRate: 5, gstAmount: 500, amount: 10000 }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (invoice.items.length === 1) return;
    const newItems = invoice.items.filter((_, i) => i !== index);
    setInvoice(prev => ({ ...prev, items: newItems }));
  };

  const moveItemUp = (index) => {
    if (index === 0) return;
    const updated = [...invoice.items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setInvoice(prev => ({ ...prev, items: updated }));
  };

  const moveItemDown = (index) => {
    if (index === invoice.items.length - 1) return;
    const updated = [...invoice.items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setInvoice(prev => ({ ...prev, items: updated }));
  };

  const addCustomFieldRow = () => {
    setInvoice(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }]
    }));
  };

  const updateCustomField = (index, key, val) => {
    const updated = [...(invoice.customFields || [])];
    updated[index] = { ...updated[index], [key]: val };
    setInvoice(prev => ({ ...prev, customFields: updated }));
  };

  const removeCustomField = (index) => {
    const updated = invoice.customFields.filter((_, i) => i !== index);
    setInvoice(prev => ({ ...prev, customFields: updated }));
  };

  const loadPresetEXCasuals = () => {
    const exCust = customers.find(c => c.name.toLowerCase().includes('ex')) || {
      name: 'EX - Casuals',
      address: 'Main Garment Complex, Industrial Area, Bengaluru, Karnataka',
      gstin: '29EXCAS7890C1Z1',
      phone: '+91 9844001122'
    };

    setInvoice({
      documentTitle: 'INVOICE',
      invoiceNo: 'EX-001',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
      referenceDC: '',
      ewayBillNo: '',
      vehicleNo: '',
      lrNo: '',
      poNo: '',
      agentName: '',
      showBankDetails: true,
      showSignature: true,
      customFields: [],
      customer: { ...exCust },
      items: [
        { id: 1, description: 'EX - Casuals Main Shirts', quantity: 1279, rate: 145, amount: 185455 },
        { id: 2, description: 'Embroidery Work (279 x 6)', quantity: 279, rate: 6, amount: 1674 },
        { id: 3, description: 'Embroidery Special (272 x 8)', quantity: 272, rate: 8, amount: 2176 },
        { id: 4, description: 'Old Checks (E)', quantity: 318, rate: 6, amount: 1908 },
        { id: 5, description: 'Old Brushing (P)', quantity: 164, rate: 10, amount: 1640 }
      ],
      subtotal: 192853,
      discountAmount: 0,
      shippingCharges: 0,
      packingCharges: 0,
      useCustomGstAmount: true,
      customGstAmount: 5116,
      gstRate: 0,
      gstAmount: 5116,
      oldBalance: 0,
      useCustomTotalAmount: false,
      customTotalAmount: 197969,
      totalAmount: 197969,
      status: 'Paid',
      paidAmount: 197969,
      notes: 'EX - Casuals Handwritten Bill preset loaded!'
    });
  };

  const loadPresetBatchelor = () => {
    const batchCust = customers.find(c => c.name.toLowerCase().includes('babu')) || {
      name: 'Babu (BATCHELOR)',
      address: '42/1103, New Delux Complex, GB Road, Near Punjab National Bank, Vaddakanthara, Palakad, Kerala',
      phone: '+91 9947774488',
      gstin: '32KGPPS7947B1ZT',
      state: 'Kerala'
    };

    setInvoice({
      documentTitle: 'INVOICE',
      invoiceNo: 'B002',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0],
      referenceDC: 'DC-BATCHELOR-01',
      ewayBillNo: '',
      vehicleNo: '',
      lrNo: '',
      poNo: '',
      agentName: '',
      showBankDetails: true,
      showSignature: true,
      customFields: [],
      customer: { ...batchCust },
      items: [
        { id: 1, description: 'Batchelor Shirts (907 x 125)', quantity: 907, rate: 125, amount: 113375 },
        { id: 2, description: 'Embroidery (907 x 6)', quantity: 907, rate: 6, amount: 5442 }
      ],
      subtotal: 118817,
      discountAmount: 0,
      shippingCharges: 0,
      packingCharges: 0,
      useCustomGstAmount: true,
      customGstAmount: 3628,
      gstRate: 0,
      gstAmount: 3628,
      oldBalance: 100740,
      useCustomTotalAmount: false,
      customTotalAmount: 223185,
      totalAmount: 223185,
      status: 'Pending',
      paidAmount: 0,
      notes: 'Batchelor Handwritten Bill preset loaded with Embroidery & Old Balance!'
    });
  };

  const handleParseRawText = () => {
    if (!rawTextImport.trim()) return;

    const lines = rawTextImport.split('\n');
    let parsedItems = [];
    let parsedDC = '';
    let parsedCustName = '';

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      if (cleanLine.toLowerCase().includes('dc') || cleanLine.toLowerCase().includes('challan')) {
        const match = cleanLine.match(/(?:dc|challan)[\s#:]*([A-Za-z0-9,\s-]+)/i);
        if (match) parsedDC = match[1].trim();
      }

      if (cleanLine.toLowerCase().includes('customer') || cleanLine.toLowerCase().includes('to:')) {
        const match = cleanLine.match(/(?:customer|to:)[\s:]*([A-Za-z0-9\s,&-]+)/i);
        if (match) parsedCustName = match[1].trim();
      }

      const itemMatch = cleanLine.match(/^(.*?)[-:\s]+(\d+)\s*(?:pcs|pc)?[\s@xX]+(\d+)/i);
      if (itemMatch) {
        const desc = itemMatch[1].trim();
        const qty = Number(itemMatch[2]);
        const rate = Number(itemMatch[3]);
        parsedItems.push({
          id: Date.now() + Math.random(),
          description: desc,
          quantity: qty,
          rate: rate,
          amount: qty * rate
        });
      }
    });

    setInvoice(prev => ({
      ...prev,
      referenceDC: parsedDC || prev.referenceDC,
      customer: parsedCustName ? { ...prev.customer, name: parsedCustName } : prev.customer,
      items: parsedItems.length > 0 ? parsedItems : prev.items
    }));

    setIsImportModalOpen(false);
    setRawTextImport('');
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const filename = `${invoice.documentTitle || 'Invoice'}_${invoice.invoiceNo || 'Draft'}.pdf`;
    await generateInvoicePDF('live-invoice-paper', filename);
    setIsGeneratingPdf(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveFinal = () => {
    const finalInv = {
      ...invoice,
      id: invoice.id || `inv-${Date.now()}`,
      status: invoice.status === 'Draft' ? 'Pending' : invoice.status
    };
    onSaveInvoice(finalInv);
    setSaveStatusAlert({ type: 'success', msg: '✓ Invoice successfully saved & finalized!' });
    setTimeout(() => setSaveStatusAlert(null), 3500);
  };

  const handleSaveDraft = () => {
    const draftInv = {
      ...invoice,
      id: invoice.id || `inv-draft-${Date.now()}`,
      status: 'Draft'
    };
    onSaveInvoice(draftInv);
    setInvoice(draftInv);
    setSaveStatusAlert({ type: 'draft', msg: 'Saved as Draft! You can view or edit it anytime.' });
    setTimeout(() => setSaveStatusAlert(null), 3500);
  };

  return (
    <div className="billing-grid">
      {/* Sub-tabs for switching Editor vs Live Document Preview on smaller viewports */}
      <div className="form-sub-tabs no-print">
        <button 
          type="button" 
          className={`sub-tab-btn ${formSubTab === 'edit' ? 'active' : ''}`}
          onClick={() => setFormSubTab('edit')}
        >
          Edit Invoice Form
        </button>
        <button 
          type="button" 
          className={`sub-tab-btn ${formSubTab === 'preview' ? 'active' : ''}`}
          onClick={() => setFormSubTab('preview')}
        >
          Live A4 Document Preview
        </button>
      </div>

      {/* Left Column: Form Controls */}
      <div className={`form-card no-print ${formSubTab === 'edit' ? 'show-mobile' : 'hide-mobile'}`}>
        <div className="card-header">
          <div className="card-title">
            <FileCheck className="text-indigo-400" size={22} />
            Garment Billing Form
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleSaveDraft}
              title="Save as Draft"
              style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}
            >
              <Bookmark size={16} /> Draft
            </button>

            <button className="btn btn-secondary" onClick={handlePrint} title="Print Bill">
              <Printer size={16} /> Print
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
              {isGeneratingPdf ? 'Generating...' : 'PDF'}
            </button>

            <button className="btn btn-success" onClick={handleSaveFinal}>
              <Save size={16} /> Save
            </button>
          </div>
        </div>
        {/* Quick Actions */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          alignItems: 'center', 
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            onClick={() => setIsImportModalOpen(true)}
          >
            <Zap size={14} /> Import from Text
          </button>
        </div>

        {/* Saved Drafts Panel */}
        {(() => {
          const drafts = invoices.filter(inv => inv && inv.status === 'Draft');
          if (drafts.length === 0) return null;
          return (
            <div style={{ 
              marginBottom: '1rem',
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer'
                }}
                onClick={() => setInvoice(prev => ({ ...prev, _showDrafts: !prev._showDrafts }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', fontWeight: '600', color: '#f59e0b' }}>
                  <Bookmark size={15} /> Saved Drafts
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px'
                  }}>{drafts.length}</span>
                </div>
                <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '500' }}>
                  {invoice._showDrafts ? '▲ Hide' : '▼ Show'}
                </span>
              </div>
              {invoice._showDrafts && (
                <div style={{ 
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'var(--bg-secondary)'
                }}>
                  {drafts.map(d => (
                    <div key={d.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.7rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      gap: '0.5rem',
                      transition: 'border-color 0.2s'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.invoiceNo || 'No Number'} — {d.customer?.name || 'No Customer'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          ₹{Number(d.totalAmount || 0).toLocaleString('en-IN')} • {d.date || 'No Date'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                          title="Load this draft"
                          onClick={() => {
                            setInvoice({
                              ...d,
                              _showDrafts: false,
                              showBankDetails: d.showBankDetails !== false,
                              showSignature: d.showSignature !== false,
                              customFields: d.customFields || []
                            });
                            if (d.customer?.name) {
                              const matchCust = customers.find(c => 
                                c.name.toLowerCase() === d.customer.name.toLowerCase()
                              );
                              if (matchCust) setSelectedCustomerId(matchCust.id);
                            }
                            setSaveStatusAlert({ type: 'draft', msg: `Draft "${d.invoiceNo || d.customer?.name || 'Untitled'}" loaded!` });
                            setTimeout(() => setSaveStatusAlert(null), 3500);
                          }}
                        >
                          <FilePlus size={12} /> Load
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                          title="Delete this draft"
                          onClick={() => {
                            if (window.confirm(`Delete draft "${d.invoiceNo || d.customer?.name || 'Untitled'}"?`)) {
                              if (onDeleteInvoice) onDeleteInvoice(d.id);
                            }
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {smartBalanceNotice && (
          <div style={{
            padding: '0.65rem 0.85rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            fontSize: '0.825rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calculator size={16} /> {smartBalanceNotice}
          </div>
        )}

        {saveStatusAlert && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            backgroundColor: saveStatusAlert.type === 'draft' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${saveStatusAlert.type === 'draft' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            color: saveStatusAlert.type === 'draft' ? '#f59e0b' : '#10b981',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={18} /> {saveStatusAlert.msg}
          </div>
        )}

        {/* Document Type Selector & Basic Meta */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Bill / Document Type</label>
            <select 
              className="form-select"
              value={invoice.documentTitle || 'INVOICE'}
              onChange={e => setInvoice({ ...invoice, documentTitle: e.target.value })}
            >
              <option value="INVOICE">Tax Invoice</option>
              <option value="DELIVERY CHALLAN">Delivery Challan (DC)</option>
              <option value="PROFORMA INVOICE">Proforma Invoice</option>
              <option value="ESTIMATE">Estimate / Quotation</option>
              <option value="CREDIT NOTE">Credit Note</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bill / Invoice Number</label>
            <input 
              type="text" 
              className="form-input" 
              value={invoice.invoiceNo} 
              onChange={e => setInvoice({ ...invoice, invoiceNo: e.target.value })}
              placeholder="e.g. EX-001 or B002"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bill Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={invoice.date} 
              onChange={e => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>
        </div>

        {/* Customer Select & Detail */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="customer-select-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 0 }}>
              <UserCheck size={16} /> Bill To (Select Customer)
            </label>
            <select 
              className="form-select" 
              style={{ width: 'auto' }}
              value={selectedCustomerId}
              onChange={handleCustomerChange}
            >
              <option value="">-- Choose Existing Client --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoice.customer.name} 
                onChange={e => handleCustomCustomerField('name', e.target.value)}
                placeholder="Client Business Name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Client GSTIN</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoice.customer.gstin} 
                onChange={e => handleCustomCustomerField('gstin', e.target.value)}
                placeholder="e.g. 32KGPPS7947B1ZT"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Client Address</label>
            <textarea 
              className="form-textarea" 
              rows={2} 
              value={invoice.customer.address}
              onChange={e => handleCustomCustomerField('address', e.target.value)}
              placeholder="Street, Area, City, State, Pincode"
            />
          </div>
        </div>

        {/* Transport & Logistics Custom Fields */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Sliders size={16} /> Transport, E-Way & Logistics Fields
          </label>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reference DC No.</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoice.referenceDC || ''} 
                onChange={e => setInvoice({ ...invoice, referenceDC: e.target.value })}
                placeholder="e.g. 2727, 2738"
              />
            </div>
            <div className="form-group">
              <label className="form-label">E-Way Bill No.</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoice.ewayBillNo || ''} 
                onChange={e => setInvoice({ ...invoice, ewayBillNo: e.target.value })}
                placeholder="12 Digit E-Way Bill No."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle / Transport No.</label>
              <input 
                type="text" 
                className="form-input" 
                value={invoice.vehicleNo || ''} 
                onChange={e => setInvoice({ ...invoice, vehicleNo: e.target.value })}
                placeholder="e.g. KA-01-AB-1234"
              />
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PackageCheck size={16} /> Line Items (Re-arrange Order with ↑ ↓)
            </label>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={addItemRow}>
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          <div className="items-table-wrapper">
            <table className="items-table invoice-entry-table">
              <thead>
                <tr>
                  <th style={{ width: '8%', textAlign: 'center' }}>Move</th>
                  <th style={{ width: '42%' }}>Description</th>
                  <th style={{ width: '16%' }}>Qty (Pcs)</th>
                  <th style={{ width: '16%' }}>Rate (₹)</th>
                  <th style={{ width: '12%' }}>Amount (₹)</th>
                  <th style={{ width: '6%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-icon" 
                          style={{ padding: '2px 4px' }}
                          onClick={() => moveItemUp(index)}
                          disabled={index === 0}
                          title="Move Item Up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-icon" 
                          style={{ padding: '2px 4px' }}
                          onClick={() => moveItemDown(index)}
                          disabled={index === invoice.items.length - 1}
                          title="Move Item Down"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          list="preset-products-list" 
                          value={item.description} 
                          onChange={e => handleItemChange(index, 'description', e.target.value)} 
                          placeholder="Type or search product..." 
                        />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={item.quantity} 
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={item.rate} 
                        onChange={e => handleItemChange(index, 'rate', e.target.value)}
                        min="0"
                      />
                    </td>

                    <td>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={item.amount} 
                        readOnly 
                        style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button"
                        className="btn btn-danger btn-icon" 
                        onClick={() => removeItemRow(index)}
                        title="Remove Line"
                        disabled={invoice.items.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="preset-products-list">
              {products.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Invoice Payment Status & Partial Paid Controls */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
            Payment Status & Smart Carried Balances
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Status</label>
              <select 
                className="form-select"
                value={invoice.status || 'Pending'}
                onChange={e => setInvoice({ ...invoice, status: e.target.value })}
              >
                <option value="Pending">Pending (Unpaid)</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid (Full)</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            {invoice.status === 'Partially Paid' && (
              <div className="form-group" style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <label className="form-label" style={{ color: '#f59e0b' }}>Partial Amount Paid (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontWeight: 'bold', color: '#10b981' }}
                  value={invoice.paidAmount ?? ''} 
                  onChange={e => setInvoice({ ...invoice, paidAmount: Number(e.target.value) })}
                  placeholder="Enter amount paid so far (e.g. 100000)"
                />
                <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', color: '#ea580c', fontWeight: 'bold' }}>
                  Remaining Unpaid: ₹{Math.max(0, (invoice.totalAmount || 0) - (Number(invoice.paidAmount) || 0)).toLocaleString('en-IN')} (Will auto-carry to next bill!)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Taxes, Custom GST & Custom Total Override */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div className="form-row">
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>GST Tax Calculation</label>
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#818cf8' }}>
                  <input 
                    type="checkbox" 
                    checked={invoice.useCustomGstAmount || false} 
                    onChange={e => setInvoice({ ...invoice, useCustomGstAmount: e.target.checked })}
                  />
                  Custom GST ₹
                </label>
              </div>

              {invoice.useCustomGstAmount ? (
                <input 
                  type="number" 
                  className="form-input" 
                  value={invoice.customGstAmount ?? ''} 
                  onChange={e => setInvoice({ ...invoice, customGstAmount: Number(e.target.value) })}
                  placeholder="Enter Custom GST Amount (e.g. 5116 or 3628)"
                />
              ) : (
                <select 
                  className="form-select"
                  value={invoice.gstRate}
                  onChange={e => setInvoice({ ...invoice, gstRate: Number(e.target.value) })}
                >
                  <option value={0}>0% (Tax Exempt / Nil)</option>
                  <option value={5}>5% GST (Garments Standard)</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Old Outstanding Balance (₹)</label>
                <button 
                  type="button" 
                  onClick={triggerSmartBalanceRecalculate}
                  style={{ fontSize: '0.7rem', color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}
                >
                  Auto-Sync Past Unpaid
                </button>
              </div>
              <input 
                type="number" 
                className="form-input" 
                value={invoice.oldBalance} 
                onChange={e => setInvoice({ ...invoice, oldBalance: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Custom Total Override Row */}
          <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>Custom Grand Total Override</span>
              <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#10b981', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={invoice.useCustomTotalAmount || false} 
                  onChange={e => setInvoice({ ...invoice, useCustomTotalAmount: e.target.checked })}
                />
                Override Bill Total (₹)
              </label>
            </div>

            {invoice.useCustomTotalAmount ? (
              <input 
                type="number" 
                className="form-input" 
                style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}
                value={invoice.customTotalAmount ?? ''} 
                onChange={e => setInvoice({ ...invoice, customTotalAmount: Number(e.target.value) })}
                placeholder="Set Manual Final Total (e.g. 1,97,969 or 2,23,185)"
              />
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Calculated Grand Total: <strong>₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}</strong> (Subtotal + GST + Old Balance)
              </div>
            )}
          </div>

          {/* PDF Footer Display Options */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.85rem', 
            background: 'rgba(99, 102, 241, 0.05)', 
            borderRadius: '8px', 
            border: '1px solid rgba(99, 102, 241, 0.15)' 
          }}>
            <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#818cf8', marginBottom: '0.5rem' }}>
              <Eye size={16} /> PDF Footer Display Options
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input 
                  type="checkbox" 
                  checked={invoice.showBankDetails !== false} 
                  onChange={e => setInvoice({ ...invoice, showBankDetails: e.target.checked })}
                />
                Include Bank Account Details in PDF Footer
              </label>

              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input 
                  type="checkbox" 
                  checked={invoice.showContactDetails !== false} 
                  onChange={e => setInvoice({ ...invoice, showContactDetails: e.target.checked })}
                />
                Include Contact Details ("If you have any questions...") in Bank Section
              </label>

              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input 
                  type="checkbox" 
                  checked={invoice.showSignature !== false} 
                  onChange={e => setInvoice({ ...invoice, showSignature: e.target.checked })}
                />
                Include "Authorized Signatory" Section in PDF Footer
              </label>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />

          <div className="form-group">
            <label className="form-label">Custom GST Note (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              value={invoice.gstNote || ''} 
              onChange={e => setInvoice({ ...invoice, gstNote: e.target.value })}
              placeholder="e.g. GST Calculation – 5% of 164800 (2060*80)"
            />
          </div>

        </div>

        {/* Footer — Notes & Thank You */}
        <div style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem'
        }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label className="form-label">Notes & Footer Message</label>
            <textarea 
              className="form-textarea" 
              rows={2} 
              value={invoice.notes || ''} 
              onChange={e => setInvoice({ ...invoice, notes: e.target.value })}
              placeholder="Thank you for your business!"
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Live Printable PDF Preview */}
      <div className={`preview-column ${formSubTab === 'preview' ? 'show-mobile' : 'hide-mobile'}`}>
        <div style={{ 
          marginBottom: '0.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          fontWeight: '600'
        }}>
          <span>LIVE INVOICE PREVIEW</span>
          <span>A4 Document View</span>
        </div>

        <div ref={previewWrapperRef} style={{ width: '100%', overflow: 'hidden' }}>
          <div style={{
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
            width: '794px',
            height: `${1123 * previewScale}px`,
            minHeight: '1123px',
            marginBottom: `${1123 * (previewScale - 1)}px`
          }}>
            <InvoicePaper 
              invoice={invoice} 
              company={company} 
              id="live-invoice-paper"
            />
          </div>
        </div>
      </div>

      {/* Quick Raw Text Parser Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <div className="card-title" style={{ color: '#818cf8' }}>
                <Zap size={20} /> Quick Import Custom Bill Text
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsImportModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Paste unformatted bill data (e.g. from WhatsApp, SMS, or order notes) to automatically extract items, quantities, rates, and DC numbers!
            </div>

            <textarea 
              className="form-textarea" 
              rows={8} 
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              placeholder={`Example:\nCustomer: EX - Casuals\n1279 x 145 = 185455\nEmbroidery 279 x 6 = 1674\nEmbroidery 272 x 8 = 2176`}
              value={rawTextImport}
              onChange={e => setRawTextImport(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleParseRawText}>
                <Zap size={16} /> Auto-Populate Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
