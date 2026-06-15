import * as XLSX from 'xlsx';

/**
 * Normalizes and cleans dates to 'YYYYMMDD' format.
 * Handles Date objects, Excel serial numbers, and formatted strings.
 */
export function formatExcelDate(val) {
  if (val === undefined || val === null) return '';
  
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  
  if (typeof val === 'number') {
    // Excel serial number format
    const date = new Date((val - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  
  const strVal = String(val).trim();
  
  // Try pattern matching for common formats: YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const match = strVal.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    const yyyy = match[1];
    const mm = match[2].padStart(2, '0');
    const dd = match[3].padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  
  // Clean all non-digits
  const cleaned = strVal.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Strips all non-digit characters from business registration numbers.
 */
export function formatBusinessNo(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/\D/g, '');
}

/**
 * Intelligently finds shipment quantity from common column header names.
 */
export function parseQuantity(row) {
  const keys = ['출하수량', '수량', '수주수량', '확정수량', '수량(개)', '개수', '출하량', '중량'];
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      const val = Number(String(row[key]).replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }
  }
  
  // Fallback: search key matching '수량' or '수주'
  for (const key in row) {
    if (key.includes('수량') || key.includes('수주') || key.includes('확정')) {
      const val = Number(String(row[key]).replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }
  }
  
  return 0;
}

/**
 * Normalizes item code.
 */
export function formatItemCode(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Parses files (CSV or Excel) to raw JSON data.
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
      // CSV decoding with EUC-KR to prevent Korean characters corruption
      reader.readAsText(file, 'EUC-KR');
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const workbook = XLSX.read(csvText, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    } else {
      // Excel files (xlsx, xls) binary loading
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    }
  });
}

/**
 * Parses files to a raw 2D array (Array of Arrays).
 */
export function parseFileAsAOA(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file, 'EUC-KR');
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const workbook = XLSX.read(csvText, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(rawData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    } else {
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(rawData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
    }
  });
}

/**
 * Combines shipment, client, and target item data.
 * Aggregates results by [Client + Date + Item Code]
 * Filters results to include only those matches that are in active target items.
 */
export function processReportingData({ shipmentList, clientInfoList, targetItemList }) {
  if (!shipmentList.length || !clientInfoList.length || !targetItemList.length) {
    return [];
  }
  
  // Index clients by '출하거래처' for rapid O(1) lookups
  const clientMap = new Map();
  clientInfoList.forEach(client => {
    const key = String(client['출하거래처'] || '').trim();
    if (key) {
      clientMap.set(key, client);
    }
  });
  
  // Index regulated target items by '품목코드'
  const targetItemMap = new Map();
  targetItemList.forEach(item => {
    const key = String(item.품목코드 || '').trim();
    if (key) {
      targetItemMap.set(key, item);
    }
  });

  // Group shipment records by [Business No + Date + Item Code]
  // Note: Aggregating by Business No is robust, but if a client doesn't exist, we fallback
  const grouped = {};
  
  shipmentList.forEach(row => {
    const rawItemCode = formatItemCode(row['품목']);
    
    // Check if this item is regulated/monitored
    if (!targetItemMap.has(rawItemCode)) {
      return; // Skip non-regulated item
    }
    
    const targetItem = targetItemMap.get(rawItemCode);
    const rawClientKey = String(row['출하거래처'] || '').trim();
    const clientRecord = clientMap.get(rawClientKey);
    
    if (!clientRecord) {
      // Skip shipment with missing client profile
      return;
    }
    
    const businessNo = formatBusinessNo(clientRecord["사업자등록번호('-'제외)"] || clientRecord["사업자등록번호"]);
    const rawDate = row['출하일자'] || row['배송일자'] || row['주문일자'];
    const cleanedDate = formatExcelDate(rawDate);
    
    if (!cleanedDate || !businessNo) {
      return; // Missing essential keys
    }
    
    const quantity = parseQuantity(row);
    
    // Grouping composite key
    const groupKey = `${businessNo}_${cleanedDate}_${rawItemCode}`;
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        entrpsTyNm: String(clientRecord['거래유형'] || '').trim(),
        bsnmNo: businessNo,
        entrpsNm: String(clientRecord['상호(성명)'] || clientRecord['상호'] || clientRecord['출하거래처명'] || '').trim(),
        bassAdres: String(clientRecord['주소(판매장소)'] || clientRecord['주소'] || '').trim(),
        dlngYmd: cleanedDate,
        itemCode: rawItemCode,
        itemName: targetItem.품목명,
        unitWeight: Number(targetItem.단위무게 || 0),
        totalQty: 0
      };
    }
    
    grouped[groupKey].totalQty += quantity;
  });
  
  // Calculate final total weights
  const results = Object.values(grouped).map(group => {
    const dlngWt = Number((group.totalQty * group.unitWeight).toFixed(3)); // weight in kg
    return {
      ...group,
      dlngWt
    };
  });
  
  return results;
}

/**
 * Creates and triggers the browser download for a dual-header Excel sheet.
 */
