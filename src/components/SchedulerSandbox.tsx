import React, { useState } from 'react';
import { SCHEDULER_STEPS, SchedulerStep } from '../types';
import { Play, RotateCcw, AlertTriangle, CheckCircle, Info, Layers, Layers2, ArrowRight } from 'lucide-react';

interface SimulatedNode {
  name: string;
  gpus: number;
  gpusFree: number;
  cpus: number;
  cpusFree: number;
  memory: number; // GB
  memoryFree: number;
  taints: { key: string; value: string; effect: string }[];
  cachedImages: string[];
  pcieLocality: 'High (Shared PCIe Complex)' | 'Low (Host Memory Bridge)';
}

export const SchedulerSandbox: React.FC = () => {
  // User configurable Pod
  const [requestedGPU, setRequestedGPU] = useState<number>(1);
  const [requestedCPU, setRequestedCPU] = useState<number>(4);
  const [requestedMemory, setRequestedMemory] = useState<number>(16); // GB
  const [hasToleration, setToleration] = useState<boolean>(false);
  const [nodeSelector, setNodeSelector] = useState<string>('none'); // 'h100', 'l4', or 'none'

  // Simulation State
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  // Simulated Nodes
  const nodes: SimulatedNode[] = [
    {
      name: 'node-us-west-1a-h100',
      gpus: 8,
      gpusFree: 2,
      cpus: 128,
      cpusFree: 16,
      memory: 512,
      memoryFree: 32,
      taints: [{ key: 'gpu-pool', value: 'h100', effect: 'NoSchedule' }],
      cachedImages: ['vllm/vllm-openai:v0.4.2', 'pytorch/pytorch:2.2.0'],
      pcieLocality: 'High (Shared PCIe Complex)'
    },
    {
      name: 'node-us-west-1b-cpu-only',
      gpus: 0,
      gpusFree: 0,
      cpus: 64,
      cpusFree: 48,
      memory: 256,
      memoryFree: 128,
      taints: [],
      cachedImages: ['redis:alpine'],
      pcieLocality: 'Low (Host Memory Bridge)'
    },
    {
      name: 'node-us-west-1c-l4',
      gpus: 4,
      gpusFree: 3,
      cpus: 48,
      cpusFree: 12,
      memory: 128,
      memoryFree: 64,
      taints: [],
      cachedImages: ['pytorch/pytorch:2.2.0'],
      pcieLocality: 'High (Shared PCIe Complex)'
    }
  ];

  const startSimulation = () => {
    setIsSimulating(true);
    setCurrentStep(0);
    setSimulationLogs(['Initializing scheduling queue... Pod added to ActiveQueue.']);
  };

  const nextStep = () => {
    if (currentStep >= SCHEDULER_STEPS.length - 1) {
      setIsSimulating(false);
      return;
    }

    const next = currentStep + 1;
    setCurrentStep(next);

    // Generate step-specific log messages
    const stepName = SCHEDULER_STEPS[next].name;
    let log = '';

    if (stepName === 'Pre-Filter' || stepName === 'QueueSort') {
      log = `Sorting queue. Pod has high priority class 'ai-critical-serving'. Evaluating requirements.`;
    } else if (stepName === 'Filter') {
      const filtered = nodes.map(node => {
        const hasGpu = node.gpusFree >= requestedGPU;
        const hasCpu = node.cpusFree >= requestedCPU;
        const hasMem = node.memoryFree >= requestedMemory;
        
        let toleratesTaints = true;
        if (node.taints.length > 0) {
          toleratesTaints = hasToleration;
        }

        let matchesSelector = true;
        if (nodeSelector !== 'none') {
          matchesSelector = node.name.includes(nodeSelector);
        }

        const passed = hasGpu && hasCpu && hasMem && toleratesTaints && matchesSelector;
        return { name: node.name, passed, reason: !hasGpu ? 'Insufficient GPUs' : !hasCpu ? 'Insufficient CPUs' : !hasMem ? 'Insufficient Memory' : !toleratesTaints ? 'Un-tolerated Taint: gpu-pool=h100:NoSchedule' : !matchesSelector ? 'NodeSelector mismatch' : 'Passed All Filters' };
      });

      log = `Filtering nodes. Results:\n` + filtered.map(f => ` - ${f.name}: ${f.passed ? '✅ Passed' : '❌ Failed (' + f.reason + ')'}`).join('\n');
    } else if (stepName === 'Score') {
      const scores = nodes.map(node => {
        let score = 50; // base score

        // Resource fit scoring
        if (node.gpusFree >= requestedGPU) score += 20;
        // Image locality scoring
        if (node.cachedImages.includes('vllm/vllm-openai:v0.4.2')) score += 15;
        // PCIe Locality
        if (node.pcieLocality.includes('High')) score += 15;

        // Apply filters penalty/bonus
        const passed = node.gpusFree >= requestedGPU && node.cpusFree >= requestedCPU && (node.taints.length === 0 || hasToleration) && (nodeSelector === 'none' || node.name.includes(nodeSelector));
        if (!passed) score = 0;

        return { name: node.name, score };
      });

      log = `Scoring remaining nodes:\n` + scores.map(s => ` - ${s.name}: Score = ${s.score}/100`).join('\n');
    } else if (stepName === 'Reserve') {
      log = `Reserving ${requestedGPU} GPU(s) on target node. Scheduler state locked to prevent race conditions.`;
    } else if (stepName === 'Bind') {
      const activeNodes = nodes.filter(node => {
        const hasGpu = node.gpusFree >= requestedGPU;
        const hasCpu = node.cpusFree >= requestedCPU;
        const hasMem = node.memoryFree >= requestedMemory;
        const toleratesTaints = node.taints.length === 0 || hasToleration;
        const matchesSelector = nodeSelector === 'none' || node.name.includes(nodeSelector);
        return hasGpu && hasCpu && hasMem && toleratesTaints && matchesSelector;
      });

      if (activeNodes.length > 0) {
        log = `Successfully Bound Pod to Node [${activeNodes[0].name}]. Writing PodSpec.NodeName to etcd...`;
      } else {
        log = `⚠️ Scheduling Failed! Pod marked as Unschedulable. Waiting for cluster autoscaler or node resource release.`;
      }
    }

    setSimulationLogs(prev => [...prev, `[${stepName}] ${log}`]);
  };

  const resetSimulation = () => {
    setCurrentStep(-1);
    setIsSimulating(false);
    setSimulationLogs([]);
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Kube-Scheduler AI Workload Sandbox
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Construct an AI container specification, define taints and tolerations, and simulate the exact phases of the Kubernetes scheduler framework in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pod Configuration Form */}
        <div className="lg:col-span-4 rounded-2xl border border-[#2e354f]/50 bg-[#111322] p-5 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#1e2338] pb-3">
            <Layers className="h-5 w-5 text-violet-400" />
            <h3 className="font-display font-bold text-white text-sm">Pod Resource Specification</h3>
          </div>

          {/* GPU Request */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Requested GPUs (nvidia.com/gpu)</span>
              <span className="text-violet-400 font-mono font-bold">{requestedGPU} GPU</span>
            </label>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={requestedGPU}
              onChange={(e) => setRequestedGPU(parseInt(e.target.value))}
              disabled={isSimulating}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* CPU Request */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Requested CPUs</span>
              <span className="text-violet-400 font-mono font-bold">{requestedCPU} Cores</span>
            </label>
            <input
              type="range"
              min="1"
              max="32"
              step="1"
              value={requestedCPU}
              onChange={(e) => setRequestedCPU(parseInt(e.target.value))}
              disabled={isSimulating}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Memory Request */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Requested Memory (RAM)</span>
              <span className="text-violet-400 font-mono font-bold">{requestedMemory} GiB</span>
            </label>
            <input
              type="range"
              min="4"
              max="128"
              step="4"
              value={requestedMemory}
              onChange={(e) => setRequestedMemory(parseInt(e.target.value))}
              disabled={isSimulating}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Tolerations */}
          <div className="space-y-3">
            <label className="text-xs text-slate-300 font-bold block">Tolerations &amp; Taints</label>
            <label className="flex items-center gap-3 bg-[#0c0e17] p-3 rounded-xl border border-[#1e2338] cursor-pointer">
              <input
                type="checkbox"
                checked={hasToleration}
                onChange={(e) => setToleration(e.target.checked)}
                disabled={isSimulating}
                className="rounded border-slate-700 text-violet-600 focus:ring-violet-500 bg-slate-800 h-4 w-4"
              />
              <div className="text-left">
                <span className="text-xs font-bold text-slate-200 block">Tolerate H100 GPU Pool</span>
                <span className="text-[10px] text-slate-500 block">Tolerates: gpu-pool=h100:NoSchedule</span>
              </div>
            </label>
          </div>

          {/* NodeSelector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold block">NodeSelector Criteria</label>
            <select
              value={nodeSelector}
              onChange={(e) => setNodeSelector(e.target.value)}
              disabled={isSimulating}
              className="w-full bg-[#0c0e17] border border-[#2e354f] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="none">none (Select any healthy node)</option>
              <option value="h100">gpu-type=h100 (Request premium H100 node)</option>
              <option value="l4">gpu-type=l4 (Request budget L4 node)</option>
            </select>
          </div>

          {/* Simulation Controllers */}
          <div className="flex gap-2 pt-4 border-t border-[#1e2338]">
            {!isSimulating ? (
              <button
                onClick={startSimulation}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs py-3 rounded-lg hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-600/10 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" /> Initialize Cycle
              </button>
            ) : (
              <>
                <button
                  onClick={nextStep}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-xs py-3 rounded-lg hover:bg-emerald-500 transition-all cursor-pointer"
                >
                  Next Phase <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={resetSimulation}
                  className="p-3 bg-[#1e2338] border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Node Comparison and Active Scheduler Stage */}
        <div className="lg:col-span-8 space-y-6">
          {/* Target Nodes Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nodes.map((node, i) => {
              const hasGpu = node.gpusFree >= requestedGPU;
              const hasCpu = node.cpusFree >= requestedCPU;
              const hasMem = node.memoryFree >= requestedMemory;
              const toleratesTaints = node.taints.length === 0 || hasToleration;
              const matchesSelector = nodeSelector === 'none' || node.name.includes(nodeSelector);
              const isEligible = hasGpu && hasCpu && hasMem && toleratesTaints && matchesSelector;

              return (
                <div key={i} className={`rounded-xl border p-4 bg-[#111322] flex flex-col justify-between ${
                  isSimulating && currentStep >= 1
                    ? isEligible
                      ? 'border-emerald-500/40 shadow-md shadow-emerald-500/5'
                      : 'border-red-500/20 opacity-60'
                    : 'border-[#2e354f]/50'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white font-mono truncate max-w-[150px]">{node.name}</span>
                      {isSimulating && currentStep >= 1 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isEligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {isEligible ? 'Eligible' : 'Filtered'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* GPU Status */}
                      <div className="flex justify-between text-slate-400">
                        <span>Free GPUs:</span>
                        <span className={`font-mono font-bold ${hasGpu ? 'text-emerald-400' : 'text-red-400'}`}>
                          {node.gpusFree} / {node.gpus}
                        </span>
                      </div>
                      {/* CPU Status */}
                      <div className="flex justify-between text-slate-400">
                        <span>Free CPUs:</span>
                        <span className={`font-mono font-bold ${hasCpu ? 'text-emerald-400' : 'text-red-400'}`}>
                          {node.cpusFree} / {node.cpus}
                        </span>
                      </div>
                      {/* Memory Status */}
                      <div className="flex justify-between text-slate-400">
                        <span>Free Memory:</span>
                        <span className={`font-mono font-bold ${hasMem ? 'text-emerald-400' : 'text-red-400'}`}>
                          {node.memoryFree}G / {node.memory}G
                        </span>
                      </div>
                      {/* Taints Status */}
                      {node.taints.length > 0 && (
                        <div className="pt-2 border-t border-[#1a1c2d]">
                          <span className="text-[10px] text-red-400 font-bold block">Taint:</span>
                          <span className="text-[9px] text-slate-400 font-mono block truncate">
                            {node.taints[0].key}={node.taints[0].value}:{node.taints[0].effect}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[#1e2338] text-[10px] text-slate-500 flex justify-between">
                    <span>Cache: <strong>{node.cachedImages.length} images</strong></span>
                    <span>PCIe: <strong className="text-violet-400">High</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulator Steps Console */}
          <div className="rounded-2xl border border-[#2e354f]/50 bg-[#0d0f1c] overflow-hidden flex flex-col h-80">
            {/* Console Header */}
            <div className="p-3 bg-[#111322] border-b border-[#1e2338] flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1.5"><Layers2 className="h-3.5 w-3.5 text-violet-400" /> Scheduler Internal Trace logs</span>
              <span>Step: <strong>{currentStep + 1} / {SCHEDULER_STEPS.length}</strong></span>
            </div>

            {/* Console Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
              {simulationLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-1.5">
                  <Info className="h-5 w-5 text-slate-600" />
                  <span>Interactive console empty. Choose parameters and click &ldquo;Initialize Cycle&rdquo; to begin scheduling simulation.</span>
                </div>
              ) : (
                simulationLogs.map((log, index) => (
                  <div key={index} className="text-left border-l-2 border-violet-500/40 pl-3 leading-relaxed py-0.5 text-slate-300 whitespace-pre-wrap animate-fade-in">
                    {log}
                  </div>
                ))
              )}
            </div>

            {/* Current Step Rule display */}
            {currentStep >= 0 && (
              <div className="p-3 bg-[#111322] border-t border-[#1e2338] flex justify-between items-center text-[10px] text-slate-400">
                <span>Phase Focus: <strong className="text-violet-400">{SCHEDULER_STEPS[currentStep].name}</strong></span>
                <span className="font-mono bg-[#0c0e17] px-2 py-1 rounded border border-slate-800 text-slate-300">
                  Rule: {SCHEDULER_STEPS[currentStep].formulaOrRule}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
