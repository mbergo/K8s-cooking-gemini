import React, { useState } from 'react';
import { TROUBLESHOOTING_SCENARIOS, DebugScenario } from '../types';
import { Terminal, Shield, Play, RotateCcw, AlertTriangle, CheckCircle, Info, RefreshCw, BarChart2, Eye } from 'lucide-react';

export const DebuggingSimulator: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(TROUBLESHOOTING_SCENARIOS[0].id);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Type or select a diagnostic command from the list below to begin troubleshooting...'
  ]);
  const [podStatus, setPodStatus] = useState<Record<string, string>>({
    'pending-gpu': 'Pending',
    'cuda-oom': 'CrashLoopBackOff',
    'linux-oom': 'OOMKilled',
    'coredns-failure': 'Error'
  });
  const [activePane, setActiveTabPane] = useState<'terminal' | 'metrics'>('terminal');

  const scenario = TROUBLESHOOTING_SCENARIOS.find(s => s.id === selectedScenarioId) || TROUBLESHOOTING_SCENARIOS[0];

  const handleCommandRun = (cmdType: 'diagnostic' | 'remediate') => {
    if (cmdType === 'diagnostic') {
      setTerminalLogs(prev => [
        ...prev,
        `$ ${scenario.mockTerminalCommand}`,
        scenario.expectedOutput
      ]);
    } else {
      setTerminalLogs(prev => [
        ...prev,
        `$ ${scenario.solutionCommand}`,
        scenario.remediationOutput,
        `Reconciling state...`,
        `SUCCESS: Desired replicas synchronized. Status set to Running. Ready: 1/1.`
      ]);
      setPodStatus(prev => ({
        ...prev,
        [scenario.id]: 'Running'
      }));
    }
  };

  const handleReset = () => {
    setTerminalLogs(['Console initialized. Ready for diagnostics...']);
    setPodStatus({
      'pending-gpu': 'Pending',
      'cuda-oom': 'CrashLoopBackOff',
      'linux-oom': 'OOMKilled',
      'coredns-failure': 'Error'
    });
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Interactive SRE Production Debugging Terminal
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Simulate real-world production outages on an Airbnb-scale Kubernetes AI Compute cluster. Execute diagnostic commands, inspect cgroup metrics, and execute remediations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Incident List Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Active Outage Alerts</h3>
          <div className="space-y-3">
            {TROUBLESHOOTING_SCENARIOS.map((scen) => {
              const status = podStatus[scen.id];
              const isResolved = status === 'Running';
              const isSelected = selectedScenarioId === scen.id;

              return (
                <button
                  key={scen.id}
                  onClick={() => {
                    setSelectedScenarioId(scen.id);
                    setTerminalLogs([`Console switched to incident context: [${scen.title}]`]);
                  }}
                  className={`w-full text-left p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#141727] to-[#1e2338] border-violet-500 shadow-lg shadow-violet-500/5'
                      : 'bg-[#111322] border-[#2e354f]/50 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(scen.severity)}`}>
                        {scen.severity}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isResolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400 animate-pulse'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{scen.title}</h4>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {scen.symptom}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diagnostic Terminal & Grafana Metrics Pane */}
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          {/* Diagnostic Pane Tabs */}
          <div className="flex items-center justify-between border-b border-[#2e354f] pb-1">
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setActiveTabPane('terminal')}
                className={`pb-2.5 px-4 font-bold flex items-center gap-1.5 transition-all border-b-2 ${
                  activePane === 'terminal'
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" /> Diagnostic Console
              </button>
              <button
                onClick={() => setActiveTabPane('metrics')}
                className={`pb-2.5 px-4 font-bold flex items-center gap-1.5 transition-all border-b-2 ${
                  activePane === 'metrics'
                    ? 'border-violet-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" /> Grafana Outage Metrics
              </button>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors pb-2.5 px-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Simulation
            </button>
          </div>

          {/* Active Terminal Body */}
          {activePane === 'terminal' ? (
            <div className="rounded-2xl border border-[#2e354f]/50 bg-[#07080f] overflow-hidden flex flex-col h-96">
              {/* Terminal Title */}
              <div className="p-3 bg-[#111322] border-b border-[#1e2338] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>sh &bull; k8s-ai-compute-terminal &bull; context: default-namespace</span>
                <span className="flex items-center h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Terminal Logs */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px] leading-relaxed text-emerald-400 console-glow select-text">
                {terminalLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>

              {/* Suggestion & Action Command buttons */}
              <div className="p-3 bg-[#0d0f1c] border-t border-[#1e2338] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Recommended Diagnostics:</span>
                  <button
                    onClick={() => handleCommandRun('diagnostic')}
                    className="text-[10px] font-mono text-slate-300 bg-[#141727] hover:bg-[#1f243c] border border-slate-700 px-3 py-1.5 rounded-lg text-left transition-colors"
                  >
                    {scenario.mockTerminalCommand}
                  </button>
                </div>

                {podStatus[scenario.id] !== 'Running' && (
                  <button
                    onClick={() => handleCommandRun('remediate')}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 shadow-md shadow-emerald-600/10 transition-all cursor-pointer self-end"
                  >
                    <Play className="h-3 w-3" /> Apply SRE Remediation
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Grafana Simulation Dashboard */
            <div className="rounded-2xl border border-[#2e354f]/50 bg-[#0c0e17] p-6 space-y-6 h-96 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e2338]">
                <h4 className="font-display font-bold text-white text-xs">Simulated Grafana Outage Dashboard</h4>
                <span className="text-[10px] text-slate-500 font-mono">Live updates &bull; scrape-interval: 5s</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metric 1 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#111322]">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">GPU VRAM Usage Spike</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-red-400">98.4%</span>
                    <span className="text-[10px] text-slate-500">Threshold: 90%</span>
                  </div>
                  <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" style={{ width: '98%' }}></div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#111322]">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">CoreDNS Loop Latency</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-amber-400">12,450ms</span>
                    <span className="text-[10px] text-slate-500">Target: &lt;50ms</span>
                  </div>
                  <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#111322]">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">NCCL Inter-Node Packet Loss</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-red-500">4.12%</span>
                    <span className="text-[10px] text-slate-500">Target: 0% loss</span>
                  </div>
                  <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-[#111322]">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">HNSW Index Similarity Recall</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-400">99.8%</span>
                    <span className="text-[10px] text-slate-500">Target: &gt;95%</span>
                  </div>
                  <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incident Explanation details */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-950/5 p-5">
            <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Info className="h-4 w-4" /> Architectural Failure Postmortem Analysis
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {scenario.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
