'use client';

import { useEffect } from 'react';

export function LogfireBrowser() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_LOGFIRE_BROWSER_ENABLED !== 'true') return;

    let cancelled = false;
    let cleanup: (() => Promise<void>) | undefined;

    void import('@pydantic/logfire-browser').then((logfire) => {
      if (cancelled) return;

      cleanup = logfire.configure({
        traceUrl: '/api/logfire/v1/traces',
        serviceName: 'arogyamandiram-browser',
        serviceVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
        environment: process.env.NODE_ENV,
        autoInstrumentations: true,
        rum: {
          session: true,
          webVitals: true,
          longAnimationFrames: true,
        },
        scrubbing: {
          extraPatterns: [
            'authorization',
            'cookie',
            'email',
            'password',
            'secret',
            'token',
          ],
        },
      });

      logfire.info('Arogyamandiram browser telemetry initialized');
    });

    const reportWindowError = (event: ErrorEvent) => {
      void import('@pydantic/logfire-browser').then((logfire) => {
        logfire.reportError('Unhandled browser error', event.error ?? event.message);
      });
    };
    const reportUnhandledRejection = (event: PromiseRejectionEvent) => {
      void import('@pydantic/logfire-browser').then((logfire) => {
        logfire.reportError('Unhandled browser promise rejection', event.reason);
      });
    };

    window.addEventListener('error', reportWindowError);
    window.addEventListener('unhandledrejection', reportUnhandledRejection);

    return () => {
      cancelled = true;
      window.removeEventListener('error', reportWindowError);
      window.removeEventListener('unhandledrejection', reportUnhandledRejection);
      if (cleanup) void cleanup();
    };
  }, []);

  return null;
}
