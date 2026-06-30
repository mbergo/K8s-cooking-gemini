import React, { useState } from 'react';
import { K8S_COMPONENTS } from '../types';
import { Server, Shield, Activity, Network, Key, Database, Cpu, Zap, HelpCircle } from 'lucide-react';

const COMPONENT_IMAGES: Record<string, string> = {
  'api-server': '/src/assets/images/k8s_apiserver_1782855802520.jpg',
  'etcd': '/src/assets/images/k8s_etcd_1782855812421.jpg',
  'scheduler': '/src/assets/images/k8s_scheduler_1782855821493.jpg',
  'kubelet': '/src/assets/images/k8s_kubelet_1782855831144.jpg',
  'cni': '/src/assets/images/k8s_cni_1782855839492.jpg',
  'csi': '/src/assets/images/k8s_csi_1782855850034.jpg'
};

export const ArchitectureVisualizer: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>('api-server');

  const comp = K8S_COMPONENTS[selectedComponent];

  const getIcon = (id: string, className = "h-5 w-5") => {
    const imageUrl = COMPONENT_IMAGES[id];
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={id}
          referrerPolicy="no-referrer"
          className={`${className} rounded-lg object-cover transition-all`}
        />
      );
    }
    switch (id) {
      case 'api-server': return <Server className={className} />;
      case 'etcd': return <Database className={`${className} text-indigo-400`} />;
      case 'scheduler': return <Cpu className={`${className} text-purple-400`} />;
      case 'kubelet': return <Activity className={`${className} text-pink-400`} />;
      case 'cni': return <Network className={`${className} text-emerald-400`} />;
      case 'csi': return <Shield className={`${className} text-amber-400`} />;
      default: return <Server className={className} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Kubernetes Cluster Topology Explorer
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Click any component in the control plane or worker node below to view its deep architectural connections, production failure modes, and Staff-level interview insights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Interactive Diagram Stage */}
        <div className="lg:col-span-7 rounded-2xl border border-[#2e354f]/50 bg-[#0d0f1c] p-6 flex flex-col justify-between shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full filter blur-xl pointer-events-none" />
          
          <div className="space-y-8 relative z-1">
            {/* Control Plane Block */}
            <div className="border border-indigo-500/20 bg-indigo-950/15 rounded-xl p-5">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Kubernetes Control Plane (Master Node)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedComponent('api-server')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'api-server'
                      ? 'bg-indigo-600/30 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('api-server', "h-12 w-12 mb-2 border border-violet-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">kube-apiserver</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">Unified Gateway</span>
                </button>

                <button
                  onClick={() => setSelectedComponent('etcd')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'etcd'
                      ? 'bg-indigo-600/30 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('etcd', "h-12 w-12 mb-2 border border-violet-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">etcd</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">Consensus DB</span>
                </button>

                <button
                  onClick={() => setSelectedComponent('scheduler')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'scheduler'
                      ? 'bg-indigo-600/30 border-indigo-500 shadow-lg shadow-indigo-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('scheduler', "h-12 w-12 mb-2 border border-violet-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">kube-scheduler</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">GPU Allocator</span>
                </button>
              </div>
            </div>

            {/* Connecting flow lines (visualized with divs) */}
            <div className="flex justify-around items-center h-1 bg-[#1c1f30] relative rounded-full mx-10">
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold animate-ping" />
              <div className="absolute top-1/2 left-3/4 -translate-y-1/2 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold animate-pulse" />
              <div className="text-[10px] font-mono text-slate-500 bg-[#0d0f1c] px-3 border border-[#2e354f] rounded-full">
                API Watch / Node Heartbeats (gRPC)
              </div>
            </div>

            {/* Worker Node Block */}
            <div className="border border-emerald-500/20 bg-emerald-950/10 rounded-xl p-5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Server className="h-3.5 w-3.5" /> Worker GPU Node (G6 / NDv5 Instance)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedComponent('kubelet')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'kubelet'
                      ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('kubelet', "h-12 w-12 mb-2 border border-emerald-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">Kubelet</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">Node Agent</span>
                </button>

                <button
                  onClick={() => setSelectedComponent('cni')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'cni'
                      ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('cni', "h-12 w-12 mb-2 border border-emerald-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">CNI (Cilium)</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">eBPF Network</span>
                </button>

                <button
                  onClick={() => setSelectedComponent('csi')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedComponent === 'csi'
                      ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20 text-white scale-[1.02]'
                      : 'bg-[#141727] border-[#2e354f] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {getIcon('csi', "h-12 w-12 mb-2 border border-emerald-500/20 shadow-md")}
                  <span className="text-xs font-bold font-mono">CSI (gp3)</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">Mount Plugin</span>
                </button>
              </div>

              {/* Physical hardware representation inside worker node */}
              <div className="mt-4 p-3.5 bg-[#0a0c14] border border-[#23263a] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Physical GPU (H100 / L4)</h4>
                    <p className="text-[10px] text-slate-500">Communicates via NVIDIA Container Toolkit</p>
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full font-mono font-bold">
                  PCIe Gen5 / NVLink Active
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions indicator */}
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 border-t border-[#1e2338] pt-4">
            <span className="flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5 text-violet-400" /> Click components above to inspect</span>
            <span>State: <strong className="text-emerald-400">Stable (100% Synced)</strong></span>
          </div>
        </div>

        {/* Dynamic Detail Card panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#2e354f] bg-[#111322] p-6 shadow-xl flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header Title */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#1e2338]">
                <div className="p-1.5 bg-[#141727] rounded-2xl border border-[#2e354f]/50 shrink-0 shadow-lg">
                  {getIcon(selectedComponent, "h-14 w-14")}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base leading-tight">
                    {comp.name}
                  </h3>
                  <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider font-mono mt-1 block">
                    {comp.category.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {comp.description}
              </p>

              {/* Key Responsibilities */}
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide">Key SRE Responsibilities</h4>
                <ul className="space-y-1.5 text-xs text-slate-400 font-sans">
                  {comp.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-violet-500 font-bold mt-0.5">&bull;</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Failure Modes & Troubleshooting */}
              <div>
                <h4 className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wide">Production Failure Mode</h4>
                <div className="p-3 bg-red-950/10 border border-red-500/10 rounded-lg text-xs space-y-1.5">
                  <p className="text-slate-300"><strong>Symptom:</strong> {comp.failureModes[0].symptom}</p>
                  <p className="text-slate-400"><strong>Detection:</strong> <code className="text-red-300 font-mono text-[10px]">{comp.failureModes[0].detection}</code></p>
                  <p className="text-emerald-400"><strong>Resolution:</strong> {comp.failureModes[0].resolution}</p>
                </div>
              </div>
            </div>

            {/* Staff-Level Interview Talking Point */}
            <div className="mt-6 pt-4 border-t border-[#1e2338] bg-[#0c0e17]/60 p-4 rounded-xl border border-[#22273c]">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> Staff Interview Secret
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{comp.interviewTip}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
