import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function Button({ 
  children, 
  loading = false, 
  variant = "primary", 
  size = "md",
  className = "", 
  icon: Icon,
  ...props 
}) {
  const baseStyles = "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed select-none";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3.5 text-base gap-2.5"
  };

  const variants = {
    primary: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_0_rgba(16,185,129,0.6)] border border-emerald-400/30",
    secondary: "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 hover:border-slate-600 shadow-md",
    danger: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)] border border-rose-400/30",
    outline: "bg-transparent hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 shadow-sm",
    ghost: "bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white"
  };

  return (
    <button 
      className={twMerge(baseStyles, sizeStyles[size] || sizeStyles.md, variants[variant] || variants.primary, className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          {children}
        </>
      )}
    </button>
  );
}