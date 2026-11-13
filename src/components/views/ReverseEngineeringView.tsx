/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Scan,
  Layers,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ReverseEngineeringView: React.FC = () => {
  const [pointCount, setPointCount] = useState('1,248,000 pts');
  const [deviationTolerance, setDeviationTolerance] = useState('0.025 mm');

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-graphite-23">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scan className="w-5 h-5 text-steel-400" />
            <span>Reverse Engineering & Scan-to-CAD Reconstruction</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              NURBS Surface Fitting
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Convert high-density optical 3D scan point clouds and mesh geometry into editable parametric B-Rep CAD models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm">
              Point Cloud Mesh vs Parametric B-Rep Overlay
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech bg-steel-500/10 text-steel-400 border border-steel-500/20">
              Deviation Heatmap Active
            </span>
          </div>

          <div className="relative w-full h-[360px] bg-graphite-13 border border-graphite-2c rounded-lg flex items-center justify-center cad-grid-bg shadow-inner">
            <div className="relative w-72 h-52 border border-steel-500/40 rounded-lg flex items-center justify-center bg-steel-950/20 shadow-2xl">
              <div className="text-center space-y-1">
                <div className="font-tech text-xs text-steel-300 font-bold">
                  B-Spline Patch Fit: 99.6% In-Tolerance
                </div>
                <div className="font-tech text-[11px] text-neutral-400">
                  RMS Surface Deviation: ±0.012 mm
                </div>
                <div className="text-[10px] text-emerald-400 font-tech">
                  ● Scan Point Cloud (Green) | ── B-Rep Surface (Blue)
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-tech">
            <div className="p-3 bg-graphite-1c border border-graphite-2c rounded-lg">
              <span className="text-neutral-500 block text-[11px]">Optical Points</span>
              <span className="text-base font-bold text-white">{pointCount}</span>
            </div>
            <div className="p-3 bg-graphite-1c border border-graphite-2c rounded-lg">
              <span className="text-neutral-500 block text-[11px]">Fitting Tolerance</span>
              <span className="text-base font-bold text-steel-400">{deviationTolerance}</span>
            </div>
            <div className="p-3 bg-graphite-1c border border-graphite-2c rounded-lg">
              <span className="text-neutral-500 block text-[11px]">Geometric Primitives</span>
              <span className="text-base font-bold text-emerald-400">Planes, Cylinders, Fillets</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4 text-xs">
          <div className="font-semibold text-neutral-100 text-sm">Reconstruction Sequence</div>
          <div className="space-y-2">
            {[
              { step: '1', title: 'Curvature Segmentation', status: 'Passed' },
              { step: '2', title: 'Datum Plane Extraction', status: 'Passed' },
              { step: '3', title: 'Hole Cylinder Axial Detection', status: 'Passed' },
              { step: '4', title: 'Parametric Feature History Synthesis', status: 'Passed' },
            ].map((s) => (
              <div key={s.step} className="p-2.5 bg-graphite-1c border border-graphite-2c rounded-lg flex items-center justify-between">
                <span className="text-neutral-200">Step {s.step}: {s.title}</span>
                <span className="text-emerald-400 font-tech font-bold text-[10px] uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{s.status}</span>
              </div>
            ))}
          </div>

          <button className="w-full py-2.5 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors">
            Generate Parametric SolidWorks Part
          </button>
        </div>
      </div>
    </div>
  );
};
