import React from 'react';
import Button from './Button';
import Icon from './Icon';
import { downloadExcelForItem } from '../utils/excelProcessor';

const ResultDownloadSection = ({
  isUploadComplete,
  processedItemsSummary,
  reportingData,
  handleLoadDemo
}) => {
  const formatDateWithDots = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2 mb-5">
        <Icon name="download" className="w-4 h-4 text-indigo-500" /> 결과물 다운로드 구역 (관세청 신고 템플릿 출력)
      </h3>

      {!isUploadComplete ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400">
            <Icon name="play-circle" className="w-8 h-8 text-slate-300 animate-pulse" />
          </div>
          <h4 className="text-sm font-black text-slate-800">파일 결합 대기 중</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            상단의 3가지 기초 자료 엑셀 파일이 모두 업로드되어 결합되면, 이곳에 실시간 연산된 다운로드 카드들이 출력됩니다.
          </p>
          <Button
            variant="indigo_light"
            size="sm"
            onClick={handleLoadDemo}
          >
            💡 작동 예시 확인 (데모 데이터 로드)
          </Button>
        </div>
      ) : processedItemsSummary.length > 0 ? (
        <div className="space-y-6">
          {/* Successful calculation status card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <Icon name="check-circle" className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-emerald-800">데이터 통합 연산이 성공적으로 마쳤습니다!</h4>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                전체 거래 건수 중 관리 품목에 부합하는 출하 내역 <strong>{reportingData.length.toLocaleString()}건</strong>에 대해 거래처 정보 결합 및 일자별 수량/무게 최종 집계가 완료되었습니다. 아래 엑셀 파일을 다운로드해 주세요.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedItemsSummary.map((item) => (
              <div
                key={item.code}
                className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {item.code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      신고 대상 건수: <strong className="text-slate-700">{item.recordCount}건</strong>
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mb-3 truncate" title={item.name}>
                    {item.name}
                  </h4>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-500 font-bold mb-5">
                    <div className="flex justify-between">
                      <span>거래 기간:</span>
                      <span className="text-slate-700 font-extrabold">
                        {formatDateWithDots(item.minDate)} ~ {formatDateWithDots(item.maxDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>출하 합계수량:</span>
                      <span className="text-slate-700 font-extrabold">{item.totalQty.toLocaleString()} 개</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                      <span>최종 총중량:</span>
                      <span className="text-indigo-600 font-black">{item.totalWeight.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full font-black text-xs py-2 shadow-sm rounded-xl"
                  onClick={() => downloadExcelForItem(item.code, item.name, reportingData)}
                >
                  📥 유통이력신고 엑셀 다운로드
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 border border-slate-100 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
            <Icon name="alert-circle" className="w-6 h-6 text-amber-500" />
          </div>
          <h4 className="text-sm font-black text-slate-800">결합 일치 내역 없음</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            등록된 출하 내역에서 <strong>신고대상 품목</strong>(품목코드)과 대조 및 매칭되는 거래 기록을 발견하지 못했습니다. 상단의 대상품목 목록을 점검해 주세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultDownloadSection;
