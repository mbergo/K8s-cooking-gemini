import React, { useState, useEffect, useRef } from "react";
import { HoverHint } from "./HoverHint";
import {
  Activity,
  Server,
  Settings,
  Shield,
  Cpu,
  Maximize,
  Minimize,
  AlertTriangle,
  Zap,
  ServerCrash,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";

type PodState = "Running" | "Pending" | "Terminating";

interface Pod {
  id: string;
  status: PodState;
  timer: number;
}

export const HPASandbox: React.FC = () => {
  const [targetCpu, setTargetCpu] = useState(50);
  const [minReplicas, setMinReplicas] = useState(1);
  const [maxReplicas, setMaxReplicas] = useState(15);
  const [load, setLoad] = useState(50);

  const [pods, setPods] = useState<Pod[]>([
    { id: "pod-initial", status: "Running", timer: 0 },
  ]);
  const [history, setHistory] = useState<any[]>([]);

  const stateRef = useRef({
    targetCpu,
    minReplicas,
    maxReplicas,
    load,
    pods,
    history,
  });

  useEffect(() => {
    stateRef.current = {
      targetCpu,
      minReplicas,
      maxReplicas,
      load,
      pods,
      history,
    };
  }, [targetCpu, minReplicas, maxReplicas, load, pods, history]);

  useEffect(() => {
    const interval = setInterval(() => {
      const {
        targetCpu,
        minReplicas,
        maxReplicas,
        load,
        pods: currentPods,
        history: currentHistory,
      } = stateRef.current;

      let newPods = [...currentPods];

      // Advance timers for pending and terminating
      newPods = newPods
        .map((p) => {
          if (p.status === "Pending") {
            if (p.timer >= 2) return { ...p, status: "Running", timer: 0 };
            return { ...p, timer: p.timer + 1 };
          }
          if (p.status === "Terminating") {
            if (p.timer >= 2) return null; // remove
            return { ...p, timer: p.timer + 1 };
          }
          return p;
        })
        .filter(Boolean) as Pod[];

      const activePods = newPods.filter((p) => p.status !== "Terminating");
      const runningPodsCount = newPods.filter(
        (p) => p.status === "Running",
      ).length;

      // HPA calculation
      const desired = Math.max(
        minReplicas,
        Math.min(maxReplicas, Math.ceil(load / targetCpu)),
      );

      if (activePods.length < desired) {
        const toAdd = desired - activePods.length;
        for (let i = 0; i < toAdd; i++) {
          newPods.push({
            id: `pod-${Date.now()}-${i}`,
            status: "Pending",
            timer: 0,
          });
        }
      } else if (activePods.length > desired) {
        let toRemove = activePods.length - desired;
        for (let i = newPods.length - 1; i >= 0 && toRemove > 0; i--) {
          if (newPods[i].status !== "Terminating") {
            newPods[i] = { ...newPods[i], status: "Terminating", timer: 0 };
            toRemove--;
          }
        }
      }

      const cpuUtil =
        runningPodsCount > 0 ? Math.round(load / runningPodsCount) : load;

      const newHist = [
        ...currentHistory,
        {
          time: new Date().toLocaleTimeString([], {
            hour12: false,
            second: "2-digit",
            minute: "2-digit",
          }),
          cpu: cpuUtil,
          replicas: runningPodsCount,
          target: targetCpu,
        },
      ];

      if (newHist.length > 30) {
        newHist.shift();
      }

      setPods(newPods);
      setHistory(newHist);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const runningPodsCount = pods.filter((p) => p.status === "Running").length;
  const currentCpu =
    runningPodsCount > 0 ? Math.round(load / runningPodsCount) : load;
  const desiredReplicas = Math.max(
    minReplicas,
    Math.min(maxReplicas, Math.ceil(load / targetCpu)),
  );

  return (
    <div className="space-y-6 animate-fade-in text-white h-full flex flex-col p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e354f]/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
              Autoscaling
            </span>
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            HPA Sandbox (Horizontal Pod Autoscaler)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate traffic load and observe how K8s HPA scales pods based on
            target CPU utilization.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
              <Settings className="h-4 w-4 text-violet-400" /> HPA Configuration
            </h3>

            <div className="space-y-8 relative z-10">
              {/* Load Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />{" "}
                    Incoming Traffic Load
                  </label>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {load} RPS
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={load}
                  onChange={(e) => setLoad(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-[#121424] rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

              <div className="w-full h-px bg-[#2e354f]/40 my-2" />

              {/* Target CPU Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-amber-400" /> Target <HoverHint term="CPU"/>
                    Utilization
                  </label>
                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {targetCpu}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={targetCpu}
                  onChange={(e) => setTargetCpu(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-[#121424] rounded-lg appearance-none h-2 cursor-pointer"
                />
              </div>

              {/* Min/Max Replicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Minimize className="h-3.5 w-3.5 text-blue-400" /> Min
                      Pods
                    </label>
                    <span className="text-xs font-mono text-slate-400">
                      {minReplicas}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={minReplicas}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinReplicas(val);
                      if (val > maxReplicas) setMaxReplicas(val);
                    }}
                    className="w-full accent-blue-500 bg-[#121424] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Maximize className="h-3.5 w-3.5 text-rose-400" /> Max
                      Pods
                    </label>
                    <span className="text-xs font-mono text-slate-400">
                      {maxReplicas}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={maxReplicas}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxReplicas(val);
                      if (val < minReplicas) setMinReplicas(val);
                    }}
                    className="w-full accent-rose-500 bg-[#121424] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> HPA Algorithm
              </h4>
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                desiredReplicas = ceil[currentReplicas * ( currentMetricValue /
                desiredMetricValue )]
              </p>
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed mt-2 text-emerald-400">
                =&gt; ceil({runningPodsCount} * ({currentCpu} / {targetCpu})) ={" "}
                {Math.ceil(runningPodsCount * (currentCpu / targetCpu))}
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Metrics & Visualization */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Average CPU
              </span>
              <div className="flex items-end gap-2">
                <span
                  className={`text-2xl font-display font-bold ${currentCpu > targetCpu ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {currentCpu}%
                </span>
                <span className="text-xs text-slate-500 font-mono mb-1">
                  / {targetCpu}% tgt
                </span>
              </div>
            </div>
            <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Active Pods
              </span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-display font-bold text-blue-400">
                  {runningPodsCount}
                </span>
              </div>
            </div>
            <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Desired Replicas
              </span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-display font-bold text-violet-400">
                  {desiredReplicas}
                </span>
              </div>
            </div>
            <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-2xl p-4 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                {currentCpu > targetCpu * 1.5 ? (
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> OVERLOAD
                  </span>
                ) : runningPodsCount < desiredReplicas ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Zap className="h-4 w-4" /> SCALING UP
                  </span>
                ) : runningPodsCount > desiredReplicas ? (
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                    <Zap className="h-4 w-4" /> SCALING DOWN
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Shield className="h-4 w-4" /> STABLE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-3xl p-6 h-64 flex-shrink-0">
            <h3 className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-400" /> Metrics History
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={history}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2e354f"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tickMargin={10}
                    minTickGap={20}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={10}
                    domain={[0, "auto"]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#818cf8"
                    fontSize={10}
                    domain={[0, maxReplicas + 2]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b0c16",
                      borderColor: "#2e354f",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <ReferenceLine
                    y={targetCpu}
                    yAxisId="left"
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                      position: "insideTopLeft",
                      value: "Target CPU",
                      fill: "#f59e0b",
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    yAxisId="left"
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Avg CPU %"
                  />
                  <Line
                    type="stepAfter"
                    dataKey="replicas"
                    yAxisId="right"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={false}
                    name="Replicas"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pods Visualization */}
          <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 rounded-3xl p-6 flex-1 flex flex-col min-h-[200px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" /> Cluster Pods
              </h3>
              <div className="flex gap-3 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{" "}
                  Running
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>{" "}
                  Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>{" "}
                  Terminating
                </span>
              </div>
            </div>

            <div className="flex-1 border border-[#2e354f]/30 bg-[#060811] rounded-2xl p-4 overflow-y-auto">
              <div className="flex flex-wrap gap-3">
                {pods.map((pod) => (
                  <div
                    key={pod.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
                      pod.status === "Running"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : pod.status === "Pending"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-400 opacity-50 scale-95"
                    }`}
                  >
                    <Server className="h-4 w-4" />
                    <span className="text-[10px] font-mono">
                      {pod.id.split("-").slice(0, 2).join("-")}
                    </span>
                  </div>
                ))}
                {pods.length === 0 && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50">
                    <ServerCrash className="h-8 w-8" />
                    <span className="text-xs font-mono">
                      NO ACTIVE WORKLOADS
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HPASandbox;
