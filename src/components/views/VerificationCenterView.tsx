/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCheck,
  Cpu,
  Layers,
  Ruler,
  RefreshCw,
} from 'lucide-react';
import { VerificationCheckItem, CADModelParameters } from '../../types/cad';
import { INITIAL_VERIFICATION_CHECKS } from '../../data/mockCadData';

interface VerificationCenterViewProps {
  parameters: CADModelParameters;
  onOpenReportModal: () => void;
}

export const VerificationCenterView: React.FC<VerificationCenterViewProps> = ({
  parameters,
  onOpenReportModal,
}) => {
  const [checks, setChecks] = useState<VerificationCheckItem[]>(INITIAL_VERIFICATION_CHECKS);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleRunFreshAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 1000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Independent Verification & Geometry Audit Center</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Deterministic B-Rep
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Separation of concerns: The AI CAD agent cannot mark its own work as passed. An independent mathematical kernel audits all operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunFreshAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141d30] hover:bg-[#1b2742] text-slate-200 rounded-lg text-xs font-medium border border-[#233252] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>Run Fresh Audit</span>
          </button>
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Certificate</span>
          </button>
        </div>
      </div>

      {/* Main Verification Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#101728] border border-[#1e293b] rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Total Verification Rules</div>
          <div className="text-2xl font-bold font-tech text-white">5 Checks</div>
          <div className="text-[11px] text-slate-500 font-tech">Geometry, Topology, Tolerance, DFM</div>
        </div>
        <div className="p-4 bg-[#101728] border border-[#1e293b] rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Passed Rules</div>
          <div className="text-2xl font-bold font-tech text-emerald-400">5 / 5 (100%)</div>
          <div className="text-[11px] text-emerald-400 font-tech">Zero non-manifold edges</div>
        </div>
        <div className="p-4 bg-[#101728] border border-[#1e293b] rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Euler Genus Formula</div>
          <div className="text-2xl font-bold font-tech text-cyan-400">V - E + F = 2</div>
          <div className="text-[11px] text-slate-500 font-tech">Watertight single domain</div>
        </div>
        <div className="p-4 bg-[#101728] border border-[#1e293b] rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Audit Engine Kernel</div>
          <div className="text-2xl font-bold font-tech text-white">Parasolid v35</div>
          <div className="text-[11px] text-slate-500 font-tech">Precision 0.0001 mm</div>
        </div>
      </div>

      {/* Detailed Check Table */}
      <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
        <div className="font-semibold text-slate-100 text-sm">
          Active Geometric & Tolerance Verification Checks
        </div>

        <div className="space-y-3">
          {checks.map((chk) => (
            <div
              key={chk.id}
              className="p-3.5 bg-[#131b2e] border border-[#202c42] rounded-lg text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-100">{chk.checkName}</span>
                  <span className="text-[10px] text-slate-500 font-tech">({chk.category})</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {chk.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pl-7 text-[11px] font-tech text-slate-400">
                <div>
                  <span className="text-slate-500">Expected Criterion: </span>
                  <span className="text-slate-300">{chk.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500">Measured Value: </span>
                  <span className="text-slate-300">{chk.actual}</span>
                </div>
              </div>

              <div className="pl-7 pt-1 border-t border-[#1a2336] flex items-center justify-between text-[11px] font-tech">
                <span className="text-blue-400">Deterministic Evidence: {chk.evidence}</span>
                <span className="text-slate-500">{chk.system}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
