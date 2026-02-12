export function UnreadDot() {
    return (
      <span className="relative inline-flex items-center justify-center">
        {/* halo */}
        <span className="absolute w-5 h-5 rounded-full bg-pink-400/25 blur-[1px]" />
        {/* dot */}
        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.55)]" />
      </span>
    );
  }