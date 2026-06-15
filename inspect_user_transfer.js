import XLSX from 'xlsx';
import fs from 'fs';
import { formatExcelDate } from './src/utils/excelProcessor.js';

function parseTransferXls(rows) {
  if (rows.length < 3) return [];

  const row0 = rows[0] || [];
  const row1 = rows[1] || [];

  const headers = [];
  const numCols = Math.max(row0.length, row1.length);
  for (let c = 0; c < numCols; c++) {
    const h1 = String(row0[c] || '').trim().replace(/\s+/g, '');
    const h2 = String(row1[c] || '').trim().replace(/\s+/g, '');
    
    let combined = '';
    if (h1 && h2) {
      combined = `${h1}_${h2}`;
    } else if (h1) {
      combined = h1;
    } else if (h2) {
      combined = h2;
    }
    headers.push(combined);
  }

  const findIndex = (keywords) => {
    return headers.findIndex(h => keywords.some(kw => h.includes(kw)));
  };

  const declCombinedIdx = findIndex(['수입신고번호/란']);
  const declIdx = findIndex(['수입신고번호']);
  const ranIdx = findIndex(['란']);
  const serialIdx = findIndex(['거래일련번호']);
  const itemIdx = findIndex(['품목명']);

  let qtyIdx = findIndex(['잔량']);
  if (qtyIdx === -1) {
    qtyIdx = findIndex(['거래량']);
  }
  if (qtyIdx === -1) {
    qtyIdx = findIndex(['양도물량']);
  }

  const dateIdx = findIndex(['거래일자']);

  console.log("Resolved indices:", { declCombinedIdx, declIdx, ranIdx, serialIdx, itemIdx, qtyIdx, dateIdx });

  const dataList = [];

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let declarationNo = '';
    let serialNo = '';
    if (declCombinedIdx !== -1) {
      declarationNo = String(row[declCombinedIdx] || '').trim();
    } else if (declIdx !== -1) {
      const declVal = String(row[declIdx] || '').trim();
      const ranVal = ranIdx !== -1 ? String(row[ranIdx] || '').trim() : '';
      if (declVal) {
        declarationNo = ranVal ? `${declVal}/${ranVal}` : declVal;
      }
    }

    if (serialIdx !== -1) {
      serialNo = String(row[serialIdx] || '').trim();
    }

    let itemName = '';
    if (itemIdx !== -1) {
      itemName = String(row[itemIdx] || '').trim();
    }

    let qtyVal = '';
    if (qtyIdx !== -1) {
      qtyVal = row[qtyIdx];
    }

    let targetDateRaw = '';
    if (dateIdx !== -1) {
      targetDateRaw = row[dateIdx];
    }

    if (!declarationNo || !itemName || qtyVal === undefined || qtyVal === null || qtyVal === '') {
      continue;
    }

    const targetQty = Number(String(qtyVal).replace(/,/g, ''));
    if (isNaN(targetQty) || targetQty <= 0) continue;

    const targetDate = formatExcelDate(targetDateRaw);

    dataList.push({
      id: `transfer-row-${r}`,
      originalRowIndex: r + 1,
      declarationNo,
      serialNo,
      itemName,
      targetQty,
      targetDate,
      matchedQty: 0,
      matchedDetails: []
    });
  }

  return dataList;
}

function testParsing(filePath) {
  console.log(`\n=== Testing Parse on: ${filePath} ===`);
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const parsed = parseTransferXls(rows);
  console.log(`Parsed count: ${parsed.length}`);
  if (parsed.length > 0) {
    console.log("Sample parsed row 1:", parsed[0]);
    console.log("Sample parsed row 2:", parsed[1]);
  }
}

testParsing("선택양수내역 (3).xls");
testParsing("양수내역 (2).xls");
