import { useEffect } from 'react';

type Loader = () => Promise<void> | void;

export function usePlanAutoRefresh(load: Loader): void {
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('orchestrator:log-updated', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('orchestrator:log-updated', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);
}
