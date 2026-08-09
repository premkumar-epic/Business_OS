import os
import sqlite3
import subprocess
import re

DB_PATH = 'centralized_management.sqlite'
ROOT_DIR = '/home/premkumar/IVK_Garments'

def get_pdf_text(filepath):
    try:
        result = subprocess.run(['pdftotext', filepath, '-'], capture_output=True, text=True, timeout=10)
        return result.stdout
    except Exception as e:
        print(f"Error extracting {filepath}: {e}")
        return ""

def extract_crucial_details(text):
    details = {
        'gstin': None,
        'invoice_no': None,
        'total_amount': None,
        'date': None
    }
    
    # Try to find GSTIN (typical format: 2 numbers, 10 chars, 1 number, 1 char, 1 char)
    gstin_match = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b', text, re.IGNORECASE)
    if gstin_match:
        details['gstin'] = gstin_match.group(1).upper()
        
    # Try to find an Invoice Number
    inv_match = re.search(r'(?:Invoice No|Inv No|Bill No)[\s\.:]*([A-Za-z0-9\-\/]+)', text, re.IGNORECASE)
    if inv_match:
        details['invoice_no'] = inv_match.group(1).strip()
        
    # Try to find a Total Amount
    amt_match = re.search(r'(?:Grand Total|Total Amount|Total)[\s(INRRs\.\):]*([\d,]+\.?\d*)', text, re.IGNORECASE)
    if amt_match:
        details['total_amount'] = amt_match.group(1).strip()
        
    # Try to find Date
    date_match = re.search(r'(?:Date|Dated)[\s\.:]*(\d{2}[-/\.]\d{2}[-/\.]\d{4})', text, re.IGNORECASE)
    if date_match:
        details['date'] = date_match.group(1).strip()
        
    return details

def process_all_pdfs():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS PDFDocuments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        filepath TEXT,
        extracted_gstin TEXT,
        extracted_invoice_no TEXT,
        extracted_date TEXT,
        extracted_total TEXT,
        raw_text TEXT
    )''')
    
    pdf_count = 0
    for root, dirs, files in os.walk(ROOT_DIR):
        # skip node_modules to avoid deep scanning unnecessarily
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file.lower().endswith('.pdf'):
                filepath = os.path.join(root, file)
                print(f"Processing: {filepath}")
                text = get_pdf_text(filepath)
                
                details = extract_crucial_details(text)
                
                cursor.execute('''INSERT INTO PDFDocuments (filename, filepath, extracted_gstin, extracted_invoice_no, extracted_date, extracted_total, raw_text)
                                  VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                               (file, filepath, details['gstin'], details['invoice_no'], details['date'], details['total_amount'], text))
                pdf_count += 1
                
    conn.commit()
    conn.close()
    print(f"Successfully processed {pdf_count} PDF files and stored them in the centralized database.")

if __name__ == "__main__":
    process_all_pdfs()
