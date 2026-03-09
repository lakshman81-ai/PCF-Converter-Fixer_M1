import { vec } from '../utils/vectorMath';
import { getElementVector, detectElementAxis, detectBranchAxis, detectBranchDirection } from '../utils/axisDetector';
import { getEntryPoint, getExitPoint } from '../utils/graphBuilder';
import { runElementRules } from '../rules/elementRules';
import { runSupportRules } from '../rules/supportRules';
import { runAggregateRules } from '../rules/aggregateRules';
import { analyzeGap } from '../rules/gapOverlapAnalyzer';

function createInitialContext(startElement, chainIndex) {
  return {
    travelAxis: null,
    travelDirection: null,
    currentBore: startElement.bore || 0,
    currentMaterial: startElement.ca?.[3] || "",
    currentPressure: startElement.ca?.[1] || "",
    currentTemp: startElement.ca?.[2] || "",
    chainId: `Chain-${chainIndex + 1}`,
    cumulativeVector: { x: 0, y: 0, z: 0 },
    pipeLengthSum: 0,
    lastFittingType: null,
    elevation: startElement.ep1?.z || 0,
    depth: 0,
    pipeSinceLastBend: Infinity, // large initial value
  };
}

export function walkAllChains(graph, config, log) {
  const visited = new Set();
  const allChains = [];

  // Walk from each terminal
  for (const terminal of graph.terminals) {
    if (visited.has(terminal._rowIndex)) continue;

    const context = createInitialContext(terminal, allChains.length);
    const chain = walkChain(terminal, graph, context, visited, config, log);
    allChains.push(chain);
  }

  // Detect orphans
  const orphans = graph.components.filter(c =>
    !visited.has(c._rowIndex) && c.type !== "SUPPORT"
  );
  for (const orphan of orphans) {
    log.push({
      type: "Error", ruleId: "R-TOP-02", tier: 4,
      row: orphan._rowIndex,
      message: `Orphan: ${orphan.type} (Row ${orphan._rowIndex}) not connected to any chain.`
    });
  }

  return { chains: allChains, orphans };
}

function walkChain(startElement, graph, context, visited, config, log) {
  const chain = [];
  let current = startElement;
  let prevElement = null;

  while (current && !visited.has(current._rowIndex)) {
    visited.add(current._rowIndex);
    const type = (current.type || "").toUpperCase();

    // Skip SUPPORTs in the chain walk (they are point elements, not flow elements)
    // But still validate them
    if (type === "SUPPORT") {
      runSupportRules(current, chain, context, config, log);
      current = graph.edges.get(current._rowIndex) || null;
      continue;
    }

    // ─── A. DETECT ELEMENT AXIS ───
    const [elemAxis, elemDir] = detectElementAxis(current, config);

    // ─── B. RUN ELEMENT-LEVEL RULES ───
    runElementRules(current, context, prevElement, elemAxis, elemDir, config, log);

    // ─── C. UPDATE CONTEXT ───
    if (elemAxis) {
      context.travelAxis = elemAxis;
      context.travelDirection = elemDir;
    }
    if (current.bore) context.currentBore = current.bore;
    if (current.ca?.[3]) context.currentMaterial = current.ca[3];
    const elemVec = getElementVector(current);
    context.cumulativeVector = vec.add(context.cumulativeVector, elemVec);
    if (type === "PIPE") {
      const len = vec.mag(elemVec);
      context.pipeLengthSum += len;
      context.pipeSinceLastBend += len;
    }
    if (type === "BEND") context.pipeSinceLastBend = 0;
    if (!["PIPE", "SUPPORT"].includes(type)) context.lastFittingType = type;

    // ─── D. FIND NEXT ELEMENT AND ANALYZE GAP ───
    const nextElement = graph.edges.get(current._rowIndex) || null;
    let gapVector = null;
    let fixAction = null;

    if (nextElement) {
      const exitPt = getExitPoint(current);
      const entryPt = getEntryPoint(nextElement);
      if (exitPt && entryPt) {
        gapVector = vec.sub(entryPt, exitPt);
        fixAction = analyzeGap(gapVector, context, current, nextElement, config, log);
      }
    }

    // ─── E. RECORD CHAIN LINK ───
    chain.push({
      element: current,
      elemAxis,
      elemDir,
      travelAxis: context.travelAxis,
      travelDirection: context.travelDirection,
      gapToNext: gapVector,
      fixAction,
      nextElement,
      branchChain: null,
    });

    // ─── F. BRANCH HANDLING (TEE) ───
    if (type === "TEE") {
      const branchStart = graph.branchEdges.get(current._rowIndex);
      if (branchStart && !visited.has(branchStart._rowIndex)) {
        const branchCtx = {
          ...structuredClone(context),
          travelAxis: detectBranchAxis(current),
          travelDirection: detectBranchDirection(current),
          currentBore: current.branchBore || current.bore,
          depth: context.depth + 1,
          chainId: `${context.chainId}.B`,
          pipeLengthSum: 0,
          cumulativeVector: { x: 0, y: 0, z: 0 },
          pipeSinceLastBend: Infinity,
        };
        const branchChain = walkChain(branchStart, graph, branchCtx, visited, config, log);
        chain[chain.length - 1].branchChain = branchChain;
      }
    }

    // ─── G. ADVANCE ───
    prevElement = current;
    current = nextElement;
  }

  // ─── H. POST-WALK AGGREGATE RULES ───
  runAggregateRules(chain, context, config, log);

  return chain;
}
