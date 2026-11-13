/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Play,
  Bot,
  Box,
} from 'lucide-react';
import { NavigationModule } from '../../types/cad';
import { DEMO_PROJECTS, BACKGROUND_TASKS_LIST, CAD_INTEGRATIONS_LIST } from '../../data/mockCadData';

interface OverviewViewProps {
  onNavigate: (module: NavigationModule) => void;
  onOpenReport: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigate,
  onOpenReport,
}) => {
  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f select-none text-neutral-200">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-graphite-23">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Engineering Operating Environment</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Enterprise Live
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time CAD bridge status, agent orchestration metrics, and automated geometric verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('ai-cad-agent')}
            className="flex items-center gap-2 px-3.5 py-2 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Launch AI CAD Agent</span>
          </button>
          <button
            onClick={() => onNavigate('cad-workspace')}
            className="flex items-center gap-2 px-3.5 py-2 bg-graphite-1d hover:bg-graphite-28 text-neutral-200 rounded-lg text-xs font-medium border border-graphite-33 transition-colors"
          >
            <Box className="w-3.5 h-3.5 text-steel-400" />
            <span>Open CAD Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-graphite-18 border border-graphite-29 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active CAD Documents</span>
            <Layers className="w-4 h-4 text-steel-400" />
          </div>
          <div className="text-2xl font-bold font-tech text-white">148</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-tech">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+12 models regenerated this week</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-graphite-18 border border-graphite-29 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Agent Execution Success</span>
            <Cpu className="w-4 h-4 text-steel-400" />
          </div>
          <div className="text-2xl font-bold font-tech text-white">99.4%</div>
          <div className="text-[11px] text-neutral-400 font-tech">
            <span>512 verified operations • 0 fatal crashes</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-graphite-18 border border-graphite-29 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Verification Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-tech text-emerald-400">100% Pass</div>
          <div className="text-[11px] text-neutral-400 font-tech">
            <span>All Euler & tolerance checks satisfied</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-graphite-18 border border-graphite-29 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Connected CAD Bridges</span>
            <Activity className="w-4 h-4 text-steel-400" />
          </div>
          <div className="text-2xl font-bold font-tech text-white">3 Active</div>
          <div className="text-[11px] text-neutral-400 font-tech">
            <span>SolidWorks 2024, Fusion 360, Onshape</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Recent Models & CAD Bridge Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Generated CAD Models (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm">
              Active CAD Models & Regeneration Status
            </div>
            <button
              onClick={() => onNavigate('cad-workspace')}
              className="text-xs text-steel-400 hover:text-steel-300 font-medium flex items-center gap-1"
            >
              <span>View All Documents</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              {
                name: 'Mounting_Bracket.SLDPRT',
                project: 'EV Platform Project',
                status: 'Verified Manifold',
                time: '10:25 AM',
                kernel: 'Parasolid v35.1',
                active: true,
              },
              {
                name: 'Planetary_Carrier_Housing.STEP',
                project: 'Industrial Planetary Gearbox 400Nm',
                status: 'Verified Manifold',
                time: '09:14 AM',
                kernel: 'ACIS R32',
                active: false,
              },
              {
                name: 'Cryo_Valve_Titanium_Body.CATPart',
                project: 'Cryogenic Fluid Valve Enclosure',
                status: 'In Review',
                time: 'Yesterday',
                kernel: 'CGM Native',
                active: false,
              },
              {
                name: 'Spindle_Bearing_Cap_Machined.SLDPRT',
                project: 'High-Speed CNC Spindle Support',
                status: 'Verified Manifold',
                time: 'Nov 5, 2026',
                kernel: 'Parasolid v35.1',
                active: false,
              },
            ].map((model, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-graphite-1c border border-graphite-2c rounded-lg hover:border-steel-500/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-steel-500/10 border border-steel-500/20 flex items-center justify-center text-steel-400">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-100 text-xs flex items-center gap-2">
                      <span>{model.name}</span>
                      {model.active && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-tech font-bold uppercase bg-steel-500/20 text-steel-400">
                          Active In Viewport
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-tech">
                      {model.project} • {model.kernel}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {model.status}
                  </span>
                  <div className="text-[10px] text-neutral-500 font-tech mt-1">{model.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CAD Adapter Status (1 col) */}
        <div className="p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm">
              CAD Integration Health
            </div>
            <button
              onClick={() => onNavigate('integrations')}
              className="text-xs text-steel-400 hover:text-steel-300 font-medium"
            >
              Configure
            </button>
          </div>

          <div className="space-y-3">
            {CAD_INTEGRATIONS_LIST.slice(0, 4).map((adapter) => (
              <div
                key={adapter.id}
                className="p-3 bg-graphite-1c border border-graphite-2c rounded-lg space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">{adapter.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                      adapter.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {adapter.status}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-tech flex justify-between">
                  <span>{adapter.version}</span>
                  <span className="text-neutral-300">
                    {adapter.status === 'connected' ? `${adapter.lastPingMs} ms` : 'Demo Mode'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Background Tasks & Verification Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Background Tasks */}
        <div className="p-5 bg-graphite-18 border border-graphite-29 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-neutral-100 text-sm">
              Active Engineering Background Tasks
            </div>
            <button
              onClick={() => onNavigate('background-tasks')}
              className="text-xs text-steel-400 hover:text-steel-300 font-medium"
            >
              Queue Center
            </button>
          </div>

          <div className="space-y-2">
            {BACKGROUND_TASKS_LIST.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-graphite-1c border border-graphite-2c rounded-lg space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-tech text-steel-400 font-semibold">{task.id}: {task.name}</span>
                  <span className="text-neutral-400 font-tech text-[11px]">{task.duration}</span>
                </div>
                <div className="text-[11px] text-neutral-400">{task.stage}</div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      task.status === 'completed' ? 'bg-emerald-500' : 'bg-steel-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Summary Card */}
        <div className="p-5 bg-graphite-1a border border-graphite-34 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold text-sm">Deterministic Verification Protocol</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Every operation executed by the MechForge AI Copilot is audited by an independent Parasolid geometry validator before marking a feature as complete.
            </p>
          </div>

          <div className="p-3 bg-graphite-1d rounded-lg border border-graphite-3a space-y-1 font-tech text-xs text-neutral-300">
            <div className="flex justify-between">
              <span>Auditor Version:</span>
              <span className="text-white font-bold">AuditEngine v3.4.1</span>
            </div>
            <div className="flex justify-between">
              <span>Manifold Solid Check:</span>
              <span className="text-emerald-400 font-bold">100% Passed</span>
            </div>
            <div className="flex justify-between">
              <span>ASME Y14.5 Tolerance Conformance:</span>
              <span className="text-emerald-400 font-bold">Verified</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onOpenReport}
              className="px-4 py-2 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              Inspect Complete Verification Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
