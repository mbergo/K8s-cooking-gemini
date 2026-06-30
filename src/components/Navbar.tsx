import React from 'react';
import { Tab } from '../types';
import { BookOpen, HelpCircle, Activity, LayoutGrid, Terminal, Calculator, Layers, Cpu, Compass, GraduationCap } from 'lucide-react';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showCoPilot: boolean;
  setShowCoPilot: (show: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  showCoPilot,
  setShowCoPilot,
}) => {
  const navItems: { tab: Tab; label: string; icon: any }[] = [
    { tab: 'overview', label: 'Dashboard', icon: LayoutGrid },
    { tab: 'architecture', label: 'Cluster Topology', icon: Compass },
    { tab: 'scheduler', label: 'Scheduler Sandbox', icon: Layers },
    { tab: 'gpu-stack', label: 'GPU Execution Stack', icon: Cpu },
    { tab: 'lifecycle', label: 'AI Request Lifecycle', icon: Activity },
    { tab: 'troubleshooting', label: 'SRE Debug Terminal', icon: Terminal },
    { tab: 'calculator', label: 'Capacity Calculator', icon: Calculator },
    { tab: 'comparison', label: 'Cloud Comparative', icon: BookOpen },
    { tab: 'qa', label: 'Interview Masterclass', icon: HelpCircle },
    { tab: 'classroom-meet', label: 'Classroom & Meet', icon: GraduationCap },
  ];

  return (
    <header className="border-b border-[#2e354f] bg-[#0c0e17] px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <span className="font-display font-bold text-white text-xl">K</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
              K8s AI Compute Masterclass
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                Staff SRE Playbook
              </span>
            </h1>
            <p className="text-xs text-slate-400">Kubernetes &bull; GPU Scheduling &bull; CUDA Internals &bull; AI Pipelines</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {navItems.map(({ tab, label, icon: Icon }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                id={`tab-btn-${tab}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/10'
                    : 'text-slate-400 hover:bg-[#1a1c2a] hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Co-Pilot Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoPilot(!showCoPilot)}
            id="toggle-copilot-btn"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all border ${
              showCoPilot
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                : 'bg-transparent text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Gemini SRE Co-Pilot
          </button>
        </div>
      </div>
    </header>
  );
};
