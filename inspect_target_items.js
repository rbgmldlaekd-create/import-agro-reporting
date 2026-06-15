import XLSX from 'xlsx';
import fs from 'fs';

function inspectTargetItems(filePath) {
  console.log(`=== Inspecting Target Items: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Total rows: ${rows.length}`);
  rows.forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, row);
  });
}

inspectTargetItems("유통이력신고 대상품목 기준.xlsx");
