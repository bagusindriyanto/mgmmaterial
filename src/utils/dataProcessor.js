import Papa from 'papaparse';
import { addDays, differenceInDays, isValid, parse, format, getWeek } from 'date-fns';
import { id } from 'date-fns/locale';

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/);
      const headerIndex = lines.findIndex(line => line.includes('PIC') && line.includes('Code'));
      const startIndex = headerIndex !== -1 ? headerIndex : 0;
      const actualCSVText = lines.slice(startIndex).join('\n');

      Papa.parse(actualCSVText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      });
    };
    reader.onerror = () => reject(new Error("Gagal membaca isi file."));
    reader.readAsText(file);
  });
};

const normalizeMonthCasing = (str) => {
  if (!str) return '';
  return str.split(/(\s+|-|\/)/).map(part => {
    if (/^[a-zA-Z]+$/.test(part)) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
    return part;
  }).join('');
};

const parseFlexibleDate = (dateStr) => {
  if (!dateStr) return null;
  let cleanStr = dateStr.trim();
  
  if (cleanStr.includes('/')) {
    const slashFormats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy', 'd/M/yy'];
    for (let fmt of slashFormats) {
      let parsed = parse(cleanStr, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }
    return null; 
  }

  cleanStr = normalizeMonthCasing(cleanStr);
  const formatsToTry = [
    'd MMMM yy', 'd MMMM yyyy', 'd MMM yy', 'dd-MM-yyyy', 'd-M-yyyy'
  ];

  for (let fmt of formatsToTry) {
    let parsed = parse(cleanStr, fmt, new Date());
    if (isValid(parsed)) return parsed;

    parsed = parse(cleanStr, fmt, new Date(), { locale: id });
    if (isValid(parsed)) return parsed;
  }

  let parsed = new Date(cleanStr);
  if (isValid(parsed) && parsed.getFullYear() > 2000) return parsed;

  return null;
};

export const processDashboardData = (outsData, poData, monitoringAPIResult, bookData) => {
  
  // 1. MEMBANGUN GLOBAL PO POOL (Akumulasi sisa kedatangan PO Supplier)
  const globalPoPool = {};
  poData.forEach((row) => {
    const code = row['Code']?.trim();
    const balAct = parseFloat(row['Bal Act']) || 0;
    const qtyPo = parseFloat(row['Qty']) || 0;
    const activePoQty = balAct > 0 ? balAct : qtyPo; // Prioritaskan sisa outstanding kedatangan PO
    
    if (code && activePoQty > 0) { 
      const cleanCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!globalPoPool[cleanCode]) {
        globalPoPool[cleanCode] = {
          poNo: row['PO#'] || 'Unknown PO',
          supplier: row['Supplier'] || '-',
          eta: row['ETA'] || '-',
          remainingQty: 0
        };
      }
      globalPoPool[cleanCode].remainingQty += activePoQty;
    }
  });

  // 2. MEMBANGUN GLOBAL FREE STOCK POOL (Dari Book.csv Kolom H)
  const globalFreeStockPool = {};
  if (bookData && bookData.length > 0) {
    bookData.forEach((row) => {
      const idVal = row['ID']?.trim();
      const codeVal = row['Code']?.trim();
      const freeStock = parseFloat(row['Qty Cons Free Book']) || 0;
      
      if (idVal) {
        const cleanId = idVal.toLowerCase().replace(/[^a-z0-9]/g, '');
        globalFreeStockPool[cleanId] = (globalFreeStockPool[cleanId] || 0) + freeStock;
      }
      if (codeVal) {
        const cleanCode = codeVal.toLowerCase().replace(/[^a-z0-9]/g, '');
        globalFreeStockPool[cleanCode] = (globalFreeStockPool[cleanCode] || 0) + freeStock;
      }
    });
  }

  // 3. MAP API EX FACT GOOGLE SHEET
  const normalizedMonitoring = {};
  if (monitoringAPIResult) {
    Object.keys(monitoringAPIResult).forEach((originalKey) => {
      const cleanKey = originalKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (monitoringAPIResult[originalKey] && monitoringAPIResult[originalKey].trim() !== '') {
        normalizedMonitoring[cleanKey] = monitoringAPIResult[originalKey].trim();
      }
    });
  }

  // 4. STRATEGI UTAMA: KELOMPOKKAN RAW DATA BERDASARKAN SPO UNTUK DIURUTKAN CHRONOLOGICAL
  const rawSpoGroups = {};
  outsData.forEach((row) => {
    const spo = row['SPO#']?.trim();
    if (!spo || spo === 'Internal PO' || spo === 'SPO#') return;
    
    if (!rawSpoGroups[spo]) {
      rawSpoGroups[spo] = {
        spo: spo,
        product: row['Product'] || 'Unknown Product',
        pStartRaw: row['P. Start'],
        pFinishRaw: row['P. Finish'],
        rows: []
      };
    }
    rawSpoGroups[spo].rows.push(row);
  });

  // Ubah group objek menjadi array lalu urutkan berdasarkan PLAN START TERAWAL (Alokasi Prioritas Utama)
  const sortedSPOs = Object.values(rawSpoGroups).map(spoObj => {
    const pStartDate = parseFlexibleDate(spoObj.pStartRaw);
    const pFinishDate = parseFlexibleDate(spoObj.pFinishRaw);
    const cleanSpoLookupKey = spoObj.spo.toLowerCase().replace(/[^a-z0-9]/g, '');
    const exFactRaw = normalizedMonitoring[cleanSpoLookupKey]; 
    const exFactDate = parseFlexibleDate(exFactRaw);
    const displayExFact = exFactDate ? format(exFactDate, 'yyyy-MM-dd') : (exFactRaw || 'N/A');

    return {
      ...spoObj,
      pStartDateObj: pStartDate,
      pFinishDateObj: pFinishDate,
      exFactDateObj: exFactDate,
      pStart: pStartDate ? format(pStartDate, 'yyyy-MM-dd') : 'N/A',
      pFinish: pFinishDate ? format(pFinishDate, 'yyyy-MM-dd') : 'N/A',
      exFact: displayExFact,
      groups: new Set(),
      materials: [],
      hasBalance: false
    };
  }).sort((a, b) => {
    if (!a.pStartDateObj) return 1;
    if (!b.pStartDateObj) return -1;
    return a.pStartDateObj - b.pStartDateObj; // Urutan Ascending (Earliest First)
  });

  // TRACKER RIWAYAT KONSUMSI ALOKASI CROSS-SPO
  const globalAllocationHistory = {};

  // 5. PROSES SIMULASI DEDUCTION BERTINGKAT SECARA BERURUTAN (PEMBENAHAN DI SINI)
  sortedSPOs.forEach((spoItem) => {
    
    spoItem.rows.forEach((row) => {
      const outsQty = parseFloat(row['Cons Bal Actual']) || 0;
      if (outsQty <= 0) return;

      const rowKeys = Object.keys(row);
      let typeGroupKey = rowKeys.find((k, idx) => idx === 12 || k.toLowerCase().includes('type group'));
      const typeGroup = typeGroupKey ? row[typeGroupKey]?.trim() : '-';
      
      if (typeGroup && typeGroup !== '-') spoItem.groups.add(typeGroup);

      const colADKey = rowKeys[29];
      const qtyBook = parseFloat(row[colADKey]) || 0;

      const code = row['Code']?.trim();
      const cleanCodeLookup = code ? code.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      
      // Deteksi satuan/unit secara dinamis dari file outstanding
      const unit = row['Unit'] || row['UOM'] || row['UM'] || 'MTR';

      // Ambil String Catatan jika material ini pernah dipakai SPO terdahulu
      const historyArr = globalAllocationHistory[cleanCodeLookup] || [];
      const historyText = historyArr.length > 0 
        ? ` [⚠️ Dibagi dg SPO terdahulu: ${historyArr.map(h => `${h.spo} (${h.qty.toFixed(0)} Qty)`).join(', ')}]`
        : "";

      let statusText = '';
      let statusType = '';
      
      // Inisialisasi variabel pecahan kuantitas untuk summary halaman sebelah kanan
      let allocGudang = 0;
      let allocFree = 0;
      let allocPoReady = 0;
      let allocPoNeed = 0;

      // TINGKAT 1: Saringan Alokasi Khusus Internal Baris Row (Col AD)
      if (qtyBook >= outsQty) {
        statusText = 'Sudah di-book / gudang keluarkan';
        statusType = 'booked';
        allocGudang = outsQty;
      } else {
        allocGudang = qtyBook;
        const netShortage = outsQty - qtyBook; // Kekurangan riil yang butuh sokongan global
        let currentFreeGlobal = globalFreeStockPool[cleanCodeLookup] || 0;

        // TINGKAT 2: Saringan Penyerapan Free Stock Global (Book.csv Kolom H)
        if (currentFreeGlobal >= netShortage) {
          statusText = `Cukup di-cover Free Stock (Sisa Free Global: ${(currentFreeGlobal - netShortage).toFixed(1)})${historyText}`;
          statusType = 'freestock_cukup';
          allocFree = netShortage;
          
          // Potong Kuota Pool Global & Catat Log Sejarah Alokasi
          globalFreeStockPool[cleanCodeLookup] -= netShortage;
          if (!globalAllocationHistory[cleanCodeLookup]) globalAllocationHistory[cleanCodeLookup] = [];
          globalAllocationHistory[cleanCodeLookup].push({ spo: spoItem.spo, qty: netShortage });
        } else {
          // Jika Free stock global tidak cukup atau bernilai 0
          let takenFree = currentFreeGlobal;
          allocFree = takenFree;
          if (takenFree > 0) {
            globalFreeStockPool[cleanCodeLookup] = 0;
            if (!globalAllocationHistory[cleanCodeLookup]) globalAllocationHistory[cleanCodeLookup] = [];
            globalAllocationHistory[cleanCodeLookup].push({ spo: spoItem.spo, qty: takenFree });
          }

          const shortageAfterFree = netShortage - takenFree;
          const po = globalPoPool[cleanCodeLookup];
          const freePrefix = takenFree > 0 ? `Free Stock Kurang (Ambil: ${takenFree.toFixed(1)}). ` : "Free Stock Kosong. ";

          // TINGKAT 3: Saringan Kekurangan Ditutupi Kedatangan PO Supplier
          if (po && po.remainingQty > 0) {
            let availablePoQty = po.remainingQty;
            
            if (availablePoQty >= shortageAfterFree) {
              // PO Cukup menutupi sisa kekurangan
              statusText = `${freePrefix}Sisa kurang ${shortageAfterFree.toFixed(1)} TERPENUHI Sesuai PO: ${po.poNo} (Sisa PO Global: ${(availablePoQty - shortageAfterFree).toFixed(1)})${historyText}`;
              statusType = 'freestock_kurang_po';
              allocPoReady = shortageAfterFree;
              
              po.remainingQty -= shortageAfterFree;
            } else {
              // PO Ada tetapi kuotanya MASIH KURANG menutupi sisa kekurangan
              const finalNetShortage = shortageAfterFree - availablePoQty;
              statusText = `${freePrefix}Sisa kurang ${shortageAfterFree.toFixed(1)} -> Tercover PO: ${po.poNo} sebesar ${availablePoQty.toFixed(1)} butuh KEKURANGAN DATANG: ${finalNetShortage.toFixed(1)}${historyText}`;
              statusType = 'freestock_kurang_belum_po';
              allocPoReady = availablePoQty;
              allocPoNeed = finalNetShortage;
              
              po.remainingQty = 0;
            }
          } else {
            // Sama sekali tidak ada PO penopang
            statusText = `${freePrefix}Sisa kurang ${shortageAfterFree.toFixed(1)} -> 🛑 KEKURANGAN DATANG: ${shortageAfterFree.toFixed(1)} (BELUM PO)${historyText}`;
            statusType = 'not_ordered';
            allocPoNeed = shortageAfterFree;
          }
        }
      }

      // Tandai SPO memiliki kendala balance jika ada material yang kuota PO/Stoknya tidak mencukupi target
      if (statusType === 'not_ordered' || statusType === 'freestock_kurang_belum_po') {
        spoItem.hasBalance = true;
      }

      spoItem.materials.push({
        code: code,
        name: row['Name'] || row['Detail'],
        group: typeGroup,
        qty: outsQty,
        qtyBook: qtyBook,
        unit: unit, // Dipertahankan untuk penarikan summary unit
        statusText,
        statusType,
        // Injeksi kuantitas pecahan numerik untuk diproses di App.jsx sisi kanan
        allocGudang,
        allocFree,
        allocPoReady,
        allocPoNeed
      });
    });
  });

  // 6. METADATA CALCULATION & RISK SCORE FOR DASHBOARD VIEW
  const today = new Date(); 
  const finalDashboardData = sortedSPOs.map((spo) => {
    const pStartDate = spo.pStartDateObj;
    const daysLeft = pStartDate ? differenceInDays(today, pStartDate) : 0;
    
    let level = 'Low';
    if (spo.hasBalance) {
      if (daysLeft >= 0) level = 'Critical'; 
      else if (daysLeft >= -7) level = 'Warning';  
    }

    const getWkStr = (dateObj) => dateObj && isValid(dateObj) ? `Wk ${getWeek(dateObj)}` : '';
    
    let isDelayRisk = false;
    if (spo.pFinishDateObj && spo.exFactDateObj && isValid(spo.pFinishDateObj) && isValid(spo.exFactDateObj)) {
      if (spo.pFinishDateObj > spo.exFactDateObj) {
        isDelayRisk = true;
      }
    }

    return { 
      ...spo, 
      groups: Array.from(spo.groups), 
      daysLeft: isNaN(daysLeft) ? 0 : daysLeft, 
      level,
      pStartWk: getWkStr(spo.pStartDateObj),
      pFinishWk: getWkStr(spo.pFinishDateObj),
      exFactWk: getWkStr(spo.exFactDateObj),
      isDelayRisk
    };
  });

  // Re-sort data tampilan agar yang berstatus Critical / Delay Risk tetap memimpin baris teratas tabel
  return finalDashboardData.sort((a, b) => {
    if (a.isDelayRisk !== b.isDelayRisk) return b.isDelayRisk - a.isDelayRisk;
    return b.daysLeft - a.daysLeft;
  });
};