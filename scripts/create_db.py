import sqlite3
import json
import re
import os
import csv
from datetime import datetime

# 1. Parse initialData.js manually since we don't want to mess with node modules setup
def run_node_extractor():
    js_code = """
    import fs from 'fs';
    import { defaultCompany, defaultCustomers, defaultProducts, initialInvoices } from './Invoice/src/data/initialData.js';
    
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
            # Clean "INR 97,000.00" -> 97000.00
            amt_str = amt_str.replace("INR ", "").replace(",", "")
            try:
                current_payment['amount'] = float(amt_str)
            except:
                current_payment['amount'] = 0.0

    if current_payment:
        payments.append(current_payment)
        
    return payments

def create_db():
    print("Extracting React Data...")
    js_data = run_node_extractor()
    print("Extracting Payment Logs...")
    payments = parse_payment_logs("Temp/Aslam/Aslam_Payment_Logs_June_Onwards.log")
    
    print("Creating SQLite DB...")
    db_path = 'centralized_management.sqlite'
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create Tables
    cursor.execute('''CREATE TABLE IF NOT EXISTS Company (
        id INTEGER PRIMARY KEY, name TEXT, address TEXT, city TEXT, state TEXT, 
        pincode TEXT, phone TEXT, email TEXT, gstin TEXT, bankName TEXT, accountNo TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS Customers (
        id TEXT PRIMARY KEY, name TEXT, contactPerson TEXT, phone TEXT, email TEXT, 
        address TEXT, city TEXT, state TEXT, pincode TEXT, gstin TEXT, oldBalance REAL
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS Products (
        id TEXT PRIMARY KEY, name TEXT, hsn TEXT, rate REAL, category TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS Invoices (
        id TEXT PRIMARY KEY, invoiceNo TEXT, date TEXT, dueDate TEXT, 
        customerName TEXT, subtotal REAL, gstAmount REAL, totalAmount REAL, status TEXT
    )''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT, sender TEXT, category TEXT, description TEXT, 
        recipient TEXT, payment_mode TEXT, reference_txn TEXT, amount REAL
    )''')

    # Insert Company
    c = js_data['company']
    cursor.execute('''INSERT INTO Company (name, address, city, state, pincode, phone, email, gstin, bankName, accountNo) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                   (c.get('name'), c.get('addressLine1'), c.get('city'), c.get('state'), c.get('pincode'),
                    c.get('phone'), c.get('email'), c.get('gstin'), c.get('bankName'), c.get('accountNo')))
    
    # Insert Customers
    for cust in js_data['customers']:
        cursor.execute('''INSERT INTO Customers (id, name, contactPerson, phone, email, address, city, state, pincode, gstin, oldBalance)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                       (cust.get('id'), cust.get('name'), cust.get('contactPerson'), cust.get('phone'), cust.get('email'),
                        cust.get('address'), cust.get('city'), cust.get('state'), cust.get('pincode'), cust.get('gstin'), cust.get('oldBalance')))
        
    # Insert Products
    for p in js_data['products']:
        cursor.execute('''INSERT INTO Products (id, name, hsn, rate, category) VALUES (?, ?, ?, ?, ?)''',
                       (p.get('id'), p.get('name'), p.get('hsn'), p.get('rate'), p.get('category')))
                       
    # Insert Invoices
    for inv in js_data['invoices']:
        customerName = inv.get('customer', {}).get('name', 'Unknown')
        cursor.execute('''INSERT INTO Invoices (id, invoiceNo, date, dueDate, customerName, subtotal, gstAmount, totalAmount, status)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                       (inv.get('id'), inv.get('invoiceNo'), inv.get('date'), inv.get('dueDate'), customerName,
                        inv.get('subtotal'), inv.get('gstAmount'), inv.get('totalAmount'), inv.get('status')))
                        
    # Insert Payments
    for pmt in payments:
        cursor.execute('''INSERT INTO Payments (timestamp, sender, category, description, recipient, payment_mode, reference_txn, amount)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                       (pmt.get('timestamp'), pmt.get('sender'), pmt.get('category'), pmt.get('description'), 
                        pmt.get('recipient'), pmt.get('payment_mode'), pmt.get('reference'), pmt.get('amount')))
                        
    conn.commit()
    conn.close()
    print("Database created successfully at centralized_management.sqlite")

if __name__ == "__main__":
    create_db()
