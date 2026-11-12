/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Download,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { AVAILABLE_MATERIALS } from '../../data/mockCadData';

export const KnowledgeHubView: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-steel-400" />
            <span>Engineering Knowledge Hub & Material Database</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Verified Standards
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Access verified physical material properties, ASME Y14.5 design guidelines, and corporate engineering guidelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_MATERIALS.map((mat) => (
          <div
            key={mat.id}
            className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-100">{mat.name}</span>
              <span className="w-3 h-3 rounded-full border border-neutral-600" style={{ backgroundColor: mat.color }} />
            </div>

            <div className="space-y-1 font-tech text-[11px] text-neutral-400 pt-2 border-t border-[#232323]">
              <div className="flex justify-between">
                <span>Density:</span>
                <span className="text-neutral-200">{mat.density} g/cm³</span>
              </div>
              <div className="flex justify-between">
                <span>Yield Strength:</span>
                <span className="text-emerald-400 font-bold">{mat.yieldStrength} MPa</span>
              </div>
              <div className="flex justify-between">
                <span>Surface Finish:</span>
                <span className="text-neutral-200">Ra 0.8 - 3.2 μm</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
