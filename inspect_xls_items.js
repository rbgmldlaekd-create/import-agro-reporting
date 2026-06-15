import XLSX from 'xlsx';
import fs from 'fs';

function inspectXlsItems(filePath) {
  console.log(`=== Unique Items in XLS: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const items = new Set();
  // Row 1 & 2 are headers
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[3]) {
      items.add(row[3]);
    }
  }
  console.log("Unique Items:", Array.from(items));
}

inspectXlsItems("선택양수내역 (3).xls");
