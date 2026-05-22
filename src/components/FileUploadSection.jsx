import React from 'react';
import Icon from './Icon';

const FileUploadSection = ({
  shipmentFile,
  handleShipmentUpload,
  shipmentLoading,
  shipmentCount,
  clientInfoFile,
  handleClientUpload,
  clientLoading,
  clientCount,
  targetItemsFile,
  handleTargetUpload,
  targetLoading,
  targetCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Card 1: Shipment List Upload */}
      <div className={`bg-white border ${shipmentFile ? 'border-indigo-200 shadow-[0_0_12px_rgba(79,70,229,0.05)]' : 'border-slate-200'} rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">STEP 1</span>
          {shipmentFile && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              연동 완료
            </span>
          )}
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">출하내역 업로드</h3>
        <p className="text-[11px] text-slate-400 mb-4">ERP 출하내역 엑셀 파일 (.xlsx, .csv)</p>

        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 bg-slate-50/50 hover:bg-indigo-50/20 text-center transition-all cursor-pointer">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".xlsx, .xls, .csv"
            onChange={handleShipmentUpload}
          />
          <Icon name="file-spreadsheet" className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <span className="block text-xs font-bold text-slate-600">
            {shipmentLoading ? '데이터 분석 중...' : '파일 선택 또는 드래그'}
          </span>
          <span className="block text-[10px] text-slate-400 mt-1">xls, xlsx, csv 형식 지원</span>
        </div>

        {shipmentFile && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-bold truncate max-w-[170px]" title={shipmentFile.name}>
              📄 {shipmentFile.name}
            </span>
            <span className="text-indigo-600 font-extrabold shrink-0">
              {shipmentCount.toLocaleString()}행 파싱 완료
            </span>
          </div>
        )}
      </div>

      {/* Card 2: Client Base Info Upload */}
      <div className={`bg-white border ${clientInfoFile ? 'border-indigo-200 shadow-[0_0_12px_rgba(79,70,229,0.05)]' : 'border-slate-200'} rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">STEP 2</span>
          {clientInfoFile && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              연동 완료
            </span>
          )}
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">거래처 기준정보 업로드</h3>
        <p className="text-[11px] text-slate-400 mb-4">거래처 사업자 및 주소 맵핑용 (.xlsx)</p>

        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 bg-slate-50/50 hover:bg-indigo-50/20 text-center transition-all cursor-pointer">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".xlsx, .xls"
            onChange={handleClientUpload}
          />
          <Icon name="database" className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <span className="block text-xs font-bold text-slate-600">
            {clientLoading ? '데이터 분석 중...' : '파일 선택 또는 드래그'}
          </span>
          <span className="block text-[10px] text-slate-400 mt-1">xls, xlsx 형식 지원</span>
        </div>

        {clientInfoFile && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-bold truncate max-w-[170px]" title={clientInfoFile.name}>
              📄 {clientInfoFile.name}
            </span>
            <span className="text-indigo-600 font-extrabold shrink-0">
              {clientCount.toLocaleString()}행 파싱 완료
            </span>
          </div>
        )}
      </div>

      {/* Card 3: Target Items List Upload */}
      <div className={`bg-white border ${targetItemsFile ? 'border-indigo-200 shadow-[0_0_12px_rgba(79,70,229,0.05)]' : 'border-slate-200'} rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">STEP 3</span>
          {targetItemsFile && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              연동 완료
            </span>
          )}
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">대상품목 기준 업로드</h3>
        <p className="text-[11px] text-slate-400 mb-4">신고 대상 농산물 및 무게 DB (.xlsx)</p>

        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 bg-slate-50/50 hover:bg-indigo-50/20 text-center transition-all cursor-pointer">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".xlsx, .xls"
            onChange={handleTargetUpload}
          />
          <Icon name="layers" className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
          <span className="block text-xs font-bold text-slate-600">
            {targetLoading ? '데이터 분석 중...' : '파일 선택 또는 드래그'}
          </span>
          <span className="block text-[10px] text-slate-400 mt-1">xls, xlsx 형식 지원</span>
        </div>

        {targetItemsFile && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-bold truncate max-w-[170px]" title={targetItemsFile.name}>
              📄 {targetItemsFile.name}
            </span>
            <span className="text-indigo-600 font-extrabold shrink-0">
              {targetCount.toLocaleString()}개 품목 등록
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default FileUploadSection;
