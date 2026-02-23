import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream-50">
      {/* Subtle teal glow orb — mirrors landing hero */}
      <div
        className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, #14b8a6 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[400px] w-[400px] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(circle, #0d9488 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo + tagline */}
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Axil
            </span>
          </Link>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Strategic Recruitment Operations
          </p>
        </div>

        {/* Form card */}
        <div className="card-surface px-1 py-1">{children}</div>
      </div>
    </div>
  );
}
