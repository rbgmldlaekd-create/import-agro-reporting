import XLSX from 'xlsx';
import fs from 'fs';

function inspectXls(filePath) {
  console.log(`=== Inspecting XLS: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows in XLS: ${rows.length}`);
  console.log(`Header row (row 1):`, rows[0]);
  console.log(`Row 2:`, rows[1]);
  console.log(`Row 3:`, rows[2]);
  console.log(`Row 4:`, rows[3]);
  if (rows.length > 5) {
    console.log(`Row 5:`, rows[4]);
  }
}

function inspectCsv(filePath) {
  console.log(`=== Inspecting CSV: ${filePath} ===`);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const lines = fileContent.split("\n");
  console.log(`Total lines in CSV: ${lines.length}`);
  console.log("CSV Header & first 5 lines:");
  lines.slice(0, 6).forEach((line, idx) => {
    console.log(`Line ${idx + 1}: ${line}`);
  });
}

inspectXls("선택양수내역 (3).xls");
console.log("\n-----------------------------------\n");
inspectCsv("2024.05.csv");
