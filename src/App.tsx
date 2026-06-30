import React, { useState } from 'react';
import { Tab } from './types';
import { Navbar } from './components/Navbar';
import { Overview } from './components/Overview';
import { ArchitectureVisualizer } from './components/ArchitectureVisualizer';
import { SchedulerSandbox } from './components/SchedulerSandbox';
import { GPUStackExplorer } from './components/GPUStackExplorer';
import { RequestLifecycleTracer } from './components/RequestLifecycleTracer';
import { DebuggingSimulator } from './components/DebuggingSimulator';
import { SreCalculator } from './components/SreCalculator';
import { CloudComparer } from './components/CloudComparer';
import { InterviewPrep } from './components/InterviewPrep';
import { GeminiCoPilot } from './components/GeminiCoPilot';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showCoPilot, setShowCoPilot] = useState<boolean>(false);

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview setActiveTab={setActiveTab} />;
      case 'architecture':
        return <ArchitectureVisualizer />;
      case 'scheduler':
        return <SchedulerSandbox />;
      case 'gpu-stack':
        return <GPUStackExplorer />;
      case 'lifecycle':
        return <RequestLifecycleTracer />;
      case 'troubleshooting':
        return <DebuggingSimulator />;
      case 'calculator':
        return <SreCalculator />;
      case 'comparison':
        return <CloudComparer />;
      case 'qa':
        return <InterviewPrep />;
      default:
        return <Overview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showCoPilot={showCoPilot}
        setShowCoPilot={setShowCoPilot}
      />

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Active Tab View Stage */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <div className="bg-[#111322]/20 rounded-3xl border border-[#2e354f]/15 p-6 md:p-8 backdrop-blur-sm min-h-[calc(100vh-180px)]">
            {renderActiveTabContent()}
          </div>
        </main>

        {/* Gemini AI Co-Pilot Panel */}
        {showCoPilot && (
          <div className="w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-[#2e354f]">
            <GeminiCoPilot onClose={() => setShowCoPilot(false)} />
          </div>
        )}
      </div>

      {/* Humble Footer */}
      <footer className="border-t border-[#1a1e35] bg-[#080a11] px-6 py-4 text-center text-xs text-slate-500 font-sans flex items-center justify-center gap-2">
        <span>© 2026 Kubernetes AI Compute Masterclass. Designed with high performance for SRE Architects.</span>
      </footer>
    </div>
  );
}
