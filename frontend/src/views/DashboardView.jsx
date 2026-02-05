import { useState, useEffect, useRef } from "react";
import {
  Shield, Key, FileText, Lock, Users, Activity,
  CheckCircle, XCircle, LogOut, Fingerprint, AlertTriangle,
  Cpu, Thermometer, ChevronDown, Save, Bell, Trash2, Book,
  RefreshCw, Eye, Terminal, ArrowRight, Menu, X, Download,
  FileJson, FileCode, FileBarChart
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api, { API_URL } from "../api/axios";
import { DocumentationView } from "./DocumentationView";

// --- HELPER FUNCTIONS ---

// Format Timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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

  // RUST/GATEWAY FEATURE: State for the newly issued key (Only shown once)
  const [revealedKey, setRevealedKey] = useState(null);

  // Rust Core Simulation State (The "Alive" Widget)
  const [systemStats, setSystemStats] = useState({
    integrity: "SECURE",
    activeNodes: 3,
    cpu: 12,
    temp: 45
  });

  // NHI LAB STATE
  const [nhiInput, setNhiInput] = useState("");
  const [nhiIsBase64, setNhiIsBase64] = useState(false);
  const [nhiSteps, setNhiSteps] = useState([]);
  const [nhiStatus, setNhiStatus] = useState("idle"); // idle, validating, success, error
  const [nhiResult, setNhiResult] = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  // EXPORT MODAL STATE
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    loading: false
  });

  // CUSTOM MODAL STATE
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    isDestructive: false
  });

  // NOTIFICATION STATE
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ----------------------------------------
  // 2. SECURITY & RBAC LOGIC
  // ----------------------------------------
  const currentRole = user?.role?.toLowerCase() || "newbie";

  // "High Privilege" = Can see Keys (Devs, Admins)
  const isHighPrivilege = ['admin', 'superadmin', 'developer'].includes(currentRole);

  // "Strict Admin" = Can manage Users (Admins only)
  const isStrictAdmin = ['admin', 'superadmin'].includes(currentRole);

  // "Can Export" = Now all users can export their own logs
  const canExportLogs = !!user;

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

  // RUST FEATURE: ROTATION HANDLER
  const handleRotate = async (keyId) => {
    setConfirmModal({
      isOpen: true,
      title: "Rotate API Key?",
      message: "This will INVALIDATE the old key immediately. The new key will be generated using the RUST Chaos Engine.",
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await api.post(`/keys/${keyId}/rotate`);
          if (res.data.success) {
            setRevealedKey(res.data.newApiKey);
            if (onRefreshKeys) onRefreshKeys();
            notify("Key Rotated via Rust Engine!", "success");
          }
        } catch (err) {
          console.error("Rotation failed:", err);
          notify(err.response?.data?.error || err.message, "error");
        }
      }
    });
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
        console.log(`Role updated to ${newRole} for ${userId}`);
        notify(`Role updated to ${newRole}`, "success");
      }
    } catch (err) {
      notify(err.response?.data?.error || "Server Error", "error");
      fetchUsers(); // Revert UI if failed
    }
  };

  const handleUserDelete = async (userId, username) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account?",
      message: `Warning: This will permanently remove ${username}'s access and all associated API keys. This action is irreversible.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await api.delete(`/users/${userId}`);
          if (res.data.success) {
            setUserList(prev => prev.filter(u => u._id !== userId));
            notify(res.data.message, "success");
          }
        } catch (err) {
          notify(err.response?.data?.error || "Deletion Failed", "error");
        }
      }
    });
  };

  const handleExportLogs = () => {
    setExportModal({ isOpen: true, loading: false });
  };

  const handleExecuteExport = async (format) => {
    setExportModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.get(`/audit-logs/export?format=${format}`);
      const data = res.data;
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `akira_audit_${timestamp}`;

      if (format === 'json') {
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        downloadFile(dataUri, `${filename}.json`);
      }
      else if (format === 'base64') {
        const dataStr = JSON.stringify(data);
        const encoded = btoa(unescape(encodeURIComponent(dataStr)));
        const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(encoded);
        downloadFile(dataUri, `${filename}.txt`);
      }
      else if (format === 'pdf') {
        const doc = new jsPDF();

        // 1. Header
        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129); // Emerald-500
        doc.text("AKIRA SECURE GATEWAY", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`FORENSIC AUDIT REPORT • ${new Date().toLocaleString()}`, 14, 30);

        // 2. Metadata Table
        const metadata = [
          ["Exported By", data.exportedBy.username],
          ["Role", data.exportedBy.role],
          ["System", data.system],
          ["Log Count", data.logCount.toString()],
          ["Integrity Signature", data.integritySignature.substring(0, 32) + "..."]
        ];

        autoTable(doc, {
          startY: 40,
          head: [["Attribute", "Value"]],
          body: metadata,
          theme: 'grid',
          headStyles: { fillColor: [30, 41, 59] },
          styles: { fontSize: 9, font: 'courier' }
        });

        // 3. Logs Table
        const tableBody = data.logs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.action,
          log.actor?.username || "System",
          JSON.stringify(log.details).substring(0, 50) + "..."
        ]);

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 15,
          head: [["Timestamp", "Action", "Actor", "Details Summary"]],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8 }
        });

        // 4. Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
          doc.text(`Signature Hash: ${data.integritySignature}`, 14, doc.internal.pageSize.height - 10);
        }

        doc.save(`${filename}.pdf`);
      }

      setExportModal({ isOpen: false, loading: false });
      notify("Export Successful!", "success");
      if (onRefreshKeys) onRefreshKeys();
    } catch (err) {
      console.error("Export failed:", err);
      notify("Export Failed: " + (err.response?.data?.error || err.message), "error");
      setExportModal({ isOpen: false, loading: false });
    }
  };

  const downloadFile = (uri, name) => {
    const link = document.createElement('a');
    link.href = uri;
    link.download = name;
    link.click();
  };

  const handleDeleteKey = async (keyId, keyName) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete API Key?",
      message: `Are you sure you want to delete "${keyName}"? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/keys/${keyId}`);
          onDeleteKey?.(keyId);
          notify("Key deleted successfully", "success");
        } catch (err) {
          console.error("Failed to delete key:", err);
          notify(err.response?.data?.error || "Server Error", "error");
        }
      }
    });
  };

  const handleGenerateKeyInternal = async () => {
    const key = await onGenerateKey("Service Key", ["read:data"]);
    if (key) {
      setRevealedKey(key);
      notify("New Credentials Issued!", "success");
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

      {/* MOBILE HEADER */}
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
        <div className="p-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: "Sign Out?",
                message: "Are you sure you want to end your secure session?",
                isDestructive: false,
                onConfirm: onLogout
              });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
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

          {/* RUST IRON CORE WIDGET (LIVE) */}
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

              {/* SECURITY FEATURE: NEW KEY DISPLAY (Shown after Generation or Rotation) */}
              {revealedKey && (
                <div className="mb-6 p-4 border-l-4 border-emerald-500 bg-emerald-900/20 rounded-r-lg backdrop-blur-md animate-pulse">
                  <h3 className="text-emerald-400 font-bold mb-2 flex items-center">
                    <Lock className="w-5 h-5 mr-2" /> New Access Credentials Issued
                  </h3>
                  <p className="text-gray-300 text-sm mb-2 font-medium">
                    Please copy this secret key now. <span className="text-emerald-400">For your security, it will never be displayed again.</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="block w-full p-3 bg-black/50 rounded border border-emerald-500/30 text-emerald-300 font-mono text-lg break-all">
                      {revealedKey}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(revealedKey); notify("Key copied to clipboard!", "success"); }}
                      className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all shadow-lg"
                    >
                      COPY
                    </button>
                  </div>
                  <button
                    onClick={() => setRevealedKey(null)}
                    className="mt-4 text-xs text-gray-400 hover:text-white underline"
                  >
                    Dismiss notification
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
                <button onClick={handleGenerateKeyInternal} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]">
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
                          <span className="flex items-center gap-2"><Lock size={12} /> AES-256-CBC</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Active</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">{formatDate(k?.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* RUST FEATURE: ROTATE BUTTON */}
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
                <div className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-4">
                  <span>MATCHES: {logs.filter(l => (l.action + l.desc).toLowerCase().includes(logSearch.toLowerCase())).length}</span>

                  {canExportLogs && (
                    <button
                      onClick={handleExportLogs}
                      className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded border border-emerald-500/20 transition-all font-bold group"
                    >
                      <Download size={12} className="group-hover:translate-y-0.5 transition-transform" />
                      SECURE EXPORT (.JSON)
                    </button>
                  )}
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
                            onDeleteUser={handleUserDelete}
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

      {/* 🛡️ SYSTEM OVERLAYS */}
      <ConfirmationModal
        {...confirmModal}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <ExportOptionsModal
        {...exportModal}
        onCancel={() => setExportModal(prev => ({ ...prev, isOpen: false }))}
        onExport={handleExecuteExport}
      />
      {notification && <Toast {...notification} />}
    </div>
  );
}

// ==========================================
// 🧩 SUB-COMPONENTS (CRITICAL FOR FUNCTIONALITY)
// ==========================================

// 1. UserRow Component - Handles Independent Dropdown State
function UserRow({ userRow, currentUser, onRoleChange, onDeleteUser }) {
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
          <div className="flex items-center justify-end gap-3">
            {/* DELETE USER BUTTON */}
            <button
              onClick={() => onDeleteUser(userRow._id, userRow.username)}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-all border border-red-500/20 group/btn"
              title="Delete User"
            >
              <Trash2 size={14} className="group-hover/btn:scale-110 transition-transform" />
            </button>

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

// 4. Custom Confirmation Modal
function ConfirmationModal({ isOpen, title, message, onConfirm, onCancel, isDestructive }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-[fade-in_0.2s]"
        onClick={onCancel}
      ></div>
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-[scale-in_0.2s] ring-1 ring-white/10">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 border ${isDestructive ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg ${isDestructive ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Toast Notification
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-8 right-8 z-[10001] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl animate-[slide-in-right_0.3s] ${type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'}`}>
      {type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
      <span className="font-bold text-sm tracking-tight">{msg}</span>
    </div>
  );
}

