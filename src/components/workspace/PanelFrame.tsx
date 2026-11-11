import React from 'react';
import { AlertTriangle, Ban, CheckCircle2, Inbox, Loader2, Play, type LucideIcon } from 'lucide-react';
import type { PanelId, PanelStatus, PanelView } from './panelViews';

const LOOK: Record<PanelStatus, { title: string; Icon: LucideIcon; tone: string }> = {
  loading: { title: 'Loading', Icon: Loader2, tone: 'border-slate-600 text-slate-300' },
  empty: { title: 'Nothing here yet', Icon: Inbox, tone: 'border-dashed border-slate-600 text-slate-400' },
  error: { title: 'Something went wrong', Icon: AlertTriangle, tone: 'border-red-700 bg-red-950/30 text-red-300' },
  running: { title: 'Running', Icon: Play, tone: 'border-sky-700 bg-sky-950/30 text-sky-300' },
  completed: { title: 'Completed', Icon: CheckCircle2, tone: 'border-emerald-700 bg-emerald-950/20 text-emerald-300' },
  cancelled: { title: 'Cancelled', Icon: Ban, tone: 'border-amber-700/60 bg-amber-950/20 text-amber-300' },
};

interface Props {
  panel: PanelId;
  label: string;
  view: PanelView;
  className?: string;
  stateClassName?: string; // sizing for the state body, where the panel's own content would otherwise size it
  children?: React.ReactNode;
}

// One panel of the workspace. Completed shows the panel's content; every other state replaces it.
export function PanelFrame({ panel, label, view, className = '', stateClassName = '', children }: Props) {
  const { status, message } = view;
  const content = status === 'completed' && children;
  return (
    <section aria-label={label} aria-busy={status === 'loading' || status === 'running'} data-panel={panel} data-status={status}
      className={content ? className : `${className} ${stateClassName}`}>
      {content || <StateBody label={label} status={status} message={message} />}
    </section>
  );
}

function StateBody({ label, status, message }: { label: string; status: PanelStatus; message?: string }) {
  const { title, Icon, tone } = LOOK[status];
  return (
    <div role={status === 'error' ? 'alert' : 'status'} className="flex h-full w-full items-center justify-center p-4">
      <div className={`flex max-w-[260px] flex-col items-center gap-2 rounded-lg border px-4 py-5 text-center text-xs ${tone}`}>
        <Icon aria-hidden className={`h-5 w-5 ${status === 'loading' ? 'animate-spin' : ''}`} />
        <span className="font-semibold">{title}</span>
        <span className="text-[11px] text-slate-400">{message ? `${label}: ${message}` : label}</span>
        {status === 'running' && <span aria-hidden className="h-1 w-24 rounded bg-sky-500/70" />}
      </div>
    </div>
  );
}
