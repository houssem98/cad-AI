/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { NavigationModule, CADModelParameters, OperationHistoryRecord, ProjectInfo } from './types/cad';
import {
  INITIAL_CAD_PARAMETERS,
  INITIAL_OPERATION_HISTORY,
  INITIAL_VERIFICATION_CHECKS,
  DEMO_PROJECTS,
} from './data/mockCadData';

// Core Components
import { TopNavigation } from './components/navigation/TopNavigation';
import { Sidebar } from './components/navigation/Sidebar';
import { ThreeCADViewport } from './components/cad/ThreeCADViewport';
import { KernelPreview } from './components/cad/KernelPreview';
import { AICADAgentPanel } from './components/agent/AICADAgentPanel';
import { RightInspectorPanel } from './components/inspector/RightInspectorPanel';
import { BottomConsole } from './components/bottom/BottomConsole';
import { PanelFrame } from './components/workspace/PanelFrame';
import { DEFAULT_PANELS, panelViewsFromUrl, type PanelViews } from './components/workspace/panelViews';

// Modals
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { VerificationReportModal } from './components/modals/VerificationReportModal';
import { ExportModal } from './components/modals/ExportModal';
import { LiveVoiceConversationModal } from './components/agent/LiveVoiceConversationModal';

// Views
import { OverviewView } from './components/views/OverviewView';
import { TextToCadView } from './components/views/TextToCadView';
import { DrawingToCadView } from './components/views/DrawingToCadView';
import { ReverseEngineeringView } from './components/views/ReverseEngineeringView';
import { AssemblyIntelligenceView } from './components/views/AssemblyIntelligenceView';
import { DrawingAutomationView } from './components/views/DrawingAutomationView';
import { EngineeringCopilotView } from './components/views/EngineeringCopilotView';
import { SimulationIntelligenceView } from './components/views/SimulationIntelligenceView';
import { AutomationStudioView } from './components/views/AutomationStudioView';
import { BackgroundTasksView } from './components/views/BackgroundTasksView';
import { VerificationCenterView } from './components/views/VerificationCenterView';
import { ProjectsView } from './components/views/ProjectsView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { AdministrationView } from './components/views/AdministrationView';
import { KnowledgeHubView } from './components/views/KnowledgeHubView';

