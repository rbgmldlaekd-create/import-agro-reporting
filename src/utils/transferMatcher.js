import { formatExcelDate, formatBusinessNo, parseQuantity } from './excelProcessor.js';
import * as XLSX from 'xlsx';

// 품목명과 출하 품목코드 매핑 정보
export const ITEM_MAP = {
  '볶은 알땅콩(파쇄)': ['120751520'],
  '냉동고추(금탑)': ['120450343', '120450344'],
  '기타 냉동고추': ['250251466'],
  '냉동고추(익도홍)': ['120851542'],
  '꼭지와 씨를 제거한기타의 건고추': ['110350814'],
  '배추김치(포기김치': ['120951580'],
  '배추김치(포기김치)': ['120951580']
};

// 품목코드별 수량1당 무게(kg) 맵 (대상품목 기준 엑셀에서 넘어오지만 하드코딩 백업 지원)
const FALLBACK_WEIGHT_MAP = {
  '120751520': 1.0,
  '120450343': 0.5,
  '120450344': 0.5,
  '250251466': 0.34,
  '120851542': 0.2,
  '110350814': 1.0,
  '120951580': 10.0
};

/**
 * 2차원 배열 형태의 양수내역 데이터를 파싱하여 정규화된 객체 리스트로 변환합니다.
 */
export function parseTransferXls(rows) {
  if (rows.length < 3) return [];

  const row0 = rows[0] || [];
  const row1 = rows[1] || [];

  // 각 열별 결합된 헤더 이름 추출 및 공백 제거
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

  // 인덱스 맵핑 유틸 함수
  const findIndex = (keywords) => {
    return headers.findIndex(h => keywords.some(kw => h.includes(kw)));
  };

  // 1. 수입신고번호 및 란 위치 찾기
  const declCombinedIdx = findIndex(['수입신고번호/란']);
  const declIdx = findIndex(['수입신고번호']);
  const ranIdx = findIndex(['란']);

  // 2. 거래일련번호
  const serialIdx = findIndex(['거래일련번호']);

  // 3. 품목명
  const itemIdx = findIndex(['품목명']);

  // 4. 거래량 (잔량 -> 거래량 -> 양도물량 순서대로 탐색)
  let qtyIdx = findIndex(['잔량']);
  if (qtyIdx === -1) {
    qtyIdx = findIndex(['거래량']);
  }
  if (qtyIdx === -1) {
    qtyIdx = findIndex(['양도물량']);
  }

  // 5. 거래일자
  const dateIdx = findIndex(['거래일자']);

  // 6. 양도업체 업체명
  const supplierIdx = findIndex(['양도업체_업체명', '양도업체_상호(성명)']);

  const dataList = [];

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // 수입신고번호/란 문자열 생성
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

    let supplierName = '';
    if (supplierIdx !== -1) {
      supplierName = String(row[supplierIdx] || '').trim();
    } else {
      const fbIdx = headers.findIndex(h => h.includes('업체명') && !h.includes('양수업체'));
      if (fbIdx !== -1) {
        supplierName = String(row[fbIdx] || '').trim();
      }
    }

    // 필수 항목 미기입이나 공백인 행 스킵
    if (!declarationNo || !itemName || qtyVal === undefined || qtyVal === null || qtyVal === '') {
      continue;
    }

    const targetQty = Number(String(qtyVal).replace(/,/g, ''));
    if (isNaN(targetQty) || targetQty <= 0) continue;

    const targetDate = formatExcelDate(targetDateRaw);

    dataList.push({
      id: `transfer-row-${r}`,
      originalRowIndex: r + 1, // 1-based index for Excel
      declarationNo,
      serialNo,
      itemName,
      supplierName,
      targetQty,
      targetDate,
      matchedQty: 0,
      matchedDetails: []
    });
  }

  return dataList;
}

/**
 * 선입선출(FIFO) 규칙 및 일자 제약 조건(출하일자 <= 거래일자)을 활용해 양수내역과 출하내역을 매칭합니다.
 */
