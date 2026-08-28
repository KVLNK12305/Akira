import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  ShieldCheck, ChevronRight, Lock, Globe, Server, Activity, 
  Database, Zap, Terminal, Code, Cpu, LogIn, Sparkles, 
  ShieldAlert, Fingerprint, Eye, ArrowRight, CheckCircle2,
  Layers, Radio, FileCode2, Crosshair
} from "lucide-react";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Custom Scramble Hook
const useScrambleText = (targetText, delay = 0) => {
  const [text, setText] = useState("");
  
  useEffect(() => {
    let frame = 0;
    let timeout;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    
    const scramble = () => {
      let result = "";
      for (let i = 0; i < targetText.length; i++) {
        if (frame >= i * 3) {
          result += targetText[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setText(result);
      if (frame < targetText.length * 3) {
        frame++;
        requestAnimationFrame(scramble);
      }
    };
    
    timeout = setTimeout(() => {
      requestAnimationFrame(scramble);
    }, delay);
    
    return () => clearTimeout(timeout);
  }, [targetText, delay]);
  
  return text;
};

export function HeroView({ onStart, onDocs }) {
  const container = useRef();
  const cursorRef = useRef();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeCodeTab, setActiveCodeTab] = useState("curl");
  
  const titlePart1 = useScrambleText("NON-HUMAN", 300);
  const titlePart2 = useScrambleText("IDENTITY", 800);
  const titlePart3 = useScrambleText("GATEWAY", 1300);

  // Mouse Spotlight Logic (and cursor follower)
  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  useGSAP(() => {
    // Custom cursor follower — only on desktop
    const cursor = cursorRef.current;
    if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;

    gsap.set(cursor, { xPercent: -50, yPercent: -50, display: "flex" });
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.15, ease: "power3" });

    const onMove = (e) => { xTo(e.clientX); yTo(e.clientY); };
    window.addEventListener("mousemove", onMove);
    // Cleanup to prevent memory leak
    return () => window.removeEventListener("mousemove", onMove);
  }, { scope: container });

  useGSAP(() => {
    // Intro timeline
    const tl = gsap.timeline();
    tl.from(".hero-badge", { x: -20, opacity: 0, duration: 0.8, ease: "power3.out" }, 0.2)
      .from(".terminal-hud", { x: 40, opacity: 0, duration: 1, ease: "power4.out" }, 0.5)
      .from(".floating-nav", { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" }, 1.5)
      .from(".hero-desc", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" }, 1.0);

    // ScrollTrigger animations — use fromTo to prevent React Strict Mode glitches
    const scrollDefaults = {
      toggleActions: "play none none none",
    };

    gsap.fromTo(".pipeline-card", 
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".pipeline-grid", start: "top 85%", ...scrollDefaults }
      }
    );

    gsap.fromTo([".dev-terminal-section .relative.group", ".dev-terminal-section .space-y-6"], 
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.2,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".dev-terminal-section", start: "top 80%", ...scrollDefaults }
      }
    );

    gsap.fromTo(".feature-card", 
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".features-grid", start: "top 85%", ...scrollDefaults }
      }
    );

    gsap.fromTo(".bottom-cta-section", 
      { y: 30, scale: 0.97, opacity: 0 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".bottom-cta-section", start: "top 90%", ...scrollDefaults }
      }
    );
  }, { scope: container });

  return (
    <div ref={container} onMouseMove={handleMouseMove} className="bg-[#020617] text-slate-100 overflow-x-hidden relative min-h-screen cursor-none">
      
      {/* 🔴 CUSTOM RADAR CURSOR */}
      <div ref={cursorRef} className="custom-cursor fixed top-0 left-0 w-8 h-8 pointer-events-none z-[100] items-center justify-center mix-blend-screen" style={{ display: 'none' }}>
        <div className="absolute inset-0 border border-emerald-500/50 rounded-full animate-ping opacity-20"></div>
        <Crosshair className="w-6 h-6 text-emerald-400" strokeWidth={1} />
      </div>

      {/* 🟢 FLOATING COMMAND PALETTE (Bottom Dock) */}
      <div className="floating-nav fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-[#0a1428]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 px-4 font-bold text-lg tracking-tight cursor-pointer pr-6 border-r border-white/10">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-display font-black text-white">AKIRA</span>
        </div>
        
        <button 
          onClick={onDocs} 
          className="flex items-center gap-2 text-slate-300 hover:text-emerald-300 text-sm font-medium transition-colors px-4 py-3 rounded-xl hover:bg-white/[0.04] cursor-none"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Interactive Specs</span>
          <span className="sm:hidden">Docs</span>
        </button>
        
        <button
          onClick={onStart}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] cursor-none hover:scale-105"
        >
          <Terminal size={15} className="stroke-[2.5]" />
          <span>Launch Console</span>
        </button>
      </div>

      {/* 🟢 HERO SECTION (Grid HUD) */}
      <section className="hero-container min-h-screen flex items-center justify-center relative z-20 pt-12 px-6 lg:px-12">
        {/* Architectural Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
           <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center center' }}></div>
           <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10 pt-20 pb-40">
          
          {/* Left: Asymmetric Typography */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-start pt-12 lg:pt-0">
            
            <div className="hero-badge mb-6 px-4 py-1.5 rounded-sm border-l-2 border-emerald-500 bg-[#0a1428]/80 backdrop-blur-md flex items-center gap-2.5 text-emerald-400 text-xs font-mono uppercase">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>SYSTEM.AUTHORIZATION // ONLINE</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl xl:text-[7rem] font-black tracking-tighter leading-[0.85] font-display text-white uppercase text-left break-words w-full">
              <div className="text-white min-h-[1em]">{titlePart1}</div>
              <div className="text-slate-400 min-h-[1em]">{titlePart2}</div>
              <div className="text-slate-600 min-h-[1em]">{titlePart3}</div>
            </h1>

            <p className="hero-desc mt-8 text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed font-mono">
              [INIT] Autonomous defense layer for machine workloads.
              <br/><br/>
              <span className="text-emerald-400">► Zero-Allocation Rust FFI Attestation.</span>
              <br/>
              <span className="text-emerald-400">► 8-Signal AI Anomaly Containment.</span>
            </p>
          </div>

          {/* Right: Live Terminal HUD */}
          <div className="col-span-1 lg:col-span-5 flex items-center justify-center terminal-hud w-full">
            <div className="w-full relative max-w-md mx-auto">
              <div className="absolute -inset-0.5 bg-emerald-500/10 blur-xl rounded-lg"></div>
              <div className="bg-[#050b14]/90 border border-emerald-500/30 rounded-lg p-5 font-mono text-xs sm:text-sm shadow-2xl relative overflow-hidden h-[450px] flex flex-col justify-end backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full px-4 py-3 bg-[#0a1428]/80 border-b border-emerald-500/20 flex justify-between items-center backdrop-blur-md">
                  <span className="text-emerald-400/50 text-[10px] uppercase">akira_attestation_node_88</span>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                  </div>
                </div>
                
                <div className="space-y-3 opacity-90 mt-12 overflow-hidden">
                  <p className="text-slate-500">&gt; Establishing zero-trust handshake...</p>
                  <p className="text-emerald-400">&gt; SUCCESS: TLS Mutual Auth Verified.</p>
                  <p className="text-slate-500">&gt; Awaiting high-entropy payload...</p>
                  <p className="text-cyan-400">&gt; INCOMING: request from 192.168.1.104</p>
                  <p className="text-slate-500">&gt; Invoking zeroize::zeroize() ...</p>
                  <p className="text-emerald-400">&gt; ATTESTATION PASSED. Issuing SVID Token.</p>
                  <p className="text-emerald-400 animate-pulse font-bold mt-4">&gt; _</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔵 ARCHITECTURE PIPELINE FLOW VISUALIZER */}
      <section className="py-28 relative z-20 border-t border-white/[0.06] bg-[#030816]/90 backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-3">
              <Activity className="w-3.5 h-3.5" /> High-Entropy Machine Attestation
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display text-white mb-4">
              Cryptographic Execution Pipeline
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
              Every request is verified against learned machine baselines, decrypted in zero-allocation Rust memory, and issued short-lived SVID tokens.
            </p>
          </div>

          {/* Interactive Pipeline Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative pipeline-grid">
            <PipelineCard 
              step="01" 
              title="Workload Handshake" 
              desc="Machine exchanges base64 high-entropy API key or client certificate via Mutual TLS."
              tag="HMAC-SHA256"
              icon={Globe}
              glowColor="emerald"
            />
            <PipelineCard 
              step="02" 
              title="Rust Core Attestation" 
              desc="Zero-allocation Bun-FFI decodes payload, verifies fingerprint, and immediately wipes plaintext from RAM."
              tag="zeroize::zeroize()"
              icon={Cpu}
              glowColor="cyan"
            />
            <PipelineCard 
              step="03" 
              title="8-Signal AI Sentinel" 
              desc="Evaluates IP deviation, velocity spikes, scope escalations, and payment risk thresholds."
              tag="Real-Time ML"
              icon={ShieldAlert}
              glowColor="violet"
            />
            <PipelineCard 
              step="04" 
              title="Ephemeral SVID Token" 
              desc="Issues 60-second scoped credential with client IP attestation and immutable audit logging."
              tag="RFC 8705 PoP"
              icon={Fingerprint}
              glowColor="emerald"
            />
          </div>
        </div>
      </section>

      {/* 🟠 LIVE DEVELOPER INTERACTION TERMINAL */}
      <section className="py-28 relative z-20 border-t border-white/[0.06] bg-[#020617] dev-terminal-section">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Terminal Console */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-emerald-500/10 rounded-2xl blur-lg opacity-50 group-hover:opacity-90 transition duration-500"></div>
            
            <div className="relative bg-[#070e1c] rounded-2xl border border-slate-700/70 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden font-mono text-xs md:text-sm">
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0a1428] border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                  <span className="ml-2 text-slate-400 text-xs">akira-client-handshake.sh</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveCodeTab("curl")} 
                    className={`px-2 py-0.5 rounded text-[11px] ${activeCodeTab === "curl" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"}`}
                  >
                    cURL
                  </button>
                  <button 
                    onClick={() => setActiveCodeTab("node")} 
                    className={`px-2 py-0.5 rounded text-[11px] ${activeCodeTab === "node" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"}`}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              {/* Code Snippet Display */}
              <div className="p-5 text-slate-300 space-y-2 overflow-x-auto">
                {activeCodeTab === "curl" ? (
                  <>
                    <p className="text-slate-500"># 1. Exchange Root Machine Key for Ephemeral Token</p>
                    <p><span className="text-cyan-400">curl</span> -X POST https://api.akira.soc/v1/auth/token \</p>
                    <p className="pl-4">-H <span className="text-emerald-300">"X-AKIRA-MACHINE-KEY: ak_live_9f82e7..."</span> \</p>
                    <p className="pl-4">-d <span className="text-amber-300">'&#123;"scope": "payment:settle", "ttl": 60&#125;'</span></p>
                    <p>&nbsp;</p>
                    <p className="text-slate-500"># 2. Rust Zeroize Response &lt; 1ms</p>
                    <p className="text-emerald-400">&#123;</p>
                    <p className="pl-4 text-slate-300">"status": <span className="text-emerald-300">"ATTESTATION_PASSED"</span>,</p>
                    <p className="pl-4 text-slate-300">"svid_token": <span className="text-cyan-300">"eyJhZ3kiOiJha2lyYS..."</span>,</p>
                    <p className="pl-4 text-slate-300">"risk_score": <span className="text-emerald-400">12</span>,</p>
                    <p className="pl-4 text-slate-300">"zeroized": <span className="text-amber-400">true</span></p>
                    <p className="text-emerald-400">&#125;</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500">// Initialize Zero-Trust Client</p>
                    <p><span className="text-violet-400">import</span> &#123; AkiraSentinel &#125; <span className="text-violet-400">from</span> <span className="text-emerald-300">'@akira/sentinel'</span>;</p>
                    <p>&nbsp;</p>
                    <p><span className="text-cyan-400">const</span> sentinel = <span className="text-violet-400">new</span> AkiraSentinel(&#123;</p>
                    <p className="pl-4">rootKey: process.env.<span className="text-amber-300">AKIRA_KEY</span>,</p>
                    <p className="pl-4">autoRotate: <span className="text-cyan-400">true</span>,</p>
                    <p className="pl-4">attestation: <span className="text-emerald-300">'rust-zeroize'</span></p>
                    <p>&#125;);</p>
                    <p>&nbsp;</p>
                    <p><span className="text-violet-400">await</span> sentinel.protectPaymentPipeline();</p>
                    <p className="text-emerald-400 animate-pulse"># Live Sentinel Active</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Feature Highlights */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> High-Performance SOC
            </div>
            <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white">
              Built for Developers.<br />
              <span className="text-emerald-400">Fortified for Zero-Trust SecOps.</span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Integrate military-grade encryption, HMAC WORM audit logging, and AI automated containment in just 2 lines of code.
            </p>

            <div className="space-y-3 pt-2">
              <FeatureCheck text="Automatic Zero-Allocation Rust Memory Zeroization" />
              <FeatureCheck text="Instant Ephemeral Token Revocation & Isolation on Anomaly Spike" />
              <FeatureCheck text="Cryptographic Proof-of-Possession (PoP) & IP Attestation" />
              <FeatureCheck text="Immutable HMAC-SHA256 WORM Audit Trails with PDF Export" />
            </div>

            <div className="pt-4">
              <button 
                onClick={onDocs}
                className="text-emerald-400 hover:text-emerald-300 font-mono text-sm inline-flex items-center gap-2 group font-semibold"
              >
                <span>Explore Full Documentation & SDKs</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 🟣 BENTO FEATURES GRID */}
      <section className="features-grid py-28 px-6 relative z-20 bg-[#030817] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-display mb-4 text-white">
              Enterprise Defense Capabilities
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base">
              Hardened cryptography meets adaptive machine learning for continuous infrastructure resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Spotlight Follower */}
            <div
              className="pointer-events-none fixed inset-0 z-30"
              style={{
                background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16,185,129,0.06), transparent 40%)`,
                transition: 'background 0.15s ease-out'
              }}
            />

            <BentoCard 
              icon={Lock} 
              title="AES-256-GCM AEAD" 
              desc="Authenticated encryption with per-key IVs, tamper resistance, and fingerprint indexing." 
              badge="HARDWARE GRADE"
            />
            <BentoCard 
              icon={ShieldAlert} 
              title="8-Signal AI Anomaly Engine" 
              desc="Live scoring of velocity spikes, IP deviations, and sensitive payment scope escalations." 
              badge="AUTOMATED CONTAINMENT"
            />
            <BentoCard 
              icon={FileCode2} 
              title="HMAC WORM Audit Logs" 
              desc="Cryptographically sealed audit logs with forensic PDF and SIEM JSON extraction." 
              badge="NIST COMPLIANT"
            />
            <BentoCard 
              icon={Database} 
              title="Argon2id Human RBAC" 
              desc="GPU-resistant password hashing, 6-digit MFA OTPs, and access elevation workflows." 
              badge="ZERO-TRUST CONTROL"
            />
            <BentoCard 
              icon={Cpu} 
              title="Rust Memory Safety" 
              desc="FFI attestation executing in native memory with instant zeroization of secrets." 
              badge="ZERO-ALLOCATION"
            />
            <BentoCard 
              icon={Radio} 
              title="Real-Time Threat Radar" 
              desc="Live telemetry streams, threat heatmaps, and interactive attack defense simulator." 
              badge="SOC COMMAND"
            />
          </div>

          {/* 🟢 BOTTOM CALL TO ACTION */}
          <div className="mt-28 p-10 sm:p-14 rounded-3xl bg-[#0a1428]/80 border border-emerald-500/20 text-center relative overflow-hidden backdrop-blur-xl bottom-cta-section">
            <div className="absolute inset-0 cyber-grid-pattern opacity-30"></div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight font-display text-white">
                Fortify Your Machine Infrastructure Today.
              </h2>
              <p className="text-slate-300 text-base md:text-lg">
                Protect sensitive payment scopes, microservices, and AI agents with real-time non-human identity governance.
              </p>
              <div className="pt-2">
                <button
                  onClick={onStart}
                  className="px-9 py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-extrabold rounded-2xl text-base transition-all duration-300 shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:scale-105"
                >
                  Access AKIRA Gateway Console
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatBox({ label, value, color, icon }) {
  const Icon = icon;
  return (
    <div className="p-3 rounded-xl bg-[#0b1428]/60 border border-white/[0.05] flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/[0.04] text-emerald-400">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">{label}</p>
        <p className={`font-mono text-xs sm:text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function PipelineCard({ step, title, desc, tag, icon }) {
  const Icon = icon;
  return (
    <div className="pipeline-card p-6 rounded-2xl bg-[#091122]/70 border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between group shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-slate-400 bg-white/[0.05] px-2.5 py-1 rounded-lg">
            {step}
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <h3 className="font-bold text-base text-white mb-2 font-display">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{desc}</p>
      </div>
      <div className="pt-3 border-t border-white/[0.06]">
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {tag}
        </span>
      </div>
    </div>
  );
}

function BentoCard({ icon, title, desc, badge }) {
  const Icon = icon;
  return (
    <div className="feature-card relative p-7 rounded-2xl bg-[#081020]/75 border border-white/[0.07] overflow-hidden hover:border-emerald-500/30 hover:bg-[#0c162d]/80 transition-all duration-300 group shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Icon size={22} />
          </div>
          {badge && (
            <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.06]">
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold mb-2 text-white font-display">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCheck({ text }) {
  return (
    <div className="flex items-center gap-3 text-slate-300 text-sm">
      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </div>
      <span>{text}</span>
    </div>
  );
}