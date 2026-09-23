"""
Test the parse_tally_excel.py script by creating a mock Tally-style Excel file
and verifying the parser handles the 3-level header structure correctly.
"""

import openpyxl
import json
import os
import sys
import tempfile

def create_test_tally_excel():
    """Create a mock Tally Creditors Group Summary Excel file."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Creditors Group Summary"
    
    # Row 1-3: Metadata (should be skipped)
    ws.append(["Acme Enterprise Pvt Ltd"])
    ws.append(["Group: Sundry Creditors"])
    ws.append(["1-Apr-2025 to 31-Mar-2026"])
    ws.append([])  # Blank row
    
    # Row 5-7: 3-level headers (this is the Tally format from the screenshot)
    ws.append(["Particulars", "", "", "", ""])            # Row 5
    ws.append(["", "Opening", "Transactions", "", "Closing"])  # Row 6
    ws.append(["", "Balance", "Debit", "Credit", "Balance"])   # Row 7
    
    # Data rows
    ws.append(["Shree Samartha Enterprises", "", "30000.00", "56640.00", "26640.00 Cr"])
    ws.append(["Shri Sai Industries", "1749671.73 Dr", "1513583.00", "167394.00", "3095860.73 Dr"])
    ws.append(["Cortex Container Services Llp", "1416.00 Cr", "1416.00", "", ""])
    ws.append(["Excel India", "", "2612782.00", "2400576.00", "212206.00 Dr"])
    ws.append(["Sundaram Stationery Mart", "9961.00 Cr", "6615.00", "10623.00", "13969.00 Cr"])
    ws.append(["M Enterprise", "77869.00 Cr", "50000.00", "36278.00", "64147.00 Cr"])
    ws.append(["Sunshine Printing Inks", "18269.00 Cr", "22744.00", "30203.00", "25728.00 Cr"])
    ws.append(["Supreme Engineering", "", "10000.00", "43247.00", "33247.00 Cr"])
    ws.append(["Sureka Industries", "", "2072935.00", "2072935.00", ""])
    ws.append(["Vapi Hydro Pneumatics", "1623.00 Cr", "", "", "1623.00 Cr"])
    ws.append(["V Trans, V Xpress & V Logis", "", "1524.00", "7130.00", "5606.00 Cr"])
    
    # Grand Total row
    ws.append(["Grand Total", "3140451.34 Cr", "32139484.77", "28176801.42", "822232.01 Dr"])
    
    # Save to temp file
    temp_path = os.path.join(tempfile.gettempdir(), "test_tally_creditors.xlsx")
    wb.save(temp_path)
    return temp_path


def main():
    # Create test file
    test_path = create_test_tally_excel()
    print(f"Test file created: {test_path}")
    
    # Import and run the parser
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from parse_tally_excel import parse_tally_excel
    
    result = parse_tally_excel(test_path)
    
    # Validate
    sheets = result['sheets']
    assert len(sheets) > 0, "No sheets parsed!"
    
    sheet = sheets[0]
    headers = sheet['headers']
    records = sheet['records']
    grand_total = sheet.get('grandTotal')
    
    print(f"\n=== PARSED HEADERS ===")
    print(json.dumps(headers, indent=2))
    
    print(f"\n=== TOTAL RECORDS: {len(records)} ===")
    for i, rec in enumerate(records[:3]):
        print(f"\nRecord {i}: {json.dumps(rec, indent=2, default=str)}")
    
    print(f"\n=== GRAND TOTAL ===")
    print(json.dumps(grand_total, indent=2, default=str))
    
    # Validate headers are correct
    expected = ['Particulars', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance']
    assert headers == expected, f"Headers mismatch!\nExpected: {expected}\nGot: {headers}"
    
    # Validate record count (should be 11 vendors, Grand Total excluded)
    assert len(records) == 11, f"Expected 11 records, got {len(records)}"
    
    # Validate Grand Total exists
    assert grand_total is not None, "Grand Total not extracted!"
    
    # Validate data values
    first = records[0]
    assert first.get('Particulars') == 'Shree Samartha Enterprises', f"First party wrong: {first.get('Particulars')}"
    
    second = records[1]
    assert str(second.get('Opening Balance')) == '1749671.73 Dr', f"Opening Balance wrong: {second.get('Opening Balance')}"
    
    print("\n[SUCCESS] ALL TESTS PASSED! Parser correctly handles 3-level Tally headers.")
    
    # Cleanup
    os.remove(test_path)


if __name__ == "__main__":
    main()
