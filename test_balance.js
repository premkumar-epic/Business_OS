const fetch = require('node-fetch');

async function test() {
  const custRes = await fetch('http://localhost:5175/api/customers');
  const customers = await custRes.json();
  const invRes = await fetch('http://localhost:5175/api/invoices');
  const invoices = await invRes.json();

  const cust = customers.find(c => c.name === 'BATCHELOR');
  console.log("Base Old Balance:", cust.oldBalance);

  let totalNetBilled = 0;
  let totalPaid = 0;
  const norm = 'batchelor';

  console.log("Invoices for BATCHELOR:");
  invoices.forEach(inv => {
    const invName = (inv && inv.customer && inv.customer.name) ? String(inv.customer.name).trim().toLowerCase() : '';
    if (invName === norm && inv.status !== 'Draft') {
      const netInvoiceAmount = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.oldBalance || 0));
      console.log(`- Inv ${inv.invoiceNo}: Total=${inv.totalAmount}, OldBal=${inv.oldBalance}, Net=${netInvoiceAmount}, Status=${inv.status}, Paid=${inv.paidAmount}`);
      totalNetBilled += netInvoiceAmount;

      if (inv.status === 'Paid') {
        totalPaid += Number(inv.totalAmount || 0);
      } else if (inv.status === 'Partially Paid') {
        totalPaid += Number(inv.paidAmount || 0);
      }
    }
  });

  console.log("Total Net Billed:", totalNetBilled);
  console.log("Total Paid:", totalPaid);
  console.log("Final Outstanding:", Number(cust.oldBalance || 0) + totalNetBilled - totalPaid);
}
test();
