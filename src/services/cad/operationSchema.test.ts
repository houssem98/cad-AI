import { describe, expect, it } from 'vitest';
import fixtures from '../../../schema/operation-cases.json';
import { validateOperation, validateProposal } from './operationSchema';

describe('operation schema', () => {
  for (const c of fixtures.cases as any[]) {
    it(c.name, () => {
      const op: any = { ...structuredClone(fixtures.base), ...c.patch };
      if (c.delete) delete op[c.delete];
      const errs = c.proposal ? validateProposal(op) : validateOperation(op);
      if (c.refusedAt === null) expect(errs).toEqual([]);
      else expect(errs.map((e) => e.path)).toContain(c.refusedAt);
    });
  }
});
