import XLSX from 'xlsx';
import fs from 'fs';
import { processReportingData } from './src/utils/excelProcessor.js';

function loadFileJson(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

console.log("=== Loading Workspace Database Files ===");
const clientList = loadFileJson("거래처 기준정보 엑셀.xlsx");
const targetList = loadFileJson("유통이력신고 대상품목 기준.xlsx").map((row, idx) => ({
  id: `xls-${idx}`,
  품목코드: String(row['품목'] || row['품목코드'] || row['코드'] || '').trim(),
  품목명: String(row['품목명'] || row['품목'] || row['상품명'] || '').trim(),
  단위무게: Number(row['수량1당 무게(kg)'] || row['수량1당무게(kg)'] || row['1개당무게(kg)'] || 0)
})).filter(item => item.품목코드 && item.품목명);

// Load shipment CSV using buffer and codepage 949
const csvBuffer = fs.readFileSync("2026.05~22.csv");
const csvWorkbook = XLSX.read(csvBuffer, { type: 'buffer', codepage: 949 });
const csvSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
const shipmentList = XLSX.utils.sheet_to_json(csvSheet, { defval: '' });

console.log(`Loaded ${shipmentList.length} shipments, ${clientList.length} clients, ${targetList.length} target items.`);
console.log("Shipment columns (Corrected):", Object.keys(shipmentList[0] || {}));

// Run processor
console.log("\n=== Running processReportingData ===");
const reportingData = processReportingData({
  shipmentList,
  clientInfoList: clientList,
  targetItemList: targetList
});

console.log(`Processed reporting data count: ${reportingData.length}`);
if (reportingData.length > 0) {
  console.log("Sample processed row 1:", reportingData[0]);
}

// Emulate downloadExcelForItem and write to disk
const filteredData = reportingData.filter(d => d.itemCode === '120450344'); // 고추가루
console.log(`Filtered target item data count: ${filteredData.length}`);

if (filteredData.length > 0) {
  const headerRow1 = [
    'entrpsTyNm', 'bsnmNo', 'vhcleNo', 'entrpsNm', 'zipNo', 'bassAdres',
    'rprsvNm', 'tlphonNo', 'rprsvMoblphonTelno', 'dlngYmd', 'dlngQyu',
    'dlngCoQy', 'dlngWt', 'note1', 'note2', 'resn'
  ];
  
  const headerRow2 = [
    '거래유형', '사업자등록번호(\'-\'제외)', '차량등록번호', '상호(성명)', '우편번호', '주소(판매장소)',
    '대표자', '전화번호(\'-\'제외)', '휴대폰번호(\'-\'제외)', '거래일자(\'-\'제외)', '1개당무게(kg)',
    '개수(개)', '총무게(kg)', '비고1', '비고2', '사유'
  ];

  const dataRows = filteredData.map(row => {
    const arr = [];
    arr[0] = row.entrpsTyNm;
    
    const bsn = row.bsnmNo;
    let formattedBsn = bsn;
    if (bsn) {
      const cleanBsn = bsn.replace(/\D/g, '');
      if (cleanBsn.length === 10) {
        formattedBsn = `${cleanBsn.substring(0, 3)}-${cleanBsn.substring(3, 5)}-${cleanBsn.substring(5, 10)}`;
      }
    }
    arr[1] = formattedBsn;
    arr[3] = row.entrpsNm;
    arr[5] = row.bassAdres;
    arr[9] = row.dlngYmd;
    arr[12] = String(row.dlngWt);
    return arr;
  });

  const sheetData = [headerRow1, headerRow2, ...dataRows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 15 }, { wch: 28 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 50 },
    { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];

  for (let i = 2; i < sheetData.length; i++) {
    const cellRefB = XLSX.utils.encode_cell({ r: i, c: 1 });
    if (ws[cellRefB]) ws[cellRefB].t = 's';
    
    const cellRefJ = XLSX.utils.encode_cell({ r: i, c: 9 });
    if (ws[cellRefJ]) ws[cellRefJ].t = 's';
  }

  XLSX.utils.book_append_sheet(wb, ws, '거래내역');
  
  const testOutPath = "test_generated_output.xlsx";
  XLSX.writeFile(wb, testOutPath);
  console.log(`\nWritten test generated file to: ${testOutPath}`);

  // Now, inspect the generated file
  const readBuffer = fs.readFileSync(testOutPath);
  const readWb = XLSX.read(readBuffer, { type: 'buffer' });
  const readSheet = readWb.Sheets['거래내역'];
  
  console.log("\n=== Inspecting Generated Row 3 ===");
  for (let col = 0; col < 16; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: col });
    console.log(`Cell ${cellRef}:`, readSheet[cellRef] ? { v: readSheet[cellRef].v, t: readSheet[cellRef].t } : "DOES NOT EXIST");
  }
}
