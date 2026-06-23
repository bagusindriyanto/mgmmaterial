import { RefreshCwIcon } from 'lucide-react';

const Header = ({ onClick }) => {
  return (
    <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-4 border-slate-200">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          MGM SPO - Material Monitoring
        </h1>
        <p className="text-slate-500 mt-1">
          Material Tracing & Allocation by SPO
        </p>
      </div>
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold bg-blue-100 hover:not-disabled:bg-blue-200 px-4 py-2 rounded-sm transition-colors text-sm shadow-xs"
      >
        <RefreshCwIcon size={14} /> Sync Server Data
      </button>
    </header>
  );
};

export default Header;
