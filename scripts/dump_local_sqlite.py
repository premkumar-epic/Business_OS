import sqlite3
import json
import os

DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"
output_dir = "/home/premkumar/IVK_Garments/Business_OS/scripts/local_backup"
os.makedirs(output_dir, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def dump_table(table_name):
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    return [dict(r) for r in rows]

# Dump Company
company = dump_table("Company")
with open(os.path.join(output_dir, "company_local.json"), "w") as f:
    json.dump(company, f, indent=2)

# Dump Customers
customers = dump_table("Customers")
with open(os.path.join(output_dir, "customers_local.json"), "w") as f:
    json.dump(customers, f, indent=2)

# Dump Products
products = dump_table("Products")
with open(os.path.join(output_dir, "products_local.json"), "w") as f:
    json.dump(products, f, indent=2)

# Dump Invoices
cursor.execute("SELECT * FROM Invoices")
invoices = [dict(r) for r in cursor.fetchall()]

# For each invoice, fetch nested items and custom fields
for inv in invoices:
    inv_id = inv["id"]
    
    # Items
    cursor.execute("SELECT * FROM InvoiceItems WHERE invoiceId=?", (inv_id,))
    inv["items"] = [dict(r) for r in cursor.fetchall()]
    
    # Custom fields
    cursor.execute("SELECT * FROM InvoiceCustomFields WHERE invoiceId=?", (inv_id,))
    inv["customFields"] = [dict(r) for r in cursor.fetchall()]

with open(os.path.join(output_dir, "invoices_local.json"), "w") as f:
    json.dump(invoices, f, indent=2)

conn.close()

print(f"Dumped local SQLite database to {output_dir}")
print(f"Invoices: {len(invoices)}, Customers: {len(customers)}, Products: {len(products)}")
