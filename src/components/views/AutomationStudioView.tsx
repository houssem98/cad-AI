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
} from 'lucide-react';

export const AutomationStudioView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const workflowNodes = [
    {
      id: 'node-1',
      title: 'Trigger: Engineering Requirement Input',
      type: 'trigger',
      desc: 'Webhook or Natural Language Prompt received from Jira/Slack/UI',
      status: 'active',
    },
    {
      id: 'node-2',
      title: 'LLM Agent: Parameter Extraction & AST Plan',
      type: 'agent',
      desc: 'Parses dimensions, units, tolerances, and builds structured AST',
      status: 'active',
    },
    {
      id: 'node-3',
      title: 'Local CAD Bridge: SolidWorks COM Regeneration',
      type: 'cad',
      desc: 'Executes parametric feature tree rebuild via desktop bridge (Port 8892)',
      status: 'active',
    },
    {
      id: 'node-4',
      title: 'Verification Kernel: B-Rep & Manifold Audit',
      type: 'verify',
      desc: 'Deterministic Parasolid check for Euler V-E+F=2, wall thickness >= 3mm',
      status: 'active',
    },
    {
      id: 'node-5',
      title: 'Export & Release: STEP AP242 & 2D Drawing PDF',
      type: 'export',
      desc: 'Generates neutral interchange files and syncs BOM with ERP system',
      status: 'active',
    },
  ];

  const handleRunWorkflow = () => {
    setIsRunning(true);
    setActiveStep(1);
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (!prev || prev >= 5) {
          clearInterval(interval);
          setIsRunning(false);
          return null;
        }
        return prev + 1;
      });
    }, 700);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-400" />
            <span>Automation Studio & Workflow Orchestration</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Deterministic DAG
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build, test, and schedule headless CAD automation pipelines with human approval gates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? `Running Node ${activeStep}...` : 'Run Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas with Directed Graph Nodes */}
      <div className="relative w-full min-h-[500px] bg-[#0c1322] border border-[#202e48] rounded-xl p-8 cad-grid-bg flex flex-col items-center justify-center shadow-inner space-y-6">
        <div className="max-w-2xl w-full space-y-4">
          {workflowNodes.map((node, index) => {
            const isCurrent = activeStep === index + 1;
            const isCompleted = activeStep !== null && activeStep > index + 1;

            return (
              <React.Fragment key={node.id}>
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-950/80 border-blue-400 shadow-lg shadow-blue-600/20 scale-102'
                      : isCompleted
                      ? 'bg-[#101e30] border-emerald-500/50 text-slate-300'
                      : 'bg-[#101728] border-[#22314d] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#182338] border border-[#2d3e5e] text-blue-400 text-xs font-tech font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-slate-200 text-xs">{node.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-tech">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-blue-500 text-white animate-pulse">
                          Executing
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 pl-9">
                    {node.desc}
                  </p>
                </div>

                {index < workflowNodes.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-0.5 h-6 bg-blue-500/40" />
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
