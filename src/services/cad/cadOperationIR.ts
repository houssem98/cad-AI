/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parametric CAD Operation Intermediate Representation (IR)
 * Decouples AI reasoning from proprietary CAD macro languages (SolidWorks VBA, CATIA CATScript).
 */

export type TargetCADSystem = 'SOLIDWORKS' | 'CATIA_V5' | 'FUSION_360' | 'NX' | 'ONSHAPE';
export type UnitSystem = 'MMGS' | 'IPS' | 'MKS';

export interface CADOperationPlan {
  planId: string;
  sourcePrompt: string;
  targetSystem: TargetCADSystem;
  units: UnitSystem;
  targetDocument: string;
  operations: CADIRCommand[];
  requiresApproval: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  validationResult?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export type CADIRCommand =
  | CreateSketchCommand
  | ExtrudeBossCommand
  | CutExtrudeCommand
  | HolePatternCommand
  | ApplyFilletCommand
  | AssignMaterialCommand;

export interface CreateSketchCommand {
  type: 'CREATE_SKETCH';
  featureName: string;
  planeRef: 'FRONT' | 'TOP' | 'RIGHT' | string;
  geometry: {
    shape: 'RECTANGLE' | 'CIRCLE' | 'POLYGON';
    dims: number[];
  };
}

export interface ExtrudeBossCommand {
  type: 'EXTRUDE_BOSS';
  featureName: string;
  sketchRef: string;
  depthMm: number;
  direction: 'NORMAL' | 'REVERSE' | 'MID_PLANE';
  draftAngleDeg?: number;
}

export interface CutExtrudeCommand {
  type: 'CUT_EXTRUDE';
  featureName: string;
  sketchRef: string;
  depthMm: number | 'THROUGH_ALL';
  direction: 'NORMAL' | 'REVERSE';
}

export interface HolePatternCommand {
  type: 'HOLE_PATTERN';
  featureName: string;
  diameterMm: number;
  depthMm: number | 'THROUGH_ALL';
  positions: { x: number; y: number }[];
  standard: 'ANSI_METRIC' | 'ISO' | 'DIN';
  counterbore?: { diameterMm: number; depthMm: number };
}

export interface ApplyFilletCommand {
  type: 'APPLY_FILLET';
  featureName: string;
  radiusMm: number;
  edgeSelectionCriteria: 'ALL_TANGENT' | 'INTERSECTING_BASE' | 'VERTICAL_CORNERS';
}

export interface AssignMaterialCommand {
  type: 'ASSIGN_MATERIAL';
  materialName: string;
  database: 'SOLIDWORKS_MATERIALS' | 'CUSTOM';
  densityGPerCm3: number;
  yieldStrengthMPa: number;
}

/**
 * Deterministic Validator for CAD Operation Plans
 * Ensures geometric boundaries, positive non-zero dimensions, and tooling limits.
 */
export class CADOperationValidator {
  static validate(plan: CADOperationPlan): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.targetDocument || plan.targetDocument.trim() === '') {
      errors.push('Target CAD document name is required.');
    }

    if (!plan.operations || plan.operations.length === 0) {
      errors.push('Operation plan contains no CAD feature commands.');
    }

    let hasBaseExtrude = false;

    plan.operations.forEach((op, index) => {
      switch (op.type) {
        case 'EXTRUDE_BOSS':
          if (op.depthMm <= 0) {
            errors.push(`Step ${index + 1} (${op.featureName}): Extrude depth must be greater than zero.`);
          }
          if (op.depthMm > 2000) {
            warnings.push(`Step ${index + 1} (${op.featureName}): Extrude depth (${op.depthMm}mm) exceeds typical CNC envelope.`);
          }
          hasBaseExtrude = true;
          break;

        case 'HOLE_PATTERN':
          if (op.diameterMm <= 0) {
            errors.push(`Step ${index + 1} (${op.featureName}): Hole diameter must be positive.`);
          }
          if (op.positions.length === 0) {
            errors.push(`Step ${index + 1} (${op.featureName}): Hole pattern must have at least one position coordinate.`);
          }
          break;

        case 'APPLY_FILLET':
          if (op.radiusMm <= 0) {
            errors.push(`Step ${index + 1} (${op.featureName}): Fillet radius must be greater than zero.`);
          }
          break;
      }
    });

    if (!hasBaseExtrude) {
      warnings.push('Plan does not establish a base extrude feature.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
