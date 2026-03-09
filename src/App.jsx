import React, { useReducer, useState } from 'react';
import DataTable from './components/DataTable';
import ConfigTab from './components/ConfigTab';
import DebugTab from './components/DebugTab';
import OutputTab from './components/OutputTab';
import StatusBar from './components/StatusBar';
import { reducer, initialState } from './store';
import { parseCSV, parseExcel } from './utils/csvImporter';
import { runSmartFix } from './engine/smartFixOrchestrator';
import { applyFixes } from './engine/fixApplication';
import { validateDataTable } from './schema/pcfSchema';


import * as XLSX from 'xlsx';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTab, setActiveTab] = useState("dataTable");

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      let rawData;
      if (file.name.endsWith('.csv')) {
        rawData = await parseCSV(file, state.config.aliases);
      } else if (file.name.match(/\.(xlsx|xls)$/)) {
        rawData = await parseExcel(file, state.config.aliases);
      } else {
        alert("Unsupported file format.");
        return;
      }

      // boundary check
      const validatedData = validateDataTable(rawData);
      dispatch({ type: 'IMPORT_DATA', payload: validatedData });
      setActiveTab("dataTable");
    } catch (err) {
      console.error(err);
      alert("Error importing data.");
    }
  };

  const handleSmartFix = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "running" });
    setActiveTab("debug");
    // Run async to let UI show "Analyzing..."
    setTimeout(() => {
      const logRef = [];
      const result = runSmartFix(state.dataTable, state.config, logRef);
      dispatch({ type: 'SMART_FIX_COMPLETE', payload: { ...result, logs: logRef } });
      dispatch({ type: 'ADD_LOGS', payload: logRef }); // we just mutate log inside in practice
      setActiveTab("dataTable"); // Switch back so they can review
    }, 50);
  };

  const handleApplyFixes = () => {
    dispatch({ type: "SET_SMART_FIX_STATUS", status: "applying" });
    setTimeout(() => {
      const logRef = [];
      const result = applyFixes(state.dataTable, state.smartFix.chains, state.config, logRef);
      dispatch({ type: 'FIXES_APPLIED', payload: { ...result, logs: logRef } });
      dispatch({ type: 'ADD_LOGS', payload: logRef });
      
      // Post apply recalculation (Step 5-13) happens here. For simplicity, just regenerate PCF.
      dispatch({ type: 'GENERATE_PCF' });
      setActiveTab("debug");
    }, 50);
  };

  const handleExportData = () => {
    if (!state.dataTable.length) return;
    const ws = XLSX.utils.json_to_sheet(state.dataTable);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "PCF_Data_Export.xlsx");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-blue-800 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-2xl font-bold tracking-tight">PCF SYNTAX MASTER & SMART FIXER v2.0</h1>
        <div className="flex space-x-2">
          <label className="bg-blue-600 hover:bg-blue-500 cursor-pointer px-4 py-2 rounded font-semibold text-sm transition">
            Import Excel/CSV ↓
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </header>

      <nav className="bg-white border-b flex space-x-4 px-4 pt-2 shadow-sm">
        {["dataTable", "config", "debug", "output"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize border-b-2 transition ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {tab.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </nav>

      <main className="flex-grow overflow-auto p-4 mb-16">
        {activeTab === "dataTable" && <DataTable data={state.dataTable} />}
        {activeTab === "config" && <ConfigTab config={state.config} updateConfig={(c) => dispatch({ type: 'SET_CONFIG', payload: c })} />}
        {activeTab === "debug" && <DebugTab log={state.log} smartFixState={state.smartFix} />}
        {activeTab === "output" && <OutputTab pcfText={state.pcfText} />}
      </main>

      <StatusBar
        status={state.smartFix.status}
        hasData={state.dataTable.length > 0}
        onExportData={handleExportData}
        onExportPcf={() => dispatch({ type: 'GENERATE_PCF' })}
        onRunValidator={() => { dispatch({ type: 'RUN_VALIDATOR' }); setActiveTab("debug"); }}
        onSmartFix={handleSmartFix}
        onApplyFixes={handleApplyFixes}
        smartFixState={state.smartFix}
      />
    </div>
  );
}

export default App;
