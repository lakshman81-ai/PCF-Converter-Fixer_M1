export function mapToPcfKeyword(typeCode) {
  if (!typeCode) return null;
  const key = typeCode.toString().trim().toUpperCase();
  const mapping = {
    "PIPE": "PIPE", "BRAN": "PIPE",
    "BEND": "BEND", "ELBO": "BEND",
    "TEE": "TEE",
    "FLANGE": "FLANGE", "FLAN": "FLANGE",
    "VALVE": "VALVE", "VALV": "VALVE",
    "OLET": "OLET",
    "REDC": "REDUCER-CONCENTRIC", "REDU": "REDUCER-CONCENTRIC", "REDUCER-CONCENTRIC": "REDUCER-CONCENTRIC",
    "REDE": "REDUCER-ECCENTRIC", "REDUCER-ECCENTRIC": "REDUCER-ECCENTRIC",
    "ANCI": "SUPPORT", "SUPPORT": "SUPPORT",
  };
  return mapping[key] || null;
}

export function generatePcf(dataTable, config) {
  const lines = [];
  const dec = config.decimals === 4 ? 4 : 1;
  const rn = "\r\n";

  const fmt = (coord, bore) => {
    if (!coord) return `0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} 0.${'0'.repeat(dec)} ${(bore || 0).toFixed(dec)}`;
    return `${(coord.x || 0).toFixed(dec)} ${(coord.y || 0).toFixed(dec)} ${(coord.z || 0).toFixed(dec)} ${(bore || 0).toFixed(dec)}`;
  };

  const resolveSupport = (row) => {
    const f = row.friction, g = row.gap;
    let name = config.supportFallbackName || "RST";
    if ((f === null || f === "" || f === 0.3) && (g === null || g === "")) name = "ANC";
    else if (f === 0.15) name = "GDE";
    else if (f === 0.3 && g !== null && parseFloat(g) > 0) name = "RST";
    return { name, guid: `UCI:${row.nodeName || row.supportGuid || "UNKNOWN"}` };
  };

  const buildMessageSquare = (row, compType) => {
    const tokens = [compType];
    if (compType === "SUPPORT") {
      const ref = row.ca?.[97] || row.refNo || "";
      const seq = row.ca?.[98] || row.csvSeqNo || "";
      if (ref) tokens.push(`RefNo:${ref}`);
      if (seq) tokens.push(`SeqNo:${seq}`);
      if (row.supportName) tokens.push(row.supportName);
      if (row.supportGuid) tokens.push(row.supportGuid);
      return tokens.join(", ");
    }
    if (row.ca?.[3]) tokens.push(row.ca[3]);
    const len = Math.abs(row.len1 || row.len2 || row.len3 || 0);
    const axis = row.axis1 || row.axis2 || row.axis3 || "";
    if (len) tokens.push(`LENGTH=${Math.round(len)}MM`);
    if (axis) tokens.push(axis.toUpperCase());
    const ref = row.ca?.[97] || row.refNo || "";
    const seq = row.ca?.[98] || row.csvSeqNo || "";
    if (ref) tokens.push(`RefNo:${ref}`);
    if (seq) tokens.push(`SeqNo:${seq}`);
    if (row.brlen) tokens.push(`BrLen=${Math.round(Math.abs(row.brlen))}MM`);
    if (compType.includes("REDUCER") && row.boreLarge && row.boreSmall) {
      tokens.push(`Bore=${row.boreLarge}/${row.boreSmall}`);
    }
    if (row.ca?.[8]) tokens.push(`Wt=${row.ca[8]}`);
    return tokens.join(", ");
  };

  // Header
  lines.push("ISOGEN-FILES ISOGEN.FLS");
  lines.push("UNITS-BORE MM");
  lines.push("UNITS-CO-ORDS MM");
  lines.push("UNITS-WEIGHT KGS");
  lines.push("UNITS-BOLT-DIA MM");
  lines.push("UNITS-BOLT-LENGTH MM");
  lines.push(`PIPELINE-REFERENCE ${config.pipelineRef || "export DEFAULT"}`);
  lines.push(`    PROJECT-IDENTIFIER ${config.projectIdentifier || "P1"}`);
  lines.push(`    AREA ${config.area || "A1"}`);
  lines.push("");

  const components = dataTable.filter(r => r.type && !["ISOGEN-FILES", "UNITS-BORE", "UNITS-CO-ORDS",
    "UNITS-WEIGHT", "UNITS-BOLT-DIA", "UNITS-BOLT-LENGTH",
    "PIPELINE-REFERENCE", "MESSAGE-SQUARE"].includes(r.type.toUpperCase()));

  for (const row of components) {
    const pcfKw = mapToPcfKeyword(row.type);
    if (!pcfKw) continue;

    const msg = buildMessageSquare(row, pcfKw);
    lines.push("MESSAGE-SQUARE");
    lines.push(`    ${msg}`);

    if (pcfKw === "SUPPORT") {
      const { name, guid } = resolveSupport(row);
      lines.push("SUPPORT");
      lines.push(`    CO-ORDS    ${fmt(row.supportCoor, 0)}`);
      lines.push(`    <SUPPORT_NAME>    ${name}`);
      lines.push(`    <SUPPORT_GUID>    ${guid}`);
      lines.push("");
      continue;
    }

    lines.push(pcfKw);
    if (pcfKw === "OLET") {
      lines.push(`    CENTRE-POINT  ${fmt(row.cp, row.boreLarge || row.bore)}`);
      lines.push(`    BRANCH1-POINT ${fmt(row.bp, row.branchBore || 50)}`);
    } else {
      lines.push(`    END-POINT    ${fmt(row.ep1, row.bore)}`);
      lines.push(`    END-POINT    ${fmt(row.ep2, row.boreSmall || row.bore)}`);
      if (pcfKw === "BEND" || pcfKw === "TEE") {
        lines.push(`    CENTRE-POINT  ${fmt(row.cp, row.bore)}`);
      }
      if (pcfKw === "TEE") {
        lines.push(`    BRANCH1-POINT ${fmt(row.bp, row.branchBore || row.bore)}`);
      }
    }

    if (pcfKw === "PIPE" && row.pipelineRef) {
      lines.push(`    PIPELINE-REFERENCE ${row.pipelineRef}`);
    }
    if (row.skey) lines.push(`    <SKEY>  ${row.skey}`);
    if (pcfKw === "BEND" && row.angle) {
      const a = config.angleFormat === "hundredths" ? Math.round(row.angle * 100) : row.angle.toFixed(4);
      lines.push(`    ANGLE  ${a}`);
    }
    if (pcfKw === "BEND" && row.bendRadius) lines.push(`    BEND-RADIUS  ${row.bendRadius}`);
    if (pcfKw === "REDUCER-ECCENTRIC" && row.flatDirection) lines.push(`    FLAT-DIRECTION  ${row.flatDirection}`);

    if (row.ca) {
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 97, 98].forEach(num => {
        if (row.ca[num] !== undefined && row.ca[num] !== "") {
          lines.push(`    COMPONENT-ATTRIBUTE${num}    ${row.ca[num]}`);
        }
      });
    }
    lines.push("");
  }

  return lines.join(rn);
}
