import React from 'react';
import { Tab } from '../types';
import { Sparkles, Terminal, Activity, Layers, Cpu, Compass, Calculator, BookOpen, HelpCircle, ArrowRight, ShieldCheck, Heart, Server, Zap } from 'lucide-react';

interface OverviewProps {
  setActiveTab: (tab: Tab) => void;
}

export const Overview: React.FC<OverviewProps> = ({ setActiveTab }) => {
  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-[#0c0e17] border border-violet-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full filter blur-2xl pointer-events-none" />
        <div className="relative z-1 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1 text-xs font-bold text-violet-300 mb-4 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-spin text-violet-400" />
            Airbnb AI Compute Masterclass Playbook
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            How to Ace the <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">Kubernetes AI Compute &amp; GPU Platform</span> Interview
          </h2>
          <p className="mt-4 text-slate-300 text-sm md:text-base leading-relaxed">
            Welcome, Marcus. This interactive platform is tailored specifically to your upcoming 
            <strong> Kubernetes Engineer (AI Compute)</strong> interview at <strong>Airbnb</strong>. It connects your exceptional 
            background as a <strong>Google Staff SRE (Borg / Scheduler internals)</strong> and <strong>Globo high-concurrency engineer</strong> 
            with modern GPU orchestration, vLLM serving, and low-latency AI platform operations.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('architecture')}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs px-5 py-3 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
            >
              Start Cluster Exploration <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className="flex items-center gap-2 rounded-lg bg-[#141727] text-slate-300 hover:text-white border border-[#2e354f] font-semibold text-xs px-5 py-3 hover:bg-[#1a1e35] transition-all cursor-pointer"
            >
              Go to Interview Q&amp;A
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Profile Match */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#111322] border border-[#2e354f]/60 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-white text-base mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Marcus&apos;s Strategic Interview Advantage
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hiring managers at Airbnb want individuals who can "go beyond naming tools and clearly explain how systems work together." Your background provides the perfect answers:
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Google Borg/Scheduler Depth:</strong> You understand scheduling queues, filtering algorithms, and score scoring normalization in your sleep—concepts other engineers only memorize.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Globo &amp; Scale:</strong> Proven ability to operate extreme-scale distributed systems under load, keeping latency low and operations automated.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>AI Platform Stack:</strong> Hands-on familiarity with serving systems like Triton, KServe, and LLM gateways across multiple cloud environments.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 border-t border-[#1e2338] pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Target Level: <strong>Senior Staff / Principal</strong></span>
            <span className="text-emerald-400 font-semibold">100% Core Competency Match</span>
          </div>
        </div>

        {/* Airbnb AI Compute Key Challenges */}
        <div className="rounded-2xl bg-[#111322] border border-[#2e354f]/60 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-white text-base mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Airbnb-Scale Platform Constraints
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Airbnb operates a massive GPU fleet supporting search ranking, listing translation, fraud detection, and customer service. You will be evaluated on your ability to:
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300 list-disc pl-5">
              <li>Manage high-capacity multi-node GPU clusters (A100s, H100s) on AWS and GCP.</li>
              <li>Implement low-latency inference pipelines (continuous batching, speculative decoding).</li>
              <li>Isolate multi-tenant workloads while maintaining cost efficiency &amp; zero-VRAM leakage.</li>
              <li>Provide SRE diagnostics during production outages (CUDA OOM, storage throttling).</li>
            </ul>
          </div>
          <div className="mt-4 text-slate-400 text-xs italic flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-pink-500 fill-pink-500" />
            Designed for high performance.
          </div>
        </div>
      </div>

      {/* Navigation Cards Grid */}
      <div>
        <h3 className="font-display font-bold text-white text-lg mb-4">Masterclass Sections</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => setActiveTab('architecture')}
            className="group rounded-xl bg-[#111322] border border-[#2e354f]/50 hover:border-violet-500/50 p-5 cursor-pointer transition-all hover:translate-y-[-2px] flex flex-col justify-between"
          >
            <div>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg w-fit mb-3">
                <Server className="size-5" />
              </div>
              <h4 className="font-display text-md font-medium text-slate-100 mb-1">Architecture Visualizer</h4>
              <p className="text-xs text-slate-400">Interactive topology showing the Control Plane, Worker Nodes, and how they communicate.</p>
            </div>
            <div className="mt-4 flex items-center text-xs text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
              Explore topology <ArrowRight className="size-3 ml-1" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative clear-both overflow-visible" onClick={() => (window as any).setTab('scheduler')}>
            <div onClick={() => {}} className="cursor-pointer bg-[#141824] hover:bg-[#1a1f33] border border-slate-800 rounded-xl p-5 h-full flex flex-col justify-between transition-all hover:scale-[1.02]">
              <div>
                <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg w-fit mb-3">
                  <Cpu className="size-5" />
                </div>
                <h4 className="font-display text-md font-medium text-slate-100 mb-1">Scheduler Sandbox</h4>
                <p className="text-xs text-slate-400">Configure Pods and run scheduling cycles to see PreFilter, Filtering, and Scoring in action.</p>
              </div>
              <div className="mt-4 flex items-center text-xs text-blue-400 font-medium group-hover:translate-x-1 transition-all">
                Run scheduler simulations <ArrowRight className="size-3 ml-1" />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => setActiveTab('gpu-stack')}
            className="group rounded-xl bg-[#111322] border border-[#2e354f]/50 hover:border-pink-500/50 p-5 cursor-pointer transition-all hover:translate-y-[-2px] flex flex-col justify-between"
          >
            <div>
              <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg w-fit mb-3">
                <Layers className="size-5" />
              </div>
              <h4 className="font-display text-md font-medium text-slate-100 mb-1">GPU Execution Stack</h4>
              <p className="text-xs text-slate-400">Trace instructions from PyTorch down to CUDA Drivers, physical SMs, and Tensor Cores.</p>
            </div>
            <div className="mt-4 flex items-center text-xs text-pink-400 font-medium group-hover:translate-x-1 transition-transform">
              Examine silicon pathways <ArrowRight className="size-3 ml-1" />
            </div>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => setActiveTab('lifecycle')}
            className="group rounded-xl bg-[#111322] border border-slate-800 hover:border-violet-500/50 p-5 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-violet-950 text-violet-400"><Zap className="size-5" /></span>
            </div>
            <h4 className="font-display text-base font-medium mt-3 mb-1 text-slate-200">Request Lifecycle Tracer</h4>
            <p className="text-xs text-slate-400 mb-4">Trace the complete 25-step journey of an AI search request down to the hardware and back.</p>
            <span className="text-xs text-violet-400 flex items-center gap-1">Trace lifecycle <ArrowRight className="size-3" /></span>
          </div>

          {/* Card 5 */}
          <div
            onClick={() => setActiveTab('troubleshooting')}
            className="group cursor-pointer rounded-2xl bg-[#161a29] border border-[#232742] hover:border-emerald-500 p-5 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-terminal size-5"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" x2="20" y1="19" y2="19"></line></svg></span>
            </div>
            <h4 className="font-display text-base font-medium text-slate-100 mb-1">SRE Debug Terminal</h4>
            <p className="text-xs text-slate-400 mb-4">Troubleshoot real-world GPU incidents, inspect logs, and run simulated CLI diagnostics.</p>
            <span className="text-xs text-emerald-400 flex items-center gap-1">Launch terminal <ArrowRight className="size-3" /></span>
          </div>

          {/* Card 6 */}
          <div
            onClick={() => setActiveTab('calculator')}
            className="group rounded-xl bg-[#111322] border border-[#2e354f]/50 hover:border-amber-500/50 p-5 cursor-pointer transition-all hover:translate-y-[-2px] flex flex-col justify-between"
          >
            <div>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg w-fit mb-3">
                <Calculator className="size-5" />
              </div>
              <h4 className="font-display text-md font-medium text-slate-100 mb-1">VRAM &amp; Sizing Calculator</h4>
              <p className="text-xs text-slate-400">Calculate KV Cache memory consumption and determine Karpenter GPU scaling requirements.</p>
            </div>
            <div className="mt-4 flex items-center text-xs text-amber-400 font-medium group-hover:translate-x-1 transition-transform">
              Estimate parameters <ArrowRight className="size-3 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple wrapper helper to trigger parent setState since activeTab might change from window hook
const setActiveTab = (tab: Tab) => {
  const btn = document.getElementById(`tab-btn-${tab}`);
  if (btn) {
    btn.click();
  }
};
const window_custom = (window as any);
window_custom.setTab = setActiveTab;
