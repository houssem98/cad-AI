/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  FileCode,
  FileCheck,
  X,
  Layers,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { CADModelParameters } from '../../types/cad';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parameters: CADModelParameters;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  parameters,
}) => {
  if (!isOpen) return null;

  const [format, setFormat] = useState<'step' | 'stl' | 'obj' | 'dxf' | 'sldprt'>('step');
  const [precision, setPrecision] = useState<'high' | 'medium' | 'manufacturing'>('manufacturing');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setDownloadReady(true);

      // Trigger realistic mock CAD file download
      const content = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('STEP AP214 Parametric Solid'),'1');\nFILE_NAME('Mounting_Bracket.${format.toUpperCase()}','${new Date().toISOString()}',('Alex Johnson'),('MechForge AI'),'SolidWorks Bridge v2.8','MechForge Kernel','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\nENDSEC;\nDATA;\n/* Parameters: L=${parameters.length} W=${parameters.width} T=${parameters.thickness} Material=${parameters.material} */\n#10 = PRODUCT_DEFINITION('Mounting_Bracket','L-Bracket Spec',#11,#12);\nENDSEC;\nEND-ISO-10303-21;`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mounting_Bracket.${format}`;
      a.click();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f1728] border border-[#232f48] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b] bg-[#121b2d]">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-100 text-sm">Export CAD Geometry</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Format selection */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'step', label: 'STEP (AP214 / AP242)', desc: 'Parametric B-Rep' },
                { id: 'stl', label: 'STL (High-Density)', desc: '3D Printing & Mesh' },
                { id: 'obj', label: 'Wavefront OBJ', desc: 'Textured Surface Mesh' },
                { id: 'sldprt', label: 'SolidWorks Part', desc: 'Feature Tree Native' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    format === f.id
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                      : 'bg-[#12192a] border-[#202c42] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{f.label}</div>
                  <div className="text-[10px] text-slate-500 font-tech">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Precision selection */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
              Tessellation / Kernel Precision
            </label>
            <select
              value={precision}
              onChange={(e) => setPrecision(e.target.value as any)}
              className="w-full bg-[#12192a] border border-[#202c42] rounded-lg p-2 text-slate-200 font-tech text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="manufacturing">Tooling Grade (Tolerance 0.001 mm)</option>
              <option value="high">Fine Visual (Chord Height 0.005 mm)</option>
              <option value="medium">Standard Fast (Chord Height 0.02 mm)</option>
            </select>
          </div>

          {/* Model Spec Summary */}
          <div className="p-3 bg-[#11192b] border border-[#202c42] rounded-lg font-tech text-[11px] space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>Part:</span>
              <span className="text-slate-200">Mounting_Bracket.{format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Bounding Box:</span>
              <span className="text-slate-200">{parameters.length} x {parameters.width} x {parameters.flangeHeight + parameters.thickness} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Material:</span>
              <span className="text-slate-200">{parameters.material}</span>
            </div>
            <div className="flex justify-between">
              <span>Adapter Bridge:</span>
              <span className="text-emerald-400">Local SolidWorks 2024 COM</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e293b] bg-[#0c121e] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors shadow-md shadow-blue-600/30"
          >
            {isExporting ? (
              <span>Translating B-Rep...</span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
