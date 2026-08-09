import sqlite3
import json
import os
import re

DB_PATH = 'Business_OS/centralized_management.sqlite'
# Keep backup of the old database just in case
if os.path.exists(DB_PATH):
    shutil_path = 'Business_OS/centralized_management_old.sqlite'
    import shutil
    shutil.copy2(DB_PATH, shutil_path)
    os.remove(DB_PATH)

def run_node_extractor():
    js_code = """
    import fs from 'fs';
    import { defaultCompany, defaultCustomers, defaultProducts, initialInvoices } from './Business_OS/src/data/initialData.js';
    
    const data = {
        company: defaultCompany,
        customers: defaultCustomers,
        products: defaultProducts,
        invoices: initialInvoices
    };
    fs.writeFileSync('temp_db_dump.json', JSON.stringify(data, null, 2));
    """
    with open('extract.mjs', 'w') as f:
        f.write(js_code)
    
    os.system("node extract.mjs")
    
    with open('temp_db_dump.json', 'r') as f:
        data = json.load(f)
        
    os.remove('extract.mjs')
    os.remove('temp_db_dump.json')
    return data

def parse_payment_logs(filepath):
    payments = []
    if not os.path.exists(filepath):
        return payments
        
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    current_payment = {}
    for line in lines:
        line = line.strip()
        if line.startswith("LOG RECORD"):
            if current_payment:
                payments.append(current_payment)
            current_payment = {}
        elif line.startswith("Timestamp"):
            current_payment['timestamp'] = line.split(":", 1)[1].strip()
        elif line.startswith("Sender"):
            current_payment['sender'] = line.split(":", 1)[1].strip()
        elif line.startswith("Category"):
            current_payment['category'] = line.split(":", 1)[1].strip()
        elif line.startswith("Description"):
            current_payment['description'] = line.split(":", 1)[1].strip()
        elif line.startswith("Recipient"):
            current_payment['recipient'] = line.split(":", 1)[1].strip()
        elif line.startswith("Payment Mode"):
            current_payment['payment_mode'] = line.split(":", 1)[1].strip()
        elif line.startswith("Reference/Txn"):
            current_payment['reference'] = line.split(":", 1)[1].strip()
        elif line.startswith("Amount"):
            amt_str = line.split(":", 1)[1].strip()
            amt_str = amt_str.replace("INR ", "").replace(",", "")
            try:
                current_payment['amount'] = float(amt_str)
            except:
                current_payment['amount'] = 0.0

    if current_payment:
        payments.append(current_payment)
        
    return payments

