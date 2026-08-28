import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, Loader2, Clock, LogOut, RefreshCw, Lock, Sparkles, KeyRound } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export function MFAView({ onVerify }) {
  const { user, tempEmail, setAuthSuccess, googleLogin, logout } = useAuth();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Determine target email
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
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }

    if (newCode.every(digit => digit !== "") && index === 5) {
      handleVerify(newCode.join(""));
    }
  };

  // Clipboard paste support for full 6-digit OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setCode(digits);
      document.getElementById("otp-5")?.focus();
      handleVerify(pastedData);
    }
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
        setAuthSuccess(res.data.token, res.data.user);
        if (onVerify) onVerify();
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Incorrect Challenge Response. Access Denied.";
      setError(errorMsg);
      setIsVerifying(false);
      setCode(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await googleLogin(targetEmail);
      setTimeLeft(60);
      setError("");
    } catch {
      setError("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Radiant Background Aura */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/[0.08] rounded-full blur-[140px] animate-pulse-glow"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/[0.06] rounded-full blur-[130px]"></div>
        <div className="absolute inset-0 cyber-grid-pattern opacity-30"></div>
      </div>

      <div className="w-full max-w-[460px] relative z-10 animate-fade-in">
        <div className="rounded-3xl p-7 sm:p-9 relative overflow-hidden backdrop-blur-2xl bg-[#081124]/90 border border-emerald-500/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">

          {/* Top Timer Progress Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-slate-800/80">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          <div className="text-center mb-7">
            <div className="w-16 h-16 bg-[#0c162e] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 relative shadow-[0_0_25px_-5px_rgba(16,185,129,0.4)]">
              <ShieldCheck className="text-emerald-400 w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <div className="absolute inset-0 rounded-2xl border border-emerald-400/40 animate-ping opacity-30 pointer-events-none"></div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight mb-2">
              Cryptographic Challenge
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Enter the 6-digit NIST authentication challenge sent to:
              <span className="text-emerald-400 font-mono font-medium block mt-1 bg-emerald-500/10 py-1 px-2 rounded border border-emerald-500/20 break-all text-xs">
                {targetEmail || "Operator Account"}
              </span>
            </p>
          </div>

          {/* 6-Digit OTP Blocks */}
          <div className="flex gap-2 sm:gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !code[idx] && idx > 0) {
                    document.getElementById(`otp-${idx - 1}`)?.focus();
                  }
                }}
                className={`w-11 sm:w-13 h-14 bg-[#050b18] border text-center text-xl sm:text-2xl font-mono font-bold text-white rounded-xl outline-none transition-all duration-200 ${
                  error 
                    ? 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-shake' 
                    : digit 
                    ? 'border-emerald-400 bg-[#0a162d] shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] text-emerald-400' 
                    : 'border-slate-700/80 focus:border-emerald-500/80 focus:bg-[#091224] focus:shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-rose-400 text-center text-xs font-mono mb-5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/25 flex items-center justify-center gap-2 animate-fade-in">
              <span>⚠</span> {error}
            </div>
          )}

          <button
            onClick={() => handleVerify(code.join(""))}
            disabled={isVerifying || code.some(c => c === "")}
            className="w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] hover:shadow-[0_0_25px_0_rgba(16,185,129,0.7)]"
          >
            {isVerifying ? (
              <>
                <Loader2 className="animate-spin text-slate-950" size={18} />
                <span className="font-mono text-xs uppercase tracking-wider">Validating Challenge Response...</span>
              </>
            ) : (
              <>
                <span className="font-display">Authorize Session</span>
                <ArrowRight size={17} className="stroke-[2.5]" />
              </>
            )}
          </button>

          {/* Resend Action */}
          <button
            onClick={handleResend}
            disabled={timeLeft > 0 || isResending}
            className={`w-full mt-3 py-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-center gap-2 ${
              timeLeft === 0
                ? "bg-[#0c1833] text-emerald-400 border-emerald-500/30 hover:bg-[#102044] cursor-pointer shadow-sm"
                : "bg-transparent text-slate-500 border-slate-800 cursor-not-allowed opacity-60"
            }`}
          >
            {isResending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {timeLeft === 0 ? "Generate New Challenge OTP" : `Challenge active (${timeLeft}s remaining)`}
          </button>

          {/* Cancel & Return */}
          <button
            onClick={logout}
            className="w-full mt-3 flex items-center justify-center gap-2 text-slate-400 hover:text-rose-400 text-xs font-mono transition-colors py-2"
          >
            <LogOut size={13} /> Terminate & Return to Gateway
          </button>

          {/* Security Telemetry Footer */}
          <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-4">
            <span className="flex items-center gap-1">
              <Lock size={10} className="text-emerald-400" /> CHALLENGE: NIST-800-63B
            </span>
            <span className={`flex items-center gap-1 font-semibold ${timeLeft < 20 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              <Clock size={11} /> {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}