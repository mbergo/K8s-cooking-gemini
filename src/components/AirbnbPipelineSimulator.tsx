import React, { useState, useEffect } from 'react';
import { Cloud, Server, Database, Activity, Cpu, ArrowRight, Zap, Shield, Globe, Users, HardDrive, Network, Settings, Layers, PlayCircle, RefreshCw, HelpCircle } from 'lucide-react';

type CloudProvider = 'aws' | 'gcp' | 'azure';

interface TechStack {
  dns: string;
  gateway: string;
  k8s: string;
  streaming: string;
  cache: string;
  ml: string;
  db: string;
}

const STACKS: Record<CloudProvider, TechStack> = {
  aws: { dns: 'Route 53', gateway: 'API Gateway / ALB', k8s: 'Amazon EKS', streaming: 'Amazon MSK (Kafka)', cache: 'ElastiCache (Redis)', ml: 'SageMaker (p5.48xlarge)', db: 'DynamoDB / RDS' },
  gcp: { dns: 'Cloud DNS', gateway: 'Cloud Load Balancing', k8s: 'GKE (Autopilot)', streaming: 'Cloud Pub/Sub', cache: 'Memorystore', ml: 'Vertex AI (Cloud TPU/H100)', db: 'Cloud Spanner' },
  azure: { dns: 'Azure DNS', gateway: 'App Gateway', k8s: 'Azure Kubernetes Service', streaming: 'Event Hubs', cache: 'Azure Cache for Redis', ml: 'Azure ML (NDv5)', db: 'Cosmos DB' }
};

