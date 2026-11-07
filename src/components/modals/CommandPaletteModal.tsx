/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Bot,
  Box,
  FileCode2,
  FileSearch,
  Scan,
  GitFork,
  Activity,
  Workflow,
  Clock,
  ShieldCheck,
  Folder,
  Plug,
  Settings,
  X,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { NavigationModule } from '../../types/cad';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: NavigationModule) => void;
  onTriggerCADAction: (action: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onTriggerCADAction,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { label: 'AI CAD Agent — Open Primary Copilot', module: 'ai-cad-agent' as NavigationModule, icon: Bot, type: 'Module' },
    { label: 'CAD Workspace — Inspect 3D Model', module: 'cad-workspace' as NavigationModule, icon: Box, type: 'Module' },
    { label: 'Text-to-CAD — Generate Model from Specification', module: 'text-to-cad' as NavigationModule, icon: FileCode2, type: 'Module' },
    { label: 'Drawing-to-CAD — Interpret PDF/Blueprint', module: 'drawing-to-cad' as NavigationModule, icon: FileSearch, type: 'Module' },
    { label: 'Reverse Engineering — Reconstruct from 3D Scan', module: 'reverse-engineering' as NavigationModule, icon: Scan, type: 'Module' },
    { label: 'Assembly Intelligence — Interference & BOM', module: 'assembly-intelligence' as NavigationModule, icon: GitFork, type: 'Module' },
    { label: 'Simulation Intelligence — Run FEA Stress Analysis', module: 'simulation-intelligence' as NavigationModule, icon: Activity, type: 'Module' },
    { label: 'Automation Studio — Node Workflow Editor', module: 'automation-studio' as NavigationModule, icon: Workflow, type: 'Module' },
    { label: 'Verification Center — Run Audit Matrix', module: 'verification-center' as NavigationModule, icon: ShieldCheck, type: 'Module' },
    { label: 'Projects — Switch or Create Project', module: 'projects' as NavigationModule, icon: Folder, type: 'Module' },
    { label: 'Integrations — SolidWorks / CATIA Bridge Diagnostics', module: 'integrations' as NavigationModule, icon: Plug, type: 'Module' },
    { label: 'Action: Increase Plate Thickness to 15mm', action: 'Increase thickness to 15mm', icon: Zap, type: 'CAD Command' },
    { label: 'Action: Switch Material to Titanium Ti-6Al-4V', action: 'Switch material to Titanium Ti-6Al-4V', icon: Zap, type: 'CAD Command' },
    { label: 'Action: Add 2x Gusset Stiffener Ribs', action: 'Add 2 triangular gusset stiffeners', icon: Zap, type: 'CAD Command' },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#0f1728] border border-[#232f48] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b] bg-[#121b2d]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, module, or CAD instruction..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-tech">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.module) {
                      onSelectModule(item.module);
                    } else if (item.action) {
                      onTriggerCADAction(item.action);
                    }
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#1a253c] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-blue-400 group-hover:text-cyan-300" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-tech text-slate-500 group-hover:text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {item.type}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#1e293b] bg-[#0c121e] flex items-center justify-between text-[11px] text-slate-500 font-tech">
          <span>Navigate with arrows • Press Enter to select</span>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
};
