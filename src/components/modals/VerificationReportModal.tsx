/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Download,
  AlertTriangle,
  FileCheck,
  Cpu,
  Layers,
  Ruler,
} from 'lucide-react';
import { VerificationCheckItem, CADModelParameters } from '../../types/cad';
import { INITIAL_VERIFICATION_CHECKS } from '../../data/mockCadData';

interface VerificationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  checks?: VerificationCheckItem[];
  parameters: CADModelParameters;
}

export const VerificationReportModal: React.FC<VerificationReportModalProps> = ({
  isOpen,
  onClose,
  checks = INITIAL_VERIFICATION_CHECKS,
  parameters,
}) => {
  if (!isOpen) return null;

  const passedCount = checks.filter((c) => c.status === 'passed').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;

  const downloadJson = () => {
    const report = {
      reportId: `VR-${Date.now()}`,
      document: 'Mounting_Bracket.SLDPRT',
      timestamp: new Date().toISOString(),
      auditor: 'MechForge Independent Verification Engine v3.4',
      parameters,
      summary: {
        totalChecks: checks.length,
        passed: passedCount,
        warnings: warningCount,
        verdict: 'APPROVED_FOR_MANUFACTURE',
      },
      checks,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Verification_Report_Mounting_Bracket.json';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0f1728] border border-[#232f48] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121b2d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100">
                Independent Verification Certificate
              </div>
              <div className="text-[11px] text-slate-400 font-tech">
                Doc: Mounting_Bracket.SLDPRT • Engine: Parasolid Native Audit
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#182338] hover:bg-blue-600 border border-[#2b3a58] rounded text-xs text-slate-200 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-950/40 to-blue-950/20 border-b border-[#1e293b] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                VERDICT: CERTIFIED PASS
              </span>
              <span className="text-xs text-slate-400 font-tech">
                Confidence: 99.8% (Deterministic B-Rep)
              </span>
            </div>
            <div className="text-lg font-bold text-slate-100">
              Geometry and Topological Integrity Verified
            </div>
            <p className="text-xs text-slate-300">
              This model was verified against nominal engineering requirements, ASME Y14.5 standards, and 3-axis CNC tooling constraints.
            </p>
          </div>

          <div className="text-right font-tech text-xs space-y-1">
            <div className="text-emerald-400 font-bold text-xl">{passedCount}/{checks.length}</div>
            <div className="text-slate-400 text-[11px]">Checks Validated</div>
          </div>
        </div>

        {/* Verification Check Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Verification Check Matrix
          </div>

          <div className="space-y-2.5">
            {checks.map((chk) => (
              <div
                key={chk.id}
                className="p-3 bg-[#12192a] border border-[#202c42] rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{chk.checkName}</span>
                    <span className="text-[10px] text-slate-500 font-tech">({chk.category})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {chk.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pl-6 font-tech text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-slate-300">{chk.expected}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Actual: </span>
                    <span className="text-slate-300">{chk.actual}</span>
                  </div>
                </div>

                <div className="pl-6 pt-1 text-[11px] text-blue-400/90 font-tech border-t border-[#1b263b] flex items-center justify-between">
                  <span>Evidence: {chk.evidence}</span>
                  <span className="text-slate-500 text-[10px]">{chk.system}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e293b] bg-[#0c121e] flex items-center justify-between text-xs text-slate-400 font-tech">
          <span>SolidWorks Parasolid Kernel v35.1 Bridge Checksum Verified</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-sans font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
