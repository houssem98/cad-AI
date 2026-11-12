/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  CheckCircle2,
  Layers,
  Settings,
} from 'lucide-react';
import { CADModelParameters } from '../../types/cad';

interface DrawingAutomationViewProps {
  parameters: CADModelParameters;
}

export const DrawingAutomationView: React.FC<DrawingAutomationViewProps> = ({
  parameters,
}) => {
  const [standard, setStandard] = useState<'ASME' | 'ISO'>('ASME');
  const [sheetSize, setSheetSize] = useState('A3 (420 x 297 mm)');

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-steel-400" />
            <span>Automated Technical Drawing & 2D Drafting</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              ASME Y14.5 / ISO 128
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Generate production-ready orthographic views, section cuts, GD&T callouts, and compliant title blocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const content = `Auto-generated CAD Drafting Specification\nPart: Mounting_Bracket\nStandard: ${standard} Y14.5\nDimensions: ${parameters.length} x ${parameters.width} x ${parameters.thickness} mm\nMaterial: ${parameters.material}\nDate: ${new Date().toISOString()}`;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Mounting_Bracket_Drafting_Sheet.txt';
              a.click();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Drawing PDF & DXF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drawing Canvas */}
        <div className="lg:col-span-2 p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-100 text-sm">Sheet 1: Orthographic & Isometric Layout</span>
            <span className="text-[10px] font-tech text-steel-400 bg-steel-500/10 px-2 py-0.5 rounded border border-steel-500/20">
              Scale 1:1 • 3rd Angle Projection
            </span>
          </div>

          <div className="relative w-full h-[400px] bg-[#131313] border-2 border-[#2c2c2c] rounded-lg p-6 flex flex-col justify-between cad-grid-bg shadow-inner">
            {/* Top Row: Top View + Isometric */}
            <div className="flex justify-around items-center">
              <div className="p-4 border border-steel-500/30 rounded bg-steel-950/20 text-center font-tech text-xs">
                <div className="text-steel-400 font-bold mb-1">TOP VIEW</div>
                <div className="w-32 h-20 border-2 border-steel-400 mx-auto rounded-sm flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400">4x Ø{parameters.holeDiameter} Holes</span>
                </div>
              </div>

              <div className="p-4 border border-steel-500/30 rounded bg-steel-950/20 text-center font-tech text-xs">
                <div className="text-steel-400 font-bold mb-1">ISOMETRIC VIEW</div>
                <div className="w-32 h-20 border-2 border-steel-400 mx-auto rounded-sm flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400">Mounting_Bracket</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Front View + Section Cut A-A */}
            <div className="flex justify-around items-center">
              <div className="p-4 border border-steel-500/30 rounded bg-steel-950/20 text-center font-tech text-xs">
                <div className="text-steel-400 font-bold mb-1">FRONT VIEW</div>
                <div className="w-32 h-20 border-2 border-steel-400 mx-auto rounded-sm flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400">{parameters.length} x {parameters.flangeHeight} mm</span>
                </div>
              </div>

              <div className="p-4 border border-steel-500/30 rounded bg-steel-950/20 text-center font-tech text-xs">
                <div className="text-steel-400 font-bold mb-1">SECTION A-A</div>
                <div className="w-32 h-20 border-2 border-dashed border-steel-400 mx-auto rounded-sm flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400">Wall Thk {parameters.thickness}mm</span>
                </div>
              </div>
            </div>

            {/* Title Block on bottom right */}
            <div className="self-end bg-[#0f0f0f] border border-steel-500/40 p-2.5 rounded font-tech text-[10px] w-64 text-neutral-300">
              <div className="font-bold text-steel-400">AUTONOVA CORP — DWG-084-AL</div>
              <div>TITLE: MOUNTING BRACKET PROJECTION</div>
              <div>MATERIAL: {parameters.material}</div>
              <div>DRAWN BY: ALEX JOHNSON • TOL: ISO 2768-m</div>
            </div>
          </div>
        </div>

        {/* Configuration settings */}
        <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-4 text-xs">
          <div className="font-semibold text-neutral-100 text-sm">Drawing Configuration</div>

          <div className="space-y-3">
            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Standard</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStandard('ASME')}
                  className={`flex-1 py-1.5 rounded border ${
                    standard === 'ASME' ? 'bg-steel-600 border-steel-500 text-white' : 'bg-[#1c1c1c] border-[#2c2c2c] text-neutral-400'
                  }`}
                >
                  ASME Y14.5M
                </button>
                <button
                  onClick={() => setStandard('ISO')}
                  className={`flex-1 py-1.5 rounded border ${
                    standard === 'ISO' ? 'bg-steel-600 border-steel-500 text-white' : 'bg-[#1c1c1c] border-[#2c2c2c] text-neutral-400'
                  }`}
                >
                  ISO 128
                </button>
              </div>
            </div>

            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Sheet Size</label>
              <select
                value={sheetSize}
                onChange={(e) => setSheetSize(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded p-2 text-neutral-200 font-tech text-xs focus:outline-none"
              >
                <option>A3 (420 x 297 mm)</option>
                <option>A4 (297 x 210 mm)</option>
                <option>ANSI B (11 x 17 in)</option>
                <option>ANSI D (22 x 34 in)</option>
              </select>
            </div>

            <div className="p-3 bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg space-y-1.5 font-tech text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Total Dimensions:</span>
                <span className="text-neutral-200">24 Callouts</span>
              </div>
              <div className="flex justify-between">
                <span>Datum References:</span>
                <span className="text-neutral-200">Datums A, B, C</span>
              </div>
              <div className="flex justify-between">
                <span>Surface Finish:</span>
                <span className="text-neutral-200">Ra 1.6 μm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
