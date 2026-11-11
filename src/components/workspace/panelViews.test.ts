import { describe, expect, it } from 'vitest';
import { panelViewsFromUrl } from './panelViews';

describe('panelViewsFromUrl', () => {
  it('reads known panels and states in development builds', () => {
    expect(panelViewsFromUrl('?panels=tree:error,chat:running,nope:error,tasks:bogus', true)).toEqual({ tree: { status: 'error' }, chat: { status: 'running' } });
  });

  it('ignores the URL in production builds', () => {
    expect(panelViewsFromUrl('?panels=tree:completed', false)).toEqual({});
  });
});
