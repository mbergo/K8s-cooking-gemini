import React, { useState } from 'react';
import { Cpu, HelpCircle, Info, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw, Layers, Terminal, ArrowRight } from 'lucide-react';

interface CudaRecord {
  cudaVersion: string;
  minDriverLinux: string;
  minDriverLinuxVal: number; // numeric representation for calculations (e.g., 555.42)
  minCompatLinuxVal: number; // minimum driver for forward compatibility
  maxPyTorch: string;
  architectures: string[];
  supportedGpus: string[];
  k8sBaseImage: string;
  notes: string;
}

const CUDA_RECORDS: CudaRecord[] = [
  {
    cudaVersion: 'CUDA 12.5',
    minDriverLinux: '>= 555.42.02',
    minDriverLinuxVal: 555.42,
    minCompatLinuxVal: 525.60,
    maxPyTorch: 'PyTorch 2.4 / 2.5',
    architectures: ['Blackwell', 'Hopper', 'Ada Lovelace', 'Ampere'],
    supportedGpus: ['B200', 'H100', 'L4', 'RTX 4090', 'A100'],
    k8sBaseImage: 'nvcr.io/nvidia/pytorch:24.06-py3',
    notes: 'Latest production CUDA release. Supports Blackwell FP8 and advanced dynamic compilation steps.'
  },
  {
    cudaVersion: 'CUDA 12.4',
    minDriverLinux: '>= 550.54.14',
    minDriverLinuxVal: 550.54,
    minCompatLinuxVal: 525.60,
    maxPyTorch: 'PyTorch 2.3 / 2.4',
    architectures: ['Hopper', 'Ada Lovelace', 'Ampere'],
    supportedGpus: ['H100', 'L4', 'RTX 4090', 'A100', 'A10G'],
    k8sBaseImage: 'nvcr.io/nvidia/pytorch:24.03-py3',
    notes: 'Standard stable release for high-performance GKE A3 and EKS p5 node pools.'
  },
  {
    cudaVersion: 'CUDA 12.1',
    minDriverLinux: '>= 530.30.02',
    minDriverLinuxVal: 530.30,
    minCompatLinuxVal: 450.80,
    maxPyTorch: 'PyTorch 2.1 / 2.2',
    architectures: ['Hopper', 'Ada Lovelace', 'Ampere', 'Turing'],
    supportedGpus: ['H100', 'L4', 'A100', 'A10G', 'T4', 'RTX 3090'],
    k8sBaseImage: 'nvcr.io/nvidia/pytorch:23.10-py3',
    notes: 'The industry workhorse for vLLM 0.4.x / Triton Server. Highly reliable across all clouds.'
  },
  {
    cudaVersion: 'CUDA 11.8',
    minDriverLinux: '>= 520.61.05',
    minDriverLinuxVal: 520.61,
    minCompatLinuxVal: 450.80,
    maxPyTorch: 'PyTorch 2.0',
    architectures: ['Ampere', 'Turing', 'Volta'],
    supportedGpus: ['A100', 'A10G', 'T4', 'V100', 'RTX 3090'],
    k8sBaseImage: 'nvcr.io/nvidia/pytorch:22.12-py3',
    notes: 'Extremely stable legacy version. Best for mixed clusters hosting older GPU architectures.'
  },
  {
    cudaVersion: 'CUDA 11.2',
    minDriverLinux: '>= 460.32.03',
    minDriverLinuxVal: 460.32,
    minCompatLinuxVal: 418.81,
    maxPyTorch: 'PyTorch 1.8 / 1.9',
    architectures: ['Ampere', 'Turing', 'Volta', 'Pascal'],
    supportedGpus: ['A100 (Early)', 'T4', 'V100', 'P100'],
    k8sBaseImage: 'nvcr.io/nvidia/pytorch:21.03-py3',
    notes: 'Legacy maintenance version. Found primarily on on-premise clusters or legacy VM workloads.'
  }
];

const PRESET_DRIVERS = [
  { label: '555.42 (Modern Production)', val: 555.42 },
  { label: '535.104 (GKE/EKS LTS Target)', val: 535.104 },
  { label: '525.60 (Mid-Tier Driver)', val: 525.60 },
  { label: '470.182 (Legacy G2/T4 Driver)', val: 470.18 },
  { label: '450.80 (Highly Outdated)', val: 450.80 }
];

