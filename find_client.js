import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("거래처 기준정보 엑셀.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

const match = rows.find(r => String(r['상호(성명)'] || '').includes('스쿨푸드 롯데월드점') || String(r['출하거래처명'] || '').includes('스쿨푸드'));
console.log("Match in Client database:", match);
