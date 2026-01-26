import { useState, useEffect } from "react";
import { Shield, ArrowRight, Loader2, Clock, LogOut } from "lucide-react"; 
import api from "../api/axios"; 
import { useAuth } from "../context/AuthContext";

export function MFAView({ onVerify, loading, onLogout }) {
  // 1. GET tempEmail FROM CONTEXT
  const { user, tempEmail } = useAuth(); 

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); 

  useEffect(() => {
    document.getElementById("otp-0")?.focus();
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
    if (newCode.every(digit => digit !== "") && index === 5) handleVerify(newCode.join(""));
  };

  const handleVerify = async (fullCode) => {
    setIsVerifying(true);
    setError("");

    // 2. DETERMINE EMAIL (Crucial Logic)
    // Priority: User Context -> Temp Context -> LocalStorage -> Fallback
    const emailToVerify = user?.email || tempEmail || localStorage.getItem('temp_email') || "admin@akira.dev";
    
    console.log("🚀 Debug: Sending to Backend:", { email: emailToVerify, otp: fullCode });

    try {
      const res = await api.post('/auth/verify-mfa', { 
        email: emailToVerify, 
        otp: fullCode 
      });

      if (res.data.success) {
        // 3. SUCCESS: Save Token and Redirect
        localStorage.setItem('token', res.data.token);
        onVerify(); 
      }
    } catch (err) {
      console.error("❌ MFA Failed:", err.response?.data);
      setError("Incorrect Code. Access Denied.");
      setIsVerifying(false);
      setCode(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
        
        <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft/120)*100}%` }}></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700 relative">
             <Shield className="text-emerald-400 w-8 h-8" />
             <div className="absolute inset-0 rounded-full border border-emerald-500/50 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Identity Verification</h2>
          <p className="text-zinc-400 text-sm">We sent a secure code to 
            <span className="text-white font-mono ml-1">{tempEmail || "your email"}</span>.
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-8">
          {code.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              className={`w-12 h-14 bg-black border ${error ? 'border-red-500 animate-shake' : 'border-zinc-700 focus:border-emerald-500'} rounded-lg text-center text-xl font-mono text-white outline-none transition-all`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-center text-sm mb-4 font-mono">{error}</p>}

        <button
          onClick={() => handleVerify(code.join(""))}
          disabled={isVerifying || code.some(c => c === "") || timeLeft === 0}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? <Loader2 className="animate-spin"/> : <>Verify Identity <ArrowRight size={18}/></>}
        </button>

        <button 
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors py-2"
        >
          <LogOut size={14} /> Cancel & Return to Home
        </button>

        <div className="mt-6 flex justify-between items-center text-xs font-mono text-zinc-500">
             <span>Session ID: SEC-{Math.floor(Math.random()*10000)}</span>
             <span className={`flex items-center gap-1 ${timeLeft < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                <Clock size={12} /> {formatTime(timeLeft)}
             </span>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}