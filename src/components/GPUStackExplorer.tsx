import React, { useState } from 'react';
import { GPU_STACK } from '../types';
import { Cpu, Zap, ArrowRight, Layers, HelpCircle, Radio, Network } from 'lucide-react';

export const GPUStackExplorer: React.FC = () => {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [animStep, setAnimStep] = useState<string>('idle');

  const selectedLayer = GPU_STACK[selectedLayerIndex];

  const triggerDMAAnimation = () => {
    setIsPlayingAnimation(true);
    setAnimStep('cpu-prep');

    // 1. CPU Prepares Tensors
    setTimeout(() => {
      setAnimStep('pcie-transfer');
    }, 1500);

    // 2. PCIe Copy
    setTimeout(() => {
      setAnimStep('gpu-hbm');
    }, 3000);

    // 3. GPU VRAM Holds Weights
    setTimeout(() => {
      setAnimStep('tensor-cores');
    }, 4500);

    // 4. Tensor Core GEMM Execution
    setTimeout(() => {
      setAnimStep('results-back');
    }, 6000);

    // 5. Copy Back
    setTimeout(() => {
      setAnimStep('idle');
      setIsPlayingAnimation(false);
    }, 7500);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          CPU-to-GPU Deep Execution Stack
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Follow the pathway of deep learning instructions down through memory registers, driver layers, system buses, and specialized silicon components.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Horizontal Stack representation */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instruction Flow</h3>
          {GPU_STACK.map((layer, idx) => {
            const isSelected = selectedLayerIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedLayerIndex(idx)}
                className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-950/40 to-indigo-950/20 border-violet-500 shadow-md shadow-violet-500/5'
                    : 'bg-[#111322] border-[#2e354f]/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                    isSelected ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {layer.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-medium">
                      {layer.type}
                    </span>
                  </div>
                </div>
                <ArrowRight className={`h-4 w-4 transition-transform ${isSelected ? 'text-violet-400 translate-x-1' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Selected Layer Info & Simulation */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Layer Info details */}
          <div className="rounded-2xl border border-[#2e354f]/50 bg-[#111322] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-violet-400" />
                <h3 className="font-display font-bold text-white text-base">{selectedLayer.name}</h3>
              </div>
              <span className="text-[10px] bg-violet-500/10 text-violet-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                {selectedLayer.type}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedLayer.description}
            </p>

            <div>
              <h4 className="text-xs font-bold text-slate-200 mb-1">Execution Mechanism:</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedLayer.howItWorks}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#0a0c14] border border-[#1e2338] rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Key API / Metric</span>
                <span className="text-xs text-slate-300 font-mono font-bold mt-1 block">{selectedLayer.keyMetricOrAPI}</span>
              </div>
              <div className="p-3 bg-[#0a0c14] border border-[#1e2338] rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Silicon Node</span>
                <span className="text-xs text-slate-300 mt-1 block">Hardware Co-Processor</span>
              </div>
            </div>

            {/* Interview secret */}
            <div className="p-4 bg-violet-950/10 border border-violet-500/10 rounded-xl">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <HelpCircle className="h-4 w-4" /> Systems Engineering Insight
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{selectedLayer.interviewInsight}&rdquo;
              </p>
            </div>
          </div>

          {/* Interactive DMA Pipeline Simulator */}
          <div className="rounded-2xl border border-[#2e354f]/50 bg-[#0d0f1c] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="font-display font-bold text-white text-xs">Asynchronous DMA &amp; CUDA Pipe Simulator</h3>
              </div>
              <button
                onClick={triggerDMAAnimation}
                disabled={isPlayingAnimation}
                className="text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
              >
                {isPlayingAnimation ? 'Pipeline Processing...' : 'Trigger Pipeline Copy'}
              </button>
            </div>

            {/* Interactive Flow Diagram */}
            <div className="grid grid-cols-5 gap-3 text-center text-xs relative py-6">
              {/* CPU Box */}
              <div className={`p-3 rounded-xl border transition-all ${
                animStep === 'cpu-prep'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white scale-[1.03]'
                  : 'bg-[#111322] border-[#2e354f]/50 text-slate-400'
              }`}>
                <Cpu className="h-5 w-5 mx-auto mb-1.5" />
                <span className="font-bold block">CPU (RAM)</span>
                <span className="text-[10px] text-slate-500 block">Prefill Tensors</span>
              </div>

              {/* Arrow 1 */}
              <div className="flex items-center justify-center">
                <div className={`h-1 flex-1 relative rounded-full ${
                  animStep === 'pcie-transfer' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}>
                  {animStep === 'pcie-transfer' && (
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
              </div>

              {/* PCIe / DMA Box */}
              <div className={`p-3 rounded-xl border transition-all ${
                animStep === 'pcie-transfer'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white scale-[1.03]'
                  : 'bg-[#111322] border-[#2e354f]/50 text-slate-400'
              }`}>
                <Network className="h-5 w-5 mx-auto mb-1.5" />
                <span className="font-bold block">PCIe Bus</span>
                <span className="text-[10px] text-slate-500 block">DMA Controller</span>
              </div>

              {/* Arrow 2 */}
              <div className="flex items-center justify-center">
                <div className={`h-1 flex-1 relative rounded-full ${
                  animStep === 'gpu-hbm' || animStep === 'tensor-cores' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}>
                  {(animStep === 'gpu-hbm' || animStep === 'tensor-cores') && (
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
              </div>

              {/* GPU VRAM Box */}
              <div className={`p-3 rounded-xl border transition-all ${
                animStep === 'gpu-hbm' || animStep === 'tensor-cores' || animStep === 'results-back'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white scale-[1.03]'
                  : 'bg-[#111322] border-[#2e354f]/50 text-slate-400'
              }`}>
                <Zap className="h-5 w-5 mx-auto mb-1.5" />
                <span className="font-bold block">GPU HBM</span>
                <span className="text-[10px] text-slate-500 block">SM Registers</span>
              </div>
            </div>

            {/* Description console */}
            <div className="p-3 bg-[#0a0c14] border border-[#222538] rounded-xl text-center text-xs font-mono text-slate-400">
              {animStep === 'idle' && "Pipeline Idle. Trigger copy to observe host-to-device streaming."}
              {animStep === 'cpu-prep' && "Step 1: CPU allocates pinned host memory and tokenizes context."}
              {animStep === 'pcie-transfer' && "Step 2: CPU signals DMA engine. Prompt tensors stream across PCIe Gen5."}
              {animStep === 'gpu-hbm' && "Step 3: Prompt tensors reach GPU HBM (VRAM). Model weights loaded."}
              {animStep === 'tensor-cores' && "Step 4: Warp Schedulers fire instructions. Tensor Cores execute GEMM matrix multiplication."}
              {animStep === 'results-back' && "Step 5: Output tokens calculated. Copy-back initiated to return response."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
