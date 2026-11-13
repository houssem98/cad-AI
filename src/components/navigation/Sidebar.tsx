/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavigationModule } from '../../types/cad';

interface SidebarProps {
  currentModule: NavigationModule;
  onSelectModule: (module: NavigationModule) => void;
  onOpenPricing?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  collapsed: externalCollapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

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
    <aside
      className={`h-full bg-graphite-0c border-r border-graphite-23 flex flex-col justify-between select-none flex-shrink-0 transition-[width] duration-200 z-30 ${
        isCollapsed ? 'w-14' : 'w-[208px]'
      }`}
    >
      {/* 1. Header with Collapse Toggle */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-graphite-1d">
        {!isCollapsed && (
          <span className="text-[10px] uppercase font-tech font-bold tracking-wider text-neutral-500 pl-1.5">
            Modules
          </span>
        )}
        <button
          onClick={toggle}
          className={`p-1 text-neutral-400 hover:text-white hover:bg-graphite-1a rounded transition-colors cursor-pointer ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1 text-xs no-scrollbar">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center rounded-lg font-medium transition-colors group cursor-pointer ${
                isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
              } ${
                isActive
                  ? 'bg-steel-600 text-white shadow-md '
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-graphite-19'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-steel-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate text-xs">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-steel-500 shrink-0" />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-1 border-t border-graphite-20" />

        {/* Secondary Category / Governance */}
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center rounded-lg font-medium transition-colors group cursor-pointer ${
                isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5'
              } ${
                isActive
                  ? 'bg-steel-600 text-white shadow-md '
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-graphite-19'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-steel-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate text-xs">{item.label}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Bottom Enterprise Badge */}
      {!isCollapsed ? (
        <div className="p-2 border-t border-graphite-20 bg-graphite-0d">
          <div className="p-2.5 bg-graphite-17 border border-graphite-2a rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-200 text-xs">Enterprise Edition</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight">
              Advanced AI · Unlimited CAD
            </p>
            <button
              onClick={onOpenPricing}
              className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-steel-600 hover:bg-steel-500 text-white font-medium text-xs rounded transition-colors shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-steel-200" />
              <span>Upgrade Plan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-graphite-20 flex justify-center">
          <button
            onClick={onOpenPricing}
            className="p-1.5 rounded-lg bg-steel-600 text-white hover:bg-steel-500 transition-colors cursor-pointer"
            title="Enterprise Plan"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};
