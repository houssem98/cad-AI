import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, adapter TEXT NOT NULL, revision INTEGER NOT NULL,
  checkpoint TEXT, state TEXT NOT NULL DEFAULT 'ok', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS operations (
  row_id TEXT PRIMARY KEY, op_id TEXT NOT NULL, request_id TEXT NOT NULL, document_id TEXT NOT NULL,
  seq INTEGER NOT NULL, envelope_json TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT, operation_row_id TEXT NOT NULL REFERENCES operations(row_id),
  document_id TEXT NOT NULL, revision_before INTEGER NOT NULL, revision_after INTEGER NOT NULL,
  command_json TEXT NOT NULL, result_json TEXT NOT NULL, validation_json TEXT NOT NULL, approval_json TEXT NOT NULL,
  error_json TEXT NOT NULL, artifacts_json TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, path TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, created_at TEXT NOT NULL);
`;

export interface Artifact { id: string; kind: string; path: string; sha256: string; bytes: number }

export interface OpRow { rowId: string; opId: string; docId: string }
export interface Doc { id: string; kind: string; adapter: string; revision: number; checkpoint: string | null; state: string }
export interface RecordInput {
  revisionBefore: number; revisionAfter: number; command: unknown; result: unknown; validation: unknown;
  approval: unknown; error: unknown; artifacts: unknown[]; started: string; ended: string;
}

export class CadStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL;' + SCHEMA);
  }

  document(id: string): Doc | undefined {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as Doc | undefined;
  }

  documents(): Doc[] {
    return this.db.prepare('SELECT * FROM documents').all() as unknown as Doc[];
  }

  setDocState(id: string, state: string) {
    this.db.prepare('UPDATE documents SET state = ? WHERE id = ?').run(state, id);
  }

  insertOperation(r: OpRow, requestId: string, envelope: unknown) {
    const { n } = this.db.prepare('SELECT COUNT(*) AS n FROM operations WHERE document_id = ?').get(r.docId) as { n: number };
    this.db.prepare('INSERT INTO operations (row_id, op_id, request_id, document_id, seq, envelope_json, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(r.rowId, r.opId, requestId, r.docId, n, JSON.stringify(envelope ?? null), 'pending');
  }

  setStatus(rowId: string, status: string) {
    this.db.prepare('UPDATE operations SET status = ? WHERE row_id = ?').run(status, rowId);
  }

  addArtifact(a: Artifact) {
    this.db.prepare('INSERT INTO artifacts (id, kind, path, sha256, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(a.id, a.kind, a.path, a.sha256, a.bytes, new Date().toISOString());
  }

  artifact(id: string): Artifact | undefined {
    return this.db.prepare('SELECT id, kind, path, sha256, bytes FROM artifacts WHERE id = ?').get(id) as unknown as Artifact | undefined;
  }

  hasSucceeded(docId: string, opId: string): boolean {
    return !!this.db.prepare("SELECT 1 FROM operations WHERE document_id = ? AND op_id = ? AND status = 'succeeded'").get(docId, opId);
  }

  hasSucceededType(docId: string, types: string[]): boolean {
    return !!this.db.prepare(`SELECT 1 FROM operations WHERE document_id = ? AND status = 'succeeded'
      AND json_extract(envelope_json, '$.type') IN (${types.map(() => '?').join(', ')})`).get(docId, ...types);
  }

  unfinished(): Array<OpRow & { status: string }> {
    return this.db.prepare(`SELECT row_id AS rowId, op_id AS opId, document_id AS docId, status FROM operations
      WHERE status IN ('pending', 'validated', 'awaiting_approval', 'running', 'inspecting')`).all() as unknown as Array<OpRow & { status: string }>;
  }

  // The document change, the record and the status land together or not at all.
  commit(row: OpRow, status: string, rec: RecordInput, doc?: Doc, files: Artifact[] = []) {
    this.db.exec('BEGIN');
    try {
      files.forEach((a) => this.addArtifact(a));
      if (doc) {
        this.db.prepare(`INSERT INTO documents (id, kind, adapter, revision, checkpoint, state, created_at) VALUES (?, ?, ?, ?, ?, 'ok', ?)
          ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, checkpoint = excluded.checkpoint, state = 'ok'`)
          .run(doc.id, doc.kind, doc.adapter, doc.revision, doc.checkpoint, rec.ended);
      }
      this.db.prepare(`INSERT INTO records (operation_row_id, document_id, revision_before, revision_after, command_json, result_json,
          validation_json, approval_json, error_json, artifacts_json, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(row.rowId, row.docId, rec.revisionBefore, rec.revisionAfter, JSON.stringify(rec.command ?? null), JSON.stringify(rec.result ?? null),
          JSON.stringify(rec.validation), JSON.stringify(rec.approval), JSON.stringify(rec.error ?? null), JSON.stringify(rec.artifacts), rec.started, rec.ended);
      this.setStatus(row.rowId, status);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  record(rowId: string): any {
    const r = this.db.prepare(`SELECT o.envelope_json, o.status, r.* FROM records r JOIN operations o ON o.row_id = r.operation_row_id
      WHERE r.operation_row_id = ? ORDER BY r.id DESC LIMIT 1`).get(rowId) as any;
    if (!r) return undefined;
    return {
      status: r.status,
      requestedOperation: JSON.parse(r.envelope_json),
      targetDocument: { id: r.document_id, revisionBefore: r.revision_before, revisionAfter: r.revision_after },
      cadCommand: JSON.parse(r.command_json),
      executionResult: JSON.parse(r.result_json),
      validationResult: JSON.parse(r.validation_json),
      errorDetails: JSON.parse(r.error_json),
      artifactReferences: JSON.parse(r.artifacts_json),
      approval: JSON.parse(r.approval_json),
    };
  }

  close() {
    this.db.close();
  }
}
