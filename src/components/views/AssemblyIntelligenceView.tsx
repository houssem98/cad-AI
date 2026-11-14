/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GitFork,
  Layers,
  Box,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { INITIAL_BOM } from '../../data/mockCadData';

export const AssemblyIntelligenceView: React.FC = () => {
  const [explodedRatio, setExplodedRatio] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState('MF-BRK-084-AL');

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f select-none text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-graphite-23">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-steel-400" />
            <span>Assembly Intelligence & Kinematic Interference</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Multi-Body Collision
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Analyze sub-assembly mating constraints, detect volumetric interferences, and inspect bill of materials hierarchy.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-tech font-bold">
          Demo data
        </span>
      </div>

      {/* L7 T10 (council S2): this view is not connected to the kernel, so it says so instead of reporting a check it never ran. */}
      <p data-testid="demo-label" role="note" className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-200">
        Demo data: the parts, mates, bill of materials and interference results below are fixed samples, not your assembly. The
        kernel can place parts by face mates and measure interference, but that is not yet connected to this view.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3D Assembly Interactive Canvas with Exploded View Slider (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm">
              EV Subframe Bracket Assembly (ASM-084)
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-tech">Explode:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={explodedRatio}
                onChange={(e) => setExplodedRatio(Number(e.target.value))}
                className="w-32 accent-steel-500"
              />
              <span className="text-xs text-steel-400 font-tech w-8">{explodedRatio}%</span>
            </div>
          </div>

          {/* Graphic Assembly Viewer */}
          <div className="relative w-full h-[380px] bg-graphite-13 border border-graphite-34 rounded-lg flex items-center justify-center cad-grid-bg overflow-hidden shadow-inner">
            <div className="relative flex flex-col items-center justify-center transition duration-300">
              {/* Screws floating above with exploded ratio */}
              <div
                className="flex gap-16 transition duration-300"
                style={{ transform: `translateY(-${explodedRatio * 1.2}px)` }}
              >
                <div className="w-4 h-10 bg-neutral-300 rounded-t border border-neutral-600 flex flex-col items-center shadow-lg">
                  <div className="w-6 h-3 bg-neutral-400 rounded-t" />
                </div>
                <div className="w-4 h-10 bg-neutral-300 rounded-t border border-neutral-600 flex flex-col items-center shadow-lg">
                  <div className="w-6 h-3 bg-neutral-400 rounded-t" />
                </div>
              </div>

              {/* Main Mounting Bracket */}
              <div className="relative w-56 h-36 bg-neutral-400 border-2 border-neutral-600 rounded-lg p-3 shadow-2xl flex items-center justify-center font-tech text-xs text-neutral-900 font-bold">
                Mounting Bracket (L-Profile)
              </div>

              {/* Base chassis mount plate below */}
              <div
                className="w-72 h-8 bg-neutral-700 border-2 border-neutral-600 rounded mt-2 flex items-center justify-center font-tech text-xs text-neutral-300 shadow-xl transition duration-300"
                style={{ transform: `translateY(${explodedRatio * 0.8}px)` }}
              >
                Chassis Ground Plate Subframe
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-tech text-neutral-400">
            <span>Parts: 9 Entities • Mates: 18 Coincident/Concentric • Clearance: 0.15mm min</span>
            <button className="text-steel-400 hover:text-steel-300 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              <span>Export Assembly STEP</span>
            </button>
          </div>
        </div>

        {/* Right: Component Explorer & BOM Rollup */}
        <div className="p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4">
          <div className="font-semibold text-neutral-100 text-sm">
            Component Hierarchy & Mates
          </div>

          <div className="space-y-2 text-xs">
            {INITIAL_BOM.map((part) => (
              <div
                key={part.id}
                onClick={() => setSelectedComponent(part.partNumber)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedComponent === part.partNumber
                    ? 'bg-steel-950/60 border-steel-500 text-white'
                    : 'bg-graphite-1c border-graphite-2c text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <div className="flex justify-between font-semibold">
                  <span>{part.partNumber}</span>
                  <span className="font-tech text-steel-400">Qty: {part.qty}</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">{part.description}</div>
                <div className="flex justify-between text-[10px] font-tech text-neutral-500 pt-1.5 mt-1 border-t border-graphite-29">
                  <span>{part.material}</span>
                  <span>{part.massKg} kg</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Collision Free Assembly</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              No overlapping volumes detected across standard fastener pitch tolerances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
