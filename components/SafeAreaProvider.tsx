'use client';

import { useEffect } from 'react';

export function SafeAreaProvider() {
  useEffect(() => {
    function measure() {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;
        padding-top:env(safe-area-inset-top,0px);
        padding-right:env(safe-area-inset-right,0px);
        padding-bottom:env(safe-area-inset-bottom,0px);
        padding-left:env(safe-area-inset-left,0px);
      `;
      document.body.appendChild(el);

      const cs = getComputedStyle(el);
      const root = document.documentElement;

      // Detect "real" notch devices vs classic status bar.
      // On non‑notch iPhones the top inset is typically ~20px; on notch devices it's larger (e.g. 44px).
      const topInsetPx = parseFloat(cs.paddingTop || '0');
      const hasNotch = Number.isFinite(topInsetPx) && topInsetPx > 20;

      const safeTop = hasNotch ? cs.paddingTop : '0px';

      // Primary safe-area CSS variables (used throughout the app)
      root.style.setProperty('--sat', safeTop);
      root.style.setProperty('--sar', cs.paddingRight);
      root.style.setProperty('--sab', cs.paddingBottom);
      root.style.setProperty('--sal', cs.paddingLeft);

      // Backwards-compatible aliases for previous variable names
      root.style.setProperty('--safe-area-top', safeTop);
      root.style.setProperty('--safe-area-right', cs.paddingRight);
      root.style.setProperty('--safe-area-bottom', cs.paddingBottom);
      root.style.setProperty('--safe-area-left', cs.paddingLeft);

      document.body.removeChild(el);
    }

    // Measure immediately on mount
    measure();

    // Re-measure on orientation change & resize
    const handler = () => {
      setTimeout(measure, 150);
    };

    window.addEventListener('orientationchange', handler);
    window.addEventListener('resize', handler);

    return () => {
      window.removeEventListener('orientationchange', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return null;
}

