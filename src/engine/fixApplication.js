import { vec } from '../utils/vectorMath';
import { getEntryPoint, getExitPoint } from '../utils/graphBuilder';
import { getElementVector } from '../utils/axisDetector';

export function applyFixes(dataTable, chains, config, log) {
  const applied = [];
  const newRows = [];   // Gap-filler pipes to insert
  const deleteRows = new Set(); // Row indices to delete

  // Flatten chains for easier processing
  const allLinks = [];
  function collectLinks(chain) {
    for (const link of chain) {
      allLinks.push(link);
      if (link.branchChain) collectLinks(link.branchChain);
    }
  }
  for (const chain of chains) {
    collectLinks(chain);
  }

  // ─── Priority 1: Collect DELETEs ───
  for (const link of allLinks) {
    const elem = link.element;
    if (elem._proposedFix?.type === "DELETE" && elem._proposedFix.tier <= 2) {
      deleteRows.add(elem._rowIndex);
      applied.push({ ruleId: elem._proposedFix.ruleId, row: elem._rowIndex, action: "DELETE" });
      log.push({
        type: "Applied", ruleId: elem._proposedFix.ruleId, row: elem._rowIndex,
        message: `APPLIED: Deleted ${elem.type} at Row ${elem._rowIndex}.`
      });
    }
  }

  // ─── Priority 2: Collect SNAP_AXIS fixes ───
  for (const link of allLinks) {
    const elem = link.element;
    if (elem._proposedFix?.type === "SNAP_AXIS" && elem._proposedFix.tier <= 2) {
      const axis = elem._proposedFix.dominantAxis;
      snapToSingleAxis(elem, axis);
      markModified(elem, "ep1", "SmartFix:R-GEO-03");
      markModified(elem, "ep2", "SmartFix:R-GEO-03");
      applied.push({ ruleId: "R-GEO-03", row: elem._rowIndex, action: "SNAP_AXIS" });
    }
  }

  // ─── Priority 3: Collect SNAP gap fixes ───
  for (const link of allLinks) {
    if (!link.fixAction) continue;
    if (link.fixAction.type === "SNAP" && link.fixAction.tier <= 2) {
      snapEndpoints(link.element, link.nextElement);
      markModified(link.element, "ep2", `SmartFix:${link.fixAction.ruleId}`);
      markModified(link.nextElement, "ep1", `SmartFix:${link.fixAction.ruleId}`);
      applied.push({ ruleId: link.fixAction.ruleId, row: link.element._rowIndex, action: "SNAP" });
    }
  }

  // ─── Priority 4: Collect TRIM fixes ───
  for (const link of allLinks) {
    if (!link.fixAction) continue;
    if (link.fixAction.type === "TRIM" && link.fixAction.tier <= 2) {
      const target = link.fixAction.trimTarget === "current" ? link.element : link.nextElement;
      if ((target.type || "").toUpperCase() === "PIPE") {
        trimPipe(target, link.fixAction.trimAmount, link.travelAxis, link.travelDirection, link.fixAction.trimTarget);
        markModified(target, link.fixAction.trimTarget === "current" ? "ep2" : "ep1",
          `SmartFix:${link.fixAction.ruleId}`);
        applied.push({ ruleId: link.fixAction.ruleId, row: target._rowIndex, action: "TRIM" });
        log.push({
          type: "Applied", ruleId: link.fixAction.ruleId, row: target._rowIndex,
          message: `APPLIED: Trimmed ${target.type} by ${link.fixAction.trimAmount.toFixed(1)}mm.`
        });

        // R-OVR-06: Check if trim creates micro-pipe
        const remaining = vec.mag(getElementVector(target));
        if (remaining < (config.smartFixer?.microPipeThreshold ?? 6.0)) {
          deleteRows.add(target._rowIndex);
          log.push({
            type: "Applied", ruleId: "R-OVR-06", row: target._rowIndex,
            message: `APPLIED: Pipe reduced to ${remaining.toFixed(1)}mm after trim. Deleted.`
          });
        }
      }
    }
  }

  // ─── Priority 5: Collect INSERT fixes (gap-fill pipes) ───
  for (const link of allLinks) {
    if (!link.fixAction) continue;
    if (link.fixAction.type === "INSERT" && link.fixAction.tier <= 2) {
      const fillerPipe = createFillerPipe(link);
      newRows.push({ insertAfterRow: link.element._rowIndex, pipe: fillerPipe });
      applied.push({ ruleId: link.fixAction.ruleId, row: link.element._rowIndex, action: "INSERT" });
      log.push({
        type: "Applied", ruleId: link.fixAction.ruleId, row: link.element._rowIndex,
        message: `APPLIED: Inserted ${link.fixAction.gapAmount.toFixed(1)}mm gap-fill pipe after Row ${link.element._rowIndex}.`
      });
    }
  }

  // ─── Execute changes on dataTable ───

  // 1. Remove deleted rows
  let updatedTable = dataTable.filter(row => !deleteRows.has(row._rowIndex));

  // 2. Insert new rows (gap-fill pipes)
  for (const insertion of newRows.sort((a, b) => b.insertAfterRow - a.insertAfterRow)) {
    const idx = updatedTable.findIndex(r => r._rowIndex === insertion.insertAfterRow);
    if (idx >= 0) {
      updatedTable.splice(idx + 1, 0, insertion.pipe);
    } else {
      updatedTable.push(insertion.pipe);
    }
  }

  // 3. Re-number rows
  updatedTable.forEach((row, i) => { row._rowIndex = i + 1; });

  // 4. Clear all fixingAction previews (fixes have been applied)
  updatedTable.forEach(row => {
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  });

  return { updatedTable, applied, deleteCount: deleteRows.size, insertCount: newRows.length };
}


