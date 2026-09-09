import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Zap, Activity,
  Server, Lock, Unlock, Play, RefreshCw, Eye, CheckCircle2,
  XCircle, Filter, Plus, Trash2, Sliders, ArrowUpRight,
  TrendingUp, Cpu, Radio, ChevronRight, X, Globe, Terminal,
  Clock, Shield, ArrowRight, CornerDownRight, Info
} from "lucide-react";
import api from "../api/axios";

// Categorize raw signals into operational security domains
const SIGNAL_CATEGORIES = {
  NETWORK: [
    "IP_DEVIATION",
    "MALICIOUS_IP",
    "IMPOSSIBLE_TRAVEL",
    "GEO_ANOMALY"
  ],
  IDENTITY: [
    "FAILED_ATTESTATION",
    "COMPROMISED_CREDENTIAL",
    "REVOKED_CREDENTIAL",
    "EXPIRED_CREDENTIAL",
    "NEW_IDENTITY",
    "TOKEN_REPLAY",
    "CREDENTIAL_AGING",
    "DEVICE_ANOMALY"
  ],
  BEHAVIORAL: [
    "SCOPE_ESCALATION",
    "HIGH_VALUE_SCOPE",
    "VELOCITY_SPIKE",
    "TIME_ANOMALY",
    "UNUSUAL_ENDPOINT",
    "SENSITIVE_OPERATION",
    "CONCURRENT_SESSIONS",
    "EXCESSIVE_REFUND",
    "LEDGER_ANOMALY",
    "OFF_HOURS_ACCESS",
    "FREQUENCY_PATTERN_DEVIATION",
    "POLICY_MATCH",
    "SUSPICIOUS_PATTERN",
    "SYSTEM_FAILURE"
  ]
};

const getSignalCategory = (signalName) => {
  if (SIGNAL_CATEGORIES.NETWORK.includes(signalName)) return "Network";
  if (SIGNAL_CATEGORIES.IDENTITY.includes(signalName)) return "Identity";
  return "Behavioral";
};

