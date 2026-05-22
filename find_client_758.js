import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("거래처 기준정보 엑셀.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

const match = rows.find(r => {
  const bsn = String(r["사업자등록번호('-'제외)"] || r["사업자등록번호"] || '');
  return bsn.includes('758-31') || bsn.includes('75831');
});

console.log("Match for 758-31 in database:", match);