interface PipelineStep {
  id: string;
  title: string;
  icon: any;
  getComponent: (stack: TechStack) => string;
  what: string;
  why: string;
  how: string;
  underTheHood: string;
  cornerCases: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'user',
    title: 'Client Request',
    icon: Users,
    getComponent: () => 'Airbnb Mobile App / Web',
    what: 'User triggers a search query for "Beachfront in Rio" or views a property, initiating a dynamic pricing/ranking request.',
    why: 'Entry point for all user interactions. Needs to establish a secure, low-latency connection to the nearest edge location.',
    how: 'HTTPS REST or GraphQL POST request with JWT auth headers, TLS 1.3 encryption, and compressed JSON payloads.',
    underTheHood: 'The client resolves the domain via DNS, performs a TCP 3-way handshake, followed by TLS negotiation (Client Hello -> Server Hello).',
    cornerCases: 'DNS resolution failures on mobile networks, TLS handshake timeouts on high-latency 3G networks, or stale client-side caches.'
  },
  {
    id: 'edge',
    title: 'Edge & Routing',
    icon: Globe,
    getComponent: (stack) => stack.dns,
    what: 'Global Anycast DNS and Edge CDN routing user traffic to the geographically closest healthy cloud region.',
    why: 'Reduces time-to-first-byte (TTFB) by terminating TLS at the edge and protects against volumetric DDoS attacks.',
    how: 'BGP (Border Gateway Protocol) announces the same IP address from multiple global PoPs (Points of Presence).',
    underTheHood: 'Cloud provider WAF (Web Application Firewall) inspects incoming packets for SQLi/XSS signatures before forwarding to the regional Load Balancer.',
    cornerCases: 'WAF false positives blocking legitimate traffic, BGP route leaks causing traffic blackholing, or regional capacity exhaustion leading to noisy-neighbor lag.'
  },
  {
    id: 'gateway',
    title: 'API Gateway & Mesh',
    icon: Shield,
    getComponent: (stack) => stack.gateway,
    what: 'Ingress controller and API Gateway managing rate limits, authentication, and microservice routing.',
    why: 'Centralized policy enforcement so backend microservices don\'t have to implement auth and throttling individually.',
    how: 'Validates JWT signatures, checks rate-limit counters (token bucket algorithm), and routes via HTTP headers to the K8s cluster.',
    underTheHood: 'Usually powered by Envoy proxy in a service mesh (Istio/Linkerd). Uses mTLS (Mutual TLS) to secure pod-to-pod communication inside the cluster.',
    cornerCases: 'Token bucket exhaustion (429 Too Many Requests), upstream connection timeouts (504 Gateway Timeout) if the backend is scaling up.'
  },
  {
    id: 'stream',
    title: 'Event Streaming',
    icon: Activity,
    getComponent: (stack) => stack.streaming,
    what: 'Real-time asynchronous event bus capturing clickstream data, search context, and booking intent.',
    why: 'Decouples synchronous user requests from heavy backend processing and enables lambda architecture for real-time analytics.',
    how: 'Producers publish messages (often Avro/Protobuf serialized) to partitioned topics. Consumer groups read and process them in parallel.',
    underTheHood: 'Uses distributed append-only logs. Zookeeper or Kraft manages leader election for partitions to ensure high availability and fault tolerance.',
    cornerCases: 'Consumer lag (consumers processing slower than producers), partition skew (hot keys overloading a single broker), or message duplication (at-least-once delivery issues).'
  },
  {
    id: 'features',
    title: 'Feature Retrieval',
    icon: Database,
    getComponent: (stack) => stack.cache,
    what: 'Low-latency lookup of user embeddings, historical preferences, and real-time property availability.',
    why: 'ML models need rich context (features) to make accurate predictions. Fetching from a disk-based DB is too slow for real-time inference.',
    how: 'In-memory key-value store lookups (e.g., Redis GET or HMGET) with sub-millisecond latencies.',
    underTheHood: 'Data is kept entirely in RAM. Cache is populated asynchronously by Spark/Flink jobs reading from the Data Lake. Uses LRU (Least Recently Used) eviction policies.',
    cornerCases: 'Cache stampede (thundering herd) when a popular key expires, Redis OOM causing evictions of active keys, or network partitions causing split-brain scenarios.'
  },
  {
    id: 'ml',
    title: 'AI Inference Compute',
    icon: Cpu,
    getComponent: (stack) => stack.ml,
    what: 'GPU-accelerated Kubernetes pods executing Deep Learning models (e.g., dynamic pricing, vector similarity search).',
    why: 'Generates the final ranking scores or dynamic pricing adjustments based on real-time features and user intent.',
    how: 'PyTorch/Triton/vLLM loads model weights into GPU VRAM. Executes dense matrix multiplications (GEMM) on Tensor Cores.',
    underTheHood: 'CPU orchestrates the CUDA kernel launches via PCIe bus. GPU SMs (Streaming Multiprocessors) execute parallel threads. Continuous batching maximizes throughput.',
    cornerCases: 'CUDA Out Of Memory (OOM) due to large batch sizes, PCIe bandwidth bottlenecks during host-to-device transfers, or high queue latency during traffic spikes.'
  },
  {
    id: 'response',
    title: 'Aggregator & Response',
    icon: Network,
    getComponent: (stack) => stack.k8s,
    what: 'Aggregates ML predictions, formats the final JSON response, and returns it to the edge.',
    why: 'Clients expect a unified, structured payload. Handles fallback mechanisms if the ML service times out.',
    how: 'Microservice (often Go or Java) scatter-gathers responses, applies business logic (e.g., removing booked properties), and streams back.',
    underTheHood: 'Utilizes connection pooling and non-blocking I/O (epoll/kqueue). If the ML prediction exceeds p99 latency SLAs, it returns a cached or heuristic-based fallback response.',
    cornerCases: 'Cascading failures if circuit breakers aren\'t configured, memory leaks in connection pools, or JSON serialization overhead.'
  }
];

