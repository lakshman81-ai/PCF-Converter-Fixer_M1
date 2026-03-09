import { vec } from '../utils/vectorMath';

export function populateFixingActions(dataTable, chains, log) {
  // Clear all existing fixing actions
  for (const row of dataTable) {
    row.fixingAction = null;
    row.fixingActionTier = null;
    row.fixingActionRuleId = null;
  }

  // From chain walk: element-level proposed fixes
  for (const chain of chains) {
    populateFixingActionsFromChain(dataTable, chain);
  }

  // Also populate from log entries for rules without direct chain-link actions
  for (const entry of log) {
    if (entry.row && entry.tier && entry.tier <= 4) {
      const row = dataTable.find(r => r._rowIndex === entry.row);
      if (row && !row.fixingAction) {
        row.fixingAction = entry.message;
        row.fixingActionTier = entry.tier;
        row.fixingActionRuleId = entry.ruleId;
      }
    }
  }
}

function populateFixingActionsFromChain(dataTable, chain) {
  for (const link of chain) {
    const elem = link.element;

    // Element-level fix (DELETE, SNAP_AXIS)
    if (elem._proposedFix) {
      const row = dataTable.find(r => r._rowIndex === elem._rowIndex);
      if (row) {
        row.fixingAction = formatProposedFix(elem._proposedFix, elem);
        row.fixingActionTier = elem._proposedFix.tier;
        row.fixingActionRuleId = elem._proposedFix.ruleId;
      }
    }

    // Gap/Overlap fix (affects current AND next element)
    if (link.fixAction) {
      const currRow = dataTable.find(r => r._rowIndex === link.element._rowIndex);
      const nextRow = link.nextElement ? dataTable.find(r => r._rowIndex === link.nextElement._rowIndex) : null;

      if (currRow && !currRow.fixingAction) {
        currRow.fixingAction = link.fixAction.description;
        currRow.fixingActionTier = link.fixAction.tier;
        currRow.fixingActionRuleId = link.fixAction.ruleId;
      }
      if (nextRow && !nextRow.fixingAction && link.fixAction.tier <= 3) {
        nextRow.fixingAction = `← ${link.fixAction.description.split('\n')[0]}`; // Abbreviated back-reference
        nextRow.fixingActionTier = link.fixAction.tier;
        nextRow.fixingActionRuleId = link.fixAction.ruleId;
      }
    }

    // Process branch chain recursively
    if (link.branchChain) {
      populateFixingActionsFromChain(dataTable, link.branchChain);
    }
  }
}

function formatProposedFix(fix, element) {
  const type = (element.type || "").toUpperCase();
  const ri = element._rowIndex;

  switch (fix.type) {
    case "DELETE": {
      const len = element.ep1 && element.ep2 ? vec.mag(vec.sub(element.ep2, element.ep1)) : 0;
      return `DELETE [${fix.ruleId}]: Remove ${type} at Row ${ri}\n` +
             `  Length: ${len.toFixed(1)}mm, Bore: ${element.bore || 0}mm\n` +
             `  Reason: ${fix.ruleId === "R-GEO-01" ? "Micro-element below threshold" : "Fold-back element"}`;
    }
    case "SNAP_AXIS":
      return `SNAP [${fix.ruleId}]: Align ${type} to pure ${fix.dominantAxis}-axis\n` +
             `  Row ${ri}: Off-axis components will be zeroed\n` +
             `  EP2 non-${fix.dominantAxis} coords → match EP1`;

    default:
      return `${fix.type} [${fix.ruleId}]: Row ${ri}`;
  }
}
