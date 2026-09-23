#!/usr/bin/env python3
"""
Tally Financial Intelligence Excel Parser
-----------------------------------------
Production-Grade Script for Tally Prime Excel Exports (.xlsx & .xls)

Features:
1. Supports both .xlsx (via openpyxl) and .xls (via xlrd) formats.
2. Dynamically strips company metadata headers (Company Name, Group Title, Date Ranges).
3. Handles Tally's 3-level header structure:
   Row N:   [Particulars] [         ] [Transactions] [          ] [         ]
   Row N+1: [           ] [Opening  ] [            ] [          ] [Closing  ]
   Row N+2: [           ] [Balance  ] [Debit       ] [Credit   ] [Balance  ]
4. Parses Dr/Cr balance amounts into signed numbers.
5. Extracts Grand Total row for verification.
6. Emits clean, validated JSON output for Supabase PostgreSQL database insertion.
"""

import sys
import os
import json
import re
import datetime

def clean_str(val):
    if val is None:
        return ""
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime('%d-%b-%y')
    return str(val).strip()


def parse_dr_cr_amount(val):
    """Parse a value that may contain Dr/Cr suffix into a signed number.
    For Payables/Creditors: Cr = positive (liability), Dr = negative (advance)
    For Receivables/Debtors: Dr = positive (owed to us), Cr = negative (paid)
    Returns (number, suffix) where suffix is 'Dr', 'Cr', or '' 
    """
    if val is None:
        return 0.0, ''
    
    s = clean_str(val)
    if s == '' or s.lower() == 'none':
        return 0.0, ''
    
    # Check for Dr/Cr suffix
    suffix = ''
    lower = s.lower()
    if lower.endswith('dr') or ' dr' in lower:
        suffix = 'Dr'
    elif lower.endswith('cr') or ' cr' in lower:
        suffix = 'Cr'
    
    # Extract numeric part
    numeric_str = re.sub(r'[^0-9.\-]', '', s)
    if not numeric_str or numeric_str == '.' or numeric_str == '-':
        return 0.0, suffix
    
    try:
        num = float(numeric_str)
    except ValueError:
        return 0.0, suffix
    
    return abs(num), suffix


def read_excel_rows(file_path):
    sheets_rows = {}
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.xls':
        try:
            import xlrd
            wb = xlrd.open_workbook(file_path)
            for sheet_name in wb.sheet_names():
                sheet = wb.sheet_by_name(sheet_name)
                rows = []
                for r_idx in range(sheet.nrows):
                    row_vals = [sheet.cell_value(r_idx, c_idx) for c_idx in range(sheet.ncols)]
                    rows.append(row_vals)
                sheets_rows[sheet_name] = rows
            return sheets_rows
        except Exception:
            # File extension is .xls but internally it's an OOXML (.xlsx) file
            pass

    import openpyxl
    import io
    with open(file_path, 'rb') as f:
        file_bytes = f.read()

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    except Exception:
        wb = openpyxl.load_workbook(file_path, data_only=True)

    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        rows = list(sheet.iter_rows(values_only=True))
        sheets_rows[sheet_name] = rows

    return sheets_rows


