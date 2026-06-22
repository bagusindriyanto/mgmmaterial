import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const Dashboard = ({ data }) => {
  if (!data || data.length === 0) return null;

  // Kalkulasi data statistik dashboard
  const lackingSPOs = data.filter(item => item.hasBalance).length;
  const readySPOs = data.filter(item => !item.hasBalance).length;
  const delayRiskSPOs = data.filter(item => item.isDelayRisk).length;
  
  const criticalSPOs = data.filter(item => item.hasBalance && item.level === 'Critical').length;
  const warningSPOs = data.filter(item => item.hasBalance && item.level === 'Warning').length;
  const lowSPOs = data.filter(item => item.hasBalance && item.level === 'Low').length;

  return (
    <div className="mb-6 space-y-4">
      {/* Baris Utama: Metrik Baru Ketersediaan SPO Pabrik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-amber-50 text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">SPO Kurang Material</div>
            <div className="text-xl font-bold text-slate-800">
              {lackingSPOs} <span className="text-xs font-normal text-gray-400">SPO</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">SPO Siap (No Balance)</div>
            <div className="text-xl font-bold text-slate-800">
              {readySPOs} <span className="text-xs font-normal text-gray-400">SPO</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-rose-50 text-rose-600">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Resiko Delay (Finish &gt; ExFact)</div>
            <div className="text-xl font-bold text-slate-800">
              {delayRiskSPOs} <span className="text-xs font-normal text-gray-400">SPO</span>
            </div>
          </div>
        </div>

      </div>

      {/* Baris Kedua: Penyusutan Visual Level Risiko (Critical/Warning/Low) */}
      <div className="bg-white p-3 rounded-lg shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="text-gray-500 font-bold tracking-wider uppercase text-[10px]"> Breakdown Tingkat Resiko Outs: </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-gray-600 font-medium">Critical:</span>
            <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-sm">{criticalSPOs}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span className="text-gray-600 font-medium">Warning:</span>
            <span className="font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-sm">{warningSPOs}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            <span className="text-gray-600 font-medium">Low:</span>
            <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-sm">{lowSPOs}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;