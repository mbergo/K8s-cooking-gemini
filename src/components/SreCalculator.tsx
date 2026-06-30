import React, { useState } from 'react';
import { Calculator, Sparkles, Activity, ShieldAlert, Cpu, Layers } from 'lucide-react';

export const SreCalculator: React.FC = () => {
  // Inputs
  const [modelSizeBillion, setModelSizeBillion] = useState<number>(70); // Billion Parameters
  const [hiddenSize, setHiddenSize] = useState<number>(4096); // e.g. 4096 for Llama 3 8B
  const [numLayers, setNumLayers] = useState<number>(32); // e.g. 32 layers
  const [seqLength, setSeqLength] = useState<number>(2048); // 2k context window
  const [batchSize, setBatchSize] = useState<number>(32); // 32 concurrent requests
  const [precisionBytes, setPrecisionBytes] = useState<number>(2); // FP16 = 2 bytes, FP8 = 1

  // Calculations
  // Model weights = Parameters * PrecisionBytes
  const modelWeightsGB = (modelSizeBillion * precisionBytes);
  
  // KV Cache per token = 2 * NumLayers * HiddenDimension * PrecisionBytes (for Key and Value matrices)
  // KV Cache total = KV Cache per token * SeqLength * BatchSize
  const kvCachePerTokenBytes = 2 * numLayers * hiddenSize * precisionBytes;
  const kvCacheTotalGB = (kvCachePerTokenBytes * seqLength * batchSize) / (1024 * 1024 * 1024);

  const totalVRAMNeeded = modelWeightsGB + kvCacheTotalGB;

  // Sizing recommendations
  const getKarpenterSuggestion = () => {
    const h100Count = Math.ceil(totalVRAMNeeded / 80); // H100 has 80GB VRAM
    const l4Count = Math.ceil(totalVRAMNeeded / 24); // L4 has 24GB VRAM
    
    return {
      h100Count,
      l4Count,
      suggestion: totalVRAMNeeded > 200
        ? `🔥 Critical Footprint! Provisioning a multi-node GPU cluster of ${h100Count}x H100 instances utilizing GPUDirect RDMA and NVLink is highly recommended to bypass host memory transfers.`
        : totalVRAMNeeded > 70
          ? `⚡ Medium Footprint. Scaling out to a cluster of ${h100Count}x EKS H100 nodes or ${l4Count}x L4 nodes in spot instances for cost optimization.`
          : `✅ Low Footprint. Can easily run inside a single AWS g6.xlarge (L4 24GB) or g5.2xlarge (A10G 24GB) instance.`
    };
  };

  const { h100Count, l4Count, suggestion } = getKarpenterSuggestion();

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Capacity Planner &amp; VRAM Sizing Calculator
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Estimate model memory parameters and KV Cache footprints to configure Karpenter node pools and prevent production CUDA Out-of-Memory events under peak traffic.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sliders Configuration Form */}
        <div className="lg:col-span-5 rounded-2xl border border-[#2e354f]/50 bg-[#111322] p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-[#1e2338] pb-3">
            <Calculator className="h-5 w-5 text-violet-400" />
            <h3 className="font-display font-bold text-white text-sm">Model serving parameters</h3>
          </div>

          {/* Model Size */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Model Size (Parameters)</span>
              <span className="text-violet-400 font-mono font-bold">{modelSizeBillion}B Params</span>
            </label>
            <input
              type="range"
              min="7"
              max="175"
              step="1"
              value={modelSizeBillion}
              onChange={(e) => setModelSizeBillion(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Hidden Size */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Hidden Dimension Size</span>
              <span className="text-violet-400 font-mono font-bold">{hiddenSize} Units</span>
            </label>
            <input
              type="range"
              min="2048"
              max="8192"
              step="1024"
              value={hiddenSize}
              onChange={(e) => setHiddenSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Layers count */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Number of Transformer Layers</span>
              <span className="text-violet-400 font-mono font-bold">{numLayers} Layers</span>
            </label>
            <input
              type="range"
              min="16"
              max="96"
              step="4"
              value={numLayers}
              onChange={(e) => setNumLayers(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Context Sequence length */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Max Sequence Length (Context)</span>
              <span className="text-violet-400 font-mono font-bold">{seqLength} tokens</span>
            </label>
            <input
              type="range"
              min="1024"
              max="32768"
              step="1024"
              value={seqLength}
              onChange={(e) => setSeqLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Active users batch size */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block flex justify-between">
              <span>Concurrent Active Users (Batch Size)</span>
              <span className="text-violet-400 font-mono font-bold">{batchSize} Users</span>
            </label>
            <input
              type="range"
              min="1"
              max="128"
              step="1"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Model Precision */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-bold block">Model Precision</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'FP16 (2 Bytes)', val: 2 },
                { name: 'FP8 (1 Byte)', val: 1 },
                { name: 'INT4 (0.5 Byte)', val: 0.5 }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrecisionBytes(p.val)}
                  className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-all ${
                    precisionBytes === p.val
                      ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-600/10'
                      : 'bg-[#0c0e17] border-[#2e354f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculations Dashboard and SRE suggestions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Box 1 */}
            <div className="rounded-xl border border-slate-800 bg-[#111322] p-4 text-center">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Model Weights Memory</span>
              <span className="text-xl font-bold font-mono text-slate-200">{modelWeightsGB.toFixed(1)} GB</span>
              <span className="text-[10px] text-slate-500 block mt-1">Static Footprint</span>
            </div>

            {/* Box 2 */}
            <div className="rounded-xl border border-slate-800 bg-[#111322] p-4 text-center">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Total KV Cache Memory</span>
              <span className="text-xl font-bold font-mono text-purple-400">{kvCacheTotalGB.toFixed(1)} GB</span>
              <span className="text-[10px] text-slate-500 block mt-1">Dynamic Footprint</span>
            </div>

            {/* Box 3 */}
            <div className="rounded-xl border border-slate-800 bg-[#111322] p-4 text-center">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Total Required VRAM</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{totalVRAMNeeded.toFixed(1)} GB</span>
              <span className="text-[10px] text-slate-500 block mt-1">Sum Capacity</span>
            </div>
          </div>

          {/* Detailed Calculations breakdown */}
          <div className="rounded-2xl border border-[#2e354f]/50 bg-[#0d0f1c] p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-[#1e2338] pb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-violet-400" /> Sizing Equation Trace
            </h4>
            <div className="space-y-3 font-mono text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Model Static VRAM:</span>
                <span className="text-slate-300">Parameters ({modelSizeBillion}B) * Precision ({precisionBytes}B) = <strong className="text-slate-200">{modelWeightsGB.toFixed(1)} GB</strong></span>
              </div>
              <div className="flex justify-between">
                <span>KV Cache Per Token:</span>
                <span className="text-slate-300">2 * Layers ({numLayers}) * HiddenSize ({hiddenSize}) * Precision ({precisionBytes}B) = <strong className="text-slate-200">{(kvCachePerTokenBytes / 1024).toFixed(1)} KB</strong></span>
              </div>
              <div className="flex justify-between">
                <span>KV Cache Total:</span>
                <span className="text-slate-300">PerToken * SeqLength ({seqLength}) * BatchSize ({batchSize}) = <strong className="text-purple-400">{kvCacheTotalGB.toFixed(1)} GB</strong></span>
              </div>
            </div>
          </div>

          {/* SRE Karpenter Suggestion Box */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/5 p-6 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Karpenter Cluster Autoscaling Suggestion
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {suggestion}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#0a0c14] border border-[#23263a] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">AWS H100 (80GB) Pool</span>
                  <span className="text-xs text-slate-300 font-mono font-bold mt-1 block">Provision: {h100Count} Instance(s)</span>
                </div>
                <span className="p-1.5 bg-violet-500/10 text-violet-400 rounded-md"><Cpu className="h-4 w-4" /></span>
              </div>

              <div className="p-3 bg-[#0a0c14] border border-[#23263a] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">AWS L4 (24GB) Pool</span>
                  <span className="text-xs text-slate-300 font-mono font-bold mt-1 block">Provision: {l4Count} Instance(s)</span>
                </div>
                <span className="p-1.5 bg-pink-500/10 text-pink-400 rounded-md"><Layers className="h-4 w-4" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
