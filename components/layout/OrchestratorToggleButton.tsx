'use client';

import { useRouter } from 'next/navigation';
import { useOrchestratorSidebar } from '@/contexts/OrchestratorSidebarContext';
import { useUserContext } from '@/contexts/UserContext';
import type { MascotChoice } from '@/types';

const MASCOT: Record<MascotChoice, { src: string; scale: number }> = {
  'red-panda': { src: '/red-panda.png', scale: 1 },
  'kiki':      { src: '/kiki.png',      scale: 1.3 },
};

export default function OrchestratorToggleButton() {
  const { isOpen, toggleSidebar } = useOrchestratorSidebar();
  const { user } = useUserContext();
  const router = useRouter();
  const aiEnabled = user?.settings?.aiEnabled !== false;

  const mascotKey: MascotChoice =
    (user?.settings as { customizations?: { mascot?: MascotChoice } } | undefined)
      ?.customizations?.mascot ?? 'red-panda';
  const { src, scale } = MASCOT[mascotKey];

  if (!aiEnabled || isOpen) return null;

  const handleClick = () => {
    if (window.innerWidth < 1024) {
      router.push('/ai');
    } else {
      toggleSidebar();
    }
  };

  return (
    <div
      className="fixed z-[60] select-none group bottom-[calc(var(--sab,env(safe-area-inset-bottom,0px))+64px)] lg:bottom-[calc(var(--sab,env(safe-area-inset-bottom,0px))+12px)]"
      style={{ right: 20 }}
    >
      {/* Dream thought bubble */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none opacity-0 group-hover:opacity-84 transition-opacity duration-300">
        <div style={{ paddingTop: 10 }}>
          <svg
            width="108" height="88" viewBox="0 0 108 88" fill="none"
            overflow="visible"
            style={{ filter: 'drop-shadow(0 0 10px rgba(74,222,84,0.2)) drop-shadow(0 3px 10px rgba(0,0,0,0.55))' }}
          >
            <g fill="#213d2b">
              <circle cx="20"  cy="34" r="14" />
              <circle cx="36"  cy="22" r="17" />
              <circle cx="54"  cy="16" r="19" />
              <circle cx="84"  cy="22" r="17" />
              <circle cx="88"  cy="34" r="13" />
              <circle cx="30"  cy="47" r="16" />
              <circle cx="54"  cy="51" r="17" />
              <circle cx="78"  cy="47" r="16" />
            </g>
            <circle cx="54" cy="73" r="4"   fill="#213d2b" />
            <circle cx="54" cy="82" r="2.8" fill="#213d2b" />
            <circle cx="54" cy="88" r="1.8" fill="#213d2b" />
            <foreignObject x="0" y="0" width="108" height="66">
              <div
                // @ts-expect-error xmlns required for SVG foreignObject
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '108px',
                  height: '66px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(167,243,208,0.95)',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {"I'm the assistant ✨"}
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>

      <button
        onClick={handleClick}
        aria-label="Open assistant"
        className="flex items-center justify-center w-[56px] h-[56px] lg:w-[84px] lg:h-[84px] cursor-pointer bg-transparent border-none p-0"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="assistant"
          width={84}
          height={84}
          style={{ objectFit: 'contain', width: '100%', height: '100%', transform: mascotKey === 'kiki' ? `scale(${scale}) translateY(-8px)` : undefined }}
        />
      </button>
    </div>
  );
}
