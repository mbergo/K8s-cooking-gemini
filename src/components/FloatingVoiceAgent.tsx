import React, { useState, useRef, useEffect } from 'react';
import { Mic, PhoneOff, Radio, Volume2, Sparkles, X } from 'lucide-react';

export const FloatingVoiceAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Initializing voice session...');
  const [voiceTranscripts, setVoiceTranscripts] = useState<{ sender: 'User' | 'Gemini'; text: string }[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const outAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const toggleVoiceMode = async () => {
    if (isOpen) {
      cleanupVoice();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setVoiceTranscripts([]);
      await startVoiceSession();
    }
  };

  const startVoiceSession = async () => {
    setVoiceConnected(false);
    setVoiceStatus('Establishing WebSocket with Gemini Live...');
    
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const outAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      outAudioCtxRef.current = outAudioCtx;
      nextStartTimeRef.current = outAudioCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setVoiceConnected(true);
        setVoiceStatus('Connected. Starting microphone capture...');
        await startMicStreaming(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.error) {
            setVoiceStatus(`Error: ${parsed.error}`);
            return;
          }

          if (parsed.interrupted) {
            nextStartTimeRef.current = outAudioCtx.currentTime;
          }

          if (parsed.audio) {
            playAudioChunk(parsed.audio);
          }

          if (parsed.text) {
            setVoiceTranscripts(prev => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'Gemini') {
                return [...prev.slice(0, -1), { sender: 'Gemini', text: last.text + parsed.text }];
              } else {
                return [...prev, { sender: 'Gemini', text: parsed.text }];
              }
            });
            setVoiceStatus('Gemini is speaking...');
          }
        } catch (e) {
          console.error("Live audio event error:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("WS error:", err);
        setVoiceStatus('WebSocket connection failed.');
      };

      ws.onclose = () => {
        setVoiceConnected(false);
        setVoiceStatus('Voice session ended.');
      };

    } catch (err: any) {
      console.error(err);
      setVoiceStatus(`Failed: ${err.message || 'Unknown error'}`);
    }
  };

  const startMicStreaming = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const float32Data = e.inputBuffer.getChannelData(0);
        
        const buffer = new ArrayBuffer(float32Data.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Data.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Data[i]));
          const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
          view.setInt16(i * 2, intVal, true); 
        }

        const bytes = new Uint8Array(buffer);
        let binaryString = '';
        for (let i = 0; i < bytes.length; i++) {
          binaryString += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binaryString);

        ws.send(JSON.stringify({ audio: base64Audio }));
      };

      setVoiceStatus('Gemini Live active. Speak now!');
    } catch (err) {
      console.error("Mic streaming error:", err);
      setVoiceStatus('Microphone capture failed. Check permissions.');
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const outAudioCtx = outAudioCtxRef.current;
    if (!outAudioCtx) return;

    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const numSamples = len / 2;
      const float32Data = new Float32Array(numSamples);
      const int16View = new Int16Array(buffer);
      for (let i = 0; i < numSamples; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }

      const audioBuffer = outAudioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = outAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outAudioCtx.destination);

      const currentTime = outAudioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  const cleanupVoice = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch (e) {}
      micProcessorRef.current = null;
    }
    if (outAudioCtxRef.current) {
      try {
        outAudioCtxRef.current.close();
      } catch (e) {}
      outAudioCtxRef.current = null;
    }
    setVoiceConnected(false);
  };

  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-[#111322] border border-[#2e354f]/50 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[400px]">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-200 animate-pulse" />
              <h3 className="font-bold text-sm">K8s Tour Guide</h3>
            </div>
            <button onClick={toggleVoiceMode} className="text-white/70 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto flex flex-col">
            <div className="flex flex-col items-center justify-center py-4">
              <div className={`relative h-20 w-20 rounded-full flex items-center justify-center transition-all ${
                voiceConnected 
                  ? 'bg-emerald-500/10 border-2 border-emerald-400/40 shadow-xl shadow-emerald-500/20' 
                  : 'bg-indigo-500/10 border-2 border-indigo-500/20'
              }`}>
                {voiceConnected && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping scale-150 opacity-40"></div>
                    <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-pulse scale-125"></div>
                  </>
                )}
                <Volume2 className={`h-8 w-8 ${voiceConnected ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
              </div>
              <span className="text-xs font-bold text-white block mt-3">
                {voiceConnected ? 'Listening...' : 'Connecting...'}
              </span>
              <span className="text-[10px] text-slate-500 block text-center max-w-[200px] mt-1">
                {voiceStatus}
              </span>
            </div>

            <div className="flex-1 mt-4 space-y-2 bg-[#090b14] rounded-xl p-3 border border-[#2e354f]/30 max-h-32 overflow-y-auto text-xs">
              {voiceTranscripts.length === 0 ? (
                <span className="text-slate-500 italic block text-center mt-2">
                  Say "Hello, can you give me a tour?"
                </span>
              ) : (
                voiceTranscripts.map((t, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className={`font-bold mr-1 ${t.sender === 'User' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {t.sender}:
                    </span>
                    <span className="text-slate-300">{t.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="p-3 bg-[#0a0c14] border-t border-[#2e354f]/30 flex justify-center">
            <button
              onClick={toggleVoiceMode}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all w-full justify-center"
            >
              <PhoneOff className="h-4 w-4" /> End Call
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={toggleVoiceMode}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-600/30 flex items-center justify-center hover:scale-105 transition-transform group relative border border-violet-400/30"
          title="Talk to K8s Expert"
        >
          <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping opacity-60"></div>
          <Mic className="h-6 w-6 relative z-10 group-hover:text-emerald-300 transition-colors" />
        </button>
      )}
    </div>
  );
};
