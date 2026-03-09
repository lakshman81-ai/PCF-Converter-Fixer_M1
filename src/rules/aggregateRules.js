import { vec } from '../utils/vectorMath';
import { getEntryPoint, getExitPoint } from '../utils/graphBuilder';

export function runAggregateRules(chain, context, config, log) {
  const cfg = config.smartFixer || {};
  const chainId = context.chainId;

  // R-AGG-01: Total pipe length sanity
  if (context.pipeLengthSum <= 0 && chain.length > 0) {
    log.push({
      type: "Error", ruleId: "R-AGG-01", tier: 4, row: chain[0]?.element?._rowIndex,
      message: `ERROR [R-AGG-01]: ${chainId} has zero pipe length. Fundamentally broken.`
    });
  }

  // R-AGG-03: Route closure check
  if (chain.length >= 2) {
    const startPt = getEntryPoint(chain[0].element);
    const endPt = getExitPoint(chain[chain.length - 1].element);
    if (startPt && endPt) {
      const expected = vec.sub(endPt, startPt);
      const actual = context.cumulativeVector;
      const error = vec.mag(vec.sub(expected, actual));
      const closureWarn = cfg.closureWarningThreshold ?? 5.0;
      const closureErr = cfg.closureErrorThreshold ?? 50.0;
      if (error > closureErr) {
        log.push({
          type: "Error", ruleId: "R-AGG-03", tier: 4, row: chain[0]?.element?._rowIndex,
          message: `ERROR [R-AGG-03]: ${chainId} closure error ${error.toFixed(1)}mm.`
        });
      } else if (error > closureWarn) {
        log.push({
          type: "Warning", ruleId: "R-AGG-03", tier: 3, row: chain[0]?.element?._rowIndex,
          message: `WARNING [R-AGG-03]: ${chainId} closure error ${error.toFixed(1)}mm.`
        });
      }
    }
  }

  // R-AGG-04 / R-TOP-01: Dead-end detection
  if (chain.length > 0) {
    const lastElem = chain[chain.length - 1].element;
    const lastType = (lastElem.type || "").toUpperCase();
    if (lastType === "PIPE") {
      log.push({
        type: "Warning", ruleId: "R-TOP-01", tier: 3, row: lastElem._rowIndex,
        message: `WARNING [R-TOP-01]: ${chainId} ends at bare PIPE. Expected terminal fitting.`
      });
    }
  }

  // R-AGG-05: Flange pair completeness
  const midFlanges = chain.filter((link, i) => {
    return (link.element.type || "").toUpperCase() === "FLANGE" && i > 0 && i < chain.length - 1;
  });
  if (midFlanges.length % 2 !== 0) {
    log.push({
      type: "Warning", ruleId: "R-AGG-05", tier: 3, row: midFlanges[0]?.element?._rowIndex,
      message: `WARNING [R-AGG-05]: ${chainId} has ${midFlanges.length} mid-chain flanges (odd). Missing mating flange?`
    });
  }

  // R-AGG-06: No supports on long chain
  const chainLenM = vec.mag(context.cumulativeVector) / 1000;
  if (chainLenM > ((cfg.noSupportAlertLength ?? 10000) / 1000)) {
    // Count supports encountered (they were skipped in walk but we can check dataTable)
    // For now, flag based on pipe length
    log.push({
      type: "Warning", ruleId: "R-AGG-06", tier: 3, row: chain[0]?.element?._rowIndex,
      message: `WARNING [R-AGG-06]: ${chainId} is ${chainLenM.toFixed(1)}m long. Verify supports are included.`
    });
  }
}
