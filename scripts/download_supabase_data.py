import json
import urllib.request
import os

SUPABASE_URL = "https://lpvcakgzrntpxvsrkilw.supabase.co"
ANON_KEY = "sb_publishable_yIdu9rNa8IiNuTxxO5ct0w_b9MrBCjl"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

tables = ["company", "customers", "products", "invoices"]
output_dir = "/home/premkumar/IVK_Garments/Business_OS/scripts/cloud_backup"
os.makedirs(output_dir, exist_ok=True)

print(f"Starting cloud download from {SUPABASE_URL}...")

for table in tables:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            output_file = os.path.join(output_dir, f"{table}_cloud.json")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"✓ Downloaded {len(data)} rows from table '{table}' -> {output_file}")
    except Exception as e:
        print(f"❌ Failed to download table '{table}': {e}")

print("Cloud backup download complete.")
