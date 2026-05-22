import XLSX from 'xlsx';
import fs from 'fs';

const refPath = "2026.05.01~2026.05.01_(종료)크러쉬드페퍼(레드페퍼)_과세_유통이력신고 엑셀업로드.xlsx";
const fileBuffer = fs.readFileSync(refPath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['거래내역'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const refHeader1 = rows[0];
const refHeader2 = rows[1];

const ourHeader1 = [
  'entrpsTyNm', 'bsnmNo', 'vhcleNo', 'entrpsNm', 'zipNo', 'bassAdres',
  'rprsvNm', 'tlphonNo', 'rprsvMoblphonTelno', 'dlngYmd', 'dlngQyu',
  'dlngCoQy', 'dlngWt', 'note1', 'note2', 'resn'
];

const ourHeader2 = [
  '거래유형', '사업자등록번호(\'-\'제외)', '차량등록번호', '상호(성명)', '우편번호', '주소(판매장소)',
  '대표자', '전화번호(\'-\'제외)', '휴대폰번호(\'-\'제외)', '거래일자(\'-\'제외)', '1개당무게(kg)',
  '개수(개)', '총무게(kg)', '비고1', '비고2', '사유'
];

console.log("Header 1 Match:", JSON.stringify(refHeader1) === JSON.stringify(ourHeader1));
if (refHeader1.length !== ourHeader1.length) {
  console.log(`Length mismatch H1: Ref ${refHeader1.length}, Our ${ourHeader1.length}`);
}
refHeader1.forEach((val, idx) => {
  if (val !== ourHeader1[idx]) {
    console.log(`H1 Mismatch at ${idx}: Ref [${val}] vs Our [${ourHeader1[idx]}]`);
  }
});

console.log("Header 2 Match:", JSON.stringify(refHeader2) === JSON.stringify(ourHeader2));
if (refHeader2.length !== ourHeader2.length) {
  console.log(`Length mismatch H2: Ref ${refHeader2.length}, Our ${ourHeader2.length}`);
}
refHeader2.forEach((val, idx) => {
  if (val !== ourHeader2[idx]) {
    console.log(`H2 Mismatch at ${idx}: Ref [${val}] vs Our [${ourHeader2[idx]}]`);
  }
});
