/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Search,
  ExternalLink,
  Layers,
  Calendar,
  User,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { DEMO_PROJECTS } from '../../data/mockCadData';
import { ProjectInfo } from '../../types/cad';

interface ProjectsViewProps {
  onSelectProject: (proj: ProjectInfo) => void;
  onNavigateToAgent: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onSelectProject,
  onNavigateToAgent,
}) => {
  const [projects, setProjects] = useState<ProjectInfo[]>(DEMO_PROJECTS);
  const [search, setSearch] = useState('');

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0b0f19] select-none text-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2336]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            <span>Engineering Project Portfolio</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              CAD PDM Repository
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage CAD documents, model revisions, design reviews, and engineering team permissions.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span>New Engineering Project</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter projects by name or code..."
          className="w-full bg-[#101728] border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="p-5 bg-[#101728] border border-[#1e293b] hover:border-blue-500/50 rounded-xl space-y-3 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-tech font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {proj.code}
                </span>
                <h3 className="text-sm font-bold text-slate-100 mt-1">{proj.name}</h3>
                <div className="text-[11px] text-slate-400 font-tech">{proj.org}</div>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                  proj.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {proj.status}
              </span>
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {proj.description}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {proj.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-[#131b2e] text-[10px] font-tech text-slate-400 border border-[#202c42]"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#1a2336] text-slate-400 font-tech">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  {proj.lead}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  {proj.docCount} Docs
                </span>
              </div>

              <button
                onClick={() => {
                  onSelectProject(proj);
                  onNavigateToAgent();
                }}
                className="text-blue-400 hover:text-white font-medium flex items-center gap-1"
              >
                <span>Open Project</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
