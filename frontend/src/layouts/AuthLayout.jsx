import { ShieldCheck, Lock, Cpu, Sparkles } from "lucide-react";
import { GlassPanel } from "../components/UI/GlassPanel";

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. High-Tech Cyber Grid & Neon Aura Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Matrix Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800c_1px,transparent_1px),linear-gradient(to_bottom,#8080800c_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Radiant Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow"></div>
        <div className="absolute bottom-10 -right-20 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none"></div>
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      {/* 2. Micro Scanline Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none scanline-overlay opacity-30"></div>

      {/* Main Glass Portal Card */}
      <div className="w-full max-w-[460px] relative z-20">
        <GlassPanel glow={true} className="p-7 sm:p-9 border-white/[0.1] bg-[#070d1d]/85 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          
          {/* Top Hologram Crest */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative group mb-4">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-700"></div>
              
              <div className="relative p-4 bg-[#0a1224] rounded-2xl border border-emerald-500/30 shadow-2xl flex items-center justify-center">
                <ShieldCheck className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-white tracking-tight font-display">
              {title}
            </h2>
            
            <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="tracking-wider uppercase font-semibold">
                {subtitle || "AKIRA Zero-Trust Gateway"}
              </span>
            </div>
          </div>

          {/* Content Slot */}
          <div className="space-y-6">
            {children}
          </div>

        </GlassPanel>

        {/* Security Compliance Guarantee Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-slate-500 text-[11px] font-mono tracking-widest uppercase">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-500/70" /> NIST 800-63B
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-500/70" /> RUST ZEROIZATION
          </span>
        </div>
      </div>
    </div>
  );
}