import { twMerge } from "tailwind-merge";

export function Input({ label, error, icon: Icon, rightElement, className = "", ...props }) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <label className="block text-xs font-mono font-medium text-slate-300 tracking-wide uppercase">
            {label}
          </label>
        </div>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input 
          className={twMerge(
            "w-full bg-[#0a1020]/80 border rounded-xl py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 focus:outline-none",
            Icon ? "pl-10" : "pl-3.5",
            rightElement ? "pr-10" : "pr-3.5",
            error 
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" 
              : "border-slate-800 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20 focus:bg-[#0d162d]",
            className
          )}
          {...props} 
        />
        {rightElement && (
          <div className="absolute right-3 text-slate-400">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-rose-400 font-mono tracking-tight flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}