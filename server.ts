/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { mkdirSync, rmSync } from 'node:fs';
import { Executor, type Decision } from './src/services/cad/executor';
import { modelClient } from './src/services/model/modelClient';
import { agentRoutes } from './src/services/agent/routes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI client with official header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// L5 T7 council C5: the Gemini chat and generate routes and the template export routes were removed (human decision, 2026-11-12);
// the agent routes and the kernel export replace them. Gemini Live voice below stays.

// 3. WebSocket Server for Gemini Live API Voice Conversations (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/api/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Gemini Live voice bridge');

  if (!apiKey) {
    clientWs.send(JSON.stringify({
      error: 'GEMINI_API_KEY is not configured. Live audio streaming requires an API key in Secrets.',
      status: 'no_key',
    }));
    return;
  }

  let session: any = null;

  try {
    // Connect to gemini-3.8-live via @google/genai SDK
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'You are MechForge AI, an expert mechanical engineering voice copilot. You assist engineers in real-time with CAD modeling, geometric tolerances, parametric dimensions, FEA stress analysis, and manufacturing specifications. Keep verbal responses direct, precise, and professional.',
      },
      callbacks: {
        onmessage: (message: any) => {
          // Send 24kHz audio output chunks from model back to client browser
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  audio: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                }));
              }
            }
          }
          if (message.serverContent?.interrupted) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ status: 'session_closed' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
          }
        },
      },
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ status: 'connected', model: 'gemini-3.8-live' }));
    }

    clientWs.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.audio && session) {
          // Send 16kHz PCM audio chunk from mic to Gemini Live
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Error forwarding mic audio to Live API:', err);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch (e) {
          // Ignore close error
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to establish Gemini Live connection:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        error: `Could not connect to gemini-3.8-live: ${err?.message || 'Unknown error'}`,
      }));
    }
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  // The server owns the executor and the kernel worker (L5 T5); the agent reaches DeepSeek only through the model client.
  const dataDir = path.resolve(__dirname, process.env.CAD_DATA_DIR ?? 'data');
  if (process.env.CAD_DATA_FRESH) rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  let approve = (_op: any): Promise<Decision> => Promise.resolve('denied');
  const executor = await Executor.open({ dbPath: path.join(dataDir, 'cad.db'), dataDir, workerArgs: ['--adapter', 'kernel'], approve: (op) => approve(op) });
  const recordings = path.resolve(__dirname, 'src/services/agent/recordings') + path.sep;
  const mode = (process.env.MODEL_MODE ?? 'live') as 'live' | 'replay' | 'record';
  const agent = agentRoutes(executor, modelClient({ mode, recordings, spendFile: `${recordings}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY }));
  approve = agent.approve;
  app.use(agent.router);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MechForge AI Enterprise server running on port ${PORT}`);
  });
}

startServer();
