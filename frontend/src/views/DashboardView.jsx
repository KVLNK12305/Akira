import { useState, useEffect, useRef } from "react";
import {
  Shield, Key, FileText, Lock, Users, Activity,
  CheckCircle, XCircle, LogOut, Fingerprint, AlertTriangle,
  Cpu, Thermometer, ChevronDown, Save, Bell, Trash2, Book,
  RefreshCw, Eye, Terminal, ArrowRight, Menu, X
} from "lucide-react";
import api, { API_URL } from "../api/axios";
import { DocumentationView } from "./DocumentationView";

// --- HELPER FUNCTIONS ---

// Format Timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return "Just now";
  return new Date(dateStr).toLocaleTimeString();
};

// --- MAIN COMPONENT ---
export function DashboardView({ user, keys, logs, onGenerateKey, onLogout, onDeleteKey, onRefreshKeys, onProfile }) {
  // 🟢 onRefreshKeys prop allows us to refresh the list after rotation

  // 1. STATE MANAGEMENT
  // ----------------------------------------
  const [activeTab, setActiveTab] = useState("matrix"); // Default to User Management
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // 🦀 RUST FEATURE: State for the new key (Only shown once)
  const [newRotatedKey, setNewRotatedKey] = useState(null);

  // 🖥️ Rust Core Simulation State (The "Alive" Widget)
  const [systemStats, setSystemStats] = useState({
    integrity: "SECURE",
    activeNodes: 3,
    cpu: 12,
    temp: 45
  });

  // 👁️ NHI LAB STATE
  const [nhiInput, setNhiInput] = useState("");
  const [nhiIsBase64, setNhiIsBase64] = useState(false);
  const [nhiSteps, setNhiSteps] = useState([]);
  const [nhiStatus, setNhiStatus] = useState("idle"); // idle, validating, success, error
  const [nhiResult, setNhiResult] = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  // ----------------------------------------
  // 2. SECURITY & RBAC LOGIC
  // ----------------------------------------
  const currentRole = user?.role?.toLowerCase() || "newbie";

  // "High Privilege" = Can see Keys (Devs, Admins)
  const isHighPrivilege = ['admin', 'superadmin', 'developer'].includes(currentRole);

  // "Strict Admin" = Can manage Users (Admins only)
  const isStrictAdmin = ['admin', 'superadmin'].includes(currentRole);

  // ----------------------------------------
  // 3. EFFECTS (Live Updates)
  // ----------------------------------------

  // 💓 Heartbeat Effect (Simulates Rust Microservice)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats(prev => {
        // Randomize stats to look "alive"
        const newCpu = Math.floor(Math.random() * (45 - 10 + 1) + 10);
        const newTemp = Math.floor(Math.random() * (60 - 40 + 1) + 40);
        const newNodes = Math.random() > 0.8 ? (prev.activeNodes === 3 ? 4 : 3) : prev.activeNodes;

        return {
          integrity: "SECURE",
          activeNodes: newNodes,
          cpu: newCpu,
          temp: newTemp
        };
      });
    }, 2500); // Update every 2.5s

    return () => clearInterval(interval);
  }, []);

  // 👥 Fetch Users Effect (Only if Admin & on Matrix Tab)
  useEffect(() => {
    if (activeTab === 'matrix' && isStrictAdmin) {
      fetchUsers();
    }
  }, [activeTab, isStrictAdmin]);

  // ----------------------------------------
  // 4. API HANDLERS
  // ----------------------------------------

  // 🦀 RUST FEATURE: ROTATION HANDLER
  const handleRotate = async (keyId) => {
    // 1. Safety Check (Viva Requirement)
    if (!window.confirm("⚠️ ROTATE KEY?\nThis will INVALIDATE the old key immediately.\nThe new key will be generated using the RUST Chaos Engine.")) {
      return;
    }

    try {
      // 2. Call the Rust Endpoint
      const res = await api.post(`/keys/${keyId}/rotate`);

      if (res.data.success) {
        // 3. Show the Green Box with the new key
        setNewRotatedKey(res.data.newApiKey);

        // 4. Refresh the list to show new metadata (like Expiry/Fingerprint updates)
        if (onRefreshKeys) onRefreshKeys();

        alert("✅ Key Rotated via Rust Engine!");
      }
    } catch (err) {
      console.error("Rotation failed:", err);
      alert("❌ Rotation Failed: " + (err.response?.data?.error || err.message));
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setUserList(res.data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      // 1. Optimistic Update (Update UI instantly)
      setUserList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));

      // 2. API Call (This triggers the backend email)
      const res = await api.put(`/users/${userId}/role`, { role: newRole });

      if (res.data.success) {
        // Optional: Show a toast notification here
        console.log(`Role updated to ${newRole} for ${userId}`);
      }
    } catch (err) {
      alert("Failed to update role: " + (err.response?.data?.error || "Server Error"));
      fetchUsers(); // Revert UI if failed
    }
  };

  const handleDeleteKey = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to delete the key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/keys/${keyId}`);
      // Remove from UI
      onDeleteKey?.(keyId);
      alert("Key deleted successfully");
    } catch (err) {
      console.error("Failed to delete key:", err);
      alert("Failed to delete key: " + (err.response?.data?.error || "Server Error"));
    }
  };

  const handleNhiValidate = async () => {
    if (!nhiInput) return;
    setNhiStatus("validating");
    setNhiSteps([]);
    setNhiResult(null);

    try {
      // Simulation: Encode if requested before sending
      let payload = nhiInput;
      if (nhiIsBase64) {
        // Simple btoa for simulation (only works for ASCII, perfect for keys)
        try {
          payload = btoa(nhiInput);
        } catch (e) {
          console.error("Base64 Encoding Error", e);
        }
      }

      const res = await api.post('/v1/nhi-validate', { key: payload, isBase64: nhiIsBase64 });

      // Animate steps for "Live" feel
      for (const step of res.data.steps) {
        setNhiSteps(prev => [...prev, step]);
        await new Promise(r => setTimeout(r, 600));
      }

      if (res.data.success) {
        setNhiStatus("success");
        setNhiResult(res.data.identity);
      }
    } catch (err) {
      console.error("NHI Validation Failed:", err);
      // Even in error, show the steps returned (if any)
      if (err.response?.data?.steps) {
        for (const step of err.response.data.steps) {
          if (nhiSteps.some(s => s.msg === step.msg)) continue; // Avoid dupes if already added
          setNhiSteps(prev => [...prev, step].filter((v, i, a) => a.findIndex(t => (t.msg === v.msg)) === i));
          await new Promise(r => setTimeout(r, 600));
        }
      }
      setNhiStatus("error");
      setNhiResult({ error: err.response?.data?.error || "Connection Error" });
    }
  };


  // ----------------------------------------
  // 5. RENDER
  // ----------------------------------------
  return (
    <div className="h-screen bg-slate-950 flex text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden">

      {/* 📱 MOBILE HEADER */}
      <div className="md:hidden fixed top-0 w-full z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" />
          <h1 className="font-bold text-slate-100 tracking-tight">AKIRA</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* =======================
          🟢 LEFT SIDEBAR
      ======================== */}
      <aside className={`w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-xl fixed h-full z-50 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight">AKIRA<span className="text-emerald-400">Gate</span></h1>
            <p className="text-[10px] text-slate-500 font-mono">v2.0 • PRO</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton
            icon={Key}
            label="API Credentials"
            active={activeTab === 'keys'}
            onClick={() => { setActiveTab('keys'); setIsMobileMenuOpen(false); }}
          />
          <NavButton
            icon={FileText}
            label="Audit Logs"
            active={activeTab === 'logs'}
            onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }}
          />
          <NavButton
            icon={Users}
            label="User Management"
            active={activeTab === 'matrix'}
            onClick={() => { setActiveTab('matrix'); setIsMobileMenuOpen(false); }}
          />
          <NavButton
            icon={Book}
            label={`Documentation (${currentRole})`}
            active={activeTab === 'docs'}
            onClick={() => { setActiveTab('docs'); setIsMobileMenuOpen(false); }}
          />
          <NavButton
            icon={Eye}
            label="Guardian Eye (NHI Lab)"
            active={activeTab === 'nhi'}
            onClick={() => { setActiveTab('nhi'); setIsMobileMenuOpen(false); }}
          />
        </nav>
        {/* User Profile Footer (Clickable) */}
        <div
          onClick={onProfile}
          className="p-4 bg-slate-900/80 border-t border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs group-hover:border-emerald-500/50 transition-colors shadow-lg">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture.startsWith('http') ? user.profilePicture : `${API_URL}${user.profilePicture}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.username?.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate w-32">{user?.username}</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isStrictAdmin ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{user?.role}</p>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between items-center mt-2 group-hover:text-slate-500">
            <span>Click to view profile</span>
            <ChevronDown size={10} />
          </div>
        </div>
      </aside>

      {/* =======================
          🔵 MAIN CONTENT AREA
      ======================== */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 relative overflow-y-auto h-full pt-20 md:pt-8 custom-scrollbar">

        {/* HEADER & WIDGETS */}
        <header className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'keys' && "Key Vault"}
              {activeTab === 'logs' && "Security Events"}
              {activeTab === 'matrix' && "Identity & Access Control"}
              {activeTab === 'docs' && "Documentation"}
              {activeTab === 'nhi' && "Guardian Eye: Machine Auth"}
            </h2>
            <p className="text-slate-400 text-sm">
              Session ID: <span className="font-mono text-emerald-400">{user?._id?.substring(0, 8) || user?.id?.substring(0, 8) || "SESSION-ACTIVE"}</span>
            </p>
          </div>

          {/* 🖥️ RUST IRON CORE WIDGET (LIVE) */}
          <div className="flex gap-3">
            {/* Widget 1: Integrity */}
            <div className="bg-black/40 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3 backdrop-blur-sm transition-all hover:border-emerald-500/30 group">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Iron Core</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-emerald-400 font-mono text-xs font-bold">{systemStats.integrity}</p>
                </div>
              </div>
              <Activity size={18} className="text-emerald-500" />
            </div>

            {/* Widget 2: Load Stats */}
            <div className="bg-black/40 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3 backdrop-blur-sm">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nodes / Load</p>
                <p className="text-blue-400 font-mono text-xs font-bold transition-all duration-500">
                  {systemStats.activeNodes} ACT / {systemStats.cpu}%
                </p>
              </div>
              <Cpu size={18} className="text-blue-500" />
            </div>
          </div>
        </header>

        {/* =======================
            🚀 TABS CONTENT
        ======================== */}
        <div className="relative z-10">

          {/* --- TAB 1: API KEYS --- */}
          {activeTab === 'keys' && (
            <div className="space-y-6 animate-[fade-in_0.3s]">

              {/* 🦀 RUST FEATURE: NEW KEY DISPLAY (Only shows after rotation) */}
              {newRotatedKey && (
                <div className="mb-6 p-4 border-l-4 border-green-500 bg-green-900/20 rounded-r-lg backdrop-blur-md animate-pulse">
                  <h3 className="text-green-400 font-bold mb-2 flex items-center">
                    <span className="text-xl mr-2">🦀</span> New Key Generated (Rust Entropy)
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">
                    Please copy this key now. It will not be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="block w-full p-3 bg-black/50 rounded border border-green-500/30 text-green-300 font-mono text-lg break-all">
                      {newRotatedKey}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newRotatedKey); alert("Copied!"); }}
                      className="p-3 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition-all"
                    >
                      COPY
                    </button>
                  </div>
                  <button
                    onClick={() => setNewRotatedKey(null)}
                    className="mt-4 text-xs text-gray-400 hover:text-white underline"
                  >
                    Close this notification
                  </button>
                </div>
              )}

              {/* Generator Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-slate-900 border border-emerald-500/20 flex justify-between items-center shadow-lg">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Key size={20} className="text-emerald-400" /> Issue Credentials
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Generate high-entropy keys for your microservices.
                  </p>
                </div>
                <button onClick={() => onGenerateKey("Service Key", ["read:data"])} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]">
                  Generate Key
                </button>
              </div>

              {/* Keys Table */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-500 uppercase font-mono text-xs">
                    <tr>
                      <th className="px-6 py-4">Key Fingerprint</th>
                      <th className="px-6 py-4">Encryption</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {keys && keys.map((k) => (
                      <tr key={k.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {k?.prefix && <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-xs font-bold mr-2">NEW</span>}
                          {k?.fingerprint || "****"}
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-mono text-xs">
                          <span className="flex items-center gap-2"><Lock size={12} /> AES-256-GCM</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Active</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">{formatDate(k?.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* 🦀 RUST FEATURE: ROTATE BUTTON */}
                            <button
                              onClick={() => handleRotate(k.id)}
                              className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 p-2 rounded transition-colors flex items-center gap-1 text-xs border border-yellow-500/20"
                              title="Rotate using Rust Engine"
                            >
                              <RefreshCw size={14} /> Rotate
                            </button>

                            {/* Delete Button (Existing) */}
                            <button
                              onClick={() => handleDeleteKey(k.id, k.name)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 p-2 rounded transition-colors flex items-center gap-1 text-xs"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!keys || keys.length === 0 && (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-600 italic">No active keys found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- TAB 2: AUDIT LOGS --- */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-[fade-in_0.3s]">
              <div className="flex gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Log Integrity</p>
                  <p className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2 mt-1">
                    <CheckCircle size={14} /> Verified (SHA-256)
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex-1">
                  <p className="text-xs text-slate-500 uppercase font-bold">Retention Policy</p>
                  <p className="text-blue-400 font-mono text-sm font-bold mt-1">90 Days / Immutable</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Filter by action or description..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {logSearch && (
                    <button
                      onClick={() => setLogSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono uppercase">
                  MATCHES: {logs.filter(l => (l.action + l.desc).toLowerCase().includes(logSearch.toLowerCase())).length}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-xl overflow-x-auto">
                <div className="min-w-[600px]">
                  {logs.filter(l => (l.action + l.desc).toLowerCase().includes(logSearch.toLowerCase())).map((log) => (
                    <div key={log._id || log.id} className="p-4 border-b border-slate-900 flex items-center gap-4 hover:bg-slate-900/30 transition-colors">
                      <span className="text-slate-500 min-w-[80px]">{formatDate(log.time || log.timestamp)}</span>
                      <span className={`w-32 font-bold ${log.action?.includes('DENIED') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.action}
                      </span>
                      <span className="flex-1 text-slate-300">{log.desc || "System Event"}</span>
                      <Shield size={10} className="text-slate-600" />
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="p-8 text-center text-slate-600 italic">No logs generated yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: DOCUMENTATION --- */}
          {activeTab === 'docs' && (
            <div className="animate-[fade-in_0.3s]">
              <DocumentationView
                onBack={() => setActiveTab(isHighPrivilege ? 'keys' : 'logs')}
                roleLabel={currentRole}
              />
            </div>
          )}

          {/* --- TAB 3: USER MANAGEMENT (With FIXED UserRow) --- */}
          {activeTab === 'matrix' && (
            <div className="animate-[fade-in_0.3s]">

              {!isStrictAdmin ? (
                // 🛑 ACCESS DENIED VIEW
                <div className="p-12 border border-red-500/20 bg-red-900/10 rounded-2xl text-center">
                  <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <Lock className="text-red-400 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Restricted Access</h3>
                  <p className="text-slate-400 mt-2 max-w-md mx-auto">
                    Only Administrators can modify User Roles. Contact your System Admin to upgrade your privileges from <span className="text-white font-bold uppercase">{currentRole}</span>.
                  </p>
                </div>
              ) : (
                // ✅ ADMIN VIEW
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-purple-400" />
                        User Role Management
                      </h3>
                      <p className="text-slate-400 text-sm">Assign privileges to registered identities.</p>
                    </div>
                    <div className="text-xs font-mono text-slate-500 bg-black/40 px-3 py-1 rounded border border-slate-700">
                      TOTAL USERS: {userList.length}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead className="bg-slate-800/80 backdrop-blur-md text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4 text-left font-bold border-b border-white/5">User Identity</th>
                          <th className="px-6 py-4 text-left font-bold border-b border-white/5">Secure Email</th>
                          <th className="px-6 py-4 text-left font-bold border-b border-white/5">Access Tier</th>
                          <th className="px-6 py-4 text-right font-bold border-b border-white/5">Governance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-slate-900/40">
                        {loadingUsers ? (
                          <tr><td colSpan="4" className="p-8 text-center text-slate-500"><Activity className="animate-spin inline mr-2" /> Loading Users...</td></tr>
                        ) : userList.map((u) => (
                          // 🚀 USING USER ROW COMPONENT (Fixes Dropdown Issues)
                          <UserRow
                            key={u._id}
                            userRow={u}
                            currentUser={user}
                            onRoleChange={handleRoleChange}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB 4: GUARDIAN EYE (NHI LAB) --- */}
          {activeTab === 'nhi' && (
            <div className="space-y-6 animate-[fade-in_0.3s]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Protocol Simulation Controls */}
                <div className="space-y-4">
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Terminal size={18} className="text-emerald-400" /> Key Transmission
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Input generated key (akira_...)</label>
                        <input
                          type="text"
                          value={nhiInput}
                          onChange={(e) => setNhiInput(e.target.value)}
                          placeholder="Paste a key from the vault..."
                          className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-black/30 border border-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${nhiIsBase64 ? 'bg-emerald-500' : 'bg-slate-700'}`} onClick={() => setNhiIsBase64(!nhiIsBase64)}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${nhiIsBase64 ? 'translate-x-4' : ''}`}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-300">Simulate Base64 Encoding</span>
                        </div>
                        <span className="text-[10px] text-slate-500 italic">Pre-transmission layer</span>
                      </div>

                      <button
                        onClick={handleNhiValidate}
                        disabled={!nhiInput || nhiStatus === 'validating'}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {nhiStatus === 'validating' ? <Activity className="animate-spin" size={18} /> : <Eye size={18} />}
                        INITIATE HANDSHAKE
                      </button>
                    </div>
                  </div>

                  {/* Identity Breakdown Card (Hidden until Success) */}
                  {nhiStatus === 'success' && nhiResult && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl animate-[slide-up_0.3s]">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-emerald-400 font-bold text-sm">Identity Resolved</h4>
                          <p className="text-2xl font-black text-white">{nhiResult.name}</p>
                        </div>
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <Shield size={24} className="text-emerald-400" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">ID:</span>
                          <span className="font-mono text-slate-300">{nhiResult.id}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Scopes:</span>
                          <div className="flex gap-1">
                            {nhiResult.scopes.map(s => <span key={s} className="bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px] uppercase font-bold text-emerald-300">{s}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Card */}
                  {nhiStatus === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl animate-[shake_0.4s]">
                      <h4 className="text-red-400 font-bold text-sm flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} /> Handshake Failed
                      </h4>
                      <p className="text-sm text-slate-300 font-mono italic">
                        {nhiResult?.error}
                      </p>
                    </div>
                  )}
                </div>

                {/* Validation Console (Terminal Output) */}
                <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[400px]">
                  <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 ml-2">AKIRA GATE v2.0 - MACHINE AUTH LOGS</span>
                    <button
                      onClick={() => { setNhiSteps([]); setNhiStatus("idle"); setNhiResult(null); }}
                      className="ml-auto text-[10px] text-slate-500 hover:text-white underline"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="flex-1 p-6 font-mono text-xs overflow-y-auto space-y-3 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.05),_transparent)]">
                    {nhiSteps.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-20 group">
                        <Eye size={48} className="mb-4 group-hover:scale-110 transition-transform" />
                        <p>Awaiting Machine ID Broadcast...</p>
                      </div>
                    )}

                    {nhiSteps.map((step, idx) => (
                      <div key={idx} className={`animate-[fade-in_0.3s] flex gap-4 ${step.stage === 'DENIED' ? 'text-red-400' : 'text-slate-400'}`}>
                        <span className={`w-20 font-bold ${step.stage === 'SUCCESS' ? 'text-emerald-400' :
                          step.stage === 'DENIED' ? 'text-red-400' :
                            'text-slate-500'
                          }`}>[{step.stage}]</span>
                        <span className="flex-1">{step.msg}</span>
                        {idx === nhiSteps.length - 1 && nhiStatus === 'validating' && <Activity size={12} className="animate-spin text-emerald-500" />}
                      </div>
                    ))}

                    {nhiStatus === 'success' && (
                      <div className="mt-6 pt-4 border-t border-emerald-500/20 text-emerald-400 animate-pulse">
                        &gt; HANDSHAKE COMPLETE. ACCESS GRANTED TO NODE: {nhiResult?.name}
                      </div>
                    )}

                    {nhiStatus === 'error' && (
                      <div className="mt-6 pt-4 border-t border-red-500/20 text-red-400">
                        &gt; PROTOCOL ERROR. CONNECTION TERMINATED.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal removed in favor of separate page */}

    </div>
  );
}

// ==========================================
// 🧩 SUB-COMPONENTS (CRITICAL FOR FUNCTIONALITY)
// ==========================================

// 1. UserRow Component - Handles Independent Dropdown State
function UserRow({ userRow, currentUser, onRoleChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Close dropdown if clicked outside + Handle Positioning
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left });
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 220); // Height of dropdown + some margin
      if (spaceBelow < 220) {
        setCoords({ top: rect.top, left: rect.left });
      }
    }

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true); // Catch scroll in parents
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, dropdownRef]);

  const roles = ['Admin', 'Developer', 'Auditor', 'Newbie'];

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-slate-700 overflow-hidden">
          {userRow.profilePicture ? (
            <img
              src={userRow.profilePicture.startsWith('http') ? userRow.profilePicture : `${API_URL}${userRow.profilePicture}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            userRow.username.substring(0, 2).toUpperCase()
          )}
        </div>
        {userRow.username}
      </td>
      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{userRow.email}</td>
      <td className="px-6 py-4"><RoleBadge role={userRow.role} /></td>
      <td className="px-6 py-4 text-right">
        {/* Prevent changing own role or self */}
        {userRow._id === currentUser?._id || userRow._id === currentUser?.id ? (
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            System Identity
          </span>
        ) : (
          <div className="relative inline-block" ref={dropdownRef}>
            <button
              ref={triggerRef}
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-2 border px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ring-offset-2 ring-offset-slate-950
                ${isOpen
                  ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/20'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 text-slate-200 hover:bg-slate-700'
                }`}
            >
              Modify Role
              <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU - USING FIXED POSITIONING FOR PORTAL EFFECT */}
            {isOpen && (
              <div
                className={`fixed ${openUpwards ? '-translate-y-[calc(100%+12px)]' : 'mt-3'} w-48 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-[in_0.2s_ease-out] origin-top-right ring-1 ring-white/10`}
                style={{
                  zIndex: 10000,
                  top: coords.top,
                  left: coords.left + 192 - 192, // Manual right-align logic below
                  transform: openUpwards ? 'translate(-100% , -100%)' : 'translateX(-100%)' // Shift to align right edge
                }}
              >
                <div
                  ref={dropdownRef}
                  className="p-1.5 space-y-1"
                >
                  {roles.map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        onRoleChange(userRow._id, r);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-xs font-bold transition-all duration-200 flex items-center justify-between rounded-xl group
                            ${userRow.role === r
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                          `}
                    >
                      <span className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${userRow.role === r ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`}></div>
                        {r}
                      </span>
                      {userRow.role === r && <CheckCircle size={14} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// 2. Navigation Button Component
function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
        ${active
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      <Icon size={18} /> {label}
    </button>
  );
}

// 3. Role Badge Component
function RoleBadge({ role }) {
  const styles = {
    Admin: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)]",
    SuperAdmin: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]",
    Developer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]",
    Auditor: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.2)]",
    Newbie: "bg-slate-800/50 text-slate-400 border-slate-700",
  };

  const roleKey = role || 'Newbie';
  // Fallback for custom roles or capitalization mismatches
  const style = styles[roleKey] || (roleKey.toLowerCase().includes('admin') ? styles.Admin : styles.Newbie);

  return (
    <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {role}
    </span>
  );
}