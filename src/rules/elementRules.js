import { vec } from '../utils/vectorMath';
import { getElementVector } from '../utils/axisDetector';
import { getEntryPoint, getExitPoint } from '../utils/graphBuilder';

export function runElementRules(element, context, prevElement, elemAxis, elemDir, config, log) {
  const type = (element.type || "").toUpperCase();
  const cfg = config.smartFixer || {};
  const ri = element._rowIndex;

  // R-GEO-01: Micro-element
  if (type === "PIPE") {
    const len = vec.mag(getElementVector(element));
    if (len < (cfg.microPipeThreshold ?? 6.0) && len > 0) {
      log.push({
        type: "Fix", ruleId: "R-GEO-01", tier: 1, row: ri,
        message: `DELETE [R-GEO-01]: Micro-pipe ${len.toFixed(1)}mm < ${cfg.microPipeThreshold ?? 6}mm threshold.`
      });
      element._proposedFix = { type: "DELETE", ruleId: "R-GEO-01", tier: 1 };
    }
  }

  // R-GEO-02: Bore continuity
  if (prevElement && element.bore !== context.currentBore && context.currentBore !== 0) {
    const prevType = (prevElement.type || "").toUpperCase();
    if (!prevType.includes("REDUCER")) {
      log.push({
        type: "Error", ruleId: "R-GEO-02", tier: 4, row: ri,
        message: `ERROR [R-GEO-02]: Bore changes ${context.currentBore}→${element.bore} without reducer.`
      });
    }
  }

  // R-GEO-03: Single-axis rule for straight elements
  if (["PIPE", "FLANGE", "VALVE"].includes(type) && type !== "BEND") {
    const ev = getElementVector(element);
    const nonZero = [["X", ev.x], ["Y", ev.y], ["Z", ev.z]].filter((arr) => Math.abs(arr[1]) > 0.5);
    if (nonZero.length > 1) {
      const dominant = nonZero.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b);
      const minorTotal = nonZero.filter(a => a[0] !== dominant[0]).reduce((s, a) => s + Math.abs(a[1]), 0);
      if (minorTotal < (cfg.diagonalMinorThreshold ?? 2.0)) {
        log.push({
          type: "Fix", ruleId: "R-GEO-03", tier: 2, row: ri,
          message: `SNAP [R-GEO-03]: ${type} off-axis drift ${minorTotal.toFixed(1)}mm. Snapping to pure ${dominant[0]}-axis.`
        });
        element._proposedFix = { type: "SNAP_AXIS", ruleId: "R-GEO-03", tier: 2, dominantAxis: dominant[0] };
      } else {
        log.push({
          type: "Error", ruleId: "R-GEO-03", tier: 4, row: ri,
          message: `ERROR [R-GEO-03]: ${type} runs diagonally (${nonZero.map(([a, d]) => `${a}=${d.toFixed(1)}`).join(", ")}). Must align to single axis.`
        });
      }
    }
  }

  // R-GEO-07: Zero-length element
  if (!["SUPPORT", "OLET"].includes(type) && element.ep1 && element.ep2) {
    if (vec.approxEqual(element.ep1, element.ep2, 0.1)) {
      log.push({
        type: "Error", ruleId: "R-GEO-07", tier: 4, row: ri,
        message: `ERROR [R-GEO-07]: ${type} has zero length (EP1 ≈ EP2).`
      });
    }
  }

  // R-CHN-01: Axis change without bend
  if (context.travelAxis && elemAxis && elemAxis !== context.travelAxis) {
    if (!["BEND", "TEE"].includes(type)) {
      log.push({
        type: "Error", ruleId: "R-CHN-01", tier: 4, row: ri,
        message: `ERROR [R-CHN-01]: Axis changed ${context.travelAxis}→${elemAxis} at ${type}. Missing BEND?`
      });
    }
  }

  // R-CHN-02: Fold-back
  if (context.travelAxis && elemAxis === context.travelAxis && elemDir !== context.travelDirection) {
    if (type === "PIPE") {
      const foldLen = vec.mag(getElementVector(element));
      if (foldLen < (cfg.autoDeleteFoldbackMax ?? 25.0)) {
        log.push({
          type: "Fix", ruleId: "R-CHN-02", tier: 2, row: ri,
          message: `DELETE [R-CHN-02]: Fold-back pipe ${foldLen.toFixed(1)}mm on ${elemAxis}-axis.`
        });
        element._proposedFix = { type: "DELETE", ruleId: "R-CHN-02", tier: 2 };
      } else {
        log.push({
          type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
          message: `ERROR [R-CHN-02]: Fold-back ${foldLen.toFixed(1)}mm on ${elemAxis}-axis. Too large to auto-delete.`
        });
      }
    } else if (type !== "BEND") {
      log.push({
        type: "Error", ruleId: "R-CHN-02", tier: 4, row: ri,
        message: `ERROR [R-CHN-02]: ${type} reverses direction on ${elemAxis}-axis.`
      });
    }
  }

  // R-CHN-03: Elbow-elbow proximity
  if (type === "BEND" && context.lastFittingType === "BEND") {
    // using bore directly for now (assume OD roughly similar to bore for warning)
    if (context.pipeSinceLastBend < (cfg.minTangentMultiplier ?? 1.0) * (element.bore || 0) * 0.0254) {
      log.push({
        type: "Warning", ruleId: "R-CHN-03", tier: 3, row: ri,
        message: `WARNING [R-CHN-03]: Only ${context.pipeSinceLastBend.toFixed(0)}mm pipe between bends. Short tangent.`
      });
    }
  }

  // R-CHN-06: Shared-axis coordinate snapping
  if (prevElement && context.travelAxis && elemAxis === context.travelAxis) {
    const exitPt = getExitPoint(prevElement);
    const entryPt = getEntryPoint(element);
    if (exitPt && entryPt) {
      const nonTravelAxes = ["X", "Y", "Z"].filter(a => a !== context.travelAxis);
      for (const axis of nonTravelAxes) {
        const key = axis.toLowerCase();
        const drift = Math.abs(entryPt[key] - exitPt[key]);
        if (drift > 0.1 && drift < (cfg.silentSnapThreshold ?? 2.0)) {
          log.push({
            type: "Fix", ruleId: "R-CHN-06", tier: 1, row: ri,
            message: `SNAP [R-CHN-06]: ${axis} drifted ${drift.toFixed(1)}mm. Silent snap.`
          });
        } else if (drift >= (cfg.silentSnapThreshold ?? 2.0) && drift < (cfg.warnSnapThreshold ?? 10.0)) {
          log.push({
            type: "Fix", ruleId: "R-CHN-06", tier: 2, row: ri,
            message: `SNAP [R-CHN-06]: ${axis} drifted ${drift.toFixed(1)}mm. Snap with warning.`
          });
        } else if (drift >= (cfg.warnSnapThreshold ?? 10.0)) {
          log.push({
            type: "Error", ruleId: "R-CHN-06", tier: 4, row: ri,
            message: `ERROR [R-CHN-06]: ${axis} offset ${drift.toFixed(1)}mm. Too large to snap.`
          });
        }
      }
    }
  }

  // R-DAT-03: Material continuity
  if (context.currentMaterial && element.ca?.[3] && element.ca[3] !== context.currentMaterial) {
    const prevType = prevElement ? (prevElement.type || "").toUpperCase() : "";
    if (!["FLANGE", "VALVE"].includes(prevType)) {
      log.push({
        type: "Warning", ruleId: "R-DAT-03", tier: 3, row: ri,
        message: `WARNING [R-DAT-03]: Material changes ${context.currentMaterial}→${element.ca[3]} without joint.`
      });
    }
  }

  // R-BRN-01: Branch bore > header bore (for TEE)
  if (type === "TEE" && element.branchBore && element.branchBore > element.bore) {
    log.push({
      type: "Error", ruleId: "R-BRN-01", tier: 4, row: ri,
      message: `ERROR [R-BRN-01]: Branch bore (${element.branchBore}) > header bore (${element.bore}).`
    });
  }

  // R-BRN-04: Branch perpendicularity (for TEE)
  if (type === "TEE" && element.ep1 && element.ep2 && element.cp && element.bp) {
    const headerVec = vec.sub(element.ep2, element.ep1);
    const branchVec = vec.sub(element.bp, element.cp);
    const hMag = vec.mag(headerVec);
    const bMag = vec.mag(branchVec);
    if (hMag > 0 && bMag > 0) {
      const dotProd = Math.abs(vec.dot(headerVec, branchVec));
      const cosAngle = dotProd / (hMag * bMag);
      const angleDeg = Math.acos(Math.min(cosAngle, 1.0)) * 180 / Math.PI;
      const offPerp = Math.abs(90 - angleDeg);
      if (offPerp > (cfg.branchPerpendicularityError ?? 15.0)) {
        log.push({
          type: "Error", ruleId: "R-BRN-04", tier: 4, row: ri,
          message: `ERROR [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular.`
        });
      } else if (offPerp > (cfg.branchPerpendicularityWarn ?? 5.0)) {
        log.push({
          type: "Warning", ruleId: "R-BRN-04", tier: 3, row: ri,
          message: `WARNING [R-BRN-04]: Branch ${offPerp.toFixed(1)}° from perpendicular.`
        });
      }
    }
  }

  // R-DAT-06: SKEY prefix consistency
  if (element.skey) {
    const prefixMap = { FLANGE: "FL", VALVE: "V", BEND: "BE", TEE: "TE", OLET: "OL" };
    const expected = prefixMap[type];
    if (expected && !element.skey.toUpperCase().startsWith(expected)) {
      log.push({
        type: "Warning", ruleId: "R-DAT-06", tier: 3, row: ri,
        message: `WARNING [R-DAT-06]: SKEY '${element.skey}' prefix mismatch for ${type} (expected '${expected}...').`
      });
    }
  }
}
