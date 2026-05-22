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
  
  // Extract minimum and maximum dates to set dynamic filename
  const dates = filteredData.map(d => d.dlngYmd);
  const sortedDates = [...dates].sort();
  const minDateStr = sortedDates[0];
  const maxDateStr = sortedDates[sortedDates.length - 1];
  
  const formatDateWithDots = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
  };
  
  const minDateFormatted = formatDateWithDots(minDateStr);
  const maxDateFormatted = formatDateWithDots(maxDateStr);
  
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
  
  // Map rows
  const dataRows = filteredData.map(row => [
    row.entrpsTyNm,
    row.bsnmNo,
    '', // vhcleNo
    row.entrpsNm,
    '', // zipNo
    row.bassAdres,
    '', // rprsvNm
    '', // tlphonNo
    '', // rprsvMoblphonTelno
    row.dlngYmd,
    '', // dlngQyu (1개당 무게 - 빈칸)
    '', // dlngCoQy (개수 - 빈칸)
    row.dlngWt,
    '', // note1
    '', // note2
    ''  // resn
  ]);
  
  const sheetData = [headerRow1, headerRow2, ...dataRows];
  
  // Write Workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, '유통이력신고');
  
  // Set filename
  const fileName = `${minDateFormatted}~${maxDateFormatted}_${itemName}_유통이력신고 엑셀업로드.xlsx`;
  
  // Trigger file download
  XLSX.writeFile(wb, fileName);
}
