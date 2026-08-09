import sqlite3
import json
import urllib.request
import urllib.parse
import os

DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"
SUPABASE_URL = "https://lpvcakgzrntpxvsrkilw.supabase.co"
ANON_KEY = "sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def post_to_supabase(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            return True, res.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, f"HTTP Error {e.code}: {body}"
    except Exception as e:
        return False, str(e)

print("Starting complete sync from SQLite to Supabase...")

# 1. Sync Company Profile
cursor.execute("SELECT * FROM Company LIMIT 1")
company_row = cursor.fetchone()
if company_row:
    comp = dict(company_row)
    comp.pop("id", None)
    comp["id"] = "default"  # enforce standard default ID
    if "passcode" not in comp or not comp["passcode"]:
        comp["passcode"] = "9449"
    # remove sqlite primary key if it is integer
    success, msg = post_to_supabase("company", comp)
    if success:
        print("✓ Company Profile synced.")
    else:
        print(f"❌ Failed to sync Company Profile: {msg}")

# 2. Sync Customers
cursor.execute("SELECT * FROM Customers")
customers = [dict(r) for r in cursor.fetchall()]
if customers:
    success, msg = post_to_supabase("customers", customers)
    if success:
        print(f"✓ {len(customers)} Customers synced.")
    else:
        print(f"❌ Failed to sync Customers: {msg}")

# 3. Sync Products
cursor.execute("SELECT * FROM Products")
products = []
for r in cursor.fetchall():
    p = dict(r)
    if not p.get("unit"):
        p["unit"] = "Pcs"
    products.append(p)
if products:
    success, msg = post_to_supabase("products", products)
    if success:
        print(f"✓ {len(products)} Products synced.")
    else:
        print(f"❌ Failed to sync Products: {msg}")

# 4. Sync Invoices (formatting nested structures for Supabase JSONB)
cursor.execute("SELECT * FROM Invoices")
invoices = []
for r in cursor.fetchall():
    inv = dict(r)
    inv_id = inv["id"]
    
    # Fetch items from SQLite
    cursor.execute("SELECT description, quantity, rate, gstRate, gstAmount, amount FROM InvoiceItems WHERE invoiceId=?", (inv_id,))
    items = [dict(row) for row in cursor.fetchall()]
    
    # Fetch custom fields from SQLite
    cursor.execute("SELECT label, value FROM InvoiceCustomFields WHERE invoiceId=?", (inv_id,))
    custom_fields = [dict(row) for row in cursor.fetchall()]
    
    # Construct JSONB objects
    inv["items"] = items
    inv["customFields"] = custom_fields
    
    # Ensure customer sub-object exists
    inv["customer"] = {
        "name": inv.get("customerName", ""),
        "phone": inv.get("customerPhone", ""),
        "address": inv.get("customerAddress", ""),
        "gstin": inv.get("customerGstin", "")
    }
    
    # Clean up SQLite flat columns that aren't in Supabase invoices table
    flat_cols = ["customerName", "customerPhone", "customerAddress", "customerGstin", "shippingCharges", "packingCharges", "discountAmount", "documentTitle"]
    for col in flat_cols:
        inv.pop(col, None)
        
    # Map booleans from SQLite integers (1/0)
    inv["showBankDetails"] = bool(inv.get("showBankDetails", 1))
    inv["showSignature"] = bool(inv.get("showSignature", 1))
    inv["useCustomGstAmount"] = bool(inv.get("useCustomGstAmount", 0))
    inv["useCustomTotalAmount"] = bool(inv.get("useCustomTotalAmount", 0))
    
    invoices.append(inv)

if invoices:
    success, msg = post_to_supabase("invoices", invoices)
    if success:
        print(f"✓ {len(invoices)} Invoices synced.")
    else:
        print(f"❌ Failed to sync Invoices: {msg}")

conn.close()
print("Sync script finished.")
