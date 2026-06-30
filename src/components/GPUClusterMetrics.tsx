import React, { useState, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Cpu, 
  Database, 
  Flame, 
  Activity, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Terminal, 
  RefreshCw,
  Gauge,
  Layers,
  Thermometer
} from 'lucide-react';

// Node Definitions
interface GPUNode {
  id: string;
  name: string;
  model: string;
  vramTotal: number; // GB
  maxBandwidth: number; // GB/s
  maxPower: number; // Watts
  pool: 'a100' | 'h100' | 'l4';
}

const GPU_NODES: GPUNode[] = [
  {
    id: 'gke-h100-pool-node-1',
    name: 'gke-gpu-h100-sxm5-8fc1',
    model: 'NVIDIA H100 SXM5 (80GB)',
    vramTotal: 80,
    maxBandwidth: 3350,
    maxPower: 700,
    pool: 'h100'
  },
  {
    id: 'gke-a100-pool-node-1',
    name: 'gke-gpu-a100-pcie-3ea2',
    model: 'NVIDIA A100 PCIe (40GB)',
    vramTotal: 40,
    maxBandwidth: 1555,
    maxPower: 250,
    pool: 'a100'
  },
  {
    id: 'gke-l4-pool-node-1',
    name: 'gke-gpu-l4-single-77bf',
    model: 'NVIDIA L4 Tensor Core (24GB)',
    vramTotal: 24,
    maxBandwidth: 300,
    maxPower: 72,
    pool: 'l4'
  }
];

// Workload Configurations
interface WorkloadConfig {
  id: string;
  name: string;
  description: string;
  baseUtil: number; // %
  baseVram: number; // % of total
  baseBandwidth: number; // % of max
  tempImpact: number; // °C target delta above ambient 35°C
  utilVariance: number;
  bandwidthVariance: number;
  activePods: string[];
}

const WORKLOADS: WorkloadConfig[] = [
  {
    id: 'idle',
    name: 'Standby / Warm Pool',
    description: 'Minimal background CUDA context. GKE dynamic pooling warming node.',
    baseUtil: 1,
    baseVram: 8, // ~6GB on H100
    baseBandwidth: 2, // minimal PCIe idle transfer
    tempImpact: 3, // core sitting at ~38°C
    utilVariance: 1,
    bandwidthVariance: 1,
    activePods: ['kube-system/nvidia-device-plugin-daemonset-xx52']
  },
  {
    id: 'vllm-inference',
    name: 'vLLM Inference Serving (Llama-3-70B)',
    description: 'Dynamic continuous batching serving concurrent API prompts. High VRAM load.',
    baseUtil: 65,
    baseVram: 88, // high VRAM reservation for KV cache pages
    baseBandwidth: 45, // steady memory bandwidth as parameters read
    tempImpact: 28, // core temperature ~63°C
    utilVariance: 15,
    bandwidthVariance: 12,
    activePods: [
      'vllm-serving/llama3-70b-inference-deployment-85fc74f67d-9j9z9',
      'vllm-serving/inference-metrics-exporter-54c7b6'
    ]
  },
  {
    id: 'ddp-training',
    name: 'Distributed DDP Pretraining Step',
    description: 'All-Reduce gradient steps across multi-node H100 pools via GPUDirect RDMA.',
    baseUtil: 96,
    baseVram: 94, // dense batch sizes saturating memory blocks
    baseBandwidth: 82, // intense back-and-forth NVLink transfers
    tempImpact: 42, // sustained workload heating core to ~77°C
    utilVariance: 3,
    bandwidthVariance: 5,
    activePods: [
      'ml-training/fsdp-llm-pretrain-epoch-4-step-450-worker-0',
      'ml-training/tensorboard-sync-agent'
    ]
  },
  {
    id: 'speculative-decoding',
    name: 'Speculative Decoding (Draft + Target Verification)',
    description: 'Llama-3-8B drafts fast tokens while Llama-3-70B validates in parallel chunks.',
    baseUtil: 48,
    baseVram: 74,
    baseBandwidth: 65,
    tempImpact: 22, // temperature ~57°C
    utilVariance: 25, // highly volatile burst cycles
    bandwidthVariance: 18,
    activePods: [
      'spec-inference/llama-draft-8b-7bfc42',
      'spec-inference/llama-target-70b-99d8a1'
    ]
  }
];

