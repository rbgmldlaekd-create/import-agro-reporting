import React from 'react';
import Icon from './Icon';

const HelpSection = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-4xl">
      <h2 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">
        📖 수입농산물 유통이력신고 자동화 툴 가이드
      </h2>

      <div className="space-y-6 text-xs text-slate-600 leading-relaxed font-bold">
        <div>
          <h3 className="text-slate-800 font-black text-sm mb-2">1. 연산 개요</h3>
          <p>
            본 시스템은 <strong>ERP 원본 출하 내역</strong>과 <strong>거래처 사업자 정보</strong>, <strong>신고대상 품목 정보</strong>를 기초 데이터로 등록하고, 이를 활용하여 <strong>양수내역 매칭기</strong>에서 양수내역과 출하내역을 매칭하고 검증할 수 있도록 지원합니다.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-slate-800 font-black text-sm mb-2">2. 업로드 엑셀 파일 컬럼 정의</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <h4 className="text-indigo-600 font-black mb-1.5">① 출하내역 엑셀</h4>
              <p className="text-[10px] text-slate-400 mb-2">필수 데이터 컬럼명</p>
              <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-500">
                <li>출하일자 (또는 일자)</li>
                <li>출하거래처 (코드)</li>
                <li>품목 (품목코드)</li>
                <li>출하수량</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <h4 className="text-indigo-600 font-black mb-1.5">② 거래처 기준정보</h4>
              <p className="text-[10px] text-slate-400 mb-2">필수 데이터 컬럼명</p>
              <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-500">
                <li>출하거래처 (코드)</li>
                <li>출하거래처명</li>
                <li>거래유형 (소매,도매 등)</li>
                <li>사업자등록번호('-'제외)</li>
                <li>상호(성명)</li>
                <li>주소(판매장소)</li>
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <h4 className="text-indigo-600 font-black mb-1.5">③ 대상품목 기준</h4>
              <p className="text-[10px] text-slate-400 mb-2">필수 데이터 컬럼명</p>
              <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-500">
                <li>품목 또는 품목코드</li>
                <li>품목명</li>
                <li>수량1당 무게(kg)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-slate-800 font-black text-sm mb-2">3. 데이터 매칭 프로세스</h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-500 pl-1">
            <li>기초 데이터 업로드 탭에서 3가지 기초 자료(출하내역, 거래처 기준정보, 대상품목 기준) 엑셀 파일을 업로드합니다.</li>
            <li>양수내역 매칭기 탭에서 매칭할 양수내역 엑셀 파일을 업로드합니다.</li>
            <li>양수내역의 거래처 정보 및 품목코드를 기준으로 출하내역과 매칭을 진행하고 결과를 검토합니다.</li>
            <li>매칭 완료된 결과를 건별로 엑셀 다운로드하거나, 한 번에 다운로드합니다.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default HelpSection;
