import express, { type Response } from 'express';
import { local, refuse } from '../agent/routes';
import type { KnowledgeBase } from './knowledge';

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const MAX_CHARS = 2_000_000;

// L7 T9: local documents in and cited answers out, for this machine only. Nothing here can start an operation.
export function knowledgeRoutes(kb: KnowledgeBase) {
  const router = express.Router();

  router.get('/api/knowledge', (req, res) => {
    if (!local(req)) return refuse(res);
    res.json(kb.sources());
  });

  router.post('/api/knowledge', (req, res) => {
    if (!local(req)) return refuse(res);
    const { source, text } = req.body ?? {};
    if (typeof source !== 'string') return fail(res, 400, 'validation_failed', 'source: the document\'s file name is required'); // never "undefined" (council S11)
    if (typeof text !== 'string' || !text.trim()) return fail(res, 400, 'validation_failed', 'text: the document\'s text is required');
    if (text.length > MAX_CHARS) return fail(res, 400, 'validation_failed', `text: at most ${MAX_CHARS} characters`);
    try {
      res.status(201).json({ source, chunks: kb.ingest(source, text).length });
    } catch (e) {
      fail(res, 400, 'validation_failed', (e as Error).message);
    }
  });

  router.post('/api/knowledge/ask', (req, res) => {
    if (!local(req)) return refuse(res);
    const question = req.body?.question;
    if (typeof question !== 'string' || !question.trim()) return fail(res, 400, 'validation_failed', 'question: required');
    res.json(kb.ask(question));
  });

  return router;
}
