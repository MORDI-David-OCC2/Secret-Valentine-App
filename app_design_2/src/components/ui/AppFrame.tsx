import type { ReactNode } from "react";

export default function AppFrame({
  children,
  withCard = false,
  className = "",
}: {
  children: ReactNode;
  withCard?: boolean;
  className?: string;
}) {
  // UI1 background (gradient + texture) in FULLSCREEN
  const Background = () => (
    <>
      {/* Fullscreen gradient */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#fce8ef] via-[#f7dde6] to-[#ead5ee]" />
      {/* Subtle texture */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c96080' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
    </>
  );

  if (withCard) {
    // ✅ Keep your original “card” mode (optional)
    return (
      <div
        className={
          "relative w-full min-h-[100dvh] flex justify-center px-4 py-6 " + className
        }
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <Background />
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="relative rounded-[28px] overflow-hidden border border-white/60 shadow-[0_30px_80px_rgba(180,90,130,.18)]">
            <div className="relative px-5 sm:px-6 py-6">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ FULLSCREEN mode (recommended)
  return (
    <div
      className={
        "relative w-full min-h-[100dvh] flex flex-col " + className
      }
      style={{
        paddingTop: "max(14px, env(safe-area-inset-top))",
        paddingBottom: "max(18px, env(safe-area-inset-bottom))",
      }}
    >
      <Background />

      {/* Content wrapper: full width on mobile, optional max width only on desktop */}
      <div className="relative z-10 w-full flex-1 flex flex-col px-4 sm:px-6">
        <div className="w-full flex-1 flex flex-col sm:max-w-[520px] sm:mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}