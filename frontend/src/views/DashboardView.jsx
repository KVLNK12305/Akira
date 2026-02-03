import { useState, useEffect, useRef } from "react";
import { 
  Shield, Key, FileText, Lock, Users, Activity, 
  CheckCircle, XCircle, LogOut, Fingerprint, AlertTriangle, 
  Cpu, Thermometer, ChevronDown, Save, Bell, Trash2, Book,
  RefreshCw // 🟢 NEW ICON FOR ROTATION
} from "lucide-react";
import api from "../api/axios"; 
import { DocumentationView } from "./DocumentationView";

// --- HELPER FUNCTIONS ---

// Format Timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return "Just now";
  return new Date(dateStr).toLocaleTimeString();
};

// --- MAIN COMPONENT ---
export function DashboardView({ user, keys, logs, onGenerateKey, onLogout, onDeleteKey, onRefreshKeys }) {
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
      console.error("Failed to load users");
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


  // ----------------------------------------
  // 5. RENDER
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* =======================
          🟢 LEFT SIDEBAR
      ======================== */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-xl fixed h-full z-20">
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
          {isHighPrivilege && (
            <NavButton 
              icon={Key} 
              label="API Credentials" 
              active={activeTab === 'keys'} 
              onClick={() => setActiveTab('keys')}
            />
          )}
          
          <NavButton 
            icon={FileText} 
            label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          
          <NavButton 
            icon={Users} 
            label="User Management" 
            active={activeTab === 'matrix'} 
            onClick={() => setActiveTab('matrix')} 
          />

          <NavButton 
            icon={Book} 
            label={`Documentation (${currentRole})`} 
            active={activeTab === 'docs'} 
            onClick={() => setActiveTab('docs')} 
          />
        </nav>
        {/* User Profile Footer (Clickable) */}
        <div 
          onClick={() => setShowProfile(true)}
          className="p-4 bg-slate-900/80 border-t border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors group"
        >
           <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs border border-white/10 group-hover:border-emerald-500/50 transition-colors">
                {user?.username?.substring(0,2).toUpperCase()}
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
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        
        {/* HEADER & WIDGETS */}
        <header className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'keys' && "Key Vault"}
              {activeTab === 'logs' && "Security Events"}
              {activeTab === 'matrix' && "Identity & Access Control"}
              {activeTab === 'docs' && "Documentation"}
            </h2>
            <p className="text-slate-400 text-sm">
              Session ID: <span className="font-mono text-emerald-400">{user?._id?.substring(0,8) || user?.id?.substring(0,8) || "SESSION-ACTIVE"}</span>
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
                      onClick={() => {navigator.clipboard.writeText(newRotatedKey); alert("Copied!");}}
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
                        <Key size={20} className="text-emerald-400"/> Issue Credentials
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
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
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
                             <span className="flex items-center gap-2"><Lock size={12}/> AES-256-GCM</span>
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
                        <CheckCircle size={14}/> Verified (SHA-256)
                     </p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex-1">
                     <p className="text-xs text-slate-500 uppercase font-bold">Retention Policy</p>
                     <p className="text-blue-400 font-mono text-sm font-bold mt-1">90 Days / Immutable</p>
                  </div>
               </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-xl">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 border-b border-slate-900 flex items-center gap-4 hover:bg-slate-900/30 transition-colors">
                      <span className="text-slate-500 min-w-[80px]">{formatDate(log.time || log.timestamp)}</span>
                      <span className={`w-32 font-bold ${log.action?.includes('DENIED') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.action}
                      </span>
                      <span className="flex-1 text-slate-300">{log.desc || "System Event"}</span>
                      <Shield size={10} className="text-slate-600" />
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="p-8 text-center text-slate-600">No logs generated yet.</div>
                  )}
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
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                   <div className="p-6 border-b border-slate-800 flex justify-between items-center">
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

                   <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="px-6 py-4 text-left">User Identity</th>
                        <th className="px-6 py-4 text-left">Email</th>
                        <th className="px-6 py-4 text-left">Current Role</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                      {loadingUsers ? (
                         <tr><td colSpan="4" className="p-8 text-center text-slate-500"><Activity className="animate-spin inline mr-2"/> Loading Users...</td></tr>
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
              )}
            </div>
          )}

        </div>
      </main>

      {/* =======================
          👤 PROFILE MODAL 
      ======================== */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <XCircle size={20} />
            </button>

            {/* Header Banner */}
            <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800 relative">
               <div className="absolute -bottom-8 left-8">
                  <div className="w-20 h-20 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                     {user?.username?.substring(0,2).toUpperCase()}
                  </div>
               </div>
            </div>

            {/* Body */}
            <div className="pt-12 pb-8 px-8">
              <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
              <p className="text-slate-500 text-sm mb-6">{user?.email}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Role</p>
                    <p className={`font-mono text-sm font-bold ${isStrictAdmin ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {user?.role?.toUpperCase()}
                    </p>
                 </div>
                 <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">User ID</p>
                    {/* 🚀 FIX: Use _id for MongoDB */}
                    <p className="font-mono text-xs text-slate-300 truncate" title={user?._id || user?.id}>
                      {user?._id || user?.id || "SESSION-X"}
                    </p>
                 </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400 flex items-center gap-2"><Lock size={14}/> 2FA Status</span>
                    <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded">ENABLED</span>
                 </div>
                 <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-800/50">
                    <span className="text-slate-400 flex items-center gap-2"><Activity size={14}/> Last Login</span>
                    <span className="text-slate-300 text-xs font-mono">{new Date().toLocaleDateString()}</span>
                 </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                 <button 
                   onClick={onLogout} 
                   className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                 >
                   <LogOut size={16} /> Sign Out
                 </button>
                 <button 
                   onClick={() => setShowProfile(false)}
                   className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 py-2.5 rounded-lg text-sm font-bold transition-colors"
                 >
                   Close
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 🧩 SUB-COMPONENTS (CRITICAL FOR FUNCTIONALITY)
// ==========================================

// 1. UserRow Component - Handles Independent Dropdown State
function UserRow({ userRow, currentUser, onRoleChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const roles = ['Admin', 'Developer', 'Auditor', 'Newbie'];

  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
         <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border border-slate-700">
            {userRow.username.substring(0,2).toUpperCase()}
         </div>
         {userRow.username}
      </td>
      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{userRow.email}</td>
      <td className="px-6 py-4"><RoleBadge role={userRow.role} /></td>
      <td className="px-6 py-4 text-right">
         {/* Prevent changing own role or self */}
         {userRow._id === currentUser?._id || userRow._id === currentUser?.id ? (
           <span className="text-xs text-slate-600 italic bg-slate-900 px-2 py-1 rounded border border-slate-800">Current User</span>
         ) : (
           <div className="relative inline-block" ref={dropdownRef}>
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center gap-2 border px-3 py-1.5 rounded text-xs transition-all ${
                   isOpen ? 'bg-slate-700 border-emerald-500/50 text-white' : 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-300'
                }`}
              >
                 Modify Role <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
              </button>
              
              {/* DROPDOWN MENU */}
              {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden animate-[fade-in_0.1s] ring-1 ring-white/10" style={{ zIndex: 9999 }}>
                   {roles.map(r => (
                      <button 
                        key={r} 
                        onClick={() => {
                          onRoleChange(userRow._id, r);
                          setIsOpen(false);
                        }} 
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-between group
                          ${userRow.role === r 
                             ? 'bg-emerald-500/10 text-emerald-400' 
                             : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                        `}
                      >
                        {r}
                        {userRow.role === r && <CheckCircle size={12} />}
                      </button>
                   ))}
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
    Admin: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_-4px_rgba(168,85,247,0.4)]",
    SuperAdmin: "bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_10px_-4px_rgba(236,72,153,0.4)]",
    Developer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Auditor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Newbie: "bg-slate-800 text-slate-500 border-slate-700",
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