/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NavigationModule =
  | 'overview'
  | 'ai-cad-agent'
  | 'cad-workspace'
  | 'text-to-cad'
  | 'drawing-to-cad'
  | 'reverse-engineering'
  | 'assembly-intelligence'
  | 'drawing-automation'
  | 'engineering-copilot'
  | 'simulation-intelligence'
  | 'automation-studio'
  | 'background-tasks'
  | 'knowledge-hub'
  | 'verification-center'
  | 'projects'
  | 'integrations'
  | 'administration';

interface Xyz { x: number; y: number; z: number }

// What GET /api/documents/:id/inspect returns: features from the adapter's inspect, geometry from the last succeeded record.
export interface DocumentView {
  id: string;
  revision: number;
  material: string | null;
  features: Array<{ id: string; type: string }>;
  inspection: { valid: boolean; volume_mm3: number; bbox_mm: { min: Xyz; max: Xyz }; counts: { solids: number; faces: number; edges: number } } | null;
  recordOperation: string | null;
}

export interface CADModelParameters {
  length: number;        // e.g. 80 mm
  width: number;         // e.g. 50 mm
  thickness: number;     // e.g. 10 mm
  flangeHeight: number;  // e.g. 50 mm
  holeDiameter: number;  // e.g. 8 mm
  centerBoreDiameter: number; // e.g. 24 mm
  filletRadius: number;  // e.g. 2 mm
  material: string;      // e.g. 'Aluminum 6061-T6'
  density: number;       // g/cm³
  mass: number;          // kg
  volume: number;        // cm³
  surfaceArea: number;   // cm²
}

export interface MaterialOption {
  id: string;
  name: string;
  density: number; // g/cm³
  yieldStrength: number; // MPa
  color: string;
  metalness: number;
  roughness: number;
}

export interface CADFeatureNode {
  id: string;
  name: string;
  type: 'sketch' | 'extrude' | 'cut' | 'fillet' | 'hole' | 'plane' | 'chamfer';
  icon: string;
  status: 'valid' | 'warning' | 'error';
  suppressed: boolean;
  parameters: string;
  children?: CADFeatureNode[];
}

export interface BOMItem {
  id: string;
  itemNo: number;
  partNumber: string;
  description: string;
  qty: number;
  material: string;
  finish: string;
  massKg: number;
  vendor: string;
  status: 'released' | 'in_review' | 'prototype';
}

export interface ExecutionPlanStep {
  step: number;
  action: string;
  details: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: string;
  content: string;
  avatar?: string;
  senderName?: string;
  plan?: ExecutionPlanStep[];
  progressPercent?: number;
  executionStatus?: 'idle' | 'planning' | 'waiting_approval' | 'executing' | 'completed' | 'failed';
  verificationSummary?: {
    passed: boolean;
    text: string;
  };
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];
  suggestedActions?: string[];
  pendingParameters?: Partial<CADModelParameters>;
  deliverablesAvailable?: boolean;
  targetPartName?: string;
  activeStageName?: string;
  downloadArtifacts?: {
    name: string;
    type: 'step' | 'stl' | 'vba' | 'python' | 'drawing';
    description: string;
    size: string;
  }[];
}

export interface OperationHistoryRecord {
  id: string;
  time: string;
  action: string;
  status: 'Success' | 'In Progress' | 'Warning' | 'Error' | 'Demo';
  details: string;
  durationMs?: number;
}

export interface VerificationCheckItem {
  id: string;
  category: 'Geometry' | 'Topology' | 'Constraints' | 'Drafting' | 'Manufacturability';
  checkName: string;
  expected: string;
  actual: string;
  status: 'passed' | 'warning' | 'failed' | 'not_checked';
  evidence: string;
  timestamp: string;
  system: string;
}

export interface CADAdapter {
  id: string;
  name: string;
  vendor: string;
  version: string;
  adapterVersion: string;
  status: 'connected' | 'disconnected' | 'demo' | 'error';
  activeDoc: string;
  supportedOperations: string[];
  lastPingMs: number;
  bridgePort: number;
}

export interface BackgroundTask {
  id: string;
  project: string;
  user: string;
  name: string;
  stage: string;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'queued';
  createdTime: string;
  duration: string;
  artifacts: string[];
  verificationStatus: 'verified' | 'pending' | 'failed';
}

export interface ProjectInfo {
  id: string;
  name: string;
  code: string;
  org: string;
  description: string;
  lead: string;
  status: 'Active' | 'Review' | 'Archived';
  docCount: number;
  lastUpdated: string;
  tags: string[];
}
