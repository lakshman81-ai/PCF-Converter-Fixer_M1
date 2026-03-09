import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseCSV(file, aliases) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data;
        const normalizedData = mapToCanonical(rawData, aliases);
        resolve(normalizedData);
      },
      error: (err) => reject(err),
    });
  });
}

export function parseExcel(file, aliases) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        const normalizedData = mapToCanonical(rawData, aliases);
        resolve(normalizedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// ─── Custom Fuzzy Matching ───
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fuzzyMatchHeader(headerText, aliasConfig, threshold = 0.75) {
  const normHeader = normalize(headerText);

  // Pass 1: Exact match on normalized aliases
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      if (normalize(alias) === normHeader) return canonical;
    }
  }

  // Pass 2: Substring containment
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const normAlias = normalize(alias);
      if (normAlias && (normAlias.includes(normHeader) || normHeader.includes(normAlias))) {
        return canonical;
      }
    }
  }

  // Pass 3: Fuzzy ratio
  let bestMatch = null;
  let bestScore = 0;
  for (const [canonical, aliases] of Object.entries(aliasConfig)) {
    for (const alias of aliases) {
      const normAlias = normalize(alias);
      if (!normAlias) continue;
      const maxLen = Math.max(normHeader.length, normAlias.length);
      const score = maxLen === 0 ? 1 : 1 - levenshtein(normHeader, normAlias) / maxLen;

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = canonical;
      }
    }
  }

  return bestMatch;
}

// Map raw object array to canonical object array based on aliases
function mapToCanonical(rawData, aliasConfig) {
  if (!rawData || rawData.length === 0) return [];

  // Determine header mapping from the first row's keys
  const rawHeaders = Object.keys(rawData[0]);
  const headerMap = {}; // rawHeader -> canonical
  for (const raw of rawHeaders) {
    const canonical = fuzzyMatchHeader(raw, aliasConfig);
    if (canonical) headerMap[raw] = canonical;
  }

  return rawData.map((row, i) => {
    const newRow = { _rowIndex: i + 1, ca: {} };
    for (const [rawKey, val] of Object.entries(row)) {
      const canonical = headerMap[rawKey];
      if (!canonical) continue;

      if (canonical.startsWith("ca")) {
        const caNum = canonical.replace("ca", "");
        newRow.ca[caNum] = val;
      } else if (["ep1", "ep2", "cp", "bp", "supportCoor"].includes(canonical)) {
        // basic coord parsing if string
        if (typeof val === 'string') {
          const parts = val.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
          if (parts.length >= 3) {
            newRow[canonical] = { x: parts[0], y: parts[1], z: parts[2] };
          }
        }
      } else {
        newRow[canonical] = val;
      }
    }
    return newRow;
  });
}

// Config structure to pass to parse functions
export const defaultAliases = {
  csvSeqNo: ['CSV SEQ NO', 'SEQ NO', 'Seq No', 'SL.NO', 'Sl No', 'SL NO', 'SeqNo', 'Seq', 'Sequence', 'Sequence No', 'Item No'],
  type: ['Type', 'Component', 'Comp Type', 'CompType', 'Component Type', 'Fitting', 'Item'],
  text: ['TEXT', 'Text', 'Description', 'Desc', 'Comment', 'MSG'],
  pipelineRef: ['PIPELINE-REFERENCE', 'Pipeline Ref', 'Line No', 'Line Number', 'Line No.', 'LineNo', 'PIPE', 'Pipe Line'],
  refNo: ['REF NO.', 'Ref No', 'RefNo', 'Reference No', 'Reference Number', 'Ref', 'Tag No', 'TagNo'],
  bore: ['BORE', 'Bore', 'NPS', 'Nominal Bore', 'Dia', 'Diameter', 'Size', 'Pipe Size', 'DN'],
  ep1: ['EP1 COORDS', 'EP1', 'Start Point', 'From', 'From Coord', 'Start Coord', 'EP1_X EP1_Y EP1_Z'],
  ep2: ['EP2 COORDS', 'EP2', 'End Point', 'To', 'To Coord', 'End Coord', 'EP2_X EP2_Y EP2_Z'],
  cp: ['CP COORDS', 'CP', 'Centre Point', 'Center Point', 'Centre', 'Center', 'CenterPt'],
  bp: ['BP COORDS', 'BP', 'Branch Point', 'Branch', 'Branch1', 'BranchPt'],
  skey: ['SKEY', 'Skey', 'S-Key', 'Component Key', 'Fitting Key'],
  supportCoor: ['SUPPORT COOR', 'Support Coord', 'Support Point', 'Restraint Coord', 'RestPt'],
  supportGuid: ['SUPPORT GUID', 'Support GUID', 'GUID', 'Node Name', 'NodeName', 'UCI'],
  ca1: ['CA1', 'CA 1', 'Attr1', 'Attribute 1', 'Attribute1'],
  ca2: ['CA2', 'CA 2', 'Attr2', 'Attribute 2', 'Attribute2'],
  ca3: ['CA3', 'CA 3', 'Attr3', 'Attribute 3', 'Attribute3'],
  ca4: ['CA4', 'CA 4', 'Attr4', 'Attribute 4', 'Attribute4'],
  ca8: ['CA8', 'CA 8', 'Attr8', 'Attribute 8', 'Attribute8', 'Weight'],
  ca97: ['CA97', 'CA 97', 'Ref No Attr', 'RefAttr'],
  ca98: ['CA98', 'CA 98', 'Seq No Attr', 'SeqAttr'],
  fixingAction: ['Fixing Action', 'Fix', 'Action', 'FixAction', 'Overlap', 'Gap Fill'],
};
