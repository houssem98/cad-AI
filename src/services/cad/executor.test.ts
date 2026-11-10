import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Executor } from './executor';

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (id: string, type: string, params: object) => ({
  id, target: { document: 'doc-1' }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null,
});
const PART = [op('p1', 'new_part', { name: 'plate' }), op('s1', 'sketch_rectangle', { plane: 'top', width: mm(40), height: mm(20) })];
const EXTRUDE = op('e1', 'extrude', { sketch: 's1', depth: mm(10) });

let opened: Executor[] = [];
afterEach(() => { opened.forEach((e) => e.close()); opened = []; });

async function start(workerArgs: string[] = [], deadlineMs = 5000, dir = mkdtempSync(join(tmpdir(), 'cad-exec-'))) {
  const ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs, deadlineMs: (t) => (t === 'extrude' ? deadlineMs : 5000) });
  opened.push(ex);
  for (const p of PART) expect((await ex.execute(p, { requestId: 'r1' })).status).toBe('succeeded');
  return { ex, dir };
}

const features = async (ex: Executor) => (await ex.inspect('doc-1')).result.features;

describe('executor', { timeout: 30000 }, () => {
  it('refuses invalid parameters before the kernel is called, with a record', async () => {
    const { ex } = await start();
    const before = (await ex.health()).ops;
    const out = await ex.execute(op('e1', 'extrude', { sketch: 's1', depth: mm(0) }), { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('validation_failed');
    expect(out.record.requestedOperation.id).toBe('e1');
    expect(out.record.cadCommand).toBeNull();
    expect((await ex.health()).ops).toBe(before);
  });

  it('refuses an operation type script', async () => {
    const { ex } = await start();
    const before = (await ex.health()).ops;
    const out = await ex.execute(op('x1', 'script', { code: 'print(1)' }), { requestId: 'r1' });
    expect(out.record.errorDetails.code).toBe('validation_failed');
    expect((await ex.health()).ops).toBe(before);
  });

  it('times out a hung operation, records it and restores the checkpoint', async () => {
    const { ex } = await start(['--hang', 'extrude'], 300);
    const out = await ex.execute(EXTRUDE, { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('timeout');
    expect(out.record.targetDocument).toMatchObject({ revisionBefore: 2, revisionAfter: 2 });
    expect(out.record.validationResult.restore.result.features).toEqual(['p1', 's1']);
    expect(await features(ex)).toEqual(['p1', 's1']);
  });

  it('cancels a running operation, records it and restores the checkpoint', async () => {
    const { ex } = await start(['--hang', 'extrude']);
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 200);
    const out = await ex.execute(EXTRUDE, { requestId: 'r1', signal: abort.signal });
    expect(out.status).toBe('cancelled');
    expect(out.record.errorDetails.code).toBe('cancelled');
    expect(out.record.targetDocument).toMatchObject({ revisionBefore: 2, revisionAfter: 2 });
    expect(await features(ex)).toEqual(['p1', 's1']);
  });

  it('records a failed operation with its error and restores the checkpoint', async () => {
    const { ex } = await start(['--fail', 'extrude']);
    const out = await ex.execute(EXTRUDE, { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('kernel_error');
    expect(out.record.errorDetails.message).toContain('on purpose');
    expect(await features(ex)).toEqual(['p1', 's1']);
  });

  it('restores and records an operation left running when the server stopped', async () => {
    const { ex, dir } = await start();
    ex.store.insertOperation({ rowId: 'crash-1', opId: 'e1', docId: 'doc-1' }, 'r1', EXTRUDE);
    ex.store.setStatus('crash-1', 'running');
    ex.close();
    const again = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir });
    opened.push(again);
    const rec = again.store.record('crash-1');
    expect(rec.status).toBe('failed');
    expect(rec.errorDetails.code).toBe('worker_crashed');
    expect(await features(again)).toEqual(['p1', 's1']);
  });

  it('denies a consequential operation when nobody approves it', async () => {
    const { ex } = await start();
    const out = await ex.execute(op('m1', 'modify_dimension', { parameter: 'e1.depth', value: mm(12) }), { requestId: 'r1' });
    expect(out.status).toBe('cancelled');
    expect(out.record.errorDetails.code).toBe('approval_denied');
    expect(out.record.approval).toEqual({ required: true, decision: 'denied' });
  });

  it('exports through the kernel with a hashed artifact and refuses a corrupted STEP with a record', async () => {
    const { ex, dir } = await start(['--adapter', 'kernel']);
    expect((await ex.execute(EXTRUDE, { requestId: 'r1' })).status).toBe('succeeded');
    const out = await ex.execute(op('x1', 'export', { format: 'step' }), { requestId: 'r1' });
    expect(out.status).toBe('succeeded');
    const [ref] = out.record.artifactReferences;
    const file = ex.store.artifact(ref.id)!;
    expect(createHash('sha256').update(readFileSync(file.path)).digest('hex')).toBe(ref.sha256);
    expect(out.record.validationResult.inspection.valid).toBe(true);

    const bad = join(dir, 'bad.step');
    writeFileSync(bad, 'ISO-10303-21;\nthis is not a step file\n');
    ex.store.addArtifact({ id: 'bad', kind: 'step', path: bad, sha256: '', bytes: 0 });
    const copy = (artifact: string) => ({ ...op('i1', 'import', { artifact }), target: { document: 'doc-2' } });
    const refused = await ex.execute(copy('bad'), { requestId: 'r1' });
    expect(refused.status).toBe('failed');
    expect(refused.record.errorDetails.code).toBe('kernel_error');
    expect(ex.store.document('doc-2')).toBeUndefined();

    const before = (await ex.health()).ops;
    const unknown = await ex.execute(copy('nope'), { requestId: 'r1' });
    expect(unknown.record.errorDetails.code).toBe('precondition_failed');
    expect((await ex.health()).ops).toBe(before);
  });

  it('keeps every roadmap record field and sends the kernel millimetres', async () => {
    const { ex } = await start();
    const out = await ex.execute(op('s2', 'sketch_circle', { plane: 'top', diameter: { value: 1, unit: 'in' } }), { requestId: 'r1' });
    expect(out.status).toBe('succeeded');
    for (const field of ['requestedOperation', 'targetDocument', 'cadCommand', 'executionResult', 'validationResult', 'errorDetails', 'artifactReferences']) {
      expect(out.record).toHaveProperty(field);
    }
    expect(out.record.cadCommand).toEqual({ call: 'create_sketch', params: { plane: 'top', diameter: { value: 25.4, unit: 'mm' } } });
    expect(out.record.targetDocument).toMatchObject({ id: 'doc-1', revisionBefore: 2, revisionAfter: 3 });
    expect(out.record.validationResult.inspection).not.toBeNull();
  });
});