export function matchTransferWithShipments({
  transferList,
  shipmentList,
  clientInfoList,
  targetItemList
}) {
  if (!transferList.length || !shipmentList.length) {
    return { matchedRecords: [], transferSummary: [] };
  }

  // 1. 거래처 기준정보 맵 (O(1) 룩업용)
  const clientMap = new Map();
  clientInfoList.forEach(client => {
    const key = String(client['출하거래처'] || '').trim();
    if (key) {
      clientMap.set(key, client);
    }
  });

  // 2. 품목 기준정보 단위무게 맵
  const weightMap = new Map();
  targetItemList.forEach(item => {
    const code = String(item.품목코드 || '').trim();
    if (code) {
      weightMap.set(code, Number(item.단위무게) || FALLBACK_WEIGHT_MAP[code] || 1.0);
    }
  });

  // 3. 출하 데이터 전처리 및 품목별 리스트화
  const shipmentPool = {}; // { '품목코드': [ {출하일자, 수량, 총무게, 남은무게, 거래처정보...} ] }
  
  shipmentList.forEach(row => {
    // 주문번호가 없는 빈 행은 스킵
    if (!row['주문번호'] && !row['출하거래처'] && !row['품목']) return;

    const itemCode = String(row['품목'] || row['품목코드'] || row['코드'] || '').trim();
    if (!itemCode) return;

    const rawDate = row['출하일자'] || row['배송일자'] || row['주문일자'];
    const date = formatExcelDate(rawDate);
    if (!date) return;

    const qty = parseQuantity(row);
    if (qty <= 0) return;

    const unitWt = weightMap.has(itemCode) ? weightMap.get(itemCode) : (FALLBACK_WEIGHT_MAP[itemCode] || 1.0);
    const weightKg = Number((qty * unitWt).toFixed(3));

    const clientKey = String(row['출하거래처'] || '').trim();
    const clientRecord = clientMap.get(clientKey) || {
      '거래유형': '소매업체',
      '사업자등록번호': '0000000000',
      '상호(성명)': row['출하거래처명'] || '미확인거래처',
      '주소(판매장소)': '주소 정보 없음'
    };

    if (!shipmentPool[itemCode]) {
      shipmentPool[itemCode] = [];
    }

    shipmentPool[itemCode].push({
      id: `shipment-${Math.random().toString(36).substr(2, 9)}`,
      itemCode,
      date,
      qty,
      unitWt,
      weightKg,
      remWeightKg: weightKg,
      clientRecord
    });
  });

  // 출하 데이터 풀을 품목코드별로 날짜 오름차순(오래된 순) 정렬
  Object.keys(shipmentPool).forEach(code => {
    shipmentPool[code].sort((a, b) => a.date.localeCompare(b.date));
  });

  // 4. 양수내역 리스트 복제 및 날짜 정렬
  const sortedTransfers = [...transferList].map(t => ({
    ...t,
    matchedQty: 0,
    matchedDetails: []
  })).sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  // 5. FIFO 매칭 루프
  sortedTransfers.forEach(transfer => {
    const itemName = transfer.itemName;
    // 양수 품목명에 연계된 출하 품목코드 목록 구하기
    let matchedCodes = ITEM_MAP[itemName] || [];
    
    // 괄호 열린 형태 등으로 예외 매칭 보완
    if (matchedCodes.length === 0) {
      const foundKey = Object.keys(ITEM_MAP).find(k => itemName.startsWith(k) || k.startsWith(itemName));
      if (foundKey) {
        matchedCodes = ITEM_MAP[foundKey];
      }
    }

    if (matchedCodes.length === 0) {
      // 매칭 룰에 품목명이 정의되지 않은 경우 백업 코드로 품목명 그대로 코드가 있는지 검사
      matchedCodes = [itemName];
    }

    // 대상 품목코드들의 출하 내역들을 가져와서 날짜순 병합
    const availableShipments = [];
    matchedCodes.forEach(code => {
      if (shipmentPool[code]) {
        availableShipments.push(...shipmentPool[code]);
      }
    });

    // 여러 품목코드(예: 금탑 2개 코드)가 섞여있으므로 다시 일자 오름차순으로 정렬
    availableShipments.sort((a, b) => a.date.localeCompare(b.date));

    let remTarget = Number(transfer.targetQty.toFixed(3));

    for (const shipment of availableShipments) {
      if (remTarget <= 0) break;
      if (shipment.remWeightKg <= 0) continue;
      
      // 제약조건: 출하일자(shipment.date)가 양수 거래일자(transfer.targetDate)보다 크면(뒷날이면) 안됨
      if (shipment.date > transfer.targetDate) {
        continue; 
      }

      const take = Number(Math.min(shipment.remWeightKg, remTarget).toFixed(3));
      shipment.remWeightKg = Number((shipment.remWeightKg - take).toFixed(3));
      remTarget = Number((remTarget - take).toFixed(3));
      transfer.matchedQty = Number((transfer.matchedQty + take).toFixed(3));

      transfer.matchedDetails.push({
        shipmentId: shipment.id,
        date: shipment.date,
        matchedWt: take,
        clientRecord: shipment.clientRecord
      });
    }
  });

  // 6. 결과 레코드(신고용 엑셀 행 배열) 생성
  const matchedRecords = [];
  sortedTransfers.forEach(transfer => {
    transfer.matchedDetails.forEach(detail => {
      const client = detail.clientRecord;
      const bsn = client["사업자등록번호('-'제외)"] || client["사업자등록번호"] || '';
      const cleanBsn = String(bsn).replace(/\D/g, '');

      matchedRecords.push({
        entrpsTyNm: String(client['거래유형'] || '소매업체').trim(),
        bsnmNo: cleanBsn,
        entrpsNm: String(client['상호(성명)'] || client['상호'] || client['출하거래처명'] || '').trim(),
        bassAdres: String(client['주소(판매장소)'] || client['주소'] || '').trim(),
        dlngYmd: detail.date,
        dlngWt: detail.matchedWt,
        note1: `양수:${transfer.declarationNo} [번호:${transfer.serialNo}]`,
        note2: `품목:${transfer.itemName}`
      });
    });
  });

  return {
    matchedRecords,
    transferSummary: sortedTransfers
  };
}