function snapEndpoints(elemA, elemB) {
  // Snap A.EP2 and B.EP1 to their midpoint
  const mid = vec.mid(getExitPoint(elemA), getEntryPoint(elemB));
  if (elemA.ep2) { elemA.ep2 = { ...mid }; }
  if (elemB.ep1) { elemB.ep1 = { ...mid }; }
}

function snapToSingleAxis(element, dominantAxis) {
  if (!element.ep1 || !element.ep2) return;
  // Zero out non-dominant deltas by projecting EP2 onto EP1's non-dominant coords
  const axes = ["x", "y", "z"];
  const domKey = dominantAxis.toLowerCase();
  for (const key of axes) {
    if (key !== domKey) {
      element.ep2[key] = element.ep1[key]; // Force alignment
    }
  }
}

function trimPipe(pipe, amount, travelAxis, travelDir, which) {
  // which: "current" = trim EP2, "next" = trim EP1
  const axisKey = travelAxis.toLowerCase();
  if (which === "current") {
    pipe.ep2[axisKey] -= amount * travelDir;
  } else {
    pipe.ep1[axisKey] += amount * travelDir;
  }
}

function createFillerPipe(chainLink) {
  const upstream = chainLink.element;
  const downstream = chainLink.nextElement;
  const exitPt = getExitPoint(upstream);
  const entryPt = getEntryPoint(downstream);

  return {
    _rowIndex: -1,  // Will be reassigned during re-numbering
    _modified: { ep1: "SmartFix:GapFill", ep2: "SmartFix:GapFill", type: "SmartFix:GapFill" },
    _logTags: ["Calculated"],
    csvSeqNo: `${upstream.csvSeqNo || 0}.GF`,
    type: "PIPE",
    text: "",  // Will be regenerated by MESSAGE-SQUARE step
    refNo: `${upstream.refNo || "UNKNOWN"}_GapFill`,
    bore: upstream.bore || 0,
    ep1: { ...exitPt },
    ep2: { ...entryPt },
    cp: null, bp: null, branchBore: null,
    skey: "",
    supportCoor: null, supportName: "", supportGuid: "",
    ca: { ...upstream.ca, 8: null, 97: null, 98: null }, // Inherit CAs except weight/ref/seq
    fixingAction: "GAPFILLING",
    fixingActionTier: null,
    fixingActionRuleId: null,
    // Calculated fields will be filled by Step 5 (coordinate recalc)
    len1: null, axis1: null, len2: null, axis2: null, len3: null, axis3: null,
    brlen: null, deltaX: null, deltaY: null, deltaZ: null,
    diameter: upstream.bore, wallThick: upstream.ca?.[4] || null,
    bendPtr: null, rigidPtr: null, intPtr: null,
  };
}

function markModified(row, field, reason) {
  if (!row._modified) row._modified = {};
  row._modified[field] = reason;
}
