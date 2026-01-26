import { useState } from "react";
import { HeroView } from "./views/HeroView";
import { LoginView } from "./views/LoginView";
import { MFAView } from "./views/MFAView";
import { DashboardView } from "./views/DashboardView";
import { DocumentationView } from "./views/DocumentationView"; 

// ⚡ Set to false tomorrow to connect backend
const MOCK_MODE = true; 

export default function App() {
  const [view, setView] = useState("hero");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ username: "", role: "" });
  
  // Mock Data
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);

  // --- Handlers ---

  const handleStart = () => {
    setView("login");
  };

  const handleDocs = () => {
    setView("docs");
  };

  const handleBackToHero = () => {
    setView("hero");
  };

  const handleLogin = (creds) => {
    setLoading(true);
    // Simulate Backend Delay
    setTimeout(() => {
      setLoading(false);
      setUser(prev => ({ ...prev, username: creds.username }));
      setView("mfa");
    }, 1500);
  };

  const handleMFA = (otp) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Determine Role based on username (Mock Logic for Demo)
      // If username has 'dev', make them Developer. Else Admin.
      const role = user.username.toLowerCase().includes("dev") ? "developer" : "admin";
      setUser(prev => ({ ...prev, role }));
      
      loadMockData();
      setView("dashboard");
    }, 1500);
  };

  const handleGenerateKey = () => {
    const newKey = {
      id: Math.random().toString(36).substr(2, 9),
      prefix: "sk_live_" + Math.random().toString(36).substr(2, 4),
      created: new Date().toLocaleTimeString(),
      fingerprint: "SHA-256: " + Math.random().toString(16).substr(2, 8) + "..."
    };
    setKeys([newKey, ...keys]);
    
    setLogs(prev => [{
      id: Date.now(),
      action: "KEY_GENERATED",
      desc: "AES-256 Key Created",
      time: new Date().toLocaleTimeString(),
      signature: "sig_" + Math.random().toString(16).substr(2, 6)
    }, ...prev]);
  };

  const loadMockData = () => {
    setKeys([{ id: "1", prefix: "sk_live_9f8a", created: "10:00 AM", fingerprint: "SHA-256: a1b2c3..." }]);
    setLogs([{ id: 1, action: "LOGIN_SUCCESS", desc: "MFA Verified", time: "10:00 AM", signature: "sig_8a7f" }]);
  };

  // --- Routing Logic ---
  
  // 1. Hero Page (Passes both Start and Docs handlers)
  if (view === "hero") return <HeroView onStart={handleStart} onDocs={handleDocs} />;
  
  // 2. Documentation Page
  if (view === "docs") return <DocumentationView onBack={handleBackToHero} />;
  
  // 3. Login Flow
  if (view === "login") return <LoginView onLogin={handleLogin} loading={loading} />;
  if (view === "mfa") return <MFAView onVerify={handleMFA} loading={loading} />;
  
  // 4. Dashboard (Protected)
  return (
    <DashboardView 
      user={user} 
      keys={keys} 
      logs={logs} 
      onGenerateKey={handleGenerateKey} 
      onLogout={() => setView("hero")} 
    />
  );
}