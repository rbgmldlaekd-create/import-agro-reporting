import XLSX from 'xlsx';
import fs from 'fs';

// Check the generated excel file in the workspace
const genPath = "2026.05.02~2026.05.22_고추가루(고운,국5,중5)_유통이력신고 엑셀업로드.xlsx";
const genBuffer = fs.readFileSync(genPath);
const genWb = XLSX.read(genBuffer, { type: 'buffer' });
const genSheet = genWb.Sheets[genWb.SheetNames[0]];
const genRows = XLSX.utils.sheet_to_json(genSheet, { header: 1 });

console.log("=== Generated File Row 3 ===");
console.log(genRows[2]);

// Check the shipment file
// We need to find the files matching 고추가루
console.log("=== Checking files in workspace ===");
const files = fs.readdirSync(".");
console.log("Files:", files);
