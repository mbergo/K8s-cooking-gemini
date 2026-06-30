import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  X, 
  HelpCircle, 
  Brain, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  CircleDot, 
  PhoneOff, 
  CornerDownLeft 
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  thinking?: boolean;
}

interface GeminiCoPilotProps {
  onClose: () => void;
}

export const GeminiCoPilot: React.FC<GeminiCoPilotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello Marcus! I am your **Gemini AI SRE & AI Compute Co-Pilot**, configured specifically for your upcoming Airbnb interview. 

Ask me any deep systems, networking, scheduling, or SRE debugging questions. Here are a few recommended topics we can discuss:
* **How does vLLM’s Paged Attention optimize GPU memory (VRAM)?**
* **Explain how Karpenter handles multi-tenant GPU node provisioning.**
* **What are the primary differences between a CUDA Out of Memory error and a Linux OOMKilled event?**
* **How does GPUDirect RDMA or NVLink bypass the CPU during training?**`
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<'LITE' | 'LOW' | 'HIGH'>('LOW');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio Transcription States
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live Voice Call Mode States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Initializing voice session...');
  const [voiceTranscripts, setVoiceTranscripts] = useState<{ sender: 'User' | 'Gemini'; text: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const outAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, voiceTranscripts]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    if (!textToSend) setInput('');

    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages as any);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.slice(1), // Omit the system greeting for cleaner history
          thinkingLevel
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with the co-pilot.');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.content,
          model: data.model,
          thinking: data.thinking
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message || 'Something went wrong.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Audio Transcription Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64data, mimeType: 'audio/webm' }),
            });
            const data = await res.json();
            if (data.text) {
              setInput(prev => prev ? prev + ' ' + data.text : data.text);
            }
          } catch (err) {
            console.error("Transcription error:", err);
          } finally {
            setIsTranscribing(false);
          }
        };
        
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecordingMic(true);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone access is required for audio transcription.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      setIsRecordingMic(false);
    }
  };

  // Live Voice API Handlers (gemini-3.1-flash-live-preview over WebSocket)
  const toggleVoiceMode = async () => {
    if (isVoiceMode) {
      cleanupVoice();
      setIsVoiceMode(false);
    } else {
      setIsVoiceMode(true);
      setVoiceTranscripts([]);
      await startVoiceSession();
    }
  };

  const startVoiceSession = async () => {
    setVoiceConnected(false);
    setVoiceStatus('Establishing WebSocket with Gemini Live...');
    
    try {
      // Create output audio context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const outAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      outAudioCtxRef.current = outAudioCtx;
      nextStartTimeRef.current = outAudioCtx.currentTime;

      // Connect standard WebSocket
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
            // Stop current playback, reset queue
            nextStartTimeRef.current = outAudioCtx.currentTime;
          }

          if (parsed.audio) {
            playAudioChunk(parsed.audio);
          }

          if (parsed.text) {
            // Log real-time transcript
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
      
      // Captured mono 16kHz PCM
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const float32Data = e.inputBuffer.getChannelData(0);
        
        // Convert to 16-bit PCM little endian
        const buffer = new ArrayBuffer(float32Data.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Data.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Data[i]));
          const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
          view.setInt16(i * 2, intVal, true); // true = little-endian
        }

        // Base64 encode and send
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

      // Convert 16-bit Int PCM back to Float32
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

  const clearHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: `History cleared. I'm ready for another deep-dive question!`
      }
    ]);
  };

  const suggestions = [
    "Explain NVLink vs PCIe Gen5 bottlenecks.",
    "Draft a postmortem for a CoreDNS crash causing GPU idle time.",
    "Give me 3 Senior Staff questions on Karpenter autoscaling.",
    "How does a Service Mesh like Istio impact NCCL throughput?"
  ];

  return (
    <aside className="w-full lg:w-100 border-l border-[#2e354f]/50 bg-[#0c0e17] flex flex-col h-[calc(100vh-73px)] sticky top-[73px] shadow-2xl z-20">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#2e354f]/30 flex items-center justify-between bg-[#111322]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h3 className="font-display font-bold text-white text-sm">Gemini Compute Co-Pilot</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Real-time Voice Conversations Button (Live API) */}
          <button
            onClick={toggleVoiceMode}
            title={isVoiceMode ? "Switch to Text Mode" : "Start Live Voice Call"}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-bold ${
              isVoiceMode 
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
                : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:text-white'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{isVoiceMode ? 'Voice: Live' : 'Voice Call'}</span>
          </button>

          <button
            onClick={clearHistory}
            title="Clear chat history"
            className="p-1.5 rounded-md hover:bg-[#1f233b] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1f233b] text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isVoiceMode ? (
        <>
          {/* Model Selection and Thinking Mode */}
          <div className="p-3 border-b border-[#2e354f]/30 bg-[#0d0f1c] flex items-center justify-between text-[11px] font-sans">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Orchestrator Mode</span>
            <div className="flex gap-1 bg-[#141727] p-1 rounded-lg border border-[#2e354f]/40">
              <button
                onClick={() => setThinkingLevel('LITE')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  thinkingLevel === 'LITE'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Fast response with gemini-3.1-flash-lite"
              >
                Lite
              </button>
              <button
                onClick={() => setThinkingLevel('LOW')}
                className={`px-2 py-1 rounded-md font-bold transition-all ${
                  thinkingLevel === 'LOW'
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Balanced intelligence with gemini-3.5-flash"
              >
                Balanced
              </button>
              <button
                onClick={() => setThinkingLevel('HIGH')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                  thinkingLevel === 'HIGH'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black shadow-md shadow-violet-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Deep system reasoning with gemini-3.1-pro-preview with HIGH Thinking Mode"
              >
                <Brain className="h-3 w-3 text-violet-300" />
                Thinking
              </button>
            </div>
          </div>

          {/* Messages Window */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-br-none ml-auto shadow-md shadow-violet-600/10'
                    : 'bg-[#141727] text-slate-300 rounded-bl-none border border-[#2e354f]/30'
                } animate-fade-in`}
              >
                {msg.thinking && msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 text-[9px] text-violet-400 font-bold tracking-wider mb-2 uppercase font-mono border-b border-[#2e354f]/25 pb-1">
                    <Brain className="h-3 w-3 animate-pulse" />
                    High Thinking Process Executed
                  </div>
                )}
                <div className="text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>
                {msg.model && (
                  <span className="text-[9px] text-slate-500 font-mono mt-2 self-end uppercase">
                    via {msg.model.replace('models/', '')}
                  </span>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-[#141727]/80 rounded-2xl p-3.5 max-w-[80%] border border-[#2e354f]/30 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                <span>Co-Pilot is engineering an answer...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions List */}
          {messages.length === 1 && (
            <div className="p-3 bg-[#0a0c14] border-t border-[#1a1c2a]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 font-sans">
                <HelpCircle className="h-3.5 w-3.5 text-violet-400" /> Suggested Doubts &amp; Scenarios
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 text-left px-2.5 py-2 rounded-xl bg-[#111322] hover:bg-[#1a1e35] border border-[#2e354f]/30 transition-all font-sans"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 border-t border-[#2e354f]/30 bg-[#0c0e17] space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#141727] border border-[#2e354f]/50 rounded-xl px-3 py-2.5 flex items-center gap-2 focus-within:border-violet-500/80 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={
                    isTranscribing 
                      ? "Transcribing audio..." 
                      : "Ask about vLLM, Karpenter, CUDA, OOM..."
                  }
                  disabled={isTranscribing}
                  className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
                />

                {/* Microphone / Audio Transcription Trigger */}
                <button
                  type="button"
                  onClick={isRecordingMic ? stopRecording : startRecording}
                  title={isRecordingMic ? "Stop recording & transcribe" : "Record audio doubt & transcribe"}
                  className={`p-1.5 rounded-lg transition-all ${
                    isRecordingMic 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {isRecordingMic ? (
                    <CircleDot className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              </div>

              <button
                onClick={() => handleSend()}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl p-2.5 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/20 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            {/* Action Feedback Subline */}
            {isRecordingMic && (
              <span className="text-[9px] text-rose-400 font-mono flex items-center gap-1 px-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                Recording continuous audio query... Press again to transcribe.
              </span>
            )}
            {isTranscribing && (
              <span className="text-[9px] text-indigo-400 font-mono flex items-center gap-1 px-1">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Orchestrating high-precision translation via gemini-3.5-flash...
              </span>
            )}
          </div>
        </>
      ) : (
        /* Immersive Live Voice Session Interface (Live API) */
        <div className="flex-1 flex flex-col justify-between bg-[#080911] p-6 text-center space-y-6">
          <div className="space-y-3">
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              Gemini Live (gemini-3.1-flash-live-preview)
            </span>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Connect to our live voice channel. Speak directly into your microphone to resolve doubts synchronously with zero-latency audio response.
            </p>
          </div>

          {/* Voice Waves / Visualization Avatar */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all ${
              voiceConnected 
                ? 'bg-emerald-500/10 border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/20' 
                : 'bg-indigo-500/10 border-2 border-indigo-500/20'
            }`}>
              {/* Pulsing waves */}
              {voiceConnected && (
                <>
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping scale-150 opacity-40"></div>
                  <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-pulse scale-125"></div>
                </>
              )}
              <Volume2 className={`h-10 w-10 ${voiceConnected ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
            </div>
            
            <div className="mt-4 space-y-1">
              <span className="text-xs font-bold text-white block">
                {voiceConnected ? 'Live Channel Active' : 'Connecting to Live Session'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block max-w-[240px] truncate">
                {voiceStatus}
              </span>
            </div>
          </div>

          {/* Live Transcript Stream Panel */}
          <div className="flex-1 bg-black/40 border border-[#2e354f]/25 rounded-2xl p-4 text-left space-y-3 overflow-y-auto max-h-[220px]">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block border-b border-[#2e354f]/15 pb-1">
              Real-time Conversation Stream
            </span>
            {voiceTranscripts.length > 0 ? (
              <div className="space-y-2">
                {voiceTranscripts.map((t, idx) => (
                  <div key={idx} className="text-xs leading-relaxed">
                    <span className={`font-bold mr-1 ${t.sender === 'User' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {t.sender}:
                    </span>
                    <span className="text-slate-300">{t.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 block italic pt-2">
                Say "hello" or ask a doubt to initialize voice transcripts...
              </span>
            )}
          </div>

          {/* Voice Session Actions */}
          <div className="flex justify-center gap-3">
            <button
              onClick={toggleVoiceMode}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <PhoneOff className="h-4 w-4" /> Disconnect Call
            </button>
            <button
              onClick={() => {
                cleanupVoice();
                startVoiceSession();
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Reconnect / Reset call"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
