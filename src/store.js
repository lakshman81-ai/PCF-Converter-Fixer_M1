



import { generatePcf } from './utils/pcfGenerator';
import { defaultAliases } from './utils/csvImporter';
import { runBasicValidation } from './utils/basicValidator';

export const initialState = {
  dataTable: [],
  log: [],
  pcfText: "",
  config: {
    decimals: 1,
    angleFormat: "degrees",
    pipelineRef: "",
    projectIdentifier: "P1",
    area: "A1",
    smartFixer: {
      connectionTolerance: 25.0,
      gridSnapResolution: 1.0,
      microPipeThreshold: 6.0,
      negligibleGap: 1.0,
      autoFillMaxGap: 25.0,
      reviewGapMax: 100.0,
      autoTrimMaxOverlap: 25.0,
      silentSnapThreshold: 2.0,
      warnSnapThreshold: 10.0,
      autoDeleteFoldbackMax: 25.0,
      offAxisThreshold: 0.5,
      diagonalMinorThreshold: 2.0,
      minTangentMultiplier: 1.0,
      closureWarningThreshold: 5.0,
      closureErrorThreshold: 50.0,
      branchPerpendicularityWarn: 5.0,
      branchPerpendicularityError: 15.0,
      noSupportAlertLength: 10000.0,
    },
    aliases: defaultAliases,
  },
  smartFix: {
    status: "idle", // "idle" | "running" | "previewing" | "applying" | "applied"
    graph: null,
    chains: [],
    chainSummary: null,
    fixSummary: null,
    appliedFixes: [],
  },
};

export function reducer(state, action) {
  switch (action.type) {
    case 'IMPORT_DATA':
      return {
        ...state,
        dataTable: action.payload,
        log: [{ type: "Info", message: `Imported ${action.payload.length} rows.` }],
        pcfText: "",
        smartFix: initialState.smartFix,
      };

    case 'SET_CONFIG':
      return { ...state, config: action.payload };

    case 'RUN_VALIDATOR': {
      const logs = runBasicValidation(state.dataTable, state.config);
      return { ...state, log: [...state.log, { type: "Info", message: "Ran basic validator." }, ...logs] };
    }

    case 'GENERATE_PCF': {
      const text = generatePcf(state.dataTable, state.config);
      return { ...state, pcfText: text };
    }

    case 'SET_SMART_FIX_STATUS':
      return { ...state, smartFix: { ...state.smartFix, status: action.status } };

    case 'SMART_FIX_COMPLETE':
      return {
        ...state,
        smartFix: {
          ...state.smartFix,
          status: "previewing",
          graph: action.payload.graph,
          chains: action.payload.chains,
          chainSummary: action.payload.summary,
        },
        dataTable: [...state.dataTable], // trigger re-render for new fixingActions
        log: [...state.log],
      };

    case 'FIXES_APPLIED':
      return {
        ...state,
        dataTable: action.payload.updatedTable,
        smartFix: {
          ...state.smartFix,
          status: "applied",
          appliedFixes: action.payload.applied,
          fixSummary: {
            deleteCount: action.payload.deleteCount,
            insertCount: action.payload.insertCount,
            totalApplied: action.payload.applied.length,
          },
        },
        log: [...state.log],
      };

    default:
      return state;
  }
}
