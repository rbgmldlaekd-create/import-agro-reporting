import React from 'react';
import Icon from './Icon';
import Button from './Button';

const TransferMatchingSection = ({
  shipmentCount,
  clientCount,
  transferFile,
  handleTransferUpload,
  transferLoading,
  transferData,
  transferMatchedData,
  downloadSingleTransferExcel,
  downloadAllTransferExcel,
  handleTransferDelete
}) => {
  const { matchedRecords, transferSummary } = transferMatchedData || { matchedRecords: [], transferSummary: [] };

  // 매칭 기초 조건 충족 여부
  const isBaseReady = shipmentCount > 0 && clientCount > 0;

  // 매칭 통계 계산
  const totalTargetQty = transferSummary.reduce((acc, curr) => acc + (curr.targetQty || 0), 0);
  const totalMatchedQty = transferSummary.reduce((acc, curr) => acc + (curr.matchedQty || 0), 0);
  const totalRemainingQty = Math.max(0, totalTargetQty - totalMatchedQty);
  
  const matchRate = totalTargetQty > 0 
    ? Number(((totalMatchedQty / totalTargetQty) * 100).toFixed(1)) 
    : 0;

  // 날짜 포맷 도우미 (YYYYMMDD -> YYYY-MM-DD)
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 안내 및 매칭 기초자료 점검 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            🔗 양수내역 및 출하내역 자동 매칭기
          </h2>
          <p className="text-xs text-slate-500">
            수입농산물 유통이력 포털의 양수내역에 맞추어 출하내역을 선입선출(FIFO) 방식으로 자동 매칭합니다.
          </p>
        </div>

        {/* 기초 파일 연동 현황 */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Icon name="database" className="w-3.5 h-3.5 text-indigo-500" />
            기초 데이터 현황:
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${shipmentCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            출하내역: {shipmentCount.toLocaleString()}건
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${clientCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            거래처정보: {clientCount.toLocaleString()}건
          </span>
        </div>
      </div>

      {/* 기초 데이터가 준비되지 않았을 때의 경고 안내 */}
      {!isBaseReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0">
            <Icon name="alert-triangle" className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-800">기초 데이터가 등록되지 않았습니다</h4>
            <p className="text-xs text-amber-600 mt-1 leading-relaxed">
              매칭 작업을 진행하려면 먼저 <b>[유통이력 변환기]</b> 탭에서 <b>STEP 1 (출하내역)</b> 및 <b>STEP 2 (거래처 기준정보)</b> 파일을 등록하시거나, <b>'데모 데이터 자동 채우기'</b> 버튼을 눌러 모의 데이터를 로드해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* 2. 양수내역 파일 업로드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 파일 업로드 카드 */}
        <div className={`bg-white border ${transferFile ? 'border-indigo-200 shadow-[0_0_12px_rgba(79,70,229,0.05)]' : 'border-slate-200'} rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden md:col-span-1`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">UPLOAD</span>
            {transferFile && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                연동 완료
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-slate-800 mb-1">양수내역 업로드</h3>
          <p className="text-[11px] text-slate-400 mb-4">포털에서 내려받은 양수내역 파일 (.xls)</p>

          <div className={`relative border-2 border-dashed ${!isBaseReady ? 'border-slate-100 bg-slate-50/20 cursor-not-allowed' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 cursor-pointer'} rounded-xl p-6 text-center transition-all`}>
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".xls, .xlsx"
              disabled={!isBaseReady}
              onChange={handleTransferUpload}
            />
            <Icon name="file-text" className={`w-8 h-8 ${!isBaseReady ? 'text-slate-300' : 'text-indigo-500'} mx-auto mb-2`} />
            <span className="block text-xs font-bold text-slate-600">
              {transferLoading ? '양수내역 분석 중...' : '파일 선택 또는 드래그'}
            </span>
            <span className="block text-[10px] text-slate-400 mt-1">'선택양수내역' 또는 '양수내역' 엑셀(.xls) 지원</span>
          </div>

          {transferFile && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0 mr-2">
                <span className="text-slate-600 font-bold truncate max-w-[120px]" title={transferFile.name}>
                  📄 {transferFile.name}
                </span>
                <button
                  type="button"
                  onClick={handleTransferDelete}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-0.5 hover:bg-slate-100 rounded"
                  title="파일 삭제"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-indigo-600 font-extrabold shrink-0">
                {transferData.length.toLocaleString()}행 파싱 완료
              </span>
            </div>
          )}
        </div>

        {/* 매칭 현황 대시보드 카드 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-1.5">
              📊 FIFO 실시간 매칭 통계
            </h3>
            
            {transferData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Icon name="bar-chart-2" className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">양수내역 파일을 업로드하시면 매칭 통계가 계산됩니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-center">
                  <div className="text-[10px] font-bold text-slate-400">총 신고 대상량</div>
                  <div className="text-lg font-black text-slate-800 mt-1">{totalTargetQty.toLocaleString()} kg</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{transferSummary.length}건의 신고 항목</div>
                </div>
                
                <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5 text-center">
                  <div className="text-[10px] font-bold text-indigo-500">매칭 완료량</div>
                  <div className="text-lg font-black text-indigo-700 mt-1">{totalMatchedQty.toLocaleString()} kg</div>
                  <div className="text-[9px] text-indigo-400 mt-0.5">FIFO 배분 완료</div>
                </div>

                <div className={`rounded-xl p-3.5 text-center border ${totalRemainingQty > 0 ? 'bg-amber-50/40 border-amber-150 text-amber-800' : 'bg-emerald-50/30 border-emerald-100 text-emerald-800'}`}>
                  <div className="text-[10px] font-bold">미달(대기) 수량</div>
                  <div className="text-lg font-black mt-1">{totalRemainingQty.toLocaleString()} kg</div>
                  <div className="text-[9px] mt-0.5">{totalRemainingQty > 0 ? '출하 물량 부족' : '매칭 성공 100%'}</div>
                </div>

                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-center flex flex-col justify-center items-center">
                  <div className="text-[10px] font-bold text-slate-400">매칭 성공률</div>
                  <div className="text-xl font-black text-indigo-600 mt-1">{matchRate}%</div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden max-w-[80px]">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${matchRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Icon name="info" className="w-3.5 h-3.5 text-slate-400" />
              Q열 거래일자보다 늦은 출하일자는 매칭에서 자동 제외됩니다.
            </span>
            <Button
              variant="indigo"
              size="sm"
              disabled={matchedRecords.length === 0}
              onClick={() => downloadAllTransferExcel(transferSummary)}
            >
              📥 전체 건 개별 다운로드
            </Button>
          </div>
        </div>

      </div>

      {/* 3. 매칭 결과 상세 테이블 */}
      {transferData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              📋 선택양수내역 매칭 상세 현황
            </h3>
            <span className="text-xs font-bold text-slate-400">
              총 {transferSummary.length}건
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-extrabold border-b border-slate-150">
                  <th className="py-3.5 px-4 w-[60px] text-center">행번호</th>
                  <th className="py-3.5 px-4 w-[120px]">거래일자(Q열)</th>
                  <th className="py-3.5 px-4 w-[160px]">수입신고번호/란</th>
                  <th className="py-3.5 px-4">품목명</th>
                  <th className="py-3.5 px-4 w-[110px] text-right">신고대상량(kg)</th>
                  <th className="py-3.5 px-4 w-[110px] text-right">매칭완료량(kg)</th>
                  <th className="py-3.5 px-4 w-[100px] text-center">상태</th>
                  <th className="py-3.5 px-4 w-[120px] text-center">출하 배분횟수</th>
                  <th className="py-3.5 px-4 w-[90px] text-center">다운로드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transferSummary.map((row) => {
                  const isUnder = row.matchedQty < row.targetQty;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">{row.originalRowIndex}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{formatDate(row.targetDate)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{row.declarationNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {row.itemName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-600">{row.targetQty.toLocaleString()} kg</td>
                      <td className={`py-3.5 px-4 text-right font-black ${isUnder ? 'text-amber-600' : 'text-indigo-600'}`}>
                        {row.matchedQty.toLocaleString()} kg
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isUnder ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold bg-amber-50 border border-amber-200 text-amber-700 text-[10px]">
                            ⚠️ 미달
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px]">
                            ✓ 완료
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                        {row.matchedDetails.length}회 분할매칭
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="indigo_light"
                          size="xs"
                          disabled={row.matchedQty === 0}
                          onClick={() => downloadSingleTransferExcel(row)}
                        >
                          💾 받기
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransferMatchingSection;
