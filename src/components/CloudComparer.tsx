import React, { useState } from 'react';
import { CLOUD_PROVIDERS, CloudProviderData } from '../types';
import { Search, Info, ExternalLink, ShieldAlert, Cpu, Network, HardDrive, HelpCircle } from 'lucide-react';

export const CloudComparer: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const filteredProviders = CLOUD_PROVIDERS.filter((p) => {
    const matchesSearch =
      p.provider.toLowerCase().includes(search.toLowerCase()) ||
      p.gpuInstances.toLowerCase().includes(search.toLowerCase()) ||
      p.storageService.toLowerCase().includes(search.toLowerCase()) ||
      p.keyLimitation.toLowerCase().includes(search.toLowerCase());
    
    if (selectedProvider === 'all') return matchesSearch;
    return p.provider.toLowerCase().includes(selectedProvider.toLowerCase()) && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Cloud Provider AI Compute Matrix
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Compare native Kubernetes integrations, auto-scaling platforms, identity authorizations, and physical network buses across the three major hyperscalers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#111322] border border-[#2e354f]/50 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by GPU instances, storage, CNI limits..."
            className="w-full bg-[#0c0e17] border border-[#2e354f] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex gap-1 bg-[#0c0e17] p-1 rounded-lg border border-[#2e354f] self-start sm:self-auto">
          {['all', 'AWS', 'GCP', 'Azure'].map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProvider(prov)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                selectedProvider === prov
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {prov === 'all' ? 'Show All' : prov}
            </button>
          ))}
        </div>
      </div>

      {/* Comparative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProviders.map((data, idx) => (
          <div key={idx} className="rounded-2xl border border-[#2e354f]/60 bg-[#111322] p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              {/* Card Header */}
              <div className="pb-3 border-b border-[#1e2338]">
                <h3 className="font-display font-bold text-white text-base flex items-center justify-between">
                  {data.provider}
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-violet-400 cursor-pointer" />
                </h3>
                <span className="text-[10px] text-violet-400 font-mono font-bold uppercase tracking-wider block mt-1">
                  {data.managedK8s}
                </span>
              </div>

              {/* Specs Rows */}
              <div className="space-y-3.5 text-xs">
                {/* GPU Instances */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-pink-400" /> GPU Instances
                  </span>
                  <span className="text-slate-300 font-mono">{data.gpuInstances}</span>
                </div>

                {/* Storage */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
                    <HardDrive className="h-3 w-3 text-amber-400" /> Model weight storage
                  </span>
                  <span className="text-slate-300">{data.storageService}</span>
                </div>

                {/* Networking */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider flex items-center gap-1">
                    <Network className="h-3 w-3 text-emerald-400" /> Inter-node bus (NCCL)
                  </span>
                  <span className="text-slate-300">{data.networkEFA}</span>
                </div>

                {/* Auto scaling */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Scaling mechanisms</span>
                  <span className="text-slate-300">{data.autoscaling}</span>
                </div>

                {/* Identity / IAM */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Identity authorization</span>
                  <span className="text-slate-300 font-mono">{data.identityAuth}</span>
                </div>
              </div>
            </div>

            {/* Key Cloud Limitation / SRE warning */}
            <div className="mt-6 pt-4 border-t border-[#1e2338] bg-[#0c0e17]/50 p-4 rounded-xl border border-[#22273c]">
              <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> SRE Architectural Limit
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {data.keyLimitation}
              </p>
            </div>
          </div>
        ))}

        {filteredProviders.length === 0 && (
          <div className="col-span-3 py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5">
            <Info className="h-5 w-5 text-slate-600" />
            <span>No results match your current search queries. Try clearing the filter or searching for another key word.</span>
          </div>
        )}
      </div>
    </div>
  );
};
