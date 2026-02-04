import { useState, useEffect } from "react";
import { Shield, ArrowRight, Loader2, Clock, LogOut, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export function MFAView({ onVerify }) {
  // 🟢 Get setAuthSuccess and logout from Context
  const { user, tempEmail, setAuthSuccess, googleLogin, logout } = useAuth();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Determine which email we are verifying
  const targetEmail = user?.email || tempEmail || localStorage.getItem('temp_email');

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

    // Auto-focus next input
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();

    // Auto-submit on fill
    if (newCode.every(digit => digit !== "") && index === 5) handleVerify(newCode.join(""));
  };

  const handleVerify = async (fullCode) => {
    setIsVerifying(true);
    setError("");

    try {
      const res = await api.post('/auth/verify-mfa', {
        email: targetEmail,
        otp: fullCode
      });

      if (res.data.success) {
        // 🚀 CRITICAL FIX: Use the Context helper
        // This sets Token AND User immediately, fixing the "Guest" bug
        setAuthSuccess(res.data.token, res.data.user);

        if (onVerify) onVerify();
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Incorrect Code. Access Denied.";
      setError(errorMsg);
      setIsVerifying(false);
      setCode(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      // Re-trigger the logic that sends the email
      await googleLogin(targetEmail);
      setTimeLeft(60);
      setError("");
      alert(`New Code sent to ${targetEmail}`);
    } catch (err) {
      setError("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden animate-[fade-in_0.3s]">

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700 relative">
            <Shield className="text-emerald-400 w-8 h-8" />
            <div className="absolute inset-0 rounded-full border border-emerald-500/50 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Identity Verification</h2>
          <p className="text-zinc-400 text-sm">We sent a secure code to
            <span className="text-white font-mono ml-1 block mt-1">{targetEmail || "your email"}</span>.
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
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !code[idx] && idx > 0) {
                  document.getElementById(`otp-${idx - 1}`)?.focus();
                }
              }}
              className={`w-12 h-14 bg-black border ${error ? 'border-red-500 animate-shake' : 'border-zinc-700 focus:border-emerald-500'} rounded-lg text-center text-xl font-mono text-white outline-none transition-all`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-center text-sm mb-4 font-mono bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

        <button
          onClick={() => handleVerify(code.join(""))}
          disabled={isVerifying || code.some(c => c === "")}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-emerald-400 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isVerifying ? <Loader2 className="animate-spin" /> : <>Verify Identity <ArrowRight size={18} /></>}
        </button>

        <button
          onClick={handleResend}
          disabled={timeLeft > 0 || isResending}
          className={`w-full mt-3 py-3 rounded-xl border border-zinc-700 flex items-center justify-center gap-2 transition-all ${timeLeft === 0
            ? "bg-zinc-800 text-emerald-400 hover:bg-zinc-700 cursor-pointer"
            : "bg-transparent text-zinc-600 cursor-not-allowed opacity-50"
            }`}
        >
          {isResending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {timeLeft === 0 ? "Resend Verification Code" : `Resend available in ${timeLeft}s`}
        </button>

        <button
          onClick={logout} // 🟢 Calls AuthContext logout directly
          className="w-full mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-red-400 text-sm font-medium transition-colors py-2"
        >
          <LogOut size={14} /> Cancel & Return to Home
        </button>

        <div className="mt-6 flex justify-between items-center text-xs font-mono text-zinc-500 border-t border-zinc-800 pt-4">
          <span>SEC-ID: {Math.floor(Math.random() * 10000)}</span>
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