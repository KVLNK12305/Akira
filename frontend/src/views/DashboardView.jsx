import { useState, useEffect } from "react";
import { 
  Shield, Key, FileText, Lock, Users, Activity, 
  CheckCircle, XCircle, LogOut, Fingerprint, AlertTriangle, 
  Cpu, Thermometer, ChevronDown, Save
} from "lucide-react";
import api from "../api/axios"; // Ensure this matches your axios setup

// Helper to format timestamps
const formatDate = (dateStr) => {
  if (!dateStr) return "Just now";
  return new Date(dateStr).toLocaleTimeString();
};

export function DashboardView({ user, keys, logs, onGenerateKey, onLogout }) {
  const [activeTab, setActiveTab] = useState("matrix");
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // 🔒 SECURITY ENFORCEMENT
  // "Newbie" is the default role until an Admin promotes them
  const currentRole = user?.role?.toLowerCase() || "newbie";
  const isAdmin = currentRole === 'admin';

  // Fetch Users when entering "Matrix" tab (Only if Admin)
  useEffect(() => {
    if (activeTab === 'matrix' && isAdmin) {
      fetchUsers();
    }
  }, [activeTab, isAdmin]);

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
      await api.put(`/users/${userId}/role`, { role: newRole });
      // Optimistic UI Update: Update list immediately without reloading
      setUserList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      alert(`User promoted to ${newRole}`);
    } catch (err) {
      alert("Failed to update role: " + (err.response?.data?.error || "Server Error"));
    }
  };

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
            <p className="text-[10px] text-slate-500 font-mono">v2.0 • PRO</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {/* Only show Keys to Admins/Developers */}
          {(currentRole === 'admin' || currentRole === 'developer') && (
            <NavButton 
              icon={Key} label="API Credentials" 
              active={activeTab === 'keys'} 
              onClick={() => setActiveTab('keys')}
            />
          )}
          
          <NavButton 
            icon={FileText} label="Audit Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
          />
          
          <NavButton 
            icon={Users} label="User Management" 
            active={activeTab === 'matrix'} 
            onClick={() => setActiveTab('matrix')} 
          />
        </nav>

        {/* User Profile Footer - CLICKABLE */}
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
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${currentRole === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`}></div>
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

      {/* 🔵 MAIN CONTENT */}
      <main className="flex-1 ml-64 p-8 relative overflow-hidden">
        
        {/* Header with System Stats Widget */}
        <header className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'keys' && "Key Vault"}
              {activeTab === 'logs' && "Security Events"}
              {activeTab === 'matrix' && "Identity & Access Control"}
            </h2>
            <p className="text-slate-400 text-sm">
              Session ID: <span className="font-mono text-emerald-400">{user?.id?.substring(0,8) || "GUEST"}</span>
            </p>
          </div>
          
          {/* 🖥️ RUST IRON CORE WIDGET (Simulated for Demo) */}
          <div className="flex gap-3">
             <div className="bg-black/40 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">System Integrity</p>
                    <p className="text-emerald-400 font-mono text-xs font-bold">100% SECURE</p>
                </div>
                <Activity size={18} className="text-emerald-500" />
             </div>
             <div className="bg-black/40 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Active Nodes</p>
                    <p className="text-blue-400 font-mono text-xs font-bold">3 ONLINE</p>
                </div>
                <Cpu size={18} className="text-blue-500" />
             </div>
          </div>
        </header>

        {/* 🚀 TAB CONTENT */}
        <div className="relative z-10">
          
          {/* 1. API KEYS (Only for Devs/Admins) */}
          {activeTab === 'keys' && (
            <div className="space-y-6 animate-[fade-in_0.3s]">
               <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900/20 to-slate-900 border border-emerald-500/20 flex justify-between items-center shadow-lg">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key size={20} className="text-emerald-400"/> Issue Credentials
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Generate high-entropy keys for your microservices.
                    </p>
                  </div>
                  <button onClick={() => onGenerateKey("Service Key", ["read:data"])} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors">
                     Generate Key
                  </button>
                </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-slate-500 uppercase font-mono text-xs">
                    <tr>
                      <th className="px-6 py-4">Key Fingerprint</th>
                      <th className="px-6 py-4">Encryption</th>
                      <th className="px-6 py-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-mono text-slate-300">
                                {k.prefix && <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-xs font-bold mr-2">NEW</span>}
                                {k.fingerprint || "****"}
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-mono text-xs">AES-256-GCM</td>
                          <td className="px-6 py-4 text-slate-500 text-xs font-mono">{formatDate(k.createdAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. AUDIT LOGS (Visible to Everyone) */}
          {activeTab === 'logs' && (
            <div className="space-y-4 animate-[fade-in_0.3s]">
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
              </div>
            </div>
          )}

          {/* 3. USER MANAGEMENT (Admin Only) */}
          {activeTab === 'matrix' && (
            <div className="animate-[fade-in_0.3s]">
              
              {!isAdmin ? (
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
                        <tr key={u._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">{u.email}</td>
                          <td className="px-6 py-4">
                             <RoleBadge role={u.role || 'Newbie'} />
                          </td>
                          <td className="px-6 py-4 text-right">
                             {u._id === user.id ? (
                               <span className="text-xs text-slate-600 italic">Current User</span>
                             ) : (
                               <div className="relative inline-block group">
                                  <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded text-xs transition-colors">
                                     Modify Role <ChevronDown size={12}/>
                                  </button>
                                  {/* Hover Dropdown */}
                                  <div className="absolute right-0 top-full mt-1 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                                     <button onClick={() => handleRoleChange(u._id, 'Admin')} className="w-full text-left px-3 py-2 hover:bg-purple-900/30 text-purple-400 text-xs font-bold">Admin</button>
                                     <button onClick={() => handleRoleChange(u._id, 'Developer')} className="w-full text-left px-3 py-2 hover:bg-emerald-900/30 text-emerald-400 text-xs font-bold">Developer</button>
                                     <button onClick={() => handleRoleChange(u._id, 'Auditor')} className="w-full text-left px-3 py-2 hover:bg-orange-900/30 text-orange-400 text-xs font-bold">Auditor</button>
                                     <button onClick={() => handleRoleChange(u._id, 'Newbie')} className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-400 text-xs font-bold">Revoke</button>
                                  </div>
                               </div>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* 👤 PROFILE MODAL OVERLAY */}
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
                    <p className={`font-mono text-sm font-bold ${currentRole === 'admin' ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {user?.role?.toUpperCase()}
                    </p>
                 </div>
                 <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">User ID</p>
                    <p className="font-mono text-xs text-slate-300 truncate" title={user?.id || user?._id}>
                      {user?.id || user?._id || "SESSION-X"}
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

// --- HELPER COMPONENTS ---

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
        ${active 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }
      `}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function RoleBadge({ role }) {
  const styles = {
    Admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Developer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Auditor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Newbie: "bg-slate-800 text-slate-500 border-slate-700",
  };

  const style = styles[role] || styles['Newbie'];

  return (
    <span className={`px-2 py-1 rounded border text-xs font-bold uppercase tracking-wider ${style}`}>
      {role}
    </span>
  );
}