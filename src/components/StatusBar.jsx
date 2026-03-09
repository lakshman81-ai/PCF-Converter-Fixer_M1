import React from 'react';

export default function StatusBar({ status, onExportData, onExportPcf, onRunValidator, onSmartFix, onApplyFixes, smartFixState, hasData }) {
  const isFixing = smartFixState.status === "running";
  const isApplying = smartFixState.status === "applying";
  const canSmartFix = hasData && !isFixing && !isApplying;
  const canApply = smartFixState.status === "previewing" && !isApplying;

  return (
    <div className="bg-gray-800 text-white text-sm p-3 flex justify-between items-center shadow-lg relative z-10 w-full fixed bottom-0">
      <div className="flex items-center space-x-4">
        <span className="font-bold text-gray-300">Status: <span className="text-white font-normal">{status}</span></span>
        
        <button disabled={!hasData} onClick={onExportData} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">
          Export Data Table ↓
        </button>
        <button disabled={!hasData} onClick={onExportPcf} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50">
          Export PCF ↓
        </button>
        <button disabled={!hasData} onClick={onRunValidator} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded font-semibold disabled:opacity-50 flex items-center gap-1">
          Run Validator ▶
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          onClick={onSmartFix} 
          disabled={!canSmartFix} 
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded shadow disabled:opacity-50 flex items-center gap-2 transition"
        >
          {isFixing ? "Analyzing..." : "Smart Fix 🔧"}
        </button>
        
        <button 
          onClick={onApplyFixes} 
          disabled={!canApply} 
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 font-bold rounded shadow disabled:opacity-50 flex items-center gap-2 transition"
        >
          {isApplying ? "Applying..." : "Apply Fixes ✓"}
        </button>
        <span className="text-xs text-gray-400 font-mono self-end pl-4 border-l border-gray-600">
          Ver 09-03-2026 15.00
        </span>
      </div>
    </div>
  );
}
