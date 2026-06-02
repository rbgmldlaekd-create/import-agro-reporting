import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("2026.05.01~2026.05.26_신김치(중국산)10kg_유통이력신고 엑셀업로드.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['거래내역'];

function logRow(r) {
  console.log(`\n=== Cells for Row ${r + 1} (Excel Row ${r + 1}) ===`);
  for (let c = 0; c < 16; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
    console.log(`Col ${c} (${cellRef}):`, sheet[cellRef] || "EMPTY");
  }
}

logRow(65); // Excel Row 66
logRow(66); // Excel Row 67
