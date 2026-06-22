import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const SpoTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  // State untuk filter interaktif klik Type Group per baris SPO
  const [activeRowFilters, setActiveRowFilters] = useState({});

  const handleGroupClick = (spoId, groupName) => {
    setActiveRowFilters((prev) => {
      const currentFilters = prev[spoId] || [];
      if (currentFilters.includes(groupName)) {
        return { ...prev, [spoId]: currentFilters.filter((g) => g !== groupName) };
      } else {
        return { ...prev, [spoId]: [...currentFilters, groupName] };
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm table-fixed min-w-[1100px] md:table-auto">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4 w-32">Priority</th>
              <th className="p-4 w-1/4">SPO & Product</th>
              <th className="p-4 w-52">Schedule</th>
              <th className="p-4 w-48">Lacking Type Groups</th>
              <th className="p-4">Material Status, Allocation Details & PO ETA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((spo, idx) => {
              const selectedGroups = activeRowFilters[spo.spo] || [];
              const displayedMaterials = selectedGroups.length > 0
                ? spo.materials.filter((mat) => selectedGroups.includes(mat.group))
                : spo.materials;

              return (
                <tr key={idx} className={`hover:bg-slate-50 transition-colors ${spo.isDelayRisk ? 'bg-rose-50/10' : ''}`}>
                  
                  {/* 1. Kolom Priority Status */}
                  <td className="p-4 align-top">
                    {!spo.hasBalance ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-block text-center w-full bg-emerald-100 text-emerald-800 tracking-wider">
                        READY
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block text-center w-full ${
                        spo.level === 'Critical' ? 'bg-red-100 text-red-700' :
                        spo.level === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {spo.level}
                        <span className="block text-[10px] font-normal mt-0.5">
                          {spo.daysLeft >= 0 ? `+${spo.daysLeft} Hari (Lewat)` : `${spo.daysLeft} Hari`}
                        </span>
                      </span>
                    )}
                  </td>
                  
                  {/* 2. Kolom SPO & Product Name */}
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-blue-600 text-base">{spo.spo}</span>
                      {spo.isDelayRisk && (
                        <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded-sm border border-red-200 animate-pulse">
                          <AlertCircle size={10} /> DELAY RISK
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 leading-relaxed wrap-break-word">{spo.product}</div>
                  </td>
                  
                  {/* 3. Kolom Schedule (Include Kalender Kerja Week) */}
                  <td className="p-4 align-top text-xs space-y-1.5">
                    <div>
                      <span className="text-gray-400 inline-block w-12">Start:</span> 
                      <span className="font-medium text-slate-800">{spo.pStart}</span>
                      {spo.pStartWk && <span className="ml-1.5 px-1 bg-slate-100 text-slate-600 rounded-sm text-[10px] font-bold">{spo.pStartWk}</span>}
                    </div>
                    <div className={spo.isDelayRisk ? 'text-red-600 font-bold' : ''}>
                      <span className="text-gray-400 inline-block w-12 font-normal">Finish:</span> 
                      <span>{spo.pFinish}</span>
                      {spo.pFinishWk && <span className="ml-1.5 px-1 bg-slate-100 text-slate-600 rounded-sm text-[10px] font-bold">{spo.pFinishWk}</span>}
                    </div>
                    <div className="pt-1 mt-1 border-t border-gray-100">
                      <span className="text-gray-400 inline-block w-12">ExFact:</span> 
                      <span className="font-bold text-slate-800">{spo.exFact}</span>
                      {spo.exFactWk && <span className="ml-1.5 px-1 bg-purple-50 text-purple-700 rounded-sm text-[10px] font-bold">{spo.exFactWk}</span>}
                    </div>
                    {spo.isDelayRisk && (
                      <div className="text-[10px] text-red-700 font-semibold bg-red-50 p-1 rounded-sm border border-red-100 mt-1 flex items-center gap-1">
                        ⚠️ Finish melebihi Ex-Fact!
                      </div>
                    )}
                  </td>
                  
                  {/* 4. Kolom Interactive Lacking Type Groups */}
                  <td className="p-4 align-top">
                    {spo.groups.length === 0 ? (
                      <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle size={12} /> Alokasi Aman
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {spo.groups.map((g, index) => {
                          const isClicked = selectedGroups.includes(g);
                          return (
                            <span 
                              key={index} 
                              onClick={() => handleGroupClick(spo.spo, g)}
                              className={`cursor-pointer px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-all select-none border ${
                                isClicked 
                                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-200' 
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {g || 'UNGROUPED'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  
                  {/* 5. PEMBENAHAN UTAMA: Tampilan Alokasi Bertingkat Material (Card Layout) */}
                  <td className="p-4 align-top">
                    {spo.materials.length === 0 ? (
                      <div className="text-xs text-emerald-700 font-bold bg-emerald-50/80 p-3 rounded-md text-center border border-emerald-200 flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Material lengkap, siap produksi.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 border border-slate-100 bg-slate-50/40 p-2 rounded-md shadow-inner">
                        {displayedMaterials.map((mat, i) => {
                          // Tentukan warna border dan background kartu berdasarkan status urgensi material
                          let cardBorderColor = 'border-l-slate-400';
                          let statusBgColor = 'bg-slate-50 text-slate-700';
                          
                          if (mat.statusType === 'booked') {
                            cardBorderColor = 'border-l-emerald-500';
                            statusBgColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                          } else if (mat.statusType === 'freestock_cukup') {
                            cardBorderColor = 'border-l-cyan-500';
                            statusBgColor = 'bg-cyan-50 text-cyan-800 border-cyan-100';
                          } else if (mat.statusType === 'freestock_kurang_po' || mat.statusType === 'po') {
                            cardBorderColor = 'border-l-amber-500';
                            statusBgColor = 'bg-amber-50/80 text-amber-900 border-amber-100';
                          } else if (mat.statusType === 'freestock_kurang_belum_po' || mat.statusType === 'not_ordered') {
                            cardBorderColor = 'border-l-red-500 bg-red-50/10';
                            statusBgColor = 'bg-red-50 text-red-900 border-red-100';
                          }

                          return (
                            <div 
                              key={i} 
                              className={`text-xs border-l-4 pl-3 py-2 bg-white rounded-r border-y border-r border-slate-100 shadow-xs space-y-1.5 transition-all ${cardBorderColor}`}
                            >
                              {/* Row Atas: Nama Material & Target Qty */}
                              <div className="font-bold text-slate-800 flex justify-between items-start gap-4">
                                <span className="leading-tight">{mat.name} <span className="text-slate-400 font-normal text-[11px]">({mat.group})</span></span>
                                <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm text-[11px] whitespace-nowrap">
                                  Outs Target: <span className="font-black text-slate-900">{mat.qty}</span>
                                </span>
                              </div>
                              
                              {/* Row Tengah: Informasi Detail Alokasi Lokasi Internal */}
                              <div className="flex items-center gap-4 text-[11px] text-slate-500 border-b border-dashed border-slate-100 pb-1">
                                <div>Code: <span className="font-mono text-slate-700 font-medium">{mat.code || '-'}</span></div>
                                <div>Booked Gudang (Col AD): <span className="font-bold text-slate-700">{mat.qtyBook}</span></div>
                              </div>

                              {/* Row Bawah: Keterangan Narasi Logistik (Bebas Melorot / Word-Wrap Alami) */}
                              <div className={`p-2 rounded-sm border text-[11px] leading-relaxed font-medium ${statusBgColor}`}>
                                {mat.statusType === 'booked' && '✅ '}
                                {mat.statusType === 'freestock_cukup' && '📦 '}
                                {(mat.statusType === 'freestock_kurang_po' || mat.statusType === 'po') && '🚢 '}
                                {(mat.statusType === 'freestock_kurang_belum_po' || mat.statusType === 'not_ordered') && '🛑 '}
                                {mat.statusText}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpoTable;