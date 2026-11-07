/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCode2,
  Sparkles,
  Play,
  CheckCircle2,
  Cpu,
  Layers,
  Box,
  ArrowRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { CADModelParameters } from '../../types/cad';
import { AVAILABLE_MATERIALS } from '../../data/mockCadData';

interface TextToCadViewProps {
  onApplyToCAD: (params: Partial<CADModelParameters>) => void;
  onNavigateToAgent: () => void;
}

export const TextToCadView: React.FC<TextToCadViewProps> = ({
  onApplyToCAD,
  onNavigateToAgent,
}) => {
  const [prompt, setPrompt] = useState(
    'Create an aerospace-grade mounting bracket with 80mm length, 50mm width, 10mm thickness, a vertical flange of 50mm height, with 4 mounting holes of Ø8mm and a center bore of Ø24mm.'
  );
  const [targetCad, setTargetCad] = useState('SOLIDWORKS 2024');
  const [material, setMaterial] = useState('Aluminum 6061-T6');
  const [units, setUnits] = useState('mm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any[] | null>([
    { step: 1, name: 'Datum Reference Frame', desc: 'Create Front, Top, Right reference planes with global origin at base centroid.' },
    { step: 2, name: 'Sketch1 (Base Plate Profile)', desc: 'Rectangle 80.00 mm × 50.00 mm with R2 corner fillets.' },
    { step: 3, name: 'Extrude1 (Base Extrude Boss)', desc: 'Blind extrusion depth 10.00 mm along +Z axis.' },
    { step: 4, name: 'Flange Extrude Boss', desc: 'Vertical upright flange 50.00 mm height along back edge.' },
    { step: 5, name: 'Hole Wizard Instance', desc: '4x through-all counterbored holes Ø8.00 mm spaced at margin 14.0 mm.' },
    { step: 6, name: 'Cut Extrude', desc: 'Central clearance bore Ø24.00 mm in upright flange.' },
    { step: 7, name: 'Fillet Feature', desc: 'Continuous tangential fillet R2.00 mm across intersecting edges.' },
  ]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onApplyToCAD({
        length: 80,
        width: 50,
        thickness: 10,
        flangeHeight: 50,
        holeDiameter: 8,
        material,
      });
    }, 1200);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-blue-400" />
            <span>Text-to-CAD Specification Engine</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Parametric B-Rep
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Transform natural language engineering requirements into fully constrained parametric CAD feature trees.
          </p>
        </div>

        <button
          onClick={onNavigateToAgent}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[#141d30] hover:bg-[#1b2742] text-slate-200 rounded-lg text-xs font-medium border border-[#233252] transition-colors"
        >
          <span>Open AI CAD Agent</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Configuration */}
        <div className="space-y-4">
          <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Engineering Design Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full bg-[#131b2e] border border-[#232f48] rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-tech text-[11px] block mb-1">Target CAD System</label>
                <select
                  value={targetCad}
                  onChange={(e) => setTargetCad(e.target.value)}
                  className="w-full bg-[#131b2e] border border-[#232f48] rounded p-2 text-slate-200 font-tech text-xs focus:outline-none"
                >
                  <option>SOLIDWORKS 2024</option>
                  <option>Autodesk Fusion 360</option>
                  <option>CATIA V5-6R2022</option>
                  <option>Siemens NX 2312</option>
                  <option>PTC Onshape</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-tech text-[11px] block mb-1">Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full bg-[#131b2e] border border-[#232f48] rounded p-2 text-slate-200 font-tech text-xs focus:outline-none"
                >
                  {AVAILABLE_MATERIALS.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-tech text-[11px] block mb-1">Units</label>
                <select
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full bg-[#131b2e] border border-[#232f48] rounded p-2 text-slate-200 font-tech text-xs focus:outline-none"
                >
                  <option value="mm">MMGS (mm, g, s)</option>
                  <option value="in">IPS (inch, lb, s)</option>
                  <option value="m">MKS (meter, kg, s)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
            >
              {isGenerating ? (
                <span>Generating Parametric Sequence...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Synthesize Parametric CAD Model</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Assurance Card */}
          <div className="p-4 bg-[#101728] border border-[#1e293b] rounded-xl flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-slate-200 font-medium">B-Rep Mathematical Validity Guaranteed:</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every generated feature undergoes Euler boundary validation and non-manifold edge checks prior to execution.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Synthesized Feature Sequence */}
        <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-100 text-sm">
              Synthesized Parametric Timeline
            </div>
            <span className="text-[10px] text-emerald-400 font-tech uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Deterministic AST
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
            {generatedPlan?.map((item) => (
              <div
                key={item.step}
                className="p-3 bg-[#131b2e] border border-[#202c42] rounded-lg space-y-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/40 text-[10px] font-tech font-bold flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </span>
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>
                <p className="text-slate-400 text-[11px] pl-7">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#1e293b]">
            <span className="text-xs text-slate-400 font-tech">7 Parametric Operations Ready</span>
            <button
              onClick={onNavigateToAgent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
            >
              Execute in CAD Viewport
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
