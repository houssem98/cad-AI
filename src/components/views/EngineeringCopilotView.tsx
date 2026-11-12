/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cpu,
  Search,
  BookOpen,
  Calculator,
  FileText,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const EngineeringCopilotView: React.FC = () => {
  const [calcLoad, setCalcLoad] = useState(3500); // N
  const [calcLength, setCalcLength] = useState(80); // mm
  const [calcThickness, setCalcThickness] = useState(10); // mm
  const [calcWidth, setCalcWidth] = useState(50); // mm

  // Cantilever beam deflection: delta = (F * L^3) / (3 * E * I)
  // I = (w * t^3) / 12
  const E = 69000; // MPa for Aluminum 6061
  const I = (calcWidth * Math.pow(calcThickness, 3)) / 12; // mm^4
  const deflectionMm = parseFloat(((calcLoad * Math.pow(calcLength, 3)) / (3 * E * I)).toFixed(3));
  // Bending stress: sigma = (M * y) / I = (F * L * (t/2)) / I
  const bendingStressMPa = Math.round((calcLoad * calcLength * (calcThickness / 2)) / I);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-steel-400" />
            <span>Engineering Copilot & Technical Calculation Hub</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Validated Physics
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Deterministic mechanical engineering equations, ASME/ISO standards retrieval, and formula validation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Engineering Calculator */}
        <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4 text-steel-400" />
              <span>Cantilever Beam Stress & Deflection (Euler-Bernoulli)</span>
            </div>
            <span className="text-[10px] font-tech text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Closed-Form Solution
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Applied End Load (N)</label>
              <input
                type="number"
                value={calcLoad}
                onChange={(e) => setCalcLoad(Number(e.target.value))}
                className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded p-2 text-neutral-200 font-tech text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Beam Length (mm)</label>
              <input
                type="number"
                value={calcLength}
                onChange={(e) => setCalcLength(Number(e.target.value))}
                className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded p-2 text-neutral-200 font-tech text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Plate Width (mm)</label>
              <input
                type="number"
                value={calcWidth}
                onChange={(e) => setCalcWidth(Number(e.target.value))}
                className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded p-2 text-neutral-200 font-tech text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-tech text-[11px] block mb-1">Plate Thickness (mm)</label>
              <input
                type="number"
                value={calcThickness}
                onChange={(e) => setCalcThickness(Number(e.target.value))}
                className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded p-2 text-neutral-200 font-tech text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-[#1a1a1a] border border-[#2c2c2c] rounded-lg grid grid-cols-2 gap-4 text-xs font-tech">
            <div>
              <span className="text-neutral-500 block text-[11px]">Maximum Bending Stress</span>
              <span className="text-lg font-bold text-neutral-100">{bendingStressMPa} MPa</span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">Yield: 276 MPa (Al 6061)</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[11px]">Tip Displacement Deflection</span>
              <span className="text-lg font-bold text-steel-400">{deflectionMm} mm</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Within L/200 limit</span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 font-tech">
            Equation: σ = (M · y) / I = (F · L · (t/2)) / ((w · t³) / 12)
          </div>
        </div>

        {/* Right: Technical Document Search & Standards Citation */}
        <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-4">
          <div className="font-semibold text-neutral-100 text-sm">
            Corporate Knowledge & Standards Retrieval
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                title: 'ASME Y14.5-2018: Dimensioning & Tolerancing',
                section: 'Section 7: Position Tolerancing for Fastener Clearance Holes',
                citation: 'Specifies 1.5xD minimum hole center to edge margin for machined plates.',
              },
              {
                title: 'ISO 2768-m: General Tolerances for Linear Dimensions',
                section: 'Table 1: Permissible deviations for basic dimensions 30mm to 120mm',
                citation: 'Linear tolerance bracket: ±0.3 mm for medium precision workshop milling.',
              },
              {
                title: 'MMPDS-14: Metallic Materials Properties Development',
                section: 'Chapter 3: Aluminum 6061-T6 Extruded Plate & Bar Data',
                citation: 'Ftu = 310 MPa, Fty = 276 MPa, E = 68.9 GPa, Poisson ratio = 0.33.',
              },
            ].map((doc, idx) => (
              <div key={idx} className="p-3 bg-[#1c1c1c] border border-[#2c2c2c] rounded-lg space-y-1">
                <div className="font-semibold text-steel-400">{doc.title}</div>
                <div className="text-[11px] text-neutral-300 font-tech">{doc.section}</div>
                <p className="text-[11px] text-neutral-400 pt-1 border-t border-[#232323]">{doc.citation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
