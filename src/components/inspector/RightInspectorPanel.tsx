/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Layers,
  Box,
  FileSpreadsheet,
  Settings,
  Circle,
  Eye,
  EyeOff,
  Download,
  Info,
  Check,
} from 'lucide-react';
import { CADModelParameters, MaterialOption, CADFeatureNode, BOMItem, type DocumentView } from '../../types/cad';
import { RecordProperties, RecordTree } from './RecordInspector';
import { AVAILABLE_MATERIALS, INITIAL_FEATURE_TREE, INITIAL_BOM } from '../../data/mockCadData';
import { PanelFrame } from '../workspace/PanelFrame';
import type { PanelViews } from '../workspace/panelViews';

interface RightInspectorPanelProps {
  parameters: CADModelParameters;
  onUpdateParameters: (newParams: Partial<CADModelParameters>) => void;
  featureTree?: CADFeatureNode[];
  bomItems?: BOMItem[];
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
  panels?: Partial<PanelViews>;
  doc?: DocumentView | null;
}

const COMPLETED = { status: 'completed' } as const;

export const RightInspectorPanel: React.FC<RightInspectorPanelProps> = ({
  parameters,
  onUpdateParameters,
  featureTree = INITIAL_FEATURE_TREE,
  bomItems = INITIAL_BOM,
  isOpen = true,
  onToggleOpen,
  onClose,
  panels = {},
  doc = null,
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'featureTree' | 'bom'>('properties');
  const [features, setFeatures] = useState<CADFeatureNode[]>(featureTree);
  const [isEditingDim, setIsEditingDim] = useState<string | null>(null);
  const [tempDimValue, setTempDimValue] = useState<string>('');

  const currentMaterial =
    AVAILABLE_MATERIALS.find((m) => m.name.toLowerCase().includes(parameters.material.toLowerCase())) ||
    AVAILABLE_MATERIALS[0];

  const handleMaterialChange = (matName: string) => {
    const selectedMat = AVAILABLE_MATERIALS.find((m) => m.name === matName);
    if (!selectedMat) return;

    // Recalculate mass based on density
    const newMass = parseFloat(((parameters.volume * selectedMat.density) / 1000).toFixed(2));

    onUpdateParameters({
      material: selectedMat.name,
      density: selectedMat.density,
      mass: newMass,
    });
  };

  const toggleFeatureSuppression = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, suppressed: !f.suppressed } : f))
    );
  };

  const handleCommitDimension = (dimKey: keyof CADModelParameters) => {
    const val = parseFloat(tempDimValue);
    if (!isNaN(val) && val > 0) {
      onUpdateParameters({ [dimKey]: val });
    }
    setIsEditingDim(null);
  };

  // Collapsed rail view (44px)
  if (!isOpen) {
    return (
      <div className="w-11 bg-[#090e18] border-l border-[#1a2336] flex flex-col items-center py-2.5 justify-between select-none flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggleOpen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#12192a] rounded transition-colors cursor-pointer"
            title="Expand Inspector Panel"
          >
            <Box className="w-4 h-4 text-cyan-400" />
          </button>

          <div className="w-5 h-[1px] bg-[#1a2336]" />

          <button
            onClick={() => {
              if (onToggleOpen) onToggleOpen();
              setActiveTab('properties');
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'properties' ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Properties"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (onToggleOpen) onToggleOpen();
              setActiveTab('featureTree');
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'featureTree' ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Feature Tree"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (onToggleOpen) onToggleOpen();
              setActiveTab('bom');
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'bom' ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Bill of Materials"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] lg:w-[300px] h-full bg-[#080d17] border-l border-[#1a2336] flex flex-col flex-shrink-0 select-none z-20 transition-all">
      {/* 1. Header Segmented Tabs with Collapse Button */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#182338] bg-[#0c1220]">
        <div role="tablist" aria-label="Inspector" className="flex items-center gap-1 p-0.5 bg-[#080d17] border border-[#1a263c] rounded-lg text-xs font-medium flex-1 mr-1">
          <button
            role="tab"
            aria-selected={activeTab === 'properties'}
            onClick={() => setActiveTab('properties')}
            className={`flex-1 py-1 px-2 text-center rounded text-[11px] transition-colors cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Properties
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'featureTree'}
            onClick={() => setActiveTab('featureTree')}
            className={`flex-1 py-1 px-2 text-center rounded text-[11px] transition-colors cursor-pointer ${
              activeTab === 'featureTree'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Feature Tree
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'bom'}
            onClick={() => setActiveTab('bom')}
            className={`flex-1 py-1 px-2 text-center rounded text-[11px] transition-colors cursor-pointer ${
              activeTab === 'bom'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            BOM
          </button>
        </div>

        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Collapse Inspector"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs no-scrollbar">
        {/* TAB 1: PROPERTIES (Matches Screenshot exactly) */}
        {activeTab === 'properties' && (
          <PanelFrame panel="properties" label="Properties" view={panels.properties ?? COMPLETED} className="space-y-4">
            {doc ? <RecordProperties doc={doc} /> : (<>
            {/* Part Information Section */}
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Part Information</span>
                <span className="text-[10px] text-amber-300 font-tech">Demo data</span>
              </div>

              <div className="bg-[#12192a] border border-[#202c42] rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Name</span>
                  <span className="font-tech text-slate-100 font-semibold">Mounting_Bracket</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Material</span>
                  <div className="relative">
                    <select
                      aria-label="Material"
                      value={currentMaterial.name}
                      onChange={(e) => handleMaterialChange(e.target.value)}
                      className="appearance-none bg-[#182236] border border-[#2d3d5c] rounded px-2.5 py-1 pr-6 text-slate-200 font-tech text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {AVAILABLE_MATERIALS.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Density</span>
                  <span className="font-tech text-slate-300">{parameters.density.toFixed(2)} g/cm³</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mass</span>
                  <span className="font-tech text-slate-300">{parameters.mass.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Dimensions</span>
                <span className="text-[10px] text-slate-500">Click to edit</span>
              </div>

              <div className="bg-[#12192a] border border-[#202c42] rounded-lg p-3 space-y-2.5">
                {/* Length */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Length</span>
                  {isEditingDim === 'length' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempDimValue}
                        onChange={(e) => setTempDimValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommitDimension('length'); if (e.key === 'Escape') setIsEditingDim(null); }}
                        aria-label="New length in mm"
                        className="w-16 bg-[#182236] border border-blue-500 px-1 py-0.5 text-xs text-white rounded font-tech focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleCommitDimension('length')}
                        aria-label="Save length"
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingDim('length');
                        setTempDimValue(parameters.length.toString());
                      }}
                      className="font-tech text-slate-200 hover:text-blue-400 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {parameters.length.toFixed(2)} mm
                    </button>
                  )}
                </div>

                {/* Width */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Width</span>
                  {isEditingDim === 'width' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempDimValue}
                        onChange={(e) => setTempDimValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommitDimension('width'); if (e.key === 'Escape') setIsEditingDim(null); }}
                        aria-label="New width in mm"
                        className="w-16 bg-[#182236] border border-blue-500 px-1 py-0.5 text-xs text-white rounded font-tech focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleCommitDimension('width')}
                        aria-label="Save width"
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingDim('width');
                        setTempDimValue(parameters.width.toString());
                      }}
                      className="font-tech text-slate-200 hover:text-blue-400 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {parameters.width.toFixed(2)} mm
                    </button>
                  )}
                </div>

                {/* Thickness */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Thickness</span>
                  {isEditingDim === 'thickness' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempDimValue}
                        onChange={(e) => setTempDimValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommitDimension('thickness'); if (e.key === 'Escape') setIsEditingDim(null); }}
                        aria-label="New thickness in mm"
                        className="w-16 bg-[#182236] border border-blue-500 px-1 py-0.5 text-xs text-white rounded font-tech focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleCommitDimension('thickness')}
                        aria-label="Save thickness"
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingDim('thickness');
                        setTempDimValue(parameters.thickness.toString());
                      }}
                      className="font-tech text-slate-200 hover:text-blue-400 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {parameters.thickness.toFixed(2)} mm
                    </button>
                  )}
                </div>

                {/* Hole Diameter */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Hole Diameter</span>
                  {isEditingDim === 'holeDiameter' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempDimValue}
                        onChange={(e) => setTempDimValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCommitDimension('holeDiameter'); if (e.key === 'Escape') setIsEditingDim(null); }}
                        aria-label="New hole diameter in mm"
                        className="w-16 bg-[#182236] border border-blue-500 px-1 py-0.5 text-xs text-white rounded font-tech focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleCommitDimension('holeDiameter')}
                        aria-label="Save hole diameter"
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingDim('holeDiameter');
                        setTempDimValue(parameters.holeDiameter.toString());
                      }}
                      className="font-tech text-slate-200 hover:text-blue-400 hover:bg-slate-800/60 px-1.5 py-0.5 rounded transition-colors"
                    >
                      {parameters.holeDiameter.toFixed(2)} mm
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Features Status Section (Matches screenshot checks) */}
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Features
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2 bg-[#12192a] border border-[#202c42] rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">Extrude Boss</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-tech">Base Plate</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-[#12192a] border border-[#202c42] rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">Cut Extrude</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-tech">Ø24 mm Bore</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-[#12192a] border border-[#202c42] rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">Fillet (R2)</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-tech">Tangent Edges</span>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-[#12192a] border border-[#202c42] rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium">Hole Wizard (4x)</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-tech">Through-All</span>
                </div>
              </div>
            </div>
            </>)}
          </PanelFrame>
        )}

        {/* TAB 2: FEATURE TREE */}
        {activeTab === 'featureTree' && (
          <PanelFrame panel="tree" label="Feature tree" view={panels.tree ?? COMPLETED}>
          {doc ? <RecordTree doc={doc} /> : (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
              <span>Demo feature tree</span>
              <span className="text-[10px] text-amber-300 font-tech">not from a CAD kernel</span>
            </div>

            <div className="bg-[#12192a] border border-[#202c42] rounded-lg p-2 space-y-1">
              {features.map((feat) => (
                <div
                  key={feat.id}
                  className={`flex items-center justify-between p-1.5 rounded transition-colors group ${
                    feat.suppressed ? 'opacity-40 bg-slate-900/40' : 'hover:bg-[#182338]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-blue-500/80 flex-shrink-0" />
                    <span className="font-tech text-slate-200 text-xs truncate">{feat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => toggleFeatureSuppression(feat.id)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title={feat.suppressed ? 'Unsuppress feature' : 'Suppress feature'}
                    >
                      {feat.suppressed ? <EyeOff className="w-3 h-3 text-amber-500" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-blue-950/20 border border-blue-800/30 rounded text-[11px] text-slate-400">
              Demo data. Open a part to see its real feature tree.
            </div>
          </div>
          )}
          </PanelFrame>
        )}

        {/* TAB 3: BOM (Bill of Materials) */}
        {activeTab === 'bom' && doc && (
          <div className="text-xs text-slate-400">No bill of materials for this document. The kernel records no parts list yet.</div>
        )}
        {activeTab === 'bom' && !doc && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Structured BOM</span>
              <button
                onClick={() => {
                  const csv = `Item,PartNumber,Description,Qty,Material,Mass\n` +
                    bomItems.map((b) => `${b.itemNo},${b.partNumber},${b.description},${b.qty},${b.material},${b.massKg}`).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Mounting_Bracket_BOM.csv';
                  a.click();
                }}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-tech"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="space-y-2">
              {bomItems.map((item) => (
                <div key={item.id} className="bg-[#12192a] border border-[#202c42] rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-tech font-bold text-blue-400 text-xs">#{item.itemNo} {item.partNumber}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-tech uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-slate-300 text-xs">{item.description}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-tech pt-1 border-t border-[#1e293b]">
                    <span>Qty: {item.qty}</span>
                    <span>{item.material}</span>
                    <span>{item.massKg} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