export const AirbnbPipelineSimulator: React.FC = () => {
  const [provider, setProvider] = useState<CloudProvider>('aws');
  const [activeStep, setActiveStep] = useState<string>('user');
  const [simulating, setSimulating] = useState(false);
  const [activeSimNode, setActiveSimNode] = useState<string | null>(null);

  const stack = STACKS[provider];

  const runSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index >= PIPELINE_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setSimulating(false);
          setActiveSimNode(null);
        }, 1000);
        return;
      }
      setActiveSimNode(PIPELINE_STEPS[index].id);
      setActiveStep(PIPELINE_STEPS[index].id);
      index++;
    }, 1500); // 1.5 seconds per hop
  };

  const selectedStepData = PIPELINE_STEPS.find(s => s.id === activeStep);

  return (
    <div className="space-y-6 animate-fade-in text-white h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e354f]/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
              Airbnb Engineering
            </span>
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            AI Inference Pipeline Simulation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deep technical architecture of a modern dynamic pricing and ranking ML pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider Selection */}
          <div className="flex bg-[#0b0d18] border border-[#2e354f]/40 p-1 rounded-xl">
            {(['aws', 'gcp', 'azure'] as CloudProvider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all uppercase cursor-pointer ${
                  provider === p 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button 
            onClick={runSimulation}
            disabled={simulating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-xl text-xs font-bold font-sans transition-colors flex items-center gap-2 cursor-pointer shadow-lg"
          >
            {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {simulating ? 'Simulating...' : 'Trace Request'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Diagram */}
        <div className="lg:col-span-4 border border-[#2e354f]/35 bg-[#0b0c16]/90 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
          
          <div className="relative z-10 flex flex-col space-y-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isSimulatingHere = activeSimNode === step.id;

              return (
                <React.Fragment key={step.id}>
                  <div 
                    onClick={() => setActiveStep(step.id)}
                    className={`relative p-3 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center gap-4 ${
                      isActive 
                        ? 'bg-violet-900/20 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                        : 'bg-[#121424] border-[#2e354f]/40 hover:bg-[#1a1c2e]'
                    } ${isSimulatingHere ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' : ''}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-violet-600' : 'bg-[#2e354f]'}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${isActive ? 'text-violet-300' : 'text-slate-200'}`}>{step.title}</h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{step.getComponent(stack)}</p>
                    </div>
                  </div>
                  
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="w-0.5 h-6 bg-[#2e354f]/50 relative">
                        {/* Simulation Packet */}
                        {simulating && activeSimNode === PIPELINE_STEPS[idx].id && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-[slideDown_1.5s_linear_forwards]" />
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {selectedStepData ? (
            <div className="border border-[#2e354f]/35 bg-[#0b0c16]/90 rounded-3xl p-6 lg:p-8 flex-1 relative overflow-hidden">
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-violet-600/20 text-violet-400 rounded-2xl border border-violet-500/30">
                  <selectedStepData.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold text-white">{selectedStepData.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold text-emerald-400">
                    <Server className="h-3.5 w-3.5" /> {selectedStepData.getComponent(stack)}
                  </div>
                </div>
              </div>

              <div className="space-y-6 text-sm">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* What & Why */}
                  <div className="bg-[#121424] rounded-2xl p-5 border border-[#2e354f]/40 space-y-4">
                    <div>
                      <h4 className="flex items-center gap-2 text-violet-300 font-bold uppercase text-[11px] tracking-wider mb-2">
                        <HelpCircle className="h-3.5 w-3.5" /> What it is
                      </h4>
                      <p className="text-slate-300 leading-relaxed text-xs">{selectedStepData.what}</p>
                    </div>
                    <div className="pt-4 border-t border-[#2e354f]/30">
                      <h4 className="flex items-center gap-2 text-violet-300 font-bold uppercase text-[11px] tracking-wider mb-2">
                        <Zap className="h-3.5 w-3.5" /> Why it matters
                      </h4>
                      <p className="text-slate-300 leading-relaxed text-xs">{selectedStepData.why}</p>
                    </div>
                  </div>

                  {/* How */}
                  <div className="bg-[#121424] rounded-2xl p-5 border border-[#2e354f]/40">
                    <h4 className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px] tracking-wider mb-2">
                      <Settings className="h-3.5 w-3.5" /> How it works
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-xs">{selectedStepData.how}</p>
                  </div>
                </div>

                {/* Under the Hood */}
                <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Cpu className="h-24 w-24" />
                  </div>
                  <h4 className="flex items-center gap-2 text-blue-400 font-bold uppercase text-[11px] tracking-wider mb-2 relative z-10">
                    <Layers className="h-3.5 w-3.5" /> Deep Technical: Under the Hood
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-xs relative z-10">{selectedStepData.underTheHood}</p>
                </div>

                {/* Corner Cases */}
                <div className="bg-rose-950/20 rounded-2xl p-5 border border-rose-900/30">
                  <h4 className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[11px] tracking-wider mb-2">
                    <Shield className="h-3.5 w-3.5" /> Corner Cases & SRE Common Issues
                  </h4>
                  <p className="text-slate-300 leading-relaxed text-xs">{selectedStepData.cornerCases}</p>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 border border-[#2e354f]/35 bg-[#0b0c16]/90 rounded-3xl flex items-center justify-center text-slate-500">
              Select a step to view details
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          0% { top: 0; opacity: 1; }
          90% { top: 100%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AirbnbPipelineSimulator;
