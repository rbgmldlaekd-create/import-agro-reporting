import { useState, useMemo, useEffect } from 'react';
import {
  parseFile,
  parseFileAsAOA,
  processReportingData,
  formatExcelDate
} from '../utils/excelProcessor';
import {
  parseTransferXls,
  matchTransferWithShipments,
  downloadMatchedExcel,
  downloadSingleTransferExcel,
  downloadAllTransferExcel
} from '../utils/transferMatcher';

// Helper to safely parse JSON from localStorage
const getStoredItem = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}":`, e);
    return fallback;
  }
};

export function useReportingStore() {
  // File upload states (restored as virtual File-like objects with only name property)
  const [shipmentFiles, setShipmentFiles] = useState(() => {
    return getStoredItem('shipmentFiles', []);
  });
  const [clientInfoFile, setClientInfoFile] = useState(() => {
    const name = localStorage.getItem('clientInfoFileName');
    return name ? { name } : null;
  });
  const [targetItemsFile, setTargetItemsFile] = useState(() => {
    const name = localStorage.getItem('targetItemsFileName');
    return name ? { name } : null;
  });
  const [transferFile, setTransferFile] = useState(() => {
    const name = localStorage.getItem('transferFileName');
    return name ? { name } : null;
  });

  // Parsed raw lists
  const [shipmentData, setShipmentData] = useState(() => getStoredItem('shipmentData', []));
  const [clientInfoData, setClientInfoData] = useState(() => getStoredItem('clientInfoData', []));
  const [baseTargetItems, setBaseTargetItems] = useState(() => getStoredItem('baseTargetItems', []));
  const [transferData, setTransferData] = useState(() => getStoredItem('transferData', []));

  // Active target items (managed and editable by user)
  const [activeTargetItems, setActiveTargetItems] = useState(() => getStoredItem('activeTargetItems', []));

  // Declaration completion states
  const [completedTransferIds, setCompletedTransferIds] = useState(() => getStoredItem('completedTransferIds', []));

  // Form & Dropdown & Search states
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customWeight, setCustomWeight] = useState('');
  const [shipmentSearchQuery, setShipmentSearchQuery] = useState('');
  const [isShipmentDropdownOpen, setIsShipmentDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);

  // Loading states
  const [loading, setLoading] = useState({
    shipment: false,
    client: false,
    target: false
  });

  // Sync virtual file names to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shipmentFiles', JSON.stringify(shipmentFiles));
    } catch (e) {
      console.error('Failed to save shipmentFiles to localStorage:', e);
    }
  }, [shipmentFiles]);

  useEffect(() => {
    if (clientInfoFile) {
      localStorage.setItem('clientInfoFileName', clientInfoFile.name || '');
    } else {
      localStorage.removeItem('clientInfoFileName');
    }
  }, [clientInfoFile]);

  useEffect(() => {
    if (targetItemsFile) {
      localStorage.setItem('targetItemsFileName', targetItemsFile.name || '');
    } else {
      localStorage.removeItem('targetItemsFileName');
    }
  }, [targetItemsFile]);

  useEffect(() => {
    if (transferFile) {
      localStorage.setItem('transferFileName', transferFile.name || '');
    } else {
      localStorage.removeItem('transferFileName');
    }
  }, [transferFile]);

  // Sync data arrays to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shipmentData', JSON.stringify(shipmentData));
    } catch (e) {
      console.error('Failed to save shipmentData to localStorage:', e);
    }
  }, [shipmentData]);

  useEffect(() => {
    try {
      localStorage.setItem('clientInfoData', JSON.stringify(clientInfoData));
    } catch (e) {
      console.error('Failed to save clientInfoData to localStorage:', e);
    }
  }, [clientInfoData]);

  useEffect(() => {
    try {
      localStorage.setItem('baseTargetItems', JSON.stringify(baseTargetItems));
    } catch (e) {
      console.error('Failed to save baseTargetItems to localStorage:', e);
    }
  }, [baseTargetItems]);

  useEffect(() => {
    try {
      localStorage.setItem('activeTargetItems', JSON.stringify(activeTargetItems));
    } catch (e) {
      console.error('Failed to save activeTargetItems to localStorage:', e);
    }
  }, [activeTargetItems]);

  useEffect(() => {
    try {
      localStorage.setItem('transferData', JSON.stringify(transferData));
    } catch (e) {
      console.error('Failed to save transferData to localStorage:', e);
    }
  }, [transferData]);

  useEffect(() => {
    try {
      localStorage.setItem('completedTransferIds', JSON.stringify(completedTransferIds));
    } catch (e) {
      console.error('Failed to save completedTransferIds to localStorage:', e);
    }
  }, [completedTransferIds]);

  // Reset all uploaded and stored data
  const handleResetAllData = () => {
    if (!window.confirm('정말로 모든 업로드 데이터 및 관리 품목 리스트를 초기화하시겠습니까?')) {
      return;
    }

    // Clear localStorage keys
    localStorage.removeItem('shipmentFiles');
    localStorage.removeItem('clientInfoFileName');
    localStorage.removeItem('targetItemsFileName');
    localStorage.removeItem('transferFileName');
    localStorage.removeItem('shipmentData');
    localStorage.removeItem('clientInfoData');
    localStorage.removeItem('baseTargetItems');
    localStorage.removeItem('activeTargetItems');
    localStorage.removeItem('transferData');
    localStorage.removeItem('completedTransferIds');

    // Reset React States
    setShipmentFiles([]);
    setClientInfoFile(null);
    setTargetItemsFile(null);
    setTransferFile(null);
    setShipmentData([]);
    setClientInfoData([]);
    setBaseTargetItems([]);
    setActiveTargetItems([]);
    setTransferData([]);
    setCompletedTransferIds([]);

    // Reset form states
    setCustomCode('');
    setCustomName('');
    setCustomWeight('');
    setShipmentSearchQuery('');
    setSearchQuery('');
  };

  // Extract unique items from shipment data for autocomplete
  const shipmentItems = useMemo(() => {
    if (!shipmentData || !shipmentData.length) return [];

    const itemsMap = new Map();
    shipmentData.forEach(row => {
      const code = String(row['품목'] || row['품목코드'] || row['코드'] || '').trim();
      if (!code) return;

      const name = String(row['품목명'] || row['상품명'] || row['품목'] || '').trim();

      if (!itemsMap.has(code)) {
        itemsMap.set(code, {
          품목코드: code,
          품목명: name === code ? '' : name
        });
      } else if (name && name !== code) {
        const existing = itemsMap.get(code);
        if (!existing.품목명 || existing.품목명 === code) {
          itemsMap.set(code, { 품목코드: code, 품목명: name });
        }
      }
    });

    return Array.from(itemsMap.values()).map(item => ({
      품목코드: item.품목코드,
      품목명: item.품목명 || item.품목코드
    }));
  }, [shipmentData]);

  // Filtered shipment items based on search keyword
  const filteredShipmentItems = useMemo(() => {
    if (!shipmentItems.length) return [];
    if (!shipmentSearchQuery.trim()) return shipmentItems;

    const q = shipmentSearchQuery.toLowerCase();
    // Support autocomplete search for both code or name, and don't match the selected "[code] name" bracket format if already chosen
    if (shipmentSearchQuery.startsWith('[')) {
      return [];
    }
    return shipmentItems.filter(
      item => item.품목코드.includes(q) || item.품목명.toLowerCase().includes(q)
    );
  }, [shipmentItems, shipmentSearchQuery]);

  // Handle Shipment upload
  const handleShipmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(prev => ({ ...prev, shipment: true }));
    try {
      const data = await parseFile(file);
      const mappedData = data.map((row, idx) => ({ 
        ...row, 
        _id: `shipment-${Date.now()}-${idx}`,
        _fileName: file.name 
      }));
      
      // Update files list (overwrite if file name already exists)
      setShipmentFiles(prev => {
        const filtered = prev.filter(f => f.name !== file.name);
        return [...filtered, { name: file.name, count: data.length }];
      });
      
      // Update data (overwrite rows associated with the same file name)
      setShipmentData(prev => {
        const filtered = prev.filter(row => row._fileName !== file.name);
        return [...filtered, ...mappedData];
      });
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
      const data = await HookParseFile(file);
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

  // Handle Transfer upload
  const handleTransferUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTransferFile(file);
    setLoading(prev => ({ ...prev, transfer: true }));
    try {
      const rawRows = await parseFileAsAOA(file);
      const parsedTransfers = parseTransferXls(rawRows);
      setTransferData(parsedTransfers);
    } catch (err) {
      alert(`양수내역 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, transfer: false }));
    }
  };

  // Individual deletion handlers
  const handleShipmentDelete = (fileName) => {
    if (fileName) {
      setShipmentFiles(prev => prev.filter(f => f.name !== fileName));
      setShipmentData(prev => prev.filter(row => row._fileName !== fileName));
    } else {
      localStorage.removeItem('shipmentFiles');
      localStorage.removeItem('shipmentData');
      setShipmentFiles([]);
      setShipmentData([]);
    }
  };

  const handleClientDelete = () => {
    localStorage.removeItem('clientInfoFileName');
    localStorage.removeItem('clientInfoData');
    setClientInfoFile(null);
    setClientInfoData([]);
  };

  const handleTargetDelete = () => {
    localStorage.removeItem('targetItemsFileName');
    localStorage.removeItem('baseTargetItems');
    localStorage.removeItem('activeTargetItems');
    setTargetItemsFile(null);
    setBaseTargetItems([]);
    setActiveTargetItems([]);
  };

  const handleTransferDelete = () => {
    localStorage.removeItem('transferFileName');
    localStorage.removeItem('transferData');
    setTransferFile(null);
    setTransferData([]);
  };

  // Helper alias to bypass local variable conflict
  async function HookParseFile(file) {
    return parseFile(file);
  }

  // Delete item from active managed list
  const handleDeleteItem = (id) => {
    setActiveTargetItems(prev => prev.filter(item => item.id !== id));
  };

  // Add custom item manually
  const handleAddCustomItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customCode.trim() || !customName.trim()) {
      alert('출하 품목 선택(키워드 검색)을 통해 품목을 먼저 선택해 주세요.');
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
    setShipmentSearchQuery('');
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
    const mockTargetItems = [
      { id: 'demo-1', 품목코드: '120450343', 품목명: '고추가루(굵은,국5:중5)', 단위무게: 0.5 },
      { id: 'demo-2', 품목코드: '120450344', 품목명: '고추가루(고운,국5,중5)', 단위무게: 0.5 },
      { id: 'demo-3', 품목코드: '120751520', 품목명: '(종료)땅콩분태', 단위무게: 1.0 },
      { id: 'demo-4', 품목코드: '120991900', 품목명: '(종료)크러쉬드페퍼(레드페퍼)_과세', 단위무게: 1.0 }
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
      { '출하일자': '2026/05/01', '출하거래처': '11148', '품목': '120751520', '출하수량': 30 }, // 30kg
      { '출하일자': '2026/05/01', '출하거래처': '11148', '품목': '120450343', '출하수량': 10 }, // 5kg
      { '출하일자': '2026/05/02', '출하거래처': '11148', '품목': '120450343', '출하수량': 6 },  // 3kg
      { '출하일자': '2026/05/02', '출하거래처': '11150', '품목': '120991900', '출하수량': 15 },
      { '출하일자': '2026/05/10', '출하거래처': '11150', '품목': '120991900', '출하수량': 20 }
    ];

    const mockTransfers = [
      {
        id: 'demo-transfer-1',
        originalRowIndex: 3,
        declarationNo: '2336123300383M/1',
        serialNo: '1025914225',
        itemName: '볶은 알땅콩(파쇄)',
        targetQty: 20,
        targetDate: '20260505',
        matchedQty: 0,
        matchedDetails: []
      },
      {
        id: 'demo-transfer-2',
        originalRowIndex: 4,
        declarationNo: '4241623010637M/1',
        serialNo: '1025765575',
        itemName: '냉동고추(금탑)',
        targetQty: 6,
        targetDate: '20260506',
        matchedQty: 0,
        matchedDetails: []
      }
    ];

    const mockShipmentsMapped = mockShipments.map((row, idx) => ({
        ...row,
        _id: `shipment-demo-${idx}`,
        _fileName: '데모_출하내역.xlsx'
    }));

    setBaseTargetItems(mockTargetItems);
    setActiveTargetItems(mockTargetItems);
    setClientInfoData(mockClients);
    setShipmentData(mockShipmentsMapped);
    setTransferData(mockTransfers);

    setShipmentFiles([{ name: '데모_출하내역.xlsx', count: mockShipments.length }]);
    setClientInfoFile({ name: '데모_거래처기준정보.xlsx' });
    setTargetItemsFile({ name: '데모_대상품목기준.xlsx' });
    setTransferFile({ name: '데모_선택양수내역.xls' });
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

    return baseTargetItems.filter(item => {
      const matches = item.품목코드.includes(q) || item.품목명.toLowerCase().includes(q);
      if (!matches) return false;

      const inActive = activeTargetItems.some(act => act.품목코드 === item.품목코드);
      return !inActive;
    });
  }, [baseTargetItems, activeTargetItems, searchQuery]);

  const shipmentDateRange = useMemo(() => {
    if (!shipmentData || shipmentData.length === 0) return '';
    let minDate = '99999999';
    let maxDate = '00000000';
    let hasValidDate = false;
    
    shipmentData.forEach(row => {
      const rawDate = row['출하일자'] || row['배송일자'] || row['주문일자'];
      if (rawDate) {
        const cleaned = formatExcelDate(rawDate);
        if (cleaned && cleaned.length === 8) {
          hasValidDate = true;
          if (cleaned < minDate) minDate = cleaned;
          if (cleaned > maxDate) maxDate = cleaned;
        }
      }
    });
    
    if (!hasValidDate) return '';
    
    const formatDate = (dateStr) => {
      return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
    };
    
    return `${formatDate(minDate)}~${formatDate(maxDate)}`;
  }, [shipmentData]);

  // Compute fully processed reporting data reactive to files and target list
  const reportingData = useMemo(() => {
    return processReportingData({
      shipmentList: shipmentData,
      clientInfoList: clientInfoData,
      targetItemList: activeTargetItems
    });
  }, [shipmentData, clientInfoData, activeTargetItems]);

  const transferMatchedData = useMemo(() => {
    return matchTransferWithShipments({
      transferList: transferData,
      shipmentList: shipmentData,
      clientInfoList: clientInfoData,
      targetItemList: activeTargetItems
    });
  }, [transferData, shipmentData, clientInfoData, activeTargetItems]);

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

  const toggleTransferComplete = (id) => {
    setCompletedTransferIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const restoreCompletedTransfers = (ids) => {
    if (!Array.isArray(ids)) {
      alert('올바른 백업 파일 형식이 아닙니다.');
      return;
    }
    setCompletedTransferIds(ids);
    alert(`성공적으로 복구되었습니다. (총 ${ids.length}건)`);
  };

  // Determine system status
  const isUploadComplete = shipmentData.length > 0 && clientInfoData.length > 0 && activeTargetItems.length > 0;

  return {
    // Files & Data state
    shipmentFiles,
    shipmentDateRange,
    clientInfoFile,
    targetItemsFile,
    transferFile,
    shipmentData,
    completedTransferIds,
    toggleTransferComplete,
    restoreCompletedTransfers,
    clientInfoData,
    baseTargetItems,
    activeTargetItems,
    transferData,
    
    // Add Item Form states
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

    // Search query states
    searchQuery,
    setSearchQuery,
    showDatabaseSearch,
    setShowDatabaseSearch,

    // Loading indicators
    loading,

    // Computed / derived lists
    shipmentItems,
    filteredShipmentItems,
    filteredActiveItems,
    searchedDbItems,
    reportingData,
    processedItemsSummary,
    isUploadComplete,
    transferMatchedData,

    // Event handlers
    handleShipmentUpload,
    handleClientUpload,
    handleTargetUpload,
    handleTransferUpload,
    handleShipmentDelete,
    handleClientDelete,
    handleTargetDelete,
    handleTransferDelete,
    handleResetAllData,
    handleLoadDemo,
    handleDeleteItem,
    handleAddCustomItem,
    handleAddFromDatabase,
    downloadMatchedExcel,
    downloadSingleTransferExcel,
    downloadAllTransferExcel
  };
}
