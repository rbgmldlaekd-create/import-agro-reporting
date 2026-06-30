import { useState, useMemo, useEffect, useRef } from 'react';
import {
  parseFile,
  parseFileAsAOA,
  formatExcelDate
} from '../utils/excelProcessor';
import {
  parseTransferXls,
  matchTransferWithShipments,
  downloadMatchedExcel,
  downloadSingleTransferExcel,
  downloadAllTransferExcel
} from '../utils/transferMatcher';
import {
  dbGet,
  dbSet,
  dbDelete,
  dbClear
} from '../utils/db';

function getPureSuffix(id) {
  if (!id) return '';
  const match = id.match(/\.(xlsx?|csv)-(transfer-row-\d+)$/i);
  return match ? match[2] : id;
}

let memoryShipmentData = [];

// IndexedDB 쓰기 작업 디바운싱 헬퍼 (디스크 I/O 병목 및 브라우저 프리징 해결)
let debouncedSaveTimer = null;
const debouncedSaveShipmentData = (data) => {
  if (debouncedSaveTimer) clearTimeout(debouncedSaveTimer);
  debouncedSaveTimer = setTimeout(() => {
    dbSet('shipmentData', data).catch(console.error);
  }, 1000);
};

let debouncedTransferTimer = null;
const debouncedSaveTransferData = (data) => {
  if (debouncedTransferTimer) clearTimeout(debouncedTransferTimer);
  debouncedTransferTimer = setTimeout(() => {
    dbSet('transferData', data).catch(console.error);
  }, 1000);
};

