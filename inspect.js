import XLSX from 'xlsx';
import fs from 'fs';

function inspectExcel(filePath) {
  console.log(`=== Inspecting: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`Sheet Name: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log("First 3 rows:");
    rows.slice(0, 3).forEach((row, idx) => {
      console.log(`  Row ${idx + 1}:`, row);
    });
  });
}

inspectExcel("2026.05.02~2026.05.22_고추가루(고운,국5,중5)_유통이력신고 엑셀업로드.xlsx");