export const CudaMatrix: React.FC = () => {
  const [hostDriver, setHostDriver] = useState<number>(535.104);
  const [selectedCuda, setSelectedCuda] = useState<string>('CUDA 12.4');
  const [troubleshootLog, setTroubleshootLog] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'checker' | 'sandbox'>('checker');

  const getStatus = (record: CudaRecord) => {
    if (hostDriver >= record.minDriverLinuxVal) {
      return {
        type: 'native',
        label: 'Fully Compatible',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        badge: 'Ready'
      };
    } else if (hostDriver >= record.minCompatLinuxVal) {
      return {
        type: 'forward_compat',
        label: 'Forward Compat Mode',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        badge: 'Forward-Compat'
      };
    } else {
      return {
        type: 'incompatible',
        label: 'Incompatible Driver',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        badge: 'Incompatible'
      };
    }
  };

  const handleSimulateStart = (record: CudaRecord) => {
    const status = getStatus(record);
    if (status.type === 'native') {
      setTroubleshootLog(
        `$ kubectl logs pod/llm-serving-pod -c inference-engine\n` +
        `[vLLM 0.5.1] Initializing model weights...\n` +
        `NVIDIA GPU: ${record.supportedGpus[0]} detected. Driver version: ${hostDriver}\n` +
        `CUDA Toolkit initialized: ${record.cudaVersion}\n` +
        `SUCCESS: GPU context created successfully. Warm up completed. Ready for serving queries.`
      );
    } else if (status.type === 'forward_compat') {
      setTroubleshootLog(
        `$ kubectl logs pod/llm-serving-pod -c inference-engine\n` +
        `[vLLM 0.5.1] WARNING: Host driver ${hostDriver} is older than native driver target ${record.minDriverLinux}.\n` +
        `NVIDIA CUDA Forward Compatibility library loaded inside container namespaces.\n` +
        `CUDA Runtime: ${record.cudaVersion} successfully initialized via libcuda.so Forward Compatibility.\n` +
        `SUCCESS: System bypassed host driver kernel restrictions. Ready for serving queries.`
      );
    } else {
      setTroubleshootLog(
        `$ kubectl logs pod/llm-serving-pod -c inference-engine\n` +
        `[vLLM 0.5.1] FATAL ERROR during initialization:\n` +
        `--------------------------------------------------------------------------\n` +
        `RuntimeError: CUDA error: device-side assert triggered or host driver insufficient.\n` +
        `CUDA driver version is insufficient for CUDA runtime version.\n` +
        `  -> Host Driver Version: ${hostDriver}\n` +
        `  -> Required CUDA Toolkit runtime: ${record.cudaVersion} (requires native driver ${record.minDriverLinux})\n` +
        `--------------------------------------------------------------------------\n` +
        `CRITICAL: Pod status changed to CrashLoopBackOff.`
      );
    }
  };

  const selectedRecord = CUDA_RECORDS.find(r => r.cudaVersion === selectedCuda) || CUDA_RECORDS[0];
  const selectedStatus = getStatus(selectedRecord);

  return (
    <div className="mt-8 rounded-2xl border border-[#2e354f]/50 bg-[#111322] p-6 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1e2338] pb-4">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-white text-md flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-400" /> CUDA &amp; Driver Compatibility Matrix
          </h3>
          <p className="text-slate-400 text-xs">
            Validate GKE/EKS worker node compatibility. Avoid runtime mismatched CUDA errors in custom vLLM / PyTorch serving pods.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 bg-[#0c0e17] p-1 rounded-lg border border-[#2e354f]">
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              activeTab === 'checker' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Driver Analyzer
          </button>
          <button
            onClick={() => {
              setActiveTab('sandbox');
              if (!troubleshootLog) handleSimulateStart(selectedRecord);
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              activeTab === 'sandbox' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Container Boot Sandbox
          </button>
        </div>
      </div>

      {activeTab === 'checker' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Host Setup Panel */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. Configure Host Environment</h4>
            
            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Host NVIDIA Driver Presets</span>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_DRIVERS.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHostDriver(d.val)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                      hostDriver === d.val
                        ? 'bg-violet-500/10 border-violet-500 text-white font-bold'
                        : 'bg-[#0c0e17] border-[#2e354f] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[10px] text-slate-500">v{d.val}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] text-slate-400 font-bold block flex justify-between">
                <span>Or Enter Specific Linux Host Driver Version</span>
                <span className="text-violet-400 font-mono font-bold">v{hostDriver.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="410"
                max="565"
                step="5"
                value={hostDriver}
                onChange={(e) => setHostDriver(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>
          </div>

          {/* Matrix Outcome & Grid */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider block">2. CUDA Toolkit Compatibility Results</h4>

            <div className="space-y-3">
              {CUDA_RECORDS.map((record, idx) => {
                const status = getStatus(record);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedCuda(record.cudaVersion);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      selectedCuda === record.cudaVersion
                        ? 'bg-[#15192c] border-violet-500'
                        : 'bg-[#0c0e17] border-[#1e2338] hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{record.cudaVersion}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Image: {record.k8sBaseImage.split(':')[1]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {record.supportedGpus.slice(0, 3).map((g, i) => (
                          <span key={i} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-500 block">Requires Linux native</span>
                        <span className="text-xs font-mono text-slate-300">{record.minDriverLinux}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${status.color}`}>
                        {status.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Sandbox Simulator Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Select Container Image &amp; Target</h4>
            
            <div className="space-y-3">
              {CUDA_RECORDS.map((record) => (
                <button
                  key={record.cudaVersion}
                  onClick={() => {
                    setSelectedCuda(record.cudaVersion);
                    handleSimulateStart(record);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    selectedCuda === record.cudaVersion
                      ? 'bg-[#15192c] border-violet-500'
                      : 'bg-[#0c0e17] border-[#1e2338] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white font-mono">{record.cudaVersion} Container</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getStatus(record).color}`}>
                      {getStatus(record).badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed font-mono truncate w-full">
                    Image: {record.k8sBaseImage}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanatory notes block */}
            <div className="p-4 rounded-xl border border-violet-500/10 bg-violet-950/5 space-y-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> GKE/EKS SRE Advice
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                If the host driver is slightly older but exceeds the <strong>Forward Compatibility Minimum</strong> (e.g. Host is 525+ and container runs CUDA 12.4), Kubernetes containers can load the CUDA Forward Compatibility libraries directly from the container image.
              </p>
            </div>
          </div>

          {/* SRE Terminal Logs */}
          <div className="lg:col-span-7 flex flex-col h-[340px]">
            <div className="p-3 bg-[#0a0c14] border-t border-x border-[#2e354f]/50 rounded-t-xl flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3" /> pod-events-stdout &bull; host-driver: {hostDriver}
              </span>
              <button
                onClick={() => handleSimulateStart(selectedRecord)}
                className="hover:text-white flex items-center gap-1 transition-colors"
                title="Restart container"
              >
                <RefreshCw className="h-3 w-3" /> Reboot
              </button>
            </div>

            <pre className="flex-1 p-4 bg-[#07080f] border border-[#2e354f]/50 rounded-b-xl overflow-y-auto font-mono text-[11px] text-emerald-400 leading-relaxed select-text console-glow whitespace-pre-wrap">
              {troubleshootLog || 'Select a container image to run boot validation diagnostics...'}
            </pre>
          </div>
        </div>
      )}

      {/* Selected CUDA Detailed Spec Card */}
      <div className="p-5 rounded-xl border border-[#1e2338] bg-[#0c0e17]/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">CUDA Toolkit Version</span>
          <span className="text-slate-200 font-bold font-mono text-xs mt-1 block">{selectedRecord.cudaVersion}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Host Minimum Driver</span>
          <span className="text-slate-200 font-bold font-mono text-xs mt-1 block">{selectedRecord.minDriverLinux} (Linux)</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Recommended PyTorch Stack</span>
          <span className="text-slate-200 font-bold font-mono text-xs mt-1 block">{selectedRecord.maxPyTorch}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Microarchitectures</span>
          <span className="text-violet-400 font-bold text-[10px] mt-1 block truncate">
            {selectedRecord.architectures.join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
};
