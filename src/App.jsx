import { useState, useEffect } from 'react';
import { parseCSV, processDashboardData } from './utils/dataProcessor';

// Import komponen UI bawaan
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';
import SpoTable from './components/SpoTable';

// Import Firebase & SweetAlert2
import { db } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import {
  Save,
  Filter,
  Search,
  Calendar,
  Layers,
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import Header from './components/Header';

function App() {
  const [outsFile, setOutsFile] = useState(null);
  const [poFile, setPoFile] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [data, setData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 🧭 State Navigasi Tab Utama
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' atau 'schedule'

  // Filter Halaman 1 (Material Monitoring)
  const [filterSPO, setFilterSPO] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [pStartFrom, setPStartFrom] = useState('');
  const [pStartTo, setPStartTo] = useState('');
  const [exFactFrom, setExFactFrom] = useState('');
  const [exFactTo, setExFactTo] = useState('');
  const [filterMatStatus, setFilterMatStatus] = useState('');
  const [filterMatType, setFilterMatType] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    spo: '',
    product: '',
    pStartFrom: '',
    pStartTo: '',
    exFactFrom: '',
    exFactTo: '',
    materialStatus: '',
    materialType: '',
  });

  // Filter Halaman 2 (SPO Schedule & Allocation Summary)
  const [schedFilterSPO, setSchedFilterSPO] = useState('');
  const [schedStartFrom, setSchedStartFrom] = useState('');
  const [schedStartTo, setSchedStartTo] = useState('');
  const [schedExFrom, setSchedExFrom] = useState('');
  const [schedExTo, setSchedExTo] = useState('');

  const [appliedSchedFilters, setAppliedSchedFilters] = useState({
    spo: '',
    startFrom: '',
    startTo: '',
    exFrom: '',
    exTo: '',
  });

  const uniqueMaterialTypes = Array.from(
    new Set(data.flatMap((item) => item.materials?.map((m) => m.group) || [])),
  )
    .filter((type) => type && type !== '-')
    .sort();

  useEffect(() => {
    loadFromFirebase(true);
  }, []);

  const loadFromFirebase = async (isInitialLoad = false) => {
    if (!isInitialLoad) {
      Swal.fire({
        title: 'Sinkronisasi Server...',
        text: 'Menarik data terbaru',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
    }
    try {
      const querySnapshot = await getDocs(
        collection(db, 'shipment_monitoring'),
      );
      const firebaseData = [];
      querySnapshot.forEach((doc) => {
        firebaseData.push(doc.data());
      });
      setData(firebaseData.sort((a, b) => a.daysLeft - b.daysLeft));
      if (!isInitialLoad) Swal.close();
    } catch (error) {
      Swal.fire('Error', 'Gagal menarik data.', 'error');
    }
  };

  const handleProcessCSV = async () => {
    if (!outsFile || !poFile || !bookFile) {
      return Swal.fire(
        'Peringatan',
        'Harap upload file Outs, PO, dan Book sekaligus!',
        'warning',
      );
    }
    setIsProcessing(true);
    Swal.fire({
      title: 'Menyinkronkan Data...',
      text: 'Memetakan alokasi silang logistik pabrik...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const gasUrl =
        'https://script.google.com/macros/s/AKfycbwf2SLLQRtjUNLSaHTqUcdWlULexrYa7Je3PVgILaCgsdDHIttGFhNYd7dsQ-awC15l/exec'; // Ganti URL GAS Anda di sini
      const [monitoringAPIResult, outsData, poData, bookData] =
        await Promise.all([
          fetch(gasUrl).then((response) => response.json()),
          parseCSV(outsFile),
          parseCSV(poFile),
          parseCSV(bookFile),
        ]);

      // const response = await fetch(gasUrl);
      // const monitoringAPIResult = await response.json();

      // const outsData = await parseCSV(outsFile);
      // const poData = await parseCSV(poFile);
      // const bookData = await parseCSV(bookFile);

      const processed = processDashboardData(
        outsData,
        poData,
        monitoringAPIResult,
        bookData,
      );
      setData(processed);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Database dialokasikan!',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        'Error Handling CSV',
        error.message || 'Gagal memproses.',
        'error',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToFirebase = async () => {
    if (data.length === 0)
      return Swal.fire('Kosong', 'Tidak ada data!', 'warning');
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      data.forEach((spoItem) => {
        const safeId = spoItem.spo.replace(/\//g, '-');
        const docRef = doc(db, 'shipment_monitoring', safeId);
        batch.set(docRef, spoItem);
      });
      await batch.commit();
      Swal.fire('Tersimpan!', 'Data berhasil disimpan.', 'success');
    } catch (error) {
      Swal.fire('Error', 'Gagal menyimpan.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Filter Halaman 1
  const handleApplyFilter = () => {
    Swal.fire({
      title: 'Memfilter Data...',
      text: 'Menyinkronkan tabel material',
      allowOutsideClick: false,
      timer: 400,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
      willClose: () => {
        setAppliedFilters({
          spo: filterSPO,
          product: filterProduct,
          pStartFrom,
          pStartTo,
          exFactFrom,
          exFactTo,
          materialStatus: filterMatStatus,
          materialType: filterMatType,
        });
      },
    });
  };

  // Trigger Filter Halaman 2 (Jadwal)
  const handleApplySchedFilter = () => {
    Swal.fire({
      title: 'Menyaring Jadwal...',
      text: 'Mengakumulasi kebutuhan purchasing',
      allowOutsideClick: false,
      timer: 500,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
      willClose: () => {
        setAppliedFilters({
          spo: '',
          product: '',
          pStartFrom: '',
          pStartTo: '',
          exFactFrom: '',
          exFactTo: '',
          materialStatus: '',
          materialType: '',
        }); // Clear page 1 state filter context
        setAppliedSchedFilters({
          spo: schedFilterSPO,
          startFrom: schedStartFrom,
          startTo: schedStartTo,
          exFrom: schedExFrom,
          exTo: schedExTo,
        });
      },
    });
  };

  const clearSchedFilters = () => {
    setSchedFilterSPO('');
    setSchedStartFrom('');
    setSchedStartTo('');
    setSchedExFrom('');
    setSchedExTo('');
    setAppliedSchedFilters({
      spo: '',
      startFrom: '',
      startTo: '',
      exFrom: '',
      exTo: '',
    });
  };

  // --- LOGIKA FILTER TABEL HALAMAN 1 ---
  const filteredDataTab1 = data
    .map((item) => {
      const filteredMaterials =
        item.materials?.filter((mat) => {
          if (
            appliedFilters.materialType &&
            mat.group !== appliedFilters.materialType
          )
            return false;
          if (appliedFilters.materialStatus) {
            const status = appliedFilters.materialStatus;
            if (status === 'sudah_book' && mat.statusType !== 'booked')
              return false;
            if (
              status === 'free_stock' &&
              !mat.statusType.includes('freestock')
            )
              return false;
            if (
              status === 'belum_po' &&
              mat.statusType !== 'not_ordered' &&
              mat.statusType !== 'freestock_kurang_belum_po'
            )
              return false;
          }
          return true;
        }) || [];
      return {
        ...item,
        materials: filteredMaterials,
        groups: Array.from(new Set(filteredMaterials.map((m) => m.group))),
      };
    })
    .filter((item) => {
      const matchSPO = item.spo
        .toLowerCase()
        .includes(appliedFilters.spo.toLowerCase());
      const matchProduct = item.product
        .toLowerCase()
        .includes(appliedFilters.product.toLowerCase());
      let matchDates = true;
      if (
        appliedFilters.pStartFrom &&
        new Date(item.pStart) < new Date(appliedFilters.pStartFrom)
      )
        matchDates = false;
      if (
        appliedFilters.pStartTo &&
        new Date(item.pStart) > new Date(appliedFilters.pStartTo)
      )
        matchDates = false;
      if (
        appliedFilters.exFactFrom &&
        item.exFact !== 'N/A' &&
        new Date(item.exFact) < new Date(appliedFilters.exFactFrom)
      )
        matchDates = false;
      if (
        appliedFilters.exFactTo &&
        item.exFact !== 'N/A' &&
        new Date(item.exFact) > new Date(appliedFilters.exFactTo)
      )
        matchDates = false;
      return (
        matchSPO &&
        matchProduct &&
        matchDates &&
        (appliedFilters.materialStatus || appliedFilters.materialType
          ? item.materials.length > 0
          : true)
      );
    });

  // --- LOGIKA FILTER TABEL HALAMAN 2 (SCHEDULE) ---
  const filteredDataTab2 = data.filter((item) => {
    const matchSPO = item.spo
      .toLowerCase()
      .includes(appliedSchedFilters.spo.toLowerCase());
    let matchDates = true;
    if (
      appliedSchedFilters.startFrom &&
      new Date(item.pStart) < new Date(appliedSchedFilters.startFrom)
    )
      matchDates = false;
    if (
      appliedSchedFilters.startTo &&
      new Date(item.pStart) > new Date(appliedSchedFilters.startTo)
    )
      matchDates = false;
    if (
      appliedSchedFilters.exFrom &&
      item.exFact !== 'N/A' &&
      new Date(item.exFact) < new Date(appliedSchedFilters.exFrom)
    )
      matchDates = false;
    if (
      appliedSchedFilters.exTo &&
      item.exFact !== 'N/A' &&
      new Date(item.exFact) > new Date(appliedSchedFilters.exTo)
    )
      matchDates = false;
    return matchSPO && matchDates;
  });

  // --- 🧮 ENGINE AGREGASI MATERIAL TERPUSAT (UNTUK PURCHASING & INVENTORY) ---
  const aggregateMaterials = () => {
    const summary = { gudang: {}, free: {}, poReady: {}, poNeed: {} };

    filteredDataTab2.forEach((spo) => {
      spo.materials?.forEach((mat) => {
        const key = `${mat.code || mat.name}_${mat.unit}`;
        const label = `${mat.name} (${mat.code || '-'})`;

        const addValue = (bucket, q) => {
          if (q <= 0) return;
          if (!bucket[key]) bucket[key] = { label, qty: 0, unit: mat.unit };
          bucket[key].qty += q;
        };

        addValue(summary.gudang, mat.allocGudang);
        addValue(summary.free, mat.allocFree);
        addValue(summary.poReady, mat.allocPoReady);
        addValue(summary.poNeed, mat.allocPoNeed);
      });
    });

    return {
      gudang: Object.values(summary.gudang),
      free: Object.values(summary.free),
      poReady: Object.values(summary.poReady),
      poNeed: Object.values(summary.poNeed),
    };
  };

  const matSummary = aggregateMaterials();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Dashboard */}
        <Header onClick={loadFromFirebase} />

        {/* Upload Container Component */}
        <section>
          <FileUploader
            setOutsFile={setOutsFile}
            setPoFile={setPoFile}
            setBookFile={setBookFile}
            onProcess={handleProcessCSV}
            isProcessing={isProcessing}
          />
        </section>

        {/* 🧭 NAVIGATION TABS BARU */}
        {data.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-slate-200/60 p-1.5 rounded-lg border border-slate-300/40">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold rounded-md transition-all w-full sm:w-auto ${activeTab === 'monitoring' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers size={16} /> Material Monitoring
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold rounded-md transition-all w-full sm:w-auto ${activeTab === 'schedule' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Calendar size={16} /> Jadwal & Ringkasan Material
              </button>
            </div>
            <button
              onClick={saveToFirebase}
              className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-sm text-sm hover:not-disabled:bg-emerald-700 flex items-center gap-2 shadow-sm font-bold w-full sm:w-auto justify-center transition-colors"
            >
              <Save size={16} /> Save Server Data
            </button>
          </div>
        )}

        {/* VIEW 1: MATERIAL MONITORING PAGE */}
        {data.length > 0 && activeTab === 'monitoring' && (
          <section className="animate-in fade-in duration-300">
            {/* Filter Panel Monitoring */}
            <div className="bg-white p-5 rounded-lg shadow-xs border border-slate-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs mb-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Cari SPO
                  </label>
                  <input
                    type="text"
                    value={filterSPO}
                    onChange={(e) => setFilterSPO(e.target.value)}
                    placeholder="Contoh: R0181..."
                    className="w-full border border-slate-300 rounded-sm px-3 py-1.5 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Cari Product
                  </label>
                  <input
                    type="text"
                    value={filterProduct}
                    onChange={(e) => setFilterProduct(e.target.value)}
                    placeholder="Nama Produk"
                    className="w-full border border-slate-300 rounded-sm px-3 py-1.5 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Plan Start Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={pStartFrom}
                      onChange={(e) => setPStartFrom(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={pStartTo}
                      onChange={(e) => setPStartTo(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Plan Shipment Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={exFactFrom}
                      onChange={(e) => setExFactFrom(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={exFactTo}
                      onChange={(e) => setExFactTo(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">
                    Status Ketersediaan Material
                  </label>
                  <select
                    value={filterMatStatus}
                    onChange={(e) => setFilterMatStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-sm px-3 py-1.5 bg-white text-slate-700 font-semibold focus:outline-blue-500"
                  >
                    <option value="">-- Semua Status --</option>
                    <option value="sudah_book">
                      Sudah Book / Keluar Gudang
                    </option>
                    <option value="free_stock">
                      Ada Free Stock (Cukup / Kurang)
                    </option>
                    <option value="belum_po">Belum PO (Kritikal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">
                    Type Material (Col M)
                  </label>
                  <select
                    value={filterMatType}
                    onChange={(e) => setFilterMatType(e.target.value)}
                    className="w-full border border-slate-300 rounded-sm px-3 py-1.5 bg-white text-slate-700 font-semibold focus:outline-blue-500"
                  >
                    <option value="">-- Semua Tipe --</option>
                    {uniqueMaterialTypes.map((type, i) => (
                      <option key={i} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end border-t pt-3">
                <button
                  onClick={handleApplyFilter}
                  className="bg-blue-600 text-white px-5 py-2 rounded-sm text-xs font-bold hover:bg-blue-700 flex items-center gap-2 shadow-xs"
                >
                  <Search size={14} /> Mulai Filter
                </button>
              </div>
            </div>
            <Dashboard data={filteredDataTab1} />
            <SpoTable data={filteredDataTab1} />
          </section>
        )}

        {/* 📅 VIEW 2: HALAMAN BARU (SPO SCHEDULE & PURCHASING GUIDE SUMMARY) */}
        {data.length > 0 && activeTab === 'schedule' && (
          <section className="animate-in slide-in-from-bottom duration-400 space-y-6">
            {/* Panel Filter Khusus Halaman Jadwal */}
            <div className="bg-white p-5 rounded-lg shadow-xs border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold border-b pb-2 text-sm">
                <Filter size={16} />{' '}
                <h3>Filter Jadwal & Ringkasan Kebutuhan</h3>
                <button
                  onClick={clearSchedFilters}
                  className="ml-auto text-xs text-red-500 hover:underline font-normal"
                >
                  Reset Filter
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Saring Nomor SPO
                  </label>
                  <input
                    type="text"
                    value={schedFilterSPO}
                    onChange={(e) => setSchedFilterSPO(e.target.value)}
                    placeholder="Masukkan kode SPO..."
                    className="w-full border border-slate-300 rounded-sm px-3 py-1.5 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Rentang Tanggal Start Production
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={schedStartFrom}
                      onChange={(e) => setSchedStartFrom(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                    <span>s/d</span>
                    <input
                      type="date"
                      value={schedStartTo}
                      onChange={(e) => setSchedStartTo(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Rentang Tanggal Shipment (Ex-Fact)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={schedExFrom}
                      onChange={(e) => setSchedExFrom(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                    <span>s/d</span>
                    <input
                      type="date"
                      value={schedExTo}
                      onChange={(e) => setSchedExTo(e.target.value)}
                      className="w-full border border-slate-300 rounded-sm px-2 py-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleApplySchedFilter}
                  className="bg-blue-600 text-white px-5 py-2 rounded-sm text-xs font-bold hover:bg-blue-700 flex items-center gap-2 shadow-xs"
                >
                  <Search size={14} /> Terapkan Filter Jadwal
                </button>
              </div>
            </div>

            {/* Layout Grid Berdampingan: Kiri Jadwal SPO, Kanan Rekapitulasi Pembelian Material */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* SISI KIRI: Tabel Jadwal Running SPO (6/12 Grid) */}
              <div className="lg:col-span-6 bg-white rounded-lg shadow-xs border border-gray-200 p-4">
                <h3 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" /> Matrix Jadwal
                  Produksi SPO ({filteredDataTab2.length} Record)
                </h3>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b shadow-xs z-10">
                      <tr>
                        <th className="p-3">SPO & Product</th>
                        <th className="p-3">Plan Start</th>
                        <th className="p-3">Plan Finish</th>
                        <th className="p-3">Shipment (ExFact)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {filteredDataTab2.map((spo, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50 ${spo.isDelayRisk ? 'bg-red-50/40 text-red-900' : 'text-slate-800'}`}
                        >
                          <td className="p-3">
                            <div className="font-bold flex items-center gap-1.5">
                              {spo.spo}
                              {spo.isDelayRisk && (
                                <span className="bg-red-600 text-white text-[8px] px-1 rounded-sm font-black">
                                  DELAY
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-[220px]">
                              {spo.product}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {spo.pStart}{' '}
                            <span className="text-[10px] font-bold text-slate-400 block">
                              {spo.pStartWk}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-semibold">
                            {spo.pFinish}{' '}
                            <span className="text-[10px] font-bold text-slate-400 block">
                              {spo.pFinishWk}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-bold">
                            {spo.exFact}{' '}
                            <span className="text-[10px] font-bold text-purple-600 block">
                              {spo.exFactWk}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredDataTab2.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center p-8 text-gray-400 italic"
                          >
                            Tidak ada jadwal cocok dengan kriteria filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SISI KANAN: Rekapitulasi Kolektif Kebutuhan Material Gudang & Purchasing (6/12 Grid) */}
              <div className="lg:col-span-6 space-y-4">
                {/* Pos 1: Perlu Dikeluarkan Gudang */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 border-l-4 border-l-emerald-500 p-4">
                  <h4 className="text-xs font-black text-emerald-800 uppercase flex items-center gap-2 mb-2 tracking-wider">
                    <Package size={14} /> 1. Perlu Dikeluarkan Gudang (Alokasi
                    Ter-Book)
                  </h4>
                  <div className="max-h-36 overflow-y-auto text-xs space-y-1.5 pr-1">
                    {matSummary.gudang.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-sm border border-emerald-100/50 font-medium"
                      >
                        <span className="text-slate-700 truncate max-w-[320px]">
                          {m.label}
                        </span>
                        <span className="font-bold text-emerald-700 whitespace-nowrap">
                          {m.qty.toFixed(2)} {m.unit}
                        </span>
                      </div>
                    ))}
                    {matSummary.gudang.length === 0 && (
                      <p className="text-gray-400 italic text-[11px] p-2">
                        Kosong / tidak ada komponen.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pos 2: Perlu Diambil Dari Free Stock */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 border-l-4 border-l-cyan-500 p-4">
                  <h4 className="text-xs font-black text-cyan-800 uppercase flex items-center gap-2 mb-2 tracking-wider">
                    <Layers size={14} /> 2. Perlu Diambil Dari Free Stock Global
                  </h4>
                  <div className="max-h-36 overflow-y-auto text-xs space-y-1.5 pr-1">
                    {matSummary.free.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-cyan-50/50 p-2 rounded-sm border border-cyan-100/50 font-medium"
                      >
                        <span className="text-slate-700 truncate max-w-[320px]">
                          {m.label}
                        </span>
                        <span className="font-bold text-cyan-700 whitespace-nowrap">
                          {m.qty.toFixed(2)} {m.unit}
                        </span>
                      </div>
                    ))}
                    {matSummary.free.length === 0 && (
                      <p className="text-gray-400 italic text-[11px] p-2">
                        Kosong / tidak ada komponen.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pos 3: Perlu Ditunggu PO Datang */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 border-l-4 border-l-amber-500 p-4">
                  <h4 className="text-xs font-black text-amber-800 uppercase flex items-center gap-2 mb-2 tracking-wider">
                    <Truck size={14} /> 3. Perlu Ditunggu Kedatangan PO Supplier
                  </h4>
                  <div className="max-h-36 overflow-y-auto text-xs space-y-1.5 pr-1">
                    {matSummary.poReady.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-amber-50/50 p-2 rounded-sm border border-amber-100/50 font-medium"
                      >
                        <span className="text-slate-700 truncate max-w-[320px]">
                          {m.label}
                        </span>
                        <span className="font-bold text-amber-800 whitespace-nowrap">
                          {m.qty.toFixed(2)} {m.unit}
                        </span>
                      </div>
                    ))}
                    {matSummary.poReady.length === 0 && (
                      <p className="text-gray-400 italic text-[11px] p-2">
                        Kosong / tidak ada komponen.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pos 4: Perlu Dibukakan PO Baru */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 border-l-4 border-l-red-500 p-4">
                  <h4 className="text-xs font-black text-red-800 uppercase flex items-center gap-2 mb-2 tracking-wider">
                    <ShoppingCart size={14} /> 4. Perlu Dibukakan PO Baru
                    (Purchasing Guide)
                  </h4>
                  <div className="max-h-36 overflow-y-auto text-xs space-y-1.5 pr-1">
                    {matSummary.poNeed.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-red-50 p-2 rounded-sm border border-red-100 font-medium"
                      >
                        <span className="text-slate-700 truncate max-w-[320px]">
                          {m.label}
                        </span>
                        <span className="font-black text-red-700 whitespace-nowrap">
                          {m.qty.toFixed(2)} {m.unit}
                        </span>
                      </div>
                    ))}
                    {matSummary.poNeed.length === 0 && (
                      <p className="text-emerald-600 font-bold italic text-[11px] p-2">
                        Sempurna! Semua kekurangan sisa produksi sudah di-PO
                        kan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Status Screen Belum Ada Data */}
        {data.length === 0 && (
          <div className="text-center py-20 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
            <AlertTriangle size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg">Belum ada data aktif.</p>
            <p className="text-sm mt-1">
              Silakan upload berkas CSV atau sync server data untuk mengaktifkan
              sistem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
