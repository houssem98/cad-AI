/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSearch,
  Upload,
  Eye,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Scan,
} from 'lucide-react';

interface DrawingToCadViewProps {
  onNavigateToAgent: () => void;
}

export const DrawingToCadView: React.FC<DrawingToCadViewProps> = ({
  onNavigateToAgent,
}) => {
  const [selectedDrawing, setSelectedDrawing] = useState('Mounting_Bracket_Draft_RevA.PDF');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractedDimensions = [
    { label: 'Length Base Plate', value: '80.00 mm', confidence: '99.8%', view: 'Front View', status: 'verified' },
    { label: 'Width Base Plate', value: '50.00 mm', confidence: '99.4%', view: 'Top View', status: 'verified' },
    { label: 'Base Thickness', value: '10.00 mm', confidence: '98.9%', view: 'Section A-A', status: 'verified' },
    { label: 'Flange Height', value: '50.00 mm', confidence: '99.2%', view: 'Side View', status: 'verified' },
    { label: '4x Hole Pattern', value: '4x Ø8.00 mm Thru', confidence: '99.5%', view: 'Top View', status: 'verified' },
    { label: 'Center Bore', value: 'Ø24.00 mm', confidence: '99.1%', view: 'Front View', status: 'verified' },
    { label: 'Fillet Radii', value: 'R2.00 mm (12x)', confidence: '97.2%', view: 'Isometric View', status: 'verified' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-blue-400" />
            <span>Drawing-to-CAD Vector Extraction</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              OCR & Geometric NLP
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze 2D PDF engineering drawings, extract GD&T annotations and tolerances, and reconstruct native 3D parametric solids.
          </p>
        </div>

        <button
          onClick={onNavigateToAgent}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
        >
          <span>Open in 3D Viewport</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2D Drawing Blueprint Viewer (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>{selectedDrawing}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              7 Views Classified
            </span>
          </div>

          {/* Blueprint Canvas Graphic */}
          <div className="relative w-full h-[400px] bg-[#0c1424] border border-[#21314e] rounded-lg p-6 flex flex-col items-center justify-center cad-grid-bg overflow-hidden shadow-inner">
            {/* Title Block Graphic */}
            <div className="absolute bottom-4 right-4 bg-[#0a101f]/90 border border-blue-500/40 p-3 rounded font-tech text-[10px] space-y-1 text-slate-300 w-52 shadow-lg">
              <div className="text-blue-400 font-bold border-b border-blue-500/30 pb-0.5">AUTONOVA CORP — DWG 084</div>
              <div>TITLE: MOUNTING BRACKET L-TYPE</div>
              <div>MATERIAL: AL 6061-T6 • SCALE 1:1</div>
              <div>TOL: ISO 2768-m • SHEET 1 OF 1</div>
            </div>

            {/* Simulated Orthographic Blueprint Drafting Projection Lines */}
            <div className="relative w-72 h-56 border-2 border-cyan-500/50 rounded flex flex-col items-center justify-center p-4 bg-blue-950/20 shadow-2xl">
              {/* L-bracket outline */}
              <div className="relative w-48 h-36 border-2 border-cyan-400">
                {/* Vertical flange bore */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-dashed border-cyan-300" />
                {/* Base plate horizontal cut */}
                <div className="absolute bottom-6 left-0 right-0 border-b-2 border-cyan-400" />
                {/* 4 mounting holes indicators */}
                <div className="absolute bottom-2 left-3 w-3 h-3 rounded-full border border-cyan-300" />
                <div className="absolute bottom-2 right-3 w-3 h-3 rounded-full border border-cyan-300" />
              </div>

              {/* Dimension markers */}
              <div className="absolute -bottom-6 text-cyan-300 font-tech text-xs font-bold">
                ◄── 80.00 mm ──►
              </div>
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-cyan-300 font-tech text-xs font-bold">
                ◄── 50.00 mm ──►
              </div>
            </div>

            <div className="absolute top-4 left-4 text-xs font-tech text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
              ANSI Y14.5 / ISO 128 Drafting Standards
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-tech">
            <span>Raster DPI: 600 • Vector Layers: 14 • Projection: 3rd Angle</span>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-[#162035] hover:bg-slate-700 text-slate-200 rounded cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New PDF/DWG</span>
              <input type="file" className="hidden" accept=".pdf,.dwg,.dxf,.png" />
            </label>
          </div>
        </div>

        {/* Right: Extracted Dimensions & NLP Validation (1 col) */}
        <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100 text-sm">
              Extracted Engineering Parameters
            </div>
            <span className="text-[10px] text-emerald-400 font-tech">100% Resolved</span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
            {extractedDimensions.map((dim, i) => (
              <div
                key={i}
                className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{dim.label}</span>
                  <span className="font-tech text-cyan-300 font-bold">{dim.value}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-tech text-slate-500 pt-1 border-t border-[#1a2336]">
                  <span>{dim.view}</span>
                  <span className="text-emerald-400">Confidence {dim.confidence}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={onNavigateToAgent}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
            >
              Reconstruct Parametric 3D Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
