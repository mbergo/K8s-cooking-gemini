import React, { useEffect, useRef } from "react";
import { Tab } from "../types";
import { HoverHint } from "./HoverHint";
import {
  BookOpen,
  HelpCircle,
  Activity,
  LayoutGrid,
  Terminal,
  Calculator,
  Layers,
  Cpu,
  Compass,
  GraduationCap,
  Globe,
} from "lucide-react";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix characters - Katakana + Latin + Numerals
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ".split("");

    const fontSize = 14;
    let columns = canvas.width / fontSize;
    const drops: number[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // start off-screen randomly
    }

    const draw = () => {
      // Re-calculate columns in case of resize
      columns = canvas.width / fontSize;
      while (drops.length < columns) {
        drops.push(Math.random() * -100);
      }

      // Translucent black background to create trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0"; // Matrix green
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars[Math.floor(Math.random() * chars.length)];
        
        // Draw character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
      }
    };

    const intervalId = setInterval(draw, 33); // ~30fps

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const navItems: { tab: Tab; label: string; icon: any }[] = [
    { tab: "overview", label: "Dashboard", icon: LayoutGrid },
    { tab: "architecture", label: "Cluster Topology", icon: Compass },
    { tab: "cluster-map", label: "Global Cluster Map", icon: Globe },
    { tab: "hpa-sandbox", label: "HPA Sandbox", icon: Activity },
    { tab: "remote-cluster", label: "Remote Cluster", icon: Terminal },
    { tab: "airbnb-pipeline", label: "Airbnb Pipeline", icon: Activity },
    { tab: "scheduler", label: "Scheduler Sandbox", icon: Layers },
    { tab: "gpu-stack", label: "GPU Execution Stack", icon: Cpu },
    { tab: "lifecycle", label: "AI Request Lifecycle", icon: Activity },
    { tab: "troubleshooting", label: "SRE Debug Terminal", icon: Terminal },
    { tab: "calculator", label: "Capacity Calculator", icon: Calculator },
    { tab: "comparison", label: "Cloud Comparative", icon: BookOpen },
    { tab: "qa", label: "Interview Masterclass", icon: HelpCircle },
    { tab: "classroom-meet", label: "Classroom & Meet", icon: GraduationCap },
  ];

  return (
    <header className="border-b border-emerald-900/50 bg-black px-6 py-4 sticky top-0 z-50 relative overflow-hidden">
      {/* Matrix Canvas Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
      />
      
      {/* Gradient Overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 to-black/95 pointer-events-none" />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-900 via-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-500/50">
            <span className="font-display font-bold text-black text-xl">K</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-emerald-500 tracking-tight flex items-center gap-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              <HoverHint term="K8s"/> AI Compute Masterclass
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                Staff <HoverHint term="SRE"/> Playbook
              </span>
            </h1>
            <p className="text-xs text-emerald-700 font-mono flex gap-1 items-center">
              <HoverHint term="Kubernetes"/> &bull; <HoverHint term="GPU"/> <HoverHint term="Scheduler"/> &bull; <HoverHint term="CUDA"/> Internals &bull; AI Pipelines
            </p>
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
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-mono font-bold transition-all border ${
                  isActive
                    ? "bg-emerald-900/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "border-transparent text-emerald-800 hover:bg-emerald-950/30 hover:text-emerald-500 hover:border-emerald-900/50"
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
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition-all border ${
              showCoPilot
                ? "bg-emerald-900/60 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-black text-emerald-600 border-emerald-900 hover:border-emerald-600 hover:bg-emerald-950/40 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${showCoPilot ? "bg-emerald-300 animate-ping" : "bg-emerald-700"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${showCoPilot ? "bg-emerald-400" : "bg-emerald-800"}`}></span>
            </span>
            Gemini SRE Co-Pilot
          </button>
        </div>
      </div>
    </header>
  );
};