export default function App() {
  // Navigation state (defaults to primary AI CAD Agent workspace matching screenshot)
  const [currentModule, setCurrentModule] = useState<NavigationModule>('ai-cad-agent');
  const [currentProject, setCurrentProject] = useState<ProjectInfo>(DEMO_PROJECTS[0]);

  // CAD Model & Geometry Parameters
  const [parameters, setParameters] = useState<CADModelParameters>(INITIAL_CAD_PARAMETERS);
  const [operationHistory, setOperationHistory] = useState<OperationHistoryRecord[]>(INITIAL_OPERATION_HISTORY);
  const [panels, setPanels] = useState<PanelViews>(() => ({ ...DEFAULT_PANELS, ...panelViewsFromUrl(window.location.search, import.meta.env.DEV) }));
  const [preview, setPreview] = useState<ArrayBuffer | null>(null);
  const previewFailed = useCallback((message: string) => setPanels((p) => ({ ...p, viewport: { status: 'error', message } })), []);

  // ?part=<document id> opens that document's kernel preview in the viewport.
  useEffect(() => {
    const part = new URLSearchParams(window.location.search).get('part');
    if (!part) return;
    setPanels((p) => ({ ...p, viewport: { status: 'loading' } }));
    fetch(`/api/documents/${encodeURIComponent(part)}/preview`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message ?? `the server answered ${r.status}`);
        if (r.headers.get('content-type') !== 'model/gltf-binary') throw new Error('the server sent no preview mesh');
        setPreview(await r.arrayBuffer());
        setPanels((p) => ({ ...p, viewport: { status: 'completed' } }));
      })
      .catch((e: Error) => previewFailed(e.message));
  }, [previewFailed]);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVerificationReportOpen, setIsVerificationReportOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Responsive Layout & Panel Docking State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  const toggleAgent = () => {
    setIsAgentOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  const toggleInspector = () => {
    setIsInspectorOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  const toggleConsole = () => {
    setIsConsoleOpen((prev) => !prev);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  // Parameter update handler (updates 3D model, mass properties, and dimensions in real-time)
  const handleUpdateParameters = (newParams: Partial<CADModelParameters>) => {
    setParameters((prev) => {
      const merged = { ...prev, ...newParams };
      // Keep mass in sync if thickness or length changes and mass not explicitly provided
      if (!newParams.mass && (newParams.thickness || newParams.length || newParams.width)) {
        const approxVolume = (merged.length * merged.width * merged.thickness) / 1000;
        merged.mass = parseFloat(((approxVolume * merged.density) / 100).toFixed(2));
      }
      return merged;
    });
  };

  const handleAddOperation = (op: OperationHistoryRecord) => {
    setOperationHistory((prev) => [op, ...prev]);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#080c14] text-slate-200 overflow-hidden font-sans">
      {/* 1. Global Top Navigation Header */}
      <TopNavigation
        currentProject={currentProject}
        onSelectProject={setCurrentProject}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        isAgentOpen={isAgentOpen}
        onToggleAgent={toggleAgent}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={toggleInspector}
      />

      {/* 2. Main Body: Sidebar + Dynamic Workspace Modules */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Global Sidebar with Auto-Collapse Rail */}
        <Sidebar
          currentModule={currentModule}
          onSelectModule={setCurrentModule}
          onOpenPricing={() => setIsHelpOpen(true)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => !prev);
            setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
          }}
        />

        {/* Dynamic Center Workstation */}
        <main className="flex-1 min-w-0 flex flex-col h-full bg-[#080c14] overflow-hidden">
          {/* PRIMARY WORKSPACE: AI CAD AGENT (Matches exact screenshot reference) */}
          {currentModule === 'ai-cad-agent' && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Upper split: [Left Agent Panel] | [Center 3D Viewport] | [Right Inspector Panel] */}
              <div className="flex flex-1 min-h-0 w-full overflow-hidden">
                {/* AI CAD Agent Conversation Panel */}
                <PanelFrame panel="chat" label="Chat" view={panels.chat} className="flex h-full flex-shrink-0"
                  stateClassName="w-[310px] lg:w-[340px] border-r border-[#1a2336] bg-[#080d17]">
                  <AICADAgentPanel
                    parameters={parameters}
                    onUpdateParameters={handleUpdateParameters}
                    onAddOperation={handleAddOperation}
                    onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
                    isOpen={isAgentOpen}
                    onToggleOpen={toggleAgent}
                    onFocusCAD={() => {
                      // Focus / center CAD viewport
                    }}
                  />
                </PanelFrame>

                {/* 3D Interactive Three.js CAD Viewport */}
                <PanelFrame panel="viewport" label="Viewport" view={panels.viewport} className="flex-1 min-w-0 h-full relative">
                  {preview ? (
                    <KernelPreview glb={preview} onError={previewFailed} />
                  ) : (
                    <ThreeCADViewport
                      parameters={parameters}
                      onParameterChange={handleUpdateParameters}
                      onOpenReport={() => setIsVerificationReportOpen(true)}
                    />
                  )}
                </PanelFrame>

                {/* Technical Properties / Feature Tree / BOM Inspector */}
                <RightInspectorPanel
                  parameters={parameters}
                  onUpdateParameters={handleUpdateParameters}
                  isOpen={isInspectorOpen}
                  onToggleOpen={toggleInspector}
                  panels={panels}
                />
              </div>

              {/* Lower split: Operation History & Verification Center Console, with background tasks beside it */}
              <div className="flex w-full flex-shrink-0">
                <PanelFrame panel="history" label="History" view={panels.history} className="min-w-0 flex-1"
                  stateClassName="h-[185px] border-t border-[#182338] bg-[#080d17]">
                  <BottomConsole
                    operations={operationHistory}
                    onOpenReport={() => setIsVerificationReportOpen(true)}
                    onNavigateVerification={() => setCurrentModule('verification-center')}
                    isOpen={isConsoleOpen}
                    onToggleOpen={toggleConsole}
                  />
                </PanelFrame>
                {isConsoleOpen && (
                  <PanelFrame panel="tasks" label="Tasks" view={panels.tasks}
                    className="h-[185px] w-[300px] flex-shrink-0 border-l border-t border-[#182338] bg-[#080d17]" />
                )}
              </div>
            </div>
          )}

          {/* FULL SCREEN CAD WORKSPACE */}
          {currentModule === 'cad-workspace' && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              <div className="flex flex-1 min-h-0 w-full overflow-hidden">
                <div className="flex-1 min-w-0 h-full relative">
                  <ThreeCADViewport
                    parameters={parameters}
                    onParameterChange={handleUpdateParameters}
                    onOpenReport={() => setIsVerificationReportOpen(true)}
                  />
                </div>
                <RightInspectorPanel
                  parameters={parameters}
                  onUpdateParameters={handleUpdateParameters}
                  isOpen={isInspectorOpen}
                  onToggleOpen={toggleInspector}
                />
              </div>
              <BottomConsole
                operations={operationHistory}
                onOpenReport={() => setIsVerificationReportOpen(true)}
                onNavigateVerification={() => setCurrentModule('verification-center')}
                isOpen={isConsoleOpen}
                onToggleOpen={toggleConsole}
              />
            </div>
          )}

          {/* OVERVIEW DASHBOARD */}
          {currentModule === 'overview' && (
            <OverviewView
              onNavigate={setCurrentModule}
              onOpenReport={() => setIsVerificationReportOpen(true)}
            />
          )}

          {/* TEXT TO CAD */}
          {currentModule === 'text-to-cad' && (
            <TextToCadView
              onApplyToCAD={handleUpdateParameters}
              onNavigateToAgent={() => setCurrentModule('ai-cad-agent')}
            />
          )}

          {/* DRAWING TO CAD */}
          {currentModule === 'drawing-to-cad' && (
            <DrawingToCadView
              onNavigateToAgent={() => setCurrentModule('ai-cad-agent')}
            />
          )}

          {/* REVERSE ENGINEERING */}
          {currentModule === 'reverse-engineering' && <ReverseEngineeringView />}

          {/* ASSEMBLY INTELLIGENCE */}
          {currentModule === 'assembly-intelligence' && <AssemblyIntelligenceView />}

          {/* DRAWING AUTOMATION */}
          {currentModule === 'drawing-automation' && (
            <DrawingAutomationView parameters={parameters} />
          )}

          {/* ENGINEERING COPILOT */}
          {currentModule === 'engineering-copilot' && <EngineeringCopilotView />}

          {/* SIMULATION INTELLIGENCE */}
          {currentModule === 'simulation-intelligence' && (
            <SimulationIntelligenceView
              parameters={parameters}
              onNavigateToAgent={() => setCurrentModule('ai-cad-agent')}
            />
          )}

          {/* AUTOMATION STUDIO */}
          {currentModule === 'automation-studio' && <AutomationStudioView />}

          {/* BACKGROUND TASKS */}
          {currentModule === 'background-tasks' && <BackgroundTasksView />}

          {/* VERIFICATION CENTER */}
          {currentModule === 'verification-center' && (
            <VerificationCenterView
              parameters={parameters}
              onOpenReportModal={() => setIsVerificationReportOpen(true)}
            />
          )}

          {/* KNOWLEDGE HUB */}
          {currentModule === 'knowledge-hub' && <KnowledgeHubView />}

          {/* PROJECTS */}
          {currentModule === 'projects' && (
            <ProjectsView
              onSelectProject={setCurrentProject}
              onNavigateToAgent={() => setCurrentModule('ai-cad-agent')}
            />
          )}

          {/* INTEGRATIONS */}
          {currentModule === 'integrations' && <IntegrationsView />}

          {/* ADMINISTRATION */}
          {currentModule === 'administration' && <AdministrationView />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectModule={setCurrentModule}
        onTriggerCADAction={(action) => {
          if (action.includes('thickness')) {
            handleUpdateParameters({ thickness: 15 });
          } else if (action.includes('Titanium')) {
            handleUpdateParameters({ material: 'Titanium Ti-6Al-4V', density: 4.43 });
          }
          setCurrentModule('ai-cad-agent');
        }}
      />

      <VerificationReportModal
        isOpen={isVerificationReportOpen}
        onClose={() => setIsVerificationReportOpen(false)}
        parameters={parameters}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        parameters={parameters}
      />

      <LiveVoiceConversationModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        onCADCommand={(cmd) => {
          if (cmd.includes('thickness')) handleUpdateParameters({ thickness: 15 });
          else if (cmd.includes('Titanium')) handleUpdateParameters({ material: 'Titanium Ti-6Al-4V' });
        }}
      />

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0f1728] border border-[#232f48] rounded-xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <span className="font-bold text-slate-100 text-sm">MechForge AI — Enterprise Copilot Guide</span>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-slate-300 leading-relaxed">
              <p>
                <strong>3D Viewport Controls:</strong> Left-click and drag to rotate/orbit the model. Right-click and drag to pan. Scroll to zoom.
              </p>
              <p>
                <strong>Interactive Parameter Editing:</strong> Click any dimension in the right Properties panel (e.g. Length, Thickness) to edit its value and watch the 3D model update live.
              </p>
              <p>
                <strong>Command Palette:</strong> Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-tech">Ctrl+K</kbd> anywhere to quickly search across modules and trigger CAD actions.
              </p>
              <p>
                <strong>CAD Integration Bridge:</strong> Connected to local SolidWorks 2024 desktop bridge on port 8892 with deterministic B-Rep verification.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
