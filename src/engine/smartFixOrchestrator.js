import { buildConnectivityGraph } from '../utils/graphBuilder';
import { walkAllChains } from './chainWalker';
import { populateFixingActions } from './fixDescriptor';

export function runSmartFix(dataTable, config, log) {
  log.push({ type: "Info", message: "═══ SMART FIX: Starting chain walker ═══" });

  // Step 4A: Build connectivity graph
  log.push({ type: "Info", message: "Step 4A: Building connectivity graph..." });
  const graph = buildConnectivityGraph(dataTable, config);
  log.push({
    type: "Info",
    message: `Graph: ${graph.components.length} components, ${graph.terminals.length} terminals, ${graph.edges.size} connections.`
  });

  // Step 4B: Walk all chains
  log.push({ type: "Info", message: "Step 4B: Walking element chains..." });
  const { chains, orphans } = walkAllChains(graph, config, log);
  const totalElements = chains.reduce((s, c) => {
    let count = 0;
    const countChain = (ch) => {
      count += ch.length;
      for (const l of ch) if (l.branchChain) countChain(l.branchChain);
    };
    countChain(c);
    return s + count;
  }, 0);
  log.push({
    type: "Info",
    message: `Walked ${chains.length} chains, ${totalElements} elements, ${orphans.length} orphans.`
  });

  // Step 4C: Rules already run during walk (element + aggregate)
  // Count findings by tier
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const entry of log) {
    if (entry.tier) tierCounts[entry.tier]++;
  }
  log.push({
    type: "Info",
    message: `Rules complete: Tier1=${tierCounts[1]}, Tier2=${tierCounts[2]}, Tier3=${tierCounts[3]}, Tier4=${tierCounts[4]}`
  });

  // Step 4D: Populate Fixing Action column
  log.push({ type: "Info", message: "Step 4D: Populating Fixing Action previews..." });
  populateFixingActions(dataTable, chains, log);

  const actionCount = dataTable.filter(r => r.fixingAction).length;
  log.push({
    type: "Info",
    message: `═══ SMART FIX COMPLETE: ${actionCount} rows have proposed fixes. Review in Data Table. ═══`
  });

  // Build summary
  const summary = {
    chainCount: chains.length,
    elementsWalked: totalElements,
    orphanCount: orphans.length,
    tier1: tierCounts[1],
    tier2: tierCounts[2],
    tier3: tierCounts[3],
    tier4: tierCounts[4],
    rowsWithActions: actionCount,
  };

  return { graph, chains, orphans, summary };
}