/**
 * 매칭된 데이터를 유통이력신고 포맷 엑셀 파일로 다운로드합니다.
 */
export function downloadMatchedExcel(matchedRecords) {
  if (!matchedRecords || matchedRecords.length === 0) {
    alert('다운로드할 매칭 내역이 존재하지 않습니다.');
    return;
  }

  // 1. 영어 헤더
  const headerRow1 = [
    'entrpsTyNm', 'bsnmNo', 'vhcleNo', 'entrpsNm', 'zipNo', 'bassAdres',
    'rprsvNm', 'tlphonNo', 'rprsvMoblphonTelno', 'dlngYmd', 'dlngQyu',
    'dlngCoQy', 'dlngWt', 'note1', 'note2', 'resn'
  ];
  
  // 2. 한글 설명 헤더
  const headerRow2 = [
    '거래유형', '사업자등록번호(\'-\'제외)', '차량등록번호', '상호(성명)', '우편번호', '주소(판매장소)',
    '대표자', '전화번호(\'-\'제외)', '휴대폰번호(\'-\'제외)', '거래일자(\'-\'제외)', '1개당무게(kg)',
    '개수(개)', '총무게(kg)', '비고1', '비고2', '사유'
  ];

  // 3. 데이터 매핑
  const dataRows = matchedRecords.map(row => {
    const arr = [];
    arr[0] = row.entrpsTyNm;
    
    // 사업자등록번호 포맷팅 (예: 123-45-67890)
    const bsn = row.bsnmNo;
    let formattedBsn = bsn;
    if (bsn) {
      const cleanBsn = bsn.replace(/\D/g, '');
      if (cleanBsn.length === 10) {
        formattedBsn = `${cleanBsn.substring(0, 3)}-${cleanBsn.substring(3, 5)}-${cleanBsn.substring(5, 10)}`;
      }
    }
    arr[1] = formattedBsn;
    
    // arr[2] (vhcleNo) 생략
    arr[3] = row.entrpsNm;
    // arr[4] (zipNo) 생략
    arr[5] = row.bassAdres;
    // arr[6] (rprsvNm), arr[7] (tlphonNo), arr[8] (rprsvMoblphonTelno) 생략
    
    // 거래일자 포맷 (E.g. 20240503)
    arr[9] = row.dlngYmd ? String(row.dlngYmd).replace(/\D/g, '') : '';
    
    // arr[10] (dlngQyu), arr[11] (dlngCoQy) 생략
    
    // 총무게(dlngWt) -> 숫자 타입
    arr[12] = row.dlngWt !== undefined && row.dlngWt !== null ? Number(row.dlngWt) : '';
    
    arr[13] = row.note1 || '';
    arr[14] = row.note2 || '';
    // arr[15] (resn) 생략
    return arr;
  });

  const sheetData = [headerRow1, headerRow2, ...dataRows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 15 }, // entrpsTyNm / 거래유형
    { wch: 28 }, // bsnmNo / 사업자등록번호('-'제외)
    { wch: 15 }, // vhcleNo / 차량등록번호
    { wch: 35 }, // entrpsNm / 상호(성명)
    { wch: 12 }, // zipNo / 우편번호
    { wch: 50 }, // bassAdres / 주소(판매장소)
    { wch: 12 }, // rprsvNm / 대표자
    { wch: 20 }, // tlphonNo / 전화번호('-'제외)
    { wch: 20 }, // rprsvMoblphonTelno / 휴대폰번호('-'제외)
    { wch: 18 }, // dlngYmd / 거래일자('-'제외)
    { wch: 15 }, // dlngQyu / 1개당무게(kg)
    { wch: 12 }, // dlngCoQy / 개수(개)
    { wch: 15 }, // dlngWt / 총무게(kg)
    { wch: 25 }, // note1 / 비고1
    { wch: 25 }, // note2 / 비고2
    { wch: 15 }  // resn / 사유
  ];

  // 셀 타입 강제 지정
  for (let i = 2; i < sheetData.length; i++) {
    const cellRefB = XLSX.utils.encode_cell({ r: i, c: 1 }); // bsnmNo (String)
    if (!ws[cellRefB]) {
      ws[cellRefB] = { t: 's', v: '' };
    } else {
      ws[cellRefB].t = 's';
      ws[cellRefB].v = String(ws[cellRefB].v);
    }
    
    const cellRefJ = XLSX.utils.encode_cell({ r: i, c: 9 }); // dlngYmd (String)
    if (!ws[cellRefJ]) {
      ws[cellRefJ] = { t: 's', v: '' };
    } else {
      ws[cellRefJ].t = 's';
      ws[cellRefJ].v = String(ws[cellRefJ].v);
    }

    const cellRefM = XLSX.utils.encode_cell({ r: i, c: 12 }); // dlngWt (Number)
    if (!ws[cellRefM]) {
      ws[cellRefM] = { t: 'n', v: '' };
    } else {
      ws[cellRefM].t = 'n';
      ws[cellRefM].v = ws[cellRefM].v !== '' ? Number(ws[cellRefM].v) : '';
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '거래내역');
  XLSX.writeFile(wb, '양수내역_매칭완료_유통이력신고 엑셀업로드.xlsx');
}

