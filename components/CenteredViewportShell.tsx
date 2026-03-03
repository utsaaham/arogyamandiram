import type { ReactNode } from 'react';
import clsx from 'clsx';

type CenteredViewportShellProps = {
  children: ReactNode;
  /**
   * Optional background content (e.g. gradient orbs) positioned behind the main content.
   */
  background?: ReactNode;
  /**
   * Extra classes for the viewport container (`auth-viewport-min-height` + flex center).
   */
  containerClassName?: string;
  /**
   * Extra classes for the inner content wrapper (`w-full` by default).
   */
  contentClassName?: string;
};

export default function CenteredViewportShell({
  children,
  background,
  containerClassName,
  contentClassName,
}: CenteredViewportShellProps) {
  return (
    <main className="fixed inset-0 overflow-x-hidden overflow-y-auto">
      <div
        className={clsx(
          'relative auth-viewport-min-height flex flex-col items-center justify-center px-4 py-6',
          containerClassName,
        )}
      >
        {background}
        <div className={clsx('relative z-10 w-full', contentClassName)}>{children}</div>
      </div>
    </main>
  );
}

