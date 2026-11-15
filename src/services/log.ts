import { appendFileSync } from 'node:fs';

// Structured log (L8 T3): one JSON line per event. Model keys never reach it: key shapes and the values of the key
// variables are replaced before the line is written.
const KEY = /sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}/g;

export function log(file: string, event: string, fields: object) {
  let line = JSON.stringify({ ts: new Date().toISOString(), event, ...fields }).replace(KEY, '[redacted]');
  for (const k of [process.env.DEEPSEEK_API_KEY, process.env.GEMINI_API_KEY]) if (k && k.length >= 8) line = line.split(k).join('[redacted]');
  appendFileSync(file, `${line}\n`);
}
