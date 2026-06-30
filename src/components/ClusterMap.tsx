import React, { useState, useEffect } from 'react';
import { Globe, Activity, Server, Zap, Cpu, Leaf, DollarSign, Clock, Play, ArrowRight, ShieldAlert, Wifi, HelpCircle } from 'lucide-react';

interface DataCenter {
  id: string;
  name: string;
  location: string;
  coordinates: { x: number; y: number }; // Percentage coordinates on our world map SVG (0-100)
  gpus: string;
  pue: number; // Power Usage Effectiveness
  energySource: 'Geothermal' | 'Hydro' | 'Mixed Grid' | 'Solar/Wind';
  costPerHr: number; // Normalized unit cost
  healthy: boolean;
  activeWorkload: number; // 0-100 percentage
  pingMs: Record<string, number>; // Latency to other user locations
}

interface UserLocation {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
}

const USER_LOCATIONS: UserLocation[] = [
  { id: 'new-york', name: 'New York', coordinates: { x: 28, y: 38 } },
  { id: 'london', name: 'London', coordinates: { x: 48, y: 28 } },
  { id: 'tokyo', name: 'Tokyo', coordinates: { x: 85, y: 40 } },
  { id: 'sao-paulo', name: 'São Paulo', coordinates: { x: 36, y: 76 } },
  { id: 'sydney', name: 'Sydney', coordinates: { x: 88, y: 82 } },
];

const DATA_CENTERS: DataCenter[] = [
  {
    id: 'us-east-1',
    name: 'us-east-1 (N. Virginia)',
    location: 'Virginia, USA',
    coordinates: { x: 25, y: 42 },
    gpus: '128x NVIDIA H100 (SXM5)',
    pue: 1.18,
    energySource: 'Mixed Grid',
    costPerHr: 2.10,
    healthy: true,
    activeWorkload: 62,
    pingMs: { 'new-york': 12, 'london': 78, 'tokyo': 158, 'sao-paulo': 112, 'sydney': 185 }
  },
  {
    id: 'us-west-2',
    name: 'us-west-2 (Oregon)',
    location: 'Oregon, USA',
    coordinates: { x: 12, y: 35 },
    gpus: '512x NVIDIA H100 (NVLink)',
    pue: 1.06,
    energySource: 'Geothermal',
    costPerHr: 1.85,
    healthy: true,
    activeWorkload: 45,
    pingMs: { 'new-york': 58, 'london': 135, 'tokyo': 110, 'sao-paulo': 145, 'sydney': 140 }
  },
  {
    id: 'eu-west-1',
    name: 'eu-west-1 (Dublin)',
    location: 'Ireland',
    coordinates: { x: 45, y: 32 },
    gpus: '256x NVIDIA H100 (SXM5)',
    pue: 1.11,
    energySource: 'Hydro',
    costPerHr: 1.90,
    healthy: true,
    activeWorkload: 78,
    pingMs: { 'new-york': 72, 'london': 15, 'tokyo': 210, 'sao-paulo': 130, 'sydney': 240 }
  },
  {
    id: 'asia-east-1',
    name: 'asia-east-1 (Tokyo)',
    location: 'Tokyo, Japan',
    coordinates: { x: 82, y: 44 },
    gpus: '64x NVIDIA A100 (80GB)',
    pue: 1.25,
    energySource: 'Mixed Grid',
    costPerHr: 2.60,
    healthy: true,
    activeWorkload: 31,
    pingMs: { 'new-york': 160, 'london': 205, 'tokyo': 5, 'sao-paulo': 230, 'sydney': 115 }
  },
  {
    id: 'sa-east-1',
    name: 'sa-east-1 (São Paulo)',
    location: 'São Paulo, Brazil',
    coordinates: { x: 38, y: 72 },
    gpus: '32x NVIDIA A100 (40GB)',
    pue: 1.35,
    energySource: 'Solar/Wind',
    costPerHr: 2.40,
    healthy: true,
    activeWorkload: 18,
    pingMs: { 'new-york': 115, 'london': 140, 'tokyo': 235, 'sao-paulo': 8, 'sydney': 210 }
  }
];

