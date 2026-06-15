import XLSX from 'xlsx';
import fs from 'fs';

function inspectUploadExcel(filePath) {
  console.log(`=== Inspecting Upload Template: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows: ${rows.length}`);
  console.log(`Header row (row 1):`, rows[0]);
  if (rows.length > 1) console.log(`Row 2:`, rows[1]);
  if (rows.length > 2) console.log(`Row 3:`, rows[2]);
  if (rows.length > 3) console.log(`Row 4:`, rows[3]);
  if (rows.length > 4) console.log(`Row 5:`, rows[4]);
}

inspectUploadExcel("2026.05.01~2026.05.26_신김치(중국산)10kg_유통이력신고 엑셀업로드.xlsx");
