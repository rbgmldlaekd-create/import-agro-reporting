import XLSX from 'xlsx';
import fs from 'fs';

function inspectExcel(filePath) {
  console.log(`=== Inspecting: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`Sheet Name: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows: ${rows.length}`);
    
    let anomalies = 0;
    for (let r = 2; r < rows.length; r++) {
      const cellRefJ = XLSX.utils.encode_cell({ r: r, c: 9 }); // Column J (dlngYmd)
      const cellJ = sheet[cellRefJ];
      if (!cellJ || cellJ.v === undefined || cellJ.v === null || cellJ.v === '') {
        console.log(`Row ${r + 1} (Excel row ${r + 1}) J is EMPTY/UNDEFINED!`);
        anomalies++;
      } else if (cellJ.t !== 'n' || isNaN(Number(cellJ.v))) {
        console.log(`Row ${r + 1} (Excel row ${r + 1}) J is NOT a number:`, cellJ);
        anomalies++;
      }
    }
    console.log(`Anomalies count in J: ${anomalies}`);
  });
}

inspectExcel("2026.05.01~2026.05.26_신김치(중국산)10kg_유통이력신고 엑셀업로드.xlsx");
