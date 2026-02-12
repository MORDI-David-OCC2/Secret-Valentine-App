import type { ReactNode } from "react";
export default function AppFrame({
  children,
  withCard = true,
  className = "",
}: {
  children: ReactNode;
  withCard?: boolean;
  className?: string;
}) {
  return (
    <div className={"relative min-h-screen w-full flex justify-center px-4 py-6 " + className}>
      <div className="relative z-10 w-full max-w-[420px]">
        {withCard ? (
          <div className="relative rounded-[28px] bg-gradient-to-br from-[#fce8ef] via-[#f7dde6] to-[#ead5ee] shadow-[0_30px_80px_rgba(180,90,130,.18)] border border-white/60 overflow-hidden">
            {/* subtle texture */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c96080' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
              }}
            />
            <div className="relative px-5 sm:px-6 py-6">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}