import sqlite3
import json
import urllib.request

BACKUP_DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management_backup_before_supabase.sqlite"
ACTIVE_DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"
SUPABASE_URL = "https://lpvcakgzrntpxvsrkilw.supabase.co"
ANON_KEY = "sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

print("Restoring products from backup SQLite...")

# 1. Read products from backup
conn_backup = sqlite3.connect(BACKUP_DB_PATH)
conn_backup.row_factory = sqlite3.Row
cursor_backup = conn_backup.cursor()
cursor_backup.execute("SELECT * FROM Products")
products = [dict(r) for r in cursor_backup.fetchall()]
conn_backup.close()

print(f"Found {len(products)} products in backup database.")

# 2. Write products to active SQLite (upsert style)
conn_active = sqlite3.connect(ACTIVE_DB_PATH)
cursor_active = conn_active.cursor()

for p in products:
    cursor_active.execute("DELETE FROM Products WHERE id=?", (p["id"],))
    cursor_active.execute("""
        INSERT INTO Products (id, name, hsn, rate, category, unit)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (p["id"], p["name"], p["hsn"], p.get("rate", 0), p.get("category", ""), p.get("unit", "Pcs")))

conn_active.commit()
conn_active.close()
print("✓ Restored products in local SQLite.")

# 3. Upload products to Supabase
url = f"{SUPABASE_URL}/rest/v1/products"
payload = json.dumps(products).encode('utf-8')
req = urllib.request.Request(url, data=payload, headers={**headers, "Prefer": "resolution=merge-duplicates"}, method="POST")

try:
    with urllib.request.urlopen(req) as res:
        print("✓ Restored products in Supabase cloud database.")
except Exception as e:
    print(f"❌ Failed to restore products in Supabase: {e}")
