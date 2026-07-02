import * as React from 'react';

/**
 * Custom Vitals mark: a soft heart with a clean pulse wave held inside it.
 * Drop-in replacement for a lucide icon (currentColor stroke, same props).
 */
type VitalsIconProps = React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string };

const VitalsIcon = React.forwardRef<SVGSVGElement, VitalsIconProps>(
  ({ strokeWidth = 1.8, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 21c-.35 0-.68-.13-.94-.38l-6.62-6.4A5.9 5.9 0 0 1 2.5 9.9 5.4 5.4 0 0 1 7.9 4.5c1.6 0 2.99.66 4.1 1.96A5.33 5.33 0 0 1 16.1 4.5a5.4 5.4 0 0 1 5.4 5.4c0 1.65-.7 3.2-1.94 4.32l-6.62 6.4c-.26.25-.59.38-.94.38Z" />
      <path d="M7.6 11.6h1.9l1.1-2.3 2.2 5 1.2-2.7h2.4" />
    </svg>
  )
);
VitalsIcon.displayName = 'VitalsIcon';

export default VitalsIcon;
