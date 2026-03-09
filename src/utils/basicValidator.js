import { vec } from './vectorMath';

export function runBasicValidation(dataTable) {
  const log = [];
  const ri = (r) => r._rowIndex;
  const isZeroCoord = (c) => c && c.x === 0 && c.y === 0 && c.z === 0;

  for (let i = 0; i < dataTable.length; i++) {
    const row = dataTable[i];
    const type = (row.type || "").toUpperCase();
    if (!type || ["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS", "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH", "PIPELINE-REFERENCE", "MESSAGE-SQUARE"].includes(type)) continue;

    // V1: No (0,0,0) coords
    if (isZeroCoord(row.ep1) || isZeroCoord(row.ep2) || isZeroCoord(row.cp) || isZeroCoord(row.bp) || isZeroCoord(row.supportCoor)) {
      log.push({ type: "Error", ruleId: "V1", tier: 4, row: ri(row), message: "ERROR [V1]: Coordinate (0,0,0) prohibited." });
    }

    // V3: Bore consistency
    if (type.includes("REDUCER")) {
      if (row.bore === row.boreSmall || !row.boreSmall) log.push({ type: "Error", ruleId: "V3", tier: 4, row: ri(row), message: "ERROR [V3]: Reducer bore must change." });
    } else {
      // For non-reducers, bore at both ends is the same. Usually row.bore covers it.
    }

    if (type === "BEND") {
      // V4: CP != EP1
      if (vec.approxEqual(row.cp, row.ep1, 0.1)) log.push({ type: "Error", ruleId: "V4", tier: 4, row: ri(row), message: "ERROR [V4]: Degenerate bend (CP = EP1)." });
      // V5: CP != EP2
      if (vec.approxEqual(row.cp, row.ep2, 0.1)) log.push({ type: "Error", ruleId: "V5", tier: 4, row: ri(row), message: "ERROR [V5]: Degenerate bend (CP = EP2)." });
      // V6: Collinear
      const cross = vec.cross(vec.sub(row.ep1, row.cp), vec.sub(row.ep2, row.cp));
      if (vec.mag(cross) < 0.001) log.push({ type: "Error", ruleId: "V6", tier: 4, row: ri(row), message: "ERROR [V6]: Bend CP is collinear." });
      // V7: Equidistant
      if (Math.abs(vec.dist(row.cp, row.ep1) - vec.dist(row.cp, row.ep2)) > 1.0) {
        log.push({ type: "Warning", ruleId: "V7", tier: 3, row: ri(row), message: "WARNING [V7]: Bend CP not equidistant." });
      }
    }

    if (type === "TEE") {
      // V8: CP = midpoint
      if (!vec.approxEqual(row.cp, vec.mid(row.ep1, row.ep2), 1.0)) log.push({ type: "Error", ruleId: "V8", tier: 4, row: ri(row), message: "ERROR [V8]: TEE CP is not midpoint." });
      // V10: Perpendicular
      const branchVec = vec.sub(row.bp, row.cp);
      const headerVec = vec.sub(row.ep2, row.ep1);
      const dotProd = Math.abs(vec.dot(branchVec, headerVec));
      const threshold = 0.01 * vec.mag(branchVec) * vec.mag(headerVec);
      if (dotProd > threshold) log.push({ type: "Warning", ruleId: "V10", tier: 3, row: ri(row), message: "WARNING [V10]: TEE branch not perpendicular." });
    }

    if (type === "OLET") {
      // V11: No EP
      if (row.ep1 || row.ep2) log.push({ type: "Error", ruleId: "V11", tier: 4, row: ri(row), message: "ERROR [V11]: OLET must not have end-points." });
    }

    if (type === "SUPPORT") {
      // V12: No CAs
      if (Object.values(row.ca || {}).some(v => v !== undefined && v !== null && v !== "")) {
        log.push({ type: "Error", ruleId: "V12", tier: 4, row: ri(row), message: "ERROR [V12]: SUPPORT cannot have CA lines." });
      }
    }

    // V14: SKEY
    if (["FLANGE", "VALVE", "BEND", "TEE", "OLET", "REDUCER-CONCENTRIC", "REDUCER-ECCENTRIC"].includes(type) && !row.skey) {
      log.push({ type: "Warning", ruleId: "V14", tier: 3, row: ri(row), message: `WARNING [V14]: SKEY missing for ${type}.` });
    }

    // V16: CA8 Weight
    if (row.ca?.[8] && ["PIPE", "SUPPORT"].includes(type)) {
      log.push({ type: "Warning", ruleId: "V16", tier: 3, row: ri(row), message: `WARNING [V16]: Weight (CA8) provided for ${type}.` });
    }

    // V18: Bore Unit
    if (row.bore <= 48 && ![15, 20, 25, 32, 40, 50, 65, 80, 90, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 900, 1050, 1200].includes(row.bore)) {
      log.push({ type: "Warning", ruleId: "V18", tier: 3, row: ri(row), message: `WARNING [V18]: Bore ${row.bore} may be in inches.` });
    }
  }

  // V15 Coordinate continuity (lazy check)
  for (let i = 1; i < dataTable.length; i++) {
    const prev = dataTable[i - 1];
    const curr = dataTable[i];
    if (prev.ep2 && curr.ep1 && !vec.approxEqual(prev.ep2, curr.ep1, 1.0) && prev.type !== "SUPPORT" && curr.type !== "SUPPORT") {
      log.push({ type: "Warning", ruleId: "V15", tier: 3, row: curr._rowIndex, message: `WARNING [V15]: Coordinate discontinuity with Row ${prev._rowIndex}.` });
    }
  }

  return log;
}