export const ClusterMap: React.FC = () => {
  const [selectedDC, setSelectedDC] = useState<string>('us-east-1');
  const [userLoc, setUserLoc] = useState<string>('new-york');
  const [policy, setPolicy] = useState<'latency' | 'cost' | 'carbon'>('latency');
  const [contextSize, setContextSize] = useState<number>(4); // in KB
  
  // Simulation states
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [selectedTargetDC, setSelectedTargetDC] = useState<DataCenter | null>(null);

  // Auto-ticking workloads to simulate active live telemetry
  const [datacenters, setDatacenters] = useState<DataCenter[]>(DATA_CENTERS);

  useEffect(() => {
    const interval = setInterval(() => {
      setDatacenters(prev =>
        prev.map(dc => {
          const delta = Math.floor(Math.random() * 7) - 3;
          const nextWorkload = Math.max(10, Math.min(95, dc.activeWorkload + delta));
          return { ...dc, activeWorkload: nextWorkload };
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const runSimulation = () => {
    if (simulating) return;

    setSimulating(true);
    setSimProgress(0);
    setTelemetryLogs([]);
    
    const user = USER_LOCATIONS.find(u => u.id === userLoc)!;
    
    // Choose the best DC based on policy
    let targetDC = datacenters[0];
    let scoreExplanation = '';

    if (policy === 'latency') {
      // Find datacenter with lowest ping to the user
      targetDC = [...datacenters].sort((a, b) => a.pingMs[userLoc] - b.pingMs[userLoc])[0];
      scoreExplanation = `Selected based on physical network proximity (${targetDC.pingMs[userLoc]}ms RTT).`;
    } else if (policy === 'cost') {
      // Find datacenter with lowest cost per hour
      targetDC = [...datacenters].sort((a, b) => a.costPerHr - b.costPerHr)[0];
      scoreExplanation = `Selected based on optimal Spot instance cost unit ($${targetDC.costPerHr}/hr).`;
    } else {
      // Carbon-Aware: prioritize Geothermal and Hydro, then low PUE
      const getCarbonScore = (dc: DataCenter) => {
        let score = 0;
        if (dc.energySource === 'Geothermal') score += 100;
        else if (dc.energySource === 'Hydro') score += 80;
        else if (dc.energySource === 'Solar/Wind') score += 90;
        else score += 30;
        // Subtract points for high PUE
        score -= (dc.pue - 1.0) * 150;
        return score;
      };
      targetDC = [...datacenters].sort((a, b) => getCarbonScore(b) - getCarbonScore(a))[0];
      scoreExplanation = `Selected based on energy source (${targetDC.energySource}) and optimal PUE (${targetDC.pue}).`;
    }

    setSelectedTargetDC(targetDC);
    setActiveRoute({
      from: user.coordinates,
      to: targetDC.coordinates
    });

    const logs: string[] = [];
    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setTelemetryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setSimProgress(prev => Math.min(100, prev + 15));
      }, delay);
    };

    addLog(`INIT: User in ${user.name} requested multi-region AI inference (Context: ${contextSize}KB)`, 0);
    addLog(`INGRESS: Resolved global endpoint at us-east-1 ingress router (N. Virginia)`, 400);
    addLog(`POLICY: Orchestrator selected target node [${targetDC.name}] using policy [${policy.toUpperCase()}]`, 900);
    addLog(`WAN: Routing prompt tensors via high-throughput fiber backbone. Network latency: ${targetDC.pingMs[userLoc]}ms RTT`, 1500);
    
    // Calculate compute latency based on context size and node load
    const queueLatency = Math.floor(targetDC.activeWorkload * 0.4);
    const computeLatency = Math.floor(25 + contextSize * 3);
    const totalCompute = queueLatency + computeLatency;

    addLog(`COMPUTE: Enqueued on GPU Scheduler. Queue delay: ${queueLatency}ms. Executing prefill on ${targetDC.gpus.split(' ')[1]} tensor cores...`, 2100);
    addLog(`COMPUTE: Completed prefill & first-token generation in ${computeLatency}ms`, 2800);
    addLog(`STREAM: Initiated back-propagation stream. First chunk sent over CNI/Cilium mesh`, 3400);
    
    const totalRtt = targetDC.pingMs[userLoc] + totalCompute;
    setTimeout(() => {
      setTelemetryLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SUCCESS: Stream loaded in client browser! Total Time-To-First-Token (TTFT): ${totalRtt}ms.`
      ]);
      setSimProgress(100);
      setSimulating(false);
    }, 4000);
  };

  const activeDC = datacenters.find(dc => dc.id === selectedDC) || datacenters[0];

  return (
    <div className="space-y-6 animate-fade-in" id="cluster-map-root">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2e354f]/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
              Simulated WAN Scheduler
            </span>
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight mt-1">
            Global AI Cluster Map
          </h2>
          <p className="text-xs text-slate-400">
            Real-time latency, power usage effectiveness (PUE), and dynamic multi-region inference routing across the globe.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-[#101221] px-3 py-1.5 rounded-xl border border-[#2e354f]/30">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Edge Ingress Synchronized</span>
        </div>
      </div>

      {/* Main Grid: Map & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Geographic Map Section */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative rounded-3xl border border-[#2e354f]/35 bg-[#0b0c16]/90 p-4 shadow-2xl overflow-hidden min-h-[400px]">
            {/* World Map SVG Canvas background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 1000 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Simplified schematic representation of continents */}
                {/* North America */}
                <path d="M50,120 L280,120 L300,180 L250,220 L210,250 L180,240 L160,280 L130,280 L110,230 L70,220 L50,150 Z" fill="#2a3052" />
                {/* South America */}
                <path d="M210,260 L280,280 L320,330 L380,420 L360,480 L320,490 L280,450 L250,380 L220,330 L200,280 Z" fill="#2a3052" />
                {/* Europe */}
                <path d="M420,100 L540,100 L560,150 L520,220 L440,240 L410,180 L400,120 Z" fill="#2a3052" />
                {/* Africa */}
                <path d="M420,240 L500,240 L580,280 L590,340 L560,420 L510,450 L470,380 L440,320 L410,280 Z" fill="#2a3052" />
                {/* Asia */}
                <path d="M540,80 L880,80 L920,180 L900,280 L800,320 L760,260 L680,280 L580,220 L560,140 Z" fill="#2a3052" />
                {/* Australia */}
                <path d="M780,360 L890,380 L910,440 L840,460 L780,420 Z" fill="#2a3052" />
                {/* Antarctica */}
                <path d="M100,480 L900,480 L850,495 L150,495 Z" fill="#2a3052" />
              </svg>
            </div>

            {/* Grid Line Accents for Sci-Fi visual look */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

            {/* Overlay Map Interactive Title */}
            <div className="absolute top-4 left-4 z-10 text-[10px] font-mono text-slate-500 bg-[#080911]/80 px-2 py-1 rounded-md border border-[#2e354f]/20 uppercase">
              Global Network Latency Graph
            </div>

            {/* SVG Interactive Overlays (Pathways) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '400px' }}>
              {/* If we have an active simulated route, draw connection line */}
              {activeRoute && (
                <>
                  <line
                    x1={`${activeRoute.from.x}%`}
                    y1={`${activeRoute.from.y}%`}
                    x2={`${activeRoute.to.x}%`}
                    y2={`${activeRoute.to.y}%`}
                    stroke="url(#routeGlow)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="animate-pulse"
                  />
                  <line
                    x1={`${activeRoute.from.x}%`}
                    y1={`${activeRoute.from.y}%`}
                    x2={`${activeRoute.to.x}%`}
                    y2={`${activeRoute.to.y}%`}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    style={{
                      animation: 'dash 30s linear infinite'
                    }}
                  />
                  {/* Moving signal particle */}
                  <circle r="4" fill="#a78bfa">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M ${activeRoute.from.x * 8} ${activeRoute.from.y * 4} L ${activeRoute.to.x * 8} ${activeRoute.to.y * 4}`}
                      keyPoints="0;1"
                      keyTimes="0;1"
                    />
                  </circle>
                </>
              )}

              {/* Draw default fiber lines from us-east-1 (Orchestrator Hub) to others */}
              {datacenters.map(dc => {
                if (dc.id === 'us-east-1') return null;
                const hub = datacenters.find(d => d.id === 'us-east-1')!;
                return (
                  <line
                    key={`fiber-${dc.id}`}
                    x1={`${hub.coordinates.x}%`}
                    y1={`${hub.coordinates.y}%`}
                    x2={`${dc.coordinates.x}%`}
                    y2={`${dc.coordinates.y}%`}
                    stroke="#2e354f"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.6"
                  />
                );
              })}

              <defs>
                <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>

            {/* Render User Locations as gold dots */}
            {USER_LOCATIONS.map(ul => {
              const isSelected = userLoc === ul.id;
              return (
                <button
                  key={`user-${ul.id}`}
                  onClick={() => setUserLoc(ul.id)}
                  style={{ left: `${ul.coordinates.x}%`, top: `${ul.coordinates.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
                >
                  <span className={`absolute inline-flex h-4 w-4 rounded-full -left-2 -top-2 ${isSelected ? 'bg-amber-400/35 animate-ping' : 'bg-slate-400/10 group-hover:bg-amber-400/20'}`} />
                  <div className={`h-2.5 w-2.5 rounded-full border border-black shadow transition-all ${isSelected ? 'bg-amber-400 scale-125' : 'bg-slate-400 group-hover:bg-amber-300'}`} />
                  
                  {/* Tooltip */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0d0f19] text-[9px] font-bold font-sans text-slate-300 px-1.5 py-0.5 rounded border border-[#2e354f]/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                    User: {ul.name}
                  </div>
                </button>
              );
            })}

            {/* Render Data Centers as pulsing SRE diamonds */}
            {datacenters.map(dc => {
              const isSelected = selectedDC === dc.id;
              const isTargetDC = selectedTargetDC?.id === dc.id;
              const workloadColor = dc.activeWorkload > 80 ? 'bg-rose-500' : dc.activeWorkload > 50 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <button
                  key={`dc-${dc.id}`}
                  onClick={() => setSelectedDC(dc.id)}
                  style={{ left: `${dc.coordinates.x}%`, top: `${dc.coordinates.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
                >
                  {/* Highlighting target of simulation */}
                  {isTargetDC && (
                    <span className="absolute -left-4 -top-4 h-11 w-11 rounded-full bg-indigo-500/30 animate-pulse border border-indigo-400/20" />
                  )}
                  
                  <span className={`absolute inline-flex h-6 w-6 rounded-full -left-3 -top-3 ${isSelected ? 'bg-violet-500/30 animate-ping' : 'bg-transparent group-hover:bg-violet-500/10'}`} />
                  
                  {/* Cybernetic diamond shape */}
                  <div className={`h-3.5 w-3.5 rotate-45 border shadow-lg transition-all flex items-center justify-center ${
                    isSelected 
                      ? 'bg-violet-500 border-white scale-125' 
                      : 'bg-[#121524] border-violet-500/60 group-hover:border-violet-300'
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${workloadColor}`} />
                  </div>

                  {/* Small Name tag */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#121424] text-[8px] font-mono text-slate-300 px-1.5 py-0.5 rounded border border-[#2e354f]/50 whitespace-nowrap shadow-xl z-20 font-bold">
                    {dc.id}
                  </div>
                </button>
              );
            })}

            {/* Interactive World Map Key */}
            <div className="absolute bottom-4 left-4 bg-[#0a0b12]/90 border border-[#2e354f]/40 rounded-xl p-3 space-y-2 text-[10px] font-sans text-slate-400 shadow-lg z-10 max-w-[180px]">
              <div className="font-bold text-white border-b border-[#2e354f]/20 pb-1 mb-1 uppercase tracking-wider font-mono">Map Legend</div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span>User Locations (Simulated)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rotate-45 border border-violet-500/50 bg-[#121524]" />
                <span>K8s Cluster Node Hub</span>
              </div>
              <div className="flex items-center gap-1.5 pl-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>Load: Low / Med / Peak</span>
              </div>
            </div>

          </div>

          {/* Playground Simulation Control Center */}
          <div className="rounded-2xl border border-[#2e354f]/25 bg-[#121424]/60 p-5 space-y-4">
            <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400 animate-pulse" /> WAN Edge Routing Simulator
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* User Origin dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User Origin</label>
                <select
                  value={userLoc}
                  onChange={(e) => {
                    setUserLoc(e.target.value);
                    setTelemetryLogs([]);
                    setSelectedTargetDC(null);
                    setActiveRoute(null);
                  }}
                  className="w-full bg-[#0a0b12] border border-[#2e354f]/40 text-xs rounded-xl p-2 text-slate-200 outline-none focus:border-violet-500/50"
                >
                  {USER_LOCATIONS.map(ul => (
                    <option key={ul.id} value={ul.id}>{ul.name}</option>
                  ))}
                </select>
              </div>

              {/* Core Optimizer Policy */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Routing Policy</label>
                <div className="grid grid-cols-3 gap-1 bg-[#0a0b12] p-1 rounded-xl border border-[#2e354f]/40">
                  <button
                    onClick={() => { setPolicy('latency'); setTelemetryLogs([]); }}
                    title="Lowest Latency Policy"
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${policy === 'latency' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setPolicy('cost'); setTelemetryLogs([]); }}
                    title="Lowest Unit Cost Policy"
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${policy === 'cost' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setPolicy('carbon'); setTelemetryLogs([]); }}
                    title="Carbon-Aware Green Policy"
                    className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${policy === 'carbon' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Leaf className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Context / Prompt Token size slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Context Size</span>
                  <span className="text-violet-400">{contextSize} KB</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="32"
                  value={contextSize}
                  onChange={(e) => setContextSize(Number(e.target.value))}
                  className="w-full accent-violet-500 h-1 bg-[#0a0b12] rounded-lg appearance-none cursor-pointer mt-2"
                />
              </div>

              {/* Action Trigger */}
              <div className="flex items-end">
                <button
                  onClick={runSimulation}
                  disabled={simulating}
                  className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    simulating 
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/10'
                  }`}
                >
                  <Play className={`h-3.5 w-3.5 ${simulating ? 'animate-spin' : ''}`} />
                  <span>{simulating ? 'Inference Routing...' : 'Route WAN Prompt'}</span>
                </button>
              </div>

            </div>

            {/* Simulating Progress Bar */}
            {simulating && (
              <div className="w-full bg-[#0a0b12] h-1.5 rounded-full overflow-hidden border border-[#2e354f]/15">
                <div 
                  className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-full transition-all duration-350"
                  style={{ width: `${simProgress}%` }}
                />
              </div>
            )}

          </div>

        </div>

        {/* Dynamic Telemetry / Selected DC details */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* DC Health Inspect Card */}
          <div className="rounded-3xl border border-[#2e354f]/35 bg-[#101222]/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs text-slate-300 uppercase tracking-wider">Cluster Telemetry Node</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeDC.healthy ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'}`}>
                {activeDC.healthy ? '● HEALTHY' : '● OUTAGE'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base text-white">{activeDC.name}</h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Server className="h-3 w-3 text-slate-500" /> Regional Region: {activeDC.location}
              </p>
            </div>

            <div className="h-px bg-[#2e354f]/25" />

            {/* Telemetry Numbers */}
            <div className="grid grid-cols-2 gap-3.5 text-xs font-sans">
              <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Capacity</span>
                <p className="text-white font-mono font-medium truncate" title={activeDC.gpus}>{activeDC.gpus}</p>
              </div>

              <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Power Factor (PUE)</span>
                <p className="text-white font-mono font-medium flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" /> {activeDC.pue}
                </p>
              </div>

              <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Energy Source</span>
                <p className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500" /> {activeDC.energySource}
                </p>
              </div>

              <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Spot Compute Cost</span>
                <p className="text-amber-400 font-mono font-bold">
                  ${activeDC.costPerHr.toFixed(2)} /hr
                </p>
              </div>
            </div>

            {/* Workload Telemetry Indicator */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <span>GPU Cluster Utilization</span>
                <span className="font-mono text-white font-bold">{activeDC.activeWorkload}%</span>
              </div>
              <div className="w-full bg-[#0a0b12] h-2 rounded-full overflow-hidden border border-[#2e354f]/20">
                <div 
                  className={`h-full transition-all duration-300 ${
                    activeDC.activeWorkload > 80 
                      ? 'bg-rose-500' 
                      : activeDC.activeWorkload > 50 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${activeDC.activeWorkload}%` }}
                />
              </div>
            </div>

            {/* Ping delays table to User Locations */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Network Latency (RTT)</span>
              <div className="space-y-1.5 bg-[#0a0b12] p-2.5 rounded-xl border border-[#2e354f]/15 font-mono text-[11px]">
                {USER_LOCATIONS.map(ul => {
                  const ping = activeDC.pingMs[ul.id];
                  let latencyColor = 'text-emerald-400';
                  if (ping > 150) latencyColor = 'text-rose-400';
                  else if (ping > 70) latencyColor = 'text-amber-400';
                  return (
                    <div key={ul.id} className="flex justify-between items-center text-slate-400 py-0.5">
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-slate-500" /> {ul.name}
                      </span>
                      <span className={`font-bold ${latencyColor}`}>{ping}ms</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SRE Live WAN Console Terminal */}
          <div className="rounded-3xl border border-[#2e354f]/35 bg-[#090b14] p-5 space-y-3 font-mono text-xs flex flex-col h-[280px]">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-[#2e354f]/20">
              <span className="text-[10px] font-bold text-violet-400">WAN_ORCHESTRATOR_TELEMETRY</span>
              <span className="text-[9px] text-slate-500">v1.1</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none text-[11px]">
              {telemetryLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-1">
                  <Activity className="h-6 w-6 text-slate-700 animate-pulse" />
                  <span>Telemetry inactive.</span>
                  <span className="text-[9px]">Select a user origin and press "Route WAN Prompt" to trace packet flows.</span>
                </div>
              ) : (
                telemetryLogs.map((log, i) => {
                  let isSuccess = log.includes('SUCCESS');
                  let isPolicy = log.includes('POLICY');
                  return (
                    <div 
                      key={i} 
                      className={`leading-relaxed border-l-2 pl-2 animate-fade-in ${
                        isSuccess 
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 py-1 rounded-r-lg font-bold' 
                          : isPolicy 
                          ? 'border-violet-500 text-violet-300' 
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SRE Educational Info Accordion */}
      <div className="p-5 rounded-2xl bg-[#111322]/40 border border-[#2e354f]/15 space-y-4">
        <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-violet-400" /> SRE Playbook: Distributed AI Inference Architectures
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-400 leading-relaxed font-sans">
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">What is Multi-Region Routing?</h4>
            <p>
              Operating LLM inference clusters globally requires smart routing. Rather than executing models inside the user's nearest local region where power costs might be peak, we use global scheduling to delegate computations to green, carbon-aware datacenters under low-cost spot contracts.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">The Latency vs. Cost Trade-off</h4>
            <p>
              In SRE, RTT controls user happiness. US users querying Dublin (78ms) or Tokyo (158ms) endure higher Time-To-First-Token (TTFT). High-performance systems balance this by running low-latency speculative draft models at the edge and validating on central heavy GPU node-pools.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">WAN Traffic &amp; eBPF (Cilium)</h4>
            <p>
              Routing massive prompts over WAN causes network bottlenecks. Modern Kubernetes clusters use Cilium CNI with eBPF to direct packet transfers through encrypted secure IPSec/WireGuard tunnels at near-wire speeds, minimizing container-to-container routing overheads.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
