import React from 'react';
import Button from './Button';
import Icon from './Icon';

const TargetItemSection = ({
  shipmentData,
  activeTargetItems,
  baseTargetItems,
  customCode,
  setCustomCode,
  customName,
  setCustomName,
  customWeight,
  setCustomWeight,
  shipmentSearchQuery,
  setShipmentSearchQuery,
  isShipmentDropdownOpen,
  setIsShipmentDropdownOpen,
  searchQuery,
  setSearchQuery,
  showDatabaseSearch,
  setShowDatabaseSearch,
  filteredShipmentItems,
  filteredActiveItems,
  searchedDbItems,
  handleDeleteItem,
  handleAddCustomItem,
  handleAddFromDatabase
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Custom Add Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
        <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">
          신규 품목 수동 등록
        </h3>

        <form onSubmit={handleAddCustomItem} className="space-y-4">
          {/* Searchable Dropdown for Shipment Items */}
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-500 mb-1">
              출하 품목 선택 (키워드 검색)
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                placeholder={shipmentData.length > 0 ? "코드 또는 품목명 검색 후 선택..." : "출하내역 파일을 먼저 업로드해 주세요."}
                disabled={shipmentData.length === 0}
                value={shipmentSearchQuery}
                onChange={(e) => {
                  setShipmentSearchQuery(e.target.value);
                  setIsShipmentDropdownOpen(true);
                }}
                onFocus={() => {
                  if (shipmentData.length > 0) setIsShipmentDropdownOpen(true);
                }}
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Icon name="search" className="h-3.5 w-3.5 text-slate-400" />
              </span>
            </div>

            {/* Backdrop to close dropdown on outside click */}
            {isShipmentDropdownOpen && (
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsShipmentDropdownOpen(false)}
              />
            )}

            {/* Autocomplete Dropdown List */}
            {isShipmentDropdownOpen && filteredShipmentItems.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-50">
                {filteredShipmentItems.map(item => (
                  <button
                    key={item.품목코드}
                    type="button"
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors flex flex-col gap-0.5"
                    onClick={() => {
                      setCustomCode(item.품목코드);
                      setCustomName(item.품목명);
                      setShipmentSearchQuery(`[${item.품목코드}] ${item.품목명}`);
                      setIsShipmentDropdownOpen(false);
                    }}
                  >
                    <span className="font-mono text-[9px] text-slate-400">코드: {item.품목코드}</span>
                    <span className="font-black truncate">{item.품목명}</span>
                  </button>
                ))}
              </div>
            )}
            {isShipmentDropdownOpen && filteredShipmentItems.length === 0 && shipmentData.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-center text-xs text-slate-400">
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          {/* Selected Item Info Display */}
          {customCode && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-bold text-indigo-700 flex items-start justify-between fade-in">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-indigo-500 font-black">선택된 품목 정보</div>
                <div className="font-mono">코드: {customCode}</div>
                <div className="mt-0.5 font-black text-slate-800 truncate">{customName}</div>
              </div>
              <button
                type="button"
                className="text-indigo-500 hover:text-red-500 font-extrabold text-[10px] underline ml-2 shrink-0"
                onClick={() => {
                  setCustomCode('');
                  setCustomName('');
                  setShipmentSearchQuery('');
                }}
              >
                선택해제
              </button>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-1">수량 1개당 중량 (kg)</label>
            <input
              type="number"
              step="0.001"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="예시: 0.5"
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
            />
          </div>

          <Button
            variant="success"
            className="w-full py-2.5 rounded-xl font-black text-xs"
            type="submit"
          >
            <Icon name="plus" className="w-3.5 h-3.5" /> 신규 품목 추가
          </Button>
        </form>
      </div>

      {/* Active Items List / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4">

        {/* Actions & Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Icon name="search" className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="품목코드 또는 품목명으로 간편 조회..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {baseTargetItems.length > 0 && (
            <Button
              variant={showDatabaseSearch ? "indigo_light" : "outline"}
              size="sm"
              onClick={() => setShowDatabaseSearch(!showDatabaseSearch)}
              className="shrink-0 font-black border-slate-200 rounded-xl text-xs py-2 px-3"
            >
              {showDatabaseSearch ? '✓ 원본 DB조회 활성화' : '🔎 원본 전체 DB 검색'}
            </Button>
          )}
        </div>

        {/* Sub database match view if toggled */}
        {showDatabaseSearch && searchedDbItems.length > 0 && (
          <div className="bg-indigo-50/50 border border-dashed border-indigo-200 rounded-2xl p-4 space-y-2 slide-in">
            <h4 className="text-[11px] font-black text-indigo-700 flex items-center gap-1">
              🔍 엑셀 기준 원본 매칭 결과 ({searchedDbItems.length}건) - 추가 시 변환 프로세스에 반영됩니다:
            </h4>

            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {searchedDbItems.map(item => (
                <div
                  key={item.품목코드}
                  className="bg-white border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="font-bold text-slate-700">
                    <span className="font-mono text-indigo-600 mr-2 bg-indigo-50/40 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100/50">
                      {item.품목코드}
                    </span>
                    {item.품목명} ({item.단위무게}kg)
                  </span>
                  <Button
                    variant="primary"
                    size="xs"
                    className="h-6 rounded-lg px-2 text-[10px]"
                    onClick={() => handleAddFromDatabase(item)}
                  >
                    + 관리목록에 추가
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Table */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-black text-slate-400 mb-2 px-1">
            <span>관리 중인 대상 품목: <strong className="text-slate-600">{filteredActiveItems.length}개</strong></span>
            {searchQuery && <span className="text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">필터 필터링 활성화</span>}
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner max-h-[360px] overflow-y-auto bg-slate-50/30">
            {filteredActiveItems.length > 0 ? (
              <table className="w-full border-collapse text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-[10px]">
                    <th className="py-2.5 px-4">품목코드</th>
                    <th className="py-2.5 px-4">품목명</th>
                    <th className="py-2.5 px-4">기준 규격단위 무게</th>
                    <th className="py-2.5 px-4 text-center" style={{ width: '70px' }}>조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredActiveItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{item.품목코드}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-800">{item.품목명}</td>
                      <td className="py-3 px-4 font-bold text-slate-500">{item.단위무게.toLocaleString()} kg</td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 font-extrabold border border-transparent hover:border-red-100 px-2 rounded-lg"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          제외
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-bold">
                등록된 신고관리 대상 품목이 없습니다. 신규 추가해 주세요.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TargetItemSection;
