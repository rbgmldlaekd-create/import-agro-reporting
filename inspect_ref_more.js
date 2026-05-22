import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("2026.05.01~2026.05.01_(종료)크러쉬드페퍼(레드페퍼)_과세_유통이력신고 엑셀업로드.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['거래내역'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Reference file rows (first 10):");
rows.slice(0, 10).forEach((row, idx) => {
  console.log(`Row ${idx + 1}:`, row);
});
