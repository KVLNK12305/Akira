import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, ChevronRight, Lock, Globe, Server, Activity, Database, Zap, Terminal, Code, Cpu, LogIn } from "lucide-react";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// 1. ADD 'onDocs' TO PROPS
export function HeroView({ onStart, onDocs }) {
  const container = useRef();
  const heroText = useRef();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mouse Spotlight Logic
  const handleMouseMove = (e) => {
    if (!container.current) return;
    const rect = container.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useGSAP(() => {
    // 1. INTRO ANIMATION
    const tl = gsap.timeline();
    
    tl.from(".nav-item", { y: -20, opacity: 0, stagger: 0.1, duration: 0.8, ease: "power2.out" })
      .from(".hero-char", { y: 100, opacity: 0, stagger: 0.05, duration: 1, ease: "power4.out" }, "-=0.5")
      .from(".hero-sub", { y: 20, opacity: 0, duration: 0.8 }, "-=0.5")
      .from(".hero-badge", { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(1.7)" }, "-=0.7");

    // 2. PINNED HERO SCROLL
    gsap.to(".hero-container", {
      scrollTrigger: {
        trigger: ".hero-container",
        start: "top top",
        end: "+=900",
        scrub: true,
        pin: true,
      },
      scale: 0.8,
      opacity: 0,
      filter: "blur(20px)",
      y: -100
    });

    // 3. ARCHITECTURE FLOW ANIMATION
    gsap.to(".packet", {
      motionPath: {
        path: "#path-line",
        align: "#path-line",
        alignOrigin: [0.5, 0.5],
        autoRotate: true
      },
      duration: 2,
      repeat: -1,
      ease: "none"
    });

    // 4. FEATURE CARDS REVEAL
    gsap.from(".feature-card", {
      scrollTrigger: {
        trigger: ".features-grid",
        start: "top 85%",
        end: "top 20%",
        scrub: 1,
      },
      y: 150,
      opacity: 0,
      stagger: 0.1,
    });

  }, { scope: container });

  return (
    <div ref={container} onMouseMove={handleMouseMove} className="bg-slate-950 text-white overflow-x-hidden selection:bg-emerald-500/30 relative">
      
      {/* 🟢 STICKY NAVBAR */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
        <div className="nav-item flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          Secure<span className="text-emerald-400">Gateway</span>
        </div>
        
        <div className="flex items-center gap-4">
           {/* 2. UPDATED ONCLICK TO 'onDocs' */}
           <button onClick={onDocs} className="nav-item hidden md:flex text-slate-400 hover:text-white text-sm font-medium transition-colors">
             Documentation
           </button>
           <button 
             onClick={onStart}
             className="nav-item bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2"
           >
             Sign In <LogIn size={14} />
           </button>
        </div>
      </nav>

      {/* 🟢 HERO SECTION (Pinned) */}
      <section className="hero-container h-screen flex flex-col items-center justify-center relative z-20 pt-20">
        
        {/* Living Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
          {/* Animated Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>
        </div>

        {/* Dynamic Badge */}
        <div className="hero-badge mb-8 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-md flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          System Online • v2.4.0
        </div>

        {/* Massive Typography */}
        <h1 ref={heroText} className="text-6xl md:text-9xl font-black tracking-tighter text-center leading-[0.85] mb-8 relative z-10">
          <div className="overflow-hidden flex justify-center gap-1 sm:gap-4">
            {['S','E','C','U','R','E'].map((char,i) => (
              <span key={i} className="hero-char inline-block bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">{char}</span>
            ))}
          </div>
          <div className="overflow-hidden flex justify-center gap-1 sm:gap-4 text-emerald-500 mix-blend-plus-lighter">
             {['G','A','T','E','W','A','Y'].map((char,i) => (
              <span key={i} className="hero-char inline-block">{char}</span>
            ))}
          </div>
        </h1>

        <p className="hero-sub text-xl md:text-2xl text-slate-400 max-w-2xl text-center leading-relaxed font-light mb-12">
          The autonomous security layer for modern APIs. <br/> 
          Deploy in seconds. Sleep soundly forever.
        </p>

        {/* ✅ PRIMARY CTA */}
        <button 
          onClick={onStart}
          className="hero-sub group relative px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:bg-emerald-400 transition-all duration-300 flex items-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] hover:scale-105"
        >
          Initialize System
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>

      </section>

      {/* 🔵 VISUAL FLOW SECTION */}
      <section className="py-24 relative z-20 border-t border-white/5 bg-slate-950/80 backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Description */}
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
              <Activity className="text-blue-400" />
            </div>
            <h2 className="text-4xl font-bold mb-6">See the traffic.<br/><span className="text-blue-400">Control the flow.</span></h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Visualise every request in real-time. Our engine inspects, decrypts, and validates tokens before they ever reach your core infrastructure.
            </p>
            
            <div className="space-y-4">
              <FlowItem label="Latency" value="12ms" />
              <FlowItem label="Encryption" value="AES-256" />
              <FlowItem label="Uptime" value="99.99%" />
            </div>
          </div>

          {/* Right: The Diagram Animation */}
          <div className="relative h-[400px] w-full bg-slate-900/50 rounded-3xl border border-slate-800 p-8 flex items-center justify-center overflow-hidden">
            {/* The SVG Diagram */}
            <div className="relative z-10 w-full max-w-md flex justify-between items-center">
              <Node icon={Globe} label="User" color="text-slate-400" />
              
              {/* The Path */}
              <div className="flex-1 h-[2px] bg-slate-800 relative mx-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent w-[50%] animate-[shimmer_2s_infinite_linear]"></div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                <Node icon={ShieldCheck} label="Gateway" color="text-emerald-400" bg="bg-emerald-950 border-emerald-500/50" />
              </div>

              {/* The Path */}
              <div className="flex-1 h-[2px] bg-slate-800 relative mx-4 overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500 to-transparent w-[50%] animate-[shimmer_2s_infinite_linear] delay-75"></div>
              </div>

              <Node icon={Database} label="Server" color="text-purple-400" />
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          </div>

        </div>
      </section>

      {/* 🟠 DEVELOPER EXPERIENCE SECTION */}
      <section className="py-32 relative z-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: The Terminal */}
          <div className="perspective-1000 group">
            <div className="relative bg-[#0d1117] rounded-xl border border-slate-800 shadow-2xl p-6 font-mono text-sm transform transition-transform duration-500 group-hover:rotate-y-6 group-hover:rotate-x-6">
              {/* Window Controls */}
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              
              {/* Code */}
              <div className="space-y-2 text-slate-300">
                <p><span className="text-pink-400">import</span> &#123; SecureGateway &#125; <span className="text-pink-400">from</span> <span className="text-green-400">'@secure/sdk'</span>;</p>
                <p>&nbsp;</p>
                <p><span className="text-blue-400">const</span> gateway = <span className="text-pink-400">new</span> SecureGateway(&#123;</p>
                <p className="pl-4">apiKey: <span className="text-green-400">process.env.API_KEY</span>,</p>
                <p className="pl-4">encryption: <span className="text-green-400">'AES-256'</span>,</p>
                <p className="pl-4">monitor: <span className="text-orange-400">true</span></p>
                <p>&#125;);</p>
                <p>&nbsp;</p>
                <p className="text-slate-500">// Initialize Protection</p>
                <p><span className="text-purple-400">await</span> gateway.connect();</p>
                <p className="text-emerald-400 animate-pulse">_</p>
              </div>

              {/* Glow Reflection */}
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* Right: Copy */}
          <div className="order-first lg:order-last text-right">
             <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 ml-auto">
              <Terminal className="text-orange-400" />
            </div>
            <h2 className="text-4xl font-bold mb-6">Built for Developers.<br/><span className="text-orange-400">Loved by SecOps.</span></h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Integration so simple, it feels like cheating. Paste our SDK snippet and instantly gain Role-Based Access Control and Audit Logging.
            </p>
            {/* 3. UPDATED ONCLICK TO 'onDocs' */}
            <button onClick={onDocs} className="text-orange-400 font-mono text-sm hover:text-orange-300 flex items-center gap-2 justify-end group ml-auto">
              Read Documentation <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* 🟣 FEATURES GRID (Spotlight Effect) */}
      <section className="features-grid min-h-screen py-32 px-6 relative z-20 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-4xl md:text-5xl font-bold mb-6">Everything you need.</h2>
             <p className="text-slate-400">No bloat. Just security.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 group/grid">
             {/* Mouse Spotlight Layer */}
             <div 
                className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16,185,129,0.06), transparent 40%)`
                }}
             />

             <BentoCard icon={Lock} title="AES-256 Encryption" desc="Data at rest is mathematically impossible to crack." />
             <BentoCard icon={Globe} title="Edge Network" desc=" deployed across 35 regions for <10ms latency." />
             <BentoCard icon={Server} title="Audit Logs" desc="Forensic-grade logging for every API request." />
             <BentoCard icon={Database} title="Secure Storage" desc="NIST-compliant salted hashing (Argon2id)." />
             <BentoCard icon={Cpu} title="Rate Limiting" desc="Prevent DDoS attacks with intelligent throttling." />
             <BentoCard icon={Code} title="Type-Safe SDK" desc="Full TypeScript support out of the box." />
          </div>

          {/* 🟢 BOTTOM CTA (Catches User at End) */}
          <div className="mt-32 p-12 rounded-3xl bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-white/10 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
             <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">Ready to secure your world?</h2>
             <button 
              onClick={onStart}
              className="relative z-10 px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/50"
             >
               Start Integration Now
             </button>
          </div>
        </div>
      </section>

    </div>
  );
}

// --- SUBCOMPONENTS ---

function Node({ icon: Icon, label, color, bg = "bg-slate-900 border-slate-700" }) {
  return (
    <div className={`flex flex-col items-center gap-3 relative z-10`}>
      <div className={`w-16 h-16 rounded-2xl ${bg} border flex items-center justify-center shadow-xl`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <span className="text-xs font-mono uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  )
}

function FlowItem({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-emerald-400">{value}</span>
    </div>
  )
}

function BentoCard({ icon: Icon, title, desc }) {
  return (
    <div className="feature-card relative p-8 rounded-3xl bg-slate-900/40 border border-white/5 overflow-hidden hover:bg-slate-900/60 transition-colors group">
      {/* Border Reveal on Hover */}
      <div className="absolute inset-0 border border-emerald-500/0 group-hover:border-emerald-500/20 rounded-3xl transition-colors pointer-events-none"></div>
      
      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-slate-200 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-100">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}