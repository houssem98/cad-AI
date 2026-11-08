/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DAGNode {
  id: string;
  name: string;
  type: 'trigger' | 'extract' | 'cad_inspect' | 'cad_execute' | 'approval' | 'verify' | 'export';
  description: string;
  config?: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  executionDurationMs?: number;
  outputSummary?: string;
}

export interface DAGWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: DAGNode[];
  edges: { from: string; to: string }[];
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export class DAGWorkflowEngine {
  static async executeWorkflow(
    workflow: DAGWorkflow,
    onNodeStateChange?: (nodeId: string, status: DAGNode['status'], output?: string) => void
  ): Promise<boolean> {
    workflow.status = 'running';

    for (const node of workflow.nodes) {
      node.status = 'running';
      onNodeStateChange?.(node.id, 'running');

      const startTime = Date.now();

      // Simulate node execution latency
      await new Promise((resolve) => setTimeout(resolve, 600));

      let output = 'Step passed';
      switch (node.type) {
        case 'trigger':
          output = 'Prompt: "Create 80x50x10mm bracket" received';
          break;
        case 'extract':
          output = 'Extracted AST: L=80, W=50, T=10, Mat=Al-6061';
          break;
        case 'cad_inspect':
          output = 'Document "Mounting_Bracket.SLDPRT" active in SolidWorks';
          break;
        case 'cad_execute':
          output = 'SwApp.ActiveDoc.ForceRebuild3() -> exit code 0';
          break;
        case 'approval':
          output = 'Human engineer approved dimensional changes';
          break;
        case 'verify':
          output = 'Euler Genus 5 & ISO 2768-m verified (100% pass)';
          break;
        case 'export':
          output = 'Generated Mounting_Bracket.STEP (48.2 KB)';
          break;
      }

      node.status = 'completed';
      node.executionDurationMs = Date.now() - startTime;
      node.outputSummary = output;
      onNodeStateChange?.(node.id, 'completed', output);
    }

    workflow.status = 'completed';
    return true;
  }
}
