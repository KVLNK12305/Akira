export function Button({ children, loading, className, ...props }) {
  return (
    <button 
      className={`
        w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg 
        transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20 
        flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <span className="animate-pulse">Processing...</span>
      ) : children}
    </button>
  );
}