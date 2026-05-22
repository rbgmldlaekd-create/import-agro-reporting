import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("거래처 기준정보 엑셀.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

const match = rows.find(r => {
  const name = String(r['상호(성명)'] || r['출하거래처명'] || '');
  return name.includes('롯데월드');
});

console.log("School Food Lotte World entry:", match);
