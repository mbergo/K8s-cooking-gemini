import React, { useState, useEffect } from 'react';
import { 
  Globe, Activity, Server, Zap, Cpu, Leaf, DollarSign, Clock, Play, ArrowRight, 
  ShieldAlert, Wifi, HelpCircle, Sliders, AlertTriangle, RefreshCw, PauseCircle, 
  PlayCircle, XCircle 
} from 'lucide-react';

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

interface TrainingLink {
  id: string;
  from: string;
  to: string;
  name: string;
  type: string;
}

const TRAINING_LINKS: TrainingLink[] = [
  { id: 'us-west-2<->us-east-1', from: 'us-west-2', to: 'us-east-1', name: 'Transcontinental (USA)', type: 'Terrestrial Fiber' },
  { id: 'us-east-1<->sa-east-1', from: 'us-east-1', to: 'sa-east-1', name: 'Pan-American Link', type: 'Subsea Cable' },
  { id: 'sa-east-1<->eu-west-1', from: 'sa-east-1', to: 'eu-west-1', name: 'Mid-Atlantic Link', type: 'Subsea Cable' },
  { id: 'eu-west-1<->asia-east-1', from: 'eu-west-1', to: 'asia-east-1', name: 'Eurasia Backbone', type: 'Terrestrial Fiber' },
  { id: 'asia-east-1<->us-west-2', from: 'asia-east-1', to: 'us-west-2', name: 'Transpacific Subsea Cable', type: 'Subsea Cable' },
];

export interface RouteHop {
  id: string;
  name: string;
  type: 'user' | 'datacenter';
  coordinates: { x: number; y: number };
  pingContributionMs: number;
  linkType: string;
}

const ROUTING_TABLE: Record<string, Record<string, string[]>> = {
  'new-york': {
    'us-east-1': ['us-east-1'],
    'us-west-2': ['us-east-1', 'us-west-2'],
    'eu-west-1': ['us-east-1', 'eu-west-1'],
    'sa-east-1': ['us-east-1', 'sa-east-1'],
    'asia-east-1': ['us-east-1', 'us-west-2', 'asia-east-1'],
  },
  'london': {
    'eu-west-1': ['eu-west-1'],
    'us-east-1': ['eu-west-1', 'us-east-1'],
    'us-west-2': ['eu-west-1', 'us-east-1', 'us-west-2'],
    'sa-east-1': ['eu-west-1', 'sa-east-1'],
    'asia-east-1': ['eu-west-1', 'asia-east-1'],
  },
  'tokyo': {
    'asia-east-1': ['asia-east-1'],
    'us-west-2': ['asia-east-1', 'us-west-2'],
    'us-east-1': ['asia-east-1', 'us-west-2', 'us-east-1'],
    'eu-west-1': ['asia-east-1', 'eu-west-1'],
    'sa-east-1': ['asia-east-1', 'us-west-2', 'sa-east-1'],
  },
  'sao-paulo': {
    'sa-east-1': ['sa-east-1'],
    'us-east-1': ['sa-east-1', 'us-east-1'],
    'us-west-2': ['sa-east-1', 'us-east-1', 'us-west-2'],
    'eu-west-1': ['sa-east-1', 'eu-west-1'],
    'asia-east-1': ['sa-east-1', 'us-east-1', 'us-west-2', 'asia-east-1'],
  },
  'sydney': {
    'asia-east-1': ['asia-east-1'],
    'us-west-2': ['us-west-2'],
    'us-east-1': ['us-west-2', 'us-east-1'],
    'eu-west-1': ['asia-east-1', 'eu-west-1'],
    'sa-east-1': ['us-west-2', 'us-east-1', 'sa-east-1'],
  }
};

