import XLSX from 'xlsx';
import fs from 'fs';

const refPath = "2026.05.01~2026.05.01_(종료)크러쉬드페퍼(레드페퍼)_과세_유통이력신고 엑셀업로드.xlsx";
const fileBuffer = fs.readFileSync(refPath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['거래내역'];

console.log("=== Cell keys in Reference Sheet ===");
const keys = Object.keys(sheet).filter(k => !k.startsWith('!'));
console.log("Total Cell count:", keys.length);

console.log("\n=== Checking Row 1 (Header 1) ===");
for (let col = 0; col < 16; col++) {
  const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
  console.log(`Cell ${cellRef}:`, sheet[cellRef] ? { v: sheet[cellRef].v, t: sheet[cellRef].t } : "DOES NOT EXIST");
}

console.log("\n=== Checking Row 2 (Header 2) ===");
for (let col = 0; col < 16; col++) {
  const cellRef = XLSX.utils.encode_cell({ r: 1, c: col });
  console.log(`Cell ${cellRef}:`, sheet[cellRef] ? { v: sheet[cellRef].v, t: sheet[cellRef].t } : "DOES NOT EXIST");
}

console.log("\n=== Checking Row 3 (First Data Row) ===");
for (let col = 0; col < 16; col++) {
  const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
  console.log(`Cell ${cellRef}:`, sheet[cellRef] ? { v: sheet[cellRef].v, t: sheet[cellRef].t } : "DOES NOT EXIST");
}
