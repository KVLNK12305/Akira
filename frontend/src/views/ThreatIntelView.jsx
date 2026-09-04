import React, { useState, useEffect } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Zap, Activity,
  Server, Lock, Unlock, Play, RefreshCw, Eye, CheckCircle2,
  XCircle, Filter, Plus, Trash2, Sliders, ArrowUpRight,
  TrendingUp, Cpu, Radio, ChevronRight, X
} from "lucide-react";
import api from "../api/axios";

export function ThreatIntelView({ notify }) {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Sub-tabs navigation: 'telemetry' | 'simulator' | 'profiles'
  const [sentinelTab, setSentinelTab] = useState("telemetry");
  const [selectedScenario, setSelectedScenario] = useState("PAYMENT_EXFILTRATION");

  // Modals state
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const scenarioDetails = {
    PAYMENT_EXFILTRATION: {
      id: 'PAYMENT_EXFILTRATION',
      name: "Bulk Settlement Exfiltration",
      tag: "APT C2 Hijack",
      desc: "Adversary initiates high-frequency bulk settlements to offshore accounts outside operational UTC hours.",
      simulatedIP: "198.51.100.77 (Moscow Adversary ASN)",
      simulatedScopes: ["payment:settle", "refund:process", "ledger:write"],
      simulatedPath: "/api/v1/payment/settle-bulk",
      payloadVolume: "$85,000 Bulk Batch (120 transaction records)",
      attestStatus: "FAILED_ATTESTATION (Rust Memory Mismatch)",
      expectedScore: "85 - 100",
      signalsPredicted: ["IP_DEVIATION (+25)", "SCOPE_ESCALATION (+30)", "VELOCITY_SPIKE (+20)", "FAILED_ATTESTATION (+35)"]
    },
    UNAUTHORIZED_REFUND: {
      id: 'UNAUTHORIZED_REFUND',
      name: "High-Value Refund Hijack",
      tag: "Reversal Attack",
      desc: "Compromised machine credential attempts unauthorized forced reversals exceeding daily velocity baselines.",
      simulatedIP: "185.220.101.5 (Tor Exit Node)",
      simulatedScopes: ["refund:process"],
      simulatedPath: "/api/v1/payment/refund",
      payloadVolume: "$89,000 Unverified Reversal Transaction",
      attestStatus: "POLICY_VIOLATION (Restricted Scope)",
      expectedScore: "75 - 95",
      signalsPredicted: ["MALICIOUS_IP (+40)", "HIGH_VALUE_SCOPE (+15)", "SCOPE_ESCALATION (+30)"]
    },
    IMPOSSIBLE_TRAVEL: {
      id: 'IMPOSSIBLE_TRAVEL',
      name: "Impossible Geolocation Travel",
      tag: "Physics Anomaly",
      desc: "Machine key invokes gateway from Tokyo datacenters < 2 minutes after NYC operations (Velocity > Mach 8).",
      simulatedIP: "203.0.113.88 (Tokyo Datacenter)",
      simulatedScopes: ["payment:authorize", "ledger:read"],
      simulatedPath: "/api/v1/payment/charge",
      payloadVolume: "10,852 km displacement across continental networks",
      attestStatus: "GEOLOCATION_PHYSICS_VIOLATION",
      expectedScore: "90 - 100",
      signalsPredicted: ["IMPOSSIBLE_TRAVEL (+45)", "IP_DEVIATION (+25)", "DEVICE_ANOMALY (+25)"]
    },
    COMPROMISED_KEY_BREACH: {
      id: 'COMPROMISED_KEY_BREACH',
      name: "DarkWeb Leaked Secret + Tor Node",
      tag: "Breach Feed Match",
      desc: "Inbound machine request presents credential matching threat intelligence feed of compromised processor keys.",
      simulatedIP: "185.220.101.45 (Tor Exit Subnet)",
      simulatedScopes: ["payment:settle"],
      simulatedPath: "/api/v1/payment/settle",
      payloadVolume: "High-entropy root key leaked in public breach database",
      attestStatus: "REVOKED_SECRET_INTERCEPTION",
      expectedScore: "100 / 100",
      signalsPredicted: ["COMPROMISED_CREDENTIAL (+50)", "MALICIOUS_IP (+40)", "FAILED_ATTESTATION (+35)"]
    }
  };

  // New Policy form state
  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    priority: 1,
    conditions: {
      scopes: ["payment:settle", "refund:process"],
      riskThreshold: 75,
      signals: ["IP_DEVIATION", "SCOPE_ESCALATION"]
    },
    actions: {
      quarantineKey: true,
      revokeTokens: true,
      alertAdmins: true,
      blockRequest: true
    }
  });

  const availableScopes = [
    'payment:initiate', 'payment:authorize', 'payment:settle',
    'refund:process', 'ledger:read', 'ledger:write',
    'read:data', 'write:data', 'delete:data'
  ];



  useEffect(() => {
    fetchThreatData();

    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchThreatData(false);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchThreatData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [statsRes, eventsRes, profilesRes, policiesRes] = await Promise.allSettled([
        api.get('/v1/risk/stats'),
        api.get('/v1/risk/events?limit=25'),
        api.get('/v1/risk/profiles'),
        api.get('/v1/policies')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data.events || []);
      if (profilesRes.status === 'fulfilled') setProfiles(profilesRes.value.data || []);
      if (policiesRes.status === 'fulfilled') setPolicies(policiesRes.value.data || []);
    } catch (err) {
      console.error("Threat data fetch error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleQuarantine = async (keyId, name) => {
    try {
      await api.post(`/v1/risk/containment/${keyId}/quarantine`, {
        reason: "Manual Admin Containment via Threat Intel Console"
      });
      notify(`Identity '${name}' has been QUARANTINED!`, "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Quarantine failed", "error");
    }
  };

  const handleRelease = async (keyId, name) => {
    try {
      await api.post(`/v1/risk/containment/${keyId}/release`);
      notify(`Identity '${name}' quarantine released.`, "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Release failed", "error");
    }
  };

  const handleTogglePolicy = async (policyId, currentStatus) => {
    try {
      await api.put(`/v1/policies/${policyId}`, { enabled: !currentStatus });
      notify("Containment policy updated", "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Failed to update policy", "error");
    }
  };

  const handleDeletePolicy = async (policyId) => {
    try {
      await api.delete(`/v1/policies/${policyId}`);
      notify("Policy removed", "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Failed to delete policy", "error");
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      await api.post('/v1/policies', policyForm);
      notify("New Containment Policy deployed!", "success");
      setIsPolicyModalOpen(false);
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Failed to create policy", "error");
    }
  };

  const handleRunSimulation = async (scenario) => {
    const targetScenario = scenario || selectedScenario;
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await api.post('/v1/risk/simulate-attack', { attackScenario: targetScenario });
      setSimulationResult(res.data);
      notify(`Simulation Executed: ${scenarioDetails[targetScenario]?.name || targetScenario}`, "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Simulation error", "error");
    } finally {
      setSimulating(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filterLevel === "ALL") return true;
    return e.riskLevel === filterLevel;
  });

  const getRiskColor = (score) => {
    if (score >= 75) return "text-red-400 border-red-500/30 bg-red-500/10";
    if (score >= 50) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    if (score >= 25) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case "CRITICAL":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse flex items-center gap-1"><ShieldAlert size={12} /> CRITICAL</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center gap-1"><AlertTriangle size={12} /> HIGH</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center gap-1"><Activity size={12} /> MEDIUM</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1"><ShieldCheck size={12} /> LOW</span>;
    }
  };

  return (
    <div className="space-y-8 animate-[fade-in_0.3s]">

      {/* TOP BANNER & LIVE CONTROLS */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_25px_-5px_rgba(239,68,68,0.4)]">
            <Zap size={28} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">AI Threat Intelligence & Automated Containment</h2>
              <span className="bg-red-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">LIVE SENTINEL</span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Real-time heuristic & behavioral anomaly interception for machine identities in payment infrastructure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              autoRefresh ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Radio size={14} className={autoRefresh ? "animate-pulse text-emerald-400" : ""} />
            {autoRefresh ? "LIVE POLLING ON" : "POLLING PAUSED"}
          </button>

          <button
            onClick={() => setSentinelTab("simulator")}
            className={`font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
              sentinelTab === "simulator"
                ? "bg-red-500 text-white shadow-[0_0_20px_-5px_rgba(239,68,68,0.7)]"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]"
            }`}
          >
            <Play size={16} /> Live Attack Simulator
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
          <button
            onClick={() => setSentinelTab("telemetry")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              sentinelTab === "telemetry"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <Activity size={14} className={sentinelTab === "telemetry" ? "animate-pulse text-emerald-400" : ""} />
            REAL-TIME STREAM & RADAR
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>

          <button
            onClick={() => setSentinelTab("simulator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              sentinelTab === "simulator"
                ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <Play size={14} className={sentinelTab === "simulator" ? "text-red-400" : ""} />
            ATTACK SIMULATOR & CONTAINMENT COCKPIT
            <span className="bg-red-500/30 text-red-300 text-[10px] px-1.5 py-0.2 rounded border border-red-500/40">4 VECTORS</span>
          </button>

          <button
            onClick={() => setSentinelTab("profiles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
              sentinelTab === "profiles"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <Server size={14} className={sentinelTab === "profiles" ? "text-cyan-400" : ""} />
            MACHINE BASELINES & IDENTITY REGISTRY
            <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.2 rounded">
              {profiles.length} NHI
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Zero-Trust Policy Engine: <strong className="text-emerald-400">ENFORCING</strong></span>
        </div>
      </div>

      {/* 1. THREAT RADAR & TELEMETRY OVERVIEW */}
      {sentinelTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Radar Visualizer Box (1 col on large screens) */}
        <div className="lg:col-span-1 bg-[#091122]/90 border border-emerald-500/30 p-4 rounded-2xl backdrop-blur-xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 cyber-grid-pattern opacity-30"></div>
          
          {/* Circular Radar Screen */}
          <div className="relative w-28 h-28 rounded-full border border-emerald-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-[#040914]/80">
            {/* Concentric rings */}
            <div className="absolute w-20 h-20 rounded-full border border-emerald-500/25"></div>
            <div className="absolute w-12 h-12 rounded-full border border-emerald-500/20"></div>
            <div className="absolute w-full h-[1px] bg-emerald-500/20"></div>
            <div className="absolute h-full w-[1px] bg-emerald-500/20"></div>
            
            {/* Rotating Radar Sweep Needle */}
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(16,185,129,0.4)_360deg)] animate-[radar-sweep_3.5s_linear_infinite] pointer-events-none"></div>

            {/* Target Blips */}
            <div className="absolute top-6 right-7 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <div className="absolute bottom-6 left-8 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
            {stats?.summary?.quarantinedIdentities > 0 && (
              <div className="absolute top-8 left-6 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
            )}
            
            <ShieldAlert size={18} className="text-emerald-400 relative z-10" />
          </div>
          
          <div className="mt-2 text-center relative z-10">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              RADAR ACTIVE
            </span>
            <p className="text-[9px] text-slate-400 font-mono">8-SIGNAL SCANNER</p>
          </div>
        </div>

        {/* 4 Heatmap Metric Cards */}
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Assessed */}
          <div className="bg-[#091122]/90 border border-white/[0.08] hover:border-cyan-500/30 p-4 rounded-2xl backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Total Evaluated</span>
              <Activity size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white font-mono">{stats?.summary?.totalEvaluations || 0}</p>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-mono font-medium">
                <CheckCircle2 size={11} /> Continuous M2M
              </p>
            </div>
          </div>

          {/* Card 2: Contained Events */}
          <div className="bg-[#091122]/90 border border-white/[0.08] hover:border-rose-500/40 p-4 rounded-2xl backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Contained Events</span>
              <ShieldAlert size={16} className="text-rose-400 animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-rose-400 font-mono">{stats?.summary?.containedCount || 0}</p>
              <p className="text-[11px] text-rose-400/90 mt-1 flex items-center gap-1 font-mono font-medium">
                <XCircle size={11} /> Auto-Quarantined
              </p>
            </div>
          </div>

          {/* Card 3: Active Quarantines */}
          <div className="bg-[#091122]/90 border border-white/[0.08] hover:border-amber-500/40 p-4 rounded-2xl backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">Quarantined NHIs</span>
              <Lock size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-400 font-mono">{stats?.summary?.quarantinedIdentities || 0}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">Tokens Revoked</p>
            </div>
          </div>

          {/* Card 4: Avg Risk Score */}
          <div className="bg-[#091122]/90 border border-white/[0.08] hover:border-emerald-500/40 p-4 rounded-2xl backdrop-blur-xl transition-all shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">System Risk Index</span>
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-emerald-400 font-mono">{stats?.summary?.avgRiskScore || 0}</p>
                <span className="text-xs text-slate-500 font-mono">/ 100</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(stats?.summary?.avgRiskScore || 5, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT SECTION: LIVE RISK FEED & ANOMALIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS: LIVE RISK EVENT STREAM */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-red-400" />
              <h3 className="font-bold text-white text-base">Real-Time Risk & Anomaly Stream</h3>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterLevel === lvl
                      ? 'bg-slate-700 text-white font-bold border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-500 font-mono">
                No risk events matching current filter.
              </div>
            ) : (
              filteredEvents.map((evt) => (
                <div
                  key={evt._id}
                  className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
                    evt.action === 'CONTAINED'
                      ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2.5">
                      {getLevelBadge(evt.riskLevel)}
                      <span className="font-bold text-white text-sm">{evt.machineName}</span>
                      <span className="text-xs text-slate-500 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">
                        Score: {evt.riskScore}/100
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-mono space-y-1 mb-2">
                    <p className="text-slate-400">
                      <span className="text-slate-500">Path:</span> <span className="text-cyan-400">{evt.requestMethod} {evt.requestPath}</span>
                      {evt.clientIP && <span className="ml-3 text-slate-500">IP: <span className="text-amber-300">{evt.clientIP}</span></span>}
                    </p>
                  </div>

                  {/* Signals Badges */}
                  {evt.signals && evt.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {evt.signals.map((sig, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          {sig.signal} (+{sig.weight})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Containment executed indicator */}
                  {evt.action === 'CONTAINED' && (
                    <div className="mt-3 pt-2 border-t border-red-500/20 flex items-center justify-between text-xs text-red-400 font-mono">
                      <span className="flex items-center gap-1 font-bold">
                        <Lock size={12} /> AUTOMATED CONTAINMENT APPLIED
                      </span>
                      <span>{evt.containmentActions?.join(' • ')}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ANOMALY SIGNALS & TOP THREAT POLICIES */}
        <div className="space-y-6">
          
          {/* Top Threat Signals Card */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md shadow-xl">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              Prevalent Anomaly Signals
            </h3>
            <div className="space-y-3">
              {stats?.topSignals && stats.topSignals.length > 0 ? (
                stats.topSignals.map((sig, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{sig.signal}</span>
                      <span className="text-cyan-400 font-bold">{sig.count} hits</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${Math.min((sig.count / (stats?.summary?.totalEvaluations || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No signal clusters identified yet.</p>
              )}
            </div>
          </div>

          {/* Containment Policies Summary */}
          <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl backdrop-blur-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-400" />
                Active Containment Policies
              </h3>
              <button
                onClick={() => setIsPolicyModalOpen(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                <Plus size={14} /> New Policy
              </button>
            </div>

            <div className="space-y-2.5">
              {policies.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No automated containment policies configured.</p>
              ) : (
                policies.slice(0, 4).map((p) => (
                  <div key={p._id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{p.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Threshold: &ge; {p.conditions?.riskThreshold || 75} • Pri {p.priority}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePolicy(p._id, p.enabled)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${p.enabled ? 'bg-purple-600' : 'bg-slate-700'}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${p.enabled ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(p._id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
    )}

      {/* 2. ATTACK SIMULATOR & ZERO-TRUST CONTAINMENT COCKPIT */}
      {sentinelTab === "simulator" && (
        <div className="space-y-4">
          {/* Cockpit Top Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Play size={18} className="fill-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Tactical Adversary Simulation Cockpit
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    ACTIVE SANDBOX
                  </span>
                </h3>
                <p className="text-slate-400 text-xs">
                  Inject synthetic APT vectors against machine identities to evaluate real-time Zero-Trust heuristics & automated containment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Defense Enclave: <strong className="text-emerald-400">ONLINE</strong></span>
            </div>
          </div>

          {/* Cockpit 2-Column Split: Left 5 cols (Scenario Matrix & Parameters), Right 7 cols (Live Defense Telemetry & Containment Result) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT COLUMN: SCENARIOS & ADVERSARY PARAMS (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Scenarios Selector */}
              <div className="bg-[#091122]/90 border border-white/[0.08] p-4 rounded-2xl backdrop-blur-xl shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    1. Select Attack Vector
                  </span>
                  <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    4 APT PROFILES
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.values(scenarioDetails).map((sc) => {
                    const isSelected = selectedScenario === sc.id;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => {
                          setSelectedScenario(sc.id);
                          setSimulationResult(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                          isSelected
                            ? "bg-red-950/40 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`}></span>
                            <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                              {sc.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 pl-4">
                            {sc.desc}
                          </p>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border whitespace-nowrap ml-2 ${
                          isSelected ? 'bg-red-500/20 text-red-300 border-red-500/40 font-bold' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {sc.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Scenario Attack Parameters */}
              {selectedScenario && scenarioDetails[selectedScenario] && (
                <div className="bg-[#091122]/90 border border-white/[0.08] p-4 rounded-2xl backdrop-blur-xl shadow-xl space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      2. Adversary Injection Specs
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">ARMED</span>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Target Route:</span>
                      <span className="text-cyan-300 font-bold text-right truncate">
                        {scenarioDetails[selectedScenario].simulatedPath}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Inbound IP:</span>
                      <span className="text-amber-300 text-right truncate">
                        {scenarioDetails[selectedScenario].simulatedIP}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Attest Probe:</span>
                      <span className="text-rose-400 text-right text-[11px] truncate">
                        {scenarioDetails[selectedScenario].attestStatus}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Expected Score:</span>
                      <span className="text-red-400 font-bold">
                        {scenarioDetails[selectedScenario].expectedScore}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Target Scopes:</span>
                      <div className="flex flex-wrap gap-1">
                        {scenarioDetails[selectedScenario].simulatedScopes.map((s, i) => (
                          <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Launch Attack Button */}
                  <button
                    onClick={() => handleRunSimulation(selectedScenario)}
                    disabled={simulating}
                    className="w-full mt-3 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 shadow-[0_0_25px_-5px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw size={15} className="animate-spin text-white" />
                        INJECTING & SCORING HEURISTICS...
                      </>
                    ) : (
                      <>
                        <Zap size={15} className="text-amber-300 animate-pulse" />
                        LAUNCH ADVERSARY SIMULATION
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: LIVE CONTAINMENT & TELEMETRY TERMINAL (7 cols) */}
            <div className="lg:col-span-7">
              
              {!simulationResult && !simulating && (
                <div className="bg-[#091122]/90 border border-white/[0.08] p-6 rounded-2xl backdrop-blur-xl shadow-xl flex flex-col items-center justify-center min-h-[380px] text-center space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 cyber-grid-pattern opacity-20 pointer-events-none"></div>
                  
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 relative z-10 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <ShieldAlert size={32} />
                  </div>

                  <div className="max-w-md space-y-1.5 relative z-10">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Zero-Trust Defense Cockpit Armed
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select an attack vector on the left and click <span className="text-red-400 font-bold">"LAUNCH ADVERSARY SIMULATION"</span>. The AI Sentinel will intercept the synthetic request, evaluate behavioral deviation weights, and trigger automated quarantine.
                    </p>
                  </div>

                  <div className="w-full max-w-lg p-3 bg-black/50 border border-slate-800 rounded-xl text-left font-mono text-[11px] text-slate-400 space-y-1.5 relative z-10">
                    <div className="text-slate-500 uppercase tracking-widest text-[9px] border-b border-white/5 pb-1">
                      Real-Time Interception Pipeline
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-emerald-400 font-bold">STAGE 1:</span> Gateway Ingress & Rust Binary Attestation (eBPF)
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-cyan-400 font-bold">STAGE 2:</span> Non-Human Identity Behavioral Heuristic Engine
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-amber-400 font-bold">STAGE 3:</span> Dynamic Risk Score Scoring (&ge; 75 Threshold)
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-rose-400 font-bold">STAGE 4:</span> SPIFFE SVID Revocation, API Key Quarantine, HTTP 403
                    </div>
                  </div>
                </div>
              )}

              {simulating && (
                <div className="bg-[#091122]/90 border border-red-500/30 p-6 rounded-2xl backdrop-blur-xl shadow-xl flex flex-col justify-center min-h-[380px] space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                    <div className="flex items-center gap-2 text-red-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                      INTERCEPTING ADVERSARY PAYLOAD...
                    </div>
                    <span className="text-slate-400 text-[10px]">SOC TELEMETRY STREAM</span>
                  </div>

                  <div className="p-4 bg-black/60 rounded-xl border border-red-500/20 space-y-2 text-slate-300">
                    <div className="text-cyan-400 flex items-center gap-2">
                      <span className="text-slate-600">[0.012s]</span> Inbound HTTP packet intercepted at edge gateway
                    </div>
                    <div className="text-rose-400 flex items-center gap-2">
                      <span className="text-slate-600">[0.038s]</span> Rust attestation mismatch flagged (NO_MATCH)
                    </div>
                    <div className="text-amber-400 flex items-center gap-2">
                      <span className="text-slate-600">[0.065s]</span> Deviations detected: IP subnet, atypical scopes, velocity spike
                    </div>
                    <div className="text-purple-400 flex items-center gap-2">
                      <span className="text-slate-600">[0.089s]</span> Calculating multi-signal heuristic score matrix...
                    </div>
                    <div className="text-emerald-400 flex items-center gap-2 animate-pulse">
                      <span className="text-slate-600">[0.114s]</span> Executing automated containment protocol...
                    </div>
                  </div>
                </div>
              )}

              {simulationResult && !simulating && (
                <div className="bg-[#091122]/95 border border-red-500/40 p-5 rounded-2xl backdrop-blur-xl shadow-2xl space-y-4">
                  
                  {/* Containment Status Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-950/40 border border-red-500/30 p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                        <Lock size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                            ATTACK CONTAINED &bull; IDENTITY QUARANTINED
                          </h4>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                          Autonomous mitigation triggered in &lt; 45ms. Target machine locked out.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-mono font-extrabold rounded-md shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {simulationResult.assessment?.riskLevel || 'CRITICAL'} RISK
                      </span>
                    </div>
                  </div>

                  {/* 3 Metrics Cards */}
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Assessed Risk Score</span>
                      <div className="text-xl font-extrabold text-red-400 mt-0.5">
                        {simulationResult.assessment?.riskScore || 0}<span className="text-xs text-slate-500">/100</span>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Target Machine</span>
                      <div className="text-xs font-bold text-white mt-1 truncate" title={simulationResult.targetMachine}>
                        {simulationResult.targetMachine || 'Payment Worker'}
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Containment Action</span>
                      <div className="text-xs font-bold text-emerald-400 mt-1">
                        QUARANTINED
                      </div>
                    </div>
                  </div>

                  {/* Triggered Signals Breakdown */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Heuristic Signals Triggered</span>
                      <span className="text-[10px] text-slate-500">
                        {simulationResult.assessment?.signals?.length || 0} DEVIATION VECTORS
                      </span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {simulationResult.assessment?.signals?.map((s, idx) => (
                        <div
                          key={idx}
                          className="bg-red-950/30 border border-red-500/30 p-2.5 rounded-lg flex items-center justify-between font-mono text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <AlertTriangle size={13} className="text-red-400 shrink-0" />
                            <span className="text-slate-200 font-bold truncate">{s.signal}</span>
                          </div>
                          <span className="text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 text-[10px] shrink-0 ml-2">
                            +{s.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Containment Protocol Checklist */}
                  <div className="p-3 bg-black/40 border border-slate-800 rounded-xl font-mono text-xs space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/5 pb-1">
                      Autonomous Defense Enforcement
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} /> Machine API Key switched to QUARANTINED in database
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} /> Active ephemeral sessions & SPIFFE SVIDs mass-revoked
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                      <CheckCircle2 size={13} /> Reverse-proxy gateway returning HTTP 403 on subsequent invocations
                    </div>
                  </div>

                  {/* Remediation & Reset Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleRelease(simulationResult.targetKeyId || simulationResult.apiKeyId, simulationResult.targetMachine)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                      <Unlock size={14} /> Release Machine Quarantine
                    </button>

                    <button
                      onClick={() => setSimulationResult(null)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center gap-2 transition-all"
                    >
                      Reset Simulator HUD
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* 3. NON-HUMAN IDENTITY RISK PROFILES TABLE */}
      {sentinelTab === "profiles" && (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server size={20} className="text-emerald-400" />
              Machine Identity Behavioral Profiles
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Learned behavioral baselines and real-time containment control per machine actor.
            </p>
          </div>
          <button
            onClick={() => fetchThreatData()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-500 uppercase font-mono text-xs border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Machine Identity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk Score</th>
                <th className="px-6 py-4">Baseline Status</th>
                <th className="px-6 py-4">Known IPs</th>
                <th className="px-6 py-4">Payment Scopes</th>
                <th className="px-6 py-4 text-right">Containment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-mono italic">
                    No machine identity profiles recorded yet.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const keyData = p.apiKey || {};
                  const isQuarantined = keyData.status === 'QUARANTINED';
                  const riskScore = keyData.riskScore || 0;

                  return (
                    <tr key={p._id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isQuarantined ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`}></span>
                          {p.machineName}
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        {isQuarantined ? (
                          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-xs font-bold flex items-center gap-1 w-max">
                            <Lock size={12} /> QUARANTINED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-1 w-max">
                            <ShieldCheck size={12} /> ACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(riskScore)}`}>
                            {riskScore}/100
                          </span>
                          <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${riskScore > 50 ? 'bg-red-500' : 'bg-emerald-400'}`}
                              style={{ width: `${riskScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-mono">
                        {p.baselineEstablished ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Established ({p.totalRequests} reqs)
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Activity size={13} className="animate-spin" /> Learning ({p.totalRequests}/10)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-slate-300">
                        {p.knownIPs && p.knownIPs.length > 0 ? p.knownIPs.slice(0, 2).join(', ') : 'None'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(p.typicalScopes || keyData.scopes || []).map((s, i) => (
                            <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedProfile(p)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1"
                            title="Inspect Behavioral Model"
                          >
                            <Eye size={14} /> Profile
                          </button>

                          {isQuarantined ? (
                            <button
                              onClick={() => handleRelease(keyData._id, p.machineName)}
                              className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1"
                            >
                              <Unlock size={14} /> Release
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuarantine(keyData._id, p.machineName)}
                              className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-mono font-bold flex items-center gap-1"
                            >
                              <Lock size={14} /> Quarantine
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL: CREATE POLICY */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsPolicyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Containment Policy</h3>
                <p className="text-xs text-slate-400">Define automated response rules for high-risk machine actions.</p>
              </div>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Strict Payment Settle Guard"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Risk Threshold Trigger: &ge; {policyForm.conditions.riskThreshold}</label>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={policyForm.conditions.riskThreshold}
                  onChange={(e) => setPolicyForm({
                    ...policyForm,
                    conditions: { ...policyForm.conditions, riskThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Monitored Payment Scopes</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableScopes.map((scope) => {
                    const isSelected = policyForm.conditions.scopes.includes(scope);
                    return (
                      <button
                        type="button"
                        key={scope}
                        onClick={() => {
                          const newScopes = isSelected
                            ? policyForm.conditions.scopes.filter(s => s !== scope)
                            : [...policyForm.conditions.scopes, scope];
                          setPolicyForm({
                            ...policyForm,
                            conditions: { ...policyForm.conditions, scopes: newScopes }
                          });
                        }}
                        className={`px-2 py-1 rounded text-[11px] border transition-all ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {scope}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-lg mt-2"
              >
                Deploy Policy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE DETAIL INSPECT */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs font-mono">
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu size={18} className="text-cyan-400" />
              Machine Behavioral Model: {selectedProfile.machineName}
            </h3>

            <div className="p-4 bg-black/50 rounded-xl border border-slate-800 space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Baseline Status:</span>
                <span className="text-emerald-400 font-bold">
                  {selectedProfile.baselineEstablished ? 'LOCKED & ACTIVE' : 'LEARNING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Learned Requests:</span>
                <span>{selectedProfile.totalRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Avg Velocity:</span>
                <span>{selectedProfile.avgRequestsPerHour?.toFixed(1) || 0} req/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Learned IPs:</span>
                <span className="text-amber-300">{selectedProfile.knownIPs?.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Seen (UTC):</span>
                <span>{new Date(selectedProfile.lastSeen).toUTCString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
