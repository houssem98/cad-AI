/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Play,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Download,
  Bot,
  Settings,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DAGNode, DAGWorkflow, DAGWorkflowEngine } from '../../services/automation/workflowEngine';

export const AutomationStudioView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const [nodes, setNodes] = useState<DAGNode[]>([
    {
      id: 'node-1',
      name: 'Trigger: Engineering Requirement Ingestion',
      type: 'trigger',
      description: 'Webhook / Natural Language prompt received from engineering cockpit',
      status: 'idle',
    },
    {
      id: 'node-2',
      name: 'AST Compiler: Parameter Extraction & Constraint Normalization',
      type: 'extract',
      description: 'Parses dimensions, units, tolerances, and validates AST dependency graph',
      status: 'idle',
    },
    {
      id: 'node-3',
      name: 'Desktop Bridge: SolidWorks COM Regeneration (Port 8892)',
      type: 'cad_execute',
      description: 'Dispatches typed CADOperationIR to local SolidWorks 2024 desktop seat',
      status: 'idle',
    },
    {
      id: 'node-4',
      name: 'Independent Verification Kernel: Multi-Factor Audit',
      type: 'verify',
      description: 'Audits manifold Euler genus, caliper bounding limits, and DFM wall thickness',
      status: 'idle',
    },
    {
      id: 'node-5',
      name: 'Export & Release: Native SLDPRT, STEP AP242 & 2D Drawing PDF',
      type: 'export',
      description: 'Generates production release artifacts and signs cryptographic verification token',
      status: 'idle',
    },
  ]);

  const handleRunWorkflow = async () => {
    setIsRunning(true);

    const workflow: DAGWorkflow = {
      id: `wf-${Date.now()}`,
      name: 'Automated Parametric Regeneration Pipeline',
      description: 'End-to-end CAD regeneration with independent verification',
      nodes: [...nodes],
      edges: [
        { from: 'node-1', to: 'node-2' },
        { from: 'node-2', to: 'node-3' },
        { from: 'node-3', to: 'node-4' },
        { from: 'node-4', to: 'node-5' },
      ],
      status: 'running',
    };

    await DAGWorkflowEngine.executeWorkflow(workflow, (nodeId, status, output) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, status, outputSummary: output || n.outputSummary }
            : n
        )
      );
    });

    setIsRunning(false);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-steel-400" />
            <span>Automation Studio & Graph Execution Engine</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Deterministic DAG
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Build, test, and execute asynchronous CAD automation graphs with independent verification checkpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Executing Graph Nodes...' : 'Run DAG Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas with Directed Graph Nodes */}
      <div className="relative w-full min-h-[500px] bg-[#131313] border border-[#2e2e2e] rounded-xl p-8 cad-grid-bg flex flex-col items-center justify-center shadow-inner space-y-4">
        <div className="max-w-2xl w-full space-y-3">
          {nodes.map((node, index) => {
            const isCompleted = node.status === 'completed';
            const isCurrent = node.status === 'running';

            return (
              <React.Fragment key={node.id}>
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-steel-950/90 border-steel-400 shadow-xl scale-[1.01]'
                      : isCompleted
                      ? 'bg-[#1d1d1d] border-emerald-500/50 text-neutral-300'
                      : 'bg-[#181818] border-[#313131] text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full border text-xs font-tech font-bold flex items-center justify-center ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : isCurrent
                            ? 'bg-steel-600 text-white border-steel-400 animate-pulse'
                            : 'bg-[#232323] border-[#3e3e3e] text-steel-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold text-neutral-200 text-xs">{node.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-tech font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Passed
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-steel-500 text-white animate-pulse">
                          Running
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 mt-2 pl-9">
                    {node.description}
                  </p>

                  {node.outputSummary && (
                    <div className="mt-2.5 ml-9 p-2 rounded bg-[#101010] border border-steel-500/20 font-tech text-[11px] text-steel-300">
                      Output: {node.outputSummary}
                    </div>
                  )}
                </div>

                {index < nodes.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <div className="w-0.5 h-5 bg-steel-500/40" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
