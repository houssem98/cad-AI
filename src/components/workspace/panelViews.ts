export const PANEL_IDS = ['chat', 'viewport', 'properties', 'tree', 'tasks', 'history'] as const;
export const PANEL_STATUSES = ['loading', 'empty', 'error', 'running', 'completed', 'cancelled'] as const;
export type PanelId = (typeof PANEL_IDS)[number];
export type PanelStatus = (typeof PANEL_STATUSES)[number];
export interface PanelView { status: PanelStatus; message?: string }
export type PanelViews = Record<PanelId, PanelView>;

// The job engine arrives in L6, so the tasks panel has nothing to show yet.
export const DEFAULT_PANELS: PanelViews = {
  chat: { status: 'completed' }, viewport: { status: 'completed' }, properties: { status: 'completed' },
  tree: { status: 'completed' }, tasks: { status: 'empty', message: 'No background jobs' }, history: { status: 'completed' },
};

// Development builds only: the e2e suite sets panel states from the URL, as in ?panels=tree:error,chat:running.
export function panelViewsFromUrl(search: string, dev: boolean): Partial<PanelViews> {
  const out: Partial<PanelViews> = {};
  if (!dev) return out;
  for (const pair of new URLSearchParams(search).get('panels')?.split(',') ?? []) {
    const [id, status] = pair.split(':') as [PanelId, PanelStatus];
    if (PANEL_IDS.includes(id) && PANEL_STATUSES.includes(status)) out[id] = { status };
  }
  return out;
}
