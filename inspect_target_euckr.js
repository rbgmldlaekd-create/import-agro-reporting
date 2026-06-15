import fs from 'fs';

function inspectCsvEucKr(filePath) {
  console.log(`=== Inspecting CSV (EUC-KR): ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const decoder = new TextDecoder('euc-kr');
  const fileContent = decoder.decode(fileBuffer);
  const lines = fileContent.split("\n");
  console.log(`Total lines in CSV: ${lines.length}`);
  console.log("CSV Header & first 10 lines:");
  lines.slice(0, 11).forEach((line, idx) => {
    console.log(`Line ${idx + 1}: ${line}`);
  });
}

inspectCsvEucKr("2024.05.csv");
