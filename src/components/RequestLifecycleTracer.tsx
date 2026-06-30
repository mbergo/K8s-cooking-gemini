import React, { useState } from 'react';
import { LIFECYCLE_STEPS, LifecycleStep } from '../types';
import { Play, RotateCcw, Activity, Shield, Zap, Cpu, Network, Server, HardDrive, CheckCircle, AlertTriangle } from 'lucide-react';

export const RequestLifecycleTracer: React.FC = () => {
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [intervalId, setIntervalId] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("Pet-friendly beach house in Rio with fast Wi-Fi");

  const steps: any[] = [
    {
      step: 1,
      name: 'User Search Request Ingress',
      component: 'Global Load Balancer (Cloud CDN)',
      layer: 'Network & Gateway',
      description: 'The user enters their prompt: "Pet-friendly beach house in Rio with fast Wi-Fi."',
      whatHappens: 'The Global Load Balancer receives the HTTPS request at the edge. It routes the packet to the nearest active cloud region based on latency and health checks.',
      failureRisk: 'Edge DNS outages or DDoS flood saturating boundary routers.',
      observabilityTip: 'Monitor Edge RTT (Round Trip Time) and HTTP Ingress request rates.'
    },
    {
      step: 2,
      name: 'Ingress Decryption & Authentication',
      component: 'API Gateway & Kubernetes Ingress',
      layer: 'Network & Gateway',
      description: 'Terminates TLS, validates user session, and inspects rate limits.',
      whatHappens: 'The API Gateway decrypts the SSL packet. It validates the user\'s OAuth JWT token against the authentication provider, enforces user-level API rate limits, and routes the JSON request to the recommendation orchestrator.',
      failureRisk: 'Auth server latency causing requests to pile up, or misconfigured rate-limiting leading to false HTTP 429 errors.',
      observabilityTip: 'Measure JWT verification latency and Gateway rate-limit block count.'
    },
    {
      step: 3,
      name: 'Service Discovery Resolution',
      component: 'CoreDNS & kube-proxy',
      layer: 'Kubernetes Control Plane',
      description: 'Resolves internal service cluster.local names to virtual IP addresses.',
      whatHappens: 'The Orchestrator requests connection to the Vector Database and LLM Gateway. CoreDNS translates the virtual service names into actual pod IP addresses using internal DNS records.',
      failureRisk: 'DNS loop detection causing timeouts, CoreDNS replica starvation, or kube-proxy routing rules out of sync.',
      observabilityTip: 'Monitor coredns_dns_request_duration_seconds and packet loss rates.'
    },
    {
      step: 4,
      name: 'Semantic Cache Inspection',
      component: 'Semantic Cache (Redis Cluster)',
      layer: 'AI serving',
      description: 'Checks if an identical or semantically similar query was processed recently.',
      whatHappens: 'The query is embedded locally and compared against cached queries. If similarity is >95%, it bypasses model execution entirely and returns the cached list of beach houses instantly.',
      failureRisk: 'Cache exhaustion or stale listing inventory causing "ghost listings" to be recommended.',
      observabilityTip: 'Track Cache Hit Ratio (%) and Redis command response times (p99 < 1ms).'
    },
    {
      step: 5,
      name: 'Vector Search Context Retrieval',
      component: 'Vector DB (Qdrant/Milvus)',
      layer: 'AI serving',
      description: 'Queries high-dimensional spaces to find listings matched by semantic meaning.',
      whatHappens: 'Executes an HNSW (Hierarchical Navigable Small World) index search. It retrieves actual Rio beach houses matching "beachfront," "pets allowed," and "fast internet" reviews.',
      failureRisk: 'Index fragmentation on the vector database leading to high query latency or recall drop.',
      observabilityTip: 'Measure query latency (ms) and document recall count per search.'
    },
    {
      step: 6,
      name: 'Prompt Building & Context injection',
      component: 'Orchestration Engine',
      layer: 'AI serving',
      description: 'Assembles the raw prompt alongside retrieved listing data and system rules.',
      whatHappens: 'Injects the retrieved beach house listing descriptions directly into the LLM system prompt template, instructing the model to rank and format the response professionally.',
      failureRisk: 'Context window overflow if too many listings are retrieved; high token cost.',
      observabilityTip: 'Track total context tokens per prompt (typically kept <8k for speed).'
    },
    {
      step: 7,
      name: 'Continuous Batching & Queue scheduling',
      component: 'LLM Gateway & vLLM Serving',
      layer: 'AI serving',
      description: 'Queues the prompt and schedules it for active batch execution.',
      whatHappens: 'The LLM Gateway schedules the request. vLLM merges this prompt with other active queries on the fly (Continuous Batching), ensuring the GPU remains fully occupied.',
      failureRisk: 'Gateway queue timeouts under high concurrency spikes.',
      observabilityTip: 'Monitor Queue Depth, active batch size, and Time to First Token (TTFT).'
    },
    {
      step: 8,
      name: 'Extended Resource Validation',
      component: 'NVIDIA Device Plugin & Operator',
      layer: 'Kubernetes Control Plane',
      description: 'Confirms that the target container has allocated physical GPU slices.',
      whatHappens: 'The GPU Operator and Device Plugin expose physical GPUs as K8s schedulable units. When the container boots, it claims its isolated slice of hardware.',
      failureRisk: 'Missing container runtime device mappings (/dev/nvidia*) or mismatched driver versions.',
      observabilityTip: 'Audit DCGM healthy node count and device mounting events.'
    },
    {
      step: 9,
      name: 'CUDA Context Initialization',
      component: 'CUDA Driver',
      layer: 'GPU execution',
      description: 'Initializes a secure memory context on the target GPU.',
      whatHappens: 'The NVIDIA driver allocates physical VRAM memory blocks. It registers the CUDA context, allocating memory registers and preparing streams for asynchronous data transfers.',
      failureRisk: 'CUDA Out of Memory (OOM) if other processes are leaking physical VRAM allocations.',
      observabilityTip: 'Track total allocated VRAM vs free memory block fragmentation.'
    },
    {
      step: 10,
      name: 'Host-to-Device Memory Transfer',
      component: 'PCIe Gen5 Bus & DMA',
      layer: 'GPU execution',
      description: 'CPU copies the tokenized prompt tensors to GPU memory via DMA.',
      whatHappens: 'The CPU writes the prompt tokens to pinned memory and triggers the Direct Memory Access (DMA) engine. Tensors are streamed at 64GB/s across the PCIe bus into GPU High-Bandwidth Memory (HBM).',
      failureRisk: 'PCIe bus saturation due to oversubscribed motherboards, causing CPU-to-GPU copy bottlenecks.',
      observabilityTip: 'Measure host-to-device bandwidth (GB/s) and PCIe error rates.'
    },
    {
      step: 11,
      name: 'Active Kernel Launching',
      component: 'Streaming Multiprocessors (SM)',
      layer: 'GPU execution',
      description: 'GPU thread schedulers group parallel threads into Warps for calculations.',
      whatHappens: 'The Warp Scheduler on each SM organizes 32 threads into a Warp. It schedules GEMM (General Matrix Multiply) operations, processing attention grids concurrently across hundreds of SMs.',
      failureRisk: 'Warp divergence or low SM occupancy resulting in poorly utilized silicon hardware.',
      observabilityTip: 'Monitor SM Occupancy (%) and active warp cycles via Nsight/DCGM.'
    },
    {
      step: 12,
      name: 'Dense Matrix Math Execution',
      component: 'NVIDIA Tensor Cores',
      layer: 'GPU execution',
      description: 'Tensor Cores execute mathematical operations inside the model layers.',
      WhatHappens: 'The physical Tensor Cores execute matrix multiplications in mixed-precision (BF16 or quantized FP8) in a single clock cycle, calculating probabilities for the next output token.',
      failureRisk: 'Silicon ECC memory errors, thermal throttling under heavy continuous load.',
      observabilityTip: 'Monitor hardware ECC error rates and core junction temperatures.'
    },
    {
      step: 13,
      name: 'Autoregressive Token Generation',
      component: 'vLLM Decoding Engine',
      layer: 'AI serving',
      description: 'Decodes highest probability tokens and stores KV parameters.',
      whatHappens: 'Predicts the first token (e.g. "Beach..."). It stores its Key and Value tensors inside the vLLM Paged Attention KV Cache, then autoregressively loops back to predict subsequent tokens without recalculation.',
      failureRisk: 'KV Cache fragmentation causing latency spikes (inter-token latency increase).',
      observabilityTip: 'Measure Inter-Token Latency (ITL) and KV Cache usage (%) dynamically.'
    },
    {
      step: 14,
      name: 'Streaming Response & Telemetry',
      component: 'OpenTelemetry, Prometheus & Kserve',
      layer: 'Metrics & Operations',
      description: 'Streams the response to the user while logging performance telemetry.',
      whatHappens: 'Sends generated tokens back to the user instantly over Server-Sent Events (SSE). Concurrently, DCGM metrics, tracing data, and cost attribution details are scraped by Prometheus and OpenTelemetry.',
      failureRisk: 'Connection termination, metric loss, or slow autoscaler reaction times.',
      observabilityTip: 'Track Tokens Per Second (TPS), active client connections, and scaling thresholds.'
    }
  ];

  const currentStep = steps[activeStepIdx];

  const handlePlayToggle = () => {
    if (isPlaying) {
      clearInterval(intervalId);
      setIsPlaying(false);
      setIntervalId(null);
    } else {
      setIsPlaying(true);
      const id = setInterval(() => {
        setActiveStepIdx((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(id);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2500);
      setIntervalId(id);
    }
  };

  const handleReset = () => {
    if (intervalId) clearInterval(intervalId);
    setIsPlaying(false);
    setIntervalId(null);
    setActiveStepIdx(0);
  };

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'Network & Gateway': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'Kubernetes Control Plane': return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      case 'Kubernetes Ingress': return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      case 'AI serving': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'GPU execution': return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
      case 'Metrics & Operations': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          End-to-End AI Request Lifecycle Tracer
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Trace the complete path of an Airbnb search query from the Edge CDN down to the physical CUDA registers and back.
        </p>
      </div>

      {/* Interactive Controller Bar */}
      <div className="rounded-xl border border-[#2e354f]/50 bg-[#111322] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Search Query:</span>
          <select
            value={selectedPrompt}
            onChange={(e) => setSelectedPrompt(e.target.value)}
            disabled={isPlaying}
            className="bg-[#0c0e17] border border-[#2e354f] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="Pet-friendly beach house in Rio with fast Wi-Fi">Airbnb: Pet-friendly beach house in Rio with fast Wi-Fi</option>
            <option value="Cozy cabin in Bariloche with a fireplace and lake view">Airbnb: Cozy cabin in Bariloche with a fireplace and lake view</option>
            <option value="Modern loft in Tokyo near Shibuya crossing">Airbnb: Modern loft in Tokyo near Shibuya crossing</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePlayToggle}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/10'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            {isPlaying ? 'Pause Auto-Trace' : 'Start Auto-Trace'}
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-[#1e2338] border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Progress step list (vertical timeline) */}
        <div className="lg:col-span-4 rounded-2xl border border-[#2e354f]/50 bg-[#0d0f1c] p-4 overflow-y-auto max-h-[500px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Pipeline Progress</h3>
          <div className="relative border-l-2 border-[#1c1f30] ml-4 space-y-4">
            {steps.map((s, idx) => {
              const isActive = activeStepIdx === idx;
              const isPast = activeStepIdx > idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isPlaying) handlePlayToggle();
                    setActiveStepIdx(idx);
                  }}
                  className="w-full text-left pl-6 relative block group"
                >
                  {/* Indicator Dot */}
                  <div className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-[9px] size-4 rounded-full border-2 transition-all ${
                    isActive
                      ? 'bg-violet-600 border-violet-500 scale-110 shadow-lg shadow-violet-500/30'
                      : isPast
                        ? 'bg-emerald-600 border-emerald-500'
                        : 'bg-[#0d0f1c] border-[#2e354f]'
                  }`} />

                  <div>
                    <span className={`text-[10px] font-mono font-bold ${
                      isActive ? 'text-violet-400' : isPast ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      Step {s.step}
                    </span>
                    <span className={`text-xs font-bold block truncate ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {s.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Step Details */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-[#2e354f] bg-[#111322] p-6 shadow-xl space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header Title with Layer Tag */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1e2338]">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block">Active Stage Step {currentStep.step}</span>
                  <h3 className="font-display font-extrabold text-white text-lg">
                    {currentStep.name}
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider font-mono ${getLayerColor(currentStep.layer)}`}>
                  {currentStep.layer}
                </span>
              </div>

              {/* Component In Charge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Responsible Component:</span>
                <span className="font-mono bg-[#0c0e17] px-2.5 py-1 border border-slate-800 rounded-md text-slate-200 font-bold">
                  {currentStep.component}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">What occurs at this step:</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {currentStep.description}
                </p>
                <div className="p-3 bg-[#0c0e17] border border-[#1e2338] rounded-xl text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {currentStep.whatHappens}
                </div>
              </div>

              {/* SRE Outage / Failure risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="p-3.5 bg-red-950/10 border border-red-500/10 rounded-xl space-y-1">
                  <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Failure Risk
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {currentStep.failureRisk}
                  </p>
                </div>

                <div className="p-3 bg-emerald-950/10 border border-emerald-500/10 rounded-xl space-y-1.5">
                  <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" /> SRE Observability Tip
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {currentStep.observabilityTip}
                  </p>
                </div>
              </div>
            </div>

            {/* Playback controls */}
            <div className="mt-6 pt-4 border-t border-[#1e2338] flex items-center justify-between">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Path
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveStepIdx(prev => Math.max(0, prev - 1))}
                  disabled={activeStepIdx === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-md disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setActiveStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
                  disabled={activeStepIdx === steps.length - 1}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-xs text-white rounded-md disabled:opacity-40 font-bold transition-all"
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
