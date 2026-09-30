#!/usr/bin/env python3
"""
Tally Financial Intelligence Excel Parser
-----------------------------------------
Production-Grade Universal Script for Tally Prime Excel Exports (.xlsx & .xls)

Features:
1. Supports both .xlsx (via openpyxl) and .xls (via xlrd) formats.
2. Handles multi-level headers (Group Summaries) and single-level registers (Sales, Purchases, Receipts, Payments).
3. Robust column normalization for GST, UOM/Units (MT, NOS, KG), Quantities, Rates, and Balances.
4. Voucher Forward-Filling: forward-fills Date and Voucher No for multi-item invoices where subsequent rows leave them blank.
5. Emits clean, validated JSON output.
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
    """Parse a value that may contain Dr/Cr suffix into a signed number."""
    if val is None:
        return 0.0, ''
    
    s = clean_str(val)
    if s == '' or s.lower() == 'none':
        return 0.0, ''
    
    suffix = ''
    lower = s.lower()
    if lower.endswith('dr') or ' dr' in lower:
        suffix = 'Dr'
    elif lower.endswith('cr') or ' cr' in lower:
        suffix = 'Cr'
    
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

    # If file has .xls extension, try xlrd first
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
            if sheets_rows:
                return sheets_rows
        except Exception:
            pass

    # Try openpyxl (standard for .xlsx and XML-based .xls)
    try:
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

        if sheets_rows:
            return sheets_rows
    except Exception:
        pass

    # Fallback to xlrd if openpyxl failed (e.g. legacy binary .xls saved with .xlsx extension)
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
        pass

    return sheets_rows


def find_header_rows(rows):
    """Find the header rows in a Tally export.
    Supports Group Summaries (2-3 rows) and Voucher Registers (Sales, Purchases, Receipts).
    """
    if not rows:
        return 0, 1, []
    
    scan_limit = min(len(rows), 35)

    particulars_idx = -1
    date_idx = -1
    opening_idx = -1
    debit_credit_idx = -1

    for i in range(scan_limit):
        r = rows[i]
        if not r:
            continue
        r_str = " ".join([clean_str(c).lower() for c in r if c is not None])
        
        if particulars_idx == -1 and ('particulars' in r_str or 'party' in r_str or 'buyer' in r_str or 'customer' in r_str):
            particulars_idx = i
        if date_idx == -1 and ('date' in r_str or 'vch date' in r_str or 'bill date' in r_str):
            date_idx = i
        if opening_idx == -1 and 'opening' in r_str:
            opening_idx = i
        if debit_credit_idx == -1 and 'debit' in r_str and 'credit' in r_str:
            debit_credit_idx = i

    # Case A: Multi-level header (Group Summary) with Particulars + Debit + Credit
    if particulars_idx >= 0 and debit_credit_idx >= 0 and debit_credit_idx >= particulars_idx:
        header_start = min(particulars_idx, opening_idx if opening_idx >= 0 else particulars_idx)
        last_header_row = debit_credit_idx
        num_rows = last_header_row - header_start + 1
        
        max_cols = 0
        for i in range(header_start, last_header_row + 1):
            if i < len(rows):
                max_cols = max(max_cols, len(rows[i]))
        
        combined = []
        for c in range(max_cols):
            parts = []
            for i in range(header_start, last_header_row + 1):
                if i < len(rows) and c < len(rows[i]):
                    val = clean_str(rows[i][c])
                    if val and val.lower() not in ['none', '']:
                        parts.append(val)
            
            header_text = " ".join(parts).strip()
            header_text = re.sub(r'\s+', ' ', header_text)
            if not header_text:
                header_text = f"Column_{c + 1}"
            combined.append(header_text)
        
        return header_start, num_rows, combined

    # Case B: Standard Register header (Sales, Purchases, Receipts, Payments)
    target_idx = -1
    if date_idx >= 0 and particulars_idx >= 0:
        target_idx = min(date_idx, particulars_idx)
    elif date_idx >= 0:
        target_idx = date_idx
    elif particulars_idx >= 0:
        target_idx = particulars_idx
    else:
        # Fallback: scan row with highest concentration of header keywords
        keywords = ['date', 'particulars', 'party', 'voucher', 'vch', 'amount', 'qty', 'rate', 'gross', 'tax', 'debit', 'credit']
        best_score = -1
        target_idx = 0
        for i in range(scan_limit):
            r = rows[i]
            if not r:
                continue
            r_str = " ".join([clean_str(c).lower() for c in r if c is not None])
            score = sum(1 for kw in keywords if kw in r_str)
            if score > best_score:
                best_score = score
                target_idx = i

    row1 = rows[target_idx] if target_idx < len(rows) else []
    row2 = rows[target_idx + 1] if target_idx + 1 < len(rows) else None

    is_sub_header = False
    if row2:
        row2_str = " ".join([clean_str(c).lower() for c in row2 if c is not None])
        if 'debit' in row2_str or 'credit' in row2_str or 'rate' in row2_str or 'qty' in row2_str or 'cgst' in row2_str or 'sgst' in row2_str:
            is_sub_header = True

    combined = []
    last_parent = ""
    max_cols = max(len(row1), len(row2) if is_sub_header and row2 else 0)

    for c in range(max_cols):
        v1 = clean_str(row1[c]) if c < len(row1) else ""
        v2 = clean_str(row2[c]) if is_sub_header and row2 and c < len(row2) else ""

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
    return target_idx, num_header_rows, combined


def normalize_header(header):
    """Normalize a combined header to canonical names."""
    h = header.lower().strip()
    h = re.sub(r'[^a-z0-9 ]', '', h)
    h = re.sub(r'\s+', ' ', h).strip()

    if h in ['particulars', 'column 1', 'column1', 'party name', 'name of party', 'customer name', 'buyer', 'party']:
        return 'Particulars'
    
    if h in ['date', 'voucher date', 'vch date', 'bill date', 'invoice date', 'txn date']:
        return 'Date'

    if 'voucherno' in h or 'vchno' in h or 'invoiceno' in h or 'billno' in h:
        return 'Voucher No.'

    if 'vouchertype' in h or 'vchtype' in h:
        return 'Voucher Type'

    if 'gstin' in h or 'uin' in h:
        return 'GSTIN/UIN'

    if 'pan' in h:
        return 'PAN No.'

    if 'billedqty' in h or 'actualqty' in h or 'quantity' in h or h in ['qty', 'units', 'pcs', 'nos', 'kgs', 'bags', 'mtrs', 'mt']:
        return 'Quantity'

    if 'unit' in h or 'uom' in h or 'baseunit' in h:
        return 'Unit'

    if 'rate' in h or 'price' in h:
        return 'Rate'

    if 'debit' in h or h == 'dr':
        return 'Debit'
    if 'credit' in h or h == 'cr':
        return 'Credit'

    if 'opening' in h:
        return 'Opening Balance'
    if 'closing' in h:
        return 'Closing Balance'
    if h == 'balance':
        return 'Opening Balance'

    if 'grosstotal' in h or 'totalamount' in h or 'invoicevalue' in h or 'billamount' in h:
        return 'Gross Total'

    if 'taxable' in h or 'assessable' in h or h == 'value':
        return 'Value'

    if 'sales' in h or 'sale' in h:
        return 'Sale'
    if 'purchases' in h or 'purchase' in h:
        return 'Purchases'

    if 'igst' in h:
        return 'IGST'
    if 'cgst' in h:
        return 'CGST'
    if 'sgst' in h or 'utgst' in h:
        return 'SGST'
    if 'round' in h:
        return 'Round Off'

    return header


def parse_tally_excel(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    raw_sheets = read_excel_rows(file_path)
    parsed_sheets = []

    for sheet_name, rows in raw_sheets.items():
        if not rows:
            continue

        header_start, num_header_rows, combined_raw_headers = find_header_rows(rows)
        normalized_headers = [normalize_header(h) for h in combined_raw_headers]

        final_headers = []
        seen = {}
        for h in normalized_headers:
            if h in seen:
                if h == 'Opening Balance' and 'Closing Balance' not in seen:
                    h = 'Closing Balance'
                else:
                    h = f"{h}_{seen[h]}"
            seen[h] = seen.get(h, 0) + 1
            final_headers.append(h)

        data_start_idx = header_start + num_header_rows
        records = []
        grand_total = None

        # State trackers for voucher forward-filling
        last_date = ""
        last_voucher_no = ""
        last_party = ""

        for r_idx in range(data_start_idx, len(rows)):
            r = rows[r_idx]
            if not r:
                continue

            r_vals = [clean_str(c) for c in r if c is not None and clean_str(c) != '']
            if not r_vals:
                continue

            r_str = " ".join(r_vals).lower().strip()

            if 'grand total' in r_str or 'total vouchers' in r_str or r_str.startswith('total') or ' total ' in r_str:
                gt_record = {}
                for c_idx, h_name in enumerate(final_headers):
                    c_val = r[c_idx] if c_idx < len(r) else ""
                    gt_record[h_name] = c_val if c_val is not None else ""
                grand_total = gt_record
                continue

            first_val = r_vals[0].lower()
            if (
                'group summary' in r_str or
                'sundry creditors' in r_str or
                'sundry debtors' in r_str or
                'creditor for' in r_str or
                'debtor for' in r_str or
                'debtors of' in r_str or
                'creditors' == first_val.strip()
            ):
                continue

            record = {}
            has_data = False

            for c_idx, h_name in enumerate(final_headers):
                c_val = r[c_idx] if c_idx < len(r) else ""
                if isinstance(c_val, (datetime.date, datetime.datetime)):
                    c_val = c_val.strftime('%Y-%m-%d')
                if c_val is not None and clean_str(c_val) != "":
                    has_data = True
                record[h_name] = c_val if c_val is not None else ""

            if has_data:
                # Forward-fill Date and Voucher No for multi-item transactions
                curr_date = clean_str(record.get('Date', ''))
                curr_vch = clean_str(record.get('Voucher No.', ''))
                curr_party = clean_str(record.get('Particulars', ''))

                if curr_date:
                    last_date = curr_date
                elif last_date and not curr_date:
                    record['Date'] = last_date

                if curr_vch:
                    last_voucher_no = curr_vch
                elif last_voucher_no and not curr_vch:
                    record['Voucher No.'] = last_voucher_no

                if curr_party:
                    last_party = curr_party
                elif last_party and not curr_party:
                    record['Particulars'] = last_party

                records.append(record)

        if grand_total:
            for k, v in list(grand_total.items()):
                if isinstance(v, (datetime.date, datetime.datetime)):
                    grand_total[k] = v.strftime('%Y-%m-%d')

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
        print(json.dumps({"error": "Usage: python scripts/parse_tally_excel.py <excel_file_path> [output_json_path]"}))
        sys.exit(1)

    excel_file = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) >= 3 else None

    try:
        data = parse_tally_excel(excel_file)
        if out_file:
            with open(out_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, default=str)
        else:
            print(json.dumps(data, default=str))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
