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
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f select-none text-neutral-200">
      <div className="flex items-center justify-between pb-3 border-b border-graphite-23">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-steel-400" />
            <span>Engineering Project Portfolio</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase bg-steel-500/20 text-steel-400 border border-steel-500/30">
              CAD PDM Repository
            </span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage CAD documents, model revisions, design reviews, and engineering team permissions.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-1.5 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors">
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
          className="w-full bg-graphite-18 border border-graphite-29 rounded-lg p-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-steel-500"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="p-5 bg-graphite-18 border border-graphite-29 hover:border-steel-500/50 rounded-xl space-y-3 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-tech font-bold text-steel-400 bg-steel-500/10 px-2 py-0.5 rounded border border-steel-500/20">
                  {proj.code}
                </span>
                <h3 className="text-sm font-bold text-neutral-100 mt-1">{proj.name}</h3>
                <div className="text-[11px] text-neutral-400 font-tech">{proj.org}</div>
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

            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
              {proj.description}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {proj.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-graphite-1c text-[10px] font-tech text-neutral-400 border border-graphite-2c"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-graphite-23 text-neutral-400 font-tech">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-neutral-500" />
                  {proj.lead}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-neutral-500" />
                  {proj.docCount} Docs
                </span>
              </div>

              <button
                onClick={() => {
                  onSelectProject(proj);
                  onNavigateToAgent();
                }}
                className="text-steel-400 hover:text-white font-medium flex items-center gap-1"
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
