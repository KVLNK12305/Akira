import { twMerge } from "tailwind-merge";

const VARIANTS = {
  default: "bg-slate-800/80 text-slate-300 border-slate-700/70",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)]",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_-3px_rgba(6,182,212,0.3)]",
  encrypted: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_-3px_rgba(245,158,11,0.3)]",
  admin: "bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_0_12px_-3px_rgba(168,85,247,0.3)]",
  dev: "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_12px_-3px_rgba(59,130,246,0.3)]",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_-3px_rgba(244,63,94,0.3)]",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

export function Badge({ variant = "default", children, icon: Icon, pulse = false, className = "" }) {
  return (
    <span className={twMerge(
      "px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider border inline-flex items-center gap-1.5 font-semibold shrink-0 transition-all",
      VARIANTS[variant] || VARIANTS.default,
      className
    )}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}