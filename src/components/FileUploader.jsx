import React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

const FileUploader = ({ setOutsFile, setPoFile, setBookFile, onProcess, isProcessing }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Outs (Material)</label>
          <input type="file" accept=".csv" disabled={isProcessing} onChange={(e) => setOutsFile(e.target.files[0])} 
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">2. Upload PO 2 (Supplier)</label>
          <input type="file" accept=".csv" disabled={isProcessing} onChange={(e) => setPoFile(e.target.files[0])} 
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">3. Upload Book (Free Stock)</label>
          <input type="file" accept=".csv" disabled={isProcessing} onChange={(e) => setBookFile(e.target.files[0])} 
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50" />
        </div>
      </div>
      
      <button onClick={onProcess} disabled={isProcessing} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2 w-full md:w-auto disabled:opacity-70">
        {isProcessing ? <><Loader2 size={20} className="animate-spin" /> Memproses Data...</> : <><UploadCloud size={20} /> Generate Dashboard</>}
      </button>
    </div>
  );
};

export default FileUploader;