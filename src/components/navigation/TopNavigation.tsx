/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  Building2,
  FolderKanban,
  Check,
  Mic,
  Cpu,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { DEMO_PROJECTS } from '../../data/mockCadData';
import { ProjectInfo } from '../../types/cad';

interface TopNavigationProps {
  currentProject: ProjectInfo;
  onSelectProject: (proj: ProjectInfo) => void;
  onOpenCommandPalette: () => void;
  onOpenHelp: () => void;
  onOpenLiveVoice?: () => void;
  isAgentOpen?: boolean;
  onToggleAgent?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentProject,
  onSelectProject,
  onOpenCommandPalette,
  onOpenHelp,
  onOpenLiveVoice,
  isAgentOpen = true,
  onToggleAgent,
  isInspectorOpen = true,
  onToggleInspector,
}) => {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [currentOrg, setCurrentOrg] = useState('AutoNova Corp');

  const orgs = ['AutoNova Corp', 'AeroFluid Dynamics', 'HyperMach Industrial'];

  return (
    <header className="h-13 bg-[#0c0c0c] border-b border-[#232323] flex items-center justify-between px-3.5 z-40 select-none flex-shrink-0 gap-3">
      {/* 1. Left Zone: Brand + Org & Project Switchers */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-steel-600 p-[1px] flex items-center justify-center shadow-md ">
            <div className="w-full h-full bg-[#101010] rounded-[7px] flex items-center justify-center">
              <span className="font-black text-steel-300 text-xs tracking-tighter">
                MF
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-neutral-100 text-xs tracking-tight leading-none whitespace-nowrap">
              MechForge AI
            </span>
            <span className="text-[9px] text-neutral-400 font-medium tracking-tight mt-0.5 whitespace-nowrap">
              CAD Copilot
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-5 bg-[#292929] hidden sm:block" />

        {/* Organization Switcher */}
        <div className="relative hidden md:block">
          <button
            onClick={() => {
              setShowOrgDropdown(!showOrgDropdown);
              setShowProjectDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#171717] hover:bg-[#202020] text-neutral-300 hover:text-white transition-colors text-xs border border-[#2b2b2b] cursor-pointer"
          >
            <Building2 className="w-3 h-3 text-steel-400 shrink-0" />
            <span className="font-medium text-neutral-200 max-w-[110px] truncate">{currentOrg}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>

          {showOrgDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#181818] border border-[#2f2f2f] rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-tech text-neutral-500 font-semibold">
                Organizations
              </div>
              {orgs.map((org) => (
                <button
                  key={org}
                  onClick={() => {
                    setCurrentOrg(org);
                    setShowOrgDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#232323] hover:text-white text-left cursor-pointer"
                >
                  <span className="truncate">{org}</span>
                  {currentOrg === org && <Check className="w-3 h-3 text-steel-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProjectDropdown(!showProjectDropdown);
              setShowOrgDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#171717] hover:bg-[#202020] text-neutral-300 hover:text-white transition-colors text-xs border border-[#2b2b2b] cursor-pointer"
          >
            <FolderKanban className="w-3 h-3 text-steel-400 shrink-0" />
            <span className="font-medium text-neutral-200 max-w-[130px] lg:max-w-[160px] truncate">
              {currentProject.name}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#181818] border border-[#2f2f2f] rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-tech text-neutral-500 font-semibold">
                Switch Project
              </div>
              {DEMO_PROJECTS.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    setShowProjectDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#232323] hover:text-white text-left cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-medium truncate">{proj.name}</div>
                    <div className="text-[10px] text-neutral-500 font-tech truncate">
                      {proj.code} • {proj.docCount} docs
                    </div>
                  </div>
                  {currentProject.id === proj.id && <Check className="w-3.5 h-3.5 text-steel-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center Zone: Responsive Command Search Bar */}
      <div className="flex-1 max-w-sm md:max-w-md mx-2 min-w-0">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1 bg-[#181818] hover:bg-[#1d1d1d] border border-[#2a2a2a] hover:border-steel-500/50 rounded-lg text-neutral-400 text-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-steel-400 transition-colors shrink-0" />
            <span className="truncate text-neutral-400">Search commands, parts, features...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-tech text-neutral-400 bg-[#202020] border border-[#353535] rounded shadow-sm shrink-0 ml-2">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* 3. Right Zone: Status, Toggles, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Panel View Toggles for Quick Layout Control */}
        <div className="hidden lg:flex items-center bg-[#141414] border border-[#292929] rounded-md p-0.5 gap-0.5">
          {onToggleAgent && (
            <button
              onClick={onToggleAgent}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                isAgentOpen ? 'bg-steel-600/30 text-steel-300' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={isAgentOpen ? 'Hide Agent Panel' : 'Show Agent Panel'}
            >
              {isAgentOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
          )}
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                isInspectorOpen ? 'bg-steel-600/30 text-steel-300' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={isInspectorOpen ? 'Hide Properties Panel' : 'Show Properties Panel'}
            >
              {isInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Gemini Live Voice Conversation Launcher */}
        {onOpenLiveVoice && (
          <button
            onClick={onOpenLiveVoice}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-steel-900/40 hover:bg-steel-900/60 text-steel-300 border border-steel-500/40 rounded-full text-[11px] font-tech font-semibold transition-all shadow-sm cursor-pointer group shrink-0"
            title="Start real-time voice conversation with gemini-3.8-live"
          >
            <Mic className="w-3 h-3 text-steel-400 group-hover:animate-pulse" />
            <span className="hidden md:inline">gemini-3.8-live</span>
          </button>
        )}

        {/* CAD connection status: none exists until the SolidWorks adapter ships */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-[#161616] border border-[#2a2a2a] rounded-full text-[11px] font-tech text-neutral-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
          <span className="text-neutral-300">No CAD connection</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationModal(!showNotificationModal)}
            className="relative p-1.5 text-neutral-300 hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotificationModal && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#181818] border border-[#2f2f2f] rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
              <div className="border-b border-[#292929] pb-2 font-semibold text-neutral-200">Notifications</div>
              <div className="text-[11px] text-neutral-400">No notifications. Operations and jobs will report here once they run.</div>
            </div>
          )}
        </div>

        {/* Help / Docs */}
        <button
          onClick={onOpenHelp}
          className="p-1.5 text-neutral-300 hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors cursor-pointer"
          title="Documentation & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#292929] shrink-0">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-steel-500/40 shadow-sm bg-neutral-800">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Alex Johnson"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-neutral-200 leading-tight">Alex Johnson</div>
            <div className="text-[9px] text-neutral-400 font-tech">Senior Engineer</div>
          </div>
        </div>
      </div>
    </header>
  );
};
