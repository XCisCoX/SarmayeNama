'use client';

import { cn } from '@/lib/utils';

/**
 * Local icon set — original inline SVGs (stroke-based, 24x24 viewBox).
 * No remote icon fonts or URLs; every icon renders from local paths.
 */
const PATHS: Record<string, React.ReactNode> = {
  // Asset icons
  dollar: (
    <>
      <path d="M12 3v18" />
      <path d="M15.5 7.5c-.8-1-2.1-1.6-3.5-1.6-2 0-3.5 1.1-3.5 2.8 0 3.8 7.5 1.9 7.5 5.6 0 1.7-1.5 2.9-3.6 2.9-1.6 0-2.9-.7-3.7-1.8" />
    </>
  ),
  euro: (
    <>
      <path d="M17 5.5A7.5 7.5 0 1 0 17 18.5" />
      <path d="M5 10h8M5 14h7" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5h.01M17.5 14.5h.01" />
    </>
  ),
  gold: (
    <>
      <path d="M12 3l1.8 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.5l-4.1 2.5 1.1-4.8-3.7-3.2 4.9-.4z" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.5c.5-1 1.4-1.5 2.5-1.5 1.4 0 2.5.9 2.5 2.2 0 2.9-5.5 1.5-5.5 4.3 0 1.3 1.1 2.2 2.6 2.2 1.2 0 2.2-.6 2.7-1.7" />
    </>
  ),
  bitcoin: (
    <>
      <path d="M10 4v16M14.5 4v16M9 8h5.5a2.5 2.5 0 0 1 0 5H9m0 0h6a2.5 2.5 0 0 1 0 5H9" />
    </>
  ),
  ethereum: (
    <>
      <path d="M12 3l6.5 9.5L12 16l-6.5-3.5z" />
      <path d="M12 16.5l6.5 3.7L12 21l-6.5-.8z" />
    </>
  ),
  tether: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 8.5h7M12 8.5v7.5M9.5 12h5" />
    </>
  ),
  bnb: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
      <path d="M9.5 12l2.5 2.5 2.5-2.5M8.8 13.7v-2l-2.1-1.2 2.1-1.2v-2l4.6 2.7" />
    </>
  ),
  solana: (
    <>
      <path d="M5 7.5h14l-3.5 4H5zM5 12.5h14l-3.5 4H5z" />
    </>
  ),
  xrp: (
    <>
      <path d="M6 5l12 14M18 5L6 19" />
    </>
  ),
  doge: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 12h4M9.5 8.5v7M9.5 8.5c2.5-1 6 .5 6 3.5s-3.5 4.5-6 3.5" />
    </>
  ),
  ada: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M7.5 15.5L12 9l4.5 6.5M6.5 9l1.9 3.3M17.5 9l-1.9 3.3" />
    </>
  ),
  trx: (
    <>
      <path d="M12 3v18M6 7l12-2.5M6 7l12 9.5M6 7l6 5 6 4.5" />
    </>
  ),
  ton: (
    <>
      <path d="M12 3L5.5 8.5 12 21l6.5-12.5z" />
      <path d="M12 21V8.5" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  ltc: (
    <>
      <path d="M12 3v10.5L8 15M12 13.5L9.5 21M8 15h9.5" />
    </>
  ),
  avax: (
    <>
      <path d="M12 3l9 18H3z" />
      <path d="M12 10l-2.5 5h5z" />
    </>
  ),
  dot: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5.5" cy="18" r="1.8" />
      <circle cx="19" cy="7.5" r="1.8" />
      <path d="M10.5 14.5l-3.2 2.5M14 10l3.6-1.5" />
    </>
  ),
  shib: (
    <>
      <path d="M5 9h2.5L12 12l4.5-3H19l-2 3 2 3h-2.5L12 12 7.5 15H5l2-3z" />
      <path d="M12 12v6M9 15h6" />
    </>
  ),
  silver: (
    <>
      <path d="M12 3c1 2.5 1 5 0 7.5S10 14 12 16.5s2 5 0 7.5" />
      <path d="M12 3c-1 2.5-1 5 0 7.5s2 4 0 6-2 5 0 7.5" />
    </>
  ),
  platinum: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 8.5c1-2.5 7-2.5 8 0M8 15.5c1 2.5 7 2.5 8 0M8 8.5c1 .5 2 .8 4 .8s3-.3 4-.8M8 15.5c1-.5 2-.8 4-.8s3 .3 4 .8" />
    </>
  ),
  palladium: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" />
    </>
  ),
  stock: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  oil: (
    <>
      <path d="M12 3c3 4 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9 7 12 3z" />
      <path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  gas: (
    <>
      <path d="M6 3h8v9a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6z" />
      <path d="M14 3h3v3M9 9h2" />
    </>
  ),
  copper: (
    <>
      <path d="M4 20c4-1 5-2 5-3s-1-1-1-2 2-1 3-2 1-2 2-3 1-2 1-4-2-3-4-3c3 2 3 5 2 7M4 20c3-1 4-2 4-4s1-2 2-3" />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21V9M12 9c-1-2-3-3-5-3 0 3 1 5 5 5M12 9c1-2 3-3 5-3 0 3-1 5-5 5M12 13c-1-1-3-1-4 0 1 2 2 3 4 3M12 13c1-1 3-1 4 0-1 2-2 3-4 3" />
    </>
  ),
  corn: (
    <>
      <path d="M8 21V8a4 4 0 0 1 8 0v13" />
      <path d="M8 21h8M10 4c-1-2-4-1-4 1M14 4c1-2 4-1 4 1M12 3c0-2 3-2 3 0" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z" />
    </>
  ),
  gem: (
    <>
      <path d="M7 4h10l4 5-9 11L3 9z" />
      <path d="M3 9h18M9.5 9L12 20M14.5 9L12 20" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </>
  ),
  trending: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" />
    </>
  ),

  // UI icons
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  star: (
    <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />
  ),
  starFilled: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z"
    />
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
  arrowDown: <path d="M12 5v14M19 12l-7 7-7-7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3L2.5 20h19z" />
      <path d="M12 10v4M12 16.5h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </>
  ),
  swap: (
    <>
      <path d="M7 4v13M4 17l3 3 3-3M17 20V7M14 7l3-3 3 3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3 5 6.2 5c2 0 3.4 1.1 4.3 2.4h3C14.4 6.1 15.8 5 17.8 5 21 5 22.7 8.4 21.2 11.4 19 15.6 12 20 12 20z" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className,
  size = 20,
  'aria-hidden': ariaHidden = true,
}: {
  name: string;
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
}) {
  const paths = PATHS[name] ?? PATHS.spark;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      className={cn('shrink-0', className)}
    >
      {paths}
    </svg>
  );
}

export { PATHS };
