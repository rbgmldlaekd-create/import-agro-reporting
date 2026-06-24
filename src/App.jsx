import React, { useState } from 'react';
import { useReportingStore } from './hooks/useReportingStore';
import Button from './components/Button';
import Icon from './components/Icon';
import FileUploadSection from './components/FileUploadSection';
import TargetItemSection from './components/TargetItemSection';
import ResultDownloadSection from './components/ResultDownloadSection';
import TransferMatchingSection from './components/TransferMatchingSection';
import HelpSection from './components/HelpSection';

function App() {
  const store = useReportingStore();
  
  // Portal Layout States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loggedInUser, setLoggedInUser] = useState({
    id: 'operator@portal.com',
    role: 'ADMIN'
  });

  const handleLogout = () => {
    alert('통합포털 로그아웃은 포털 메인 화면에서 가능합니다.');
  };

  // Sidebar Menu Configuration
  const menuItems = [
    { id: 'dashboard', name: '유통이력 변환기', desc: '엑셀 파일 결합 및 다운로드', icon: 'pie-chart' },
    { id: 'matching', name: '양수내역 매칭기', desc: '양수내역과 출하내역 매칭', icon: 'git-merge' },
    { id: 'items', name: '신고대상 품목관리', desc: '신고대상 농산물 DB 관리', icon: 'database' },
    { id: 'help', name: '사용 안내', desc: '프로그램 매뉴얼 가이드', icon: 'help-circle' }
  ];

  // Render Inner Content Based on Active Menu
  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 slide-in">
            {/* Header Alert / Notice Banner */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  🌾 수입농산물 유통이력신고 자동화
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  관세청 신고대상 엑셀 양식을 신속하게 생성해 줍니다. 3가지 기초 자료 파일을 아래 구역에 등록해 주세요.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="indigo_light"
                  size="sm"
                  onClick={store.handleLoadDemo}
                >
                  ⚙️ 데모 데이터 자동 채우기
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={store.handleResetAllData}
                >
                  🗑️ 전체 데이터 초기화
                </Button>
              </div>
            </div>

            {/* STEP 1, 2, 3 Excel Files Upload Component */}
            <FileUploadSection
              shipmentFiles={store.shipmentFiles}
              shipmentDateRange={store.shipmentDateRange}
              handleShipmentUpload={store.handleShipmentUpload}
              shipmentLoading={store.loading.shipment}
              shipmentCount={store.shipmentData.length}
              clientInfoFile={store.clientInfoFile}
              handleClientUpload={store.handleClientUpload}
              clientLoading={store.loading.client}
              clientCount={store.clientInfoData.length}
              targetItemsFile={store.targetItemsFile}
              handleTargetUpload={store.handleTargetUpload}
              targetLoading={store.loading.target}
              targetCount={store.baseTargetItems.length}
              handleShipmentDelete={store.handleShipmentDelete}
              handleClientDelete={store.handleClientDelete}
              handleTargetDelete={store.handleTargetDelete}
            />

            {/* Results / Compliant Downloads Area Component */}
            <ResultDownloadSection
              isUploadComplete={store.isUploadComplete}
              processedItemsSummary={store.processedItemsSummary}
              reportingData={store.reportingData}
              handleLoadDemo={store.handleLoadDemo}
            />
          </div>
        );

      case 'matching':
        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 slide-in">
            <TransferMatchingSection
              shipmentCount={store.shipmentData.length}
              clientCount={store.clientInfoData.length}
              transferFile={store.transferFile}
              handleTransferUpload={store.handleTransferUpload}
              transferLoading={store.loading.transfer}
              transferData={store.transferData}
              transferMatchedData={store.transferMatchedData}
              downloadSingleTransferExcel={store.downloadSingleTransferExcel}
              downloadAllTransferExcel={store.downloadAllTransferExcel}
              handleTransferDelete={store.handleTransferDelete}
              completedTransferIds={store.completedTransferIds}
              toggleTransferComplete={store.toggleTransferComplete}
              restoreCompletedTransfers={store.restoreCompletedTransfers}
              shipmentData={store.shipmentData}
            />
          </div>
        );

      case 'items':
        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 slide-in">
            {/* Header Alert */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-800">📋 신고 대상 농산물 품목 관리</h2>
              <p className="text-xs text-slate-500 mt-1">
                출하내역에서 걸러낼 신고대상 품목 코드를 설정하고 관리하는 곳입니다. 대상품목 엑셀 업로드 외에도 임의의 품목을 즉석에서 추가 및 제외할 수 있습니다.
              </p>
            </div>

            {/* Target Monitored Items Segment Component */}
            <TargetItemSection
              shipmentData={store.shipmentData}
              activeTargetItems={store.activeTargetItems}
              baseTargetItems={store.baseTargetItems}
              customCode={store.customCode}
              setCustomCode={store.setCustomCode}
              customName={store.customName}
              setCustomName={store.setCustomName}
              customWeight={store.customWeight}
              setCustomWeight={store.setCustomWeight}
              shipmentSearchQuery={store.shipmentSearchQuery}
              setShipmentSearchQuery={store.setShipmentSearchQuery}
              isShipmentDropdownOpen={store.isShipmentDropdownOpen}
              setIsShipmentDropdownOpen={store.setIsShipmentDropdownOpen}
              searchQuery={store.searchQuery}
              setSearchQuery={store.setSearchQuery}
              showDatabaseSearch={store.showDatabaseSearch}
              setShowDatabaseSearch={store.setShowDatabaseSearch}
              filteredShipmentItems={store.filteredShipmentItems}
              filteredActiveItems={store.filteredActiveItems}
              searchedDbItems={store.searchedDbItems}
              handleDeleteItem={store.handleDeleteItem}
              handleAddCustomItem={store.handleAddCustomItem}
              handleAddFromDatabase={store.handleAddFromDatabase}
            />
          </div>
        );

      case 'help':
        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 slide-in">
            <HelpSection />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 1. 사이드바 (Sidebar) */}
      <div
        className={`${isSidebarOpen ? 'w-72' : 'w-10'} bg-slate-900 text-white transition-all duration-300 flex flex-col relative shadow-2xl z-20 shrink-0`}
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div className={`p-6 border-b border-slate-800 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center px-0'}`}>
          <div className={`font-black text-xl tracking-tighter flex items-center gap-2 ${!isSidebarOpen && 'hidden'}`}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center -rotate-12">
              <Icon name="pie-chart" className="w-5 h-5 text-white" />
            </div>
            구매/물류 <br /> 업무 통합 시스템
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} 
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Icon name={isSidebarOpen ? "chevron-left" : "menu"} className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <nav className={`flex-1 ${isSidebarOpen ? 'p-4' : 'p-2'} space-y-2 overflow-y-auto overflow-x-hidden`}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setTimeout(() => setIsSidebarOpen(false), 1000);
              }}
              className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 px-4' : 'justify-center px-0'} py-3.5 rounded-xl transition-all duration-200 group ${activeMenu === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon name={item.icon} className={`w-5 h-5 transition-transform duration-300 ${activeMenu === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-white'}`} />
              {isSidebarOpen && (
                <div className="text-left flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{item.name}</div>
                  <div className={`text-[10px] font-bold mt-0.5 truncate transition-colors ${activeMenu === item.id ? 'text-indigo-200' : 'text-slate-500'}`}>{item.desc}</div>
                </div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 우측 레이아웃 영역 */}
      <div className="flex-1 flex flex-col w-full relative min-w-0">
        {/* 2. 헤더 (Header) */}
        <header className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="md:hidden p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
            >
              <Icon name="menu" className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">SYSTEM ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-[10px] font-bold text-slate-400 hidden sm:flex items-center gap-4">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                <Icon name="database" className="w-3 h-3 text-indigo-500" /> 실적 DB: <span className="text-slate-700 font-black">{store.shipmentData.length.toLocaleString()}</span>건
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${loggedInUser.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {loggedInUser.id.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-[11px] font-bold text-slate-700 hidden sm:block">{loggedInUser.id}</div>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" 
                title="로그아웃"
              >
                <Icon name="log-out" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 3. 메인 콘텐츠 영역 (Main) */}
        <main className="flex-1 bg-slate-50/50 relative overflow-hidden flex flex-col min-h-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
