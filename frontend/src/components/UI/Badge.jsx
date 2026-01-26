const VARIANTS = {
  default: "bg-slate-800 text-slate-400 border-slate-700",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  encrypted: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  dev: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function Badge({ variant = "default", children, icon: Icon }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border flex items-center gap-1 w-fit ${VARIANTS[variant]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}