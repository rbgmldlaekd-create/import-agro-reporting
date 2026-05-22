import React, { useState, useMemo } from 'react';
import { 
  parseFile, 
  processReportingData, 
  downloadExcelForItem 
} from './utils/excelProcessor';

function App() {
  // File upload states
  const [shipmentFile, setShipmentFile] = useState(null);
  const [clientInfoFile, setClientInfoFile] = useState(null);
  const [targetItemsFile, setTargetItemsFile] = useState(null);
  
  // Parsed raw lists
  const [shipmentData, setShipmentData] = useState([]);
  const [clientInfoData, setClientInfoData] = useState([]);
  const [baseTargetItems, setBaseTargetItems] = useState([]); // Database from Excel
  
  // Active target items (managed and editable by user)
  const [activeTargetItems, setActiveTargetItems] = useState([]);
  
  // Add item form states
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  
  // Search state within active list or base database
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState({
    shipment: false,
    client: false,
    target: false
  });

  // Handle Shipment upload
  const handleShipmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShipmentFile(file);
    setLoading(prev => ({ ...prev, shipment: true }));
    try {
      const data = await parseFile(file);
      setShipmentData(data);
    } catch (err) {
      alert(`출하내역 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, shipment: false }));
    }
  };

  // Handle Client Info upload
  const handleClientUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setClientInfoFile(file);
    setLoading(prev => ({ ...prev, client: true }));
    try {
      const data = await parseFile(file);
      setClientInfoData(data);
    } catch (err) {
      alert(`거래처 기준정보 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, client: false }));
    }
  };

  // Handle Target Regulated Items upload
  const handleTargetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTargetItemsFile(file);
    setLoading(prev => ({ ...prev, target: true }));
    try {
      const data = await parseFile(file);
      // Map columns based on Excel structure
      const mapped = data.map((row, idx) => ({
        id: `xls-${idx}`,
        품목코드: String(row['품목'] || row['품목코드'] || row['코드'] || '').trim(),
        품목명: String(row['품목명'] || row['품목'] || row['상품명'] || '').trim(),
        단위무게: Number(row['수량1당 무게(kg)'] || row['수량1당무게(kg)'] || row['1개당무게(kg)'] || 0)
      })).filter(item => item.품목코드 && item.품목명);
      
      setBaseTargetItems(mapped);
      setActiveTargetItems(mapped);
    } catch (err) {
      alert(`대상품목 기준 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, target: false }));
    }
  };

  // Delete item from active managed list
  const handleDeleteItem = (id) => {
    setActiveTargetItems(prev => prev.filter(item => item.id !== id));
  };

  // Add custom item manually
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customCode.trim() || !customName.trim()) {
      alert('품목코드와 품목명을 입력해 주세요.');
      return;
    }
    
    // Check duplication
    const isDuplicate = activeTargetItems.some(
      item => item.품목코드.trim() === customCode.trim()
    );
    if (isDuplicate) {
      alert('이미 등록되어 있는 품목코드입니다.');
      return;
    }

    const newItem = {
      id: `custom-${Date.now()}`,
      품목코드: customCode.trim(),
      품목명: customName.trim(),
      단위무게: Number(customWeight) || 0
    };

    setActiveTargetItems(prev => [newItem, ...prev]);
    setCustomCode('');
    setCustomName('');
    setCustomWeight('');
  };

  // Add from base database search
  const handleAddFromDatabase = (item) => {
    const isDuplicate = activeTargetItems.some(
      active => active.품목코드 === item.품목코드
    );
    if (isDuplicate) {
      alert('이미 관리 목록에 추가되어 있습니다.');
      return;
    }
    setActiveTargetItems(prev => [{ ...item, id: `db-${Date.now()}` }, ...prev]);
  };

  // Load sample/mock data for demonstration
  const handleLoadDemo = () => {
    // Generate realistic demo data
    const mockTargetItems = [
      { id: 'demo-1', 품목코드: '120450343', 품목명: '고추가루(굵은,국5:중5)', 단위무게: 0.5 },
      { id: 'demo-2', 품목코드: '120450344', 품목명: '고추가루(고운,국5,중5)', 단위무게: 0.5 },
      { id: 'demo-3', 품목코드: '120991900', 품목명: '(종료)크러쉬드페퍼(레드페퍼)_과세', 단위무게: 1.0 }
    ];
    
    const mockClients = [
      {
        '출하거래처': '11148',
        '출하거래처명': '딜리버리 삼성점(티엘컴퍼니)',
        '거래유형': '소매업체',
        "사업자등록번호('-'제외)": '230-86-03640',
        '상호(성명)': '딜리버리 삼성점(티엘컴퍼니)',
        '주소(판매장소)': '서울특별시 강남구 역삼로78길 6 (대치동)'
      },
      {
        '출하거래처': '11150',
        '출하거래처명': '프레시 역삼 마트',
        '거래유형': '도매업체',
        "사업자등록번호('-'제외)": '120-45-78901',
        '상호(성명)': '프레시 역삼 마트',
        '주소(판매장소)': '서울특별시 강남구 테헤란로 123'
      }
    ];

    const mockShipments = [
      { '출하일자': '2026/05/01', '출하거래처': '11148', '품목': '120450343', '출하수량': 5 },
      { '출하일자': '2026/05/01', '출하거래처': '11148', '품목': '120450344', '출하수량': 10 },
      { '출하일자': '2026/05/02', '출하거래처': '11148', '품목': '120450343', '출하수량': 3 },
      { '출하일자': '2026/05/02', '출하거래처': '11150', '품목': '120991900', '출하수량': 15 },
      { '출하일자': '2026/05/10', '출하거래처': '11150', '품목': '120991900', '출하수량': 20 }
    ];

    setBaseTargetItems(mockTargetItems);
    setActiveTargetItems(mockTargetItems);
    setClientInfoData(mockClients);
    setShipmentData(mockShipments);
    
    setShipmentFile({ name: '데모_출하내역.xlsx' });
    setClientInfoFile({ name: '데모_거래처기준정보.xlsx' });
    setTargetItemsFile({ name: '데모_대상품목기준.xlsx' });
  };

  // Filtered active target items for display
  const filteredActiveItems = useMemo(() => {
    if (!searchQuery.trim()) return activeTargetItems;
    const q = searchQuery.toLowerCase();
    return activeTargetItems.filter(
      item => item.품목코드.includes(q) || item.품목명.toLowerCase().includes(q)
    );
  }, [activeTargetItems, searchQuery]);

  // Database items that match search query and are NOT currently in the active list
  const searchedDbItems = useMemo(() => {
    if (!searchQuery.trim() || !baseTargetItems.length) return [];
    const q = searchQuery.toLowerCase();
    
    // Filter database
    return baseTargetItems.filter(item => {
      // Must match search query
      const matches = item.품목코드.includes(q) || item.품목명.toLowerCase().includes(q);
      if (!matches) return false;
      
      // Must NOT be in active list
      const inActive = activeTargetItems.some(act => act.품목코드 === item.품목코드);
      return !inActive;
    });
  }, [baseTargetItems, activeTargetItems, searchQuery]);

  // Compute fully processed reporting data reactive to files and target list
  const reportingData = useMemo(() => {
    return processReportingData({
      shipmentList: shipmentData,
      clientInfoList: clientInfoData,
      targetItemList: activeTargetItems
    });
  }, [shipmentData, clientInfoData, activeTargetItems]);

  // Aggregate results by item to display summaries with download links
  const processedItemsSummary = useMemo(() => {
    const summaries = {};
    reportingData.forEach(row => {
      const code = row.itemCode;
      if (!summaries[code]) {
        summaries[code] = {
          code: code,
          name: row.itemName,
          recordCount: 0,
          totalQty: 0,
          totalWeight: 0,
          minDate: '99999999',
          maxDate: '00000000'
        };
      }
      summaries[code].recordCount++;
      summaries[code].totalQty += row.totalQty;
      summaries[code].totalWeight += row.dlngWt;
      
      if (row.dlngYmd < summaries[code].minDate) summaries[code].minDate = row.dlngYmd;
      if (row.dlngYmd > summaries[code].maxDate) summaries[code].maxDate = row.dlngYmd;
    });

    return Object.values(summaries).map(item => ({
      ...item,
      totalWeight: Number(item.totalWeight.toFixed(3))
    }));
  }, [reportingData]);

  // Helper to format string date to dot notation
  const formatDateWithDots = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
  };

  // Determine system status
  const isUploadComplete = shipmentData.length > 0 && clientInfoData.length > 0 && activeTargetItems.length > 0;

  return (
    <div className="container">
      {/* Header section */}
      <header className="app-header fade-in">
        <div className="brand">
          <span className="brand-icon">🌾</span>
          <div>
            <h1 className="brand-title">Import Agro Reporting</h1>
            <p className="brand-subtitle">수입농산물 유통이력신고 자동화 시스템</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="btn" 
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onClick={handleLoadDemo}
          >
            ⚙️ 데모 데이터 로드
          </button>
          
          <div className="system-status">
            <span className={`status-dot ${isUploadComplete ? 'active' : ''}`}></span>
            <span>{isUploadComplete ? '준비 완료' : '대기 중 (파일 업로드 필요)'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="dashboard-grid">
        
        {/* Left Column: Uploads & target items manager */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: File Uploads */}
          <section className="panel-card active-glow fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="panel-title">
              <span className="number">1</span> 파일 업로드 구역
            </h2>
            
            <div className="upload-group">
              
              {/* Shipment upload */}
              <div className={`file-uploader ${shipmentFile ? 'success' : ''}`}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleShipmentUpload} 
                />
                <span className="uploader-icon">📊</span>
                <span className="uploader-label">출하내역 업로드</span>
                <span className="uploader-hint">xlsx, csv 형식 지원</span>
                {loading.shipment && <span className="file-status-badge">파싱 중...</span>}
                {!loading.shipment && shipmentFile && (
                  <span className="file-status-badge">
                    ✓ {shipmentFile.name.substring(0, 18)}... ({shipmentData.length}행)
                  </span>
                )}
              </div>

              {/* Client Base Info upload */}
              <div className={`file-uploader ${clientInfoFile ? 'success' : ''}`}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleClientUpload} 
                />
                <span className="uploader-icon">🏢</span>
                <span className="uploader-label">거래처 기준정보 업로드</span>
                <span className="uploader-hint">xlsx 형식 지원</span>
                {loading.client && <span className="file-status-badge">파싱 중...</span>}
                {!loading.client && clientInfoFile && (
                  <span className="file-status-badge">
                    ✓ {clientInfoFile.name.substring(0, 18)}... ({clientInfoData.length}행)
                  </span>
                )}
              </div>

              {/* Target items list upload */}
              <div className={`file-uploader ${targetItemsFile ? 'success' : ''}`}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleTargetUpload} 
                />
                <span className="uploader-icon">📋</span>
                <span className="uploader-label">대상품목 기준 업로드</span>
                <span className="uploader-hint">xlsx 형식 지원</span>
                {loading.target && <span className="file-status-badge">파싱 중...</span>}
                {!loading.target && targetItemsFile && (
                  <span className="file-status-badge">
                    ✓ {targetItemsFile.name.substring(0, 18)}... ({baseTargetItems.length}개 품목)
                  </span>
                )}
              </div>

            </div>
          </section>

          {/* Section 2: Target Items Database Management */}
          <section className="panel-card fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="panel-title">
              <span className="number">2</span> 신고 대상 품목 관리 구역
            </h2>
            
            {/* Search Input */}
            <div className="search-bar">
              <input 
                type="text" 
                className="input-control" 
                placeholder="코드 또는 품목명 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {baseTargetItems.length > 0 && (
                <button 
                  className={`btn ${showDatabaseSearch ? 'btn-primary' : 'btn-success'}`}
                  onClick={() => setShowDatabaseSearch(!showDatabaseSearch)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  {showDatabaseSearch ? '관리목록' : '전체DB'}
                </button>
              )}
            </div>

            {/* If searching from the database sheet list */}
            {showDatabaseSearch && searchedDbItems.length > 0 && (
              <div className="fade-in" style={{ marginBottom: '1.5rem', background: 'rgba(6, 182, 212, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--cyan)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--cyan)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  🔍 업로드된 원본 DB 매칭 결과 (목록 추가 가능):
                </h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {searchedDbItems.map(item => (
                    <div key={item.품목코드} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                      <span>[{item.품목코드}] {item.품목명} ({item.단위무게}kg)</span>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem', height: '24px' }}
                        onClick={() => handleAddFromDatabase(item)}
                      >
                        + 추가
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick add custom entry form */}
            <form onSubmit={handleAddCustomItem} className="quick-add-form">
              <input 
                type="text" 
                className="input-control" 
                placeholder="품목코드"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
              />
              <input 
                type="text" 
                className="input-control" 
                placeholder="품목명"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input 
                type="number" 
                step="0.001" 
                className="input-control" 
                placeholder="무게(kg)"
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
              />
              <button type="submit" className="btn btn-success" style={{ padding: '0.5rem 1rem' }}>
                추가
              </button>
            </form>

            {/* Active Items Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
              <span>관리 중인 대상품목: <strong>{filteredActiveItems.length}</strong>개</span>
              {searchQuery && <span>검색 필터 적용 됨</span>}
            </div>

            <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {filteredActiveItems.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>품목코드</th>
                      <th>품목명</th>
                      <th>단위무게</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>제외</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveItems.map((item) => (
                      <tr key={item.id} className="fade-in">
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>{item.품목코드}</td>
                        <td style={{ fontWeight: 500 }}>{item.품목명}</td>
                        <td>{item.단위무게} kg</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  등록된 대상 품목이 없습니다.
                </div>
              )}
            </div>

          </section>

        </div>

        {/* Right Column: Calculations & compliant downloads list */}
        <div>
          <section className="panel-card active-glow fade-in" style={{ minHeight: '500px', animationDelay: '0.3s' }}>
            <h2 className="panel-title">
              <span className="number">3</span> 결과 다운로드 구역 (품목별 출력)
            </h2>

            {!isUploadComplete ? (
              <div className="empty-state">
                <span className="empty-icon">📂</span>
                <h3 className="empty-title">파일 결합 대기 중</h3>
                <p className="empty-desc">
                  좌측에서 <strong>출하내역</strong>, <strong>거래처 기준정보</strong>, 
                  그리고 <strong>대상품목 기준</strong> 파일을 모두 업로드해야 결과를 출력할 수 있습니다.
                </p>
              </div>
            ) : processedItemsSummary.length > 0 ? (
              <div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  💡 <strong>데이터 연산 결과:</strong> 전체 <strong>{reportingData.length}</strong>건의 결합 및 일자별 집계 데이터가 생성되었습니다. 
                  아래 품목별 카드의 다운로드 버튼을 클릭하여 관세청 업로드용 양식 엑셀을 저장하세요.
                </div>

                <div className="download-cards-grid">
                  {processedItemsSummary.map((item) => (
                    <div key={item.code} className="download-card fade-in">
                      <div>
                        <div className="card-header">
                          <span className="item-badge">{item.code}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            집계 대상: {item.recordCount}건
                          </span>
                        </div>
                        <h3 className="card-title">{item.name}</h3>
                      </div>
                      
                      <div style={{ marginTop: '1rem' }}>
                        <div className="card-body">
                          <div className="card-meta-row">
                            <span>거래 기간:</span>
                            <span className="card-meta-value">
                              {formatDateWithDots(item.minDate)} ~ {formatDateWithDots(item.maxDate)}
                            </span>
                          </div>
                          <div className="card-meta-row">
                            <span>출하 합계수량:</span>
                            <span className="card-meta-value">{item.totalQty.toLocaleString()} 개</span>
                          </div>
                          <div className="card-meta-row">
                            <span>최종 총무게:</span>
                            <span className="card-meta-value" style={{ color: 'var(--cyan)', fontWeight: 'bold' }}>
                              {item.totalWeight.toLocaleString()} kg
                            </span>
                          </div>
                        </div>

                        <button 
                          className="btn btn-success" 
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          onClick={() => downloadExcelForItem(item.code, item.name, reportingData)}
                        >
                          📥 유통이력신고 엑셀 다운로드
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">⚠️</span>
                <h3 className="empty-title">매칭 데이터 없음</h3>
                <p className="empty-desc">
                  업로드된 출하내역에서 <strong>신고 관리 대상 품목</strong>과 일치하는 품목코드나 거래처 결합 데이터가 존재하지 않습니다. 품목코드를 확인해 주세요.
                </p>
              </div>
            )}
          </section>
        </div>

      </div>
      
      {/* Footer credits */}
      <footer style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
        <p>수입농산물 유통이력신고 엑셀업로드 양식 변환기 v1.0.0</p>
        <p style={{ marginTop: '0.25rem' }}>Client-side processing. All data remains private on your computer.</p>
      </footer>
    </div>
  );
}

export default App;
