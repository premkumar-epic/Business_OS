import * as XLSX from 'xlsx';

// Helper to match Excel brand/names to CRM customers
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
  let afroasia = customersList.find(c => c.name.toLowerCase().includes('afroasia'));
  if (!afroasia) {
    return {
      id: 'cust-afroasia',
      name: 'Afroasia Exports',
      contactPerson: 'Aslam',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      gstin: '',
      oldBalance: 0,
      isNew: true
    };
  }
  return afroasia;
};

/**
 * Parses the uploaded IVK Excel file.
 * Returns { customer, shipments, payments, invoices }
 */
export const parseIVKExcel = (file, customersList) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 1. Resolve Afroasia Exports placeholder customer
        const defaultAfroasia = findCustomer('afroasia', customersList);

        // 2. Parse Shipments from 'Shipment_Log'
        const shipments = [];
        if (workbook.SheetNames.includes('Shipment_Log')) {
          const sheet = workbook.Sheets['Shipment_Log'];
          const rows = XLSX.utils.sheet_to_json(sheet);
          
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
              
              const matchedCust = findCustomer(brandCust, customersList) || defaultAfroasia;
              
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
        }

        // 3. Parse Payments from 'Payment Aslam'
        const payments = [];
        if (workbook.SheetNames.includes('Payment Aslam')) {
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
              
              const matchedCust = findCustomer(sender, customersList) || defaultAfroasia;
              
              payments.push({
                dateStr: dateStr,
                sender: String(sender).trim(),
                customerName: matchedCust.name,
                method: type || 'Transfer',
                amount: amount,
                ref: ref
              });
            }
          });
        }

        // 4. Parse Invoices from 'Invoice' sheet
        const invoices = [];
        if (workbook.SheetNames.includes('Invoice')) {
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
              
              const matchedCust = findCustomer(brand, customersList) || defaultAfroasia;
              const oldBalVal = row['__EMPTY'] ? Number(row['__EMPTY']) : 0;
              
              if (amount > 0) {
                invoices.push({
                  id: `inv-imported-${invNo}-${index}`,
                  invoiceNo: String(invNo).trim(),
                  date: dateStr,
                  dueDate: dateStr,
                  customer: matchedCust,
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
                  notes: `Imported Brand: ${brand}`
                });
              } else {
                const positiveAmt = Math.abs(amount);
                payments.push({
                  dateStr: new Date(dateStr).toLocaleDateString('en-GB'),
                  sender: `Direct applied to ${invNo}`,
                  customerName: matchedCust.name,
                  method: 'Direct Deduct',
                  amount: positiveAmt,
                  ref: `Direct Link`
                });
              }
            }
          });
        }

        resolve({
          afroasiaCustomer: defaultAfroasia.isNew ? defaultAfroasia : null,
          shipments,
          payments,
          invoices
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
