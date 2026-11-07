/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Laptop,
  Cloud,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CAD_INTEGRATIONS_LIST } from '../../data/mockCadData';
import { CADAdapter } from '../../types/cad';

export const IntegrationsView: React.FC = () => {
  const [adapters, setAdapters] = useState<CADAdapter[]>(CAD_INTEGRATIONS_LIST);
  const [selectedAdapter, setSelectedAdapter] = useState<CADAdapter>(CAD_INTEGRATIONS_LIST[0]);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-blue-400" />
            <span>CAD Integrations & Local Bridge Architecture</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Bi-Directional Adapters
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official desktop COM bridges and cloud APIs connecting the AI Agent directly to native engineering software.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ping All Adapters</span>
        </button>
      </div>

      {/* Architecture Topology Diagram Banner */}
      <div className="p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-3">
        <div className="font-semibold text-slate-100 text-xs uppercase tracking-wider">
          Enterprise CAD Execution Architecture (Zero Blind Hallucination)
        </div>

        <div className="p-3 bg-[#0c121e] rounded-lg border border-[#1b263b] flex items-center justify-between text-xs font-tech text-slate-300 overflow-x-auto gap-2">
          <div className="px-3 py-1.5 bg-[#141d30] border border-blue-500/40 rounded text-center">
            <div className="font-bold text-white">Browser Frontend</div>
            <div className="text-[10px] text-slate-500">React + Three.js</div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="px-3 py-1.5 bg-[#141d30] border border-blue-500/40 rounded text-center">
            <div className="font-bold text-white">Agent Orchestrator</div>
            <div className="text-[10px] text-slate-500">Typed AST Protocol</div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="px-3 py-1.5 bg-[#141d30] border border-emerald-500/40 rounded text-center">
            <div className="font-bold text-emerald-400">Local Desktop Bridge</div>
            <div className="text-[10px] text-slate-500">Port 8892 WebSocket</div>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="px-3 py-1.5 bg-[#141d30] border border-blue-500/40 rounded text-center">
            <div className="font-bold text-white">Native CAD Kernel</div>
            <div className="text-[10px] text-slate-500">SolidWorks / CATIA API</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Adapter List (1 col) */}
        <div className="space-y-3">
          <div className="font-semibold text-slate-100 text-sm">Registered CAD Adapters</div>
          {adapters.map((ad) => (
            <div
              key={ad.id}
              onClick={() => setSelectedAdapter(ad)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                selectedAdapter.id === ad.id
                  ? 'bg-blue-950/60 border-blue-500 text-white'
                  : 'bg-[#101728] border-[#1e293b] text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs">{ad.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                    ad.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {ad.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-tech">{ad.vendor} • {ad.version}</div>
              <div className="flex justify-between text-[10px] text-slate-500 font-tech mt-2 pt-1 border-t border-[#1a2336]">
                <span>Active: {ad.activeDoc}</span>
                <span>{ad.status === 'connected' ? `${ad.lastPingMs} ms` : 'Demo'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Selected Adapter Capability Manifest & Diagnostics (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-[#101728] border border-[#1e293b] rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-100 text-sm">{selectedAdapter.name}</div>
              <div className="text-[11px] text-slate-400 font-tech">
                Adapter Build {selectedAdapter.adapterVersion} • Port {selectedAdapter.bridgePort}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-tech font-bold">
              Health: Optimal
            </span>
          </div>

          <div className="p-4 bg-[#12192a] border border-[#202c42] rounded-lg space-y-2 text-xs">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Capability Manifest & Supported Operations
            </div>
            <div className="grid grid-cols-2 gap-2 font-tech text-[11px]">
              {selectedAdapter.supportedOperations.map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{op}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-[#0a101d] rounded-lg border border-[#1b263b] font-tech text-[11px] space-y-1 text-slate-400">
            <div className="text-slate-200 font-bold mb-1">Bridge Diagnostics & Handshake</div>
            <div>[08:14:02] WebSocket client connected on 127.0.0.1:{selectedAdapter.bridgePort}</div>
            <div>[08:14:03] COM Interface: ISwApp query interface OK (S_OK)</div>
            <div>[08:14:03] Active Document: {selectedAdapter.activeDoc}</div>
            <div className="text-emerald-400">[08:14:04] Bi-directional telemetry established with 14ms ping.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
