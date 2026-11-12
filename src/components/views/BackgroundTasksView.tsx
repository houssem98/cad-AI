/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  Play,
  RotateCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
} from 'lucide-react';
import { BACKGROUND_TASKS_LIST } from '../../data/mockCadData';
import { BackgroundTask } from '../../types/cad';

export const BackgroundTasksView: React.FC = () => {
  const [tasks, setTasks] = useState<BackgroundTask[]>(BACKGROUND_TASKS_LIST);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'running') return t.status === 'running';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#232323]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-steel-400" />
            <span>Asynchronous Background CAD Job Queue</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              Distributed Workers
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Monitor long-running parametric sweeps, multi-sheet drawing projections, and finite element solver tasks.
          </p>
        </div>

        <div className="flex gap-2">
          {(['all', 'running', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-steel-600 text-white' : 'bg-[#1a1a1a] text-neutral-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.map((t) => (
          <div
            key={t.id}
            className="p-4 bg-[#181818] border border-[#292929] rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-tech text-xs font-bold text-steel-400">{t.id}</span>
                <span className="text-xs font-semibold text-neutral-100">{t.name}</span>
                <span className="text-[11px] text-neutral-500 font-tech">({t.project})</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-tech uppercase font-bold ${
                    t.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-steel-500/10 text-steel-400 border border-steel-500/20 animate-pulse'
                  }`}
                >
                  {t.status}
                </span>
                <span className="text-neutral-400 text-xs font-tech">{t.duration}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400 font-tech">
                <span>Stage: {t.stage}</span>
                <span>{t.progress}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    t.status === 'completed' ? 'bg-emerald-500' : 'bg-steel-500'
                  }`}
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#232323]">
              <div className="flex items-center gap-2 text-neutral-400 font-tech text-[11px]">
                <span>Artifacts:</span>
                {t.artifacts.map((a, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {a}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 text-xs text-steel-400 hover:text-white bg-steel-950/40 rounded border border-steel-800/40">
                  Inspect Logs
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
