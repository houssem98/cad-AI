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
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  operations = INITIAL_OPERATION_HISTORY,
  verificationChecks = INITIAL_VERIFICATION_CHECKS,
  onOpenReport,
  onNavigateVerification,
  isOpen = true,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'verification' | 'progress' | 'logs'>('history');

  if (!isOpen) {
    return (
      <div className="h-7 bg-[#080d17] border-t border-[#182338] flex items-center justify-between px-3 text-xs select-none flex-shrink-0 z-20">
        <div className="flex items-center gap-3 text-[11px] font-tech text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Verification: All Checks Passed
          </span>
          <span className="text-slate-600">·</span>
          <span>{operations.length} CAD Operations</span>
          <span className="text-slate-600">·</span>
          <span>ISO 2768-m Invariants Verified</span>
        </div>

        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-tech text-blue-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <span>Show Console</span>
            <span className="text-cyan-400 font-bold">▲</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-[185px] bg-[#080d17] border-t border-[#182338] flex select-none flex-shrink-0 z-20 transition-all">
      {/* 1. Left Section: Tabs and Table View */}
      <div className="flex-1 flex flex-col border-r border-[#182338] min-w-0">
        {/* Tab Headers with Collapse Button */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#182338] bg-[#0c1220] text-xs">
          <div className="flex items-center gap-1 p-0.5 bg-[#080d17] border border-[#1a263c] rounded-lg">
            <button
              onClick={() => setActiveTab('history')}
              className={`py-1 px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Operation History ({operations.length})
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`py-1 px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Verification Results
            </button>

            <button
              onClick={() => setActiveTab('progress')}
              className={`py-1 px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Task Progress
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`py-1 px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Logs
            </button>
          </div>

          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[10px] font-tech flex items-center gap-1 cursor-pointer"
              title="Minimize Console"
            >
              <span>Minimize</span>
              <span className="font-bold">▼</span>
            </button>
          )}
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

      {/* 2. Right Section: Verification Center Card */}
      <div className="w-[240px] md:w-[260px] lg:w-[280px] p-3 flex flex-col justify-between bg-[#0a101d] shrink-0 border-l border-[#182338]">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300">
          <span className="font-semibold text-slate-200">Verification Center</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {/* Circular Green Verification Indicator */}
        <div className="flex items-center gap-3 py-1.5">
          <div className="relative w-12 h-12 rounded-full bg-emerald-950/60 border-2 border-emerald-500/80 flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100 tracking-tight truncate">
              All Checks Passed
            </div>
            <div className="text-[11px] text-slate-400 leading-tight">
              Euler genus 1 · Manifold solid
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
            className="flex items-center gap-1.5 px-3 py-1 bg-[#141e30] hover:bg-blue-600 border border-[#233550] hover:border-blue-500 rounded text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer group"
          >
            <span>View Report</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
