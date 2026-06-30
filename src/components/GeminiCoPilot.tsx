import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, X, HelpCircle, Brain } from 'lucide-react';

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
  const [thinkingLevel, setThinkingLevel] = useState<'LOW' | 'HIGH'>('LOW');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
    <aside className="w-full lg:w-96 border-l border-[#2e354f] bg-[#0c0e17] flex flex-col h-[calc(100vh-73px)] sticky top-[73px]">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#2e354f] flex items-center justify-between bg-[#111322]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h3 className="font-display font-bold text-white text-sm">Gemini Compute Co-Pilot</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            title="Clear chat history"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Model Selection and Thinking Mode */}
      <div className="p-3 border-b border-[#2e354f] bg-[#0d0f1c] flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Reasoning Level:</span>
        <div className="flex gap-1 bg-[#141727] p-1 rounded-md border border-[#2e354f]">
          <button
            onClick={() => setThinkingLevel('LOW')}
            className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              thinkingLevel === 'LOW'
                ? 'bg-slate-800 text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Flash (Lite)
          </button>
          <button
            onClick={() => setThinkingLevel('HIGH')}
            className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
              thinkingLevel === 'HIGH'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Brain className="h-3 w-3" />
            High Thinking (Pro)
          </button>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] rounded-2xl p-3 ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-none ml-auto'
                : 'bg-[#141727] text-slate-300 rounded-bl-none border border-[#2e354f]'
            } animate-fade-in`}
          >
            {msg.thinking && msg.role === 'assistant' && (
              <div className="flex items-center gap-1 text-[10px] text-violet-400 font-bold tracking-wider mb-1.5 uppercase font-mono">
                <Brain className="h-3 w-3 animate-pulse" />
                Thinking Process Active
              </div>
            )}
            <div className="text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
              {msg.content}
            </div>
            {msg.model && (
              <span className="text-[9px] text-slate-500 font-mono mt-2 self-end">
                via {msg.model}
              </span>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#141727] rounded-2xl p-3 max-w-[70%] border border-[#2e354f] animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            <span>Co-Pilot is orchestrating an answer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions List */}
      {messages.length === 1 && (
        <div className="p-3 bg-[#0a0c14] border-t border-[#1a1c2a]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1 font-sans">
            <HelpCircle className="h-3.5 w-3.5 text-violet-400" /> Suggested Prompts
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-[11px] text-slate-400 hover:text-slate-200 text-left px-2 py-1.5 rounded bg-[#111322] hover:bg-[#1a1e35] border border-[#2e354f]/50 transition-all font-sans"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 border-t border-[#2e354f] bg-[#0c0e17] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about vLLM, NCCL, OOMKilled..."
          className="flex-1 bg-[#141727] border border-[#2e354f] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 font-sans"
        />
        <button
          onClick={() => handleSend()}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg p-2 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-600/20"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
};