export function useReportingStore() {
  const [isLoaded, setIsLoaded] = useState(false);
  const lastNormalizedTransferDataRef = useRef(null);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // File upload states (restored as virtual File-like objects with only name property)
  const [shipmentFiles, setShipmentFiles] = useState([]);
  const [clientInfoFile, setClientInfoFile] = useState(null);
  const [targetItemsFile, setTargetItemsFile] = useState(null);
  const [transferFiles, setTransferFiles] = useState([]);

  // Parsed raw lists
  const [shipmentVersion, setShipmentVersion] = useState(0);
  const shipmentData = useMemo(() => {
    return memoryShipmentData;
  }, [shipmentVersion]);
  const [clientInfoData, setClientInfoData] = useState([]);
  const [baseTargetItems, setBaseTargetItems] = useState([]);
  const [transferData, setTransferData] = useState([]);

  // Active target items (managed and editable by user)
  const [activeTargetItems, setActiveTargetItems] = useState([]);

  // Declaration completion states
  const [completedTransferIds, setCompletedTransferIds] = useState([]);
  const [completedDetailsMap, setCompletedDetailsMap] = useState({});

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

  // Load data from IndexedDB on mount
  useEffect(() => {
    async function initStore() {
      try {
        // 가볍고 화면 초기 부팅에 즉시 필요한 데이터들을 병렬로 먼저 로드
        const [
          storedShipmentFiles,
          storedClientInfoFileName,
          storedTargetItemsFileName,
          storedTransferFiles,
          storedTransferFileName,
          storedBaseTargetItems,
          storedActiveTargetItems,
          storedCompletedTransferIds,
          storedCompletedDetailsMap
        ] = await Promise.all([
          dbGet('shipmentFiles', []),
          dbGet('clientInfoFileName', null),
          dbGet('targetItemsFileName', null),
          dbGet('transferFiles', null),
          dbGet('transferFileName', null),
          dbGet('baseTargetItems', []),
          dbGet('activeTargetItems', []),
          dbGet('completedTransferIds', []),
          dbGet('completedDetailsMap', {})
        ]);

        setShipmentFiles(storedShipmentFiles);
        if (storedClientInfoFileName) setClientInfoFile({ name: storedClientInfoFileName });
        if (storedTargetItemsFileName) setTargetItemsFile({ name: storedTargetItemsFileName });
        
        if (storedTransferFiles) {
          setTransferFiles(storedTransferFiles);
        } else if (storedTransferFileName) {
          setTransferFiles([{ name: storedTransferFileName, count: 0 }]); // 지연 로딩 전 임시 count
        } else {
          setTransferFiles([]);
        }
        setBaseTargetItems(storedBaseTargetItems);
        setActiveTargetItems(storedActiveTargetItems);
        setCompletedTransferIds(storedCompletedTransferIds);
        setCompletedDetailsMap(storedCompletedDetailsMap);
        
        // 1단계 로드 완료: 브라우저 화면이 멈춤(하얗게 프리징) 없이 즉시 렌더링되게 함
        setIsLoaded(true);

        // 2단계: 무겁고 대량인 실제 매칭 정보 데이터들을 백그라운드에서 병렬 로드
        const [storedClientInfoData, storedTransferData, storedShipmentData] = await Promise.all([
          dbGet('clientInfoData', []),
          dbGet('transferData', []),
          dbGet('shipmentData', [])
        ]);

        setClientInfoData(storedClientInfoData);
        setTransferData(storedTransferData);
        
        // 1년치 대용량 출하 데이터는 React State 대신 memory 변수에 올리고 버전 갱신
        memoryShipmentData = storedShipmentData;
        setShipmentVersion(v => v + 1);

        // 만약 transferFiles가 로드되어 있으면 행 개수를 실제 데이터 크기로 정확히 보정
        if (storedTransferFileName && storedTransferData.length > 0) {
          setTransferFiles([{ name: storedTransferFileName, count: storedTransferData.length }]);
        }

        // 모든 본 데이터 로드 완료
        setIsDbLoading(false);

      } catch (e) {
        console.error('Failed to restore data from IndexedDB:', e);
        setIsLoaded(true);
        setIsDbLoading(false);
      }
    }
    initStore();
  }, []);

  // Sync states to IndexedDB
  useEffect(() => {
    if (isLoaded) {
      dbSet('shipmentFiles', shipmentFiles);
    }
  }, [shipmentFiles, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (clientInfoFile) {
        dbSet('clientInfoFileName', clientInfoFile.name || '');
      } else {
        dbDelete('clientInfoFileName');
      }
    }
  }, [clientInfoFile, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (targetItemsFile) {
        dbSet('targetItemsFileName', targetItemsFile.name || '');
      } else {
        dbDelete('targetItemsFileName');
      }
    }
  }, [targetItemsFile, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('transferFiles', transferFiles);
    }
  }, [transferFiles, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      debouncedSaveShipmentData(shipmentData);
    }
  }, [shipmentData, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('clientInfoData', clientInfoData);
    }
  }, [clientInfoData, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('baseTargetItems', baseTargetItems);
    }
  }, [baseTargetItems, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('activeTargetItems', activeTargetItems);
    }
  }, [activeTargetItems, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      debouncedSaveTransferData(transferData);
    }
  }, [transferData, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('completedTransferIds', completedTransferIds);
    }
  }, [completedTransferIds, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      dbSet('completedDetailsMap', completedDetailsMap);
    }
  }, [completedDetailsMap, isLoaded]);

  // Auto-normalize completedTransferIds when transferData changes to support backward compatibility
  useEffect(() => {
    if (isLoaded && transferData.length > 0 && completedTransferIds.length > 0) {
      if (lastNormalizedTransferDataRef.current === transferData) {
        return;
      }
      lastNormalizedTransferDataRef.current = transferData;
      let changed = false;
      const nextIds = completedTransferIds.map(id => {
        // 이미 새로운 transferData 에 완전히 일치하는 ID가 있다면 그대로 둠
        if (transferData.some(row => row.id === id)) {
          return id;
        }
        
        // 없다면 suffix 기반으로 매칭 시도
        const suffix = getPureSuffix(id);
        const matchingRow = transferData.find(row => getPureSuffix(row.id) === suffix);
        if (matchingRow && matchingRow.id !== id) {
          changed = true;
          return matchingRow.id;
        }
        return id;
      });

      if (changed) {
        setCompletedTransferIds(nextIds);
        setCompletedDetailsMap(prevMap => {
          const nextMap = {};
          Object.keys(prevMap).forEach(key => {
            if (transferData.some(row => row.id === key)) {
              nextMap[key] = prevMap[key];
              return;
            }
            
            const suffix = getPureSuffix(key);
            const matchingRow = transferData.find(row => getPureSuffix(row.id) === suffix);
            if (matchingRow) {
              nextMap[matchingRow.id] = prevMap[key];
            } else {
              nextMap[key] = prevMap[key];
            }
          });
          return nextMap;
        });
      }
    }
  }, [transferData, completedTransferIds, isLoaded]);

  // Reset all uploaded and stored data
  const handleResetAllData = async () => {
    if (!window.confirm('정말로 모든 업로드 데이터 및 관리 품목 리스트를 초기화하시겠습니까?')) {
      return;
    }

    try {
      await dbClear();
    } catch (e) {
      console.error(e);
    }

    // Reset React States
    setShipmentFiles([]);
    setClientInfoFile(null);
    setTargetItemsFile(null);
    setTransferFiles([]);
    memoryShipmentData = [];
    setShipmentVersion(v => v + 1);
    setClientInfoData([]);
    setBaseTargetItems([]);
    setActiveTargetItems([]);
    setTransferData([]);
    setCompletedTransferIds([]);
    setCompletedDetailsMap({});

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

  // Handle Shipment upload (multiple files support)
  const handleShipmentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setLoading(prev => ({ ...prev, shipment: true }));
    try {
      const newFilesList = [];
      let newShipmentRows = [];

      for (const file of files) {
        const data = await parseFile(file);
        const mappedData = data.map((row, idx) => ({ 
          ...row, 
          _id: `shipment-${Date.now()}-${file.name}-${idx}`,
          _fileName: file.name 
        }));
        newFilesList.push({ name: file.name, count: data.length });
        newShipmentRows = [...newShipmentRows, ...mappedData];
      }
      
      // Update files list (overwrite if file name already exists)
      setShipmentFiles(prev => {
        const fileNamesToUpload = files.map(f => f.name);
        const filtered = prev.filter(f => !fileNamesToUpload.includes(f.name));
        return [...filtered, ...newFilesList];
      });
      
      // Update data (overwrite rows associated with the same file names)
      memoryShipmentData = (() => {
        const fileNamesToUpload = files.map(f => f.name);
        const filtered = memoryShipmentData.filter(row => !fileNamesToUpload.includes(row._fileName));
        return [...filtered, ...newShipmentRows];
      })();
      setShipmentVersion(v => v + 1);
    } catch (err) {
      alert(`출하내역 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, shipment: false }));
      e.target.value = ''; // Reset input to allow re-uploading same file if deleted
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

  // Handle Transfer upload (cumulative / multiple files support)
  const handleTransferUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setLoading(prev => ({ ...prev, transfer: true }));
    try {
      const newFilesList = [];
      let newTransferRows = [];

      for (const file of files) {
        const rawRows = await parseFileAsAOA(file);
        const parsedTransfers = parseTransferXls(rawRows).map(item => ({
          ...item,
          id: `${file.name}-${item.id}`, // Ensure unique row ID across multiple files
          _fileName: file.name
        }));
        
        newFilesList.push({ name: file.name, count: parsedTransfers.length });
        newTransferRows = [...newTransferRows, ...parsedTransfers];
      }

      // Update files list (overwrite if file name already exists)
      setTransferFiles(prev => {
        const fileNamesToUpload = files.map(f => f.name);
        const filtered = prev.filter(f => !fileNamesToUpload.includes(f.name));
        return [...filtered, ...newFilesList];
      });

      // Update transfer data (overwrite rows associated with same file names)
      setTransferData(prev => {
        const fileNamesToUpload = files.map(f => f.name);
        const filtered = prev.filter(row => !fileNamesToUpload.includes(row._fileName));
        return [...filtered, ...newTransferRows];
      });
    } catch (err) {
      alert(`양수내역 파일 파싱 에러: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, transfer: false }));
      e.target.value = '';
    }
  };

  // Individual deletion handlers
  const handleShipmentDelete = (fileName) => {
    if (fileName) {
      setShipmentFiles(prev => prev.filter(f => f.name !== fileName));
      memoryShipmentData = memoryShipmentData.filter(row => row._fileName !== fileName);
    } else {
      setShipmentFiles([]);
      memoryShipmentData = [];
    }
    setShipmentVersion(v => v + 1);
  };

  const handleClientDelete = () => {
    setClientInfoFile(null);
    setClientInfoData([]);
  };

  const handleTargetDelete = () => {
    setTargetItemsFile(null);
    setBaseTargetItems([]);
    setActiveTargetItems([]);
  };

  const handleTransferDelete = (fileName) => {
    if (fileName) {
      setTransferFiles(prev => prev.filter(f => f.name !== fileName));
      setTransferData(prev => prev.filter(row => row._fileName !== fileName));
    } else {
      setTransferFiles([]);
      setTransferData([]);
    }
  };

  const handleClearAllShipments = async () => {
    if (!window.confirm('등록된 모든 출하내역 파일을 일괄 삭제하시겠습니까?')) return;
    setShipmentFiles([]);
    memoryShipmentData = [];
    setShipmentVersion(v => v + 1);

    try {
      await dbDelete('shipmentFiles');
      await dbDelete('shipmentData');
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllTransfers = async () => {
    if (!window.confirm('등록된 모든 양수내역 파일을 일괄 삭제하시겠습니까?')) return;
    setTransferFiles([]);
    setTransferData([]);
    setCompletedTransferIds([]);
    setCompletedDetailsMap({});

    try {
      await dbDelete('transferFiles');
      await dbDelete('transferData');
      await dbDelete('completedTransferIds');
      await dbDelete('completedDetailsMap');
    } catch (e) {
      console.error(e);
    }
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

    const mockTransfersMapped = mockTransfers.map(row => ({
      ...row,
      id: `데모_선택양수내역.xls-${row.id}`,
      _fileName: '데모_선택양수내역.xls'
    }));

    setBaseTargetItems(mockTargetItems);
    setActiveTargetItems(mockTargetItems);
    setClientInfoData(mockClients);
    memoryShipmentData = mockShipmentsMapped;
    setShipmentVersion(v => v + 1);
    setTransferData(mockTransfersMapped);

    setShipmentFiles([{ name: '데모_출하내역.xlsx', count: mockShipments.length }]);
    setClientInfoFile({ name: '데모_거래처기준정보.xlsx' });
    setTargetItemsFile({ name: '데모_대상품목기준.xlsx' });
    setTransferFiles([{ name: '데모_선택양수내역.xls', count: mockTransfers.length }]);
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

  const transferMatchedData = useMemo(() => {
    return matchTransferWithShipments({
      transferList: transferData,
      shipmentList: shipmentData,
      clientInfoList: clientInfoData,
      targetItemList: activeTargetItems,
      completedTransferIds,
      completedDetailsMap
    });
  }, [transferData, shipmentData, clientInfoData, activeTargetItems, completedTransferIds, completedDetailsMap]);

  const toggleTransferComplete = (id) => {
    const isCompleting = !completedTransferIds.includes(id);
    if (isCompleting) {
      const currentMatched = transferMatchedData?.transferSummary?.find(t => t.id === id);
      if (currentMatched) {
        setCompletedDetailsMap(prevMap => ({
          ...prevMap,
          [id]: {
            matchedQty: currentMatched.matchedQty,
            matchedDetails: currentMatched.matchedDetails
          }
        }));
      }
      setCompletedTransferIds(prev => [...prev, id]);
    } else {
      setCompletedDetailsMap(prevMap => {
        const next = { ...prevMap };
        delete next[id];
        return next;
      });
      setCompletedTransferIds(prev => prev.filter(x => x !== id));
    }
  };

  const restoreCompletedTransfers = (ids, detailsMap = {}) => {
    if (!Array.isArray(ids)) {
      alert('올바른 백업 파일 형식이 아닙니다.');
      return;
    }

    // 신규 ID 매핑 정보 생성 { [oldId]: newId }
    const oldToNewMap = {};

    ids.forEach(oldId => {
      // 1. 이미 동일한 ID가 transferData 에 존재한다면 매칭
      if (transferData.some(row => row.id === oldId)) {
        oldToNewMap[oldId] = oldId;
        return;
      }

      const detail = detailsMap[oldId];
      
      // 2. transferMeta 가 존재한다면 비즈니스 키 기반 스마트 매칭
      if (detail && detail.transferMeta) {
        const meta = detail.transferMeta;
        const foundByMeta = transferData.find(row => 
          String(row.declarationNo).trim() === String(meta.declarationNo).trim() &&
          String(row.itemName).trim() === String(meta.itemName).trim() &&
          Number(row.targetQty) === Number(meta.targetQty) &&
          String(row.targetDate).replace(/\D/g, '') === String(meta.targetDate).replace(/\D/g, '')
        );
        if (foundByMeta) {
          oldToNewMap[oldId] = foundByMeta.id;
          return;
        }
      }

      // 3. 비즈니스 키 매칭이 실패했거나 없는 경우, suffix (행번호) 기반 매칭
      const suffix = getPureSuffix(oldId);
      const foundBySuffix = transferData.find(row => getPureSuffix(row.id) === suffix);
      if (foundBySuffix) {
        oldToNewMap[oldId] = foundBySuffix.id;
        return;
      }

      // 4. 모두 실패한 경우 구형 ID 그대로 유지
      oldToNewMap[oldId] = oldId;
    });

    const normalizedIds = ids.map(id => oldToNewMap[id] || id);

    const normalizedDetailsMap = {};
    Object.keys(detailsMap).forEach(key => {
      const newKey = oldToNewMap[key] || key;
      normalizedDetailsMap[newKey] = detailsMap[key];
    });

    setCompletedTransferIds(normalizedIds);
    setCompletedDetailsMap(normalizedDetailsMap);
    alert(`성공적으로 복구되었습니다. (총 ${normalizedIds.length}건)`);
  };

  return {
    // Files & Data state
    isLoaded,
    isDbLoading,
    shipmentFiles,
    shipmentDateRange,
    clientInfoFile,
    targetItemsFile,
    transferFiles,
    shipmentData,
    completedTransferIds,
    completedDetailsMap,
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
    handleClearAllShipments,
    handleClearAllTransfers,
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
