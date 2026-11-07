/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Activity,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { OperationHistoryRecord, VerificationCheckItem } from '../../types/cad';
import { INITIAL_OPERATION_HISTORY, INITIAL_VERIFICATION_CHECKS } from '../../data/mockCadData';

interface BottomConsoleProps {
  operations?: OperationHistoryRecord[];
  verificationChecks?: VerificationCheckItem[];
  onOpenReport?: () => void;
  onNavigateVerification?: () => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  operations = INITIAL_OPERATION_HISTORY,
  verificationChecks = INITIAL_VERIFICATION_CHECKS,
  onOpenReport,
  onNavigateVerification,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'verification' | 'progress' | 'logs'>('history');

  return (
    <div className="h-[210px] min-h-[180px] max-h-[260px] bg-[#0c111c] border-t border-[#1e293b] flex select-none flex-shrink-0">
      {/* 1. Left Section: Tabs and Table View (approx 68% width) */}
      <div className="flex-1 flex flex-col border-r border-[#1e293b] min-w-0">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#1a2336] bg-[#0e1422] text-xs">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 font-medium rounded-t-md transition-colors ${
              activeTab === 'history'
                ? 'bg-[#182338] text-white border-t-2 border-t-blue-500 border-x border-[#2b3a58]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operation History
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`py-2 px-3 font-medium rounded-t-md transition-colors ${
              activeTab === 'verification'
                ? 'bg-[#182338] text-white border-t-2 border-t-blue-500 border-x border-[#2b3a58]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Verification Results
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={`py-2 px-3 font-medium rounded-t-md transition-colors ${
              activeTab === 'progress'
                ? 'bg-[#182338] text-white border-t-2 border-t-blue-500 border-x border-[#2b3a58]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Task Progress
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-3 font-medium rounded-t-md transition-colors ${
              activeTab === 'logs'
                ? 'bg-[#182338] text-white border-t-2 border-t-blue-500 border-x border-[#2b3a58]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Logs
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* TAB 1: OPERATION HISTORY (Exact Match to Screenshot) */}
          {activeTab === 'history' && (
            <div className="w-full">
              <table className="w-full text-left text-xs font-tech">
                <thead>
                  <tr className="text-slate-400 border-b border-[#1e293b] pb-1.5 font-medium">
                    <th className="pb-2 font-medium w-24">Time</th>
                    <th className="pb-2 font-medium w-48">Action</th>
                    <th className="pb-2 font-medium w-28">Status</th>
                    <th className="pb-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162032]">
                  {operations.map((op) => (
                    <tr key={op.id} className="hover:bg-[#131c2e] transition-colors">
                      <td className="py-2 text-slate-400">{op.time}</td>
                      <td className="py-2 text-slate-200 font-sans font-medium">{op.action}</td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-sans font-medium text-xs">{op.status}</span>
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">{op.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: VERIFICATION RESULTS */}
          {activeTab === 'verification' && (
            <div className="space-y-2">
              {verificationChecks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-center justify-between p-2 bg-[#12192a] border border-[#1e293b] rounded text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-200">{chk.checkName}</div>
                      <div className="text-[11px] text-slate-400 font-tech">{chk.evidence}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {chk.status}
                    </span>
                    <div className="text-[10px] text-slate-500 font-tech mt-0.5">{chk.system}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: TASK PROGRESS */}
          {activeTab === 'progress' && (
            <div className="space-y-3 font-tech text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>Task: TSK-9402 [Mounting Bracket Parametric Sweep]</span>
                <span className="text-emerald-400">100% Completed (8.4s)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-full" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400">
                <div className="p-2 bg-[#12192a] rounded border border-[#1e293b]">
                  <div className="text-slate-500">Kernel Latency</div>
                  <div className="text-slate-200 font-bold">14 ms</div>
                </div>
                <div className="p-2 bg-[#12192a] rounded border border-[#1e293b]">
                  <div className="text-slate-500">Euler Check</div>
                  <div className="text-emerald-400 font-bold">Pass (V-E+F=2)</div>
                </div>
                <div className="p-2 bg-[#12192a] rounded border border-[#1e293b]">
                  <div className="text-slate-500">Memory Spike</div>
                  <div className="text-slate-200 font-bold">128 MB</div>
                </div>
                <div className="p-2 bg-[#12192a] rounded border border-[#1e293b]">
                  <div className="text-slate-500">Bridge Target</div>
                  <div className="text-blue-400 font-bold">SolidWorks COM</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME CAD BRIDGE LOGS */}
          {activeTab === 'logs' && (
            <div className="font-tech text-[11px] text-slate-400 space-y-1">
              <div>[10:25:12.104] [INFO] SwBridge: Received command CreateExtrudeBoss payload {`{"dims": [80, 50, 10]}`}</div>
              <div>[10:25:12.482] [INFO] SwBridge: Feature Base-Extrude created successfully (FeatID: 402)</div>
              <div>[10:25:14.210] [INFO] SwBridge: Executing HoleWizardInstance 4x Ø8.0mm standard ANSI metric</div>
              <div>[10:25:16.002] [INFO] SwBridge: Fillet R2 applied across 12 tangent edges</div>
              <div>[10:25:18.112] [INFO] SwBridge: SwApp.ActiveDoc.ForceRebuild3 &rarr; OK. ReturnCode: 0</div>
              <div className="text-emerald-400">[10:25:18.140] [VERIFY] Geometric audit verified manifold solid. Hash: 0x9b4a8e2f</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Section: Verification Center Card (Exact Match to Screenshot) */}
      <div className="w-[320px] min-w-[280px] max-w-[360px] p-4 flex flex-col justify-between bg-[#0e1524]">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300">
          <span>Verification Center</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>

        {/* Big Circular Green Verification Indicator */}
        <div className="flex items-center gap-4 py-2">
          {/* Radial Pulse / Check Badge */}
          <div className="relative w-16 h-16 rounded-full bg-emerald-950/60 border-2 border-emerald-500/80 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/50">
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-400 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-base font-bold text-slate-100 tracking-tight">
              All Checks Passed
            </div>
            <div className="text-xs text-slate-400 leading-snug">
              Model is valid and ready for use.
            </div>
          </div>
        </div>

        {/* Action Button: "View Report ->" */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              if (onOpenReport) onOpenReport();
              else if (onNavigateVerification) onNavigateVerification();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#182338] hover:bg-blue-600 border border-[#2b3a58] hover:border-blue-500 rounded text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm group"
          >
            <span>View Report</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
