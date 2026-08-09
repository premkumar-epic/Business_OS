import sqlite3
import csv
import os

def import_csv():
    db_path = 'centralized_management.sqlite'
    csv_path = 'IVK Garments+Form - Invoice.csv'
    
    if not os.path.exists(db_path):
        print("Database not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create an InvoiceLedger table to capture these manual adjustments
    cursor.execute('''CREATE TABLE IF NOT EXISTS InvoiceLedger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceNo TEXT,
        customerName TEXT,
        amount REAL,
        date TEXT,
        accountNo TEXT,
        balance REAL
    )''')
    
    print(f"Importing data from {csv_path}...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        
        for row in reader:
            if not row or not any(row):
                continue
                
            invoiceNo = row[0].strip() if len(row) > 0 else ''
            customerName = row[1].strip() if len(row) > 1 else ''
            
            # Clean amount strings like "265,740" -> 265740.0
            amount_str = row[2].strip().replace(',', '').replace('"', '') if len(row) > 2 else '0'
            try:
                amount = float(amount_str)
            except:
                amount = 0.0
                
            date = row[3].strip() if len(row) > 3 else ''
            accountNo = row[4].strip() if len(row) > 4 else ''
            
            # 6th column seems to be running balance
            balance_str = row[5].strip().replace(',', '').replace('"', '') if len(row) > 5 else '0'
            try:
                balance = float(balance_str)
            except:
                balance = 0.0
                
            cursor.execute('''INSERT INTO InvoiceLedger (invoiceNo, customerName, amount, date, accountNo, balance)
                              VALUES (?, ?, ?, ?, ?, ?)''',
                           (invoiceNo, customerName, amount, date, accountNo, balance))
                           
    conn.commit()
    conn.close()
    print("CSV data successfully imported into the InvoiceLedger table.")

if __name__ == "__main__":
    import_csv()