/**
 * 단일 양수내역 건에 대해 매칭된 출하 데이터를 개별 엑셀 파일로 저장합니다.
 */
export function downloadSingleTransferExcel(transfer) {
  if (!transfer.matchedDetails || transfer.matchedDetails.length === 0) {
    alert('매칭된 출하 내역이 없어 엑셀을 생성할 수 없습니다.');
    return;
  }

  // 1. 영어 헤더
  const headerRow1 = [
    'entrpsTyNm', 'bsnmNo', 'vhcleNo', 'entrpsNm', 'zipNo', 'bassAdres',
    'rprsvNm', 'tlphonNo', 'rprsvMoblphonTelno', 'dlngYmd', 'dlngQyu',
    'dlngCoQy', 'dlngWt', 'note1', 'note2', 'resn'
  ];
  
  // 2. 한글 설명 헤더
  const headerRow2 = [
    '거래유형', '사업자등록번호(\'-\'제외)', '차량등록번호', '상호(성명)', '우편번호', '주소(판매장소)',
    '대표자', '전화번호(\'-\'제외)', '휴대폰번호(\'-\'제외)', '거래일자(\'-\'제외)', '1개당무게(kg)',
    '개수(개)', '총무게(kg)', '비고1', '비고2', '사유'
  ];

  // 3. 데이터 매핑
  const dataRows = transfer.matchedDetails.map(detail => {
    const arr = [];
    const client = detail.clientRecord;
    arr[0] = String(client['거래유형'] || '소매업체').trim();
    
    // 사업자등록번호 포맷팅 (예: 123-45-67890)
    const bsn = client["사업자등록번호('-'제외)"] || client["사업자등록번호"] || '';
    const cleanBsn = String(bsn).replace(/\D/g, '');
    let formattedBsn = cleanBsn;
    if (cleanBsn.length === 10) {
      formattedBsn = `${cleanBsn.substring(0, 3)}-${cleanBsn.substring(3, 5)}-${cleanBsn.substring(5, 10)}`;
    }
    arr[1] = formattedBsn;
    
    arr[3] = String(client['상호(성명)'] || client['상호'] || client['출하거래처명'] || '').trim();
    arr[5] = String(client['주소(판매장소)'] || client['주소'] || '').trim();
    
    // 거래일자 포맷 (YYYYMMDD)
    arr[9] = detail.date ? String(detail.date).replace(/\D/g, '') : '';
    
    // 총무게(dlngWt) -> 숫자 타입
    arr[12] = detail.matchedWt !== undefined && detail.matchedWt !== null ? Number(detail.matchedWt) : '';
    
    arr[13] = `양수:${transfer.declarationNo} [번호:${transfer.serialNo}]`;
    arr[14] = `품목:${transfer.itemName}`;
    return arr;
  });

  const sheetData = [headerRow1, headerRow2, ...dataRows];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 컬럼 너비 설정
  ws['!cols'] = [
    { wch: 15 }, // entrpsTyNm / 거래유형
    { wch: 28 }, // bsnmNo / 사업자등록번호('-'제외)
    { wch: 15 }, // vhcleNo / 차량등록번호
    { wch: 35 }, // entrpsNm / 상호(성명)
    { wch: 12 }, // zipNo / 우편번호
    { wch: 50 }, // bassAdres / 주소(판매장소)
    { wch: 12 }, // rprsvNm / 대표자
    { wch: 20 }, // tlphonNo / 전화번호('-'제외)
    { wch: 20 }, // rprsvMoblphonTelno / 휴대폰번호('-'제외)
    { wch: 18 }, // dlngYmd / 거래일자('-'제외)
    { wch: 15 }, // dlngQyu / 1개당무게(kg)
    { wch: 12 }, // dlngCoQy / 개수(개)
    { wch: 15 }, // dlngWt / 총무게(kg)
    { wch: 25 }, // note1 / 비고1
    { wch: 25 }, // note2 / 비고2
    { wch: 15 }  // resn / 사유
  ];

  // 셀 타입 강제 지정
  for (let i = 2; i < sheetData.length; i++) {
    const cellRefB = XLSX.utils.encode_cell({ r: i, c: 1 });
    if (!ws[cellRefB]) {
      ws[cellRefB] = { t: 's', v: '' };
    } else {
      ws[cellRefB].t = 's';
      ws[cellRefB].v = String(ws[cellRefB].v);
    }
    
    const cellRefJ = XLSX.utils.encode_cell({ r: i, c: 9 });
    if (!ws[cellRefJ]) {
      ws[cellRefJ] = { t: 's', v: '' };
    } else {
      ws[cellRefJ].t = 's';
      ws[cellRefJ].v = String(ws[cellRefJ].v);
    }

    const cellRefM = XLSX.utils.encode_cell({ r: i, c: 12 });
    if (!ws[cellRefM]) {
      ws[cellRefM] = { t: 'n', v: '' };
    } else {
      ws[cellRefM].t = 'n';
      ws[cellRefM].v = ws[cellRefM].v !== '' ? Number(ws[cellRefM].v) : '';
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, '거래내역');
  
  // 파일명 포맷: [품목명]_[양도업체명]_거래량:[거래량]kg.xlsx
  const supplierNameClean = String(transfer.supplierName || '미확인양도처').replace(/[\/\\:\*\?"<>\|]/g, '');
  const itemNameClean = String(transfer.itemName).replace(/[\/\\:\*\?"<>\|]/g, '');
  const fileName = `${itemNameClean}_${supplierNameClean}_거래량:${transfer.targetQty}kg.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * 모든 매칭 완료 건들을 각각 개별 파일로 순차 다운로드합니다.
 */
export async function downloadAllTransferExcel(transferSummary) {
  const matchedList = transferSummary.filter(t => t.matchedQty > 0);
  if (matchedList.length === 0) {
    alert('다운로드할 매칭 내역이 존재하지 않습니다.');
    return;
  }

  if (matchedList.length > 15) {
    const isConfirm = window.confirm(`총 ${matchedList.length}개의 개별 엑셀 파일이 연속 다운로드됩니다. 브라우저의 다중 파일 다운로드 권한을 허용해 주셔야 합니다. 진행하시겠습니까?`);
    if (!isConfirm) return;
  }

  // 지연(Delay)을 주어 브라우저 다중 파일 다운로드 차단 경고를 예방
  for (let i = 0; i < matchedList.length; i++) {
    const transfer = matchedList[i];
    downloadSingleTransferExcel(transfer);
    await new Promise(resolve => setTimeout(resolve, 400));
  }
}