def setup_db():
    print("Extracting React Data...")
    js_data = run_node_extractor()
    print("Extracting Payment Logs...")
    payments = parse_payment_logs("Temp/Aslam/Processed_Data/Aslam_Payment_Logs_June_Onwards.log")
    
    print("Re-creating complete SQLite DB at " + DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Company Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS Company (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        accountHolder TEXT,
        addressLine1 TEXT,
        addressLine2 TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        phone TEXT,
        email TEXT,
        gstin TEXT,
        contactPerson TEXT,
        bankName TEXT,
        accountNo TEXT,
        ifscCode TEXT,
        branch TEXT,
        upiId TEXT
    )''')
    
    # 2. Customers Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS Customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        contactPerson TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        gstin TEXT,
        oldBalance REAL
    )''')
    
    # 3. Products Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS Products (
        id TEXT PRIMARY KEY,
        name TEXT,
        hsn TEXT,
        rate REAL,
        category TEXT
    )''')
    
    # 4. Invoices Table (Expanded to mirror full state)
    cursor.execute('''CREATE TABLE IF NOT EXISTS Invoices (
        id TEXT PRIMARY KEY,
        documentTitle TEXT,
        invoiceNo TEXT,
        date TEXT,
        dueDate TEXT,
        referenceDC TEXT,
        ewayBillNo TEXT,
        vehicleNo TEXT,
        lrNo TEXT,
        poNo TEXT,
        agentName TEXT,
        showBankDetails INTEGER,
        showSignature INTEGER,
        customerName TEXT,
        customerAddress TEXT,
        customerGstin TEXT,
        customerPhone TEXT,
        subtotal REAL,
        discountAmount REAL,
        shippingCharges REAL,
        packingCharges REAL,
        useCustomGstAmount INTEGER,
        customGstAmount REAL,
        gstRate REAL,
        gstAmount REAL,
        oldBalance REAL,
        useCustomTotalAmount INTEGER,
        customTotalAmount REAL,
        totalAmount REAL,
        status TEXT,
        paidAmount REAL,
        notes TEXT
    )''')
    
    # 5. Invoice Items Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS InvoiceItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId TEXT,
        description TEXT,
        quantity REAL,
        rate REAL,
        gstRate REAL DEFAULT 0,
        gstAmount REAL DEFAULT 0,
        amount REAL,
        FOREIGN KEY (invoiceId) REFERENCES Invoices(id) ON DELETE CASCADE
    )''')
    
    # 6. Invoice Custom Fields Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS InvoiceCustomFields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId TEXT,
        label TEXT,
        value TEXT,
        FOREIGN KEY (invoiceId) REFERENCES Invoices(id) ON DELETE CASCADE
    )''')
    
    # 7. Payments Table
    cursor.execute('''CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        sender TEXT,
        category TEXT,
        description TEXT,
        recipient TEXT,
        payment_mode TEXT,
        reference_txn TEXT,
        amount REAL
    )''')

    # Re-insert Company
    cursor.execute("DELETE FROM Company")
    c = js_data['company']
    cursor.execute('''INSERT INTO Company (name, accountHolder, addressLine1, addressLine2, city, state, pincode, phone, email, gstin, contactPerson, bankName, accountNo, ifscCode, branch, upiId) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                   (c.get('name'), c.get('accountHolder'), c.get('addressLine1'), c.get('addressLine2'), c.get('city'), c.get('state'), c.get('pincode'),
                    c.get('phone'), c.get('email'), c.get('gstin'), c.get('contactPerson'), c.get('bankName'), c.get('accountNo'), c.get('ifscCode'), c.get('branch'), c.get('upiId')))
    
    # Re-insert Customers
    cursor.execute("DELETE FROM Customers")
    for cust in js_data['customers']:
        cursor.execute('''INSERT INTO Customers (id, name, contactPerson, phone, email, address, city, state, pincode, gstin, oldBalance)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                       (cust.get('id'), cust.get('name'), cust.get('contactPerson'), cust.get('phone'), cust.get('email'),
                        cust.get('address'), cust.get('city'), cust.get('state'), cust.get('pincode'), cust.get('gstin'), cust.get('oldBalance')))
        
    # Re-insert Products
    cursor.execute("DELETE FROM Products")
    for p in js_data['products']:
        cursor.execute('''INSERT INTO Products (id, name, hsn, rate, category) VALUES (?, ?, ?, ?, ?)''',
                       (p.get('id'), p.get('name'), p.get('hsn'), p.get('rate'), p.get('category')))
                       
    # Re-insert Invoices and nested sub-items
    cursor.execute("DELETE FROM Invoices")
    cursor.execute("DELETE FROM InvoiceItems")
    cursor.execute("DELETE FROM InvoiceCustomFields")
    
    for inv in js_data['invoices']:
        inv_id = inv.get('id')
        cust = inv.get('customer', {})
        
        cursor.execute('''INSERT INTO Invoices (
            id, documentTitle, invoiceNo, date, dueDate, referenceDC, ewayBillNo, vehicleNo, lrNo, poNo, agentName, 
            showBankDetails, showSignature, customerName, customerAddress, customerGstin, customerPhone,
            subtotal, discountAmount, shippingCharges, packingCharges, useCustomGstAmount, customGstAmount,
            gstRate, gstAmount, oldBalance, useCustomTotalAmount, customTotalAmount, totalAmount, status, paidAmount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
            inv_id,
            inv.get('documentTitle', 'INVOICE'),
            inv.get('invoiceNo'),
            inv.get('date'),
            inv.get('dueDate'),
            inv.get('referenceDC', ''),
            inv.get('ewayBillNo', ''),
            inv.get('vehicleNo', ''),
            inv.get('lrNo', ''),
            inv.get('poNo', ''),
            inv.get('agentName', ''),
            1 if inv.get('showBankDetails', True) else 0,
            1 if inv.get('showSignature', True) else 0,
            cust.get('name'),
            cust.get('address'),
            cust.get('gstin'),
            cust.get('phone'),
            inv.get('subtotal', 0),
            inv.get('discountAmount', 0),
            inv.get('shippingCharges', 0),
            inv.get('packingCharges', 0),
            1 if inv.get('useCustomGstAmount', False) else 0,
            inv.get('customGstAmount', 0),
            inv.get('gstRate', 0),
            inv.get('gstAmount', 0),
            inv.get('oldBalance', 0),
            1 if inv.get('useCustomTotalAmount', False) else 0,
            inv.get('customTotalAmount', 0),
            inv.get('totalAmount', 0),
            inv.get('status', 'Pending'),
            inv.get('paidAmount', 0),
            inv.get('notes', '')
        ))
        
        # Insert Line Items
        for item in inv.get('items', []):
            desc = item.get('description', '').lower()
            gst_rate = 18 if 'embroidery' in desc or 'service' in desc else 5
            gst_amt = round((item.get('amount', 0) * (gst_rate / 100)), 2)
            cursor.execute('''INSERT INTO InvoiceItems (invoiceId, description, quantity, rate, gstRate, gstAmount, amount)
                              VALUES (?, ?, ?, ?, ?, ?, ?)''',
                           (inv_id, item.get('description'), item.get('quantity'), item.get('rate'), gst_rate, gst_amt, item.get('amount')))
                           
        # Insert Custom Fields
        for field in inv.get('customFields', []):
            if field.get('label') and field.get('value'):
                cursor.execute('''INSERT INTO InvoiceCustomFields (invoiceId, label, value)
                                  VALUES (?, ?, ?)''',
                               (inv_id, field.get('label'), field.get('value')))
                               
    # Re-insert Payments
    cursor.execute("DELETE FROM Payments")
    for pmt in payments:
        cursor.execute('''INSERT INTO Payments (timestamp, sender, category, description, recipient, payment_mode, reference_txn, amount)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                       (pmt.get('timestamp'), pmt.get('sender'), pmt.get('category'), pmt.get('description'), 
                        pmt.get('recipient'), pmt.get('payment_mode'), pmt.get('reference'), pmt.get('amount')))
                        
    conn.commit()
    conn.close()
    print("Database built successfully with all nested data!")

if __name__ == "__main__":
    setup_db()
