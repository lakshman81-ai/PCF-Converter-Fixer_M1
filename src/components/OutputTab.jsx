import React from 'react';

export default function OutputTab({ pcfText }) {
  const handleExport = () => {
    if (!pcfText) return;
    const blob = new Blob([pcfText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "output.pcf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-white shadow rounded p-4">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-bold text-gray-800">PCF Output Preview</h2>
        <button
          onClick={handleExport}
          disabled={!pcfText}
          className={`px-4 py-2 font-semibold rounded text-white ${pcfText ? 'bg-blue-600 hover:bg-blue-700 shadow' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Export PCF ↓
        </button>
      </div>
      <div className="flex-grow border rounded bg-gray-50 overflow-auto p-4 font-mono text-sm">
        {pcfText ? (
          <pre className="whitespace-pre-wrap">{pcfText}</pre>
        ) : (
          <div className="text-gray-400 italic text-center mt-10">Generate PCF to see preview</div>
        )}
      </div>
    </div>
  );
}
