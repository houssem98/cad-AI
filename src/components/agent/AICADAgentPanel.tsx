/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  CheckCircle2,
  Minimize2,
  X,
  ExternalLink,
  Loader2,
  Sparkles,
  Bot,
  AlertCircle,
  FileCode,
  Mic,
  ChevronDown,
  Cpu,
  Layers,
  Download,
  Check,
  XCircle,
  FileText,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { AgentChatMessage, CADModelParameters, OperationHistoryRecord } from '../../types/cad';
import { Dialog } from '../workspace/Dialog';
import { INITIAL_CHAT_MESSAGES } from '../../data/mockCadData';
import {
  generateSTEPFile,
  generateSTLFile,
  generateSolidWorksVBAMacro,
  generatePythonCADScript,
  generate2DDrawingSVG,
  downloadFile,
} from '../../services/cad/cadGenerators';

interface AICADAgentPanelProps {
  parameters: CADModelParameters;
  onUpdateParameters: (newParams: Partial<CADModelParameters>) => void;
  onAddOperation: (op: OperationHistoryRecord) => void;
  onClose?: () => void;
  onFocusCAD?: () => void;
  onOpenLiveVoice?: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export type GeminiModelChoice = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';

export const AICADAgentPanel: React.FC<AICADAgentPanelProps> = ({
  parameters,
  onUpdateParameters,
  onAddOperation,
  onClose,
  onFocusCAD,
  onOpenLiveVoice,
  isOpen = true,
  onToggleOpen,
}) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>(() => {
    // Ensure initial agent message has deliverablesAvailable enabled
    return INITIAL_CHAT_MESSAGES.map((m) =>
      m.id === 'msg-2' ? { ...m, deliverablesAvailable: true } : m
    );
  });
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.8-flash');
  const [selectedRole, setSelectedRole] = useState<'architect' | 'fea' | 'dfm' | 'standards'>('architect');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showDrawingPreviewModal, setShowDrawingPreviewModal] = useState(false);

  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Stage 1: Generate plan and present for user approval
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isProcessing) return;

    const userMsg: AgentChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text,
      senderName: 'Alex Johnson',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsProcessing(true);

    try {
      // Determine parameter adjustments from natural language or API
      let newParams: Partial<CADModelParameters> = {};
      const lower = text.toLowerCase();

      if (lower.includes('15mm') || lower.includes('thickness to 15') || (lower.includes('thickness') && lower.includes('15'))) {
        newParams = { thickness: 15.0, mass: Number((parameters.mass * 1.35).toFixed(2)) };
      } else if (lower.includes('12mm') || lower.includes('thickness to 12')) {
        newParams = { thickness: 12.0, mass: Number((parameters.mass * 1.15).toFixed(2)) };
      } else if (lower.includes('titanium')) {
        newParams = { material: 'Titanium Ti-6Al-4V', density: 4.43, mass: 0.19 };
      } else if (lower.includes('stiffener') || lower.includes('gusset')) {
        newParams = { mass: Number((parameters.mass + 0.04).toFixed(2)) };
      } else if (lower.includes('10mm') || lower.includes('hole') || lower.includes('bore')) {
        newParams = { holeDiameter: 10.0 };
      } else if (lower.includes('length')) {
        const match = lower.match(/(\d+)\s*mm/);
        const l = match ? parseFloat(match[1]) : 100.0;
        newParams = { length: l, mass: Number((parameters.mass * (l / 80)).toFixed(2)) };
      } else if (lower.includes('width')) {
        const match = lower.match(/(\d+)\s*mm/);
        const w = match ? parseFloat(match[1]) : 60.0;
        newParams = { width: w };
      } else {
        newParams = { thickness: parameters.thickness === 10 ? 12 : 10 };
      }

      // Try calling server-side Gemini API
      let planSteps = [
        {
          step: 1,
          action: 'Extrude Base Feature',
          details: `${(newParams.length || parameters.length)} × ${(newParams.width || parameters.width)} × ${(newParams.thickness || parameters.thickness)} mm`,
          status: 'pending' as const,
        },
        {
          step: 2,
          action: 'Pattern Mounting Holes',
          details: `4x Ø${(newParams.holeDiameter || parameters.holeDiameter)} mm through-all`,
          status: 'pending' as const,
        },
        {
          step: 3,
          action: 'Secondary Upright Flange & Bore',
          details: `H=${parameters.flangeHeight}mm, Bore Ø${parameters.centerBoreDiameter}mm`,
          status: 'pending' as const,
        },
        {
          step: 4,
          action: 'Independent ASME Y14.5 Verification',
          details: 'not run in this demo',
          status: 'pending' as const,
        },
      ];

      let replyContent = `Demo plan for "${text}". Applying it changes the preview only; nothing is sent to a CAD kernel:`;

      let fromModel = false;
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            model: selectedModel,
            systemRole: 'You are MechForge AI, an expert mechanical engineering CAD automation architect.',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          fromModel = !data.simulated;
          if (data.reply) {
            replyContent = data.reply;
          }
          if (data.plan && data.plan.length > 0) {
            planSteps = data.plan.map((p: any) => ({ ...p, status: 'pending' }));
          }
          if (data.paramUpdate) {
            newParams = { ...newParams, ...data.paramUpdate };
          }
        }
      } catch (e) {
        console.warn('Using local engineering plan generator:', e);
      }

      // Create message in 'waiting_approval' state
      const proposedMsg: AgentChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: fromModel ? `MechForge AI (${selectedModel})` : 'Offline demo (no model was called)',
        content: replyContent,
        plan: planSteps,
        executionStatus: 'waiting_approval',
        pendingParameters: newParams,
        targetPartName: 'Demo bracket',
        suggestedActions: [
          'Apply plan to the preview',
          'Modify dimensions first',
          'Switch material to Titanium Ti-6Al-4V',
        ],
      };

      setMessages((prev) => [...prev, proposedMsg]);
    } catch (err: any) {
      console.error('Plan generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Stage 2: User approves plan -> Autonomous execution loop with progress steps
  const handleApprovePlan = (messageId: string, pendingParams?: Partial<CADModelParameters>) => {
    // 1. Set to executing with 25% progress
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          executionStatus: 'executing',
          progressPercent: 25,
          activeStageName: 'Demo: no validation runs',
          plan: m.plan?.map((s, idx) => ({
            ...s,
            status: idx === 0 ? 'executing' : 'pending',
          })),
        };
      })
    );

    // 2. Increment to 50%
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            progressPercent: 50,
            activeStageName: 'Demo: nothing is sent to a CAD application',
            plan: m.plan?.map((s, idx) => ({
              ...s,
              status: idx <= 1 ? (idx === 1 ? 'executing' : 'completed') : 'pending',
            })),
          };
        })
      );
    }, 600);

    // 3. Increment to 75%
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            progressPercent: 75,
            activeStageName: 'Demo: updating the preview from the parameters',
            plan: m.plan?.map((s, idx) => ({
              ...s,
              status: idx <= 2 ? (idx === 2 ? 'executing' : 'completed') : 'pending',
            })),
          };
        })
      );
    }, 1200);

    // 4. Final completion at 100%
    setTimeout(() => {
      const mergedParams = { ...parameters, ...(pendingParams || {}) };

      // Update 3D CAD model live
      if (pendingParams && Object.keys(pendingParams).length > 0) {
        onUpdateParameters(pendingParams);
      }

      // Add to bottom console operation history
      onAddOperation({
        id: `op-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: `Demo preview update (${mergedParams.length}x${mergedParams.width}x${mergedParams.thickness}mm)`,
        status: 'Demo',
        details: `${mergedParams.material} | not verified`,
        durationMs: 410,
      });

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            executionStatus: 'completed',
            progressPercent: 100,
            activeStageName: 'Demo finished: preview updated',
            deliverablesAvailable: true,
            plan: m.plan?.map((s) => ({
              ...s,
              status: 'completed',
            })),
            verificationSummary: {
              passed: false,
              text: 'Demo finished: the preview changed. No CAD operation ran and nothing was verified.',
            },
          };
        })
      );
    }, 1800);
  };

  // User rejects plan
  const handleRejectPlan = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          executionStatus: 'idle',
          content: `${m.content}\n\n[Action Cancelled by User: Plan rejected. No CAD features were modified.]`,
        };
      })
    );
  };

  // Download real deliverables using cadGenerators
  const handleDownloadDeliverable = (
    type: 'step' | 'stl' | 'vba' | 'python' | 'drawing',
    customParams?: Partial<CADModelParameters>
  ) => {
    const activeParams = { ...parameters, ...(customParams || {}) };
    const baseName = `Mounting_Bracket_${activeParams.length}x${activeParams.width}x${activeParams.thickness}`;

    switch (type) {
      case 'step': {
        const content = generateSTEPFile(activeParams);
        downloadFile(content, `${baseName}.step`, 'application/step');
        break;
      }
      case 'stl': {
        const content = generateSTLFile(activeParams);
        downloadFile(content, `${baseName}.stl`, 'application/sla');
        break;
      }
      case 'vba': {
        const content = generateSolidWorksVBAMacro(activeParams);
        downloadFile(content, `${baseName}_SolidWorks_Macro.vbs`, 'text/plain');
        break;
      }
      case 'python': {
        const content = generatePythonCADScript(activeParams);
        downloadFile(content, `${baseName}_SolidWorks_Bridge.py`, 'text/x-python');
        break;
      }
      case 'drawing': {
        const content = generate2DDrawingSVG(activeParams);
        downloadFile(content, `${baseName}_Drawing_ASME.svg`, 'image/svg+xml');
        break;
      }
    }
  };

  if (!isOpen || isMinimized) {
    const handleExpand = onToggleOpen || (() => setIsMinimized(false));
    return (
      <div className="w-11 bg-[#0e0e0e] border-r border-[#232323] flex flex-col items-center py-2.5 justify-between select-none flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleExpand}
            className="p-1.5 text-steel-400 hover:text-white bg-steel-950/60 rounded border border-steel-700/50 transition-colors cursor-pointer"
            title="Expand AI CAD Agent"
          >
            <Bot className="w-4 h-4 text-steel-400" />
          </button>

          <div className="w-5 h-[1px] bg-[#232323]" />

          {onOpenLiveVoice && (
            <button
              onClick={onOpenLiveVoice}
              className="p-1.5 text-steel-400 hover:text-white hover:bg-[#1a1a1a] rounded transition-colors cursor-pointer"
              title="Start Live Voice"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <div className="writing-vertical text-[10px] font-tech text-neutral-500 uppercase tracking-widest pt-2">
            AI AGENT
          </div>
        </div>
      </div>
    );
  }

  const handleCollapse = onToggleOpen || (() => setIsMinimized(true));

  return (
    <>
      <div className="w-[310px] lg:w-[340px] h-full bg-[#0d0d0d] border-r border-[#232323] flex flex-col flex-shrink-0 select-none z-20 transition-all">
        {/* 1. Header with Model Selector & Live Voice Button */}
        <div className="flex flex-wrap items-center justify-between gap-y-1.5 px-3.5 py-2.5 border-b border-[#292929] bg-[#181818]">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap font-semibold text-neutral-100 text-xs tracking-tight">AI CAD Agent</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-steel-950 text-steel-400 border border-steel-800/60 rounded font-bold uppercase tracking-wider">
              Beta
            </span>

            {/* Model Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[10px] font-tech font-semibold rounded bg-steel-950/80 text-steel-400 border border-steel-800/60 hover:bg-steel-900/60 transition-colors"
                title="Select Gemini Engine"
              >
                <Cpu className="w-3 h-3 text-steel-400" />
                <span>{selectedModel}</span>
                <ChevronDown className="w-2.5 h-2.5 ml-0.5 text-neutral-400" />
              </button>

              {showModelMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[#181818] border border-[#3a3a3a] rounded-lg shadow-2xl py-1 z-50 text-xs font-tech">
                  <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                    Gemini Models
                  </div>
                  <button
                    onClick={() => {
                      setSelectedModel('gemini-3.8-flash');
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#232323] ${
                      selectedModel === 'gemini-3.8-flash' ? 'text-steel-400 font-bold' : 'text-neutral-300'
                    }`}
                  >
                    <div>gemini-3.8-flash</div>
                    <div className="text-[10px] text-neutral-500">General Tasks • Balanced Speed</div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel('gemini-3.1-flash-lite');
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#232323] ${
                      selectedModel === 'gemini-3.1-flash-lite' ? 'text-steel-400 font-bold' : 'text-neutral-300'
                    }`}
                  >
                    <div>gemini-3.1-flash-lite</div>
                    <div className="text-[10px] text-neutral-500">Fast Tasks • Ultra Low-Latency</div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel('gemini-4-argon');
                      setShowModelMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#232323] ${
                      selectedModel === 'gemini-4-argon' ? 'text-steel-400 font-bold' : 'text-neutral-300'
                    }`}
                  >
                    <div>gemini-4-argon</div>
                    <div className="text-[10px] text-neutral-500">Complex Reasoning & Deep Math</div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Live Voice Button & Minimize / Close */}
          <div className="ml-auto flex items-center gap-1.5 text-neutral-400">
            {onOpenLiveVoice && (
              <button
                onClick={onOpenLiveVoice}
                className="flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded bg-steel-600/20 hover:bg-steel-600/30 text-steel-300 border border-steel-500/40 text-[10px] font-tech font-bold transition-all shadow-sm"
                title="Launch Live Voice conversation with gemini-3.8-live"
              >
                <Mic className="w-3 h-3 text-steel-400" />
                <span>Live Voice</span>
              </button>
            )}

            <button
              onClick={handleCollapse}
              className="p-1 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
              title="Collapse Panel"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                title="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Role / Persona Banner */}
        <div className="px-3.5 py-1.5 bg-[#171717] border-b border-[#252525] flex items-center justify-between text-[11px]">
          <span className="text-neutral-400 font-tech">Copilot Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            aria-label="Copilot role"
            className="bg-transparent text-neutral-200 font-tech text-[11px] rounded focus:outline-none focus:ring-1 focus:ring-steel-400 cursor-pointer"
          >
            <option value="architect" className="bg-[#181818]">CAD Automation Architect</option>
            <option value="fea" className="bg-[#181818]">FEA & Stress Analyst</option>
            <option value="dfm" className="bg-[#181818]">DFM & Tooling Specialist</option>
            <option value="standards" className="bg-[#181818]">ASME Y14.5 Standards Auditor</option>
          </select>
        </div>

        {/* 2. Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* User Message */}
              {msg.sender === 'user' ? (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0 border border-neutral-600/50">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                      alt="Alex Johnson"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="bg-[#232323] text-neutral-200 text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-[#3a3a3a] shadow-sm">
                      {msg.content}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-tech text-right pr-1">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ) : (
                /* Agent Message */
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-steel-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs shadow-md border border-steel-400/40">
                    M
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="bg-[#1c1c1c] text-neutral-200 text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-[#2f2f2f] shadow-sm">
                      <p className="mb-2 whitespace-pre-line">{msg.content}</p>

                      {/* Numbered Execution Plan List */}
                      {msg.plan && (
                        <div className="space-y-1.5 my-2.5 pl-1">
                          {msg.plan.map((step) => (
                            <div key={step.step} className="flex items-center gap-2 text-xs">
                              <span
                                className={`w-4 h-4 rounded-full border text-[10px] font-tech font-bold flex items-center justify-center flex-shrink-0 ${
                                  step.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                    : step.status === 'executing'
                                    ? 'bg-steel-500 text-white border-steel-400 animate-pulse'
                                    : 'bg-steel-500/30 text-steel-400 border-steel-400/50'
                                }`}
                              >
                                {step.status === 'completed' ? '✓' : step.step}
                              </span>
                              <span className="text-neutral-300 font-medium">{step.action}</span>
                              <span className="text-neutral-500 font-tech text-[11px]">({step.details})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* STATE 1: PLAN AWAITING APPROVAL CARD (Autonomous Plan-Approve-Execute Loop) */}
                    {msg.executionStatus === 'waiting_approval' && (
                      <div className="p-3.5 bg-[#1d1d1d] border border-steel-500/40 rounded-xl space-y-3 shadow-lg animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-steel-300 font-semibold">
                            <Sparkles className="w-4 h-4 text-steel-400 animate-pulse" />
                            <span>Approve this demo plan</span>
                          </div>
                          <span className="text-[10px] font-tech px-1.5 py-0.5 rounded bg-steel-900/60 text-steel-300 border border-steel-700/60">
                            Demo
                          </span>
                        </div>

                        {/* Parameter delta preview */}
                        {msg.pendingParameters && (
                          <div className="bg-[#121212] p-2 rounded-lg border border-[#2f2f2f] font-tech text-[11px] space-y-1 text-neutral-300">
                            <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                              Target: {msg.targetPartName || 'Demo bracket'}
                            </div>
                            {Object.entries(msg.pendingParameters).map(([k, v]) => (
                              <div key={k} className="flex justify-between items-center text-xs">
                                <span className="text-neutral-400 capitalize">{k}:</span>
                                <span className="text-emerald-400 font-semibold">{String(v)}</span>
                              </div>
                            ))}
                            <div className="text-[10px] text-neutral-500 pt-0.5 flex justify-between">
                              <span>Kernel check:</span>
                              <span className="text-neutral-400">none (demo)</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApprovePlan(msg.id, msg.pendingParameters)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-steel-600 hover:bg-steel-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Apply to preview</span>
                          </button>
                          <button
                            onClick={() => handleRejectPlan(msg.id)}
                            className="flex items-center justify-center gap-1 py-2 px-3 bg-[#232323] hover:bg-[#2d2d2d] text-neutral-300 hover:text-white rounded-lg text-xs border border-neutral-700 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STATE 2: EXECUTION PROGRESS CARD (Radial Progress Loop) */}
                    {(msg.executionStatus === 'executing' || (msg.executionStatus === 'completed' && msg.id === 'msg-2')) && (
                      <div className="p-3 bg-[#191919] border border-[#333333] rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            {msg.executionStatus === 'completed' ? 'Demo plan applied to the preview.' : 'Applying the demo plan...'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 py-1">
                          <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
                            <svg className="w-11 h-11 -rotate-90">
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="stroke-neutral-800"
                                strokeWidth="3.5"
                                fill="transparent"
                              />
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="stroke-steel-500 transition-all duration-500"
                                strokeWidth="3.5"
                                strokeDasharray={113}
                                strokeDashoffset={113 * (1 - (msg.progressPercent || 75) / 100)}
                                strokeLinecap="round"
                                fill="transparent"
                              />
                            </svg>
                            <span className="absolute text-[11px] font-tech font-bold text-neutral-100">
                              {msg.progressPercent || 75}%
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-neutral-200">
                              {msg.progressPercent === 100 ? 'Preview updated' : 'Updating the preview...'}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {msg.activeStageName ||
                                (msg.progressPercent === 100
                                  ? 'nothing was verified'
                                  : 'This may take a few moments')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STATE 3: COMPLETION CARD WITH GREEN CHECK AND VIEW IN CAD */}
                    {msg.verificationSummary && (
                      <div className="p-3 bg-[#1e1e1e] border border-emerald-500/30 rounded-xl space-y-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="text-xs font-semibold text-emerald-400">
                            Demo finished
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-300 pl-7">
                          {msg.verificationSummary.text}
                        </div>
                        <div className="pl-7 pt-1 flex items-center gap-2">
                          <button
                            onClick={onFocusCAD}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-steel-600 hover:bg-steel-500 text-white rounded text-xs font-medium transition-colors shadow-sm cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View in CAD</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STATE 4: REAL WORK OUTPUT & DOWNLOADABLE DELIVERABLES CARD */}
                    {msg.deliverablesAvailable && (
                      <div className="p-3.5 bg-[#181818] border border-[#373737] rounded-xl space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                            <Download className="w-3.5 h-3.5 text-steel-400" />
                            <span>Generated Engineering Deliverables</span>
                          </div>
                          <span className="text-[9px] font-tech text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            Ready
                          </span>
                        </div>

                        <div className="text-[11px] text-neutral-400 leading-snug">
                          Files generated from the demo parameters by text templates, not by a CAD kernel:
                        </div>

                        {/* Deliverables Action Grid */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {/* STEP AP242 */}
                          <button
                            onClick={() => handleDownloadDeliverable('step', msg.pendingParameters)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2b2b2b] border border-[#333333] text-left transition-colors cursor-pointer group"
                            title="Download ISO 10303-21 STEP AP242 file"
                          >
                            <div className="p-1 rounded bg-steel-500/20 text-steel-400 group-hover:bg-steel-500/30">
                              <FileCode className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-neutral-200 truncate">STEP AP242</div>
                              <div className="text-[9px] font-tech text-neutral-500 truncate">ISO-10303 B-Rep</div>
                            </div>
                          </button>

                          {/* STL Mesh */}
                          <button
                            onClick={() => handleDownloadDeliverable('stl', msg.pendingParameters)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2b2b2b] border border-[#333333] text-left transition-colors cursor-pointer group"
                            title="Download ASCII/Binary STL mesh for 3D printing"
                          >
                            <div className="p-1 rounded bg-steel-500/20 text-steel-400 group-hover:bg-steel-500/30">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-neutral-200 truncate">STL Mesh</div>
                              <div className="text-[9px] font-tech text-neutral-500 truncate">3D Printing</div>
                            </div>
                          </button>

                          {/* SolidWorks VBA Macro */}
                          <button
                            onClick={() => handleDownloadDeliverable('vba', msg.pendingParameters)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2b2b2b] border border-[#333333] text-left transition-colors cursor-pointer group"
                            title="Download runnable SOLIDWORKS VBA Macro (.vbs)"
                          >
                            <div className="p-1 rounded bg-red-500/20 text-red-400 group-hover:bg-red-500/30">
                              <FileCode className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-neutral-200 truncate">SW Macro (.vbs)</div>
                              <div className="text-[9px] font-tech text-neutral-500 truncate">COM Dispatch</div>
                            </div>
                          </button>

                          {/* Python CAD Automation */}
                          <button
                            onClick={() => handleDownloadDeliverable('python', msg.pendingParameters)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[#1e1e1e] hover:bg-[#2b2b2b] border border-[#333333] text-left transition-colors cursor-pointer group"
                            title="Download Python pywin32 automation script"
                          >
                            <div className="p-1 rounded bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30">
                              <FileCode className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-neutral-200 truncate">Python Script</div>
                              <div className="text-[9px] font-tech text-neutral-500 truncate">pywin32 bridge</div>
                            </div>
                          </button>
                        </div>

                        {/* 2D Technical Drawing Callout & Modal Preview Trigger */}
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadDeliverable('drawing', msg.pendingParameters)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#252525] hover:bg-[#303030] border border-steel-500/30 rounded text-[11px] text-steel-300 font-semibold transition-colors cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download 2D Drawing (.svg)</span>
                          </button>
                          <button
                            onClick={() => setShowDrawingPreviewModal(true)}
                            className="p-1.5 bg-[#252525] hover:bg-[#303030] border border-steel-500/30 rounded text-steel-300 transition-colors cursor-pointer"
                            title="Inspect 2D Engineering Drawing (ASME Y14.5)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-neutral-500 font-tech pr-1 flex items-center justify-between">
                      <span>{msg.senderName || 'MechForge AI'}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-steel-400 bg-steel-950/30 border border-steel-800/40 px-3 py-2 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-steel-400" />
              <span>{selectedModel} analyzing geometric constraints & generating plan...</span>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>

        {/* 3. Quick Suggestions Pills */}
        <div className="px-3 py-1.5 border-t border-[#232323] bg-[#111111] flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-300">
          <button
            onClick={() => handleSendMessage('Increase thickness to 15mm')}
            className="whitespace-nowrap px-2.5 py-1 bg-[#1b1b1b] hover:bg-[#282828] border border-[#333333] rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Thickness 15mm
          </button>
          <button
            onClick={() => handleSendMessage('Switch material to Titanium Ti-6Al-4V')}
            className="whitespace-nowrap px-2.5 py-1 bg-[#1b1b1b] hover:bg-[#282828] border border-[#333333] rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Titanium Ti-6Al-4V
          </button>
          <button
            onClick={() => handleSendMessage('Increase base length to 100mm')}
            className="whitespace-nowrap px-2.5 py-1 bg-[#1b1b1b] hover:bg-[#282828] border border-[#333333] rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Length 100mm
          </button>
          <button
            onClick={() => handleSendMessage('Update mounting hole diameters to 10mm')}
            className="whitespace-nowrap px-2.5 py-1 bg-[#1b1b1b] hover:bg-[#282828] border border-[#333333] rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Holes Ø10mm
          </button>
        </div>

        {/* 4. Bottom Input Bar */}
        <div className="p-3 border-t border-[#292929] bg-[#171717]">
          <div className="relative bg-[#1c1c1c] border border-[#323232] rounded-xl focus-within:border-steel-500/80 transition-colors shadow-inner">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              aria-label="Message"
              placeholder={`Ask ${selectedModel} about your design...`}
              rows={2}
              className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-xs px-3 py-2.5 resize-none focus:outline-none"
            />

            <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
              <div className="flex items-center gap-1 text-neutral-400">
                <button
                  type="button"
                  className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                  disabled
                  title="Attach CAD drawing, STEP or PDF (not available yet)"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
                  disabled
                  title="Attach reference image or scan (not available yet)"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isProcessing}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                  inputValue.trim() && !isProcessing
                    ? 'bg-steel-600 text-white hover:bg-steel-500 shadow-md '
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
                title="Send instruction to CAD copilot"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Technical Drawing Preview Modal */}
      {showDrawingPreviewModal && (
        <Dialog label="Drawing preview" onClose={() => setShowDrawingPreviewModal(false)} className="w-full max-w-4xl h-[85vh] bg-[#101010] border border-[#2f2f2f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#292929] bg-[#181818]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-steel-400" />
                <span className="font-semibold text-neutral-100 text-sm">
                  ASME Y14.5 Engineering Drawing • Mounting_Bracket.SLDDRW
                </span>
                <span className="text-[10px] font-tech text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  Orthographic 3rd Angle
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDeliverable('drawing')}
                  className="flex items-center gap-1 px-3 py-1 bg-steel-600 hover:bg-steel-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download SVG</span>
                </button>
                <button
                  onClick={() => setShowDrawingPreviewModal(false)}
                  aria-label="Close drawing"
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0d0d0d] p-4 overflow-auto flex items-center justify-center">
              <div
                className="w-full h-full max-w-[1000px] flex items-center justify-center shadow-2xl"
                dangerouslySetInnerHTML={{ __html: generate2DDrawingSVG(parameters) }}
              />
            </div>

            <div className="px-4 py-2 bg-[#121212] border-t border-[#292929] flex items-center justify-between text-xs text-neutral-400 font-tech">
              <span>Projection: 3rd Angle (ISO 128 / ASME Y14.5)</span>
              <span>Tolerance Class: ISO 2768-m (±0.05 mm)</span>
              <span>Scale: 1:1 @ A3 Sheet</span>
            </div>
        </Dialog>
      )}
    </>
  );
};
