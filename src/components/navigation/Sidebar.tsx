/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Box,
  FileCode2,
  FileSearch,
  Scan,
  GitFork,
  FileSpreadsheet,
  Cpu,
  Activity,
  Workflow,
  Clock,
  BookOpen,
  ShieldCheck,
  Folder,
  Plug,
  Settings,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { NavigationModule } from '../../types/cad';

interface SidebarProps {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
  onOpenPricing?: () => void;
}

interface NavItem {
  id: NavigationModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  onOpenPricing,
}) => {
  const mainNavItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'ai-cad-agent', label: 'AI CAD Agent', icon: Bot, badge: 'Active' },
    { id: 'cad-workspace', label: 'CAD Workspace', icon: Box },
    { id: 'text-to-cad', label: 'Text-to-CAD', icon: FileCode2 },
    { id: 'drawing-to-cad', label: 'Drawing-to-CAD', icon: FileSearch },
    { id: 'reverse-engineering', label: 'Reverse Engineering', icon: Scan },
    { id: 'assembly-intelligence', label: 'Assembly Intelligence', icon: GitFork },
    { id: 'drawing-automation', label: 'Drawing Automation', icon: FileSpreadsheet },
    { id: 'engineering-copilot', label: 'Engineering Copilot', icon: Cpu },
    { id: 'simulation-intelligence', label: 'Simulation Intelligence', icon: Activity },
    { id: 'automation-studio', label: 'Automation Studio', icon: Workflow },
    { id: 'background-tasks', label: 'Background Tasks', icon: Clock },
    { id: 'knowledge-hub', label: 'Knowledge Hub', icon: BookOpen },
    { id: 'verification-center', label: 'Verification Center', icon: ShieldCheck },
  ];

  const adminNavItems: NavItem[] = [
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'administration', label: 'Administration', icon: Settings },
  ];

  return (
    <aside className="w-[220px] min-w-[200px] h-full bg-[#0a0e17] border-r border-[#1a2336] flex flex-col justify-between select-none flex-shrink-0">
      {/* 1. Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 text-xs">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#131b2e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-2.5 mx-1 border-t border-[#1a2336]" />

        {/* Secondary Category / Governance */}
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#131b2e]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Bottom Card: Enterprise Edition (Exact Match to Screenshot) */}
      <div className="p-3 border-t border-[#1a2336] bg-[#0c111c]">
        <div className="p-3 bg-[#111829] border border-[#212f4c] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs">Enterprise Edition</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Advanced AI. Unlimited Potential.
          </p>
          <button
            onClick={onOpenPricing}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-blue-600/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
