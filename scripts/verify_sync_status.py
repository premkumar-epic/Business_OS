import sqlite3
import json
import urllib.request

DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"
SUPABASE_URL = "https://lpvcakgzrntpxvsrkilw.supabase.co"
ANON_KEY = "sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}"
}

def count_supabase_rows(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=count"
    req = urllib.request.Request(url, headers={**headers, "Prefer": "count=exact"})
    try:
        with urllib.request.urlopen(req) as res:
            content_range = res.headers.get("Content-Range", "")
            if "/" in content_range:
                return int(content_range.split("/")[-1])
            return len(json.loads(res.read().decode()))
    except Exception as e:
        print(f"⚠️ Error querying Supabase '{table}': {e}")
        return "Error"

# 1. Query local SQLite
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

local_counts = {}
tables = ["Company", "Customers", "Products", "Invoices"]

for t in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        local_counts[t.lower()] = cursor.fetchone()[0]
    except Exception as e:
        local_counts[t.lower()] = "Error"
conn.close()

# 2. Query Supabase
cloud_counts = {}
for t in ["company", "customers", "products", "invoices"]:
    cloud_counts[t] = count_supabase_rows(t)

# 3. Print verification report
print("\n" + "="*55)
print("             DATABASE SYNC VERIFICATION REPORT")
print("="*55)
print(f"{'Table / Entity':<18} | {'Local SQLite (PCs)':<18} | {'Supabase Cloud (Web)':<20}")
print("-"*55)

for t in ["company", "customers", "products", "invoices"]:
    local_val = local_counts.get(t, "Error")
    cloud_val = cloud_counts.get(t, "Error")
    
    status = "✓ In Sync" if local_val == cloud_val else "⚠️ Mismatch (Run sync script)"
    if local_val == "Error" or cloud_val == "Error":
        status = "❌ Error reading"
        
    print(f"{t.capitalize():<18} | {str(local_val):<18} | {str(cloud_val):<20} {status}")
print("="*55)
print("To pull all cloud data to local SQLite, run:")
print("  python3 Business_OS/scripts/sync_supabase_to_sqlite.py")
print("="*55 + "\n")
