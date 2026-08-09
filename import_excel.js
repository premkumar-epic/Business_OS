import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

dotenv.config({ path: '/home/premkumar/IVK_Garments/Business_OS/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const findCustomer = (nameOrBrand, customersList) => {
  if (!nameOrBrand) return null;
  const name = String(nameOrBrand).trim().toLowerCase();
  
  if (name.includes('bachelor')) {
    return customersList.find(c => c.name.toLowerCase().includes('bachelor'));
  }
  if (name.includes('apb')) {
    return customersList.find(c => c.name.toLowerCase().includes('apb'));
  }
  if (name.includes('ex marketing') || name.includes('ex casual') || name.includes('ex-01')) {
    return customersList.find(c => c.name.toLowerCase().includes('ex marketing'));
  }
  
  // Default to Afroasia Exports
  return customersList.find(c => c.name.toLowerCase().includes('afroasia'));
};

async function main() {
  const filePath = '/home/premkumar/Downloads/IVK Garments+Form.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Excel file not found at ${filePath}`);
    process.exit(1);
  }

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);

  console.log('Fetching existing customers from Supabase...');
  const { data: existingCustomers, error: custError } = await supabase.from('customers').select('*');
  if (custError) {
    console.error('Error fetching customers:', custError);
    process.exit(1);
  }
  console.log(`Found ${existingCustomers.length} existing customers.`);

  // 1. Ensure "Afroasia Exports" exists
  let afroasia = existingCustomers.find(c => c.name.toLowerCase().includes('afroasia'));
  if (!afroasia) {
    console.log('Creating Afroasia Exports customer...');
    const newCust = {
      id: `cust-afroasia-${Date.now()}`,
      name: 'Afroasia Exports',
      contactPerson: 'Aslam',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      gstin: '',
      oldBalance: 0
    };
    const { data: createdCust, error: createError } = await supabase
      .from('customers')
      .insert(newCust)
      .select()
      .single();
    if (createError) {
      console.error('Error creating Afroasia Exports:', createError);
      process.exit(1);
    }
    afroasia = createdCust;
    existingCustomers.push(afroasia);
    console.log('Afroasia Exports customer created successfully.');
  }

  // 2. Parse Invoices from 'Invoice' sheet
  const importedInvoices = [];
  const paymentsToAllocate = [];

  if (workbook.SheetNames.includes('Invoice')) {
    console.log('Parsing Invoice sheet...');
    const sheet = workbook.Sheets['Invoice'];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    rows.forEach((row, index) => {
      const invNo = row['Invoice No.'];
      const brand = row['Name '];
      const amount = Number(row['Amount']);
      const dateVal = row['Date'];
      
      if (invNo && amount && !isNaN(amount)) {
        let dateStr = '';
        if (typeof dateVal === 'number') {
          const jsDate = new Date((dateVal - 25569) * 86400 * 1000);
          dateStr = jsDate.toISOString().split('T')[0];
        } else {
          dateStr = String(dateVal);
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
        }
        
        const matchedCust = findCustomer(brand, existingCustomers) || afroasia;
        const oldBalVal = row['__EMPTY'] ? Number(row['__EMPTY']) : 0;
        
        if (amount > 0) {
          importedInvoices.push({
            id: `inv-imported-${invNo}-${index}`,
            invoiceNo: String(invNo).trim(),
            date: dateStr,
            dueDate: dateStr,
            customer: matchedCust, // Save full customer details
            items: [{
              name: `Garments style brand: ${brand || 'General'}`,
              quantity: 1,
              rate: amount,
              total: amount
            }],
            subtotal: amount,
            gstRate: 0,
            gstAmount: 0,
            oldBalance: oldBalVal || null,
            totalAmount: amount,
            paidAmount: 0,
            status: 'Pending',
            useCustomTotalAmount: true,
            customTotalAmount: amount,
            notes: `Imported Brand: ${brand}. `
          });
        } else {
          const positiveAmt = Math.abs(amount);
          paymentsToAllocate.push({
            dateStr: new Date(dateStr).toLocaleDateString('en-GB'),
            customerName: matchedCust.name,
            amount: positiveAmt,
            method: 'Direct Deduct',
            ref: `Direct Link`
          });
        }
      }
    });
  }

  // 3. Parse Payments from 'Payment Aslam'
  if (workbook.SheetNames.includes('Payment Aslam')) {
    console.log('Parsing Payment Aslam sheet...');
    const sheet = workbook.Sheets['Payment Aslam'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    rows.forEach((row, idx) => {
      if (idx === 0) return; // skip header title
      
      const dateVal = row[1];
      const type = row[2];
      const sender = row[3];
      const ref = row[5] ? String(row[5]) : '-';
      const amount = Number(row[6]);
      
      if (dateVal && amount && !isNaN(amount) && amount > 0 && sender !== 'Sender') {
        let dateStr = '';
        if (typeof dateVal === 'number') {
          const jsDate = new Date((dateVal - 25569) * 86400 * 1000);
          dateStr = jsDate.toLocaleDateString('en-GB');
        } else {
          dateStr = String(dateVal);
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }
        }
        
        const matchedCust = findCustomer(sender, existingCustomers) || afroasia;
        
        paymentsToAllocate.push({
          dateStr: dateStr,
          customerName: matchedCust.name,
          amount: amount,
          method: type || 'Transfer',
          ref: ref
        });
      }
    });
  }

  // Sort invoices by date
  let pendingInvoicesList = [...importedInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log(`Processing allocations in-memory for ${paymentsToAllocate.length} payments across ${pendingInvoicesList.length} imported invoices...`);
  // Process allocations in-memory grouped by customer
  for (const pay of paymentsToAllocate) {
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

  console.log('Writing invoices to Supabase...');
  for (const inv of pendingInvoicesList) {
    const { error: invError } = await supabase.from('invoices').upsert(inv);
    if (invError) {
      console.error(`Error saving invoice ${inv.invoiceNo}:`, invError);
    }
  }

  // 4. Parse & upload shipments
  if (workbook.SheetNames.includes('Shipment_Log')) {
    console.log('Parsing Shipment_Log sheet...');
    const sheet = workbook.Sheets['Shipment_Log'];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const shipments = [];
    
    rows.forEach((row, index) => {
      const dateVal = row['Date'];
      const brandCust = row['Brand / Customer'];
      const qty = Number(row['Quantity (pcs)']);
      
      if (dateVal && brandCust && !isNaN(qty) && qty > 0 && brandCust !== 'Brand / Customer') {
        let dateStr = '';
        if (typeof dateVal === 'number') {
          const jsDate = new Date((dateVal - 25569) * 86400 * 1000);
          dateStr = jsDate.toISOString().split('T')[0];
        } else {
          dateStr = String(dateVal);
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }
        }
        
        const matchedCust = findCustomer(brandCust, existingCustomers) || afroasia;
        
        shipments.push({
          id: `ship-imported-${index}-${Date.now()}`,
          dispatchDate: dateStr,
          customerId: matchedCust.id,
          lrNumber: 'Excel Import',
          courierName: 'Excel Import',
          expectedDelivery: '',
          shippingCost: 0,
          brand: String(brandCust).trim(),
          itemName: 'Garments',
          numberOfPieces: qty,
          otherStuffs: row['Remarks'] || ''
        });
      }
    });

    console.log(`Saving ${shipments.length} shipments to SHIPMENTS_LEDGER draft invoice...`);
    const { data: existingLedger, error: ledgerErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoiceNo', 'SHIPMENTS_LEDGER')
      .maybeSingle();

    let ledger = existingLedger;
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
      items: [...shipments, ...(ledger.items || [])]
    };

    const { error: saveLedgerErr } = await supabase.from('invoices').upsert(updatedLedger);
    if (saveLedgerErr) {
      console.error('Error saving shipments to database ledger:', saveLedgerErr);
    } else {
      console.log('Shipments imported successfully.');
    }
  }

  console.log('\n--- Excel Import completed successfully! ---');
}

main();
