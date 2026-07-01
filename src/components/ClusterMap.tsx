import React, { useState, useEffect } from 'react';
import { 
  Globe, Activity, Server, Zap, Cpu, Leaf, DollarSign, Clock, Play, ArrowRight, 
  ShieldAlert, Wifi, HelpCircle, Sliders, AlertTriangle, RefreshCw, PauseCircle, 
  PlayCircle, XCircle, GitBranch, Database, Cloud, Terminal, Layers, Lock, Shield
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
  // Mode Tab: 'inference' or 'training' or 'airbnb'
  const [activeMode, setActiveMode] = useState<'inference' | 'training' | 'airbnb'>('inference');

  // Shared state: Datacenters
  const [datacenters, setDatacenters] = useState<DataCenter[]>(DATA_CENTERS);
  const [selectedDC, setSelectedDC] = useState<string>('us-east-1');

  // GPU Threshold Notification State
  const [gpuAlertThreshold, setGpuAlertThreshold] = useState<number>(75);
  const [alertsHistory, setAlertsHistory] = useState<{
    id: string;
    dcId: string;
    dcName: string;
    workload: number;
    timestamp: string;
    type: 'warning' | 'critical';
  }[]>([]);

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
  const [serviceMeshEnabled, setServiceMeshEnabled] = useState<boolean>(false);

  // AIRBNB MULTI-CLOUD GITOPS & APACHE OSS STATE
  const [airbnbCase, setAirbnbCase] = useState<'pricing' | 'search' | 'reviews'>('pricing');
  const [activeCloud, setActiveCloud] = useState<'gcp' | 'aws' | 'azure'>('gcp');
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'connections' | 'apache-oss'>('overview');
  const [airbnbSimulating, setAirbnbSimulating] = useState<boolean>(false);
  const [airbnbSimProgress, setAirbnbSimProgress] = useState<number>(0);
  const [airbnbLogs, setAirbnbLogs] = useState<string[]>([]);

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

  // Monitor GPU activeWorkload against gpuAlertThreshold to trigger visual alerts
  useEffect(() => {
    const activeBreaches = datacenters.filter(dc => dc.activeWorkload > gpuAlertThreshold);
    if (activeBreaches.length === 0) return;

    setAlertsHistory(prev => {
      const now = Date.now();
      const updated = [...prev];
      let addedAny = false;

      activeBreaches.forEach(dc => {
        // Prevent spamming alerts within a 12-second window for the same cluster node
        const isDuplicate = prev.some(
          a => a.dcId === dc.id && (now - new Date(a.timestamp).getTime()) < 12000
        );

        if (!isDuplicate) {
          updated.unshift({
            id: `${dc.id}-${now}`,
            dcId: dc.id,
            dcName: dc.name,
            workload: dc.activeWorkload,
            timestamp: new Date().toLocaleTimeString(),
            type: dc.activeWorkload > 85 ? 'critical' : 'warning',
          });
          addedAny = true;
        }
      });

      if (addedAny) {
        // Keep last 15 alerts to avoid buffer overload
        return updated.slice(0, 15);
      }
      return prev;
    });
  }, [datacenters, gpuAlertThreshold]);

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

  // Run Airbnb GitOps Multi-Cloud and Apache OSS Pipeline Routing
  const runAirbnbSimulation = () => {
    if (airbnbSimulating) return;
    setAirbnbSimulating(true);
    setAirbnbSimProgress(0);
    setAirbnbLogs([]);

    const timestamp = () => `[${new Date().toLocaleTimeString()}]`;

    const addLog = (msg: string, delay: number, progressValue: number) => {
      setTimeout(() => {
        setAirbnbLogs(prev => [...prev, `${timestamp()} ${msg}`]);
        setAirbnbSimProgress(progressValue);
      }, delay);
    };

    // Phase 1: GitOps Repo Push
    addLog("GITOPS [SOURCE]: Airbnb code push detected on branch 'main'. Triggering automated dynamic pricing weights deploy.", 100, 10);
    addLog("GITOPS [DECLARATION]: Declarative Helm/Kustomize manifest checked. Deploying to target AWS / GCP / Azure clusters.", 600, 20);

    // Phase 2: Apache Airflow Orchestration
    addLog("APACHE AIRFLOW: Triggered model validation and distribution DAG. Executing unit tests & checking GPU capacity.", 1100, 30);
    addLog("APACHE AIRFLOW: Validated weights deployed. Pushing to multi-region cloud object storages (GCS / S3 / Azure Blob).", 1650, 45);

    // Phase 3: Cloud Provider k8s deploy
    const providerName = activeCloud.toUpperCase();
    const k8sSvc = activeCloud === 'gcp' ? 'GKE (Google Kubernetes Engine)' : activeCloud === 'aws' ? 'EKS (Amazon Elastic Kubernetes Service)' : 'AKS (Azure Kubernetes Service)';
    addLog(`${providerName}: Rolling update completed on ${k8sSvc}. GPU pods scaled up and ready.`, 2200, 58);

    // Phase 4: Kafka ingestion & APISIX routing
    const businessCaseDesc = airbnbCase === 'pricing' 
      ? 'Dynamic Pricing Engine request' 
      : airbnbCase === 'search' 
      ? 'Vector Search Matcher request' 
      : 'Review Summary Translation request';
    addLog(`APACHE KAFKA: Guest clickstream captured. Stream serialized [Avro] and published to dynamic topic 'airbnb-realtime-events'.`, 2800, 70);
    addLog(`APACHE APISIX: Enterprise API Gateway resolved dynamic load-balancing. Routing [${businessCaseDesc}] to the closest target hub.`, 3400, 80);

    // Phase 5: Spark + Cassandra feature hydrator + inference
    const gpuNode = activeCloud === 'gcp' ? 'GCP Cloud TPU v5e Node' : activeCloud === 'aws' ? 'AWS EC2 p5.48xlarge (NVIDIA H100)' : 'Azure NDv5 Tensor Node';
    addLog("APACHE SPARK: Parallel feature pipeline prepared user demographic and historic search embeddings.", 4050, 88);
    addLog("APACHE CASSANDRA: Dynamic feature lookup completed in 1.1ms. Transmitting tensors to model server.", 4600, 94);
    addLog(`COMPUTE [${providerName}]: Dynamic forward pass execution on ${gpuNode} completed. Generating response tokens.`, 5200, 98);

    // Phase 6: Delivered to guest
    const userLocationName = USER_LOCATIONS.find(ul => ul.id === userLoc)?.name || 'New York';
    addLog(`SUCCESS [AIRBNB]: Dynamic guest response delivered safely in ${userLocationName}! Total network hop-count: 6. Path latency RTT: ${140 + Math.floor(Math.random() * 45)}ms.`, 5800, 100);

    setTimeout(() => {
      setAirbnbSimulating(false);
    }, 5900);
  };

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
    if (serviceMeshEnabled) {
      addLog(`MESH: mTLS tunnels active. Envoy sidecar handshake initiated using ECDHE-ECDSA-AES128-GCM-SHA256`, 200);
    }
    addLog(`POLICY: Orchestrator selected target node [${targetDC.name}] using policy [${policy.toUpperCase()}]`, 400);

    // Staggered traceroute hopping simulation logs
    hopsList.forEach((hop, idx) => {
      if (idx === 0) return;
      const segmentLag = hop.pingContributionMs;
      const prevHop = hopsList[idx - 1];
      const delay = 600 + idx * 550;
      addLog(`TRACEROUTE: Hop #${idx}: [${prevHop.id}] ➔ [${hop.id}] via ${hop.linkType} (Accumulated RTT: ${segmentLag}ms)`, delay);
      if (serviceMeshEnabled) {
        const sidecarLatency = (0.22 + Math.random() * 0.15).toFixed(2);
        addLog(`MESH: [${hop.id}] Envoy sidecar proxy active. Mutual TLS tunnel encrypted. Latency overhead: +${sidecarLatency}ms`, delay + 250);
      }
    });

    const routeDelayOffset = 600 + hopsList.length * 550;
    
    const queueLatency = Math.floor(targetDC.activeWorkload * 0.4);
    const computeLatency = Math.floor(25 + contextSize * 3);
    const totalCompute = queueLatency + computeLatency;

    addLog(`COMPUTE: Enqueued on GPU Scheduler. Queue delay: ${queueLatency}ms. Executing prefill on ${targetDC.gpus.split(' ')[1]} tensor cores...`, routeDelayOffset + 300);
    if (serviceMeshEnabled) {
      addLog(`MESH: Local sidecar proxy routing decapsulated request from [ingress-gateway] to [model-server] port 8000 (+0.12ms)`, routeDelayOffset + 450);
    }
    addLog(`COMPUTE: Completed prefill & first-token generation in ${computeLatency}ms`, routeDelayOffset + 800);
    addLog(`STREAM: Initiated back-propagation stream. First chunk sent over CNI/Cilium mesh`, routeDelayOffset + 1300);
    if (serviceMeshEnabled) {
      addLog(`MESH: mTLS session verified for egress chunk streams. All 12 dynamic microservice pods secured.`, routeDelayOffset + 1500);
    }
    
    const totalRtt = targetDC.pingMs[userLoc] + totalCompute;
    setTimeout(() => {
      setTelemetryLogs(prev => {
        const list = [
          ...prev,
          `[${new Date().toLocaleTimeString()}] SUCCESS: Stream loaded in client browser! Total Time-To-First-Token (TTFT): ${totalRtt}ms.`
        ];
        if (serviceMeshEnabled) {
          list.push(`[${new Date().toLocaleTimeString()}] MESH SECURITY: 100% of packets routed through mTLS tunnels. Total sidecar proxy latency overhead: ${(0.3 + hopsList.length * 0.25).toFixed(2)}ms.`);
        }
        return list;
      });
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

  const selectedUserObj = USER_LOCATIONS.find(ul => ul.id === userLoc) || USER_LOCATIONS[0];
  const cloudDC = activeCloud === 'gcp' ? DATA_CENTERS.find(d => d.id === 'us-west-2')! : activeCloud === 'aws' ? DATA_CENTERS.find(d => d.id === 'us-east-1')! : DATA_CENTERS.find(d => d.id === 'eu-west-1')!;

  const AIRBNB_NODES = [
    { 
      id: 'gitops', 
      name: 'GitOps (Airbnb Main Branch)', 
      label: 'GitOps Source', 
      coordinates: { x: 5, y: 15 }, 
      icon: 'gitops', 
      glowColor: 'rgba(239, 68, 68, 0.4)', 
      color: '#ef4444', 
      desc: 'Airbnb main codebase & pipeline configurations. Deploys declarative state automatically via continuous integration.' 
    },
    { 
      id: 'airflow', 
      name: 'Apache Airflow (DAG Workflow)', 
      label: 'Airflow Scheduler', 
      coordinates: { x: 14, y: 18 }, 
      icon: 'airflow', 
      glowColor: 'rgba(6, 182, 212, 0.4)', 
      color: '#06b6d4', 
      desc: 'Orchestrates machine learning pipeline stages, weights deployment, and unit testing runs on remote K8s pods.' 
    },
    { 
      id: 'cloud', 
      name: `${activeCloud.toUpperCase()} Cluster Node: ${cloudDC.name}`, 
      label: `${activeCloud.toUpperCase()} Kubernetes Compute`, 
      coordinates: cloudDC.coordinates, 
      icon: 'cloud', 
      glowColor: activeCloud === 'gcp' ? 'rgba(52, 211, 153, 0.4)' : activeCloud === 'aws' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)', 
      color: activeCloud === 'gcp' ? '#34d399' : activeCloud === 'aws' ? '#f59e0b' : '#38bdf8', 
      desc: `Containerized inference host running specialized GPU nodes (${cloudDC.gpus}) powered by ${activeCloud === 'gcp' ? 'Vertex AI' : activeCloud === 'aws' ? 'Amazon SageMaker' : 'Azure Machine Learning'}.` 
    },
    { 
      id: 'kafka', 
      name: 'Apache Kafka Event Streams', 
      label: 'Kafka Message Bus', 
      coordinates: { x: 22, y: 28 }, 
      icon: 'kafka', 
      glowColor: 'rgba(245, 158, 11, 0.4)', 
      color: '#f59e0b', 
      desc: 'Ingests clickstream metrics and user booking/search query logs across Airbnb’s real-time events pipeline with high-throughput buffers.' 
    },
    { 
      id: 'apisix', 
      name: 'Apache APISIX Enterprise Gateway', 
      label: 'APISIX Router Gateway', 
      coordinates: { x: 26, y: 38 }, 
      icon: 'apisix', 
      glowColor: 'rgba(167, 139, 250, 0.4)', 
      color: '#a78bfa', 
      desc: 'High-performance API Gateway routing live user requests with advanced rate-limiting, TLS-offloading, and smart multi-cloud canary capabilities.' 
    },
    { 
      id: 'cassandra', 
      name: 'Cassandra DB & Spark Engines', 
      label: 'Feature Store & Lakehouse', 
      coordinates: { x: 34, y: 56 }, 
      icon: 'cassandra', 
      glowColor: 'rgba(45, 212, 191, 0.4)', 
      color: '#2dd4bf', 
      desc: 'Spark processes massive datasets to build sparse profile embeddings. Cassandra serves real-time dynamic properties to model engines.' 
    },
    { 
      id: 'user', 
      name: `Guest Browser: Airbnb Client`, 
      label: `Guest (${selectedUserObj.name})`, 
      coordinates: selectedUserObj.coordinates, 
      icon: 'user', 
      glowColor: 'rgba(234, 179, 8, 0.4)', 
      color: '#eab308', 
      desc: 'Guest searches for a homestay, triggers real-time recommendation, translation, and localized pricing calculation.' 
    }
  ];

  const AIRBNB_CONNECTIONS = [
    { from: 'gitops', to: 'airflow', label: 'Trigger DAG (GitOps)', delayStart: 0, delayEnd: 25 },
    { from: 'airflow', to: 'cloud', label: 'Kubernetes Rolling Update', delayStart: 15, delayEnd: 55 },
    { from: 'user', to: 'kafka', label: 'Stream Search Query (JSON)', delayStart: 45, delayEnd: 70 },
    { from: 'kafka', to: 'apisix', label: 'Queue Payload', delayStart: 60, delayEnd: 78 },
    { from: 'apisix', to: 'cloud', label: 'Route Load-balanced POST', delayStart: 72, delayEnd: 86 },
    { from: 'cloud', to: 'cassandra', label: 'Fetch Guest Embeddings', delayStart: 80, delayEnd: 95 },
    { from: 'cloud', to: 'user', label: 'Inference Stream (SSE/JSON)', delayStart: 90, delayEnd: 100 }
  ];

  const getAirbnbNodeCoords = (id: string) => {
    const node = AIRBNB_NODES.find(n => n.id === id);
    return node ? node.coordinates : { x: 50, y: 50 };
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
          <button
            onClick={() => {
              setActiveMode('airbnb');
              if (airbnbLogs.length === 0) {
                const timestampStr = new Date().toLocaleTimeString();
                setAirbnbLogs([
                  `[${timestampStr}] SYSTEM: Ready to simulate Airbnb dynamic pricing & vector search routing pipeline.`,
                  `[${timestampStr}] CONFIG: Choose cloud provider (AWS/GCP/Azure) and business case above, then run simulation.`
                ]);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'airbnb' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Airbnb GitOps Routing</span>
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
                          stroke={serviceMeshEnabled ? "#10b981" : "url(#routeGlow)"}
                          strokeWidth={serviceMeshEnabled ? "4.5" : "3.5"}
                          strokeLinecap="round"
                          opacity={serviceMeshEnabled ? 0.7 : 1}
                          className="animate-pulse"
                        />
                        {/* Dotted path */}
                        <line
                          x1={`${prevHop.coordinates.x}%`}
                          y1={`${prevHop.coordinates.y}%`}
                          x2={`${hop.coordinates.x}%`}
                          y2={`${hop.coordinates.y}%`}
                          stroke={serviceMeshEnabled ? "#34d399" : "#10b981"}
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                          style={{
                            animation: 'dash 15s linear infinite'
                          }}
                        />
                        {/* mTLS glowing outer shield */}
                        {serviceMeshEnabled && (
                          <line
                            x1={`${prevHop.coordinates.x}%`}
                            y1={`${prevHop.coordinates.y}%`}
                            x2={`${hop.coordinates.x}%`}
                            y2={`${hop.coordinates.y}%`}
                            stroke="#059669"
                            strokeWidth="9"
                            strokeLinecap="round"
                            opacity="0.18"
                          />
                        )}
                        {/* Moving packet dot */}
                        <circle r="4.5" fill={serviceMeshEnabled ? "#10b981" : "#c084fc"}>
                          <animateMotion
                            dur="2s"
                            repeatCount="indefinite"
                            path={`M ${prevHop.coordinates.x * 8} ${prevHop.coordinates.y * 4} L ${hop.coordinates.x * 8} ${hop.coordinates.y * 4}`}
                            keyPoints="0;1"
                            keyTimes="0;1"
                          />
                        </circle>

                        {/* mTLS badge midpoint lock */}
                        {serviceMeshEnabled && (
                          <foreignObject
                            x={`${(prevHop.coordinates.x + hop.coordinates.x) / 2}%`}
                            y={`${(prevHop.coordinates.y + hop.coordinates.y) / 2}%`}
                            width="42"
                            height="22"
                            className="overflow-visible pointer-events-none select-none"
                          >
                            <div className="flex justify-center -translate-x-1/2 -translate-y-1/2">
                              <span className="bg-emerald-950/95 border border-emerald-500/80 text-emerald-400 text-[7px] font-mono font-extrabold px-1 py-0.5 rounded shadow-lg flex items-center gap-0.5 animate-pulse">
                                <Lock className="h-1.5 w-1.5" />
                                <span>mTLS</span>
                              </span>
                            </div>
                          </foreignObject>
                        )}

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
              ) : activeMode === 'airbnb' ? (
                <>
                  {/* AIRBNB GITOPS & APACHE MULTI-CLOUD PATHS */}
                  {AIRBNB_CONNECTIONS.map((conn, idx) => {
                    const fromCoords = getAirbnbNodeCoords(conn.from);
                    const toCoords = getAirbnbNodeCoords(conn.to);
                    
                    // Determine if this segment is actively firing in the simulation progress
                    const isFiring = airbnbSimulating && 
                                     airbnbSimProgress >= conn.delayStart && 
                                     airbnbSimProgress <= conn.delayEnd;
                    
                    const strokeColor = isFiring ? '#fb7185' : '#334155';
                    const strokeWidth = isFiring ? '4' : '1.5';
                    const glowOpacity = isFiring ? '0.8' : '0.15';
                    const dashArray = isFiring ? '4 2' : '4 4';
                    const animSpeed = isFiring ? '1s' : '5s';

                    return (
                      <g key={`airbnb-conn-${idx}`}>
                        {/* Glow / Halo Line */}
                        <line
                          x1={`${fromCoords.x}%`}
                          y1={`${fromCoords.y}%`}
                          x2={`${toCoords.x}%`}
                          y2={`${toCoords.y}%`}
                          stroke={isFiring ? '#fda4af' : '#1e293b'}
                          strokeWidth={isFiring ? '6' : '3'}
                          strokeLinecap="round"
                          opacity={glowOpacity}
                          className={isFiring ? "animate-pulse" : ""}
                        />
                        {/* Core Line */}
                        <line
                          x1={`${fromCoords.x}%`}
                          y1={`${fromCoords.y}%`}
                          x2={`${toCoords.x}%`}
                          y2={`${toCoords.y}%`}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={dashArray}
                          style={{
                            animation: `dash ${animSpeed} linear infinite`
                          }}
                        />
                        {/* Animated packet node flowing */}
                        <circle r={isFiring ? "5" : "3"} fill={isFiring ? "#f43f5e" : "#475569"}>
                          <animateMotion
                            dur={isFiring ? "1s" : "4s"}
                            repeatCount="indefinite"
                            path={`M ${fromCoords.x * 8} ${fromCoords.y * 4} L ${toCoords.x * 8} ${toCoords.y * 4}`}
                            keyPoints="0;1"
                            keyTimes="0;1"
                          />
                        </circle>
                      </g>
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
                  
                  {serviceMeshEnabled && isSelected && (
                    <>
                      <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full border border-dashed border-emerald-400/60 animate-spin" style={{ animationDuration: '8s' }} />
                      <span className="absolute -top-[22px] left-1/2 -translate-x-1/2 bg-emerald-950/95 border border-emerald-500/40 rounded px-1 py-0.25 text-[6px] font-mono font-bold whitespace-nowrap shadow-md uppercase tracking-wider text-emerald-400">
                        Proxy +0.32ms
                      </span>
                    </>
                  )}

                  <div className={`h-2.5 w-2.5 rounded-full border border-black shadow transition-all ${isSelected ? 'bg-amber-400 scale-125' : 'bg-slate-400 group-hover:bg-amber-300'}`} />
                  
                  {/* Tooltip */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0d0f19] text-[9px] font-bold font-sans text-slate-300 px-1.5 py-0.5 rounded border border-[#2e354f]/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                    User: {ul.name}
                  </div>
                </button>
              );
            })}

            {/* Render Data Centers as pulsing SRE diamonds */}
            {activeMode !== 'airbnb' && datacenters.map(dc => {
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

                  {/* GPU utilization exceeded alert rings */}
                  {dc.activeWorkload > gpuAlertThreshold && (
                    <>
                      <span className="absolute -left-5 -top-5 h-10 w-10 rounded-full border border-rose-500 animate-ping opacity-60" style={{ animationDuration: '2s' }} />
                      <span className="absolute -left-4.5 -top-4.5 h-9 w-9 rounded-full border border-rose-500/40 animate-pulse" />
                      
                      {/* Floating alert triangle badge */}
                      <span className="absolute -top-7 -right-3 bg-rose-600 text-white border border-rose-400 rounded-full p-0.5 text-[8px] font-bold shadow-lg animate-bounce z-40">
                        <AlertTriangle className="h-2.5 w-2.5" />
                      </span>
                    </>
                  )}
                  
                  {/* Service Mesh Envoy Sidecar Proxy visualization */}
                  {activeMode === 'inference' && serviceMeshEnabled && activeHops.some(h => h.id === dc.id) && (
                    <>
                      <span className="absolute -left-5 -top-5 h-10 w-10 rounded-full border border-dashed border-emerald-400/80 animate-spin opacity-80" style={{ animationDuration: '6s' }} />
                      <span className="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full bg-emerald-500/5 border border-emerald-500/20 animate-pulse" />
                      
                      {/* Sidecar Proxy microsecond latency badge */}
                      <span className="absolute -top-[24px] left-1/2 -translate-x-1/2 bg-emerald-950/95 text-emerald-400 border border-emerald-500/40 rounded px-1 py-0.25 text-[6px] font-mono font-bold whitespace-nowrap shadow-md uppercase tracking-wider z-30">
                        Envoy +0.24ms
                      </span>
                    </>
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

                  {/* Detailed Kubernetes SRE Popover Tooltip */}
                  <div className={`absolute bottom-6 ${
                    dc.coordinates.x < 25 
                      ? 'left-0 translate-x-0' 
                      : dc.coordinates.x > 75 
                        ? 'right-0 -translate-x-full' 
                        : 'left-1/2 -translate-x-1/2'
                  } w-64 bg-[#060810]/98 border border-[#2e354f] rounded-2xl p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-200 origin-bottom scale-90 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto z-50 text-left space-y-2.5`}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#2e354f]/40 pb-2">
                      <div>
                        <div className="text-[10px] font-bold text-violet-400 font-mono flex items-center gap-1 uppercase tracking-wider">
                          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                            dc.activeWorkload > gpuAlertThreshold ? 'bg-rose-500' : 'bg-emerald-500'
                          }`} />
                          k8s-{dc.id}
                        </div>
                        <div className="text-[9px] text-slate-400 font-sans font-medium">{dc.name}</div>
                      </div>
                      <span className="text-[8px] font-mono bg-[#1c2035]/60 text-indigo-300 border border-[#2e354f]/30 px-1.5 py-0.5 rounded uppercase font-semibold">
                        v1.28-GKE
                      </span>
                    </div>

                    {/* GPU threshold alert notification within popover */}
                    {dc.activeWorkload > gpuAlertThreshold && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 flex items-start gap-1.5 text-[9px] font-sans text-rose-300 animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold uppercase text-[8px] tracking-wide">GPU Warning Alert</p>
                          <p className="text-[8px] text-slate-300 leading-snug">
                            Node cluster exceeds normal budget of {gpuAlertThreshold}%. Please adjust traffic policy.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* GPU details */}
                    <div className="text-[8px] font-mono text-slate-500 flex justify-between items-center bg-[#090b14]/50 p-1 rounded border border-[#2e354f]/15">
                      <span className="text-slate-400 font-bold uppercase">GPU CLUSTER:</span>
                      <span className="text-slate-300 truncate max-w-[130px]" title={dc.gpus}>
                        {dc.gpus}
                      </span>
                    </div>

                    {/* Utilization Bars */}
                    <div className="space-y-2">
                      {/* CPU Utilization */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Cpu className="h-2.5 w-2.5 text-slate-500" /> CPU UTIL
                          </span>
                          <span className="text-slate-300 font-bold">
                            {Math.min(98, Math.floor(dc.activeWorkload * 0.85 + 5))}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-[#2e354f]/25">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.min(98, Math.floor(dc.activeWorkload * 0.85 + 5))}%` }}
                          />
                        </div>
                      </div>

                      {/* GPU Utilization */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Activity className="h-2.5 w-2.5 text-slate-500" /> GPU UTIL
                          </span>
                          <span className={`font-bold ${dc.activeWorkload > 80 ? 'text-rose-400' : dc.activeWorkload > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {dc.activeWorkload}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-[#2e354f]/25">
                          <div 
                            className={`h-full bg-gradient-to-r transition-all duration-500 ${
                              dc.activeWorkload > 80 
                                ? 'from-rose-500 to-pink-500' 
                                : dc.activeWorkload > 50 
                                  ? 'from-amber-500 to-orange-500' 
                                  : 'from-emerald-500 to-teal-500'
                            }`}
                            style={{ width: `${dc.activeWorkload}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#2e354f]/25">
                      <div className="bg-[#090b14]/40 p-1.5 rounded border border-[#2e354f]/15">
                        <div className="text-[7px] font-mono text-slate-500 uppercase tracking-wider">Memory Util</div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">
                          {Math.min(95, Math.floor(dc.activeWorkload * 0.75 + 15))}%
                        </div>
                      </div>
                      <div className="bg-[#090b14]/40 p-1.5 rounded border border-[#2e354f]/15">
                        <div className="text-[7px] font-mono text-slate-500 uppercase tracking-wider">Nodes Active</div>
                        <div className="text-[10px] font-mono font-bold text-slate-300">
                          {dc.id === 'us-west-2' ? '64 / 64' : dc.id === 'sa-east-1' ? '16 / 16' : '32 / 32'}
                        </div>
                      </div>
                      <div className="bg-[#090b14]/40 p-1.5 rounded border border-[#2e354f]/15">
                        <div className="text-[7px] font-mono text-slate-500 uppercase tracking-wider">Running Pods</div>
                        <div className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <Layers className="h-2.5 w-2.5 text-emerald-500" />
                          {Math.floor(dc.activeWorkload * 0.4) + 16}
                        </div>
                      </div>
                      <div className="bg-[#090b14]/40 p-1.5 rounded border border-[#2e354f]/15">
                        <div className="text-[7px] font-mono text-slate-500 uppercase tracking-wider">Pending Pods</div>
                        <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                          dc.activeWorkload > 70 ? 'text-amber-400 animate-pulse' : 'text-slate-400'
                        }`}>
                          <RefreshCw className={`h-2.5 w-2.5 ${dc.activeWorkload > 70 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                          {dc.activeWorkload > 70 ? Math.floor((dc.activeWorkload - 70) / 4) + 1 : 0}
                        </div>
                      </div>
                    </div>

                    {/* Footer PUE & Service Mesh */}
                    <div className="flex items-center justify-between pt-1.5 text-[8px] font-mono border-t border-[#2e354f]/25">
                      <div className="text-slate-500">
                        PUE: <span className="text-indigo-400 font-semibold">{dc.pue}</span>
                      </div>
                      {serviceMeshEnabled ? (
                        <div className="flex items-center gap-0.5 text-emerald-400 font-extrabold uppercase">
                          <Lock className="h-2 w-2 text-emerald-400" /> mTLS Secure
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-amber-500/80 font-bold uppercase">
                          <Sliders className="h-2 w-2" /> No Mesh
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Small Name tag */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#121424] text-[8px] font-mono text-slate-300 px-1.5 py-0.5 rounded border border-[#2e354f]/50 whitespace-nowrap shadow-xl z-20 font-bold">
                    {dc.id}
                  </div>
                </button>
              );
            })}

            {/* Render Airbnb Multi-Cloud Nodes */}
            {activeMode === 'airbnb' && AIRBNB_NODES.map(node => {
              // Check if node is actively firing
              let isNodeActive = false;
              if (airbnbSimulating) {
                if (node.id === 'gitops' && airbnbSimProgress < 25) isNodeActive = true;
                else if (node.id === 'airflow' && airbnbSimProgress >= 15 && airbnbSimProgress < 45) isNodeActive = true;
                else if (node.id === 'user' && (airbnbSimProgress >= 35 && airbnbSimProgress < 65 || airbnbSimProgress > 90)) isNodeActive = true;
                else if (node.id === 'kafka' && airbnbSimProgress >= 55 && airbnbSimProgress < 75) isNodeActive = true;
                else if (node.id === 'apisix' && airbnbSimProgress >= 68 && airbnbSimProgress < 85) isNodeActive = true;
                else if (node.id === 'cloud' && airbnbSimProgress >= 78 && airbnbSimProgress < 98) isNodeActive = true;
                else if (node.id === 'cassandra' && airbnbSimProgress >= 82 && airbnbSimProgress < 95) isNodeActive = true;
              }

              return (
                <div
                  key={`airbnb-node-${node.id}`}
                  style={{ left: `${node.coordinates.x}%`, top: `${node.coordinates.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-30 flex flex-col items-center"
                >
                  {/* Halo pulse */}
                  <span 
                    className="absolute inline-flex h-9 w-9 rounded-full -left-2.5 -top-2.5 transition-all duration-300"
                    style={{
                      backgroundColor: node.color,
                      opacity: isNodeActive ? 0.35 : 0.08,
                      transform: isNodeActive ? 'scale(1.25)' : 'scale(1)',
                      animation: isNodeActive ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
                    }}
                  />

                  {/* Core Icon Button */}
                  <div 
                    className="h-10 w-10 rounded-xl border flex items-center justify-center shadow-2xl transition-all duration-300"
                    style={{
                      backgroundColor: '#0a0b14',
                      borderColor: isNodeActive ? node.color : '#2e354f',
                      color: node.color,
                      boxShadow: isNodeActive ? `0 0 15px ${node.color}50` : 'none',
                      transform: isNodeActive ? 'scale(1.15)' : 'scale(1)'
                    }}
                    title={node.name}
                  >
                    {node.icon === 'gitops' ? (
                      <GitBranch className="h-4 w-4" />
                    ) : node.icon === 'airflow' ? (
                      <Activity className="h-4 w-4" />
                    ) : node.icon === 'kafka' ? (
                      <Zap className="h-4 w-4" />
                    ) : node.icon === 'apisix' ? (
                      <Sliders className="h-4 w-4" />
                    ) : node.icon === 'cloud' ? (
                      <Cloud className="h-4 w-4" />
                    ) : node.icon === 'cassandra' ? (
                      <Database className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </div>

                  {/* Tooltip / Label */}
                  <div className="absolute top-11 bg-[#090a12]/95 border border-[#2e354f] text-[8px] font-mono text-slate-100 font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-40 transition-all group-hover:scale-105">
                    {node.label}
                  </div>

                  {/* Deep detail popup on hover */}
                  <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-64 p-3 bg-[#0a0c16]/98 border border-slate-700/60 rounded-xl shadow-2xl text-[10px] text-slate-300 font-sans z-50 -top-24 left-12 space-y-1 backdrop-blur-md">
                    <p className="font-bold text-white uppercase text-xs flex items-center gap-1.5" style={{ color: node.color }}>
                      {node.name}
                    </p>
                    <p className="leading-relaxed font-normal">{node.desc}</p>
                    <div className="text-[8px] font-mono opacity-60 pt-1 border-t border-[#2e354f]/50 flex justify-between">
                      <span>Coordinates: {node.coordinates.x}%, {node.coordinates.y}%</span>
                      <span>Type: OSS Stack</span>
                    </div>
                  </div>
                </div>
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
                  {serviceMeshEnabled && (
                    <div className="mt-2 pt-1.5 border-t border-[#2e354f]/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-[8px] tracking-wider">
                        <Shield className="h-2 w-2 animate-pulse" />
                        <span>mTLS TUNNELS: SECURE</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-[8px]">
                        <span className="inline-block h-2 w-2 rounded-full border border-dashed border-emerald-400 animate-spin" />
                        <span>Envoy Sidecar Proxies Active</span>
                      </div>
                    </div>
                  )}
                </>
              ) : activeMode === 'airbnb' ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>GitOps Source & Orchestrator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Apache OSS Stream/Gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span>Multi-Cloud K8s Clusters</span>
                  </div>
                  <div className="flex items-center gap-1.5 pl-0.5 mt-1 pt-1 border-t border-[#2e354f]/20 font-mono text-[9px]">
                    <span className="text-yellow-400 font-bold">● Active Progress Path</span>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                
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
                    className="w-full bg-[#0a0b12] border border-[#2e354f]/40 text-xs rounded-xl p-2 text-slate-200 outline-none focus:border-violet-500/50 h-9"
                  >
                    {USER_LOCATIONS.map(ul => (
                      <option key={ul.id} value={ul.id}>{ul.name}</option>
                    ))}
                  </select>
                </div>

                {/* Core Optimizer Policy */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Routing Policy</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#0a0b12] p-1 rounded-xl border border-[#2e354f]/40 h-9">
                    <button
                      onClick={() => { setPolicy('latency'); setTelemetryLogs([]); }}
                      title="Lowest Latency Policy"
                      className={`p-1 rounded-lg flex items-center justify-center transition-all cursor-pointer ${policy === 'latency' ? 'bg-violet-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setPolicy('cost'); setTelemetryLogs([]); }}
                      title="Lowest Unit Cost Policy"
                      className={`p-1 rounded-lg flex items-center justify-center transition-all cursor-pointer ${policy === 'cost' ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setPolicy('carbon'); setTelemetryLogs([]); }}
                      title="Carbon-Aware Green Policy"
                      className={`p-1 rounded-lg flex items-center justify-center transition-all cursor-pointer ${policy === 'carbon' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Leaf className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Service Mesh Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Mesh</label>
                  <button
                    onClick={() => {
                      setServiceMeshEnabled(!serviceMeshEnabled);
                      setTelemetryLogs([]);
                    }}
                    title="Toggle Mutual TLS & Envoy Sidecar proxy latency"
                    className={`w-full px-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer h-9 ${
                      serviceMeshEnabled 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.08)]' 
                        : 'bg-[#0a0b12] border-[#2e354f]/40 text-slate-400 hover:text-slate-200 hover:border-[#2e354f]/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Shield className={`h-3.5 w-3.5 ${serviceMeshEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                      <span className="text-[11px]">mTLS Secure</span>
                    </div>
                    <div className={`w-7 h-4 rounded-full p-0.5 transition-all duration-300 ${serviceMeshEnabled ? 'bg-emerald-500 flex justify-end' : 'bg-slate-700 flex justify-start'}`}>
                      <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
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

                {/* GPU Alert Threshold slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-400 animate-pulse" />
                      Alert Limit
                    </span>
                    <span className="text-rose-400 font-bold">{gpuAlertThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={gpuAlertThreshold}
                    onChange={(e) => setGpuAlertThreshold(Number(e.target.value))}
                    className="w-full accent-rose-500 h-1 bg-[#0a0b12] rounded-lg appearance-none cursor-pointer mt-2"
                  />
                </div>

                {/* Action Trigger */}
                <div className="flex items-end">
                  <button
                    onClick={runSimulation}
                    disabled={simulating}
                    className={`w-full py-2 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer h-9 ${
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
          ) : activeMode === 'airbnb' ? (
            <div className="rounded-2xl border border-rose-500/25 bg-[#121424]/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e354f]/25 pb-2">
                <h3 className="font-display font-bold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-rose-400 animate-pulse" /> Airbnb Multi-Cloud GitOps Controller
                </h3>
                <span className="text-[9px] font-mono font-bold bg-[#0a0b12] text-slate-400 border border-[#2e354f]/40 px-2 py-0.5 rounded-full uppercase">
                  Declarative State Sync
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Airbnb AI Service Choice */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Airbnb AI Scenario</label>
                  <select
                    value={airbnbCase}
                    disabled={airbnbSimulating}
                    onChange={(e) => {
                      setAirbnbCase(e.target.value as any);
                    }}
                    className="w-full bg-[#0a0b12] border border-[#2e354f]/40 text-xs rounded-xl p-2 text-slate-200 outline-none focus:border-rose-500/50 disabled:opacity-50"
                  >
                    <option value="pricing">🏠 Dynamic Pricing Engine</option>
                    <option value="search">🔍 NLP Vector Search Matcher</option>
                    <option value="reviews">✍️ Review Sentiment &amp; Translator</option>
                  </select>
                </div>

                {/* Cloud Provider Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cloud Host Provider</label>
                  <div className="grid grid-cols-3 gap-1 bg-[#0a0b12] p-1 rounded-xl border border-[#2e354f]/40">
                    <button
                      onClick={() => !airbnbSimulating && setActiveCloud('gcp')}
                      disabled={airbnbSimulating}
                      title="Google Cloud Platform (Vertex AI + GKE)"
                      className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-50 cursor-pointer ${activeCloud === 'gcp' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <span className="text-[9px] font-bold">GCP</span>
                    </button>
                    <button
                      onClick={() => !airbnbSimulating && setActiveCloud('aws')}
                      disabled={airbnbSimulating}
                      title="Amazon Web Services (SageMaker + EKS)"
                      className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-50 cursor-pointer ${activeCloud === 'aws' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <span className="text-[9px] font-bold">AWS</span>
                    </button>
                    <button
                      onClick={() => !airbnbSimulating && setActiveCloud('azure')}
                      disabled={airbnbSimulating}
                      title="Microsoft Azure (Azure ML + AKS)"
                      className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all disabled:opacity-50 cursor-pointer ${activeCloud === 'azure' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <span className="text-[9px] font-bold">Azure</span>
                    </button>
                  </div>
                </div>

                {/* User Ingress Location Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guest Origin Location</label>
                  <select
                    value={userLoc}
                    disabled={airbnbSimulating}
                    onChange={(e) => {
                      setUserLoc(e.target.value);
                    }}
                    className="w-full bg-[#0a0b12] border border-[#2e354f]/40 text-xs rounded-xl p-2 text-slate-200 outline-none focus:border-rose-500/50 disabled:opacity-50"
                  >
                    {USER_LOCATIONS.map(ul => (
                      <option key={ul.id} value={ul.id}>{ul.name}</option>
                    ))}
                  </select>
                </div>

                {/* Deploy Trigger Button */}
                <div className="flex items-end">
                  <button
                    onClick={runAirbnbSimulation}
                    disabled={airbnbSimulating}
                    className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      airbnbSimulating 
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/10'
                    }`}
                  >
                    <Play className={`h-3.5 w-3.5 ${airbnbSimulating ? 'animate-spin' : ''}`} />
                    <span>{airbnbSimulating ? 'Syncing GitOps...' : 'Deploy &amp; Stream Inference'}</span>
                  </button>
                </div>

              </div>

              {airbnbSimulating && (
                <div className="w-full bg-[#0a0b12] h-1.5 rounded-full overflow-hidden border border-[#2e354f]/15">
                  <div 
                    className="bg-gradient-to-r from-rose-500 via-cyan-400 via-violet-400 to-emerald-400 h-full transition-all duration-350"
                    style={{ width: `${airbnbSimProgress}%` }}
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

                 {/* Workload Telemetry Indicator & Override Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                      GPU Cluster Utilization
                      <span className="text-[7px] text-indigo-400 font-mono font-bold uppercase">(Interactive Override)</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      activeDC.activeWorkload > gpuAlertThreshold ? 'text-rose-400 animate-pulse' : 'text-white'
                    }`}>{activeDC.activeWorkload}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={activeDC.activeWorkload}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDatacenters(prev => prev.map(d => d.id === activeDC.id ? { ...d, activeWorkload: val } : d));
                    }}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-[#0a0b12] border border-[#2e354f]/20`}
                    style={{
                      background: `linear-gradient(to right, ${
                        activeDC.activeWorkload > 80 ? '#f43f5e' : activeDC.activeWorkload > 50 ? '#f59e0b' : '#10b981'
                      } ${activeDC.activeWorkload}%, #0a0b12 ${activeDC.activeWorkload}%)`
                    }}
                  />
                  <div className="flex justify-between text-[7px] text-slate-500 font-mono">
                    <span>10% Low</span>
                    <span>50% Med</span>
                    <span>100% Peak</span>
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

                            {serviceMeshEnabled && (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[8px] font-mono">
                                <span className="px-1.5 py-0.25 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded font-bold uppercase flex items-center gap-0.5">
                                  <Lock className="h-1.5 w-1.5" /> mTLS
                                </span>
                                <span className="text-slate-400">Envoy Sidecar:</span>
                                <span className="text-emerald-400 font-bold">{isUser ? '+0.32ms' : '+0.24ms'}</span>
                                <span className="text-slate-600">|</span>
                                <span className="text-slate-400 font-semibold text-[7px] text-sky-400">TLS_AES_256_GCM</span>
                              </div>
                            )}

                            {idx < activeHops.length - 1 && (
                              <div className="text-[9px] text-indigo-400 font-mono italic flex items-center justify-between gap-1 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <ArrowRight className="h-2 w-2" /> Medium: {activeHops[idx + 1].linkType}
                                </span>
                                {serviceMeshEnabled && (
                                  <span className="text-[8px] font-extrabold text-emerald-400 font-mono bg-emerald-500/5 px-1 rounded border border-emerald-500/10">
                                    mTLS Tunnel
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {serviceMeshEnabled && (
                      <div className="pt-2 border-t border-[#2e354f]/15 flex justify-between items-center text-[10px] font-mono text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5 animate-pulse" /> Sidecar Mesh Latency Overhead
                        </span>
                        <span className="font-bold">
                          +{(0.32 + (activeHops.length - 1) * 0.24).toFixed(2)}ms
                        </span>
                      </div>
                    )}

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
          ) : activeMode === 'airbnb' ? (
            <>
              {/* AIRBNB GITOPS MULTI-CLOUD ARCHITECTURE CARD */}
              <div className="rounded-3xl border border-rose-500/20 bg-[#101222]/85 p-5 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-rose-400" /> Enterprise Architecture
                  </h3>
                  <span className="text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase">
                    Airbnb v2.4
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-display font-bold text-base text-white">Dynamic AI Pipelines</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A highly optimized multi-cloud setup combining GitOps source synchronization with open-source (Apache) streaming data technologies.
                  </p>
                </div>

                <div className="h-px bg-[#2e354f]/25" />

                {/* Sub tabs to explore the stack details */}
                <div className="grid grid-cols-3 gap-1 bg-[#0a0b12] p-1 rounded-xl border border-[#2e354f]/30">
                  <button
                    onClick={() => setActiveDetailTab('overview')}
                    className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${activeDetailTab === 'overview' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Workflow
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('connections')}
                    className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${activeDetailTab === 'connections' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Hop Counts
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('apache-oss')}
                    className={`py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${activeDetailTab === 'apache-oss' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    OSS Tools
                  </button>
                </div>

                {/* Tab content */}
                {activeDetailTab === 'overview' && (
                  <div className="space-y-3 animate-fade-in text-[11px] text-slate-300">
                    <p className="font-semibold text-white uppercase text-[10px] tracking-wider text-rose-400">Active Scenario Flow</p>
                    {airbnbCase === 'pricing' ? (
                      <div className="space-y-2 bg-[#090a12] p-3 rounded-xl border border-[#2e354f]/15">
                        <p className="font-bold text-white text-xs flex items-center gap-1.5">
                          🏠 Dynamic Pricing Engine
                        </p>
                        <p className="text-slate-400 leading-relaxed text-[10px]">
                          Evaluates listing attributes, local booking densities, and weather records in real-time. Commits triggering adjustments from GitOps down through Apache Airflow pipelines onto distributed container clusters.
                        </p>
                      </div>
                    ) : airbnbCase === 'search' ? (
                      <div className="space-y-2 bg-[#090a12] p-3 rounded-xl border border-[#2e354f]/15">
                        <p className="font-bold text-white text-xs flex items-center gap-1.5">
                          🔍 Smart NLP Search Matcher
                        </p>
                        <p className="text-slate-400 leading-relaxed text-[10px]">
                          Translates natural language guest requests into vector space embeddings. Compares request weights against Cassandra listings utilizing parallelized Spark calculations.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-[#090a12] p-3 rounded-xl border border-[#2e354f]/15">
                        <p className="font-bold text-white text-xs flex items-center gap-1.5">
                          ✍️ Review Sentiment &amp; Translator
                        </p>
                        <p className="text-slate-400 leading-relaxed text-[10px]">
                          Captures user reviews, extracts structural feedback parameters, and performs machine translations in real-time using large LLM networks deployed across multi-cloud GPU resources.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cloud Deployment Host</span>
                      <div className="bg-[#090a12] p-2.5 rounded-xl border border-[#2e354f]/20 flex items-center justify-between">
                        <span className="font-semibold text-white">{activeCloud === 'gcp' ? 'Google Cloud Platform' : activeCloud === 'aws' ? 'Amazon Web Services' : 'Microsoft Azure'}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                          {activeCloud === 'gcp' ? 'GKE' : activeCloud === 'aws' ? 'EKS' : 'AKS'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'connections' && (
                  <div className="space-y-3 animate-fade-in text-[11px] text-slate-300">
                    <p className="font-semibold text-white uppercase text-[10px] tracking-wider text-rose-400">Pipeline Hops Breakdown</p>
                    <div className="space-y-2 bg-[#0a0b12] p-2.5 rounded-xl border border-[#2e354f]/25 text-[10px] font-mono">
                      <div className="flex justify-between py-1 border-b border-[#2e354f]/10">
                        <span className="text-slate-400">Hop 1: Git Repo ➔ Airflow</span>
                        <span className="text-rose-400 font-bold">Code Deploy</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2e354f]/10">
                        <span className="text-slate-400">Hop 2: Airflow ➔ K8s</span>
                        <span className="text-cyan-400 font-bold">Image Push</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2e354f]/10">
                        <span className="text-slate-400">Hop 3: Guest ➔ Kafka</span>
                        <span className="text-amber-400 font-bold">Clickstream</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2e354f]/10">
                        <span className="text-slate-400">Hop 4: Kafka ➔ APISIX</span>
                        <span className="text-violet-400 font-bold">API Route</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2e354f]/10">
                        <span className="text-slate-400">Hop 5: APISIX ➔ Cloud GPU</span>
                        <span className="text-emerald-400 font-bold">Inference</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Hop 6: Cloud ➔ Cassandra</span>
                        <span className="text-teal-400 font-bold">Feature DB</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 italic">
                      Every step utilizes secure intra-datacenter subsea fiber lines or edge CDN acceleration.
                    </p>
                  </div>
                )}

                {activeDetailTab === 'apache-oss' && (
                  <div className="space-y-3 animate-fade-in text-[11px] text-slate-300">
                    <p className="font-semibold text-white uppercase text-[10px] tracking-wider text-rose-400">Apache Stack Glossary</p>
                    <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 scrollbar-none">
                      <div className="bg-[#090a12] p-2 rounded-lg border border-[#2e354f]/15 space-y-1">
                        <p className="font-bold text-cyan-400 text-[10px] flex items-center justify-between">
                          <span>Apache Airflow</span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono">Workflow DAG</span>
                        </p>
                        <p className="text-slate-400 text-[9px] leading-relaxed">
                          Schedules, monitors, and orchestrates complex ML pipelines and dynamic config pushes using programmatic Python definitions.
                        </p>
                      </div>
                      <div className="bg-[#090a12] p-2 rounded-lg border border-[#2e354f]/15 space-y-1">
                        <p className="font-bold text-amber-400 text-[10px] flex items-center justify-between">
                          <span>Apache Kafka</span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono">Stream Bus</span>
                        </p>
                        <p className="text-slate-400 text-[9px] leading-relaxed">
                          Provides fault-tolerant, high-throughput distributed messaging capable of queueing millions of user searches per second.
                        </p>
                      </div>
                      <div className="bg-[#090a12] p-2 rounded-lg border border-[#2e354f]/15 space-y-1">
                        <p className="font-bold text-violet-400 text-[10px] flex items-center justify-between">
                          <span>Apache APISIX</span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono">API Gateway</span>
                        </p>
                        <p className="text-slate-400 text-[9px] leading-relaxed">
                          Resolves BGP routing and dynamic proxy configurations in micro-seconds, serving as the enterprise gateway layer for ingress data.
                        </p>
                      </div>
                      <div className="bg-[#090a12] p-2 rounded-lg border border-[#2e354f]/15 space-y-1">
                        <p className="font-bold text-teal-400 text-[10px] flex items-center justify-between">
                          <span>Apache Spark</span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono">Compute Engine</span>
                        </p>
                        <p className="text-slate-400 text-[9px] leading-relaxed">
                          Compiles distributed feature vectors, processes raw clickstreams, and prepares listing datasets for parallel training/indexing.
                        </p>
                      </div>
                      <div className="bg-[#090a12] p-2 rounded-lg border border-[#2e354f]/15 space-y-1">
                        <p className="font-bold text-emerald-400 text-[10px] flex items-center justify-between">
                          <span>Apache Cassandra</span>
                          <span className="text-[7px] text-slate-500 uppercase font-mono">NoSQL Store</span>
                        </p>
                        <p className="text-slate-400 text-[9px] leading-relaxed">
                          A masterless distributed NoSQL database delivering low-latency real-time reads/writes for user preference features.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PIPELINE TRAVERSAL STATUS CARD */}
              <div className="rounded-3xl border border-[#2e354f]/35 bg-[#101222]/80 p-5 space-y-3 font-sans animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#2e354f]/25 pb-2">
                  <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-violet-400" /> Pipeline Traversal Status
                  </h3>
                  <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded">
                    {airbnbSimulating ? `${airbnbSimProgress}%` : 'IDLE'}
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-[11px]">
                  {/* Phase 1: GitOps Commit */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <GitBranch className={`h-4 w-4 ${airbnbSimProgress >= 10 ? 'text-rose-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 10 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>1. GitOps Config push</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 10 ? '#ef4444' : '#64748b' }}>
                      {airbnbSimProgress >= 10 ? 'COMMITTED' : 'AWAITING'}
                    </span>
                  </div>

                  {/* Phase 2: Airflow DAG */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className={`h-4.5 w-4.5 ${airbnbSimProgress >= 30 ? 'text-cyan-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 30 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>2. Airflow DAG Trigger</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 30 ? '#06b6d4' : '#64748b' }}>
                      {airbnbSimProgress >= 30 ? 'DEPLOYED' : 'AWAITING'}
                    </span>
                  </div>

                  {/* Phase 3: Kafka Ingress */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${airbnbSimProgress >= 65 ? 'text-amber-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 65 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>3. Kafka Clickstream Ingest</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 65 ? '#fbbf24' : '#64748b' }}>
                      {airbnbSimProgress >= 65 ? 'STREAMING' : 'AWAITING'}
                    </span>
                  </div>

                  {/* Phase 4: APISIX Routing */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sliders className={`h-4 w-4 ${airbnbSimProgress >= 75 ? 'text-violet-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 75 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>4. APISIX Route Gateway</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 75 ? '#a78bfa' : '#64748b' }}>
                      {airbnbSimProgress >= 75 ? 'ROUTED' : 'AWAITING'}
                    </span>
                  </div>

                  {/* Phase 5: Multi-Cloud Inference */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Cloud className={`h-4 w-4 ${airbnbSimProgress >= 90 ? 'text-indigo-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 90 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>5. Multi-Cloud Inference</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 90 ? '#818cf8' : '#64748b' }}>
                      {airbnbSimProgress >= 90 ? 'EXECUTED' : 'AWAITING'}
                    </span>
                  </div>

                  {/* Phase 6: Cassandra lookup */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className={`h-4 w-4 ${airbnbSimProgress >= 95 ? 'text-teal-400' : 'text-slate-600'}`} />
                      <span className={`${airbnbSimProgress >= 95 ? 'text-slate-100 font-bold' : 'text-slate-500'}`}>6. Cassandra Lookup</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold" style={{ color: airbnbSimProgress >= 95 ? '#2dd4bf' : '#64748b' }}>
                      {airbnbSimProgress >= 95 ? 'HYDRATED' : 'AWAITING'}
                    </span>
                  </div>
                </div>

                {airbnbSimulating && (
                  <div className="pt-2 border-t border-[#2e354f]/15 space-y-1">
                    <div className="flex justify-between text-[8px] font-mono text-slate-500">
                      <span>Hop traversal</span>
                      <span>6 total hops</span>
                    </div>
                    <div className="w-full bg-[#0a0b12] h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${airbnbSimProgress}%` }} />
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

          {/* REAL-TIME GPU ALERTS NOTIFICATION FEED */}
          <div className="rounded-3xl border border-[#2e354f]/35 bg-[#101222]/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2e354f]/25 pb-2">
              <h3 className="font-display font-bold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" /> Active GPU Alerts
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                  {alertsHistory.length} Total
                </span>
                {alertsHistory.length > 0 && (
                  <button 
                    onClick={() => setAlertsHistory([])}
                    className="text-[9px] text-slate-500 hover:text-slate-300 font-mono underline cursor-pointer bg-transparent border-0"
                  >
                    Clear Feed
                  </button>
                )}
              </div>
            </div>

            {alertsHistory.length === 0 ? (
              <div className="text-center py-6 text-slate-500 space-y-1">
                <Shield className="h-5 w-5 text-emerald-500/70 mx-auto animate-pulse" />
                <p className="text-xs font-semibold text-slate-300">All Clusters Secure</p>
                <p className="text-[9px] text-slate-500 max-w-[220px] mx-auto">
                  No GPU node active workload currently exceeds the {gpuAlertThreshold}% threshold.
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin">
                {alertsHistory.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-2 rounded-xl border flex items-start gap-2.5 transition-all animate-fade-in ${
                      alert.type === 'critical'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className={`p-1 rounded-lg mt-0.5 shrink-0 ${
                      alert.type === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                          k8s-{alert.dcId}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono font-bold">
                          {alert.timestamp}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5 font-sans leading-snug">
                        GPU utilization reached <span className={alert.type === 'critical' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>{alert.workload}%</span>, exceeding target budget limit of {gpuAlertThreshold}%.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SRE LIVE CONSOLE TERMINAL */}
          <div className="rounded-3xl border border-[#2e354f]/35 bg-[#090b14] p-5 space-y-3 font-mono text-xs flex flex-col h-[280px]">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-[#2e354f]/20">
              <span className="text-[10px] font-bold text-violet-400">
                {activeMode === 'inference' ? 'WAN_ORCHESTRATOR_TELEMETRY' : activeMode === 'airbnb' ? 'AIRBNB_GITOPS_TELEMETRY' : 'DISTRIBUTED_TRAINING_ALLREDUCE'}
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
              ) : activeMode === 'airbnb' ? (
                airbnbLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-1">
                    <Activity className="h-6 w-6 text-slate-700 animate-pulse" />
                    <span>Pipeline telemetry inactive.</span>
                    <span className="text-[9px]">Select an AI scenario and press "Deploy &amp; Stream Inference" to trace routing.</span>
                  </div>
                ) : (
                  airbnbLogs.map((log, i) => {
                    let isSuccess = log.includes('SUCCESS') || log.includes('COMPLETE') || log.includes('SUCCESSFUL');
                    let isStep = log.includes('STEP');
                    let isCloud = log.includes('CLOUD') || log.includes('GCP') || log.includes('AWS') || log.includes('Azure') || log.includes('GKE') || log.includes('EKS') || log.includes('AKS');
                    let isApache = log.includes('APACHE') || log.includes('Kafka') || log.includes('Airflow') || log.includes('APISIX') || log.includes('Cassandra') || log.includes('Spark');

                    let borderClass = 'border-slate-700 text-slate-400';
                    if (isSuccess) borderClass = 'border-emerald-500 text-emerald-400 bg-emerald-500/5 font-bold py-0.5';
                    else if (isStep) borderClass = 'border-rose-500 text-rose-300 font-bold';
                    else if (isCloud) borderClass = 'border-sky-500 text-sky-400 font-semibold';
                    else if (isApache) borderClass = 'border-amber-500 text-amber-300';

                    return (
                      <div 
                        key={i} 
                        className={`leading-relaxed border-l-2 pl-2 animate-fade-in font-mono text-[10px] ${borderClass}`}
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