export const ClusterMap: React.FC = () => {
  // Mode Tab: 'inference' or 'training'
  const [activeMode, setActiveMode] = useState<'inference' | 'training'>('inference');

  // Shared state: Datacenters
  const [datacenters, setDatacenters] = useState<DataCenter[]>(DATA_CENTERS);
  const [selectedDC, setSelectedDC] = useState<string>('us-east-1');

  // INFERENCE MODE STATE
  const [userLoc, setUserLoc] = useState<string>('new-york');
  const [policy, setPolicy] = useState<'latency' | 'cost' | 'carbon'>('latency');
  const [contextSize, setContextSize] = useState<number>(4); // in KB
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [activeRoute, setActiveRoute] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>({
    from: { x: 28, y: 38 }, // New York
    to: { x: 25, y: 42 } // us-east-1
  });
  const [activeHops, setActiveHops] = useState<RouteHop[]>([
    {
      id: 'new-york',
      name: 'Ingress (New York)',
      type: 'user',
      coordinates: { x: 28, y: 38 },
      pingContributionMs: 0,
      linkType: 'User Device Connection'
    },
    {
      id: 'us-east-1',
      name: 'us-east-1 (N. Virginia)',
      type: 'datacenter',
      coordinates: { x: 25, y: 42 },
      pingContributionMs: 12,
      linkType: 'Local Edge Ingress'
    }
  ]);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [selectedTargetDC, setSelectedTargetDC] = useState<DataCenter | null>(DATA_CENTERS[0]);

  // TRAINING MODE STATE
  const [isTraining, setIsTraining] = useState<boolean>(true);
  const [trainingStep, setTrainingStep] = useState<number>(5410);
  const [selectedLink, setSelectedLink] = useState<string>('us-east-1<->sa-east-1');
  const [linkCongestions, setLinkCongestions] = useState<Record<string, 'none' | 'moderate' | 'severe'>>({
    'us-west-2<->us-east-1': 'none',
    'us-east-1<->sa-east-1': 'none',
    'sa-east-1<->eu-west-1': 'none',
    'eu-west-1<->asia-east-1': 'none',
    'asia-east-1<->us-west-2': 'none',
  });
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);

  // Ticking workloads randomly (background simulation flavor)
  useEffect(() => {
    const interval = setInterval(() => {
      setDatacenters(prev =>
        prev.map(dc => {
          const delta = Math.floor(Math.random() * 7) - 3;
          const nextWorkload = Math.max(10, Math.min(95, dc.activeWorkload + delta));
          return { ...dc, activeWorkload: nextWorkload };
        })
      );
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Live step ticker for Distributed AI Training
  useEffect(() => {
    if (activeMode !== 'training' || !isTraining) return;

    const interval = setInterval(() => {
      setTrainingStep(prev => prev + 1);

      // Determine stats based on current link congestions
      let worstLinkName = '';
      let additionalOverhead = 0;
      let hasSevere = false;
      let hasModerate = false;

      Object.entries(linkCongestions).forEach(([linkId, level]) => {
        const linkObj = TRAINING_LINKS.find(l => l.id === linkId);
        const name = linkObj ? linkObj.name : linkId;
        if (level === 'severe') {
          additionalOverhead += 450;
          worstLinkName = name;
          hasSevere = true;
        } else if (level === 'moderate') {
          additionalOverhead += 120;
          if (!worstLinkName) worstLinkName = name;
          hasModerate = true;
        }
      });

      const baseOverhead = 32;
      const currentOverhead = baseOverhead + additionalOverhead;
      const efficiency = Math.max(6, Math.round(94 * (baseOverhead / currentOverhead)));
      const stepTimeSec = (1.2 * (currentOverhead / baseOverhead)).toFixed(2);
      const currentTflops = Math.max(50, Math.round(880 * (efficiency / 100)));

      // Generate highly realistic logs
      const timestamp = new Date().toLocaleTimeString();
      const newLogs: string[] = [];

      newLogs.push(`[${timestamp}] Ring-AllReduce Step #${trainingStep + 1} synchronized.`);

      if (hasSevere) {
        newLogs.push(`[${timestamp}] [CRITICAL] WAN Congestion on [${worstLinkName}] is causing massive packet loss!`);
        newLogs.push(`[${timestamp}] [STALL] Thread Barrier blocked: ALL GPUs sitting idle waiting for synchronization.`);
      } else if (hasModerate) {
        newLogs.push(`[${timestamp}] [WARNING] Inter-datacenter throughput bottleneck on [${worstLinkName}].`);
        newLogs.push(`[${timestamp}] [WARN] Latency jitter penalty added: +${additionalOverhead}ms synchronization delay.`);
      } else {
        newLogs.push(`[${timestamp}] All-Reduce Ring completed in optimal time (32ms global sync penalty).`);
      }

      newLogs.push(`[${timestamp}] TRAIN_STATS: Duration: ${stepTimeSec}s | Sync Overhead: ${currentOverhead}ms | Parallel Efficiency: ${efficiency}% | Net cluster TFLOPS: ${currentTflops}`);

      setTrainingLogs(prev => {
        const updated = [...prev, ...newLogs];
        return updated.slice(Math.max(0, updated.length - 20));
      });

    }, 2500);

    return () => clearInterval(interval);
  }, [activeMode, isTraining, linkCongestions, trainingStep]);

  // Run standard user inference prompt routing
  const runSimulation = () => {
    if (simulating) return;

    setSimulating(true);
    setSimProgress(0);
    setTelemetryLogs([]);
    
    const user = USER_LOCATIONS.find(u => u.id === userLoc)!;
    
    let targetDC = datacenters[0];

    if (policy === 'latency') {
      targetDC = [...datacenters].sort((a, b) => a.pingMs[userLoc] - b.pingMs[userLoc])[0];
    } else if (policy === 'cost') {
      targetDC = [...datacenters].sort((a, b) => a.costPerHr - b.costPerHr)[0];
    } else {
      const getCarbonScore = (dc: DataCenter) => {
        let score = 0;
        if (dc.energySource === 'Geothermal') score += 100;
        else if (dc.energySource === 'Hydro') score += 80;
        else if (dc.energySource === 'Solar/Wind') score += 90;
        else score += 30;
        score -= (dc.pue - 1.0) * 150;
        return score;
      };
      targetDC = [...datacenters].sort((a, b) => getCarbonScore(b) - getCarbonScore(a))[0];
    }

    setSelectedTargetDC(targetDC);
    setActiveRoute({
      from: user.coordinates,
      to: targetDC.coordinates
    });

    // Resolve dynamic multi-hop routing paths based on routing table
    const routeDcs = ROUTING_TABLE[userLoc]?.[targetDC.id] || [targetDC.id];
    const hopsList: RouteHop[] = [];

    // Hop 0: Ingress Point (User Location)
    hopsList.push({
      id: user.id,
      name: `Ingress (Client: ${user.name})`,
      type: 'user',
      coordinates: user.coordinates,
      pingContributionMs: 0,
      linkType: 'User Device Connection'
    });

    let currentParentPing = 0;
    const totalPing = targetDC.pingMs[userLoc];

    routeDcs.forEach((dcId, idx) => {
      const dcObj = datacenters.find(d => d.id === dcId) || datacenters[0];
      
      // Determine logical accumulative latency for this hop
      let segmentPing = 0;
      if (idx === 0) {
        segmentPing = Math.min(totalPing, dcObj.pingMs[userLoc] || 15);
      } else if (idx === routeDcs.length - 1) {
        segmentPing = totalPing;
      } else {
        segmentPing = Math.max(idx * 35, Math.floor(totalPing * ((idx + 1) / (routeDcs.length + 1))));
      }

      // Enforce strictly increasing RTT per hop
      if (segmentPing <= currentParentPing) {
        segmentPing = currentParentPing + Math.floor(Math.random() * 20) + 12;
      }
      // Never exceed total target DC ping
      if (idx < routeDcs.length - 1 && segmentPing >= totalPing) {
        segmentPing = Math.max(5, totalPing - 15);
      }

      const linkType = idx === 0 
        ? 'Local Edge Ingress' 
        : dcObj.pue < 1.15 ? 'Subsea Fiber Cable' : 'Terrestrial WAN Backbone';

      hopsList.push({
        id: dcObj.id,
        name: dcObj.name,
        type: 'datacenter',
        coordinates: dcObj.coordinates,
        pingContributionMs: segmentPing,
        linkType
      });

      currentParentPing = segmentPing;
    });

    setActiveHops(hopsList);

    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setTelemetryLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        setSimProgress(prev => Math.min(100, prev + 12));
      }, delay);
    };

    addLog(`INIT: User in ${user.name} requested multi-region AI inference (Context: ${contextSize}KB)`, 0);
    addLog(`POLICY: Orchestrator selected target node [${targetDC.name}] using policy [${policy.toUpperCase()}]`, 400);

    // Staggered traceroute hopping simulation logs
    hopsList.forEach((hop, idx) => {
      if (idx === 0) return;
      const segmentLag = hop.pingContributionMs;
      const prevHop = hopsList[idx - 1];
      const delay = 600 + idx * 450;
      addLog(`TRACEROUTE: Hop #${idx}: [${prevHop.id}] ➔ [${hop.id}] via ${hop.linkType} (Accumulated RTT: ${segmentLag}ms)`, delay);
    });

    const routeDelayOffset = 600 + hopsList.length * 450;
    
    const queueLatency = Math.floor(targetDC.activeWorkload * 0.4);
    const computeLatency = Math.floor(25 + contextSize * 3);
    const totalCompute = queueLatency + computeLatency;

    addLog(`COMPUTE: Enqueued on GPU Scheduler. Queue delay: ${queueLatency}ms. Executing prefill on ${targetDC.gpus.split(' ')[1]} tensor cores...`, routeDelayOffset + 300);
    addLog(`COMPUTE: Completed prefill & first-token generation in ${computeLatency}ms`, routeDelayOffset + 800);
    addLog(`STREAM: Initiated back-propagation stream. First chunk sent over CNI/Cilium mesh`, routeDelayOffset + 1300);
    
    const totalRtt = targetDC.pingMs[userLoc] + totalCompute;
    setTimeout(() => {
      setTelemetryLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] SUCCESS: Stream loaded in client browser! Total Time-To-First-Token (TTFT): ${totalRtt}ms.`
      ]);
      setSimProgress(100);
      setSimulating(false);
    }, routeDelayOffset + 1800);
  };

  const activeDC = datacenters.find(dc => dc.id === selectedDC) || datacenters[0];

  // Helper to resolve coordinates for datacenter IDs
  const getNodeCoords = (id: string) => {
    const dc = DATA_CENTERS.find(d => d.id === id);
    return dc ? dc.coordinates : { x: 50, y: 50 };
  };

  // Helper to analyze total current training metrics
  const getTrainingMetrics = () => {
    let additionalOverhead = 0;
    Object.values(linkCongestions).forEach(lvl => {
      if (lvl === 'severe') additionalOverhead += 450;
      else if (lvl === 'moderate') additionalOverhead += 120;
    });

    const baseOverhead = 32;
    const currentOverhead = baseOverhead + additionalOverhead;
    const efficiency = Math.max(6, Math.round(94 * (baseOverhead / currentOverhead)));
    const stepDuration = 1.2 * (currentOverhead / baseOverhead);
    const totalClusterTflops = Math.max(50, Math.round(880 * (efficiency / 100)));

    return {
      syncOverheadMs: currentOverhead,
      efficiency,
      stepDuration,
      tflops: totalClusterTflops
    };
  };

  const currentMetrics = getTrainingMetrics();

  // Helper to see if a datacenter is currently a straggler (due to any attached link being congested)
  const getDcTrainingStatus = (dcId: string) => {
    // Find links attached to this dc
    const attachedLinks = TRAINING_LINKS.filter(l => l.from === dcId || l.to === dcId);
    let worstCongestion = 'none';
    attachedLinks.forEach(l => {
      const level = linkCongestions[l.id];
      if (level === 'severe') worstCongestion = 'severe';
      else if (level === 'moderate' && worstCongestion !== 'severe') worstCongestion = 'moderate';
    });

    if (worstCongestion === 'severe') return 'stalled';
    if (worstCongestion === 'moderate') return 'waiting';
    return 'computing';
  };

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
            Real-time latency, power usage effectiveness (PUE), and distributed AI workloads across our global secure network.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#0b0d18] border border-[#2e354f]/40 p-1 rounded-xl">
          <button
            onClick={() => setActiveMode('inference')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'inference' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Inference Routing</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('training');
              if (trainingLogs.length === 0) {
                // Initialize clean logs
                const timestamp = new Date().toLocaleTimeString();
                setTrainingLogs([
                  `[${timestamp}] INIT: Global All-Reduce distributed training ring initialized.`,
                  `[${timestamp}] CLUSTER: 5 datacenter hubs connected over secure WAN fabrics.`,
                  `[${timestamp}] MODEL: Pre-training Llama-3-70B-Base on 1,024x unified H100 tensor nodes.`
                ]);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'training' 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Distributed Training</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Map & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Geographic Map Section */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative rounded-3xl border border-[#2e354f]/35 bg-[#0b0c16]/90 p-4 shadow-2xl overflow-hidden min-h-[420px]">
            {/* World Map SVG Canvas background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 1000 500" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              {activeMode === 'inference' ? 'Global Network Latency Graph' : 'All-Reduce Distributed Ring Mesh'}
            </div>

            {/* SVG Interactive Overlays (Pathways) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '400px' }}>
              {/* Render pathways according to Mode */}
              {activeMode === 'inference' ? (
                <>
                  {/* INFERENCE MULTI-HOP PATHS */}
                  {activeHops.map((hop, index) => {
                    if (index === 0) return null;
                    const prevHop = activeHops[index - 1];
                    return (
                      <g key={`hop-segment-${index}`}>
                        {/* Glow path */}
                        <line
                          x1={`${prevHop.coordinates.x}%`}
                          y1={`${prevHop.coordinates.y}%`}
                          x2={`${hop.coordinates.x}%`}
                          y2={`${hop.coordinates.y}%`}
                          stroke="url(#routeGlow)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="animate-pulse"
                        />
                        {/* Dotted path */}
                        <line
                          x1={`${prevHop.coordinates.x}%`}
                          y1={`${prevHop.coordinates.y}%`}
                          x2={`${hop.coordinates.x}%`}
                          y2={`${hop.coordinates.y}%`}
                          stroke="#10b981"
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                          style={{
                            animation: 'dash 15s linear infinite'
                          }}
                        />
                        {/* Moving packet dot */}
                        <circle r="4.5" fill="#c084fc">
                          <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={`M ${prevHop.coordinates.x * 8} ${prevHop.coordinates.y * 4} L ${hop.coordinates.x * 8} ${hop.coordinates.y * 4}`}
                            keyPoints="0;1"
                            keyTimes="0;1"
                          />
                        </circle>

                        {/* Connection metadata label (Hop Number) */}
                        {index < activeHops.length - 1 && (
                          <foreignObject
                            x={`${hop.coordinates.x}%`}
                            y={`${hop.coordinates.y - 7}%`}
                            width="60"
                            height="20"
                            className="overflow-visible pointer-events-none select-none"
                          >
                            <div className="flex justify-center -translate-x-1/2">
                              <span className="bg-violet-600/90 backdrop-blur border border-violet-400/40 text-white font-mono text-[7px] px-1 py-0.25 rounded shadow-lg font-bold uppercase tracking-wider">
                                Hop {index}
                              </span>
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}

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
                        strokeWidth="1.5"
                        strokeDasharray="2 3"
                        opacity="0.6"
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  {/* TRAINING RING PATHS */}
                  {TRAINING_LINKS.map(link => {
                    const fromCoords = getNodeCoords(link.from);
                    const toCoords = getNodeCoords(link.to);
                    const level = linkCongestions[link.id];

                    let strokeColor = '#3b82f6'; // Optimal / Blue
                    let strokeWidth = '3';
                    let dashArray = 'none';
                    let animationSpeed = '2.5s';

                    if (level === 'severe') {
                      strokeColor = '#f43f5e'; // Red
                      strokeWidth = '4.5';
                      dashArray = '5 5';
                      animationSpeed = '12s'; // Slow down dramatically
                    } else if (level === 'moderate') {
                      strokeColor = '#f59e0b'; // Amber
                      strokeWidth = '3.5';
                      dashArray = '4 3';
                      animationSpeed = '5.5s';
                    }

                    const isCurrentSelected = selectedLink === link.id;

                    return (
                      <g key={`train-path-${link.id}`}>
                        {/* Highlights if link is selected in controls */}
                        {isCurrentSelected && (
                          <line
                            x1={`${fromCoords.x}%`}
                            y1={`${fromCoords.y}%`}
                            x2={`${toCoords.x}%`}
                            y2={`${toCoords.y}%`}
                            stroke="#818cf8"
                            strokeWidth="10"
                            strokeLinecap="round"
                            opacity="0.12"
                            className="animate-pulse"
                          />
                        )}

                        {/* Backing structural link line */}
                        <line
                          x1={`${fromCoords.x}%`}
                          y1={`${fromCoords.y}%`}
                          x2={`${toCoords.x}%`}
                          y2={`${toCoords.y}%`}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={dashArray}
                          className="transition-all duration-500"
                        />

                        {/* Ring data transfer animated bullet packet */}
                        {isTraining && (
                          <circle r="4" fill={level === 'severe' ? '#fda4af' : level === 'moderate' ? '#fcd34d' : '#a78bfa'}>
                            <animateMotion
                              dur={animationSpeed}
                              repeatCount="indefinite"
                              path={`M ${fromCoords.x * 8} ${fromCoords.y * 4} L ${toCoords.x * 8} ${toCoords.y * 4}`}
                              keyPoints="0;1"
                              keyTimes="0;1"
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              <defs>
                <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#c084fc" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>

            {/* Render User Locations as gold dots (Inference Mode Only) */}
            {activeMode === 'inference' && USER_LOCATIONS.map(ul => {
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
              const isTargetDC = selectedTargetDC?.id === dc.id && activeMode === 'inference';
              
              // Training specific color indicators
              let nodeColorClass = 'bg-emerald-500';
              if (activeMode === 'training') {
                const trainingStatus = getDcTrainingStatus(dc.id);
                if (trainingStatus === 'stalled') nodeColorClass = 'bg-rose-500 animate-pulse';
                else if (trainingStatus === 'waiting') nodeColorClass = 'bg-amber-500 animate-pulse';
              } else {
                nodeColorClass = dc.activeWorkload > 80 ? 'bg-rose-500' : dc.activeWorkload > 50 ? 'bg-amber-500' : 'bg-emerald-500';
              }

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
                  <div className={`h-4 w-4 rotate-45 border shadow-lg transition-all flex items-center justify-center ${
                    isSelected 
                      ? 'bg-violet-500 border-white scale-125' 
                      : 'bg-[#121524] border-violet-500/60 group-hover:border-violet-300'
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${nodeColorClass}`} />
                  </div>

                  {/* Straggler warning sign */}
                  {activeMode === 'training' && getDcTrainingStatus(dc.id) === 'stalled' && (
                    <span className="absolute -top-5 left-3 bg-rose-500/90 text-white rounded-md px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-md">
                      STRAGGLER
                    </span>
                  )}

                  {/* Small Name tag */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#121424] text-[8px] font-mono text-slate-300 px-1.5 py-0.5 rounded border border-[#2e354f]/50 whitespace-nowrap shadow-xl z-20 font-bold">
                    {dc.id}
                  </div>
                </button>
              );
            })}

            {/* Interactive World Map Key */}
            <div className="absolute bottom-4 left-4 bg-[#0a0b12]/95 border border-[#2e354f]/50 rounded-xl p-3 space-y-2 text-[10px] font-sans text-slate-400 shadow-lg z-10 max-w-[210px]">
              <div className="font-bold text-white border-b border-[#2e354f]/20 pb-1 mb-1 uppercase tracking-wider font-mono">Map Legend</div>
              
              {activeMode === 'inference' ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>User Locations (Simulated)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 rotate-45 border border-violet-500/50 bg-[#121524]" />
                    <span>K8s Cluster Node Hub</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-0.5 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span>Inference Load: Low / Med / Peak</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="h-0.5 w-5 bg-emerald-400" />
                    <span>Ring Link (Optimal 32ms RTT)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-0.5 w-5 bg-amber-500" />
                    <span>Moderate Congestion (+120ms)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-0.5 w-5 bg-rose-500" />
                    <span>Critical WAN Delay (+450ms)</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-0.5 mt-1 pt-1 border-t border-[#2e354f]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Node Status: Computing</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Node Status: Waiting Sync</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Node Status: Blocked Straggler</span>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* DYNAMIC PLAYGROUND SIMULATION CONTROL CENTER */}
          {activeMode === 'inference' ? (
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

              {simulating && (
                <div className="w-full bg-[#0a0b12] h-1.5 rounded-full overflow-hidden border border-[#2e354f]/15">
                  <div 
                    className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-full transition-all duration-350"
                    style={{ width: `${simProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            // DISTRIBUTED TRAINING CONGESTION INJECTOR
            <div className="rounded-2xl border border-[#2e354f]/25 bg-[#121424]/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2e354f]/20">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-violet-400" />
                  <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                    Network Congestion &amp; Latency Injection
                  </h3>
                </div>

                {/* Preset macros */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mr-1">Macros:</span>
                  <button
                    onClick={() => {
                      setLinkCongestions({
                        'us-west-2<->us-east-1': 'none',
                        'us-east-1<->sa-east-1': 'none',
                        'sa-east-1<->eu-west-1': 'none',
                        'eu-west-1<->asia-east-1': 'none',
                        'asia-east-1<->us-west-2': 'none',
                      });
                      setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: Restored all fiber lines to peak sub-32ms optimal status.`]);
                    }}
                    className="px-2 py-1 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    Optimal Fiber
                  </button>
                  <button
                    onClick={() => {
                      setLinkCongestions(prev => ({
                        ...prev,
                        'us-east-1<->sa-east-1': 'severe',
                      }));
                      setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: Simulated fiber cut on Pan-American link! Expect massive straggler delays.`]);
                    }}
                    className="px-2 py-1 text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    Fiber Cut Cut
                  </button>
                  <button
                    onClick={() => {
                      setLinkCongestions({
                        'us-west-2<->us-east-1': 'moderate',
                        'us-east-1<->sa-east-1': 'moderate',
                        'sa-east-1<->eu-west-1': 'moderate',
                        'eu-west-1<->asia-east-1': 'moderate',
                        'asia-east-1<->us-west-2': 'moderate',
                      });
                      setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: BGP Route flapping storm globally. Network latency multiplied across all interfaces.`]);
                    }}
                    className="px-2 py-1 text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    BGP Flap Storm
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left side: Links select */}
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Target WAN Link
                  </label>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                    {TRAINING_LINKS.map(link => {
                      const isSelected = selectedLink === link.id;
                      const level = linkCongestions[link.id];
                      return (
                        <button
                          key={link.id}
                          onClick={() => setSelectedLink(link.id)}
                          className={`w-full text-left p-2 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                            isSelected 
                              ? 'bg-violet-600/25 border-violet-500 text-white' 
                              : 'bg-[#0a0b12] border-[#2e354f]/30 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div>
                            <p className="font-bold font-sans text-[11px]">{link.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">{link.type} | {link.id}</p>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            level === 'severe' 
                              ? 'bg-rose-500/25 text-rose-300' 
                              : level === 'moderate' 
                              ? 'bg-amber-500/25 text-amber-300' 
                              : 'bg-emerald-500/25 text-emerald-300'
                          }`}>
                            {level}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: Active congestion injection sliders */}
                <div className="md:col-span-7 bg-[#0a0b12] rounded-xl p-3 border border-[#2e354f]/30 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider font-mono">
                      Link Properties: {TRAINING_LINKS.find(l => l.id === selectedLink)?.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Simulate network degradation on this transatlantic or transpacific subsea pathway. This forces distributed training synchronization tasks to hold at synchronous collective barriers.
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Inject Congestion State</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          setLinkCongestions(prev => ({ ...prev, [selectedLink]: 'none' }));
                          setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: Restored selected Link [${selectedLink}] to optimal speed (none).`]);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans border transition-all cursor-pointer ${
                          linkCongestions[selectedLink] === 'none'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                            : 'bg-transparent border-[#2e354f]/30 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        None (Optimal)
                      </button>
                      <button
                        onClick={() => {
                          setLinkCongestions(prev => ({ ...prev, [selectedLink]: 'moderate' }));
                          setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: Injected moderate congestion (+120ms) on [${selectedLink}].`]);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans border transition-all cursor-pointer ${
                          linkCongestions[selectedLink] === 'moderate'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                            : 'bg-transparent border-[#2e354f]/30 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Moderate (+120ms)
                      </button>
                      <button
                        onClick={() => {
                          setLinkCongestions(prev => ({ ...prev, [selectedLink]: 'severe' }));
                          setTrainingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] COMMAND: Injected severe fiber cut simulation (+450ms) on [${selectedLink}].`]);
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans border transition-all cursor-pointer ${
                          linkCongestions[selectedLink] === 'severe'
                            ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                            : 'bg-transparent border-[#2e354f]/30 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        Severe (+450ms)
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Dynamic Telemetry / Selected DC details */}
        <div className="lg:col-span-4 space-y-4">
          
          {activeMode === 'inference' ? (
            <>
              {/* DC HEALTH CARD - INFERENCE MODE */}
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

              {/* DYNAMIC TRACEROUTE HOP PANEL */}
              <div className="rounded-3xl border border-[#2e354f]/35 bg-[#101222]/80 p-5 space-y-4 animate-fade-in" id="inference-routing-hops">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-violet-400" /> WAN Traceroute Path
                  </h3>
                  {activeHops.length > 0 && (
                    <span className="text-[9px] font-mono font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {activeHops.length - 1} Hops
                    </span>
                  )}
                </div>

                {activeHops.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 space-y-2">
                    <Activity className="h-6 w-6 text-slate-600 mx-auto animate-pulse" />
                    <p className="text-xs font-medium">No Active Route Path</p>
                    <p className="text-[9px] text-slate-600 max-w-[200px] mx-auto">
                      Initiate a "Route WAN Prompt" operation to compute the dynamic multi-hop routing paths.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 font-sans">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase font-mono pb-1 border-b border-[#2e354f]/15">
                      <span>Routing Node</span>
                      <span>Latency (RTT)</span>
                    </div>

                    <div className="relative pl-3 border-l-2 border-[#2e354f]/30 space-y-3.5">
                      {activeHops.map((hop, idx) => {
                        const isTarget = idx === activeHops.length - 1;
                        const isUser = idx === 0;
                        return (
                          <div key={`trace-hop-${idx}`} className="relative flex flex-col space-y-0.5">
                            {/* Pulsing indicator dot on the left line */}
                            <span className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full border border-[#0d0f19] shadow-md ${
                              isUser 
                                ? 'bg-amber-400' 
                                : isTarget 
                                ? 'bg-emerald-400 ring-2 ring-emerald-400/20' 
                                : 'bg-violet-400'
                            }`} />

                            <div className="flex justify-between items-start text-[11px]">
                              <div>
                                <p className="font-bold text-white leading-none">
                                  {isUser ? 'Edge Client Ingress' : isTarget ? `Target Node: ${hop.id}` : `WAN Hop Node: ${hop.id}`}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5">{hop.name}</p>
                              </div>
                              {idx > 0 && (
                                <span className="font-mono text-[9px] font-bold text-slate-300 bg-[#0a0b12] px-1.5 py-0.5 rounded border border-[#2e354f]/30">
                                  {hop.pingContributionMs}ms
                                </span>
                              )}
                            </div>

                            {idx < activeHops.length - 1 && (
                              <div className="text-[9px] text-indigo-400 font-mono italic flex items-center gap-1 pt-0.5">
                                <ArrowRight className="h-2 w-2" /> Medium: {activeHops[idx + 1].linkType}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2.5 border-t border-[#2e354f]/15 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400 font-medium">Path Loss Target RTT</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                        {activeHops[activeHops.length - 1]?.pingContributionMs}ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* DISTRIBUTED TRAINING MONITOR CARD - TRAINING MODE */
            <div className="rounded-3xl border border-[#2e354f]/35 bg-[#101222]/85 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-xs text-violet-400 uppercase tracking-wider">
                  LLM Pre-Training Monitor
                </h3>
                <button
                  onClick={() => setIsTraining(!isTraining)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isTraining 
                      ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' 
                      : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                  title={isTraining ? 'Pause Pre-Training' : 'Resume Pre-Training'}
                >
                  {isTraining ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                </button>
              </div>

              <div>
                <h4 className="font-display font-bold text-sm text-slate-100">Llama-3-70B-Base Pre-training</h4>
                <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-400">
                  <span className="font-bold text-violet-400">Step: #{trainingStep}</span>
                  <span>|</span>
                  <span className="text-emerald-400 flex items-center gap-0.5 animate-pulse">
                    <Activity className="h-3 w-3" /> Syncing Active
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#2e354f]/20" />

              {/* Training KPIs */}
              <div className="grid grid-cols-2 gap-3 font-sans">
                <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Sync Overhead</span>
                  <p className={`text-base font-mono font-bold mt-1 ${currentMetrics.syncOverheadMs > 200 ? 'text-rose-400' : currentMetrics.syncOverheadMs > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {currentMetrics.syncOverheadMs}ms
                  </p>
                </div>

                <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Duration / Step</span>
                  <p className="text-base font-mono font-bold mt-1 text-slate-200">
                    {currentMetrics.stepDuration.toFixed(2)}s
                  </p>
                </div>

                <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">TFLOPS Output</span>
                  <p className="text-base font-mono font-bold mt-1 text-slate-200 flex items-center gap-1">
                    <Cpu className="h-4 w-4 text-violet-400" /> {currentMetrics.tflops}
                  </p>
                </div>

                <div className="bg-[#0b0c16] p-2.5 rounded-xl border border-[#2e354f]/15">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Loss Value</span>
                  <p className="text-base font-mono font-bold mt-1 text-emerald-400">
                    2.8410
                  </p>
                </div>
              </div>

              {/* Parallel Training Efficiency Gauge */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Gradient Sync Parallel Efficiency</span>
                  <span className={`font-mono font-bold ${currentMetrics.efficiency < 30 ? 'text-rose-400' : currentMetrics.efficiency < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {currentMetrics.efficiency}%
                  </span>
                </div>
                <div className="w-full bg-[#0a0b12] h-2 rounded-full overflow-hidden border border-[#2e354f]/20">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      currentMetrics.efficiency < 30 
                        ? 'bg-rose-500' 
                        : currentMetrics.efficiency < 70 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${currentMetrics.efficiency}%` }}
                  />
                </div>
                {currentMetrics.efficiency < 40 && (
                  <p className="text-[9px] text-rose-400 font-bold flex items-center gap-1 mt-1 animate-pulse">
                    <AlertTriangle className="h-3 w-3" /> Core GPU Straggler Bottleneck Active!
                  </p>
                )}
              </div>

              {/* Real-time individual nodes status list */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Cluster Node Synchronization Status</span>
                <div className="space-y-1 bg-[#0a0b12] p-2.5 rounded-xl border border-[#2e354f]/15 text-[10px] font-mono">
                  {datacenters.map(dc => {
                    const status = getDcTrainingStatus(dc.id);
                    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    let label = 'COMPUTING';
                    
                    if (status === 'stalled') {
                      badgeColor = 'bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse';
                      label = 'BLOCKED / STRAGGLER';
                    } else if (status === 'waiting') {
                      badgeColor = 'bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse';
                      label = 'WAITING FOR RING';
                    }

                    return (
                      <div key={dc.id} className="flex justify-between items-center py-1 border-b border-[#2e354f]/10 last:border-0">
                        <span className="text-slate-300 font-bold font-sans">{dc.id}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[8px] font-mono ${badgeColor}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* SRE LIVE CONSOLE TERMINAL */}
          <div className="rounded-3xl border border-[#2e354f]/35 bg-[#090b14] p-5 space-y-3 font-mono text-xs flex flex-col h-[280px]">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-[#2e354f]/20">
              <span className="text-[10px] font-bold text-violet-400">
                {activeMode === 'inference' ? 'WAN_ORCHESTRATOR_TELEMETRY' : 'DISTRIBUTED_TRAINING_ALLREDUCE'}
              </span>
              <span className="text-[9px] text-slate-500">v1.2</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none text-[11px]">
              {activeMode === 'inference' ? (
                telemetryLogs.length === 0 ? (
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
                )
              ) : (
                trainingLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-1">
                    <Activity className="h-6 w-6 text-slate-700 animate-pulse" />
                    <span>Awaiting initial training packet synchronizer.</span>
                  </div>
                ) : (
                  trainingLogs.map((log, i) => {
                    let isCritical = log.includes('[CRITICAL]');
                    let isWarning = log.includes('[WARNING]') || log.includes('[WARN]');
                    let isStats = log.includes('TRAIN_STATS');
                    
                    let styleClass = 'border-slate-700 text-slate-400';
                    if (isCritical) {
                      styleClass = 'border-rose-500 text-rose-400 bg-rose-500/5 py-0.5 font-bold';
                    } else if (isWarning) {
                      styleClass = 'border-amber-500 text-amber-400';
                    } else if (isStats) {
                      styleClass = 'border-violet-500 text-violet-300 font-bold';
                    }

                    return (
                      <div 
                        key={i} 
                        className={`leading-relaxed border-l-2 pl-2 animate-fade-in ${styleClass}`}
                      >
                        {log}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SRE Educational Info Accordion */}
      <div className="p-5 rounded-2xl bg-[#111322]/40 border border-[#2e354f]/15 space-y-4">
        <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-violet-400" /> SRE Playbook: Distributed AI Training &amp; WAN Network Spikes
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-400 leading-relaxed font-sans">
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">The Synchronous All-Reduce Barrier</h4>
            <p>
              In large distributed training runs (like a 70B parameter model split across continents), nodes regularly exchange and average gradients using collective communication protocols (Ring-AllReduce). Every node is bound by a synchronous barrier: training cannot proceed to the next backprop step until all nodes finish averaging weights.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">How Latency Spikes Cause "Stragglers"</h4>
            <p>
              If a single WAN subsea cable experiences fiber cut packet retransmits or high BGP route-flapping latency, the node on that path becomes a "straggler." Because every node is synchronized, a 10x latency spike on one link causes all other multi-million-dollar GPU clusters around the world to sit idle, wasting energy and dropping TFLOPS efficiency.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-200">Mitigation Tactics</h4>
            <p>
              To tackle WAN stragglers, SREs employ pipeline parallelism with dynamic buffer queues, gradient compression (sparsification or INT8 quantization), and asynchronous or decentralized training topology strategies. Additionally, failover policies are put in place to automatically bypass cut subsea links by routing through alternate terrestrial fibers.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