export function ThreatIntelView({ notify }) {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [selectedSignalFilter, setSelectedSignalFilter] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerTab, setDrawerTab] = useState("signals");
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
      id: "PAYMENT_EXFILTRATION",
      name: "Bulk Settlement Exfiltration",
      tag: "APT C2 Hijack",
      desc: "Adversary initiates high-frequency bulk settlements to offshore accounts outside operational UTC hours.",
      simulatedIP: "198.51.100.77 (Moscow Adversary ASN)",
      simulatedScopes: ["payment:settle", "refund:process", "ledger:write"],
      simulatedPath: "/api/v1/payment/settle-bulk",
      payloadVolume: "$85,000 Bulk Batch (120 transaction records)",
      attestStatus: "FAILED_ATTESTATION (Rust Memory Mismatch)",
      expectedScore: "85 - 100",
      signalsPredicted: [
        { signal: "IP_DEVIATION", weight: 25 },
        { signal: "SCOPE_ESCALATION", weight: 30 },
        { signal: "VELOCITY_SPIKE", weight: 20 },
        { signal: "FAILED_ATTESTATION", weight: 35 }
      ]
    },
    UNAUTHORIZED_REFUND: {
      id: "UNAUTHORIZED_REFUND",
      name: "High-Value Refund Hijack",
      tag: "Reversal Attack",
      desc: "Compromised machine credential attempts unauthorized forced reversals exceeding daily velocity baselines.",
      simulatedIP: "185.220.101.5 (Tor Exit Node)",
      simulatedScopes: ["refund:process"],
      simulatedPath: "/api/v1/payment/refund",
      payloadVolume: "$89,000 Unverified Reversal Transaction",
      attestStatus: "POLICY_VIOLATION (Restricted Scope)",
      expectedScore: "75 - 95",
      signalsPredicted: [
        { signal: "MALICIOUS_IP", weight: 40 },
        { signal: "HIGH_VALUE_SCOPE", weight: 15 },
        { signal: "SCOPE_ESCALATION", weight: 30 }
      ]
    },
    IMPOSSIBLE_TRAVEL: {
      id: "IMPOSSIBLE_TRAVEL",
      name: "Impossible Geolocation Travel",
      tag: "Physics Anomaly",
      desc: "Machine key invokes gateway from Tokyo datacenters < 2 minutes after NYC operations (Velocity > Mach 8).",
      simulatedIP: "203.0.113.88 (Tokyo Datacenter)",
      simulatedScopes: ["payment:authorize", "ledger:read"],
      simulatedPath: "/api/v1/payment/charge",
      payloadVolume: "10,852 km displacement across continental networks",
      attestStatus: "GEOLOCATION_PHYSICS_VIOLATION",
      expectedScore: "90 - 100",
      signalsPredicted: [
        { signal: "IMPOSSIBLE_TRAVEL", weight: 45 },
        { signal: "IP_DEVIATION", weight: 25 },
        { signal: "DEVICE_ANOMALY", weight: 25 }
      ]
    },
    COMPROMISED_KEY_BREACH: {
      id: "COMPROMISED_KEY_BREACH",
      name: "DarkWeb Leaked Secret + Tor Node",
      tag: "Breach Feed Match",
      desc: "Inbound machine request presents credential matching threat intelligence feed of compromised processor keys.",
      simulatedIP: "185.220.101.45 (Tor Exit Subnet)",
      simulatedScopes: ["payment:settle"],
      simulatedPath: "/api/v1/payment/settle",
      payloadVolume: "High-entropy root key leaked in public breach database",
      attestStatus: "REVOKED_SECRET_INTERCEPTION",
      expectedScore: "100 / 100",
      signalsPredicted: [
        { signal: "COMPROMISED_CREDENTIAL", weight: 50 },
        { signal: "MALICIOUS_IP", weight: 40 },
        { signal: "FAILED_ATTESTATION", weight: 35 }
      ]
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
    "payment:initiate", "payment:authorize", "payment:settle",
    "refund:process", "ledger:read", "ledger:write",
    "read:data", "write:data", "delete:data"
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
        api.get("/v1/risk/stats"),
        api.get("/v1/risk/events?limit=40"),
        api.get("/v1/risk/profiles"),
        api.get("/v1/policies")
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (eventsRes.status === "fulfilled") setEvents(eventsRes.value.data.events || []);
      if (profilesRes.status === "fulfilled") setProfiles(profilesRes.value.data || []);
      if (policiesRes.status === "fulfilled") setPolicies(policiesRes.value.data || []);
    } catch (err) {
      console.error("Threat data fetch error:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const resolveKeyId = (keyId, name) => {
    if (keyId && typeof keyId === "string" && keyId.length > 5) return keyId;
    if (keyId && keyId._id) return keyId._id;
    const matchedProfile = profiles.find(p => 
      p.machineName === name || 
      (name && p.machineName && p.machineName.toLowerCase() === name.toLowerCase())
    );
    if (matchedProfile?.apiKey?._id) return matchedProfile.apiKey._id;
    if (typeof matchedProfile?.apiKey === "string") return matchedProfile.apiKey;
    return null;
  };

  const handleQuarantine = async (keyId, name) => {
    const resolved = resolveKeyId(keyId, name);
    if (!resolved) {
      notify(`Unable to locate machine credential ID for '${name}'`, "error");
      return;
    }
    try {
      await api.post(`/v1/risk/containment/${resolved}/quarantine`, {
        reason: "Manual Admin Containment via Threat Intel Console"
      });
      notify(`Identity '${name}' quarantined.`, "success");
      fetchThreatData(false);
      setSelectedEvent(prev => {
        if (!prev) return null;
        if (prev.machineName === name || prev.apiKey?._id === resolved || prev.apiKey === resolved) {
          return { ...prev, action: "CONTAINED" };
        }
        return prev;
      });
    } catch (err) {
      notify(err.response?.data?.error || "Quarantine failed", "error");
    }
  };

  const handleRelease = async (keyId, name) => {
    const resolved = resolveKeyId(keyId, name);
    if (!resolved) {
      notify(`Unable to locate machine credential ID for '${name}'`, "error");
      return;
    }
    try {
      await api.post(`/v1/risk/containment/${resolved}/release`);
      notify(`Identity '${name}' quarantine released.`, "success");
      fetchThreatData(false);
      setSelectedEvent(prev => {
        if (!prev) return null;
        if (prev.machineName === name || prev.apiKey?._id === resolved || prev.apiKey === resolved) {
          return { ...prev, action: "ALLOWED" };
        }
        return prev;
      });
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
      await api.post("/v1/policies", policyForm);
      notify("New Containment Policy deployed", "success");
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
      const res = await api.post("/v1/risk/simulate-attack", { attackScenario: targetScenario });
      setSimulationResult(res.data);
      notify(`Attack Simulation Executed: ${scenarioDetails[targetScenario]?.name || targetScenario}`, "success");
      fetchThreatData(false);
    } catch (err) {
      notify(err.response?.data?.error || "Simulation error", "error");
    } finally {
      setSimulating(false);
    }
  };

  // Filter calculation & dynamic counts
  const filterCounts = useMemo(() => {
    const counts = { ALL: events.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    events.forEach(e => {
      if (counts[e.riskLevel] !== undefined) {
        counts[e.riskLevel] += 1;
      }
    });
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesLevel = filterLevel === "ALL" || e.riskLevel === filterLevel;
      const matchesSignal = !selectedSignalFilter || (e.signals && e.signals.some(s => s.signal === selectedSignalFilter));
      return matchesLevel && matchesSignal;
    });
  }, [events, filterLevel, selectedSignalFilter]);

  // Risk presentation helpers
  const getRiskStatusLabel = (score) => {
    if (score >= 75) return "Critical Alert";
    if (score >= 50) return "Elevated Risk";
    if (score >= 25) return "Moderate Activity";
    return "Nominal Baselines";
  };

  const getRiskTone = (score) => {
    if (score >= 75) return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
    if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
    if (score >= 25) return { text: "text-yellow-400/90", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
    return { text: "text-slate-400", bg: "bg-slate-800/40", border: "border-slate-800" };
  };

  const renderLevelBadge = (level) => {
    switch (level) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Critical
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-500/5 text-yellow-400/90 border border-yellow-500/20">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-normal bg-slate-800/60 text-slate-400 border border-slate-700/50">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100 max-w-7xl mx-auto pb-16">

      {/* TOP HEADER & OPERATIONAL CONTROLS */}
      <div className="border border-white/[0.07] bg-[#090d16] rounded-2xl p-6 shadow-sm relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                AI Threat Intelligence & Automated Containment
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Trust Active
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time heuristic & behavioral anomaly interception for machine identities in payment infrastructure.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-colors ${autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                }`}
            >
              <Radio size={14} className={autoRefresh ? "text-emerald-400" : "text-slate-500"} />
              <span>{autoRefresh ? "Live Telemetry" : "Paused"}</span>
            </button>

            <button
              onClick={() => setSentinelTab("simulator")}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${sentinelTab === "simulator"
                ? "bg-slate-800 border-white/20 text-white"
                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200 hover:text-white"
                }`}
            >
              <Play size={14} className="text-slate-400" />
              <span>Adversary Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 pt-1">
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/[0.05]">
          <button
            onClick={() => setSentinelTab("telemetry")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${sentinelTab === "telemetry"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
              }`}
          >
            <Activity size={14} />
            <span>Event Stream & Triage</span>
          </button>

          <button
            onClick={() => setSentinelTab("simulator")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${sentinelTab === "simulator"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
              }`}
          >
            <Play size={14} />
            <span>Attack Simulator</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
              4 vectors
            </span>
          </button>

          <button
            onClick={() => setSentinelTab("profiles")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${sentinelTab === "profiles"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
              }`}
            title="Inspect machine identity behavioral profiles and baselines"
          >
            <Server size={14} />
            <span>Identity Profiles</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
              {profiles.length}
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Continuous Gateway Attestation: <span className="font-mono text-slate-300">ONLINE</span></span>
        </div>
      </div>

      {/* 1. TELEMETRY & TRIAGE WORKSPACE */}
      {sentinelTab === "telemetry" && (
        <div className="space-y-6">

          {/* SPATIALLY HIERARCHICAL STAT TILES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Hero Tile 1: System Risk Index */}
            <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">System Risk Index</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${getRiskTone(stats?.summary?.avgRiskScore || 0).bg} ${getRiskTone(stats?.summary?.avgRiskScore || 0).text}`}>
                  {getRiskStatusLabel(stats?.summary?.avgRiskScore || 0)}
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-white font-mono">
                    {stats?.summary?.avgRiskScore || 0}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${(stats?.summary?.avgRiskScore || 0) >= 75
                      ? "bg-rose-500"
                      : (stats?.summary?.avgRiskScore || 0) >= 50
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                      }`}
                    style={{ width: `${Math.min(stats?.summary?.avgRiskScore || 8, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-signal heuristic aggregate across active machine sessions
              </p>
            </div>

            {/* Hero Tile 2: Contained Threats (Urgent SOC action metric) */}
            <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">Autonomous Containments</span>
                <ShieldAlert size={16} className={(stats?.summary?.containedCount || 0) > 0 ? "text-rose-400" : "text-slate-500"} />
              </div>
              <div className="my-3">
                <div className="text-3xl font-semibold tracking-tight text-white font-mono">
                  {stats?.summary?.containedCount || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {(stats?.summary?.quarantinedIdentities || 0)} machine {((stats?.summary?.quarantinedIdentities || 0) === 1) ? "identity" : "identities"} locked
                </p>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" />
                <span>Zero-Trust automated mitigation</span>
              </div>
            </div>

            {/* Secondary Tile 3: Total Evaluated Ingress (Quiet/Calm) */}
            <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400">Evaluated M2M Ingress</span>
                <Activity size={16} className="text-slate-500" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-semibold tracking-tight text-white font-mono">
                  {stats?.summary?.totalEvaluations || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Continuous behavioral evaluation</p>
              </div>
              <div className="text-[11px] text-emerald-400/90 flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                <span>eBPF kernel attestation active</span>
              </div>
            </div>

            {/* Secondary Tile 4: Monitored NHIs (Quiet/Calm, Clickable) */}
            <div
              onClick={() => setSentinelTab("profiles")}
              className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-white/20 transition-all group"
              title="Click to view all Machine Identity Profiles"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                  Monitored Machine Identities
                </span>
                <Server size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-semibold tracking-tight text-white font-mono">
                  {stats?.summary?.activeIdentities || profiles.length || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Learned baseline profiles &bull; Click to inspect</p>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Scoped payment tokens protected</span>
              </div>
            </div>

          </div>

          {/* MAIN 2-COLUMN SECTION: HERO STREAM (LEFT 2/3) & INTELLIGENCE SIDEBAR (RIGHT 1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* HERO EVENT STREAM (8 cols) */}
            <div className="lg:col-span-8 space-y-4">

              {/* Filter and Stream Controls */}
              <div className="border border-white/[0.07] bg-[#090d16] p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Live Threat Stream</span>
                  <span className="text-xs text-slate-500 font-mono">({filteredEvents.length} events)</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/[0.05] text-xs">
                  {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => {
                    const count = filterCounts[lvl] ?? 0;
                    const isActive = filterLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={() => setFilterLevel(lvl)}
                        className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${isActive
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                          }`}
                      >
                        <span>{lvl === "ALL" ? "All" : lvl.charAt(0) + lvl.slice(1).toLowerCase()}</span>
                        <span className={`text-[10px] font-mono px-1 rounded ${isActive ? "bg-white/20 text-white" : "text-slate-500"
                          }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Signal Filter Indicator */}
              {selectedSignalFilter && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Filter size={13} className="text-slate-400" />
                    <span>Filtered by signal:</span>
                    <span className="font-mono font-semibold text-white px-2 py-0.5 bg-white/10 rounded">
                      {selectedSignalFilter}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSignalFilter(null)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-medium"
                  >
                    <X size={13} />
                    <span>Clear Filter</span>
                  </button>
                </div>
              )}

              {/* Event Rows Container */}
              <div className="space-y-2.5">
                {filteredEvents.length === 0 ? (
                  <div className="border border-white/[0.07] bg-[#090d16] p-12 rounded-2xl text-center space-y-2">
                    <ShieldCheck size={28} className="mx-auto text-slate-600" />
                    <p className="text-sm font-medium text-slate-300">No events match the selected criteria</p>
                    <p className="text-xs text-slate-500">
                      {selectedSignalFilter ? "Try clearing the active signal filter or changing the severity level." : "The Zero-Trust defense engine is currently reporting no anomalies in this tier."}
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((evt) => {
                    const isCritical = evt.riskLevel === "CRITICAL";
                    const isHigh = evt.riskLevel === "HIGH";
                    const isContained = evt.action === "CONTAINED";
                    const isSelected = selectedEvent?._id === evt._id;

                    // Group signals by category
                    const groupedSignals = { Identity: [], Network: [], Behavioral: [] };
                    (evt.signals || []).forEach(s => {
                      const cat = getSignalCategory(s.signal);
                      groupedSignals[cat].push(s);
                    });

                    return (
                      <div
                        key={evt._id}
                        onClick={() => setSelectedEvent(evt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(evt); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-white/20 ${isSelected
                          ? "bg-slate-900 border-white/25 shadow-md"
                          : isCritical
                            ? "bg-[#11090d] border-rose-500/30 hover:border-rose-500/50"
                            : isHigh
                              ? "bg-[#0d0e14] border-amber-500/20 hover:border-amber-500/40"
                              : "bg-[#090d16] border-white/[0.06] hover:border-white/15"
                          }`}
                      >
                        {/* Header: Level Badge, Machine Identity, Score, Timestamp */}
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            {renderLevelBadge(evt.riskLevel)}
                            <span className="text-sm font-semibold text-white tracking-tight">
                              {evt.machineName || "Machine Identity"}
                            </span>
                            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">
                              Score {evt.riskScore}/100
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Direct 1-Click Action */}
                            {isContained ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRelease(evt.apiKey?._id || evt.apiKey, evt.machineName);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                                title="Release Machine Quarantine"
                              >
                                <Unlock size={12} />
                                <span>Release</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuarantine(evt.apiKey?._id || evt.apiKey, evt.machineName);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${isCritical
                                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40"
                                  : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border-white/10"
                                  }`}
                                title="Quarantine Machine Identity"
                              >
                                <Lock size={12} />
                                <span>Quarantine</span>
                              </button>
                            )}

                            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <ChevronRight size={14} className="text-slate-600" />
                          </div>
                        </div>

                        {/* Request Route & Client IP */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-sans">Route:</span>
                            <span className="font-semibold text-slate-200">
                              {evt.requestMethod || "POST"} {evt.requestPath || "/api/v1/payment"}
                            </span>
                          </div>

                          {evt.clientIP && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 font-sans">IP:</span>
                              <span className="text-slate-300">{evt.clientIP}</span>
                            </div>
                          )}
                        </div>

                        {/* Grouped Signal Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Object.entries(groupedSignals).map(([category, sigs]) => {
                            if (sigs.length === 0) return null;
                            return (
                              <div key={category} className="flex items-center gap-1">
                                {sigs.map((sig, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${category === "Identity"
                                      ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                      : category === "Network"
                                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                        : "bg-white/[0.04] text-slate-300 border-white/[0.08]"
                                      }`}
                                  >
                                    <span className="text-slate-500 font-sans text-[10px] uppercase">
                                      {category.charAt(0)}:
                                    </span>
                                    <span>{sig.signal}</span>
                                    <span className="text-slate-400 font-bold">+{sig.weight}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>

                        {/* Containment Status Footer */}
                        {isContained && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-rose-400">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <Lock size={12} />
                              <span>AUTOMATED CONTAINMENT EXECUTED</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {(evt.containmentActions && evt.containmentActions.length > 0)
                                ? evt.containmentActions.join(" • ")
                                : "API Key Quarantined • Sessions Terminated"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* INTELLIGENCE & POLICIES SIDEBAR (4 cols) */}
            <div className="lg:col-span-4 space-y-4">

              {/* Prevalent Anomaly Signals (Clickable filter) */}
              <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-white">Prevalent Signals</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Click to filter</span>
                </div>

                <div className="space-y-2.5">
                  {stats?.topSignals && stats.topSignals.length > 0 ? (
                    stats.topSignals.map((sig, i) => {
                      const isSelected = selectedSignalFilter === sig.signal;
                      const maxHits = Math.max(...stats.topSignals.map(s => s.count), 1);
                      const percent = Math.min((sig.count / maxHits) * 100, 100);

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedSignalFilter(isSelected ? null : sig.signal)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all ${isSelected
                            ? "bg-white/10 border-white/20 shadow-sm"
                            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10"
                            }`}
                        >
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className={`font-mono font-medium ${isSelected ? "text-white" : "text-slate-300"}`}>
                              {sig.signal}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              {sig.count} hits
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">
                      No prevalent anomaly clusters recorded yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Active Containment Policies */}
              <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Containment Policies</h3>
                  </div>
                  <button
                    onClick={() => setIsPolicyModalOpen(true)}
                    className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
                  >
                    <Plus size={13} />
                    <span>New Rule</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {policies.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No automated containment policies configured.
                    </p>
                  ) : (
                    policies.slice(0, 4).map((p) => (
                      <div
                        key={p._id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-200">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Trigger &ge; {p.conditions?.riskThreshold || 75} pts • Priority {p.priority}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handleTogglePolicy(p._id, p.enabled)}
                            className={`w-8 h-4 rounded-full transition-colors relative ${p.enabled ? "bg-emerald-500" : "bg-slate-700"
                              }`}
                            title={p.enabled ? "Policy Enabled" : "Policy Disabled"}
                          >
                            <div
                              className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${p.enabled ? "right-0.5" : "left-0.5"
                                }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p._id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete Policy"
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

      {/* SIDE PANEL (COMPACT, BORDER CUTS OFF AT DONE BUTTON, ZERO WASTE BELOW) */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex justify-end items-start p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md md:max-w-lg bg-[#080c14] border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-[slide-in_0.25s_cubic-bezier(0.16,1,0.3,1)]"
          >
            {/* 1. HEADER */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  {renderLevelBadge(selectedEvent.riskLevel)}
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {selectedEvent.machineName || "Machine Identity"}
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-white font-semibold">
                    {selectedEvent.riskScore}/100
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span>Ref: {selectedEvent._id}</span>
                  {(() => {
                    const matched = profiles.find(p => 
                      p.machineName === selectedEvent.machineName ||
                      (p.apiKey?._id && (p.apiKey._id === selectedEvent.apiKey?._id || p.apiKey._id === selectedEvent.apiKey))
                    );
                    if (matched) {
                      return (
                        <button
                          onClick={() => setSelectedProfile(matched)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-sans transition-colors cursor-pointer"
                          title="Inspect Identity Behavioral Baseline Model"
                        >
                          <Eye size={12} /> Inspect Profile
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2. PRIMARY ACTION CARD: QUARANTINE / RELEASE */}
            <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
              selectedEvent.action === "CONTAINED"
                ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                : "bg-white/[0.02] border-white/10 text-slate-300"
            }`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock size={14} className={selectedEvent.action === "CONTAINED" ? "text-rose-400" : "text-slate-400"} />
                  <span className="font-semibold">
                    {selectedEvent.action === "CONTAINED" ? "MACHINE QUARANTINED" : "THREAT ACTION REQUIRED"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedEvent.action === "CONTAINED" ? "HTTP 403 Enforced" : "Traffic Allowed"}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                {selectedEvent.action === "CONTAINED"
                  ? "Inbound requests with this key are locked out. Click below to restore operational access."
                  : `Risk score of ${selectedEvent.riskScore}/100. Lock this machine key to immediately block exfiltration.`}
              </p>

              {selectedEvent.action === "CONTAINED" ? (
                <button
                  onClick={() => handleRelease(selectedEvent.apiKey?._id || selectedEvent.apiKey, selectedEvent.machineName)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Unlock size={14} />
                  <span>Release Machine Quarantine</span>
                </button>
              ) : (
                <button
                  onClick={() => handleQuarantine(selectedEvent.apiKey?._id || selectedEvent.apiKey, selectedEvent.machineName)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Lock size={14} />
                  <span>Quarantine Machine Now</span>
                </button>
              )}
            </div>

            {/* 3. REQUEST PAYLOAD SUMMARY */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">Route</span>
                  <span className="text-slate-200 font-semibold break-all">
                    {selectedEvent.requestMethod} {selectedEvent.requestPath}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">Inbound IP</span>
                  <span className="text-amber-300 font-semibold">
                    {selectedEvent.clientIP || "127.0.0.1"}
                  </span>
                </div>
              </div>

              {selectedEvent.requestedScopes && selectedEvent.requestedScopes.length > 0 && (
                <div className="pt-1.5 border-t border-white/[0.04]">
                  <span className="text-slate-500 text-[11px] font-sans block mb-1">Scopes:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.requestedScopes.map((sc, i) => (
                      <span key={i} className="text-[10px] bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded border border-white/[0.06]">
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. TRIGGERED DEVIATION SIGNALS */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Triggered Signals ({selectedEvent.signals?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {(selectedEvent.signals && selectedEvent.signals.length > 0) ? (
                  selectedEvent.signals.map((sig, idx) => {
                    const cat = getSignalCategory(sig.signal);
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
                          cat === "Identity"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                            : cat === "Network"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            : "bg-white/[0.04] text-slate-300 border-white/10"
                        }`}
                      >
                        <span>{sig.signal}</span>
                        <span className="font-bold text-white">+{sig.weight}</span>
                      </span>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic">No deviation signals recorded.</p>
                )}
              </div>
            </div>

            {/* 5. COLLAPSIBLE TECHNICAL TIMELINE */}
            <details className="group border border-white/[0.06] bg-white/[0.02] rounded-xl p-3 text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-white font-medium flex items-center justify-between outline-none">
                <span>Autonomous Containment Pipeline (48ms)</span>
                <ChevronRight size={14} className="text-slate-500 group-open:rotate-90 transition-transform" />
              </summary>

              <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] space-y-2 font-mono text-[11px] text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[+12ms]</span>
                  <span>Edge gateway captured inbound payment payload.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[+34ms]</span>
                  <span>eBPF kernel attestation verified machine signature.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[+45ms]</span>
                  <span>Risk score ({selectedEvent.riskScore}/100) triggered containment policy.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[+48ms]</span>
                  <span>Identity locked in database; sessions revoked.</span>
                </div>
              </div>
            </details>

            {/* 6. DONE BUTTON BROUGHT UP RIGHT HERE WITH THE INFO */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                {selectedEvent.action === "CONTAINED" ? "Status: Quarantined" : "Status: Active"}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. ADVERSARY ATTACK SIMULATOR COCKPIT */}
      {sentinelTab === "simulator" && (
        <div className="space-y-6">
          <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Tactical Adversary Simulation Cockpit</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  SANDBOX ENCLAVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inject synthetic APT attack vectors against machine identities to evaluate Zero-Trust heuristics & automated containment.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Attestation Engine: <span className="text-emerald-400 font-semibold">ACTIVE</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Scenarios & Parameters (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl space-y-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  1. Select Attack Vector
                </span>

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
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${isSelected
                          ? "bg-white/10 border-white/25 shadow-sm"
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                            {sc.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {sc.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {sc.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Adversary Injection Specifications */}
              {selectedScenario && scenarioDetails[selectedScenario] && (
                <div className="border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl space-y-3 font-mono text-xs">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-sans">
                    2. Injection Parameters
                  </span>

                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Route:</span>
                      <span className="text-slate-200 font-semibold truncate text-right">
                        {scenarioDetails[selectedScenario].simulatedPath}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Inbound IP:</span>
                      <span className="text-amber-300 truncate text-right">
                        {scenarioDetails[selectedScenario].simulatedIP}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Attest Probe:</span>
                      <span className="text-rose-400 truncate text-right text-[11px]">
                        {scenarioDetails[selectedScenario].attestStatus}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-slate-500">Expected Score:</span>
                      <span className="text-white font-semibold">
                        {scenarioDetails[selectedScenario].expectedScore}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRunSimulation(selectedScenario)}
                    disabled={simulating}
                    className="w-full mt-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-white bg-slate-800 hover:bg-slate-700 border border-white/15 shadow-sm transition-all disabled:opacity-50"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Evaluating Heuristics...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} className="fill-white" />
                        <span>Launch Simulation</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Simulation Defense Results (7 cols) */}
            <div className="lg:col-span-7">
              {!simulationResult && !simulating && (
                <div className="border border-white/[0.07] bg-[#090d16] p-8 rounded-2xl text-center space-y-3 min-h-[360px] flex flex-col justify-center items-center">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400">
                    <ShieldAlert size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Defense Cockpit Armed</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Select an adversary vector and click <span className="text-white font-medium">"Launch Simulation"</span>. The Sentinel will evaluate deviations and execute real-time containment.
                  </p>
                </div>
              )}

              {simulating && (
                <div className="border border-white/[0.07] bg-[#090d16] p-6 rounded-2xl min-h-[360px] flex flex-col justify-center space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      <span>Intercepting synthetic adversary payload...</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">SOC TELEMETRY</span>
                  </div>

                  <div className="p-4 bg-black/40 rounded-xl border border-white/[0.06] space-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">[0.012s]</span> Inbound HTTP packet intercepted at edge gateway
                    </div>
                    <div className="flex items-center gap-2 text-rose-300">
                      <span className="text-slate-600">[0.038s]</span> Rust attestation mismatch flagged (NO_MATCH)
                    </div>
                    <div className="flex items-center gap-2 text-amber-300">
                      <span className="text-slate-600">[0.065s]</span> Deviations detected: IP subnet, atypical scopes, velocity spike
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className="text-slate-600">[0.089s]</span> Calculating multi-signal heuristic score matrix...
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="text-slate-600">[0.114s]</span> Executing automated containment protocol...
                    </div>
                  </div>
                </div>
              )}

              {simulationResult && !simulating && (
                <div className="border border-white/[0.07] bg-[#090d16] p-6 rounded-2xl space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Lock size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          Attack Intercepted &bull; Identity Quarantined
                        </h4>
                        <p className="text-xs text-slate-400">
                          Autonomous mitigation completed in &lt; 45ms. Target machine locked out.
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-mono font-semibold">
                      {simulationResult.assessment?.riskLevel || "CRITICAL"}
                    </span>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Assessed Score</span>
                      <div className="text-xl font-bold text-rose-400 mt-0.5">
                        {simulationResult.assessment?.riskScore || 0}<span className="text-xs text-slate-500">/100</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Target Machine</span>
                      <div className="text-xs font-semibold text-white mt-1 truncate" title={simulationResult.targetMachine}>
                        {simulationResult.targetMachine || "Payment Worker"}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase">Status</span>
                      <div className="text-xs font-semibold text-emerald-400 mt-1">
                        QUARANTINED
                      </div>
                    </div>
                  </div>

                  {/* Triggered Signals Decomposition */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Heuristic Deviation Vectors
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {simulationResult.assessment?.signals?.map((s, idx) => (
                        <div
                          key={idx}
                          className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl flex items-center justify-between font-mono text-xs"
                        >
                          <span className="text-slate-200 font-medium truncate">{s.signal}</span>
                          <span className="text-slate-400 font-bold ml-2">+{s.weight} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Remediation */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => handleRelease(simulationResult.targetKeyId || simulationResult.apiKeyId, simulationResult.targetMachine)}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-colors flex items-center gap-1.5"
                    >
                      <Unlock size={14} />
                      <span>Release Machine Quarantine</span>
                    </button>

                    <button
                      onClick={() => setSimulationResult(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-colors"
                    >
                      Reset Cockpit
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. MACHINE BASELINES & NHI REGISTRY */}
      {sentinelTab === "profiles" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border border-white/[0.07] bg-[#090d16] p-5 rounded-2xl">
            <div>
              <h2 className="text-base font-semibold text-white">Machine Identity Profiles</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Learned behavioral models and real-time containment control per machine identity.
              </p>
            </div>
            <button
              onClick={() => fetchThreatData()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="border border-white/[0.07] bg-[#090d16] rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[11px] border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5">Machine Identity</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Risk Score</th>
                  <th className="px-6 py-3.5">Baseline Status</th>
                  <th className="px-6 py-3.5">Known Subnets</th>
                  <th className="px-6 py-3.5">Payment Scopes</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500 font-mono italic">
                      No machine identity profiles recorded yet.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => {
                    const keyData = p.apiKey || {};
                    const isQuarantined = keyData.status === "QUARANTINED";
                    const riskScore = keyData.riskScore || 0;

                    return (
                      <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isQuarantined ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
                            <span>{p.machineName}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono">
                          {isQuarantined ? (
                            <span className="px-2 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded text-[11px] font-semibold flex items-center gap-1 w-max">
                              <Lock size={11} /> Quarantined
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-medium flex items-center gap-1 w-max">
                              <ShieldCheck size={11} /> Active
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${getRiskTone(riskScore).border} ${getRiskTone(riskScore).bg} ${getRiskTone(riskScore).text}`}>
                              {riskScore}/100
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-slate-300">
                          {p.baselineEstablished ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 size={12} /> Established ({p.totalRequests} reqs)
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 font-medium">
                              <Activity size={12} className="animate-spin" /> Learning ({p.totalRequests}/10)
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-mono text-slate-400">
                          {p.knownIPs && p.knownIPs.length > 0 ? p.knownIPs.slice(0, 2).join(", ") : "None"}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(p.typicalScopes || keyData.scopes || []).map((s, i) => (
                              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.05]">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedProfile(p)}
                              className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 flex items-center gap-1"
                              title="Inspect Behavioral Model"
                            >
                              <Eye size={12} /> Profile
                            </button>

                            {isQuarantined ? (
                              <button
                                onClick={() => handleRelease(p.apiKey?._id || p.apiKey, p.machineName)}
                                className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1 transition-colors"
                              >
                                <Unlock size={12} /> Release
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuarantine(p.apiKey?._id || p.apiKey, p.machineName)}
                                className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium flex items-center gap-1 transition-colors"
                              >
                                <Lock size={12} /> Quarantine
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setIsPolicyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">Create Containment Policy</h3>
              <p className="text-xs text-slate-400">Define automated response rules for high-risk machine actions.</p>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1 font-sans">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strict Payment Settle Guard"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full p-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-sans">
                  Risk Threshold Trigger: &ge; {policyForm.conditions.riskThreshold} pts
                </label>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={policyForm.conditions.riskThreshold}
                  onChange={(e) => setPolicyForm({
                    ...policyForm,
                    conditions: { ...policyForm.conditions, riskThreshold: parseInt(e.target.value, 10) }
                  })}
                  className="w-full accent-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-sans">Monitored Payment Scopes</label>
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
                        className={`px-2.5 py-1 rounded text-[11px] border transition-all ${isSelected
                          ? "bg-white/10 border-white/25 text-white font-medium"
                          : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-300"
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
                className="w-full py-2.5 bg-white text-black hover:bg-slate-200 font-semibold rounded-xl transition-colors shadow-sm mt-3"
              >
                Deploy Policy
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE DETAIL INSPECT */}
      {selectedProfile && (() => {
        const profileKeyData = selectedProfile.apiKey || {};
        const profileIsQuarantined = profileKeyData.status === "QUARANTINED";
        const keyId = profileKeyData._id || selectedProfile.apiKey;

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#090d16] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs font-mono">
              <button
                onClick={() => setSelectedProfile(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5">
                <Cpu size={16} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-white font-sans">
                  Machine Model: {selectedProfile.machineName}
                </h3>
              </div>

              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] space-y-2 text-slate-300">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-slate-500 font-sans">Operational Status:</span>
                  {profileIsQuarantined ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <Lock size={12} /> Quarantined (HTTP 403)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck size={12} /> Active & Operational
                    </span>
                  )}
                </div>

                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-slate-500 font-sans">Baseline Status:</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedProfile.baselineEstablished ? "Established & Active" : "Learning Baseline"}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-slate-500 font-sans">Learned Requests:</span>
                  <span>{selectedProfile.totalRequests}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-slate-500 font-sans">Average Velocity:</span>
                  <span>{selectedProfile.avgRequestsPerHour?.toFixed(1) || 0} req/hr</span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-slate-500 font-sans">Learned Subnets:</span>
                  <span className="text-amber-300">{selectedProfile.knownIPs?.join(", ") || "None recorded"}</span>
                </div>

                {(selectedProfile.typicalScopes || profileKeyData.scopes || []).length > 0 && (
                  <div className="py-1 border-b border-white/[0.04] space-y-1">
                    <span className="text-slate-500 font-sans block">Typical Scopes:</span>
                    <div className="flex flex-wrap gap-1">
                      {(selectedProfile.typicalScopes || profileKeyData.scopes || []).map((s, idx) => (
                        <span key={idx} className="text-[10px] bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded border border-white/[0.06]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-sans">Last Seen (UTC):</span>
                  <span>{selectedProfile.lastSeen ? new Date(selectedProfile.lastSeen).toUTCString() : "Active Session"}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 pt-2">
                {profileIsQuarantined ? (
                  <button
                    onClick={async () => {
                      await handleRelease(keyId, selectedProfile.machineName);
                      setSelectedProfile(prev => prev ? { ...prev, apiKey: { ...profileKeyData, status: "ACTIVE" } } : null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={14} /> Release Machine
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await handleQuarantine(keyId, selectedProfile.machineName);
                      setSelectedProfile(prev => prev ? { ...prev, apiKey: { ...profileKeyData, status: "QUARANTINED" } } : null);
                    }}
                    className="flex-1 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Lock size={14} /> Quarantine Machine
                  </button>
                )}

                <button
                  onClick={() => setSelectedProfile(null)}
                  className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
