import { z } from "zod";

// Zod schema for validating coordinates
const coordSchema = z.object({
  x: z.number().catch(0),
  y: z.number().catch(0),
  z: z.number().catch(0),
}).nullable().catch(null);

// Validate component types
const typeSchema = z.string().transform(val => val ? val.trim().toUpperCase() : "");

// Zod schema for a Data Table row (with boundaries)
export const pcfRowSchema = z.object({
  _rowIndex: z.number(),
  _modified: z.record(z.string()).optional(),
  _logTags: z.array(z.string()).optional(),
  csvSeqNo: z.union([z.number(), z.string()]).optional().catch(""),
  type: typeSchema,
  text: z.string().optional().catch(""),
  pipelineRef: z.string().optional().catch(""),
  refNo: z.string().optional().catch(""),
  bore: z.number().catch(0),
  ep1: coordSchema,
  ep2: coordSchema,
  cp: coordSchema,
  bp: coordSchema,
  skey: z.string().optional().catch(""),
  supportCoor: coordSchema,
  supportName: z.string().optional().catch(""),
  supportGuid: z.string().optional().catch(""),
  ca: z.record(z.union([z.string(), z.number(), z.null()]).optional()).optional().catch({}),
  friction: z.union([z.string(), z.number(), z.null()]).optional(),
  gap: z.union([z.string(), z.number(), z.null()]).optional(),
  nodeName: z.string().optional(),
  fixingAction: z.string().nullable().catch(null),
  fixingActionTier: z.number().nullable().catch(null),
  fixingActionRuleId: z.string().nullable().catch(null),
  len1: z.number().nullable().catch(null),
  axis1: z.string().nullable().catch(null),
  len2: z.number().nullable().catch(null),
  axis2: z.string().nullable().catch(null),
  len3: z.number().nullable().catch(null),
  axis3: z.string().nullable().catch(null),
  brlen: z.number().nullable().catch(null),
  deltaX: z.number().nullable().catch(null),
  deltaY: z.number().nullable().catch(null),
  deltaZ: z.number().nullable().catch(null),
  diameter: z.number().nullable().catch(null),
  wallThick: z.union([z.number(), z.string(), z.null()]).optional().catch(null),
  bendPtr: z.number().nullable().catch(null),
  rigidPtr: z.number().nullable().catch(null),
  intPtr: z.number().nullable().catch(null),
  angle: z.number().optional().catch(0),
  bendRadius: z.number().optional().catch(0),
  flatDirection: z.string().optional().catch(""),
  branchBore: z.number().nullable().catch(null),
  boreLarge: z.number().nullable().catch(null),
  boreSmall: z.number().nullable().catch(null),
}).catchall(z.any()); // Allow extra fields to not break if raw data has more

export const pcfDataTableSchema = z.array(pcfRowSchema);

// Helper function to safely parse and validate a row
export function validateRow(row) {
  const result = pcfRowSchema.safeParse(row);
  if (!result.success) {
    console.warn(`Validation failed for row:`, result.error);
    return row; // Return original if fail, or handle strictly depending on design
  }
  return result.data;
}

export function validateDataTable(data) {
  const result = pcfDataTableSchema.safeParse(data);
  if (!result.success) {
    console.error("Data table validation errors:", result.error);
    return data;
  }
  return result.data;
}
