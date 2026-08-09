const http = require('http');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'centralized_management.sqlite');
const PORT = process.env.PORT || 5000;

// Initialize SQLite Connection
const db = new DatabaseSync(DB_PATH);

// Helper to execute query and return rows
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

// Helper to execute query and return single row
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows[0] || null;
}

// Helper to run query (INSERT/UPDATE/DELETE)
function runSql(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

// Helper to parse JSON request body
function getJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Helper to send JSON responses
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Basic Router
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // ----------------------------------------------------
    // COMPANY ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/api/company' && req.method === 'GET') {
      const company = queryOne("SELECT * FROM Company LIMIT 1") || {};
      sendJson(res, 200, company);
      return;
    }
    
    if (pathname === '/api/company' && req.method === 'POST') {
      const c = await getJsonBody(req);
      // Delete existing and insert new
      runSql("DELETE FROM Company");
      runSql(`INSERT INTO Company (name, accountHolder, addressLine1, addressLine2, city, state, pincode, phone, email, gstin, contactPerson, bankName, accountNo, ifscCode, branch, upiId) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        c.name || '', c.accountHolder || '', c.addressLine1 || '', c.addressLine2 || '',
        c.city || '', c.state || '', c.pincode || '', c.phone || '', c.email || '',
        c.gstin || '', c.contactPerson || '', c.bankName || '', c.accountNo || '',
        c.ifscCode || '', c.branch || '', c.upiId || ''
      ]);
      sendJson(res, 200, { success: true, message: "Company profile updated" });
      return;
    }

    // ----------------------------------------------------
    // CUSTOMER ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/api/customers' && req.method === 'GET') {
      const customers = queryAll("SELECT * FROM Customers");
      sendJson(res, 200, customers);
      return;
    }

    if (pathname === '/api/customers' && req.method === 'POST') {
      const c = await getJsonBody(req);
      const id = c.id || `cust-${Date.now()}`;
      runSql("DELETE FROM Customers WHERE id=?", [id]);
      runSql(`INSERT INTO Customers (id, name, contactPerson, phone, email, address, city, state, pincode, gstin, oldBalance) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id, c.name, c.contactPerson, c.phone, c.email, c.address, c.city, c.state, c.pincode, c.gstin, c.oldBalance || 0
      ]);
      sendJson(res, 201, { success: true, id });
      return;
    }

    if (pathname === '/api/customers' && req.method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: "ID parameter missing" });
      const c = await getJsonBody(req);
      runSql(`UPDATE Customers SET name=?, contactPerson=?, phone=?, email=?, address=?, city=?, state=?, pincode=?, gstin=?, oldBalance=? WHERE id=?`, [
        c.name, c.contactPerson, c.phone, c.email, c.address, c.city, c.state, c.pincode, c.gstin, c.oldBalance || 0, id
      ]);
      sendJson(res, 200, { success: true });
      return;
    }

    if (pathname === '/api/customers' && req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: "ID parameter missing" });
      runSql("DELETE FROM Customers WHERE id=?", [id]);
      sendJson(res, 200, { success: true });
      return;
    }

    // ----------------------------------------------------
    // PRODUCT ENDPOINTS
    // ----------------------------------------------------
    if (pathname === '/api/products' && req.method === 'GET') {
      const products = queryAll("SELECT * FROM Products");
      sendJson(res, 200, products);
      return;
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      const p = await getJsonBody(req);
      const id = p.id || `prod-${Date.now()}`;
      runSql("DELETE FROM Products WHERE id=?", [id]);
      runSql(`INSERT INTO Products (id, name, hsn, rate, category, unit) VALUES (?, ?, ?, ?, ?, ?)`, [
        id, p.name, p.hsn, p.rate || 0, p.category, p.unit || 'Pcs'
      ]);
      sendJson(res, 201, { success: true, id });
      return;
    }

    if (pathname === '/api/products' && req.method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: "ID parameter missing" });
      const p = await getJsonBody(req);
      runSql(`UPDATE Products SET name=?, hsn=?, rate=?, category=?, unit=? WHERE id=?`, [
        p.name, p.hsn, p.rate || 0, p.category, p.unit || 'Pcs', id
      ]);
      sendJson(res, 200, { success: true });
      return;
    }

    if (pathname === '/api/products' && req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: "ID parameter missing" });
      runSql("DELETE FROM Products WHERE id=?", [id]);
      sendJson(res, 200, { success: true });
      return;
    }

    // ----------------------------------------------------
    // INVOICE ENDPOINTS (Full relational nesting)
    // ----------------------------------------------------
    if (pathname === '/api/invoices' && req.method === 'GET') {
      const invoices = queryAll("SELECT * FROM Invoices ORDER BY date DESC");
      // Populate items and custom fields for each invoice
      const enrichedInvoices = invoices.map(inv => {
        const items = queryAll("SELECT id, description, quantity, rate, gstRate, gstAmount, amount FROM InvoiceItems WHERE invoiceId=?", [inv.id]);
        const customFields = queryAll("SELECT label, value FROM InvoiceCustomFields WHERE invoiceId=?", [inv.id]);
        
        return {
          ...inv,
          showBankDetails: inv.showBankDetails === 1,
          showSignature: inv.showSignature === 1,
          useCustomGstAmount: inv.useCustomGstAmount === 1,
          useCustomTotalAmount: inv.useCustomTotalAmount === 1,
          customer: {
            name: inv.customerName,
            address: inv.customerAddress,
            gstin: inv.customerGstin,
            phone: inv.customerPhone
          },
          items,
          customFields
        };
      });
      sendJson(res, 200, enrichedInvoices);
      return;
    }

    if (pathname === '/api/invoices' && req.method === 'POST') {
      const inv = await getJsonBody(req);
      const id = inv.id || `inv-${Date.now()}`;
      
      // Use transactional sync to avoid partial insertions
      runSql("BEGIN TRANSACTION");
      try {
        // Delete any existing items/fields if updating
        runSql("DELETE FROM Invoices WHERE id=?", [id]);
        runSql("DELETE FROM InvoiceItems WHERE invoiceId=?", [id]);
        runSql("DELETE FROM InvoiceCustomFields WHERE invoiceId=?", [id]);

        const cust = inv.customer || {};

        runSql(`INSERT INTO Invoices (
          id, documentTitle, invoiceNo, date, dueDate, referenceDC, ewayBillNo, vehicleNo, lrNo, poNo, agentName, 
          showBankDetails, showSignature, customerName, customerAddress, customerGstin, customerPhone,
          subtotal, discountAmount, shippingCharges, packingCharges, useCustomGstAmount, customGstAmount,
          gstRate, gstAmount, oldBalance, useCustomTotalAmount, customTotalAmount, totalAmount, status, paidAmount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          id, inv.documentTitle || 'INVOICE', inv.invoiceNo, inv.date, inv.dueDate,
          inv.referenceDC || '', inv.ewayBillNo || '', inv.vehicleNo || '', inv.lrNo || '', inv.poNo || '', inv.agentName || '',
          inv.showBankDetails ? 1 : 0, inv.showSignature ? 1 : 0,
          cust.name || '', cust.address || '', cust.gstin || '', cust.phone || '',
          inv.subtotal || 0, inv.discountAmount || 0, inv.shippingCharges || 0, inv.packingCharges || 0,
          inv.useCustomGstAmount ? 1 : 0, inv.customGstAmount || 0,
          inv.gstRate || 0, inv.gstAmount || 0, inv.oldBalance || 0,
          inv.useCustomTotalAmount ? 1 : 0, inv.customTotalAmount || 0,
          inv.totalAmount || 0, inv.status || 'Pending', inv.paidAmount || 0, inv.notes || ''
        ]);

        for (const item of inv.items || []) {
          runSql(`INSERT INTO InvoiceItems (invoiceId, description, quantity, rate, gstRate, gstAmount, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            id, item.description, item.quantity || 0, item.rate || 0, item.gstRate || 0, item.gstAmount || 0, item.amount || 0
          ]);
        }

        for (const field of inv.customFields || []) {
          if (field.label && field.value) {
            runSql(`INSERT INTO InvoiceCustomFields (invoiceId, label, value) VALUES (?, ?, ?)`, [
              id, field.label, field.value
            ]);
          }
        }
        
        runSql("COMMIT");
        sendJson(res, 201, { success: true, id });
      } catch (err) {
        runSql("ROLLBACK");
        throw err;
      }
      return;
    }

    if (pathname === '/api/invoices' && req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: "ID parameter missing" });
      
      runSql("BEGIN TRANSACTION");
      try {
        runSql("DELETE FROM Invoices WHERE id=?", [id]);
        runSql("DELETE FROM InvoiceItems WHERE invoiceId=?", [id]);
        runSql("DELETE FROM InvoiceCustomFields WHERE invoiceId=?", [id]);
        runSql("COMMIT");
        sendJson(res, 200, { success: true });
      } catch (err) {
        runSql("ROLLBACK");
        throw err;
      }
      return;
    }

    // ----------------------------------------------------
    // SECURE LOCK SCREEN ENDPOINTS (Authentication)
    // ----------------------------------------------------
    if (pathname === '/api/auth/unlock' && req.method === 'POST') {
      const body = await getJsonBody(req);
      const password = body.password;
      
      // Standard hardcoded security passcode for IVK Garments (configurable)
      const SECURE_PIN = "9449"; 
      
      if (password === SECURE_PIN) {
        sendJson(res, 200, { success: true, token: "secure_ivk_session_token_xyz123" });
      } else {
        sendJson(res, 401, { success: false, error: "Invalid secure PIN. Access Denied." });
      }
      return;
    }

    // Fallback: 404
    sendJson(res, 404, { error: "Endpoint not found" });

  } catch (err) {
    console.error("Server Error:", err);
    sendJson(res, 500, { error: "Internal Server Error", details: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Business OS API Server running on port ${PORT}`);
});