def find_header_rows(rows):
    """Find the header rows in a Tally export.
    Tally Group Summaries have 2-3 header rows:
      Row A: Particulars | (empty)  | (Transactions or empty) | (empty) | (empty)
      Row B: (empty)     | Opening  | (empty or Transactions) | (empty) | Closing
      Row C: (empty)     | Balance  | Debit                   | Credit  | Balance
    
    Returns: (header_start_idx, num_header_rows, combined_headers)
    """
    if not rows:
        return 0, 1, []
    
    # Step 1: Find the row containing 'Particulars'
    particulars_idx = -1
    for i, r in enumerate(rows[:20]):
        for c_idx, cell in enumerate(r):
            if cell is not None and clean_str(cell).lower() == 'particulars':
                particulars_idx = i
                break
        if particulars_idx >= 0:
            break
    
    # Step 2: Find the row containing 'Opening' or 'Opening Balance'
    opening_idx = -1
    for i, r in enumerate(rows[:20]):
        r_str = " ".join([clean_str(c).lower() for c in r if c is not None])
        if 'opening' in r_str:
            opening_idx = i
            break
    
    # Step 3: Find the row containing 'Debit' and 'Credit'
    debit_credit_idx = -1
    for i, r in enumerate(rows[:20]):
        r_str = " ".join([clean_str(c).lower() for c in r if c is not None])
        if 'debit' in r_str and 'credit' in r_str:
            debit_credit_idx = i
            break
    
    # Also check for a row with just 'Balance', 'Debit', 'Credit'
    balance_debit_credit_idx = -1
    for i, r in enumerate(rows[:20]):
        r_str = " ".join([clean_str(c).lower() for c in r if c is not None])
        if 'balance' in r_str and 'debit' in r_str and 'credit' in r_str:
            balance_debit_credit_idx = i
            break
    
    # Determine the header structure
    if particulars_idx >= 0 and debit_credit_idx >= 0:
        header_start = min(particulars_idx, opening_idx if opening_idx >= 0 else particulars_idx)
        last_header_row = max(debit_credit_idx, balance_debit_credit_idx if balance_debit_credit_idx >= 0 else debit_credit_idx)
        num_rows = last_header_row - header_start + 1
        
        # Build combined headers by merging all header rows
        max_cols = 0
        for i in range(header_start, last_header_row + 1):
            if i < len(rows):
                max_cols = max(max_cols, len(rows[i]))
        
        # Merge all header rows column-by-column
        combined = []
        for c in range(max_cols):
            parts = []
            for i in range(header_start, last_header_row + 1):
                if i < len(rows) and c < len(rows[i]):
                    val = clean_str(rows[i][c])
                    if val and val.lower() not in ['none', '']:
                        parts.append(val)
            
            # Join non-empty parts
            header_text = " ".join(parts).strip()
            header_text = re.sub(r'\s+', ' ', header_text)
            
            if not header_text:
                header_text = f"Column_{c + 1}"
            
            combined.append(header_text)
        
        return header_start, num_rows, combined
    
    # Fallback: find the row with the most content as header
    if opening_idx >= 0:
        header_idx = opening_idx
    elif particulars_idx >= 0:
        header_idx = particulars_idx
    else:
        max_c = 0
        header_idx = 0
        for i, r in enumerate(rows[:15]):
            count = sum(1 for c in r if c is not None and clean_str(c) != '')
            if count > max_c:
                max_c = count
                header_idx = i
    
    row1 = rows[header_idx]
    row2 = rows[header_idx + 1] if header_idx + 1 < len(rows) else None
    
    is_sub_header = False
    if row2:
        row2_str = " ".join([clean_str(c).lower() for c in row2 if c is not None])
        if 'debit' in row2_str or 'credit' in row2_str or 'balance' in row2_str:
            is_sub_header = True
    
    combined = []
    last_parent = ""
    max_cols = max(len(row1), len(row2) if is_sub_header else 0)
    
    for c in range(max_cols):
        v1 = clean_str(row1[c]) if c < len(row1) else ""
        v2 = clean_str(row2[c]) if is_sub_header and c < len(row2) else ""
        
        if v1 and v1.lower() not in ["none"]:
            last_parent = v1
        else:
            v1 = last_parent
        
        if is_sub_header and v2 and v2.lower() not in ["none"]:
            if v1.lower() in v2.lower():
                final = v2
            elif v2.lower() in v1.lower():
                final = v1
            else:
                final = f"{v1} {v2}".strip()
        else:
            final = v1 if v1 else f"Column_{c + 1}"
        
        final = re.sub(r'\s+', ' ', final).strip()
        combined.append(final)
    
    num_header_rows = 2 if is_sub_header else 1
    return header_idx, num_header_rows, combined


