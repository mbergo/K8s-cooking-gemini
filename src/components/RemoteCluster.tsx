import React, { useState, useEffect } from 'react';
import { Server, Activity, Terminal, Shield, CheckCircle, AlertTriangle, Key } from 'lucide-react';
import { HoverHint } from './HoverHint';

export const RemoteCluster: React.FC = () => {
  const [kubeconfig, setKubeconfig] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [nodes, setNodes] = useState<any[]>([]);
  const [pods, setPods] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const handleConnect = async () => {
    if (!kubeconfig) {
      setError("Please paste your kubeconfig yaml first.");
      return;
    }
    
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/k8s/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kubeconfigString: kubeconfig })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');
      
      setClusterId(data.clusterId);
      setConnected(true);
      fetchStats(data.clusterId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const fetchStats = async (id: string) => {
    setLoadingStats(true);
    try {
      const [nodesRes, podsRes] = await Promise.all([
        fetch(`/api/k8s/${id}/nodes`),
        fetch(`/api/k8s/${id}/pods`)
      ]);
      const nodesData = await nodesRes.json();
      const podsData = await podsRes.json();
      
      if (nodesRes.ok) setNodes(nodesData.nodes || []);
      if (podsRes.ok) setPods(podsData.pods || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e354f]/40 pb-5">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-400" /> Remote Cluster Control
          </h2>
          <p className="text-xs text-slate-400 mt-1">Connect to a live Kubernetes cluster using your Kubeconfig</p>
        </div>
        {connected && (
          <div className="flex items-center gap-2 bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
            <CheckCircle className="h-3.5 w-3.5" />
            CONNECTED TO CLUSTER
          </div>
        )}
      </div>

      {!connected ? (
        <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 p-6 rounded-3xl max-w-2xl mx-auto w-full mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-violet-900/20 text-violet-400 rounded-xl border border-violet-500/30">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Provide Kubeconfig</h3>
              <p className="text-xs text-slate-400">Paste your raw kubeconfig file contents to establish a connection.</p>
            </div>
          </div>
          
          <textarea
            value={kubeconfig}
            onChange={e => setKubeconfig(e.target.value)}
            placeholder="apiVersion: v1&#10;clusters:&#10;- cluster:&#10;..."
            className="w-full h-64 bg-[#121424] border border-[#2e354f] rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-violet-500/50 mb-4"
          />
          
          {error && (
            <div className="flex items-start gap-2 bg-rose-950/20 text-rose-400 p-3 rounded-lg border border-rose-900/50 mb-4 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              {connecting ? 'Connecting...' : 'Connect to Cluster'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 p-6 rounded-3xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="h-4 w-4 text-violet-400" /> Active <HoverHint term="Node">Nodes</HoverHint>
              </h3>
              <span className="text-xs font-mono text-slate-500">{nodes.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loadingStats ? (
                <div className="text-xs text-slate-500 animate-pulse">Loading nodes...</div>
              ) : nodes.length > 0 ? (
                nodes.map((n, i) => (
                  <div key={i} className="p-3 bg-[#121424] border border-[#2e354f]/50 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{n.metadata.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{n.status?.nodeInfo?.kubeletVersion}</div>
                    </div>
                    <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] uppercase font-bold">
                      Ready
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No nodes found.</div>
              )}
            </div>
          </div>

          <div className="bg-[#0b0c16]/90 border border-[#2e354f]/40 p-6 rounded-3xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Active <HoverHint term="Pods">Pods</HoverHint>
              </h3>
              <span className="text-xs font-mono text-slate-500">{pods.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loadingStats ? (
                <div className="text-xs text-slate-500 animate-pulse">Loading pods...</div>
              ) : pods.length > 0 ? (
                pods.map((p, i) => (
                  <div key={i} className="p-3 bg-[#121424] border border-[#2e354f]/50 rounded-xl">
                    <div className="text-xs font-bold text-slate-200 truncate">{p.metadata.name}</div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-[10px] text-slate-500 font-mono">{p.metadata.namespace}</div>
                      <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${p.status?.phase === 'Running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {p.status?.phase}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No pods found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteCluster;