export function downloadExcelForItem(itemCode, itemName, reportingData) {
  const filteredData = reportingData.filter(d => d.itemCode === itemCode);
  
  if (!filteredData.length) {
    alert('해당 품목에 신고 가능한 거래 내역이 존재하지 않습니다.');
    return;
  }
  
  // Group filteredData by date (dlngYmd)
  const dateGroups = {};
  filteredData.forEach(d => {
    if (!dateGroups[d.dlngYmd]) {
      dateGroups[d.dlngYmd] = [];
    }
    dateGroups[d.dlngYmd].push(d);
  });
  
  const dates = Object.keys(dateGroups).sort();
  
  const formatDateWithDots = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
  };
  
  // Process and download each day as a separate Excel file
  dates.forEach(dateStr => {
    const dailyData = dateGroups[dateStr];
    const dateFormatted = formatDateWithDots(dateStr);
    
    // Compliant Headers
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
    
    // Map rows as sparse arrays to omit empty columns completely (matching reference XML structure cell-for-cell)
    const dataRows = dailyData.map(row => {
      const arr = [];
      arr[0] = row.entrpsTyNm;
      
      // bsnmNo를 문자열 타입으로 변환 ('-' 제외)
      arr[1] = row.bsnmNo ? String(row.bsnmNo).replace(/\D/g, '') : '';
      
      // arr[2] (vhcleNo) is omitted
      arr[3] = row.entrpsNm;
      // arr[4] (zipNo) is omitted
      arr[5] = row.bassAdres;
      // arr[6] (rprsvNm), arr[7] (tlphonNo), arr[8] (rprsvMoblphonTelno) are omitted
      
      // dlngYmd를 문자열 타입으로 변환
      arr[9] = row.dlngYmd ? String(row.dlngYmd).replace(/\D/g, '') : '';
      
      // arr[10] (dlngQyu), arr[11] (dlngCoQy) are omitted
      
      // dlngWt를 숫자 타입으로 변환
      arr[12] = row.dlngWt !== undefined && row.dlngWt !== null ? Number(row.dlngWt) : '';
      
      // arr[13] (note1), arr[14] (note2), arr[15] (resn) are omitted
      return arr;
    });
    
    const sheetData = [headerRow1, headerRow2, ...dataRows];
    
    // Write Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set explicit column widths to prevent Excel from visually truncating business numbers or headers
    ws['!cols'] = [
      { wch: 15 }, // entrpsTyNm / 거래유형
      { wch: 28 }, // bsnmNo / 사업자등록번호('-'제외)
      { wch: 15 }, // vhcleNo / 차량등록번호
      { wch: 30 }, // entrpsNm / 상호(성명)
      { wch: 12 }, // zipNo / 우편번호
      { wch: 50 }, // bassAdres / 주소(판매장소)
      { wch: 12 }, // rprsvNm / 대표자
      { wch: 20 }, // tlphonNo / 전화번호('-'제외)
      { wch: 20 }, // rprsvMoblphonTelno / 휴대폰번호('-'제외)
      { wch: 18 }, // dlngYmd / 거래일자('-'제외)
      { wch: 15 }, // dlngQyu / 1개당무게(kg)
      { wch: 12 }, // dlngCoQy / 개수(개)
      { wch: 15 }, // dlngWt / 총무게(kg)
      { wch: 15 }, // note1 / 비고1
      { wch: 15 }, // note2 / 비고2
      { wch: 15 }  // resn / 사유
    ];
  
    // Explicitly force business registration numbers and dates to be treated as strings ('s')
    // This prevents Excel from formatting large number sequences as scientific notation or trimming digits
    // Total weights (dlngWt) are treated as numbers ('n')
    for (let i = 2; i < sheetData.length; i++) {
      const cellRefB = XLSX.utils.encode_cell({ r: i, c: 1 }); // Column B (bsnmNo)
      if (!ws[cellRefB]) {
        ws[cellRefB] = { t: 's', v: '' };
      } else {
        ws[cellRefB].t = 's';
        ws[cellRefB].v = String(ws[cellRefB].v);
      }
      
      const cellRefJ = XLSX.utils.encode_cell({ r: i, c: 9 }); // Column J (dlngYmd)
      if (!ws[cellRefJ]) {
        ws[cellRefJ] = { t: 's', v: '' };
      } else {
        ws[cellRefJ].t = 's';
        ws[cellRefJ].v = String(ws[cellRefJ].v);
      }
  
      const cellRefM = XLSX.utils.encode_cell({ r: i, c: 12 }); // Column M (dlngWt)
      if (!ws[cellRefM]) {
        ws[cellRefM] = { t: 'n', v: '' };
      } else {
        ws[cellRefM].t = 'n';
        ws[cellRefM].v = ws[cellRefM].v !== '' ? Number(ws[cellRefM].v) : '';
      }
    }
  
    XLSX.utils.book_append_sheet(wb, ws, '거래내역');
    
    // Calculate total weight in kg for this day
    const totalWeight = dailyData.reduce((acc, curr) => acc + (curr.dlngWt || 0), 0);
    const totalWeightFormatted = Number(totalWeight.toFixed(3));
  
    // Set filename
    const fileName = `${dateFormatted}_${itemName}_${totalWeightFormatted.toLocaleString()}kg_유통이력신고 엑셀업로드.xlsx`;
    
    // Trigger file download
    XLSX.writeFile(wb, fileName);
  });
}
