import React from 'react';

const tierColors = {
  1: { bg: "#D4EDDA", text: "#155724", border: "#28A745", label: "AUTO" },
  2: { bg: "#FFF3CD", text: "#856404", border: "#FFC107", label: "FIX" },
  3: { bg: "#FFE5D0", text: "#856404", border: "#FD7E14", label: "REVIEW" },
  4: { bg: "#F8D7DA", text: "#721C24", border: "#DC3545", label: "ERROR" },
};

export default function DataTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-500">No data loaded. Import a CSV or Excel file to begin.</div>;
  }

  const fmt = (c) => c ? `${c.x.toFixed(1)}, ${c.y.toFixed(1)}, ${c.z.toFixed(1)}` : "";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-2 py-1 border">Row</th>
            <th className="px-2 py-1 border">Type</th>
            <th className="px-2 py-1 border">Bore</th>
            <th className="px-2 py-1 border">EP1</th>
            <th className="px-2 py-1 border">EP2</th>
            <th className="px-2 py-1 border">CP</th>
            <th className="px-2 py-1 border">BP</th>
            <th className="px-2 py-1 border w-64">Smart Fix Preview</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row._rowIndex} className="hover:bg-gray-50">
              <td className="px-2 py-1 border text-center">{row._rowIndex}</td>
              <td className="px-2 py-1 border font-mono">{row.type}</td>
              <td className="px-2 py-1 border text-right">{row.bore}</td>
              <td className={`px-2 py-1 border font-mono text-xs ${row._modified?.ep1 ? 'bg-cyan-100' : ''}`}>{fmt(row.ep1)}</td>
              <td className={`px-2 py-1 border font-mono text-xs ${row._modified?.ep2 ? 'bg-cyan-100' : ''}`}>{fmt(row.ep2)}</td>
              <td className="px-2 py-1 border font-mono text-xs">{fmt(row.cp)}</td>
              <td className="px-2 py-1 border font-mono text-xs">{fmt(row.bp)}</td>
              <td className="px-2 py-1 border align-top">
                {row.fixingAction ? (
                  <div
                    style={{
                      background: tierColors[row.fixingActionTier]?.bg || tierColors[3].bg,
                      color: tierColors[row.fixingActionTier]?.text || tierColors[3].text,
                      borderLeft: `3px solid ${tierColors[row.fixingActionTier]?.border || tierColors[3].border}`,
                    }}
                    className="p-1 font-mono text-xs whitespace-pre-wrap max-w-xs"
                  >
                    <span
                      style={{ background: tierColors[row.fixingActionTier]?.border || tierColors[3].border }}
                      className="inline-block text-white px-1 py-0.5 rounded text-[10px] font-bold mb-1"
                    >
                      {tierColors[row.fixingActionTier]?.label || "UNK"} T{row.fixingActionTier}
                    </span>
                    {" "}{row.fixingActionRuleId}
                    <br />
                    {row.fixingAction}
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
