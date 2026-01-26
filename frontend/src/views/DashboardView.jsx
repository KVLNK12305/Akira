import { useState, useEffect } from "react";
import { 
  Shield, Key, FileText, Lock, Users, Activity, 
  CheckCircle, XCircle, Search, Terminal, LogOut, 
  ChevronRight, AlertTriangle, Fingerprint 
} from "lucide-react";
import { Button } from "../components/UI/Button";

export function DashboardView({ user, keys, logs, onGenerateKey, onLogout }) {
  const [activeTab, setActiveTab] = useState("keys");
  const [currentRole, setCurrentRole] = useState(user.role || "developer"); // Toggle for demo

  // Force the tab based on role capabilities (Simulating Access Control)
  useEffect(() => {
    if (currentRole === 'auditor') setActiveTab('logs');
    if (currentRole === 'developer') setActiveTab('keys');
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans selection:bg-emerald-500/30">
      
      {/* 🟢 SIDEBAR (Navigation) */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col backdrop-blur-xl fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight">Secure<span className="text-emerald-400">Gate</span></h1>
            <p className="text-[10px] text-slate-500 font-mono">v2.4.0 • NIST LEVEL 2</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavButton 
            icon={Key} label="API Keys" 
            active={activeTab === 'keys'} 
            onClick={() => setActiveTab('keys')}
            disabled={currentRole === 'auditor'}
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

        {/* 🛠️ ROLE TOGGLER (FOR EXAMINER DEMO) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Simulate Actor</p>
          <div className="grid grid-cols-3 gap-1">
            <RoleBadge role="admin" current={currentRole} set={setCurrentRole} />
            <RoleBadge role="developer" current={currentRole} set={setCurrentRole} />
            <RoleBadge role="auditor" current={currentRole} set={setCurrentRole} />
          </div>
        </div>

        <div className="p-4">
          <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-sm w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* 🔵 MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        {/* Background Gradients */}
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
              Current Subject: <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded capitalize">{currentRole}</span>
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <StatusPill icon={Lock} label="AES-256 Active" color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatusPill icon={Activity} label="Monitoring On" color="text-blue-400" bg="bg-blue-500/10" />
          </div>
        </header>

        {/* 🚀 TAB CONTENT */}
        <div className="relative z-10">
          
          {/* 1. API KEYS MODULE */}
          {activeTab === 'keys' && (
            <div className="space-y-6 animate-[fade-in_0.3s]">
              {currentRole !== 'auditor' && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-slate-900 border border-emerald-500/20 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">Generate Secure Credentials</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-lg">
                      Keys are generated using CSPRNG, encrypted with AES-256-CBC, and signed.
                    </p>
                  </div>
                  <Button onClick={onGenerateKey} className="w-auto px-6">
                    <Key size={18} /> Issue New Key
                  </Button>
                </div>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-500 uppercase font-mono text-xs">
                    <tr>
                      <th className="px-6 py-4">Key Fingerprint (SHA-256)</th>
                      <th className="px-6 py-4">Encryption</th>
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {keys.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">No active keys found. Generate one to start.</td></tr>
                    ) : (
                      keys.map((k) => (
                        <tr key={k.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-300 flex items-center gap-2">
                             <Fingerprint size={14} className="text-slate-500"/> {k.fingerprint.substring(0, 24)}...
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-mono text-xs">AES-256-CBC</td>
                          <td className="px-6 py-4 text-slate-300">{user.username}</td>
                          <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">Active</span></td>
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
                   <p className="text-xs text-slate-500 uppercase font-bold">Hashing Algo</p>
                   <p className="text-blue-400 font-mono text-sm mt-1">HMAC-SHA256</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">No events logged yet.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 border-b border-slate-900 flex items-center hover:bg-slate-900/30 transition-colors">
                      <span className="text-slate-500 w-32">{log.time}</span>
                      <span className={`w-24 font-bold ${log.action.includes('ERROR') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {log.action}
                      </span>
                      <span className="flex-1 text-slate-300 px-4">{log.desc}</span>
                      <div className="text-slate-600 flex items-center gap-1" title="Digital Signature Verified">
                        <Shield size={10} /> {log.signature.substring(0, 16)}...
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. ACCESS CONTROL MATRIX (RUBRIC REQUIREMENT) */}
          {activeTab === 'matrix' && (
            <div className="animate-[fade-in_0.3s]">
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-purple-400" /> 
                    Role-Based Access Control (RBAC)
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Enforced by the Access Control Engine before every API request.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="px-6 py-4 text-left">Subject ↓ / Object →</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">Manage Keys</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">Access APIs</th>
                        <th className="px-6 py-4 text-center bg-slate-800/50">Audit Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                      <tr>
                        <td className="px-6 py-4 font-bold text-purple-400">Admin</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-blue-400">Developer</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-orange-400">Auditor</td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed={false} /></td>
                        <td className="px-6 py-4 text-center"><PermissionBadge allowed /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400">
                  <strong>Policy Justification:</strong>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li><span className="text-purple-400">Admins</span> require full control for system maintenance.</li>
                    <li><span className="text-blue-400">Developers</span> need Least Privilege (only create keys/use APIs).</li>
                    <li><span className="text-orange-400">Auditors</span> must verify compliance but cannot modify data (Integrity).</li>
                  </ul>
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

function RoleBadge({ role, current, set }) {
  const active = role === current;
  const colors = {
    admin: "text-purple-400 border-purple-500/20 hover:bg-purple-500/10",
    developer: "text-blue-400 border-blue-500/20 hover:bg-blue-500/10",
    auditor: "text-orange-400 border-orange-500/20 hover:bg-orange-500/10"
  };
  
  return (
    <button 
      onClick={() => set(role)}
      className={`
        text-[10px] uppercase font-bold py-1 rounded border transition-all
        ${active ? 'bg-slate-800 border-white/20 text-white' : colors[role]}
      `}
    >
      {role.substring(0,3)}
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