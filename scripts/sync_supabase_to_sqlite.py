import sqlite3
import json
import urllib.request
import os

DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"
SUPABASE_URL = "https://lpvcakgzrntpxvsrkilw.supabase.co"
ANON_KEY = "sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

def fetch_from_supabase(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode())
    except Exception as e:
        print(f"❌ Failed to fetch table '{table}' from Supabase: {e}")
        return None

print("Starting reverse sync: Supabase -> local SQLite...")

# 1. Fetch all data from Supabase
company_data = fetch_from_supabase("company")
customers_data = fetch_from_supabase("customers")
products_data = fetch_from_supabase("products")
invoices_data = fetch_from_supabase("invoices")

if company_data is None or customers_data is None or products_data is None or invoices_data is None:
    print("❌ Aborting sync due to fetch failures.")
    exit(1)

# 2. Write to local SQLite
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    # Disable foreign keys temporarily
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Clear local tables
    cursor.execute("DELETE FROM Company")
    cursor.execute("DELETE FROM Customers")
    cursor.execute("DELETE FROM Products")
    cursor.execute("DELETE FROM Invoices")
    cursor.execute("DELETE FROM InvoiceItems")
    cursor.execute("DELETE FROM InvoiceCustomFields")
    
    # Insert Company
    if company_data:
        c = company_data[0]
        cursor.execute("""
            INSERT INTO Company (name, accountHolder, addressLine1, addressLine2, city, state, pincode, phone, email, gstin, contactPerson, bankName, accountNo, ifscCode, branch, upiId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.get("name", ""), c.get("accountHolder", ""), c.get("addressLine1", ""), c.get("addressLine2", ""),
            c.get("city", ""), c.get("state", ""), c.get("pincode", ""), c.get("phone", ""), c.get("email", ""),
            c.get("gstin", ""), c.get("contactPerson", ""), c.get("bankName", ""), c.get("accountNo", ""),
            c.get("ifscCode", ""), c.get("branch", ""), c.get("upiId", "")
        ))
        print("✓ Local Company Profile updated.")
        
    # Insert Customers
    for cust in customers_data:
        cursor.execute("""
            INSERT INTO Customers (id, name, contactPerson, phone, email, address, city, state, pincode, gstin, oldBalance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cust["id"], cust.get("name", ""), cust.get("contactPerson", ""), cust.get("phone", ""), cust.get("email", ""),
            cust.get("address", ""), cust.get("city", ""), cust.get("state", ""), cust.get("pincode", ""),
            cust.get("gstin", ""), cust.get("oldBalance", 0)
        ))
    print(f"✓ {len(customers_data)} local Customers updated.")
    
    # Insert Products
    for prod in products_data:
        cursor.execute("""
            INSERT INTO Products (id, name, hsn, rate, category, unit)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            prod["id"], prod.get("name", ""), prod.get("hsn", ""), prod.get("rate", 0),
            prod.get("category", ""), prod.get("unit", "Pcs")
        ))
    print(f"✓ {len(products_data)} local Products updated.")
    
    # Insert Invoices
    for inv in invoices_data:
        # Extract customer info from JSONB structure to populate flat columns in SQLite
        cust_info = inv.get("customer") or {}
        customerName = cust_info.get("name", "")
        customerPhone = cust_info.get("phone", "")
        customerAddress = cust_info.get("address", "")
        customerGstin = cust_info.get("gstin", "")
        
        cursor.execute("""
            INSERT INTO Invoices (
                id, invoiceNo, date, dueDate, referenceDC, ewayBillNo, vehicleNo, lrNo, poNo, agentName,
                showBankDetails, showSignature, notes, gstNote, subtotal, gstRate, gstAmount,
                useCustomGstAmount, customGstAmount, oldBalance, useCustomTotalAmount, customTotalAmount,
                totalAmount, status, paidAmount, customerName, customerPhone, customerAddress, customerGstin,
                shippingCharges, packingCharges, discountAmount, documentTitle
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'INVOICE')
        """, (
            inv["id"], inv.get("invoiceNo", ""), inv.get("date", ""), inv.get("dueDate", ""),
            inv.get("referenceDC", ""), inv.get("ewayBillNo", ""), inv.get("vehicleNo", ""),
            inv.get("lrNo", ""), inv.get("poNo", ""), inv.get("agentName", ""),
            1 if inv.get("showBankDetails", True) else 0,
            1 if inv.get("showSignature", True) else 0,
            inv.get("notes", ""), inv.get("gstNote", ""),
            inv.get("subtotal", 0), inv.get("gstRate", 0), inv.get("gstAmount", 0),
            1 if inv.get("useCustomGstAmount", False) else 0,
            inv.get("customGstAmount", 0), inv.get("oldBalance", 0),
            1 if inv.get("useCustomTotalAmount", False) else 0,
            inv.get("customTotalAmount", 0), inv.get("totalAmount", 0),
            inv.get("status", "Pending"), inv.get("paidAmount", 0),
            customerName, customerPhone, customerAddress, customerGstin
        ))
        
        # Insert Items
        for item in inv.get("items") or []:
            cursor.execute("""
                INSERT INTO InvoiceItems (invoiceId, description, quantity, rate, gstRate, gstAmount, amount)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                inv["id"], item.get("description", ""), item.get("quantity", 0),
                item.get("rate", 0), item.get("gstRate", 0), item.get("gstAmount", 0), item.get("amount", 0)
            ))
            
        # Insert Custom Fields
        for field in inv.get("customFields") or []:
            cursor.execute("""
                INSERT INTO InvoiceCustomFields (invoiceId, label, value)
                VALUES (?, ?, ?)
            """, (inv["id"], field.get("label", ""), field.get("value", "")))
            
    print(f"✓ {len(invoices_data)} local Invoices updated.")
    conn.commit()
    print("✓ Local SQLite database is now fully in sync with Supabase cloud data!")
except Exception as e:
    conn.rollback()
    print(f"❌ Transaction failed, rolled back local SQLite database: {e}")
finally:
    conn.close()
