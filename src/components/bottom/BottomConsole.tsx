/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Check, CircleDashed } from 'lucide-react';
import { OperationHistoryRecord, VerificationCheckItem, type DocumentView } from '../../types/cad';
import { INITIAL_OPERATION_HISTORY, INITIAL_VERIFICATION_CHECKS } from '../../data/mockCadData';

interface BottomConsoleProps {
  operations?: OperationHistoryRecord[];
  verificationChecks?: VerificationCheckItem[];
  onOpenReport?: () => void;
  onNavigateVerification?: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  doc?: DocumentView | null;
}

type Tab = 'history' | 'verification' | 'progress' | 'logs';
const TABS: Array<[Tab, string]> = [['history', 'Operation History'], ['verification', 'Verification Results'], ['progress', 'Task Progress'], ['logs', 'Logs']];

// Only a record says a part was checked; without one the console says nothing was verified.
function verdict(doc?: DocumentView | null) {
  const i = doc?.inspection;
  if (!i) return { ok: false, title: 'No verification has run', detail: 'Open a part to see its execution record' };
  return {
    ok: i.valid,
    title: i.valid ? 'Kernel inspection: valid solid' : 'Kernel inspection: not a valid solid',
    detail: `${i.counts.solids} solid · ${i.counts.faces} faces · ${i.counts.edges} edges`,
  };
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  operations = INITIAL_OPERATION_HISTORY,
  verificationChecks = INITIAL_VERIFICATION_CHECKS,
  onOpenReport,
  onNavigateVerification,
  isOpen = true,
  onToggleOpen,
  doc = null,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const v = verdict(doc);

  if (!isOpen) {
    return (
      <div className="h-7 bg-[#080d17] border-t border-[#182338] flex items-center justify-between px-3 text-xs select-none flex-shrink-0 z-20">
        <div className="flex items-center gap-3 text-[11px] font-tech text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${v.ok ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {v.title}
          </span>
          <span className="text-slate-600">·</span>
          <span>{operations.length} demo history rows</span>
        </div>

        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-tech text-blue-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <span>Show Console</span>
            <span aria-hidden="true" className="text-cyan-400 font-bold">▲</span>
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
          <div role="tablist" aria-label="Console" className="flex items-center gap-1 p-0.5 bg-[#080d17] border border-[#1a263c] rounded-lg">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`py-1 px-2.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeTab === id ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {id === 'history' ? `${label} (${operations.length})` : label}
              </button>
            ))}
          </div>

          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors text-[10px] font-tech flex items-center gap-1 cursor-pointer"
              title="Minimize Console"
            >
              <span>Minimize</span>
              <span aria-hidden="true" className="font-bold">▼</span>
            </button>
          )}
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'history' && (
            <div className="w-full">
              <div className="mb-2 text-[10px] font-tech uppercase tracking-wider text-amber-300/90">Demo data · these rows are samples, not execution records</div>
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
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
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

          {activeTab === 'verification' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-300">{v.title}{doc?.inspection ? ` · ${v.detail}` : ''}</div>
              <div className="text-[10px] font-tech uppercase tracking-wider text-amber-300/90">Demo checks · samples of what a verification will list, not results</div>
              {verificationChecks.map((chk) => (
                <div key={chk.id} className="flex items-center justify-between p-2 bg-[#12192a] border border-[#1e293b] rounded text-xs">
                  <div className="flex items-center gap-2.5">
                    <CircleDashed className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-200">{chk.checkName}</div>
                      <div className="text-[11px] text-slate-400 font-tech">{chk.evidence}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-slate-700/30 text-slate-300 border border-slate-600/40">
                      demo
                    </span>
                    <div className="text-[10px] text-slate-500 font-tech mt-0.5">{chk.system}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="text-xs text-slate-400">No background jobs. The job engine arrives in a later release.</div>
          )}

          {activeTab === 'logs' && (
            <div className="text-xs text-slate-400">No worker log is shown here yet. Each operation's execution record holds its engine output.</div>
          )}
        </div>
      </div>

      {/* 2. Right Section: Verification Center Card */}
      <div className="w-[240px] md:w-[260px] lg:w-[280px] p-3 flex flex-col justify-between bg-[#0a101d] shrink-0 border-l border-[#182338]">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300">
          <span className="font-semibold text-slate-200">Verification Center</span>
          <span className={`w-2 h-2 rounded-full ${v.ok ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        </div>

        <div className="flex items-center gap-3 py-1.5">
          <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 ${v.ok ? 'bg-emerald-950/60 border-emerald-500/80' : 'bg-slate-900 border-slate-600'}`}>
            {v.ok ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <CircleDashed className="w-4 h-4 text-slate-500" />}
          </div>

          <div className="min-w-0">
            <div data-testid="verdict" className="text-sm font-bold text-slate-100 tracking-tight">{v.title}</div>
            <div className="text-[11px] text-slate-400 leading-tight">{v.detail}</div>
          </div>
        </div>

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
