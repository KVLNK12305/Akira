import { useState, useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export function MFAView({ onVerify }) {
  const { user, tempEmail, setAuthSuccess, logout } = useAuth();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

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
    } catch {
      setError("Invalid code.");
      setIsVerifying(false);
      setCode(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-mfa', { email: targetEmail });
      setTimeLeft(60);
      setError("");
    } catch {
      setError("Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#02050e] flex items-center justify-center p-6 overflow-hidden font-sans selection:bg-white/20 selection:text-white">
      
      {/* Ultra-Minimal Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[140px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        <div className="rounded-[24px] p-8 sm:p-10 relative overflow-hidden backdrop-blur-3xl bg-white/[0.015] border border-white/[0.04] shadow-[0_24px_80px_-20px_rgba(0,0,0,1)]">

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">
              Authentication Code
            </h2>
            <p className="text-white/40 text-[14px]">
              We sent a 6-digit code to <span className="text-white/80">{targetEmail}</span>
            </p>
          </div>

          <div className="flex gap-2 sm:gap-3 justify-center mb-8" onPaste={handlePaste}>
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
                className={`w-12 h-14 sm:w-14 sm:h-16 bg-white/[0.03] text-center text-xl sm:text-2xl font-medium text-white rounded-xl outline-none transition-all duration-200 border ${
                  error 
                    ? 'border-rose-500/40 bg-rose-500/5' 
                    : digit 
                    ? 'border-white/20 bg-white/[0.05]' 
                    : 'border-transparent focus:border-white/20 focus:bg-white/[0.05]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-rose-400 text-center text-[13px] mb-6 animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={() => handleVerify(code.join(""))}
            disabled={isVerifying || code.some(c => c === "")}
            className="w-full bg-white text-black hover:bg-white/90 font-medium py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-2 text-[15px]"
          >
            {isVerifying ? (
              <Loader2 className="animate-spin text-black" size={18} />
            ) : (
              "Verify Code"
            )}
          </button>

          <div className="mt-8 text-center flex flex-col items-center justify-center gap-4">
            <button
              onClick={handleResend}
              disabled={timeLeft > 0 || isResending}
              className={`text-[14px] transition-colors ${
                timeLeft === 0
                  ? "text-white/70 hover:text-white"
                  : "text-white/30 cursor-not-allowed"
              }`}
            >
              {isResending ? "Sending..." : timeLeft === 0 ? "Resend Code" : `Resend code in ${formatTime(timeLeft)}`}
            </button>
            
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[13px] transition-colors"
            >
              <LogOut size={14} /> Back to login
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}