interface TelemetryPoint {
  time: string;
  timestamp: number;
  gpuUtilization: number; // %
  vramUsed: number; // GB
  vramUsedPct: number; // %
  memoryBandwidth: number; // GB/s
  temperature: number; // °C
  powerDraw: number; // W
}

export const GPUClusterMetrics: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('gke-h100-pool-node-1');
  const [selectedWorkloadId, setSelectedWorkloadId] = useState<string>('vllm-inference');
  const [history, setHistory] = useState<Record<string, TelemetryPoint[]>>({});
  const [tick, setTick] = useState<number>(0);

  const selectedNode = GPU_NODES.find(n => n.id === selectedNodeId) || GPU_NODES[0];
  const selectedWorkload = WORKLOADS.find(w => w.id === selectedWorkloadId) || WORKLOADS[0];

  // Ref to hold the current values of temperature for smooth thermal inertia
  const tempRef = useRef<Record<string, number>>({});

  // Initialize history for each node if not present
  useEffect(() => {
    const initialHistory: Record<string, TelemetryPoint[]> = {};
    
    GPU_NODES.forEach(node => {
      const nodeHistory: TelemetryPoint[] = [];
      const baseTemp = 35 + selectedWorkload.tempImpact;
      tempRef.current[node.id] = baseTemp;

      // Seed with 15 historic points
      for (let i = 14; i >= 0; i--) {
        const d = new Date(Date.now() - i * 3000);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const util = Math.max(0, Math.min(100, selectedWorkload.baseUtil + (Math.random() - 0.5) * selectedWorkload.utilVariance));
        const vramUsedPct = Math.max(5, Math.min(99, selectedWorkload.baseVram + (Math.random() - 0.5) * 4));
        const vramUsed = Number(((vramUsedPct / 100) * node.vramTotal).toFixed(1));
        const bandwidth = Math.max(0, Math.min(node.maxBandwidth, (selectedWorkload.baseBandwidth / 100) * node.maxBandwidth + (Math.random() - 0.5) * selectedWorkload.bandwidthVariance * 25));
        const powerDraw = Math.max(15, Math.min(node.maxPower, (util / 100) * node.maxPower + (Math.random() - 0.5) * 15));

        nodeHistory.push({
          time: timeStr,
          timestamp: d.getTime(),
          gpuUtilization: Math.round(util),
          vramUsed,
          vramUsedPct: Math.round(vramUsedPct),
          memoryBandwidth: Math.round(bandwidth),
          temperature: Math.round(baseTemp + (Math.random() - 0.5) * 2),
          powerDraw: Math.round(powerDraw)
        });
      }
      initialHistory[node.id] = nodeHistory;
    });

    setHistory(initialHistory);
  }, []);

  // Tick generator every 2.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setHistory(prev => {
        const next = { ...prev };
        
        GPU_NODES.forEach(node => {
          const nodeHistory = next[node.id] ? [...next[node.id]] : [];
          if (nodeHistory.length === 0) return;

          const isCurrentNode = node.id === selectedNodeId;
          const currentWorkload = isCurrentNode ? selectedWorkload : WORKLOADS[0]; // non-selected nodes act as idle

          // Thermal Inertia: temperature trails utilization
          const targetTemp = 35 + currentWorkload.tempImpact + (currentWorkload.baseUtil > 50 ? (nodeHistory[nodeHistory.length - 1]?.gpuUtilization - currentWorkload.baseUtil) * 0.15 : 0);
          const lastTemp = tempRef.current[node.id] || 38;
          // Slowly adjust temperature with exponential moving average (10% adjustment speed)
          const currentTemp = lastTemp + (targetTemp - lastTemp) * 0.12 + (Math.random() - 0.5) * 0.6;
          tempRef.current[node.id] = currentTemp;

          // Metrics calculations with noise
          const util = Math.max(0, Math.min(100, currentWorkload.baseUtil + (Math.random() - 0.5) * currentWorkload.utilVariance));
          const vramUsedPct = Math.max(5, Math.min(99, currentWorkload.baseVram + (Math.random() - 0.5) * 3));
          const vramUsed = Number(((vramUsedPct / 100) * node.vramTotal).toFixed(1));
          
          const targetBandwidthVal = (currentWorkload.baseBandwidth / 100) * node.maxBandwidth;
          const bandwidth = Math.max(1, Math.min(node.maxBandwidth, targetBandwidthVal + (Math.random() - 0.5) * currentWorkload.bandwidthVariance * 20));
          
          const powerDraw = Math.max(15, Math.min(node.maxPower, (util / 100) * node.maxPower + (Math.random() - 0.5) * 20));

          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          nodeHistory.push({
            time: timeStr,
            timestamp: now.getTime(),
            gpuUtilization: Math.round(util),
            vramUsed,
            vramUsedPct: Math.round(vramUsedPct),
            memoryBandwidth: Math.round(bandwidth),
            temperature: Math.round(currentTemp),
            powerDraw: Math.round(powerDraw)
          });

          // Maintain max history of 15 points for visual spacing
          if (nodeHistory.length > 15) {
            nodeHistory.shift();
          }

          next[node.id] = nodeHistory;
        });

        return next;
      });
      setTick(t => t + 1);
    }, 2500);

    return () => clearInterval(timer);
  }, [selectedNodeId, selectedWorkloadId]);

  const currentNodeHistory = history[selectedNodeId] || [];
  const latestMetric = currentNodeHistory[currentNodeHistory.length - 1] || {
    gpuUtilization: 0,
    vramUsed: 0,
    vramUsedPct: 0,
    memoryBandwidth: 0,
    temperature: 35,
    powerDraw: 15
  };

  // Determine SRE status notifications
  const getSreDiagnostics = () => {
    const alerts = [];
    if (latestMetric.temperature >= 76) {
      alerts.push({
        type: 'danger',
        msg: `Thermal warning: Core temp sits at ${latestMetric.temperature}°C. Approaching NVML throttling threshold (82°C).`
      });
    } else if (latestMetric.temperature >= 68) {
      alerts.push({
        type: 'warning',
        msg: `Elevated temperatures detected (${latestMetric.temperature}°C). Node liquid cooling bypass valve operates at peak.`
      });
    }

    if (latestMetric.vramUsedPct >= 92) {
      alerts.push({
        type: 'danger',
        msg: `VRAM saturation threat: ${latestMetric.vramUsedPct}% allocated. Core engine prone to CUDA OOM under burst contexts.`
      });
    }

    if (latestMetric.gpuUtilization >= 95) {
      alerts.push({
        type: 'info',
        msg: `GPU core fully saturated. Tensor Cores executing pipeline at maximum FP8 precision.`
      });
    }

    return alerts;
  };

  const activeAlerts = getSreDiagnostics();

  // Simulated nvidia-smi command printout
  const getNvidiaSmiOutput = () => {
    const pad = (str: string, len: number) => str.padEnd(len).substring(0, len);
    const padR = (str: string, len: number) => str.padStart(len).substring(0, len);
    
    const utilStr = `${latestMetric.gpuUtilization}%`;
    const tempStr = `${latestMetric.temperature}C`;
    const powerStr = `${latestMetric.powerDraw}W / ${selectedNode.maxPower}W`;
    const memStr = `${Math.round(latestMetric.vramUsed * 1024)}MiB / ${selectedNode.vramTotal * 1024}MiB`;

    return `+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 535.104.05             Driver Version: 535.104.05    CUDA Version: 12.2      |
|-----------------------------------------+----------------------+------------------------+
| GPU  Name                 Persistence-M | Bus-Id        Disp.A | Volatile Uncorr. ECC   |
| Fan  Temp   Perf          Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M.   |
|                                         |                      |               MIG M.   |
|=========================================+======================+========================|
|   0  ${pad(selectedNode.model, 25)}  On  | 00000000:00:04.0 Off |                    0   |
| N/A   ${pad(tempStr, 5)}    P0           ${pad(powerStr, 11)} |  ${padR(memStr, 19)} |     ${padR(utilStr, 4)}      Default   |
|                                         |                      |                  N/A   |
+-----------------------------------------+----------------------+------------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
${selectedWorkload.activePods.map((pod, i) => {
  const isLg = pod.includes('70b') || pod.includes('pretrain');
  const size = isLg ? Math.round(latestMetric.vramUsed * 0.85 * 1024) : Math.round(latestMetric.vramUsed * 0.12 * 1024);
  return `|    0   N/A  N/A    ${2045 + i * 142}      C   ...containers/${pad(pod.split('/').pop() || '', 30)}   ${padR(size + 'MiB', 10)} |`;
}).join('\n')}
+-----------------------------------------------------------------------------------------+`;
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Visual Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#2e354f]/30 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Gauge className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              Cluster GPU Telemetry Dashboard
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time interactive GKE hardware telemetry monitoring. Select different cluster worker nodes and active AI model workloads to view real-time performance characteristics.
          </p>
        </div>

        {/* Real-time Heartbeat indicator */}
        <div className="flex items-center gap-2 bg-[#0c0e17] border border-[#2e354f]/40 px-3.5 py-1.5 rounded-xl self-start lg:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
            Live Stream Tick #{tick}
          </span>
        </div>
      </div>

      {/* Primary Configuration Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Node Selection */}
        <div className="bg-[#0c0e17] border border-[#2e354f]/40 p-4 rounded-2xl space-y-3">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-violet-400" /> Select Target Kubernetes Worker Node
          </label>
          <div className="grid grid-cols-1 gap-2">
            {GPU_NODES.map(node => (
              <button
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  selectedNodeId === node.id
                    ? 'bg-[#181a2e] border-violet-500 text-white shadow-md shadow-violet-500/5'
                    : 'bg-[#090b14] border-[#2e354f]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold font-mono block">{node.name}</span>
                  <span className="text-[11px] block text-slate-400 font-sans">{node.model}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono bg-[#111322] border border-[#2e354f]/40 px-2 py-0.5 rounded text-indigo-400 block font-bold">
                    {node.vramTotal}GB VRAM
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                    Max: {node.maxBandwidth} GB/s
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workload Simulation */}
        <div className="bg-[#0c0e17] border border-[#2e354f]/40 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-400" /> Apply Simulated AI Workload
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WORKLOADS.map(workload => (
                <button
                  key={workload.id}
                  onClick={() => setSelectedWorkloadId(workload.id)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    selectedWorkloadId === workload.id
                      ? 'bg-[#0f211c] border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                      : 'bg-[#090b14] border-[#2e354f]/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block leading-snug line-clamp-1">{workload.name}</span>
                  <span className="text-[9px] text-slate-500 mt-2 block line-clamp-1">{workload.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-violet-950/5 border border-violet-500/10 text-[11px] leading-relaxed text-slate-400 mt-2">
            <strong>Platform Note:</strong> Selecting a workload adjusts the simulated cluster’s active CUDA registers. The metrics curves below reflect the true stochastic behavior of deep learning inference servers.
          </div>
        </div>

      </div>

      {/* Key Metric Highlights Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl border border-[#2e354f]/30 bg-[#111322]/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GPU Utilization</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{latestMetric.gpuUtilization}%</span>
              <span className="text-[10px] text-indigo-400 font-mono">active cores</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl border border-[#2e354f]/30 bg-[#111322]/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">VRAM Allocated</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{latestMetric.vramUsed} GB</span>
              <span className="text-[10px] text-slate-500 font-mono">/ {selectedNode.vramTotal}GB</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl border border-[#2e354f]/30 bg-[#111322]/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Memory Bandwidth</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{latestMetric.memoryBandwidth} GB/s</span>
              <span className="text-[9px] text-slate-500 font-mono">Peak: {selectedNode.maxBandwidth}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl border border-[#2e354f]/30 bg-[#111322]/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GPU Core Temp</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold tracking-tight ${latestMetric.temperature >= 76 ? 'text-rose-400' : latestMetric.temperature >= 68 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestMetric.temperature}°C
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Limit: 82°C</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${latestMetric.temperature >= 76 ? 'bg-rose-500/10 text-rose-400' : latestMetric.temperature >= 68 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Flame className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* SRE Warning Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert, idx) => (
            <div 
              key={idx} 
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                alert.type === 'danger'
                  ? 'bg-rose-950/15 border-rose-500/30 text-rose-300'
                  : alert.type === 'warning'
                    ? 'bg-amber-950/15 border-amber-500/30 text-amber-300'
                    : 'bg-indigo-950/15 border-indigo-500/30 text-indigo-300'
              } animate-fade-in`}
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${alert.type === 'danger' ? 'text-rose-400' : alert.type === 'warning' ? 'text-amber-400' : 'text-indigo-400'}`} />
              <div className="space-y-0.5">
                <span className="font-bold uppercase text-[9px] tracking-wider block">
                  {alert.type === 'danger' ? 'CRITICAL DISPATCH' : alert.type === 'warning' ? 'SRE ADVISORY' : 'NODE STATE INFO'}
                </span>
                <p className="leading-relaxed">{alert.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Telemetry Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart 1: GPU Utilization */}
        <div className="bg-[#0c0e17] border border-[#2e354f]/40 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2e354f]/15 pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-violet-400" /> GPU Core Utilization (%)
            </span>
            <span className="text-[10px] font-mono text-slate-500">Last 15 metrics</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentNodeHistory} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e354f" opacity={0.2} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={9} fontClassName="font-mono" />
                <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0e17', borderColor: '#2e354f', borderRadius: '12px' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="gpuUtilization" name="Utilization (%)" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUtil)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Memory Bandwidth & VRAM Usage */}
        <div className="bg-[#0c0e17] border border-[#2e354f]/40 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2e354f]/15 pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-400" /> Memory Bandwidth (GB/s) &amp; VRAM
            </span>
            <span className="text-[10px] font-mono text-slate-500">PCIe / NVLink rates</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentNodeHistory} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e354f" opacity={0.2} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0e17', borderColor: '#2e354f', borderRadius: '12px' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="memoryBandwidth" name="Bandwidth (GB/s)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBandwidth)" />
                <Line type="monotone" dataKey="vramUsedPct" name="VRAM Allocated (%)" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Temperature curve with throttle threshold */}
        <div className="bg-[#0c0e17] border border-[#2e354f]/40 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2e354f]/15 pb-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-pink-400" /> GPU Temperature (°C)
            </span>
            <span className="text-[10px] text-rose-400 font-mono font-bold">Throttling: 82°C</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentNodeHistory} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e354f" opacity={0.15} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} domain={[30, 90]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0c0e17', borderColor: '#2e354f', borderRadius: '12px' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="temperature" name="Core Temp (°C)" stroke="#ec4899" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                {/* Reference line simulated by an invisible line or standard grid lines. Let's draw standard Line */}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SRE nvidia-smi Shell Terminal console printout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-slate-400" /> Active Hardware CLI Node Inspection (nvidia-smi)
          </label>
          <span className="text-[9px] font-mono text-slate-500">Refreshes on each telemetry update</span>
        </div>
        <pre className="p-4 bg-black/80 border border-[#2e354f]/40 rounded-2xl font-mono text-[10px] leading-relaxed text-emerald-400 select-text overflow-x-auto whitespace-pre">
          {getNvidiaSmiOutput()}
        </pre>
      </div>

    </div>
  );
};
