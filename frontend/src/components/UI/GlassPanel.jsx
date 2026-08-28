import { twMerge } from 'tailwind-merge';

export function GlassPanel({ children, className = "", glow = false, hoverEffect = false, ...props }) {
  return (
    <div 
      className={twMerge(
        "rounded-2xl border transition-all duration-300 relative overflow-hidden",
        glow 
          ? "bg-[#0b1329]/75 backdrop-blur-2xl border-emerald-500/25 shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]" 
          : "bg-[#090f20]/65 backdrop-blur-xl border-white/[0.08] shadow-[0_12px_36px_0_rgba(0,0,0,0.5)]",
        hoverEffect && "hover:border-emerald-500/40 hover:shadow-[0_15px_40px_-5px_rgba(16,185,129,0.2)] hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {/* Subtle top edge light reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}