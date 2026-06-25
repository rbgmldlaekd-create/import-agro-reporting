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
  
  // Handle string-represented Excel serial numbers (e.g. "45139.00060185")
  const numVal = Number(strVal);
  if (!isNaN(numVal) && numVal > 40000 && numVal < 60000) {
    const date = new Date((numVal - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }
  
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
 * Downloads shipment data as an HTML-based Excel file with yellow highlighted rows for completed declarations.
 */
export function downloadStyledShipmentExcel(shipmentData, completedShipmentIds) {
  if (!shipmentData || shipmentData.length === 0) {
    alert('다운로드할 출하내역 데이터가 존재하지 않습니다.');
    return;
  }

  // Get all unique keys in shipmentData using the exact order of the reference template
  const allKeys = [
    '주문번호', '주문항번', '주문일자', '출하일자', '주문진행상태', '출하거래처', '출하거래처명',
    '출하거래처약칭', '담당자', '품목', '품목명', '규격', '수주수량', '단가', '부가세',
    '확정금액', '확정부가세', '확정총금액', '원화금액', '부가세유형', '입력경로', '수주번호',
    '수주항번', '납기일', '수주단위', '비고', '확정수량', '회사', '공장', '담당호차',
    '담당호차명', 'CBM', '로케이션'
  ];

  // Helper function to define individual cell style (alignments, mso-number-format, completed yellow highlight)
  const getCellStyle = (key, isCompleted) => {
    const centerCols = ['주문일자', '출하일자', '납기일', '주문진행상태', '출하거래처', '품목', '주문항번', '수주항번', '수주단위', '회사', '공장', '담당호차', '로케이션'];
    const rightCols = ['수주수량', '단가', '부가세', '확정금액', '확정부가세', '확정총금액', '원화금액', '확정수량', 'CBM'];
    
    let align = 'left';
    let numFormat = 'mso-number-format:\'\\@\';'; // Treat as text to preserve leading zeros in codes
    
    if (centerCols.includes(key)) {
      align = 'center';
    } else if (rightCols.includes(key)) {
      align = 'right';
      numFormat = 'mso-number-format:\'\\#\\,\\#\\#0\';'; // Formatted numeric
    }
    
    const bgColor = isCompleted ? 'background-color: #FEF08A;' : '';
    
    // Inline borders, font family, size and padding to bypass Excel CSS parser limits
    const baseStyle = 'border: 1px solid #D9D9D9; padding: 5px; font-size: 9pt; font-family: \'굴림\', \'Gulim\', \'GulimChe\', sans-serif;';
    
    return {
      style: `style="${baseStyle} text-align: ${align}; ${numFormat} ${bgColor}"`,
      align: align
    };
  };

  // Generate HTML table compatible with Excel
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
  * {
    font-family: '굴림', 'Gulim', 'GulimChe', sans-serif !important;
  }
</style>
</head>
<body>
<table style="border-collapse: collapse;">
  <thead>
    <tr>
      ${allKeys.map(key => `<th style="background-color: rgb(150, 150, 150); color: #FFFFFF; font-weight: bold; border: 1px solid #7F7F7F; padding: 5px; font-size: 9pt; font-family: '굴림', 'Gulim', 'GulimChe', sans-serif; text-align: center;">${key}</th>`).join('')}
    </tr>
  </thead>
  <tbody>`;

  shipmentData.forEach(row => {
    const isCompleted = completedShipmentIds.has(row._id);
    
    html += `\n    <tr>`;
    allKeys.forEach(key => {
      const val = row[key] !== undefined && row[key] !== null ? row[key] : '';
      const cellStyle = getCellStyle(key, isCompleted);
      html += `<td align="${cellStyle.align}" ${cellStyle.style}>${val}</td>`;
    });
    html += `</tr>`;
  });

  html += `\n  </tbody>
</table>
</body>
</html>`;

  // Create download link
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Format filename: YYYY.MM.DD(요일) 작업완료 주문현황
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekDays[now.getDay()];
  const dateStr = `${yyyy}.${mm}.${dd}(${dayOfWeek})`;
  
  link.setAttribute('download', `${dateStr} 작업완료 주문현황.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