def normalize_header(header):
    """Normalize a combined header to a canonical field name."""
    h = header.lower().strip()
    h = re.sub(r'[^a-z0-9 ]', '', h)
    h = re.sub(r'\s+', ' ', h).strip()
    
    if h in ['particulars', 'column 1', 'column1']:
        return 'Particulars'
    
    # Debit variants - check BEFORE opening/closing to handle "Opening Balance Debit" or "Transactions Debit"
    if 'debit' in h or h == 'dr':
        return 'Debit'
    
    # Credit variants - check BEFORE opening/closing
    if 'credit' in h or h == 'cr':
        return 'Credit'
    
    # Opening Balance variants
    if 'opening' in h:
        return 'Opening Balance'
    
    # Closing Balance variants
    if 'closing' in h:
        return 'Closing Balance'
    
    # Balance alone (without Opening/Closing context) - likely Opening Balance
    if h == 'balance':
        return 'Opening Balance'
    
    return header


def parse_tally_excel(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    raw_sheets = read_excel_rows(file_path)
    parsed_sheets = []

    for sheet_name, rows in raw_sheets.items():
        if not rows:
            continue

        # Find and merge header rows
        header_start, num_header_rows, combined_raw_headers = find_header_rows(rows)
        
        # Normalize headers to canonical names
        normalized_headers = [normalize_header(h) for h in combined_raw_headers]
        
        # Ensure we have the right columns, resolve duplicates
        final_headers = []
        seen = {}
        for i, h in enumerate(normalized_headers):
            if h in seen:
                # If "Opening Balance" appears twice, the second might be "Closing Balance"
                if h == 'Opening Balance' and 'Closing Balance' not in seen:
                    h = 'Closing Balance'
                else:
                    h = f"{h}_{seen[h]}"
            seen[h] = seen.get(h, 0) + 1
            final_headers.append(h)
        
        # Data starts after all header rows
        data_start_idx = header_start + num_header_rows
        
        records = []
        grand_total = None

        for r_idx in range(data_start_idx, len(rows)):
            r = rows[r_idx]
            if not r:
                continue

            r_vals = [clean_str(c) for c in r if c is not None and clean_str(c) != '']
            if not r_vals:
                continue

            first_val = r_vals[0].lower()
            
            # Skip metadata/summary rows (but extract Grand Total)
            if 'grand total' in first_val or first_val.startswith('total'):
                # Extract Grand Total values
                gt_record = {}
                for c_idx, h_name in enumerate(final_headers):
                    c_val = r[c_idx] if c_idx < len(r) else ""
                    gt_record[h_name] = c_val if c_val is not None else ""
                grand_total = gt_record
                continue
            
            if (
                'group summary' in first_val or
                'sundry creditors' in first_val or
                'sundry debtors' in first_val or
                'creditor for' in first_val or
                'debtor for' in first_val or
                'debtors of' in first_val or
                'creditors' == first_val.strip()
            ):
                continue

            record = {}
            has_data = False

            for c_idx, h_name in enumerate(final_headers):
                c_val = r[c_idx] if c_idx < len(r) else ""
                if c_val is not None and clean_str(c_val) != "":
                    has_data = True
                record[h_name] = c_val if c_val is not None else ""

            if has_data:
                records.append(record)

        parsed_sheets.append({
            "sheetName": sheet_name,
            "headers": final_headers,
            "totalRows": len(records),
            "records": records,
            "grandTotal": grand_total
        })

    return {
        "fileName": os.path.basename(file_path),
        "sheets": parsed_sheets
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python scripts/parse_tally_excel.py <excel_file_path>"}))
        sys.exit(1)

    excel_file = sys.argv[1]
    try:
        data = parse_tally_excel(excel_file)
        print(json.dumps(data, indent=2, default=str))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
