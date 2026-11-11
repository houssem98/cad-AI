import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Executor, type ExecutorOptions } from './executor';

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (id: string, type: string, params: object) => ({
  id, target: { document: 'doc-1' }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null,
});
const on = (document: string, o: object) => ({ ...o, target: { document } });
const PART = [op('p1', 'new_part', { name: 'plate' }), op('s1', 'sketch_rectangle', { plane: 'top', width: mm(40), height: mm(20) })];
const EXTRUDE = op('e1', 'extrude', { sketch: 's1', depth: mm(10) });
const MODIFY = op('m1', 'modify_dimension', { parameter: 'e1.depth', value: mm(12) });
const KERNEL = ['--adapter', 'kernel'];

let opened: Executor[] = [];
afterEach(() => { opened.forEach((e) => e.close()); opened = []; });

async function start(workerArgs: string[] = [], deadlineMs = 5000, dir = mkdtempSync(join(tmpdir(), 'cad-exec-')), approve?: ExecutorOptions['approve']) {
  const ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs, approve, deadlineMs: (t) => (t === 'extrude' ? deadlineMs : 5000) });
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
    const pre = await ex.inspect('doc-1');
    const out = await ex.execute(EXTRUDE, { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('timeout');
    expect(out.record.targetDocument).toMatchObject({ revisionBefore: 2, revisionAfter: 2 });
    expect(out.record.validationResult.restore.result.features).toEqual(['p1', 's1']);
    expect(out.record.validationResult.restore).toEqual(pre);
    expect(out.record.cadCommand).toEqual({ call: 'create_feature', params: { sketch: 's1', depth: mm(10) } });
    expect(await features(ex)).toEqual(['p1', 's1']);
  });

  it('times out an operation whose inspection hangs, records it and restores the checkpoint', async () => {
    const { ex } = await start(['--hang-inspect', 'extrude'], 300);
    const out = await ex.execute(EXTRUDE, { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('timeout');
    expect(out.record.targetDocument).toMatchObject({ revisionBefore: 2, revisionAfter: 2 });
    expect(await features(ex)).toEqual(['p1', 's1']);
  });

  it('cancels a running operation, records it and restores the checkpoint', async () => {
    const { ex } = await start(['--hang', 'extrude']);
    const pre = await ex.inspect('doc-1');
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 200);
    const out = await ex.execute(EXTRUDE, { requestId: 'r1', signal: abort.signal });
    expect(out.status).toBe('cancelled');
    expect(out.record.errorDetails.code).toBe('cancelled');
    expect(out.record.targetDocument).toMatchObject({ revisionBefore: 2, revisionAfter: 2 });
    expect(out.record.validationResult.restore).toEqual(pre);
    expect(out.record.cadCommand).not.toBeNull();
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

  it('records operations left pending or awaiting approval when the server stopped', async () => {
    const { ex, dir } = await start();
    for (const [id, status] of [['left-1', 'pending'], ['left-2', 'awaiting_approval']]) {
      ex.store.insertOperation({ rowId: id, opId: id, docId: 'doc-1' }, 'r1', EXTRUDE);
      ex.store.setStatus(id, status);
    }
    ex.close();
    const again = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir });
    opened.push(again);
    for (const id of ['left-1', 'left-2']) {
      const rec = again.store.record(id);
      expect(rec.status).toBe('cancelled');
      expect(rec.errorDetails.code).toBe('cancelled');
    }
  });

  it('records an operation whose worker had stopped while idle, then keeps working', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cad-exec-'));
    const ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir });
    opened.push(ex);
    const proc = (ex as any).worker.proc;
    await new Promise((done) => { proc.once('exit', done); proc.kill(); });
    const out = await ex.execute(PART[0], { requestId: 'r1' });
    expect(out.status).toBe('failed');
    expect(out.record.errorDetails.code).toBe('worker_crashed');
    expect((await ex.execute(PART[0], { requestId: 'r1' })).status).toBe('succeeded');
  });

  it('runs concurrent requests one at a time, each with its record', async () => {
    const { ex } = await start();
    const outs = await Promise.all([1, 2, 3].map((n) => ex.execute(op(`c${n}`, 'sketch_circle', { plane: 'top', diameter: mm(n) }), { requestId: 'r1' })));
    expect(outs.map((o) => o.status)).toEqual(['succeeded', 'succeeded', 'succeeded']);
    expect(outs.map((o) => o.record.targetDocument.revisionAfter)).toEqual([3, 4, 5]);
  });

  it('ends an operation storage_error when its record cannot be written, and refuses the next', async () => {
    const { ex } = await start();
    ex.store.commit = () => { throw new Error('disk full'); };
    const out = await ex.execute(op('c1', 'sketch_circle', { plane: 'top', diameter: mm(1) }), { requestId: 'r1' });
    expect(out).toMatchObject({ status: 'failed', record: null, error: { code: 'storage_error' } });
    const next = await ex.execute(op('c2', 'sketch_circle', { plane: 'top', diameter: mm(2) }), { requestId: 'r1' });
    expect(next).toMatchObject({ status: 'failed', record: null, error: { code: 'storage_error' } });
  });

  it('denies a consequential operation when nobody approves it', async () => {
    const { ex } = await start();
    const out = await ex.execute(MODIFY, { requestId: 'r1' });
    expect(out.status).toBe('cancelled');
    expect(out.record.errorDetails.code).toBe('approval_denied');
    expect(out.record.approval).toEqual({ required: true, decision: 'denied' });
  });

  it('runs a consequential operation only when approved, and records any other answer as denied', async () => {
    const answers = [async () => undefined, async () => 'maybe', async () => { throw new Error('ui closed'); }] as unknown as Array<ExecutorOptions['approve']>;
    for (const approve of answers) {
      const { ex } = await start([], 5000, undefined, approve);
      const out = await ex.execute(MODIFY, { requestId: 'r1' });
      expect(out.status).toBe('cancelled');
      expect(out.record.errorDetails.code).toBe('approval_denied');
      expect(out.record.approval).toEqual({ required: true, decision: 'denied' });
    }
    const { ex } = await start([], 5000, undefined, async () => 'approved');
    const out = await ex.execute(MODIFY, { requestId: 'r1' });
    expect(out.status).toBe('succeeded');
    expect(out.record.approval).toEqual({ required: true, decision: 'approved' });
  });

  it('cancels an operation waiting for approval, with a record', async () => {
    const { ex } = await start([], 5000, undefined, () => new Promise(() => {}));
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 100);
    const out = await ex.execute(MODIFY, { requestId: 'r1', signal: abort.signal });
    expect(out.status).toBe('cancelled');
    expect(out.record.errorDetails.code).toBe('cancelled');
  });

  it('fails verification and restores when a feature leaves no single valid solid', async () => {
    const { ex } = await start(KERNEL);
    expect((await ex.execute(EXTRUDE, { requestId: 'r1' })).status).toBe('succeeded');
    const rev = ex.store.document('doc-1')!.revision;
    expect((await ex.execute(op('s2', 'sketch_circle', { plane: 'top', center: { x: mm(200), y: mm(0) }, diameter: mm(10) }), { requestId: 'r1' })).status).toBe('succeeded');
    const two = await ex.execute(op('e2', 'extrude', { sketch: 's2', depth: mm(5) }), { requestId: 'r1' });
    expect(two.status).toBe('failed');
    expect(two.record.errorDetails.code).toBe('verification_failed');
    expect(two.record.validationResult.inspection.counts.solids).toBe(2);
    const hole = await ex.execute(op('h1', 'hole', { diameter: mm(6), positions: [{ x: mm(500), y: mm(500) }], through_all: true }), { requestId: 'r1' });
    expect(hole.record.errorDetails.code).toBe('verification_failed');
    expect(await features(ex)).toEqual(['p1', 's1', 'e1', 's2']);
    expect(ex.store.document('doc-1')!.revision).toBe(rev + 1);

    const bowtie = [[0, 0], [10, 10], [10, 0], [0, 10]].map(([x, y]) => ({ x: mm(x), y: mm(y) }));
    for (const o of [op('b1', 'new_part', { name: 'bow' }), op('b2', 'sketch_polyline', { plane: 'top', points: bowtie })]) {
      expect((await ex.execute(on('bow', o), { requestId: 'r1' })).status).toBe('succeeded');
    }
    const bow = await ex.execute(on('bow', op('b3', 'extrude', { sketch: 'b2', depth: mm(5) })), { requestId: 'r1' });
    expect(bow.status).toBe('failed');
    expect(bow.record.errorDetails.code).toBe('verification_failed');
    expect(bow.record.targetDocument.revisionAfter).toBe(bow.record.targetDocument.revisionBefore);
  });

  it('previews a kernel part as a GLB and refuses a document it does not hold', async () => {
    const { ex } = await start(KERNEL);
    expect((await ex.execute(EXTRUDE, { requestId: 'r1' })).status).toBe('succeeded');
    const out = await ex.preview('doc-1');
    expect(out.status).toBe('succeeded');
    expect(out.glb!.subarray(0, 4).toString('latin1')).toBe('glTF');
    expect(out.glb!.readUInt32LE(8)).toBe(out.glb!.length);
    const unknown = await ex.preview('nope');
    expect(unknown).toMatchObject({ status: 'failed', error: { code: 'precondition_failed' } });
  });

  it('views a document: features from the adapter inspect, volume and bounding box from the last record', async () => {
    const { ex } = await start(KERNEL);
    const done = await ex.execute(EXTRUDE, { requestId: 'r1' });
    const out = await ex.view('doc-1');
    expect(out.status).toBe('succeeded');
    expect(out.view!.features).toEqual([{ id: 'p1', type: 'new_part' }, { id: 's1', type: 'sketch_rectangle' }, { id: 'e1', type: 'extrude' }]);
    expect(out.view!.inspection).toEqual(done.record.validationResult.inspection);
    expect(out.view!.inspection!.volume_mm3).toBeCloseTo(40 * 20 * 10, 6);
    expect(out.view!.revision).toBe(3);
    expect(out.view!.recordOperation).toBe(done.operationId);
    expect(await ex.view('nope')).toMatchObject({ status: 'failed', error: { code: 'precondition_failed' } });
  });

  it('fails an export reported without a file, and keeps the measurement of a failed export', async () => {
    const { ex } = await start(KERNEL);
    expect((await ex.execute(EXTRUDE, { requestId: 'r1' })).status).toBe('succeeded');
    const worker = (ex as any).worker;
    const real = worker.request.bind(worker);
    let reply: any;
    worker.request = (msg: any, ...rest: any[]) => (msg.kind === 'op' && msg.operation.type === 'export' ? Promise.resolve(reply) : real(msg, ...rest));
    reply = { kind: 'result', call: 'export_document', status: 'succeeded', result: { artifact: 'x1' }, verification: null, error: null };
    const fileless = await ex.execute(op('x1', 'export', { format: 'step' }), { requestId: 'r1' });
    expect(fileless.status).toBe('failed');
    expect(fileless.record.errorDetails.code).toBe('verification_failed');
    expect(fileless.record.artifactReferences).toEqual([]);
    const measured = { valid: true, volume_mm3: 1, bbox_mm: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }, counts: { solids: 1, faces: 6, edges: 12 } };
    reply = { kind: 'result', call: 'export_document', status: 'failed', result: null, verification: measured, error: { code: 'verification_failed', message: 'the re-imported step differs from the part' } };
    const failed = await ex.execute(op('x2', 'export', { format: 'step' }), { requestId: 'r1' });
    expect(failed.record.validationResult.export).toEqual(measured);
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
    const data = readFileSync(bad);
    ex.store.addArtifact({ id: 'bad', kind: 'step', path: bad, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length });
    const copy = (artifact: string) => ({ ...op('i1', 'import', { artifact }), target: { document: 'doc-2' } });
    const refused = await ex.execute(copy('bad'), { requestId: 'r1' });
    expect(refused.status).toBe('failed');
    expect(refused.record.errorDetails.code).toBe('kernel_error');
    expect(ex.store.document('doc-2')).toBeUndefined();

    const before = (await ex.health()).ops;
    const unknown = await ex.execute(copy('nope'), { requestId: 'r1' });
    expect(unknown.record.errorDetails.code).toBe('precondition_failed');
    appendFileSync(file.path, '\n');
    const tampered = await ex.execute(copy(ref.id), { requestId: 'r1' });
    expect(tampered.record.errorDetails.code).toBe('precondition_failed');
    expect(tampered.record.errorDetails.message).toContain('changed');
    expect((await ex.health()).ops).toBe(before);
    expect(ex.store.document('doc-2')).toBeUndefined();
  });

  it('keeps every roadmap record field and sends the kernel millimetres', async () => {
    const { ex } = await start();
    const out = await ex.execute(op('s2', 'sketch_circle', { plane: 'top', diameter: { value: 1, unit: 'in' } }), { requestId: 'r1' });
    expect(out.status).toBe('succeeded');
    for (const field of ['requestedOperation', 'targetDocument', 'cadCommand', 'executionResult', 'validationResult', 'artifactReferences']) {
      expect(out.record[field], field).toBeTruthy();
    }
    expect(out.record.errorDetails).toBeNull();
    expect(Date.parse(out.record.executionResult.ended)).toBeGreaterThanOrEqual(Date.parse(out.record.executionResult.started));
    expect(out.record.cadCommand).toEqual({ call: 'create_sketch', params: { plane: 'top', diameter: { value: 25.4, unit: 'mm' } } });
    expect(out.record.targetDocument).toMatchObject({ id: 'doc-1', revisionBefore: 2, revisionAfter: 3 });
    expect(out.record.validationResult.inspection).not.toBeNull();
  });
});
