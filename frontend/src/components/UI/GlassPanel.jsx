import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function GlassPanel({ children, className }) {
  return (
    <div className={twMerge(
      "bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl",
      className
    )}>
      {children}
    </div>
  );
}