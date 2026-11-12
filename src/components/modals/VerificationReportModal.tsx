/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CircleDashed, X, Download } from 'lucide-react';
import { VerificationCheckItem, CADModelParameters } from '../../types/cad';
import { INITIAL_VERIFICATION_CHECKS } from '../../data/mockCadData';
import { Dialog } from '../workspace/Dialog';

interface VerificationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  checks?: VerificationCheckItem[];
  parameters: CADModelParameters;
}

// No verification engine produces this report yet, so it lists sample checks and says so; a part's real evidence is its execution record.
export const VerificationReportModal: React.FC<VerificationReportModalProps> = ({
  isOpen,
  onClose,
  checks = INITIAL_VERIFICATION_CHECKS,
  parameters,
}) => {
  if (!isOpen) return null;

  const downloadJson = () => {
    const report = { kind: 'demo', verdict: 'NOT_VERIFIED', note: 'sample checks only; no verification has run', parameters, checks };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Verification_Report_demo.json';
    a.click();
  };

  return (
    <Dialog label="Verification report" onClose={onClose}
      className="w-full max-w-3xl bg-[#171717] border border-[#2f2f2f] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#292929] bg-[#1b1b1b]">
        <div>
          <div className="text-sm font-bold text-neutral-100">Verification report</div>
          <div className="text-[11px] text-neutral-400 font-tech">Demo · no verification has run</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#232323] hover:bg-steel-600 border border-[#3a3a3a] rounded text-xs text-neutral-200 hover:text-white transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
          <button onClick={onClose} aria-label="Close report" className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-[#292929] space-y-1">
        <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
          Not verified
        </span>
        <p className="text-xs text-neutral-300">
          These are sample checks of the kind a verification will list. None of them ran. A part's measured volume, bounding box and validity are in its execution record.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
        {checks.map((chk) => (
          <div key={chk.id} className="p-3 bg-[#1a1a1a] border border-[#2c2c2c] rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-neutral-200">
                <CircleDashed className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <span>{chk.checkName}</span>
                <span className="text-[10px] text-neutral-500 font-tech">({chk.category})</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-neutral-700/30 text-neutral-300 border border-neutral-600/40">demo</span>
            </div>
            <div className="pl-6 font-tech text-[11px] text-neutral-400">
              <span className="text-neutral-500">Would check: </span>
              <span className="text-neutral-300">{chk.expected}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 border-t border-[#292929] bg-[#121212] flex items-center justify-end">
        <button onClick={onClose} className="px-4 py-1.5 bg-steel-600 hover:bg-steel-500 text-white rounded text-xs font-medium transition-colors">
          Close report
        </button>
      </div>
    </Dialog>
  );
};
