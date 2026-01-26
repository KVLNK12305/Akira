export function Input({ label, className, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
          {label}
        </label>
      )}
      <input 
        className={`
          w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-sm 
          focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 
          transition-all placeholder:text-slate-600 text-slate-200
          ${className || ''}
        `}
        {...props} 
      />
    </div>
  );
}