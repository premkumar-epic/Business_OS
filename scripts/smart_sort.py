import os
import re
import shutil
import subprocess
import pytesseract
from PIL import Image

ROOT_DIR = '/home/premkumar/IVK_Garments'
ARCHIVE_DIR = os.path.join(ROOT_DIR, 'IVK_Garments')
ACCIDENTAL_DIR = os.path.join(ARCHIVE_DIR, 'IVK_Garments')
TEMP_DIR = os.path.join(ROOT_DIR, 'Temp')

def merge_directories(src, dest):
    if not os.path.exists(src):
        return
    if not os.path.exists(dest):
        os.makedirs(dest)
    
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dest, item)
        if os.path.isdir(s):
            merge_directories(s, d)
        else:
            # Move file, rename if duplicate
            if os.path.exists(d):
                base, ext = os.path.splitext(item)
                d = os.path.join(dest, f"{base}_duplicate{ext}")
            shutil.move(s, d)

def cleanup_accidental_dir():
    if os.path.exists(ACCIDENTAL_DIR):
        print("Merging accidental nested folder structure...")
        merge_directories(ACCIDENTAL_DIR, ARCHIVE_DIR)
        shutil.rmtree(ACCIDENTAL_DIR)
        print("Accidental nested folder removed successfully.")

# Month mapping helper for target folders
def get_month_folder(year, month_num):
    months = {
        1: '1.Jan', 2: '2.Feb', 3: '3.March', 4: '4.April', 5: '5.May', 6: '6.June',
        7: '7.July', 8: '8.August', 9: '9.Sept', 10: '10.Oct', 11: '11.Nov', 12: '12.Dec'
    }
    # Check 2024 month folder names (existing: April, August, July, June, May)
    # 2024 uses direct names, 2025 and 2026 use <Num>.<Name>
    if str(year) == '2024':
        months_2024 = {
            1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
            7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
        }
        return months_2024.get(month_num)
    else:
        return months.get(month_num)

def parse_date(text):
    # Regex to find DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    match = re.search(r'\b(\d{2})[-/](\d{2})[-/](\d{4})\b', text)
    if match:
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if day > 2000:
            year, month, day = day, month, int(match.group(1))
        return year, month

    match = re.search(r'\b(\d{4})[-/](\d{2})[-/](\d{2})\b', text)
    if match:
        return int(match.group(1)), int(match.group(2))
        
    # Standard text month search like "June 4, 2026"
    match = re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\.]*(\d{1,2})[,\s]*(\d{4})\b', text, re.IGNORECASE)
    if match:
        months_str = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        m_idx = months_str.index(match.group(1).lower()[:3]) + 1
        return int(match.group(3)), m_idx
        
    return None, None

def get_text_from_pdf(filepath):
    res = subprocess.run(['pdftotext', filepath, '-'], capture_output=True, text=True)
    text = res.stdout.strip()
    
    if len(text) < 20: # Scanned
        print(f"  [Scanned PDF detected. Running OCR on {os.path.basename(filepath)}...]")
        temp_prefix = os.path.join(ROOT_DIR, 'temp_ocr_page')
        subprocess.run(['pdftoppm', '-png', '-f', '1', '-l', '1', '-r', '150', filepath, temp_prefix])
        png_path = f"{temp_prefix}-1.png"
        if os.path.exists(png_path):
            try:
                img = Image.open(png_path)
                ocr_text = pytesseract.image_to_string(img)
                text = ocr_text
            except Exception as e:
                print(f"    OCR Failed: {e}")
            finally:
                os.remove(png_path)
    return text

def sort_documents():
    print("--- SORTING ARCHIVE DOCUMENTS ---")
    targets = []
    
    # List loose files in ARCHIVE_DIR (excluding directories)
    for f in os.listdir(ARCHIVE_DIR):
        full_p = os.path.join(ARCHIVE_DIR, f)
        if os.path.isfile(full_p):
            targets.append(full_p)

    for filepath in targets:
        filename = os.path.basename(filepath)
        print(f"Processing: {filename}")
        
        if filename.lower().endswith('.pdf'):
            text = get_text_from_pdf(filepath)
            year, month = parse_date(text)
            
            # Match EX casuals
            if not year:
                if 'ex-001' in filename.lower() or 'ex casuals' in text.lower():
                    year, month = 2026, 7
                elif 'b001' in filename.lower() or 'b01' in filename.lower():
                    year, month = 2026, 7
                elif 'bh002' in filename.lower():
                    year, month = 2026, 7
                    
            if year and month:
                month_folder = get_month_folder(year, month)
                dest_dir = os.path.join(ARCHIVE_DIR, str(year), month_folder)
                
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, filename)
                
                print(f"  -> Moving to {year}/{month_folder}/")
                shutil.move(filepath, dest_path)
            else:
                if 'challan' in filename.lower() or 'gst' in filename.lower():
                    dest_dir = os.path.join(ARCHIVE_DIR, 'GST')
                else:
                    dest_dir = os.path.join(ARCHIVE_DIR, 'Unsorted_General')
                os.makedirs(dest_dir, exist_ok=True)
                print(f"  -> Moving to {os.path.basename(dest_dir)}/ (Undateable)")
                shutil.move(filepath, os.path.join(dest_dir, filename))

def sort_temp():
    print("\n--- SORTING TEMP DIRECTORY ---")
    aslam_dir = os.path.join(TEMP_DIR, 'Aslam')
    personal_dir = os.path.join(TEMP_DIR, 'Personal')
    
    if os.path.exists(personal_dir):
        shutil.rmtree(personal_dir)
        print("Deleted empty Temp/Personal folder.")
        
    if os.path.exists(aslam_dir):
        raw_dir = os.path.join(aslam_dir, 'Raw_Chats')
        proc_dir = os.path.join(aslam_dir, 'Processed_Data')
        
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(proc_dir, exist_ok=True)
        
        for item in os.listdir(aslam_dir):
            item_path = os.path.join(aslam_dir, item)
            if item in ['Raw_Chats', 'Processed_Data']:
                continue
                
            if 'WhatsApp Chat' in item:
                print(f"  -> Moving raw chat '{item}' to Raw_Chats/")
                shutil.move(item_path, os.path.join(raw_dir, item))
            elif item.endswith(('.log', '.json')):
                print(f"  -> Moving processed data '{item}' to Processed_Data/")
                shutil.move(item_path, os.path.join(proc_dir, item))

if __name__ == "__main__":
    cleanup_accidental_dir()
    sort_documents()
    sort_temp()
    print("\nReorganization Complete!")
