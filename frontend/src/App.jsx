import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext"; // Import Context
import api from "./api/axios"; // Import Axios for fetching keys

// Views
import { HeroView } from "./views/HeroView";
import LoginView from "./pages/Login"; // Use the new LoginView we just updated!
import { MFAView } from "./views/MFAView";
import { DashboardView } from "./views/DashboardView";
// import { DocumentationView } from "./views/DocumentationView"; // Uncomment if you have this file

// ⚡ THE MAIN WRAPPER
export default function App() {
  return (
    <AuthProvider>
      <MainLogic />
    </AuthProvider>
  );
}

// 🧠 THE LOGIC COMPONENT (Has access to useAuth)
function MainLogic() {
  const { user, token, logout } = useAuth(); // Get real user state
  const [view, setView] = useState("hero");
  
  // Real Data State
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 1. Auto-Redirect Logic ---
  // If we have a token (logged in), go straight to Dashboard
  useEffect(() => {
    if (token && view !== "dashboard") {
      setView("dashboard");
      fetchDashboardData();
    }
  }, [token]);

  // --- 2. Data Fetching (Real Backend) ---
  const fetchDashboardData = async () => {
    try {
      // Fetch Keys
      const keyRes = await api.get('/keys'); 
      setKeys(keyRes.data);

      // Fetch Logs (If you implemented the logs endpoint, otherwise keep mock for now)
      // const logRes = await api.get('/logs');
      // setLogs(logRes.data); 
      
      // For Lab Demo: We can simulate logs from the keys if needed
      setLogs([
        { id: 1, action: "SYSTEM_INIT", desc: "Secure Gateway Online", time: new Date().toLocaleTimeString(), signature: "sys_root" }
      ]);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  // --- 3. Handlers ---

  const handleStart = () => {
    setView("login");
  };

  const handleDocs = () => {
    // setView("docs"); // Uncomment if you have docs
    alert("Documentation View Placeholder");
  };

  const handleLogout = () => {
    logout(); // Clear Token
    setView("hero");
    setKeys([]);
  };

  const handleGenerateKey = async (name, scopes) => {
    try {
      setLoading(true);
      // CALL REAL BACKEND 🚀
      const res = await api.post('/keys/generate', { 
        name: name || "New Service", 
        scopes: scopes || ["read:data"] 
      });
      
      // Add new key to list
      const newKey = {
        id: res.data.keyId,
        prefix: res.data.apiKey, // SHOWS FULL KEY ONCE (Important!)
        created: new Date().toLocaleTimeString(),
        fingerprint: "SHA-256: (Hidden)", // We refresh list to get real fingerprint
        status: "Active"
      };
      
      setKeys([newKey, ...keys]);
      
      // Add Audit Log
      setLogs(prev => [{
        id: Date.now(),
        action: "KEY_GENERATED",
        desc: `AES-256 Key for ${name}`,
        time: new Date().toLocaleTimeString(),
        signature: "sig_" + Math.random().toString(16).substr(2, 6) // Simulated signature for UI
      }, ...prev]);

    } catch (err) {
      alert("Failed to generate key: " + err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };


  // --- 4. View Routing ---

  if (view === "hero") return <HeroView onStart={handleStart} onDocs={handleDocs} />;
  
  // Note: LoginView now handles the API call internally via AuthContext
  // We pass 'setView' so it can redirect if needed, but AuthContext auto-redirects usually
  if (view === "login") return <LoginView />; 
  
  if (view === "mfa") return <MFAView onVerify={() => setView("dashboard")} loading={loading} />;
  
  if (view === "dashboard") {
    return (
      <DashboardView 
        user={user || { username: "Admin", role: "SuperAdmin" }} 
        keys={keys} 
        logs={logs} 
        onGenerateKey={handleGenerateKey} 
        onLogout={handleLogout} 
      />
    );
  }

  return <HeroView onStart={handleStart} />;
}