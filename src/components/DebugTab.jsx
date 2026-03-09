import React from 'react';

export default function DebugTab({ log, smartFixState }) {
  const getRowColor = (type, tier) => {
    if (type === "Applied") return "bg-green-100 text-green-900";
    if (type === "Fix") return "bg-blue-100 text-blue-900";
    if (tier === 4) return "bg-red-100 text-red-900 font-bold";
    if (tier === 3) return "bg-orange-100 text-orange-900";
    if (tier === 2) return "bg-yellow-100 text-yellow-900";
    return "bg-gray-50 text-gray-800";
  };

  return (
    <div className="p-4 bg-white rounded shadow mx-auto space-y-4 max-h-[80vh] flex flex-col">
      <h2 className="text-xl font-bold border-b pb-2">Debug Console & Logs</h2>

      {smartFixState?.chainSummary && (
        <div className="bg-[#F0F4F8] p-3 rounded-md mb-3 border border-gray-200">
          <h4 className="font-semibold mb-2 text-gray-800">Smart Fix Summary</h4>
          <table className="w-full text-sm text-left">
            <tbody>
              <tr><td className="w-1/2">Chains found</td><td className="w-1/2 font-mono">{smartFixState.chainSummary.chainCount}</td></tr>
              <tr><td>Elements walked</td><td className="font-mono">{smartFixState.chainSummary.elementsWalked}</td></tr>
              <tr><td>Orphan elements</td><td className="font-mono">{smartFixState.chainSummary.orphanCount}</td></tr>
              <tr className="border-t"><td className="py-1">Tier 1 (auto-silent)</td><td className="text-green-600 font-bold">{smartFixState.chainSummary.tier1}</td></tr>
              <tr><td>Tier 2 (auto-logged)</td><td className="text-yellow-600 font-bold">{smartFixState.chainSummary.tier2}</td></tr>
              <tr><td>Tier 3 (warnings)</td><td className="text-orange-500 font-bold">{smartFixState.chainSummary.tier3}</td></tr>
              <tr><td>Tier 4 (errors)</td><td className="text-red-600 font-bold">{smartFixState.chainSummary.tier4}</td></tr>
              <tr className="border-t bg-gray-100">
                <td className="py-2 font-medium">Rows with proposed fixes</td>
                <td className="font-bold text-lg">{smartFixState.chainSummary.rowsWithActions}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {smartFixState?.fixSummary && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md mb-3">
          <h4 className="font-semibold text-green-800 mb-2">Fixes Applied</h4>
          <p className="text-sm">Inserted: {smartFixState.fixSummary.insertCount} | Deleted: {smartFixState.fixSummary.deleteCount} | Total actions applied: {smartFixState.fixSummary.totalApplied}</p>
        </div>
      )}

      <div className="flex-grow overflow-auto border rounded bg-gray-50 font-mono text-sm">
        <table className="min-w-full text-left">
          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="px-2 py-1 w-16">Row</th>
              <th className="px-2 py-1 w-20">Type</th>
              <th className="px-2 py-1 w-20">Rule</th>
              <th className="px-2 py-1 w-12 text-center">Tier</th>
              <th className="px-2 py-1">Message</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry, i) => (
              <tr key={i} className={`border-b ${getRowColor(entry.type, entry.tier)}`}>
                <td className="px-2 py-1">{entry.row || "-"}</td>
                <td className="px-2 py-1 font-semibold">{entry.type}</td>
                <td className="px-2 py-1 text-xs">{entry.ruleId || "-"}</td>
                <td className="px-2 py-1 text-center font-bold">{entry.tier || "-"}</td>
                <td className="px-2 py-1 whitespace-pre-wrap">{entry.message}</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan="5" className="px-2 py-4 text-center text-gray-500 italic">No logs generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