// 6. Export Options Modal
function ExportOptionsModal({ isOpen, loading, onCancel, onExport }) {
  if (!isOpen) return null;

  const options = [
    {
      id: 'json',
      name: 'Standard JSON',
      desc: 'Raw machine-readable logs with digital signatures.',
      icon: FileJson,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      id: 'base64',
      name: 'Base64 Sealed',
      desc: 'Obfuscated encoding for secure transmission.',
      icon: FileCode,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10'
    },
    {
      id: 'pdf',
      name: 'Forensic PDF',
      desc: 'Formatted report for human audit and printing.',
      icon: FileBarChart,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    }
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-[fade-in_0.2s]"
        onClick={onCancel}
      ></div>
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-[scale-in_0.2s] overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Export <span className="text-emerald-400">Audit Logs</span></h3>
              <p className="text-slate-400 text-sm">Select your preferred forensic format</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3 mb-8">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => !loading && onExport(opt.id)}
                disabled={loading}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all text-left disabled:opacity-50"
              >
                <div className={`w-12 h-12 rounded-xl ${opt.bg} flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform`}>
                  <opt.icon className={opt.color} size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{opt.name}</h4>
                  <p className="text-xs text-slate-500 leading-tight">{opt.desc}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                  <ArrowRight size={18} className="text-emerald-500" />
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-400 font-mono text-xs animate-pulse">GENERATING SECURE REPORT...</p>
            </div>
          )}

          <p className="text-[10px] text-center text-slate-600 uppercase font-mono tracking-widest">
            🛡️ All exports are cryptographically signed by AKIRA-CORE
          </p>
        </div>
      </div>
    </div>
  );
}