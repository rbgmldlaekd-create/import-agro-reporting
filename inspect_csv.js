import XLSX from 'xlsx';
import fs from 'fs';

const fileContent = fs.readFileSync("2026.05~22.csv", "utf8");
console.log("CSV First 10 lines:");
console.log(fileContent.split("\n").slice(0, 10).join("\n"));

// Inspect for 롯데월드 or 10095 in CSV
console.log("\nSearching in CSV for 10095 or 롯데월드 or 21187:");
fileContent.split("\n").forEach((line, idx) => {
  if (line.includes("10095") || line.includes("롯데월드") || line.includes("21187") || line.includes("스쿨푸드")) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
