/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  AlertCircle,
  Activity,
  Bot,
} from 'lucide-react';

interface LiveVoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCADCommand?: (command: string) => void;
}

export const LiveVoiceConversationModal: React.FC<LiveVoiceConversationModalProps> = ({
  isOpen,
  onClose,
  onCADCommand,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('Connecting to gemini-3.8-live...');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);

  isMutedRef.current = isMuted;

  // Convert Float32Array to 16-bit PCM Base64 string
  const pcmToBase64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play 24kHz audio chunk from Gemini Live
  const playAudioChunk = (base64Audio: string) => {
    if (!outputAudioCtxRef.current) return;
    const ctx = outputAudioCtxRef.current;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      setIsSpeaking(true);

      source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.05) {
          setIsSpeaking(false);
        }
      };
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Clean up on close
      cleanupSession();
      return;
    }

    startLiveSession();

    return () => {
      cleanupSession();
    };
  }, [isOpen]);

  const cleanupSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const startLiveSession = async () => {
    try {
      setStatusText('Initializing Gemini 3.8 Live audio pipeline...');

      // 1. Setup AudioContexts (16kHz in, 24kHz out per Gemini Live specification)
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      // 2. Setup WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatusText('Connected. Requesting mic access...');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.status === 'connected') {
            setIsConnected(true);
            setStatusText('gemini-3.8-live is listening. Speak your engineering prompt!');
          } else if (msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.interrupted) {
            // Clear scheduled queue on interruption
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setIsSpeaking(false);
          } else if (msg.error) {
            setStatusText(`Notice: ${msg.error}`);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Live Error:', e);
        setStatusText('Live API bridge unavailable. Operating in text copilot fallback.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatusText('Live voice session disconnected.');
      };

      // 3. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      // ScriptProcessorNode buffers audio in 2048 frame chunks
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Simple volume calculation for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;
        setAudioLevel(Math.min(100, Math.round(avg * 400)));

        // Send 16-bit PCM base64 string to server
        const base64 = pcmToBase64(inputData);
        wsRef.current.send(JSON.stringify({ audio: base64 }));
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err: any) {
      console.error('Failed to access microphone or connect:', err);
      setStatusText(`Microphone error: ${err.message || 'Permission denied'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#161616] border border-[#353535] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#292929] bg-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-steel-600/20 border border-steel-500/40 flex items-center justify-center text-steel-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-neutral-100 text-sm flex items-center gap-2">
                <span>Gemini Live Voice Copilot</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-tech font-bold uppercase bg-steel-500/20 text-steel-400 border border-steel-500/40">
                  gemini-3.8-live
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-tech">
                Full-duplex real-time engineering audio channel (16kHz in / 24kHz out)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visualizer Area */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Animated concentric rings */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Outer pulse */}
            <div
              className={`absolute inset-0 rounded-full border border-steel-500/30 transition-all duration-300 ${
                isSpeaking
                  ? 'scale-125 bg-steel-500/10 border-steel-400 animate-ping'
                  : audioLevel > 10
                  ? 'scale-110 bg-steel-500/5'
                  : 'scale-100'
              }`}
            />
            {/* Middle pulse */}
            <div
              className={`absolute inset-4 rounded-full border border-steel-500/40 transition-all duration-200 ${
                isSpeaking
                  ? 'bg-steel-500/20 border-steel-300'
                  : audioLevel > 20
                  ? 'bg-steel-600/15'
                  : 'bg-steel-950/40'
              }`}
            />
            {/* Center icon */}
            <div className="relative w-20 h-20 rounded-full bg-steel-600 flex items-center justify-center shadow-xl border border-steel-300/40">
              {isSpeaking ? (
                <Volume2 className="w-8 h-8 text-white animate-bounce" />
              ) : isMuted ? (
                <MicOff className="w-8 h-8 text-neutral-300" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="space-y-1">
            <div className="text-sm font-semibold text-neutral-200">
              {isSpeaking ? 'MechForge Copilot is speaking...' : isMuted ? 'Microphone Muted' : 'Listening...'}
            </div>
            <p className="text-xs text-neutral-400 font-tech max-w-sm">
              {statusText}
            </p>
          </div>

          {/* Suggested Spoken Phrases */}
          <div className="w-full bg-[#1d1d1d] border border-[#2e2e2e] rounded-xl p-3 text-left space-y-1.5 text-xs">
            <div className="text-[10px] uppercase font-tech text-neutral-400 font-semibold">
              Try saying naturally:
            </div>
            <div className="text-neutral-300 font-tech text-[11px] space-y-1">
              <div>"Increase base plate thickness to 15 millimeters."</div>
              <div>"What is the safety factor under a 3500 Newton vertical load?"</div>
              <div>"Change part material to Titanium Ti-6Al-4V."</div>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-[#292929] bg-[#121212] flex items-center justify-between">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              isMuted
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-[#232323] text-neutral-200 hover:text-white border border-[#3a3a3a]'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
