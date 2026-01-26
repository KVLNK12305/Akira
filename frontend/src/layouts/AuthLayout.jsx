import { Shield } from "lucide-react";
import { GlassPanel } from "../components/UI/GlassPanel";

export function AuthLayout({ children, title }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-neutral-950 text-neutral-200 font-sans selection:bg-teal-500/30">
      
      {/* 1. Animated Cyber Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-teal-500 opacity-20 blur-[100px] animate-pulse-slow"></div>
        <div className="absolute right-[-10%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[120px] animate-pulse-slower"></div>
      </div>

      {/* 2. CRT Scanline Overlay (Subtle Tech Feel) */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-10"></div>

      <GlassPanel className="p-8 w-full max-w-[420px] relative z-20 border-neutral-800 bg-neutral-900/60 shadow-[0_0_50px_-12px_rgba(20,184,166,0.2)] backdrop-blur-2xl">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {/* Glowing Ring Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative p-4 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-xl">
              <Shield className="w-10 h-10 text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mt-6 text-white tracking-tight">
            {title}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            <p className="text-center text-teal-500/80 text-xs font-mono tracking-widest uppercase">
              Secure Gateway v2.0
            </p>
          </div>
        </div>

        {/* Content Slot */}
        <div className="space-y-6">
          {children}
        </div>

      </GlassPanel>

      {/* Footer Branding */}
      <div className="absolute bottom-6 text-center z-20 opacity-40">
        <p className="text-[10px] font-mono text-neutral-500">
          ENCRYPTED CONNECTION • AES-256 • NIST COMPLIANT
        </p>
      </div>
    </div>
  );
}