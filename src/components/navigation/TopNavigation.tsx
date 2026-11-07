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
  CheckCircle,
  ExternalLink,
  Laptop,
  Check,
} from 'lucide-react';
import { DEMO_PROJECTS } from '../../data/mockCadData';
import { ProjectInfo } from '../../types/cad';

interface TopNavigationProps {
  currentProject: ProjectInfo;
  onSelectProject: (proj: ProjectInfo) => void;
  onOpenCommandPalette: () => void;
  onOpenHelp: () => void;
  onOpenLiveVoice?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentProject,
  onSelectProject,
  onOpenCommandPalette,
  onOpenHelp,
  onOpenLiveVoice,
}) => {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [currentOrg, setCurrentOrg] = useState('AutoNova Corp');

  const orgs = ['AutoNova Corp', 'AeroFluid Dynamics', 'HyperMach Industrial'];

  return (
    <header className="h-14 bg-[#0a0e17] border-b border-[#1a2336] flex items-center justify-between px-4 z-40 select-none flex-shrink-0">
      {/* 1. Left: Brand & Switchers */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-md shadow-blue-900/40">
            <div className="w-full h-full bg-[#0d1322] rounded-[7px] flex items-center justify-center">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-blue-400 text-sm tracking-tighter">
                MF
              </span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm tracking-tight leading-none">
              MechForge AI
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
              Engineering Copilot
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-[#1e293b]" />

        {/* Organization Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowOrgDropdown(!showOrgDropdown);
              setShowProjectDropdown(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#12192a] text-slate-300 hover:text-white transition-colors text-xs border border-transparent hover:border-[#232f48]"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-200">{currentOrg}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showOrgDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#101728] border border-[#232f48] rounded-md shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-tech text-slate-500">
                Organizations
              </div>
              {orgs.map((org) => (
                <button
                  key={org}
                  onClick={() => {
                    setCurrentOrg(org);
                    setShowOrgDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-[#182338] hover:text-white text-left"
                >
                  <span>{org}</span>
                  {currentOrg === org && <Check className="w-3.5 h-3.5 text-blue-400" />}
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
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#12192a] text-slate-300 hover:text-white transition-colors text-xs border border-transparent hover:border-[#232f48]"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-slate-200">{currentProject.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#101728] border border-[#232f48] rounded-md shadow-2xl py-1 z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-tech text-slate-500">
                Switch Project
              </div>
              {DEMO_PROJECTS.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    setShowProjectDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-[#182338] hover:text-white text-left"
                >
                  <div>
                    <div className="font-medium">{proj.name}</div>
                    <div className="text-[10px] text-slate-500 font-tech">{proj.code} • {proj.docCount} docs</div>
                  </div>
                  {currentProject.id === proj.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Global Search Bar with Ctrl+K */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-[#12192a] hover:bg-[#162035] border border-[#1f2b42] hover:border-blue-500/50 rounded-lg text-slate-400 text-xs transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span>Search anything...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-tech text-slate-400 bg-[#1b253b] border border-[#2b3a58] rounded shadow-sm">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* 3. Right: Integration Pill, Notifications, Help, User Profile */}
      <div className="flex items-center gap-3">
        {/* Gemini Live Voice Conversation Launcher */}
        {onOpenLiveVoice && (
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-blue-600/30 hover:from-blue-600/40 hover:to-cyan-500/30 text-cyan-300 border border-blue-500/40 rounded-full text-xs font-tech font-semibold transition-all shadow-sm group"
            title="Start real-time voice conversation with gemini-3.8-live"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:animate-ping" />
            <span>gemini-3.8-live</span>
          </button>
        )}

        {/* Local CAD Bridge Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[#10192b] border border-[#21304d] rounded-full text-xs font-tech">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 text-[11px]">SolidWorks 2024 Bridge</span>
          <span className="text-[10px] text-blue-400">14ms</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationModal(!showNotificationModal)}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-[#141b2b] rounded-lg transition-colors"
            title="Engineering Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-tech font-bold flex items-center justify-center ring-2 ring-[#0a0e17]">
              3
            </span>
          </button>

          {showNotificationModal && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[#101728] border border-[#232f48] rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 font-semibold text-slate-200">
                <span>Engineering Alerts</span>
                <span className="text-[10px] text-blue-400 font-tech">3 unread</span>
              </div>
              <div className="space-y-1.5">
                <div className="p-2 bg-[#141d30] rounded border border-blue-500/20">
                  <div className="font-medium text-slate-200">Mounting Bracket Regenerated</div>
                  <div className="text-[11px] text-slate-400">Euler check verified manifold solid.</div>
                </div>
                <div className="p-2 bg-[#141d30] rounded border border-slate-700/40">
                  <div className="font-medium text-slate-200">FEA Mesh Solved (TSK-9401)</div>
                  <div className="text-[11px] text-slate-400">Von Mises max stress = 184 MPa.</div>
                </div>
                <div className="p-2 bg-[#141d30] rounded border border-slate-700/40">
                  <div className="font-medium text-slate-200">Drawing PDF Generated</div>
                  <div className="text-[11px] text-slate-400">Ready for release approval.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help / Docs */}
        <button
          onClick={onOpenHelp}
          className="p-2 text-slate-300 hover:text-white hover:bg-[#141b2b] rounded-lg transition-colors"
          title="Engineering Documentation & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#1e293b]">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-500/40 shadow-sm bg-slate-800">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Alex Johnson"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200 leading-tight">Alex Johnson</div>
            <div className="text-[10px] text-slate-400 font-tech">Senior Engineer</div>
          </div>
        </div>
      </div>
    </header>
  );
};
