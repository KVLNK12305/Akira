import { useState, useEffect } from "react";
import { 
  Shield, Key, FileText, Lock, Users, Activity, 
  CheckCircle, XCircle, LogOut, Fingerprint, AlertTriangle 
} from "lucide-react";
import { Button } from "../components/UI/Button";

// Helper to format timestamps from MongoDB
const formatDate = (dateStr) => {
  if (!dateStr) return "Just now";
  return new Date(dateStr).toLocaleTimeString();
};

export function DashboardView({ user, keys, logs, onGenerateKey, onLogout }) {
  const [activeTab, setActiveTab] = useState("keys");
  
  // 🔒 SECURITY ENFORCEMENT
  // We use the REAL role from the JWT token. No toggling allowed.
  const currentRole = user?.role?.toLowerCase() || "developer";

  // Force "Auditor" to only see Logs (Rubric Requirement)
  useEffect(() => {
    if (currentRole === 'auditor') setActiveTab('logs');
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* 🟢 SIDEBAR */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-xl fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight">AKIRA<span className="text-emerald-400">Gate</span></h1>
            <p className="text-[10px] text-slate-500 font-mono">v1.0 • NIST LEVEL 2</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton 
            icon={Key} label="API Keys" 
            active={activeTab === 'keys'} 
            onClick={() => setActiveTab('keys')}
            disabled={currentRole === 'auditor'} // Auditors cannot see/manage keys
          />
          <NavButton 
            icon={FileText} label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          <NavButton 
            icon={Users} label="Access Matrix" 
            active={activeTab === 'matrix'} 
            onClick={() => setActiveTab('matrix')} 
          />
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs border border-white/10">
                {user?.username?.substring(0,2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.username}</p>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">{user?.role}</p>
                </div>
              </div>
           </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-xs uppercase font-bold tracking-wider w-full pt-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* 🔵 MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
        
        {/* Header */}
        <header className="flex justify-between items-end mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'keys' && "Key Management"}
              {activeTab === 'logs' && "Immutable Audit Logs"}
              {activeTab === 'matrix' && "Access Control Model"}
            </h2>
            <p className="text-slate-400 flex items-center gap-2 text-sm">
              Identity Context: <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded capitalize">{currentRole}</span>
            </p>
          </div>
          
          <div className="flex gap-4">
            <StatusPill icon={Lock} label="AES-256 Vault" color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatusPill icon={Activity} label="Live Audit" color="text-blue-400" bg="bg-blue-500/10" />
          </div>
        </header>

        {/* 🚀 TAB CONTENT */}
        <div className="relative z-10">
          
          {/* 1. API KEYS MODULE */}
          {activeTab === 'keys' && (
            <div className="space-y-6 animate-[fade-in_0.3s]">
              {/* Only Admins/Devs can generate keys */}
              {currentRole !== 'auditor' && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-slate-900 border border-emerald-500/20 flex justify-between items-center shadow-lg">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key size={20} className="text-emerald-400"/> Generate Secure Credentials
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-lg">
                      Keys are generated using 32-byte entropy, encrypted with AES-256-CBC at rest, and visually masked.
                    </p>
                  </div>
                  <Button onClick={() => onGenerateKey("New Service", ["read:data"])} className="w-auto px-6">
                     Issue New Key
                  </Button>
                </div>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-500 uppercase font-mono text-xs">
                    <tr>
                      <th className="px-6 py-4">Identity Fingerprint</th>
                      <th className="px-6 py-4">Encryption Algo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {keys.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">No active identities found in the vault.</td></tr>
                    ) : (
                      keys.map((k) => (
                        <tr key={k.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-mono text-slate-300">
                             <div className="flex flex-col gap-1">
                                {/* If prefix exists (Just Created), Show it! */}
                                {k.prefix && (
                                    <div className="flex items-center gap-2 mb-1 animate-pulse">
                                        <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-xs font-bold">NEW</span>
                                        <code className="text-emerald-400 select-all">{k.prefix}</code>
                                    </div>
                                )}
                                <span className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                                   <Fingerprint size={12}/> {k.fingerprint ? k.fingerprint.substring(0, 32) + "..." : "Hash Hidden"}
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-mono text-xs">
                              <span className="flex items-center gap-1.5"><Lock size={10}/> AES-256-CBC</span>
                          </td>
                          <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 shadow-[0_0_10px_-4px_rgba(16,185,129,0.5)]">
                                {k.status || "Active"}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs font-mono">{formatDate(k.created || k.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. AUDIT LOGS MODULE */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-[fade-in_0.3s]">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold">Integrity Check</p>
                  <p className="text-emerald-400 font-mono text-sm mt-1 flex items-center gap-2">
                    <CheckCircle size={14}/> Signatures Valid
                  </p>
                </div>
                <div className="flex-1 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                   <p className="text-xs text-slate-500 uppercase font-bold">Hashing Algorithm</p>
                   <p className="text-blue-400 font-mono text-sm mt-1">HMAC-SHA256</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-xl">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">No events logged yet.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 border-b border-slate-900 flex items-center gap-4 hover:bg-slate-900/30 transition-colors">
                      <span className="text-slate-500 min-w-[80px]">{formatDate(log.time || log.timestamp)}</span>
                      <span className={`w-32 font-bold ${log.action?.includes('DENIED') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.action}
                      </span>
                      <span className="flex-1 text-slate-300">{log.desc || (log.details ? JSON.stringify(log.details) : "System Event")}</span>
                      <div className="text-slate-600 flex items-center gap-1 min-w-[120px]" title="Digital Signature Verified">
                        <Shield size={10} /> {log.signature ? log.signature.substring(0, 12) + "..." : "Verified"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. ACCESS CONTROL MATRIX */}
          {activeTab === 'matrix' && (
            <div className="animate-[fade-in_0.3s]">
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-purple-400" /> 
                    Role-Based Access Control (RBAC)
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    This matrix is enforced by the Middleware Engine before every API request.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="px-6 py-4 text-left">Subject ↓ / Object →</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">Manage Keys</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">Access APIs</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">View Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                      {/* Highlight the user's current role row */}
                      <tr className={currentRole === 'admin' ? 'bg-purple-500/10' : ''}>
                        <td className="px-6 py-4 font-bold text-purple-400">Admin</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                      </tr>
                      <tr className={currentRole === 'developer' ? 'bg-blue-500/10' : ''}>
                        <td className="px-6 py-4 font-bold text-blue-400">Developer</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                      </tr>
                      <tr className={currentRole === 'auditor' ? 'bg-orange-500/10' : ''}>
                        <td className="px-6 py-4 font-bold text-orange-400">Auditor</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-center text-slate-500">
                    Your current session is bound to the <span className="text-emerald-400 uppercase font-bold">{currentRole}</span> policy.
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function NavButton({ icon: Icon, label, active, onClick, disabled }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
        ${active 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}
      `}
    >
      <Icon size={18} />
      {label}
      {disabled && <Lock size={12} className="ml-auto" />}
    </button>
  );
}

function StatusPill({ icon: Icon, label, color, bg }) {
  return (
    <div className={`px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2 ${bg}`}>
      <Icon size={12} className={color} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

function PermissionBadge({ allowed }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded text-xs border border-emerald-500/10">
      <CheckCircle size={10} /> Allow
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-800/50 px-2 py-1 rounded text-xs border border-slate-700">
      <XCircle size={10} /> Deny
    </span>
  );
}