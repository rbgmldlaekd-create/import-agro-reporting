import XLSX from 'xlsx';
import fs from 'fs';

const fileBuffer = fs.readFileSync("거래처 기준정보 엑셀.xlsx");
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet);

const matches = rows.filter(r => {
  const name = String(r['상호(성명)'] || r['출하거래처명'] || '');
  const bsn = String(r["사업자등록번호('-'제외)"] || r["사업자등록번호"] || '');
  return name.includes('롯데월드') || bsn.includes('21187') || bsn.includes('211-87');
});

console.log("Matches found:", matches);
