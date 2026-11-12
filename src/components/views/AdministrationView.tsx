/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Users,
  Lock,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AdministrationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'access' | 'audit' | 'policies'>('access');

  const auditLogs = [
    { time: '10:25:18', user: 'Alex Johnson', action: 'Parametric Sweep Approved', target: 'Mounting_Bracket.SLDPRT', status: 'Success' },
    { time: '10:25:12', user: 'Alex Johnson', action: 'Feature ExtrudeBoss Created', target: 'SolidWorks COM Bridge', status: 'Success' },
    { time: '09:44:10', user: 'Marcus Vance', action: 'Export 2D Drawing PDF', target: 'Gearbox_Housing_RevB.PDF', status: 'Success' },
    { time: '09:12:05', user: 'Elena Rostova', action: 'Optical Scan Ingested', target: 'Scan_Cleaned_1.2M.stl', status: 'Success' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-steel-400" />
            <span>Enterprise Governance & Administration</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              SOC2 & ISO 27001
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure role-based access control (RBAC), immutable CAD operation audit trails, and automated approval gates.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#232323] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('access')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'access' ? 'bg-steel-600 text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Team & Roles (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audit' ? 'bg-steel-600 text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          CAD Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'policies' ? 'bg-steel-600 text-white' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Security Policies
        </button>
      </div>

      {activeTab === 'audit' ? (
        <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-4">
          <div className="font-semibold text-neutral-100 text-sm">Immutable CAD Operation Ledger</div>
          <table className="w-full text-left text-xs font-tech">
            <thead>
              <tr className="text-neutral-400 border-b border-[#292929] pb-2">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Engineer</th>
                <th className="pb-2">Operation</th>
                <th className="pb-2">Target Entity</th>
                <th className="pb-2">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232323]">
              {auditLogs.map((log, i) => (
                <tr key={i} className="hover:bg-[#1c1c1c]">
                  <td className="py-2.5 text-neutral-400">{log.time}</td>
                  <td className="py-2.5 text-neutral-200 font-sans">{log.user}</td>
                  <td className="py-2.5 text-steel-400 font-sans">{log.action}</td>
                  <td className="py-2.5 text-neutral-300">{log.target}</td>
                  <td className="py-2.5 text-emerald-400">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-3 text-xs">
            <div className="font-semibold text-neutral-100 text-sm">Engineering Roles & Privileges</div>
            <div className="space-y-2">
              <div className="p-3 bg-[#1c1c1c] rounded-lg border border-[#2c2c2c] flex justify-between">
                <div>
                  <div className="font-bold text-neutral-200">Senior Mechanical Engineer</div>
                  <div className="text-[11px] text-neutral-400">Can instruct agent, rebuild features, and release models</div>
                </div>
                <span className="text-emerald-400 font-tech">Active</span>
              </div>
              <div className="p-3 bg-[#1c1c1c] rounded-lg border border-[#2c2c2c] flex justify-between">
                <div>
                  <div className="font-bold text-neutral-200">CAD Specialist / Modeler</div>
                  <div className="text-[11px] text-neutral-400">Can view 3D viewport, export neutral files, run FEA</div>
                </div>
                <span className="text-emerald-400 font-tech">Active</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-[#181818] border border-[#292929] rounded-xl space-y-3 text-xs">
            <div className="font-semibold text-neutral-100 text-sm">Human Approval Checkpoints</div>
            <div className="space-y-2 text-neutral-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Require engineer approval before writing to native SLDPRT files</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Enforce ASME Y14.5 tolerance compliance check prior to release</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero telemetry or proprietary CAD files transmitted externally</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
