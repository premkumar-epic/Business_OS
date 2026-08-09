import sqlite3

DB_PATH = "/home/premkumar/IVK_Garments/Business_OS/centralized_management.sqlite"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Checking SQLite database schema for missing columns...")

def add_column(table, column, definition):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        conn.commit()
        print(f"✓ Added '{column}' column to {table} table in SQLite.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"• '{column}' column already exists in {table} table.")
        else:
            print(f"❌ Failed to add '{column}' to {table}: {e}")

# 1. Products
add_column("Products", "unit", "TEXT DEFAULT 'Pcs'")
add_column("Products", "category", "TEXT")

# 2. Invoices
add_column("Invoices", "gstRate", "REAL DEFAULT 0")
add_column("Invoices", "gstNote", "TEXT")
add_column("Invoices", "useCustomGstAmount", "INTEGER DEFAULT 0")
add_column("Invoices", "customGstAmount", "REAL DEFAULT 0")
add_column("Invoices", "useCustomTotalAmount", "INTEGER DEFAULT 0")
add_column("Invoices", "customTotalAmount", "REAL DEFAULT 0")

conn.close()
print("Local SQLite migration check finished.")
