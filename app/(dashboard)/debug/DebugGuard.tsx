'use client';

export function DebugGuard({ children }: { children: React.ReactNode }) {
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  if (!isDebugMode) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
        <p className="text-sm text-zinc-500">
          Debug panel is only available when NEXT_PUBLIC_DEBUG_MODE is true.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
