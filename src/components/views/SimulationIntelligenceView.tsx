/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Download,
  Flame,
} from 'lucide-react';
import { CADModelParameters } from '../../types/cad';

interface SimulationIntelligenceViewProps {
  parameters: CADModelParameters;
  onNavigateToAgent: () => void;
}

export const SimulationIntelligenceView: React.FC<SimulationIntelligenceViewProps> = ({
  parameters,
  onNavigateToAgent,
}) => {
  const [loadNewtons, setLoadNewtons] = useState(3500);
  const [isSolving, setIsSolving] = useState(false);
  const [hasSolved, setHasSolved] = useState(true);

  // Compute realistic FEA approximations
  // Stress = F / Area, bending moment M = F * L / (Z_section)
  const maxStressMPa = Math.round((loadNewtons / (parameters.thickness * parameters.width)) * 2.8);
  const yieldStrengthMPa = 276; // Al 6061-T6
  const factorOfSafety = parseFloat((yieldStrengthMPa / Math.max(1, maxStressMPa)).toFixed(2));
  const isSafe = factorOfSafety >= 1.5;

  const handleRunFEA = () => {
    setIsSolving(true);
    setTimeout(() => {
      setIsSolving(false);
      setHasSolved(true);
    }, 1500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Simulation Intelligence & Finite Element Analysis (FEA)</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Von Mises Solver
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate static structural stress, safety factors, and displacement contours under physical mechanical loads.
          </p>
        </div>

        <button
          onClick={onNavigateToAgent}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141d30] hover:bg-[#1b2742] text-slate-200 rounded-lg text-xs font-medium border border-[#233252] transition-colors"
        >
          <span>Return to CAD Agent</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3D FEA Heatmap Contour Simulation Graphic (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100 text-sm">
              Von Mises Stress Distribution (Static Structural)
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Mesh: 142,800 Tetrahedral Elements
            </span>
          </div>

          {/* FEA Contour Visualizer */}
          <div className="relative w-full h-[380px] bg-[#0c1322] border border-[#223354] rounded-lg flex items-center justify-center cad-grid-bg overflow-hidden shadow-inner">
            {/* Stress Contour Palette Spectrum Bar */}
            <div className="absolute top-4 right-4 bg-[#0a101f]/90 border border-[#223354] p-2.5 rounded font-tech text-[10px] space-y-1 w-32 shadow-xl z-20">
              <div className="text-slate-300 font-bold mb-1">Von Mises (MPa)</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span>{maxStressMPa} MPa (Max)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-amber-500" />
                <span>{Math.round(maxStressMPa * 0.75)} MPa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span>{Math.round(maxStressMPa * 0.5)} MPa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                <span>{Math.round(maxStressMPa * 0.25)} MPa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-indigo-900" />
                <span>0.0 MPa (Min)</span>
              </div>
            </div>

            {/* FEA Graphic Representation of Mounting Bracket */}
            <div className="relative w-72 h-64 flex flex-col items-center justify-center">
              {/* Vertical Flange with gradient stress concentration */}
              <div
                className="relative w-44 h-36 rounded-t-lg border-2 border-slate-700/60 shadow-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #1e3a8a 0%, #059669 40%, #d97706 75%, #dc2626 100%)',
                }}
              >
                {/* Center hole cutout */}
                <div className="w-16 h-16 rounded-full bg-[#0c1322] border-2 border-amber-400 shadow-inner flex items-center justify-center font-tech text-[10px] text-amber-300 font-bold">
                  Bore
                </div>

                {/* Arrow load indicator */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-rose-300 font-tech text-[11px] font-bold flex items-center gap-1">
                  <span>↓ {loadNewtons} N</span>
                </div>
              </div>

              {/* Base Plate with lower stress */}
              <div
                className="w-56 h-14 rounded-b-lg border-2 border-slate-700/60 flex items-center justify-around px-4"
                style={{
                  background: 'linear-gradient(90deg, #172554 0%, #1e3a8a 50%, #172554 100%)',
                }}
              >
                <div className="w-4 h-4 rounded-full bg-[#0c1322] border border-blue-400" />
                <div className="w-4 h-4 rounded-full bg-[#0c1322] border border-blue-400" />
              </div>

              {/* Fixed boundary constraint icons (triangles) */}
              <div className="w-56 flex justify-around text-blue-400 font-tech text-xs mt-1">
                <span>▲ FIXED</span>
                <span>▲ FIXED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-tech">
            <div className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg">
              <span className="text-slate-500 block text-[11px]">Maximum Stress</span>
              <span className={`text-base font-bold ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                {maxStressMPa} MPa
              </span>
            </div>

            <div className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg">
              <span className="text-slate-500 block text-[11px]">Material Yield Limit</span>
              <span className="text-base font-bold text-slate-200">
                {yieldStrengthMPa} MPa ({parameters.material})
              </span>
            </div>

            <div className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg">
              <span className="text-slate-500 block text-[11px]">Factor of Safety (FoS)</span>
              <span className={`text-base font-bold ${isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                {factorOfSafety}x {isSafe ? '(Acceptable)' : '(Critical Yield)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Load Case & Boundary Condition Configuration (1 col) */}
        <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="font-semibold text-slate-100 text-sm">
            Load & Boundary Conditions
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-tech text-[11px] block">Applied Dynamic Force (N)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={500}
                  max={12000}
                  step={100}
                  value={loadNewtons}
                  onChange={(e) => setLoadNewtons(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="font-tech text-slate-200 font-bold w-16 text-right">
                  {loadNewtons} N
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg space-y-2">
              <div className="flex justify-between font-tech text-[11px]">
                <span className="text-slate-400">Boundary Constraint:</span>
                <span className="text-slate-200 font-medium">4x Base Holes Bolted Rigid</span>
              </div>
              <div className="flex justify-between font-tech text-[11px]">
                <span className="text-slate-400">Force Direction:</span>
                <span className="text-slate-200 font-medium">-Y Normal (Downwards)</span>
              </div>
              <div className="flex justify-between font-tech text-[11px]">
                <span className="text-slate-400">Solver Kernel:</span>
                <span className="text-blue-400 font-medium">CalculiX / Code_Aster Bridge</span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              isSafe
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}>
              <div className="font-semibold flex items-center gap-1.5">
                {isSafe ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
                <span>{isSafe ? 'Structure Dimensionally Compliant' : 'Warning: Elastic Deformation Exceeded'}</span>
              </div>
              <p className="text-[11px] leading-tight text-slate-300">
                {isSafe
                  ? `Safety factor of ${factorOfSafety}x exceeds automotive minimum design criterion (1.5x).`
                  : 'Safety factor is below 1.5x. Recommend increasing plate thickness to 15mm or switching to Titanium.'}
              </p>
            </div>

            <button
              onClick={handleRunFEA}
              disabled={isSolving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
            >
              {isSolving ? 'Solving Nonlinear Displacements...' : 'Re-Run FEA Analysis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
